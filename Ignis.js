console.log("Ignis.js loaded and running!");

/* 
  ...
*/

// ---------------- Global Constants and Variables ----------------
const TENDRIL_COUNT = 20;
const ORBIT_DISTANCE = 50;
const NOVA_THRESHOLD = 3500;
const ABSYSS_THRESHOLD = 13000;
const HUNT_THRESHOLD = 5000;
const NOVA_COOLDOWN_TIME = 10000;

let novaTimer = 0;
let huntTimer = 0;
let abyssAccumulator = 0;
let novaCooldown = 0;

let spawnTimer = 0;
const SPAWN_INTERVAL = 5000;
let lastNovaTime = 0;
let explosionTimer = 0;
const explosionDuration = 500;
let explosionType = "none";
let deathBurstCount = 0;
let deathBurstInterval = 300;
let deathBurstTimer = 0;

let purpleColor, cyanColor, blackColor;
let tendrils = [];
let singularity;
let simulationRunning = true;

let controlPanel, row1, row2, row3, row4;
let spawnBtn, huntBtn, burstBtn, novaBtn;
let aggressionInput, gravityInput, moveSpeedInput;
let novaMeter, novaCooldownMeter, huntMeter, abyssMeter;
let titleSpan;

// ---------------- Setup ----------------
function setup() {
  createCanvas(1200, 900);
  angleMode(RADIANS);
  document.body.style.backgroundColor = "#000000";
  
  // Define colors
  purpleColor = color(130, 0, 130);
  cyanColor = color(0, 255, 255);
  blackColor = color(0, 0, 0);
  
  // --- Add custom CSS for meters and responsive layout ---
  // Meters
  createElement('style', `
    meter.nova::-webkit-meter-optimum-value { background: #008B8B; }
    meter.nova::-webkit-meter-suboptimum-value { background: #008B8B; }
    meter.nova::-moz-meter-bar { background: #008B8B; }

    meter.abyss::-webkit-meter-optimum-value { background: #9C89B8; }
    meter.abyss::-webkit-meter-suboptimum-value { background: #9C89B8; }
    meter.abyss::-moz-meter-bar { background: #9C89B8; }

    meter.hunt::-webkit-meter-optimum-value { background: #7D6E93; }
    meter.hunt::-webkit-meter-suboptimum-value { background: #7D6E93; }
    meter.hunt::-moz-meter-bar { background: #7D6E93; }

    meter.novacooldown::-webkit-meter-optimum-value { background: #555555; }
    meter.novacooldown::-webkit-meter-suboptimum-value { background: #555555; }
    meter.novacooldown::-moz-meter-bar { background: #555555; }
  `).parent(document.head);

  // Responsive layout
  createElement('style', `
    /* Base style for rows */
    .row {
      display: flex;
      justify-content: center;
      align-items: center;
      flex-wrap: wrap;
      margin-bottom: 10px;
    }
    /* Meters get 300px wide by default */
    .meterRes {
      width: 300px;
      height: 30px;
    }
    /* On narrower screens, stack vertically & shrink font sizes */
    @media (max-width: 600px) {
      .row {
        flex-direction: column;
        margin-bottom: 5px;
      }
      .meterRes {
        width: 90%;  /* let them scale to container width */
        max-width: 400px;
        margin-top: 5px;
      }
      .btnRes {
        font-size: 18px;
      }
      .labelRes {
        font-size: 18px;
      }
      .inputRes {
        font-size: 18px;
        width: 60px;
      }
    }
  `).parent(document.head);
  
  // --- Control Panel Layout ---
  controlPanel = createDiv();
  controlPanel.style("position", "absolute");
  controlPanel.style("bottom", "20px");
  controlPanel.style("left", "50%");
  controlPanel.style("transform", "translateX(-50%)");
  controlPanel.style("width", "80%");
  controlPanel.style("max-width", "1200px");
  controlPanel.style("background", "black");
  controlPanel.style("color", "grey");
  controlPanel.style("text-align", "center");
  controlPanel.style("padding", "10px 0");
  
  // Tier 1: Numeric Inputs
  row1 = createDiv().addClass("row");
  row1.parent(controlPanel);

  let aggressionLabel = createDiv("Aggression");
  aggressionLabel.addClass("labelRes");
  aggressionLabel.parent(row1);
  aggressionLabel.style("margin", "5px");

  aggressionInput = createInput('1.7', 'number');
  aggressionInput.addClass("inputRes");
  aggressionInput.parent(row1);
  aggressionInput.style("margin", "5px");
  aggressionInput.attribute("step", "0.1");
  
  let gravityLabel = createDiv("Gravity");
  gravityLabel.addClass("labelRes");
  gravityLabel.parent(row1);
  gravityLabel.style("margin", "5px");
  
  gravityInput = createInput('1.5', 'number');
  gravityInput.addClass("inputRes");
  gravityInput.parent(row1);
  gravityInput.style("margin", "5px");
  gravityInput.attribute("step", "0.1");
  
  let speedLabel = createDiv("Speed");
  speedLabel.addClass("labelRes");
  speedLabel.parent(row1);
  speedLabel.style("margin", "5px");
  
  moveSpeedInput = createInput('1.95', 'number');
  moveSpeedInput.addClass("inputRes");
  moveSpeedInput.parent(row1);
  moveSpeedInput.style("margin", "5px");
  moveSpeedInput.attribute("step", "0.1");
  
  // Tier 2: Control Buttons
  row2 = createDiv().addClass("row");
  row2.parent(controlPanel);
  
  spawnBtn = createButton("Spawn");
  spawnBtn.addClass("btnRes");
  spawnBtn.parent(row2);
  spawnBtn.style("margin", "5px");
  spawnBtn.style("background-color", "#202325");
  spawnBtn.style("color", "#9C89B8");
  spawnBtn.mousePressed(() => spawnTendrils(5));
  
  huntBtn = createButton("Hunt");
  huntBtn.addClass("btnRes");
  huntBtn.parent(row2);
  huntBtn.style("margin", "5px");
  huntBtn.style("background-color", "#202325");
  huntBtn.style("color", "#9C89B8");
  huntBtn.mousePressed(triggerHunt);
  
  burstBtn = createButton("Burst");
  burstBtn.addClass("btnRes");
  burstBtn.parent(row2);
  burstBtn.style("margin", "5px");
  burstBtn.style("background-color", "#202325");
  burstBtn.style("color", "#00FFFF");
  burstBtn.mousePressed(triggerRepel);
  
  novaBtn = createButton("Nova");
  novaBtn.addClass("btnRes");
  novaBtn.parent(row2);
  novaBtn.style("margin", "5px");
  novaBtn.style("background-color", "#202325");
  novaBtn.style("color", "#00FFFF");
  novaBtn.mousePressed(() => { 
    if(novaCooldown <= 0) { 
      triggerNovaManual(); 
      novaCooldown = NOVA_COOLDOWN_TIME; 
    } 
  });
  
  // Tier 3: All Four Meters
  row3 = createDiv().addClass("row");
  row3.parent(controlPanel);
  
  novaMeter = createElement('meter');
  novaMeter.addClass("nova meterRes");
  novaMeter.parent(row3);
  novaMeter.attribute("min", "0");
  novaMeter.attribute("max", NOVA_THRESHOLD.toString());
  novaMeter.attribute("value", "0");
  
  novaCooldownMeter = createElement('meter');
  novaCooldownMeter.addClass("novacooldown meterRes");
  novaCooldownMeter.parent(row3);
  novaCooldownMeter.attribute("min", "0");
  novaCooldownMeter.attribute("max", NOVA_COOLDOWN_TIME.toString());
  novaCooldownMeter.attribute("value", "0");
  
  huntMeter = createElement('meter');
  huntMeter.addClass("hunt meterRes");
  huntMeter.parent(row3);
  huntMeter.attribute("min", "0");
  huntMeter.attribute("max", HUNT_THRESHOLD.toString());
  huntMeter.attribute("value", "0");
  
  abyssMeter = createElement('meter');
  abyssMeter.addClass("abyss meterRes");
  abyssMeter.parent(row3);
  abyssMeter.attribute("min", "0");
  abyssMeter.attribute("max", ABSYSS_THRESHOLD.toString());
  abyssMeter.attribute("value", "0");
  
  // Tier 4: Title
  row4 = createDiv().addClass("row");
  row4.parent(controlPanel);
  row4.style("margin-top", "10px");
  titleSpan = createSpan('<span style="color: rgb(255,215,0); font-size:24px;">The Ignis</span> & <span style="color: #9C89B8; font-size:24px;">The Abyss</span>');
  titleSpan.parent(row4);
  
  resetSimulation();
}

