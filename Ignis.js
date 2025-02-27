console.log("Ignis.js loaded and running!!!");

/*
  Ignis x Abyss – Life x Death

  Key Features:
  1) Single Movement slider => speed = slider * healthMultiplier
  2) Auto Nova (~3s) kills up to 5
  3) SuperNova (~10s) kills all in orbit if triggered (button/V)
  4) Assimilation => if ≥3 tendrils orbit => meter rises, else decays
  5) Hard Mode => triple Hunt triggers (with 0.3s delays)
  6) Pink assimilation effect is smaller (50% size) & semi-transparent/pulsing
  7) A white flash is drawn over the Singularity when Burst is triggered
*/

const AUTO_NOVA_THRESHOLD = 3000;    // ~3s
const SUPERNOVA_THRESHOLD = 10000;   // ~10s
const ORBIT_DISTANCE = 50;
const ABSYSS_THRESHOLD = 13000;
const HUNT_THRESHOLD = 5000;
const SPAWN_INTERVAL = 5000;
const explosionDuration = 500;
const HOLD_THRESHOLD = 400;          // ms for right-side long hold => SuperNova

// Sliders & toggles
let agroSlider, gravitySlider, movementSlider;
let randomMode = false;
let hardMode = false;

// Pink assimilation effect smaller & pulsing => see drawExplosion() "death" case
// Hard mode => triple Hunt triggers with 0.3s delays

// assimilation
let abyssAccumulator = 0;
// timers
let autoNovaTimer = 0;
let superNovaTimer = 0;
let huntTimer = 0;
let spawnTimer = 0;
// explosion
let explosionTimer = 0;
let explosionType = "none";
let deathBurstCount = 0;
let deathBurstTimer = 0;
// toggles
let wallsOn = false, autoMode = true;
// white flash on Burst
let flashTimer = 0;

let purpleColor, cyanColor, blackColor;

// For multi-touch
let leftTouchActive = false;
let leftTouchPrevX=0, leftTouchPrevY=0;
let rightTouchActive = false;
let rightTouchStartTime=0;

// main objects
let singularity;
let tendrils = [];
let simulationRunning = true;
const TENDRIL_COUNT = 20;

// -------------------------------------------------------------------
// 1) Classes
// -------------------------------------------------------------------
class Singularity {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.baseRadius = 15;
    this.radius = this.baseRadius;
    this.pulseSpeed = 0.05;
    this.state = "healthy"; // healthy/injured/dying/dead
    this.currentColor = color(255,215,0);
    this.movementMultiplier = 1.0;
  }

  update() {
    let frac = abyssAccumulator / ABSYSS_THRESHOLD;
    if (frac <= 0.5) {
      this.state = "healthy";
      this.currentColor = color(255,215,0);
      this.movementMultiplier = 1.0;
    } else if (frac <= 0.75) {
      this.state = "injured";
      this.currentColor = color(255,105,180);
      this.movementMultiplier = 0.75;
    } else if (frac < 1) {
      this.state = "dying";
      this.currentColor = color(128,0,128);
      this.movementMultiplier = 0.5;
    } else {
      this.state = "dead";
      this.currentColor = color(0,0,0);
      this.movementMultiplier = 0;
      if (deathBurstCount === 0) {
        explosionType = "death";
        explosionTimer = explosionDuration;
        deathBurstCount = 5;
        deathBurstTimer = 0;
      }
    }
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
    let edge = floor(random(4));
    if (edge===0) this.pos=createVector(random(width),0);
    else if (edge===1) this.pos=createVector(width,random(height));
    else if (edge===2) this.pos=createVector(random(width),height);
    else this.pos=createVector(0,random(height));

    this.vel=createVector(0,0);
    this.acc=createVector(0,0);
    this.maxSpeed=3;
    this.tail=[];
    this.tailMax=20;
    this.boostTimer=0;
    this.immolating=false;
    this.immolateTimer=0;
    this.immolateDuration=2000;
    this.dead=false;
  }

  autoHunt(targetPos) {
    let force=p5.Vector.sub(targetPos,this.pos);
    force.setMag(random(1,2));
    this.vel=force;
  }

  hunt(targetPos) {
    this.boostTimer=30;
  }

  orbit(targetPos, pullStrength) {
    let desired=p5.Vector.sub(targetPos,this.pos);
    let tangent=createVector(-desired.y, desired.x).normalize().mult(pullStrength);
    desired.normalize().mult(pullStrength);
    this.acc.add(p5.Vector.add(desired, tangent));
  }

  startImmolation() {
    if (!this.immolating) {
      this.immolating=true;
      this.immolateTimer=0;
    }
  }

  update() {
    if (!simulationRunning) return;
    if (this.immolating) {
      this.immolateTimer+=deltaTime;
      if (this.immolateTimer>this.immolateDuration) {
        this.dead=true;
      }
    } else {
      let simSpeed=agroSlider.value();
      let d=p5.Vector.dist(this.pos, singularity.pos);
      if (d>ORBIT_DISTANCE) {
        let baseForce=p5.Vector.sub(singularity.pos,this.pos).setMag(0.05);
        this.acc.add(baseForce);
      }
      if (this.boostTimer>0) {
        let boostForce=p5.Vector.sub(singularity.pos,this.pos).setMag(0.2);
        this.acc.add(boostForce);
        this.boostTimer--;
      }
      this.vel.add(this.acc).limit(this.maxSpeed*simSpeed);
      this.pos.add(this.vel);
      this.acc.mult(0);

      if (wallsOn) {
        if (this.pos.x<0)      { this.pos.x=0; this.vel.x*=-1; }
        if (this.pos.x>width)  { this.pos.x=width; this.vel.x*=-1; }
        if (this.pos.y<0)      { this.pos.y=0; this.vel.y*=-1; }
        if (this.pos.y>height) { this.pos.y=height; this.vel.y*=-1; }
      }
    }
    this.tail.push(this.pos.copy());
    if (this.tail.length>this.tailMax) this.tail.shift();
  }

  show() {
    noStroke();
    let drawColor;
    if (this.immolating) {
      if (this.immolateTimer < this.immolateDuration/2) {
        let amt=this.immolateTimer/(this.immolateDuration/2);
        drawColor=lerpColor(purpleColor, cyanColor, amt);
      } else {
        let amt=(this.immolateTimer - this.immolateDuration/2)/(this.immolateDuration/2);
        drawColor=lerpColor(cyanColor, blackColor, amt);
      }
    } else {
      drawColor=color(130,0,130);
    }
    fill(drawColor);
    ellipse(this.pos.x,this.pos.y,7,7);
    strokeWeight(1);
    noFill();
    beginShape();
    for (let i=0;i<this.tail.length;i++){
      let pos=this.tail[i];
      let alpha=map(i,0,this.tail.length,0,255);
      stroke(red(drawColor), green(drawColor), blue(drawColor), alpha);
      vertex(pos.x,pos.y);
    }
    endShape();
  }
}

