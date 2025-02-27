console.log("Ignis.js loaded and running!!!");

/*
  Ignis x Abyss – Life x Death

  Final Build Features:
  1) Movement:
     - One "Movement" slider controls both keyboard & touch speed.
     - Effective speed = slider value × health multiplier:
       • 0–50% assimilation => Gold => 1.0
       • 51–75% => Pink => 0.75
       • 76–99% => Purple => 0.5
       • ≥100% => Black => 0
  2) Attacks:
     - Burst (Space or "Burst" button): stronger repel (gold explosion).
     - Auto Nova Pulse: every 3s, kills up to 5 tendrils in orbit.
     - SuperNova: 10s meter => kills all in orbit (button or "V" key).
  3) Assimilation:
     - If ≥3 tendrils orbit, assimilation meter (abyssAccumulator) increases.
     - Otherwise, it decays gradually.
     - Health (and movement multiplier) is determined by fraction of ABSYSS_THRESHOLD.
  4) Two toggles: "Random" & "Hard":
     - Random => randomizes sliders each time Hunt meter fills.
     - Hard => triggers extra hunts each time Hunt meter fills.
  5) Walls toggle & screen-size presets remain.
*/

// Timings & thresholds
const AUTO_NOVA_THRESHOLD = 3000;   // 3s for Auto Nova Pulse
const SUPERNOVA_THRESHOLD = 10000;  // 10s for SuperNova
const ORBIT_DISTANCE = 50;
const ABSYSS_THRESHOLD = 13000;
const HUNT_THRESHOLD = 5000;
const SPAWN_INTERVAL = 5000;
const explosionDuration = 500;

// -------------------------------------------------------------------
// 1) Classes
// -------------------------------------------------------------------
class Singularity {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.baseRadius = 15;
    this.radius = this.baseRadius;
    this.pulseSpeed = 0.05;
    this.state = "healthy"; // "healthy","injured","dying","dead"
    this.currentColor = color(255,215,0); // gold
    this.movementMultiplier = 1.0;
  }

  update() {
    // Compute assimilation fraction
    let frac = abyssAccumulator / ABSYSS_THRESHOLD;
    if (frac <= 0.5) {
      this.state = "healthy";
      this.currentColor = color(255,215,0); // gold
      this.movementMultiplier = 1.0;
    } else if (frac <= 0.75) {
      this.state = "injured";
      this.currentColor = color(255,105,180); // pink
      this.movementMultiplier = 0.75;
    } else if (frac < 1) {
      this.state = "dying";
      this.currentColor = color(128,0,128); // purple
      this.movementMultiplier = 0.5;
    } else {
      this.state = "dead";
      this.currentColor = color(0,0,0); // black
      this.movementMultiplier = 0;
      if (deathBurstCount === 0) {
        explosionType = "death";
        explosionTimer = explosionDuration;
        deathBurstCount = 5;
        deathBurstTimer = 0;
      }
    }
    // Pulsate if not dead
    if (this.state !== "dead") {
      this.radius = this.baseRadius + sin(frameCount * this.pulseSpeed) * 5;
    }
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
    // Spawn from a random edge
    let edge = floor(random(4));
    if (edge === 0) this.pos = createVector(random(width), 0);
    else if (edge === 1) this.pos = createVector(width, random(height));
    else if (edge === 2) this.pos = createVector(random(width), height);
    else this.pos = createVector(0, random(height));

    this.vel = createVector(0, 0);
    this.acc = createVector(0, 0);
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
    this.boostTimer = 30;
  }

  orbit(targetPos, pullStrength) {
    let desired = p5.Vector.sub(targetPos, this.pos);
    let tangent = createVector(-desired.y, desired.x).normalize().mult(pullStrength);
    desired.normalize().mult(pullStrength);
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
        let baseForce = p5.Vector.sub(singularity.pos, this.pos).setMag(0.05);
        this.acc.add(baseForce);
      }
      if (this.boostTimer > 0) {
        let boostForce = p5.Vector.sub(singularity.pos, this.pos).setMag(0.2);
        this.acc.add(boostForce);
        this.boostTimer--;
      }
      this.vel.add(this.acc).limit(this.maxSpeed * simSpeed);
      this.pos.add(this.vel);
      this.acc.mult(0);
      if (wallsOn) {
        if (this.pos.x < 0) { this.pos.x = 0; this.vel.x *= -1; }
        if (this.pos.x > width) { this.pos.x = width; this.vel.x *= -1; }
        if (this.pos.y < 0) { this.pos.y = 0; this.vel.y *= -1; }
        if (this.pos.y > height) { this.pos.y = height; this.vel.y *= -1; }
      }
    }
    this.tail.push(this.pos.copy());
    if (this.tail.length > this.tailMax) this.tail.shift();
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
    ellipse(this.pos.x, this.pos.y, 7, 7);
    strokeWeight(1);
    noFill();
    beginShape();
    for (let i=0; i<this.tail.length; i++){
      let pos = this.tail[i];
      let alpha = map(i,0,this.tail.length,0,255);
      stroke(red(drawColor), green(drawColor), blue(drawColor), alpha);
      vertex(pos.x, pos.y);
    }
    endShape();
  }
}

