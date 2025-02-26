console.log("Ignis.js loaded and running!!");

/*
  Ignis x Abyss – Life x Death
  Final version ensuring Nova Meter fills & stays full until pressed:

  Key Points:
  • Nova meter (novaTimer) increments up to NOVA_THRESHOLD. Then remains at max.
  • Pressing Nova button only works if novaTimer >= NOVA_THRESHOLD. This resets the meter to 0.
  • Assimilation (abyss) has 4 states: Gold, Pink, Purple, Black. Heals at half rate if fewer than 3 orbit.
  • Movement: WSAD/Arrow keys, plus touchscreen swipes.
  • HUD at bottom. Meters: 
       - Row 4: Burst & Nova (cyan) 
       - Row 5: Hunt & Assimilation (purple)
*/

// -------------------------------------------------------------------
// 1) Classes
// -------------------------------------------------------------------
class Singularity {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.radius = 15;
    this.deadTimer = 0;    // time spent in black/dead state
    this.state = "healthy";
    this.currentColor = color(255,215,0); // gold
  }

  update() {
    // For now, no special logic inside update
  }

  show() {
    noStroke();
    if (this.state === "dead") {
      stroke(255,0,255);
      strokeWeight(2);
    }
    fill(this.currentColor);
    ellipse(this.pos.x, this.pos.y, this.radius*2, this.radius*2);
    noStroke();
  }
}

class Tendril {
  constructor() {
    // Spawn on a random edge
    let edge = floor(random(4));
    if (edge===0) this.pos = createVector(random(width), 0);
    else if (edge===1) this.pos = createVector(width, random(height));
    else if (edge===2) this.pos = createVector(random(width), height);
    else this.pos = createVector(0, random(height));
    
    this.vel = createVector(0,0);
    this.acc = createVector(0,0);
    this.maxSpeed = 3;
    this.tail = [];
    this.tailMax = 20;
    this.boostTimer = 0;
    this.immolating = false;
    this.immolateTimer = 0;
    this.immolateDuration = 2000;
    this.dead = false;
  }

  autoHunt(targetPos) {
    let force = p5.Vector.sub(targetPos, this.pos);
    force.setMag(random(1,2));
    this.vel = force;
  }

  hunt(targetPos) {
    this.boostTimer = 30; // cause a direct pull
  }

  orbit(targetPos, pullStrength) {
    let desired = p5.Vector.sub(targetPos, this.pos);
    let tangent = createVector(-desired.y, desired.x);
    tangent.normalize();
    tangent.mult(pullStrength);

    desired.normalize();
    desired.mult(pullStrength);

    this.acc.add(p5.Vector.add(desired, tangent));
  }

  startImmolation() {
    if (!this.immolating) {
      this.immolating = true;
      this.immolateTimer = 0;
    }
  }

  update() {
    if (!simulationRunning) return;
    
    if (this.immolating) {
      this.immolateTimer += deltaTime;
      if (this.immolateTimer > this.immolateDuration) {
        this.dead = true;
      }
    } else {
      let simSpeed = agroSlider.value();
      let d = p5.Vector.dist(this.pos, singularity.pos);
      if (d > ORBIT_DISTANCE) {
        let baseForce = p5.Vector.sub(singularity.pos, this.pos);
        baseForce.setMag(0.05);
        this.acc.add(baseForce);
      }
      if (this.boostTimer>0) {
        let boostForce = p5.Vector.sub(singularity.pos, this.pos);
        boostForce.setMag(0.2);
        this.acc.add(boostForce);
        this.boostTimer--;
      }
      this.vel.add(this.acc);
      this.vel.limit(this.maxSpeed * simSpeed);
      this.pos.add(this.vel);
      this.acc.mult(0);
      
      // Bounce if wallsOn
      if (wallsOn) {
        if (this.pos.x<0) { this.pos.x=0; this.vel.x*=-1; }
        if (this.pos.x>width) { this.pos.x=width; this.vel.x*=-1; }
        if (this.pos.y<0) { this.pos.y=0; this.vel.y*=-1; }
        if (this.pos.y>height) { this.pos.y=height; this.vel.y*=-1; }
      }
    }
    
    // keep tail
    this.tail.push(this.pos.copy());
    if (this.tail.length>this.tailMax) this.tail.shift();
  }