// -------------- Rest of the code (unchanged game logic) --------------
let moveSpeed = 1.95;

function resetSimulation() {
  simulationRunning = true;
  explosionTimer = 0;
  spawnTimer = 0;
  lastNovaTime = 0;
  abyssAccumulator = 0;
  novaTimer = 0;
  huntTimer = 0;
  novaCooldown = 0;
  
  tendrils = [];
  singularity = new Singularity(width / 2, height / 2);
  
  for (let i = 0; i < TENDRIL_COUNT; i++) {
    let t = new Tendril();
    t.autoHunt(singularity.pos);
    tendrils.push(t);
  }
}

function spawnTendrils(n = 1) {
  let available = 50 - tendrils.length;
  let toSpawn = min(n, available);
  for (let i = 0; i < toSpawn; i++) {
    let t = new Tendril();
    t.autoHunt(singularity.pos);
    tendrils.push(t);
  }
}

function handleKeyboard() {
  moveSpeed = parseFloat(moveSpeedInput.value());
  if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) { singularity.pos.x -= moveSpeed; }
  if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) { singularity.pos.x += moveSpeed; }
  if (keyIsDown(UP_ARROW) || keyIsDown(87)) { singularity.pos.y -= moveSpeed; }
  if (keyIsDown(DOWN_ARROW) || keyIsDown(83)) { singularity.pos.y += moveSpeed; }
  singularity.pos.x = constrain(singularity.pos.x, singularity.radius, width - singularity.radius);
  singularity.pos.y = constrain(singularity.pos.y, singularity.radius, height - singularity.radius);
}