// -------------------------------------------------------------------
// 2) Global Variables
// -------------------------------------------------------------------
let TENDRIL_COUNT = 20;
let autoNovaTimer = 0;     // auto Nova (~3s)
let superNovaTimer = 0;    // superNova (~10s)
let huntTimer = 0;
let abyssAccumulator = 0;
let spawnTimer = 0;
let explosionTimer = 0;
let explosionType = "none";
let deathBurstCount = 0;
let deathBurstTimer = 0;

let purpleColor, cyanColor, blackColor;
let tendrils = [];
let singularity;
let simulationRunning = true;

// Sliders
let agroSlider, gravitySlider, movementSlider;

// New toggles, declared once
let randomMode = false;
let hardMode = false;

let wallsOn = false, autoMode = true;

// HUD references
let controlPanel, huntMeter, abyssMeter, autoNovaMeter, superNovaMeter;

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

  // 1) Movement => slider × health multiplier
  let effectiveSpeed = movementSlider.value() * singularity.movementMultiplier;
  handleKeyboard(effectiveSpeed);

  // 2) Auto Nova Pulse
  autoNovaTimer += deltaTime;
  if (autoNovaTimer >= AUTO_NOVA_THRESHOLD) {
    triggerAutoNovaPulse();
    autoNovaTimer = 0;
  }
  autoNovaMeter.attribute("value", autoNovaTimer.toString());

  // 3) SuperNova fill
  if (superNovaTimer < SUPERNOVA_THRESHOLD) {
    superNovaTimer += deltaTime;
    if (superNovaTimer > SUPERNOVA_THRESHOLD) superNovaTimer = SUPERNOVA_THRESHOLD;
  }
  superNovaMeter.attribute("value", superNovaTimer.toString());

  // 4) Hunt Timer
  huntTimer += deltaTime;
  if (huntTimer >= HUNT_THRESHOLD) {
    // Trigger normal hunt
    triggerHunt();
    // If hardMode => trigger multiple hunts
    if (hardMode) {
      triggerHunt();
      triggerHunt();
    }
    // If randomMode => randomize sliders
    if (randomMode) {
      randomizeSliders();
    }
    huntTimer = 0;
  }
  huntMeter.attribute("value", huntTimer.toString());

  // 5) Assimilation => if ≥3 orbit => accumulate, else decay
  if (getOrbitCount() >= 3) {
    abyssAccumulator += deltaTime;
  } else {
    abyssAccumulator = max(0, abyssAccumulator - deltaTime*0.5);
  }
  if (abyssAccumulator >= ABSYSS_THRESHOLD) {
    singularity.state = "dead";
    explosionType = "death";
    explosionTimer = explosionDuration;
    deathBurstCount = 5;
    deathBurstTimer = 0;
    abyssAccumulator = ABSYSS_THRESHOLD; 
  }
  abyssMeter.attribute("value", abyssAccumulator.toString());

  if (singularity.state === "dead" && deathBurstCount>0) {
    deathBurstTimer += deltaTime;
    if (deathBurstTimer >= 300) {
      explosionType="death";
      explosionTimer=explosionDuration;
      deathBurstTimer=0;
      deathBurstCount--;
    }
  }

  // 6) Spawning
  spawnTimer += deltaTime;
  if (spawnTimer>SPAWN_INTERVAL) {
    spawnTendrils(10);
    spawnTimer=0;
  }

  // 7) Update & show singularity & tendrils
  singularity.update();
  singularity.show();
  for (let t of tendrils) {
    let d=p5.Vector.dist(t.pos, singularity.pos);
    if (d<ORBIT_DISTANCE) t.orbit(singularity.pos, gravitySlider.value());
    t.update();
    t.show();
  }
  tendrils = tendrils.filter(t=>!t.dead);

  // 8) Explosion effect
  if (explosionTimer>0) {
    drawExplosion();
    explosionTimer -= deltaTime;
  }
}