  show() {
    noStroke();
    let drawColor;
    if (this.immolating) {
      if (this.immolateTimer < this.immolateDuration/2) {
        let amt = this.immolateTimer/(this.immolateDuration/2);
        drawColor = lerpColor(purpleColor, cyanColor, amt);
      } else {
        let amt = (this.immolateTimer - this.immolateDuration/2)/(this.immolateDuration/2);
        drawColor = lerpColor(cyanColor, blackColor, amt);
      }
    } else {
      drawColor = color(130,0,130);
    }
    fill(drawColor);
    ellipse(this.pos.x, this.pos.y, 7,7);
    
    strokeWeight(1);
    noFill();
    beginShape();
    for (let i=0;i<this.tail.length;i++){
      let pos = this.tail[i];
      let alpha = map(i,0,this.tail.length,0,255);
      stroke(red(drawColor), green(drawColor), blue(drawColor), alpha);
      vertex(pos.x, pos.y);
    }
    endShape();
  }
}

// -------------------------------------------------------------------
// 2) Global Vars
// -------------------------------------------------------------------
const TENDRIL_COUNT=20;
const ORBIT_DISTANCE=50;
const NOVA_THRESHOLD=3500;
const ABSYSS_THRESHOLD=13000;
const HUNT_THRESHOLD=5000;
const NOVA_COOLDOWN_TIME=10000;

let novaTimer=0;           // Nova meter
let huntTimer=0;           // Hunt meter
let abyssAccumulator=0;    // assimilation
let novaCooldown=0;

let spawnTimer=0;
const SPAWN_INTERVAL=5000;
let explosionTimer=0;
const explosionDuration=500;
let explosionType="none";

let purpleColor, cyanColor, blackColor;
let tendrils=[];
let singularity;
let simulationRunning=true;

let agroSlider, gravitySlider, speedSlider;
let burstMeter, novaMeter, huntMeter, abyssMeter;
let wallsOn=false, autoMode=true;

// For touchscreen swiping
let lastTouchX=0, lastTouchY=0;

// -------------------------------------------------------------------
// 3) Setup & Draw
// -------------------------------------------------------------------
function setup() {
  purpleColor = color(130,0,130);
  cyanColor   = color(0,255,255);
  blackColor  = color(0,0,0);
  
  createCanvas(windowWidth, windowHeight);
  createHUD_Bottom();
  resetSimulation();
}

function draw() {
  background(0);
  
  // 1) assimilation fraction => color & speed factor
  let frac = abyssAccumulator/ABSYSS_THRESHOLD;
  if (frac>1) frac=1;
  
  let speedFactor=1;
  let st;
  if (frac<0.5) { st="gold"; speedFactor=1; }
  else if (frac<0.75) { st="pink"; speedFactor=0.75; }
  else if (frac<1) { st="purple"; speedFactor=0.5; }
  else { st="black"; speedFactor=0; }

  if (st==="black") {
    singularity.deadTimer += deltaTime;
    if (singularity.deadTimer>7000) resetAssimilation();
  } else {
    singularity.deadTimer=0;
    // Heal if <3 orbit
    if (getOrbitCount()<3 && abyssAccumulator>0) {
      abyssAccumulator = max(0, abyssAccumulator - deltaTime*0.5);
    }
  }

  let c;
  if (st==="gold") c=color(255,215,0);
  else if (st==="pink") c=color(255,105,180);
  else if (st==="purple") c=color(128,0,128);
  else c=color(0,0,0);

  singularity.state=st;
  singularity.currentColor=c;
  
  // 2) Nova meter logic: fill from 0..NOVA_THRESHOLD, remain at max
  if (novaTimer<NOVA_THRESHOLD) {
    novaTimer += deltaTime;
    if (novaTimer> NOVA_THRESHOLD) novaTimer = NOVA_THRESHOLD;
  }
  novaMeter.attribute("value", novaTimer.toString());
  
  // 3) final speed = slider * factor
  let baseSpeed = speedSlider.value();
  let finalSpeed = baseSpeed * speedFactor;
  
  // 4) handle keyboard
  handleKeyboard(finalSpeed);
  
  // 5) Timers
  spawnTimer += deltaTime;
  if (spawnTimer>SPAWN_INTERVAL) {
    spawnTendrils(10);
    spawnTimer=0;
  }
  
  huntTimer += deltaTime;
  if (huntTimer>=HUNT_THRESHOLD) {
    triggerHunt();
    huntTimer=0;
  }
  huntMeter.attribute("value", huntTimer.toString());
  
  // 6) assimilation if orbit≥3 & not black
  if (getOrbitCount()>=3 && st!=="black") {
    abyssAccumulator += deltaTime;
  }
  abyssMeter.attribute("value", abyssAccumulator.toString());
  
  // 7) update singularity & tendrils
  singularity.update();
  singularity.show();
  
  let gravPull = gravitySlider.value();
  for (let t of tendrils) {
    let d = p5.Vector.dist(t.pos, singularity.pos);
    if (d<ORBIT_DISTANCE) t.orbit(singularity.pos, gravPull);
    t.update();
    t.show();
  }
  tendrils = tendrils.filter(t=>!t.dead);
  
  if (explosionTimer>0) {
    drawExplosion();
    explosionTimer -= deltaTime;
  }
}