// -------------------------------------------------------------------
// 2) Setup & Draw
// -------------------------------------------------------------------
function setup() {
  purpleColor=color(130,0,130);
  cyanColor=color(0,255,255);
  blackColor=color(0,0,0);

  createCanvas(windowWidth,windowHeight);
  createHUD_Bottom();
  resetSimulation();
}

function draw() {
  background(0);

  // 1) Movement => movementSlider × health multiplier
  let effSpeed=movementSlider.value()*singularity.movementMultiplier;
  handleKeyboard(effSpeed);

  // 2) Hunt logic
  // If Hard Mode => triple hunt with 0.3s delays
  huntTimer+=deltaTime;
  if (huntTimer>=HUNT_THRESHOLD) {
    if (hardMode) {
      triggerHunt();
      setTimeout(triggerHunt,300);
      setTimeout(triggerHunt,600);
      if (randomMode) randomizeSliders();
    } else {
      // normal
      triggerHunt();
      if (randomMode) randomizeSliders();
    }
    huntTimer=0;
  }
  huntMeter.attribute("value", huntTimer.toString());

  // 3) Auto Nova ~3s => kills up to 5
  autoNovaTimer+=deltaTime;
  if (autoNovaTimer>=AUTO_NOVA_THRESHOLD) {
    triggerAutoNovaPulse();
    autoNovaTimer=0;
  }
  autoNovaMeter.attribute("value", autoNovaTimer.toString());

  // 4) SuperNova => fill ~10s
  if (superNovaTimer<SUPERNOVA_THRESHOLD) {
    superNovaTimer+=deltaTime;
    if (superNovaTimer>SUPERNOVA_THRESHOLD) superNovaTimer=SUPERNOVA_THRESHOLD;
  }
  superNovaMeter.attribute("value", superNovaTimer.toString());

  // 5) Assimilation => if≥3 => accumulate, else decay
  if (getOrbitCount()>=3) {
    abyssAccumulator+=deltaTime;
  } else {
    abyssAccumulator=max(0, abyssAccumulator - deltaTime*0.5);
  }
  if (abyssAccumulator>=ABSYSS_THRESHOLD) {
    singularity.state="dead";
    explosionType="death";
    explosionTimer=explosionDuration;
    deathBurstCount=5;
    deathBurstTimer=0;
    abyssAccumulator=ABSYSS_THRESHOLD;
  }
  abyssMeter.attribute("value", abyssAccumulator.toString());

  if (singularity.state==="dead" && deathBurstCount>0) {
    deathBurstTimer+=deltaTime;
    if (deathBurstTimer>=300) {
      explosionType="death";
      explosionTimer=explosionDuration;
      deathBurstTimer=0;
      deathBurstCount--;
    }
  }

  // 6) spawn
  spawnTimer+=deltaTime;
  if (spawnTimer>SPAWN_INTERVAL) {
    spawnTendrils(10);
    spawnTimer=0;
  }

  // 7) update & show singularity & tendrils
  singularity.update();
  singularity.show();
  for (let t of tendrils) {
    let d=p5.Vector.dist(t.pos, singularity.pos);
    if (d<ORBIT_DISTANCE) t.orbit(singularity.pos, gravitySlider.value());
    t.update();
    t.show();
  }
  tendrils=tendrils.filter(t=>!t.dead);

  // 8) explosion effect
  if (explosionTimer>0) {
    drawExplosion();
    explosionTimer-=deltaTime;
  }

  // 9) White flash effect after Burst
  if (flashTimer>0) {
    push();
    noFill();
    stroke(255,255,255,150);
    strokeWeight(4);
    ellipse(singularity.pos.x, singularity.pos.y, singularity.radius*2.2, singularity.radius*2.2);
    pop();
    flashTimer-=deltaTime;
  }
}