function keyReleased() {
  if (keyCode === 32) { triggerRepel(); }
  if (keyCode === 86 && novaCooldown <= 0) { 
    triggerNovaManual(); 
    novaCooldown = NOVA_COOLDOWN_TIME; 
  }
}

function triggerHunt() {
  for (let t of tendrils) { t.hunt(singularity.pos); }
}

function triggerRepel() {
  for (let t of tendrils) {
    let d = p5.Vector.dist(t.pos, singularity.pos);
    if (d < ORBIT_DISTANCE) {
      let repulse = p5.Vector.sub(t.pos, singularity.pos);
      repulse.normalize();
      repulse.mult(12);
      t.vel = repulse.copy();
    }
  }
  explosionType = "burst";
  explosionTimer = explosionDuration;
}

function triggerNovaManual() {
  for (let t of tendrils) {
    let d = p5.Vector.dist(t.pos, singularity.pos);
    if (d < ORBIT_DISTANCE && !t.immolating) { t.startImmolation(); }
  }
  explosionType = "nova";
  explosionTimer = explosionDuration;
}

function triggerNovaBurst() {
  let count = 0;
  for (let t of tendrils) {
    let d = p5.Vector.dist(t.pos, singularity.pos);
    if (d < ORBIT_DISTANCE && !t.immolating) {
      t.startImmolation();
      count++;
      if (count >= 5) break;
    }
  }
  explosionType = "nova";
  explosionTimer = explosionDuration;
  lastNovaTime = millis();
}