function windowResized() {
  if (autoMode) {
    resizeCanvas(windowWidth, windowHeight);
    resetSimulation();
  }
}

// -------------------------------------------------------------------
// 4) HUD
// -------------------------------------------------------------------
function createHUD_Bottom() {
  controlPanel = createDiv();
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

  // Row1: Attack Buttons
  let row1 = createDiv();
  row1.parent(controlPanel);
  row1.style("display","flex");
  row1.style("justify-content","center");
  row1.style("align-items","center");
  row1.style("gap","10px");
  row1.style("margin-bottom","10px");

  let spawnBtn = createButton("Spawn");
  spawnBtn.parent(row1);
  spawnBtn.mousePressed(()=>spawnTendrils(5));

  let huntBtn = createButton("Hunt");
  huntBtn.parent(row1);
  huntBtn.mousePressed(triggerHunt);

  let burstBtn = createButton("Burst");
  burstBtn.parent(row1);
  burstBtn.style("color","#FFD700"); 
  burstBtn.mousePressed(triggerRepel);

  let novaBtn = createButton("Nova");
  novaBtn.parent(row1);
  novaBtn.mousePressed(()=>{
    if (superNovaTimer>=SUPERNOVA_THRESHOLD) {
      triggerSuperNova();
      superNovaTimer=0;
    }
  });

  [spawnBtn, huntBtn, burstBtn, novaBtn].forEach(btn=>{
    btn.style("font-size","18px");
    btn.style("background-color","#202325");
    btn.style("color","#9C89B8");
    btn.style("padding","5px 10px");
  });
  burstBtn.style("color","#FFD700");
  novaBtn.style("color","#00FFFF");

  // Row1.5: toggles for Random & Hard
  let modeRow = createDiv();
  modeRow.parent(controlPanel);
  modeRow.style("display","flex");
  modeRow.style("justify-content","center");
  modeRow.style("align-items","center");
  modeRow.style("gap","10px");
  modeRow.style("margin-bottom","10px");

  let randomBtn = createButton("Random: OFF");
  randomBtn.parent(modeRow);
  randomBtn.mousePressed(()=>{
    randomMode=!randomMode;
    randomBtn.html("Random: "+(randomMode?"ON":"OFF"));
  });

  let hardBtn = createButton("Hard: OFF");
  hardBtn.parent(modeRow);
  hardBtn.mousePressed(()=>{
    hardMode=!hardMode;
    hardBtn.html("Hard: "+(hardMode?"ON":"OFF"));
  });

  // Row2: Sliders => Agro, Gravity, Movement
  let row2=createDiv();
  row2.parent(controlPanel);
  row2.style("display","flex");
  row2.style("justify-content","center");
  row2.style("align-items","center");
  row2.style("gap","20px");
  row2.style("margin-bottom","5px");

  agroSlider = createSlider(0,5,1.7,0.1);
  agroSlider.parent(row2);
  agroSlider.style("width","100px");

  gravitySlider = createSlider(0,5,1.5,0.1);
  gravitySlider.parent(row2);
  gravitySlider.style("width","100px");

  movementSlider = createSlider(0,5,1.0,0.1);
  movementSlider.parent(row2);
  movementSlider.style("width","100px");

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

  let moveLabel=createSpan("Movement");
  moveLabel.parent(row3);
  moveLabel.style("font-size","14px");
  moveLabel.style("color","#CCCCCC");

  // Row4: Meters => AutoNova & SuperNova (cyan)
  let row4=createDiv();
  row4.parent(controlPanel);
  row4.style("display","flex");
  row4.style("justify-content","center");
  row4.style("align-items","center");
  row4.style("gap","20px");
  row4.style("margin-bottom","5px");

  autoNovaMeter=createElement('meter');
  autoNovaMeter.parent(row4);
  autoNovaMeter.attribute("min","0");
  autoNovaMeter.attribute("max",AUTO_NOVA_THRESHOLD.toString());
  autoNovaMeter.attribute("value","0");
  autoNovaMeter.addClass("cyanMeter");

  superNovaMeter=createElement('meter');
  superNovaMeter.parent(row4);
  superNovaMeter.attribute("min","0");
  superNovaMeter.attribute("max",SUPERNOVA_THRESHOLD.toString());
  superNovaMeter.attribute("value","0");
  superNovaMeter.addClass("cyanMeter");

  // Row5: Hunt & Abyss => desat purple
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

  // Row6: Walls & Screen Presets
  let row6=createDiv();
  row6.parent(controlPanel);
  row6.style("display","flex");
  row6.style("justify-content","center");
  row6.style("align-items","center");
  row6.style("gap","10px");

  let wallsBtn=createButton("Walls: OFF");
  wallsBtn.parent(row6);
  wallsBtn.mousePressed(()=>{
    wallsOn=!wallsOn;
    wallsBtn.html("Walls: "+(wallsOn?"ON":"OFF"));
  });

  let pcBtn=createButton("PC");
  pcBtn.parent(row6);
  pcBtn.mousePressed(()=>{
    autoMode=false;
    resizeCanvas(1200,900);
    resetSimulation();
  });

  let mobileBtn=createButton("Mobile");
  mobileBtn.parent(row6);
  mobileBtn.mousePressed(()=>{
    autoMode=false;
    resizeCanvas(360,640);
    resetSimulation();
  });

  let autoBtn=createButton("Auto");
  autoBtn.parent(row6);
  autoBtn.mousePressed(()=>{
    autoMode=true;
    resizeCanvas(windowWidth,windowHeight);
    resetSimulation();
  });

  let tabletBtn=createButton("Tablet");
  tabletBtn.parent(row6);
  tabletBtn.mousePressed(()=>{
    autoMode=false;
    resizeCanvas(768,1024);
    resetSimulation();
  });
}