function windowResized() {
  if (autoMode) {
    resizeCanvas(windowWidth,windowHeight);
    resetSimulation();
  }
}

// -------------------------------------------------------------------
// 3) HUD
// -------------------------------------------------------------------
function createHUD_Bottom() {
  controlPanel=createDiv();
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
  let row1=createDiv();
  row1.parent(controlPanel);
  row1.style("display","flex");
  row1.style("justify-content","center");
  row1.style("align-items","center");
  row1.style("gap","10px");
  row1.style("margin-bottom","10px");

  let spawnBtn=createButton("Spawn");
  spawnBtn.parent(row1);
  spawnBtn.mousePressed(()=>spawnTendrils(5));

  let huntBtn=createButton("Hunt");
  huntBtn.parent(row1);
  huntBtn.mousePressed(triggerHunt);

  let burstBtn=createButton("Burst");
  burstBtn.parent(row1);
  burstBtn.style("color","#FFD700");
  burstBtn.mousePressed(()=>{
    triggerRepel();
    flashTimer=200; // white flash
  });

  let novaBtn=createButton("Nova");
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
  let modeRow=createDiv();
  modeRow.parent(controlPanel);
  modeRow.style("display","flex");
  modeRow.style("justify-content","center");
  modeRow.style("align-items","center");
  modeRow.style("gap","10px");
  modeRow.style("margin-bottom","10px");

  let randomBtn=createButton("Random: OFF");
  randomBtn.parent(modeRow);
  randomBtn.mousePressed(()=>{
    randomMode=!randomMode;
    randomBtn.html("Random: "+(randomMode?"ON":"OFF"));
  });

  let hardBtn=createButton("Hard: OFF");
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

  agroSlider=createSlider(0,5,1.7,0.1);
  agroSlider.parent(row2);
  agroSlider.style("width","100px");

  gravitySlider=createSlider(0,5,1.5,0.1);
  gravitySlider.parent(row2);
  gravitySlider.style("width","100px");

  movementSlider=createSlider(0,5,1.0,0.1);
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

  // Row4: Meters => AutoNova & SuperNova
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

  // Row5: Hunt & Abyss => desatpurple
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
// 4) The rest of the logic
// -------------------------------------------------------------------
function resetSimulation() {
  simulationRunning=true;
  explosionTimer=0;
  spawnTimer=0;
  abyssAccumulator=0;
  huntTimer=0;
  autoNovaTimer=0;
  superNovaTimer=0;
  flashTimer=0;
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
  for (let i=0;i<toSpawn;i++){
    let t=new Tendril();
    t.autoHunt(singularity.pos);
    tendrils.push(t);
  }
}

// Movement: WASD/Arrows => finalSpeed
function handleKeyboard(finalSpeed) {
  if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) singularity.pos.x-=finalSpeed;
  if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) singularity.pos.x+=finalSpeed;
  if (keyIsDown(UP_ARROW) || keyIsDown(87))    singularity.pos.y-=finalSpeed;
  if (keyIsDown(DOWN_ARROW) || keyIsDown(83))  singularity.pos.y+=finalSpeed;
  singularity.pos.x=constrain(singularity.pos.x, singularity.radius, width - singularity.radius);
  singularity.pos.y=constrain(singularity.pos.y, singularity.radius, height - singularity.radius);
}

function keyReleased() {
  // Space => Burst
  if (keyCode===32) {
    triggerRepel();
    flashTimer=200; // White flash
  }
  // V => SuperNova
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
  for (let t of tendrils) {
    let d=p5.Vector.dist(t.pos, singularity.pos);
    if (d<ORBIT_DISTAN