if (typeof deathBurstCount === 'undefined') {
  deathBurstCount = 0;
  deathBurstInterval = 300;
  deathBurstTimer = 0;
}

function draw() {
  background(0);
  handleKeyboard();
  
  simSpeed = parseFloat(aggressionInput.value());
  gravPull = parseFloat(gravityInput.value());
  
  spawnTimer += deltaTime;
  if (spawnTimer > SPAWN_INTERVAL) {
    spawnTendrils(10);
    spawnTimer = 0;
  }
  
  huntTimer += deltaTime;
  if (huntTimer >= HUNT_THRESHOLD) {
    triggerHunt();
    huntTimer = 0;
  }
  huntMeter.attribute("value", huntTimer.toString());
  
  novaTimer += deltaTime;
  if (novaTimer >= NOVA_THRESHOLD) {
    triggerNovaBurst();
    novaTimer = 0;
  }
  novaMeter.attribute("value", novaTimer.toString());
  
  if (novaCooldown > 0) {
    novaCooldown -= deltaTime;
    if (novaCooldown < 0) { novaCooldown = 0; }
  }
  novaCooldownMeter.attribute("value", novaCooldown.toString());
  
  singularity.update();
  singularity.show();
  
  for (let t of tendrils) {
    let d = p5.Vector.dist(t.pos, singularity.pos);
    if (d < ORBIT_DISTANCE) { t.orbit(singularity.pos, gravPull); }
    t.update();
    t.show();
  }
  
  let countOrbit = 0;
  for (let t of tendrils) {
    let d = p5.Vector.dist(t.pos, singularity.pos);
    if (d < ORBIT_DISTANCE) { countOrbit++; }
  }
  
  if (countOrbit >= 3 && singularity.state === "healthy") {
    abyssAccumulator += deltaTime;
  } else {
    abyssAccumulator = 0;
  }
  
  if (abyssAccumulator >= ABSYSS_THRESHOLD && singularity.state === "healthy") {
    singularity.state = "assimilating";
    singularity.assimilationTimer = 0;
    abyssAccumulator = 0;
    explosionType = "death";
    explosionTimer = explosionDuration;
    deathBurstCount = 5;
    deathBurstTimer = 0;
  }
  
  abyssMeter.attribute("value", abyssAccumulator.toString());
  
  if ((singularity.state === "assimilating" || singularity.state === "dead") && deathBurstCount > 0) {
    deathBurstTimer += deltaTime;
    if (deathBurstTimer >= deathBurstInterval) {
      explosionType = "death";
      explosionTimer = explosionDuration;
      deathBurstTimer = 0;
      deathBurstCount--;
    }
  }
  
  tendrils = tendrils.filter(t => !t.dead);
  
  if (explosionTimer > 0) {
    drawExplosion();
    explosionTimer -= deltaTime;
  }
}