// -------------------------------------------------------------------
// 5) The rest of the logic
// -------------------------------------------------------------------
function resetSimulation() {
  simulationRunning=true;
  explosionTimer=0;
  spawnTimer=0;
  abyssAccumulator=0;
  huntTimer=0;
  autoNovaTimer=0;
  superNovaTimer=0;
  tendrils=[];
  singularity=new Singularity(width/2,height/2);
  for (let i=0;i<TENDRIL_COUNT;i++){
    let t=new Tendril();
    t.autoHunt(singularity.pos);
    tendrils.push(t);
  }
}

function spawnTendrils(n=1) {
  let available=50 - tendrils.length;
  let toSpawn=min(n,available);
  for (let i=0; i<toSpawn; i++){
    let t=new Tendril();
    t.autoHunt(singularity.pos);
    tendrils.push(t);
  }
}

function handleKeyboard(finalSpeed) {
  if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) singularity.pos.x -= finalSpeed;
  if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) singularity.pos.x += finalSpeed;
  if (keyIsDown(UP_ARROW) || keyIsDown(87))    singularity.pos.y -= finalSpeed;
  if (keyIsDown(DOWN_ARROW) || keyIsDown(83))  singularity.pos.y += finalSpeed;
  singularity.pos.x=constrain(singularity.pos.x, singularity.radius, width - singularity.radius);
  singularity.pos.y=constrain(singularity.pos.y, singularity.radius, height - singularity.radius);
}