// -------------------------------------------------------------------
// 4) HUD
// -------------------------------------------------------------------
function createHUD_Bottom() {
  let controlPanel = createDiv();
  controlPanel.style("position","absolute");
  controlPanel.style("bottom","0");
  controlPanel.style("left","0");
  controlPanel.style("width","100%");
  controlPanel.style("background","black");
  controlPanel.style("color","grey");
  controlPanel.style("text-align","center");
  controlPanel.style("padding","10px 0");
  controlPanel.style("font-family","sans-serif");
  controlPanel.style("z-index","9999");
  controlPanel.parent(document.body);
  
  // Row1: Buttons
  let row1=createDiv();
  row1.parent(controlPanel);
  row1.style("display","flex");
  row1.style("justify-content","center");
  row1.style("align-items","center");
  row1.style("gap","10px");
  row1.style("margin-bottom","10px");
  
  let spawnBtn=createButton("Spawn");
  spawnBtn.parent(row1);
  spawnBtn.mouseClicked(()=>spawnTendrils(5));
  
  let huntBtn=createButton("Hunt");
  huntBtn.parent(row1);
  huntBtn.mouseClicked(triggerHunt);
  
  let burstBtn=createButton("Burst");
  burstBtn.parent(row1);
  burstBtn.mouseClicked(triggerRepel);
  
  let novaBtn=createButton("Nova");
  novaBtn.parent(row1);
  novaBtn.mouseClicked(()=>{
    if (novaTimer>=NOVA_THRESHOLD) {
      triggerNovaManual();
      novaTimer=0; // reset so it can refill
    }
  });
  
  [spawnBtn,huntBtn,burstBtn,novaBtn].forEach(btn=>{
    btn.style("font-size","18px");
    btn.style("background-color","#202325");
    btn.style("color","#9C89B8");
    btn.style("padding","5px 10px");
  });
  burstBtn.style("color","#00FFFF");
  novaBtn.style("color","#00FFFF");
  
  // Row2: Sliders
  let row2=createDiv();
  row2.parent(controlPanel);
  row2.style("display","flex");
  row2.style("justify-content","center");
  row2.style("align-items","center");
  row2.style("gap","20px");
  row2.style("margin-bottom","5px");
  
  agroSlider=createSlider(0,5,1.7,0.1);
  agroSlider.parent(row2);
  agroSlider.style("width","120px");
  
  gravitySlider=createSlider(0,5,1.5,0.1);
  gravitySlider.parent(row2);
  gravitySlider.style("width","120px");
  
  speedSlider=createSlider(0,5,1.95,0.1);
  speedSlider.parent(row2);
  speedSlider.style("width","120px");
  
  // Row3: Labels
  let row3=createDiv();
  row3.parent(controlPanel);
  row3.style("display","flex");
  row3.style("justify-content","center");
  row3.style("align-items","center");
  row3.style("gap","60px");
  row3.style("margin-bottom","10px");
  
  let agroLabel=createSpan("Agro");
  agroLabel.parent(row3);
  agroLabel.style("font-size","14px");
  agroLabel.style("color","#CCCCCC");
  
  let gravLabel=createSpan("Gravity");
  gravLabel.parent(row3);
  gravLabel.style("font-size","14px");
  gravLabel.style("color","#CCCCCC");
  
  let spdLabel=createSpan("Speed");
  spdLabel.parent(row3);
  spdLabel.style("font-size","14px");
  spdLabel.style("color","#CCCCCC");
  
  // Row4: Meters: Burst & Nova => both cyan
  let row4=createDiv();
  row4.parent(controlPanel);
  row4.style("display","flex");
  row4.style("justify-content","center");
  row4.style("align-items","center");
  row4.style("gap","20px");
  row4.style("margin-bottom","5px");
  
  burstMeter=createElement('meter');
  burstMeter.parent(row4);
  burstMeter.attribute("min","0");
  burstMeter.attribute("max",NOVA_THRESHOLD.toString());
  burstMeter.attribute("value","0");
  burstMeter.addClass("cyanMeter");
  
  novaMeter=createElement('meter');
  novaMeter.parent(row4);
  novaMeter.attribute("min","0");
  novaMeter.attribute("max",NOVA_THRESHOLD.toString());
  novaMeter.attribute("value","0");
  novaMeter.addClass("cyanMeter");
  
  // Row5: Meters: Hunt & Assimilation => both purple
  let row5=createDiv();
  row5.parent(controlPanel);
  row5.style("display","flex");
  row5.style("justify-content","center");
  row5.style("align-items","center");
  row5.style("gap","20px");
  row5.style("margin-bottom","10px");
  
  huntMeter=createElement('meter');
  huntMeter.parent(row5);
  huntMeter.attribute("min","0");
  huntMeter.attribute("max",HUNT_THRESHOLD.toString());
  huntMeter.attribute("value","0");
  huntMeter.addClass("desatpurple");
  
  abyssMeter=createElement('meter');
  abyssMeter.parent(row5);
  abyssMeter.attribute("min","0");
  abyssMeter.attribute("max",ABSYSS_THRESHOLD.toString());
  abyssMeter.attribute("value","0");
  abyssMeter.addClass("desatpurple");
  
  // Row6: Presets: Walls On/Off, Auto
  let row6=createDiv();
  row6.parent(controlPanel);
  row6.style("display","flex");
  row6.style("justify-content","center");
  row6.style("align-items","center");
  row6.style("gap","20px");
  row6.style("margin-bottom","10px");
  
  let wallsBtn = createButton("Walls: Off");
  wallsBtn.parent(row6);
  wallsBtn.mouseClicked(()=>{
    wallsOn = !wallsOn;
    wallsBtn.html("Walls: " + (wallsOn ? "On" : "Off"));
  });
  
  let autoBtn = createButton("Auto: On");
  autoBtn.parent(row6);
  autoBtn.mouseClicked(()=>{
    autoMode = !autoMode;
    autoBtn.html("Auto: " + (autoMode ? "On" : "Off"));
  });
}