class Singularity {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.baseRadius = 15;
    this.radius = this.baseRadius;
    this.pulseSpeed = 0.05;
    this.state = "healthy";
    this.assimilationTimer = 0;
    this.respawnTimer = 0;
    this.currentColor = color(255,215,0);
  }
  update() {
    if (this.state === "healthy") {
      this.radius = this.baseRadius + sin(frameCount * this.pulseSpeed) * 5;
      let t = (sin(frameCount * this.pulseSpeed) + 1) / 2;
      let baseColor = lerpColor(color(255,215,0), color(255,140,0), t);
      let p = abyssAccumulator / ABSYSS_THRESHOLD;
      if (p < 0.5) {
        this.currentColor = baseColor;
      } else if (p < 1) {
        let u = (p - 0.5) / 0.5;
        this.currentColor = lerpColor(baseColor, color(255,0,255), u);
      } else {
        this.state = "assimilating";
        this.assimilationTimer = 0;
        this.currentColor = color(255,0,255);
      }
    } else if (this.state === "assimilating") {
      this.assimilationTimer += deltaTime;
      if (this.assimilationTimer < 2000) {
        let t = this.assimilationTimer / 2000;
        this.currentColor = lerpColor(color(255,0,255), color(0,0,0), t);
      } else {
        this.state = "dead";
        this.respawnTimer = 0;
        this.currentColor = color(0,0,0);
      }
    } else if (this.state === "dead") {
      this.respawnTimer += deltaTime;
      if (this.respawnTimer > 7000) {
        this.state = "healthy";
        this.assimilationTimer = 0;
        this.respawnTimer = 0;
        abyssAccumulator = 0;
        this.currentColor = color(255,215,0);
      }
    }
  }
  show() {
    noStroke();
    if (this.state === "dead") {
      stroke(255,0,255);
      strokeWeight(2);
    }
    fill(this.currentColor);
    ellipse(this.pos.x, this.pos.y, this.radius * 2, this.radius * 2);
    noStroke();
  }
}

class Tendril {
  constructor() {
    let edge = floor(random(4));
    if (edge === 0) { this.pos = createVector(random(width), 0); }
    else if (edge === 1) { this.pos = createVector(width, random(height)); }
    else if (edge === 2) { this.pos = createVector(random(width), height); }
    else { this.pos = createVector(0, random(height)); }
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
    force.setMag(random(1, 2));
    this.vel = force;
  }
  hunt(targetPos) { this.boostTimer = 30; }
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
    }
    this.tail.push(this.pos.copy());
    if (this.tail.length > this.tailMax) {
      this.tail.shift();
    }
  }
  show() {
    noStroke();
    let drawColor;
    if (this.immolating) {
      if (this.immolateTimer < this.immolateDuration / 2) {
        let amt = this.immolateTimer / (this.immolateDuration / 2);
        drawColor = lerpColor(purpleColor, cyanColor, amt);
      } else {
        let amt = (this.immolateTimer - this.immolateDuration / 2) / (this.immolateDuration / 2);
        drawColor = lerpColor(cyanColor, blackColor, amt);
      }
    } else {
      drawColor = color(130, 0, 130);
    }
    fill(drawColor);
    ellipse(this.pos.x, this.pos.y, 7, 7);
    strokeWeight(1);
    noFill();
    beginShape();
    for (let i = 0; i < this.tail.length; i++) {
      let pos = this.tail[i];
      let alpha = map(i, 0, this.tail.length, 0, 255);
      stroke(red(drawColor), green(drawColor), blue(drawColor), alpha);
      vertex(pos.x, pos.y);
    }
    endShape();
  }
}

function drawExplosion() {
  push();
  translate(singularity.pos.x, singularity.pos.y);
  let steps = 5;
  let alphaVal = map(explosionTimer, 0, explosionDuration, 0, 255);
  if (explosionType === "nova") {
    stroke(0,255,255, alphaVal);
  } else if (explosionType === "burst") {
    stroke(255,215,0, alphaVal);
  } else if (explosionType === "death") {
    stroke(255,0,255, alphaVal);
  } else {
    stroke(255,215,0, alphaVal);
  }
  noFill();
  for (let i = 0; i < 20; i++) {
    push();
    rotate(random(TWO_PI));
    beginShape();
    let len = random(20, 50);
    vertex(0, 0);
    for (let j = 0; j < steps; j++) {
      let angle = random(-Math.PI/4, Math.PI/4);
      let x = cos(angle) * len;
      let y = sin(angle) * len;
      vertex(x, y);
    }
    endShape();
    pop();
  }
  pop();
}

function startgame() {
  console.log("Game started!");
  resetSimulation();
}

window.onload = function() {
  setup();
};