function keyReleased() {
  // Space => Burst
  if (keyCode===32) {
    triggerRepel();
  }
  // V => SuperNova only if meter full
  if (keyCode===86) {
    if (superNovaTimer>=SUPERNOVA_THRESHOLD) {
      triggerSuperNova();
      superNovaTimer=0;
    }
  }
}

function triggerHunt() {
  for (let t of tendrils) {
    t.hunt(singularity.pos);
  }
}

function triggerRepel() {
  // Stronger repulsion => multiplier 18
  for (let t of tendrils) {
    let d=p5.Vector.dist(t.pos, singularity.pos);
    if (d<ORBIT_DISTANCE && !t.immolating) {
      let repulse=p5.Vector.sub(t.pos, singularity.pos).normalize().mult(18);
      t.vel=repulse.copy();
    }
  }
  explosionType="burst";
  explosionTimer=500;
}

function triggerAutoNovaPulse() {
  let count=0;
  for (let t of tendrils) {
    let d=p5.Vector.dist(t.pos, singularity.pos);
    if (d<ORBIT_DISTANCE && !t.immolating) {
      t.startImmolation();
      count++;
      if (count>=5) break;
    }
  }
  explosionType="nova";
  explosionTimer=explosionDuration;
}

function triggerSuperNova() {
  for (let t of tendrils) {
    let d=p5.Vector.dist(t.pos, singularity.pos);
    if (d<ORBIT_DISTANCE && !t.immolating) {
      t.startImmolation();
    }
  }
  explosionType="supernova";
  explosionTimer=explosionDuration*1.5;
}

function getOrbitCount() {
  let c=0;
  for (let t of tendrils) {
    let d=p5.Vector.dist(t.pos, singularity.pos);
    if (d<ORBIT_DISTANCE) c++;
  }
  return c;
}

function randomizeSliders() {
  agroSlider.value(random(0,5));
  gravitySlider.value(random(0,5));
  movementSlider.value(random(0,5));
}

// Touch => simple drag
function touchStarted() {
  if (touches.length>0) {
    let t=touches[0];
    touchStartX=t.x;
    touchStartY=t.y;
  }
}

function touchMoved() {
  if (touches.length>0) {
    let t=touches[0];
    let dx=t.x - touchStartX;
    let dy=t.y - touchStartY;
    let factor=movementSlider.value()*singularity.movementMultiplier;
    singularity.pos.x+=dx*factor;
    singularity.pos.y+=dy*factor;
    touchStartX=t.x;
    touchStartY=t.y;
  }
  return false;
}

function touchEnded() {
  // nothing needed
}

function drawExplosion() {
  push();
  translate(singularity.pos.x, singularity.pos.y);
  let steps=5;
  let alphaVal=map(explosionTimer,0,explosionDuration,0,255);
  if (explosionType==="burst") {
    stroke(255,215,0, alphaVal);
  } else if (explosionType==="nova") {
    stroke(0,255,255, alphaVal);
  } else if (explosionType==="supernova") {
    stroke(0,255,255, alphaVal);
  } else if (explosionType==="death") {
    stroke(255,0,255, alphaVal);
  } else {
    stroke(255,215,0, alphaVal);
  }
  noFill();
  for (let i=0;i<20;i++){
    push();
    rotate(random(TWO_PI));
    beginShape();
    let len=random(20,50);
    if (explosionType==="supernova") len=random(40,90);
    vertex(0,0);
    for (let j=0;j<steps;j++){
      let angle=random(-Math.PI/4,Math.PI/4);
      let x=cos(angle)*len;
      let y=sin(angle)*len;
      vertex(x,y);
    }
    endShape();
    pop();
  }
  pop();
}

// End of Ignis.js (Make sure you copied everything!)