// -------------------------------------------------------------------
// 5) Utility Functions
// -------------------------------------------------------------------
function handleKeyboard(finalSpeed) {
  if (!simulationRunning) return;
  let x=0, y=0;
  // WASD or Arrows
  if (keyIsDown(LEFT_ARROW) || keyIsDown(65))  x=-1;
  if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) x=1;
  if (keyIsDown(UP_ARROW) || keyIsDown(87))    y=-1;
  if (keyIsDown(DOWN_ARROW) || keyIsDown(83))  y=1;
  
  if (x!==0 || y!==0) {
    let move = createVector(x,y).normalize().mult(finalSpeed);
    singularity.pos.add(move);
  }
}

// spawn new tendrils
function spawnTendrils(count) {
  for (let i=0;i<count;i++){
    let t=new Tendril();
    tendrils.push(t);
  }
}

// triggers the “hunt” behavior
function triggerHunt() {
  for (let t of tendrils) {
    t.hunt(singularity.pos);
  }
}

// triggers the “repel” burst
function triggerRepel() {
  for (let t of tendrils) {
    let force = p5.Vector.sub(t.pos, singularity.pos);
    force.setMag(10);
    t.vel.add(force);
  }
  // visually fill the burst meter for a moment
  burstMeter.attribute("value", NOVA_THRESHOLD.toString());
}

// manual Nova
function triggerNovaManual() {
  explosionType="nova";
  explosionTimer=explosionDuration;
  for (let t of tendrils) {
    t.startImmolation();
  }
}

// explosion effect
function drawExplosion() {
  noFill();
  stroke(cyanColor);
  strokeWeight(4);
  let r = map(explosionTimer, explosionDuration, 0, 0, width*1.5);
  ellipse(singularity.pos.x, singularity.pos.y, r, r);
  noStroke();
}

// get how many are in orbit range
function getOrbitCount() {
  let c=0;
  for (let t of tendrils) {
    let d=p5.Vector.dist(t.pos, singularity.pos);
    if (d<ORBIT_DISTANCE) c++;
  }
  return c;
}

// reset assimilation
function resetAssimilation() {
  abyssAccumulator=0;
  singularity.deadTimer=0;
  singularity.state="gold";
  singularity.currentColor=color(255,215,0);
}

// fully reset
function resetSimulation() {
  singularity = new Singularity(width/2, height/2);
  tendrils=[];
  spawnTendrils(TENDRIL_COUNT);
  
  novaTimer=0;
  huntTimer=0;
  abyssAccumulator=0;
  spawnTimer=0;
  explosionTimer=0;
  explosionType="none";
  
  simulationRunning=true;
}

// For mobile swiping
function touchStarted() {
  lastTouchX=mouseX;
  lastTouchY=mouseY;
}

function touchMoved() {
  let dx=mouseX-lastTouchX;
  let dy=mouseY-lastTouchY;
  singularity.pos.add(dx,dy);
  lastTouchX=mouseX;
  lastTouchY=mouseY;
  return false; // prevent default
}
