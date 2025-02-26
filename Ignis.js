console.log("Ignis.js loaded and running!");

/*
  Ignis x Abyss – Life x Death

  Four health states based on assimilation fraction:
    0–50% => Gold  (full speed, color #FFD700)
    50–75% => Pink  (0.75 speed, color #FF69B4)
    75–100% => Purple (0.5 speed, color #800080)
    100% => Black (0 speed, dead => after 7s => revert to gold => assimilation=0)

  Also:
  - HUD at bottom
  - Single Speed slider
  - Walls On/Off
  - 4 screen-size presets + Auto
  - D-Pad for movement
*/

// -------------------------------------------------------------------
// 1) Classes
// -------------------------------------------------------------------

class Singularity {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.radius = 15;
    this.colorState = "gold"; 
    // colorState can be "gold","pink","purple","black"
    this.currentColor = color(255,215,0); // gold
    this.deadTimer = 0; // if black => count 7s => revert
  }

  update() {
    // We'll compute assimilation fraction in draw() & pass it to updateState(...)
    // This class just shows the final color & position
  }

  show() {
    noStroke();
    // if black => outline purple
    if (this.colorState === "black") {
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
    // spawn from random edge
    let edge = floor(random(4));
    if (edge === 0) {
      this.pos = createVector(random(width), 0);
    } else if (edge === 1) {
      this.pos = createVector(width, random(height));
    } else if (edge === 2) {
      this.pos = createVector(random(width), height);
    } else {
      this.pos = createVector(0, random(height));
    }
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
      // dying
      this.immolateTimer += deltaTime;
      if (this.immolateTimer > this.immolateDuration) {
        this.dead = true;
      }
    } else {
      // normal
      let simSpeed = agroSlider.value(); 
      let d = p5.Vector.dist(this.pos, singularity.pos);
      if (d > ORBIT_DISTANCE) {
        let baseForce = p5.Vector.sub(singularity.pos, this.pos);
        baseForce.setMag(0.05);
        this.acc.add(baseForce);
      }
      if (this.boostTimer > 0) {
        let boostForce = p5.Vector.sub(singularity.pos, this.pos);
        boostForce.setMag(0.2);
        this.acc.add(boostForce);
        this.boostTimer--;
      }
      this.vel.add(this.acc);
      this.vel.limit(this.maxSpeed * simSpeed);
      this.pos.add(this.vel);
      this.acc.mult(0);

      // bounce if wallsOn
      if (wallsOn) {
        if (this.pos.x < 0) {
          this.pos.x = 0;
          this.vel.x *= -1;
        }
        if (this.pos.x > width) {
          this.pos.x = width;
          this.vel.x *= -1;
        }
        if (this.pos.y < 0) {
          this.pos.y = 0;
          this.vel.y *= -1;
        }
        if (this.pos.y > height) {
          this.pos.y = height;
          this.vel.y *= -1;
        }
      }
    }

    // tail
    this.tail.push(this.pos.copy());
    if (this.tail.length > this.tailMax) {
      this.tail.shift();
    }
  }

  show() {
    noStroke();
    let drawColor;
    if (this.immolating) {
      // fade from purple->cyan->black
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
// 2) Global Vars
// -------------------------------------------------------------------
let TENDRIL_COUNT = 20;
let ORBIT_DISTANCE = 50;
let NOVA_THRESHOLD = 3500;
let ABSYSS_THRESHOLD = 13000;
let HUNT_THRESHOLD = 5000;
let NOVA_COOLDOWN_TIME = 10000;

let novaTimer = 0;
let huntTimer = 0;
let abyssAccumulator = 0; 
let novaCooldown = 0;

let spawnTimer = 0;
let SPAWN_INTERVAL = 5000;
let lastNovaTime = 0;
let explosionTimer = 0;
let explosionDuration = 500;
let explosionType = "none";
let deathBurstCount = 0;
let deathBurstInterval = 300;
let deathBurstTimer = 0;

let purpleColor, cyanColor, blackColor;
let tendrils = [];
let singularity;
let simulationRunning = true;

// Sliders
let agroSlider, gravitySlider, speedSlider;

// Meters
let huntMeter, abyssMeter, novaMeter, novaCooldownMeter;

// D-Pad
let dPadUp, dPadDown, dPadLeft, dPadRight;
let dPadDirection;
let dPadActive = false;
let touchStartX=0, touchStartY=0;

// Walls
let wallsOn = false;

// Screen modes
let autoMode = true;

// HUD container
let controlPanel;

// -------------------------------------------------------------------
// 3) Setup & Draw
// -------------------------------------------------------------------
function setup() {
  purpleColor = color(130,0,130);
  cyanColor   = color(0,255,255);
  blackColor  = color(0,0,0);

  // auto by default
  createCanvas(windowWidth, windowHeight);

  createHUD_Bottom();
  resetSimulation();
}

function draw() {
  background(0);

  // compute assimilation fraction
  let frac = abyssAccumulator / ABSYSS_THRESHOLD;
  if (frac>1) frac=1;

  // determine colorState & speedFactor based on fraction
  let colorState;
  let speedFactor=1;
  if (frac < 0.5) {
    colorState="gold";        // full speed
    speedFactor=1;
  } else if (frac < 0.75) {
    colorState="pink";        // 0.75 speed
    speedFactor=0.75;
  } else if (frac < 1) {
    colorState="purple";      // 0.5 speed
    speedFactor=0.5;
  } else {
    colorState="black";       // 0 speed => dead
    speedFactor=0;
  }

  // if black => freeze => after 7s => revert fraction=0 => color=gold
  if (colorState==="black") {
    singularity.deadTimer += deltaTime;
    if (singularity.deadTimer>7000) {
      // revert to gold
      assimilationReset();
    }
  } else {
    // not black => reset deadTimer
    singularity.deadTimer=0;
  }

  // set color & final speed
  let finalSpeed=0;
  let finalColor;
  if (colorState==="gold") {
    finalSpeed = speedSlider.value();
    finalColor = color(255,215,0);  // gold
  } else if (colorState==="pink") {
    finalSpeed = speedSlider.value()*0.75;
    finalColor = color(255,105,180); // pinkish
  } else if (colorState==="purple") {
    finalSpeed = speedSlider.value()*0.5;
    finalColor = color(128,0,128); // purple
  } else {
    finalSpeed = 0;
    finalColor = color(0,0,0); // black
  }

  // apply final speed to keyboard & D-Pad
  handleKeyboard(finalSpeed);
  if (dPadDirection.x!==0 || dPadDirection.y!==0) {
    singularity.pos.x += dPadDirection.x * finalSpeed;
    singularity.pos.y += dPadDirection.y * finalSpeed;
  }

  // update singularity color
  singularity.colorState=colorState;
  singularity.currentColor=finalColor;

  // spawn
  spawnTimer+=deltaTime;
  if (spawnTimer>SPAWN_INTERVAL) {
    spawnTendrils(10);
    spawnTimer=0;
  }

  // hunt
  huntTimer+=deltaTime;
  if (huntTimer>=HUNT_THRESHOLD) {
    triggerHunt();
    huntTimer=0;
  }
  huntMeter.attribute("value", huntTimer.toString());

  // assimilation fraction => we only increment if >=3 tendrils in orbit
  let countOrbit=0;
  for (let t of tendrils) {
    let d = p5.Vector.dist(t.pos, singularity.pos);
    if (d<ORBIT_DISTANCE) countOrbit++;
  }
  if (countOrbit>=3 && colorState!=="black") {
    abyssAccumulator+=deltaTime;
  } else if (colorState!=="black") {
    // if not black => reset if <3 orbit
    if (frac<1) abyssAccumulator=frac*ABSYSS_THRESHOLD; // keep fraction
  }

  if (novaTimer>=NOVA_THRESHOLD) {
    triggerNovaBurst();
    novaTimer=0;
  }
  novaTimer+=deltaTime;
  novaMeter.attribute("value",novaTimer.toString());

  if (novaCooldown>0) {
    novaCooldown-=deltaTime;
    if (novaCooldown<0) novaCooldown=0;
  }
  novaCooldownMeter.attribute("value",novaCooldown.toString());

  singularity.update();
  singularity.show();

  // tendrils
  let gravPull = gravitySlider.value();
  for (let t of tendrils) {
    let d = p5.Vector.dist(t.pos, singularity.pos);
    if (d<ORBIT_DISTANCE) {
      t.orbit(singularity.pos, gravPull);
    }
    t.update();
    t.show();
  }

  // if fraction=1 => explosion => we handle the multi-death burst chain
  if ((colorState==="black") && deathBurstCount>0) {
    deathBurstTimer+=deltaTime;
    if (deathBurstTimer>=deathBurstInterval) {
      explosionType="death";
      explosionTimer=explosionDuration;
      deathBurstTimer=0;
      deathBurstCount--;
    }
  }

  if (explosionTimer>0) {
    drawExplosion();
    explosionTimer-=deltaTime;
  }

  // remove dead
  tendrils=tendrils.filter(t=>!t.dead);
}

// assimilationReset => revert fraction=0 => color=gold => etc
function assimilationReset() {
  abyssAccumulator=0;
  singularity.deadTimer=0;
  singularity.colorState="gold";
  singularity.currentColor=color(255,215,0);
}

// -------------------------------------------------------------------
// 4) Create HUD at bottom
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

  // Row1: Spawn,Hunt,Burst,Nova
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
  burstBtn.mousePressed(triggerRepel);

  let novaBtn=createButton("Nova");
  novaBtn.parent(row1);
  novaBtn.mousePressed(()=>{
    if(novaCooldown<=0) {
      triggerNovaManual();
      novaCooldown=NOVA_COOLDOWN_TIME;
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

  // Row4: Nova & NovaCooldown
  let row4=createDiv();
  row4.parent(controlPanel);
  row4.style("display","flex");
  row4.style("justify-content","center");
  row4.style("align-items","center");
  row4.style("gap","20px");
  row4.style("margin-bottom","5px");

  novaMeter=createElement('meter');
  novaMeter.parent(row4);
  novaMeter.attribute("min","0");
  novaMeter.attribute("max",NOVA_THRESHOLD.toString());
  novaMeter.attribute("value","0");

  novaCooldownMeter=createElement('meter');
  novaCooldownMeter.parent(row4);
  novaCooldownMeter.attribute("min","0");
  novaCooldownMeter.attribute("max",NOVA_COOLDOWN_TIME.toString());
  novaCooldownMeter.attribute("value","0");

  // Row5: Hunt & Abyss
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

  abyssMeter=createElement('meter');
  abyssMeter.parent(row5);
  abyssMeter.attribute("min","0");
  abyssMeter.attribute("max",ABSYSS_THRESHOLD.toString());
  abyssMeter.attribute("value","0");

  // Row6: Walls On/Off, D-Pad, PC, Mobile, Auto, Tablet
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

  // D-Pad container
  let dPadCont=createDiv();
  dPadCont.parent(row6);
  dPadCont.style("display","flex");
  dPadCont.style("flex-direction","column");
  dPadCont.style("align-items","center");
  dPadCont.style("gap","5px");

  let dPadRow1=createDiv();
  dPadRow1.parent(dPadCont);
  dPadRow1.style("display","flex");
  dPadRow1.style("justify-content","center");
  dPadUp=createButton("↑");
  dPadUp.parent(dPadRow1);
  dPadUp.mousePressed(()=>{dPadDirection.set(0,-1);});
  dPadUp.mouseReleased(()=>{dPadDirection.y=0;});

  let dPadRow2=createDiv();
  dPadRow2.parent(dPadCont);
  dPadRow2.style("display","flex");
  dPadRow2.style("justify-content","space-between");
  dPadRow2.style("width","60px");
  dPadLeft=createButton("←");
  dPadLeft.parent(dPadRow2);
  dPadLeft.mousePressed(()=>{dPadDirection.set(-1,dPadDirection.y);});
  dPadLeft.mouseReleased(()=>{dPadDirection.x=0;});

  dPadRight=createButton("→");
  dPadRight.parent(dPadRow2);
  dPadRight.mousePressed(()=>{dPadDirection.set(1,dPadDirection.y);});
  dPadRight.mouseReleased(()=>{dPadDirection.x=0;});

  let dPadRow3=createDiv();
  dPadRow3.parent(dPadCont);
  dPadRow3.style("display","flex");
  dPadRow3.style("justify-content","center");
  dPadDown=createButton("↓");
  dPadDown.parent(dPadRow3);
  dPadDown.mousePressed(()=>{dPadDirection.set(dPadDirection.x,1);});
  dPadDown.mouseReleased(()=>{dPadDirection.y=0;});

  dPadDirection=createVector(0,0);

  // Buttons for PC, Mobile, Auto, Tablet
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
// 5) The rest of logic
// -------------------------------------------------------------------
function resetSimulation() {
  simulationRunning=true;
  explosionTimer=0;
  spawnTimer=0;
  lastNovaTime=0;
  abyssAccumulator=0;
  novaTimer=0;
  huntTimer=0;
  novaCooldown=0;
  deathBurstCount=0;
  deathBurstTimer=0;

  tendrils=[];
  singularity=new Singularity(width/2,height/2);

  for(let i=0;i<TENDRIL_COUNT;i++){
    let t=new Tendril();
    t.autoHunt(singularity.pos);
    tendrils.push(t);
  }
}

function spawnTendrils(n=1){
  let available=50 - tendrils.length;
  let toSpawn=min(n,available);
  for(let i=0;i<toSpawn;i++){
    let t=new Tendril();
    t.autoHunt(singularity.pos);
    tendrils.push(t);
  }
}

function handleKeyboard(finalSpeed){
  if(keyIsDown(LEFT_ARROW)||keyIsDown(65)) singularity.pos.x-=finalSpeed;
  if(keyIsDown(RIGHT_ARROW)||keyIsDown(68)) singularity.pos.x+=finalSpeed;
  if(keyIsDown(UP_ARROW)||keyIsDown(87)) singularity.pos.y-=finalSpeed;
  if(keyIsDown(DOWN_ARROW)||keyIsDown(83)) singularity.pos.y+=finalSpeed;

  // clamp
  singularity.pos.x=constrain(singularity.pos.x,singularity.radius,width - singularity.radius);
  singularity.pos.y=constrain(singularity.pos.y,singularity.radius,height - singularity.radius);
}

function keyReleased(){
  if(keyCode===32) triggerRepel();
  if(keyCode===86 && novaCooldown<=0){
    triggerNovaManual();
    novaCooldown=NOVA_COOLDOWN_TIME;
  }
}

function triggerHunt(){
  for(let t of tendrils){
    t.hunt(singularity.pos);
  }
}

function triggerRepel(){
  for(let t of tendrils){
    let d=p5.Vector.dist(t.pos,singularity.pos);
    if(d<ORBIT_DISTANCE){
      let repulse=p5.Vector.sub(t.pos,singularity.pos);
      repulse.normalize();
      repulse.mult(12);
      t.vel=repulse.copy();
    }
  }
  explosionType="burst";
  explosionTimer=500;
}

function triggerNovaManual(){
  for(let t of tendrils){
    let d=p5.Vector.dist(t.pos,singularity.pos);
    if(d<ORBIT_DISTANCE && !t.immolating){
      t.startImmolation();
    }
  }
  explosionType="nova";
  explosionTimer=500;
}

function triggerNovaBurst(){
  let count=0;
  for(let t of tendrils){
    let d=p5.Vector.dist(t.pos,singularity.pos);
    if(d<ORBIT_DISTANCE && !t.immolating){
      t.startImmolation();
      count++;
      if(count>=5) break;
    }
  }
  explosionType="nova";
  explosionTimer=500;
}

function touchStarted(){
  if(touches.length>0){
    let t=touches[0];
    // if x<30% => D-Pad
    if(t.x<width*0.3){
      dPadActive=true;
    } else {
      touchStartX=t.x;
      touchStartY=t.y;
    }
  }
}

function touchMoved(){
  // no direct movement, we do it in draw with finalSpeed
}

function touchEnded(){
  dPadActive=false;
}

function windowResized(){
  if(autoMode){
    resizeCanvas(windowWidth,windowHeight);
    resetSimulation();
  }
}

function drawExplosion(){
  push();
  translate(singularity.pos.x,singularity.pos.y);
  let steps=5;
  let alphaVal=map(explosionTimer,0,explosionDuration,0,255);

  if(explosionType==="nova"){
    stroke(0,255,255,alphaVal);
  } else if(explosionType==="burst"){
    stroke(255,215,0,alphaVal);
  } else if(explosionType==="death"){
    stroke(255,0,255,alphaVal);
  } else {
    stroke(255,215,0,alphaVal);
  }

  noFill();
  for(let i=0;i<20;i++){
    push();
    rotate(random(TWO_PI));
    beginShape();
    let len=random(20,50);
    vertex(0,0);
    for(let j=0;j<steps;j++){
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
