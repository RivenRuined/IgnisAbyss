console.log("Ignis.js loaded and running!");

/* 
  Ignis x Abyss – Life x Death
  (Layout adjusted to match the provided screenshot.)
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

// UI elements
let topDiv, instructionsDiv;
let controlPanel, rowButtons, rowInputs, rowMeters, rowFooter;
let spawnBtn, huntBtn, burstBtn, novaBtn;
let aggressionInput, gravityInput, moveSpeedInput;
let aggressionLabel, gravityLabel, speedLabel;
let novaMeter, novaCooldownMeter, huntMeter, abyssMeter;
let footerSpan;

// For movement speed
let moveSpeed = 1.95;

// ---------------- Setup ----------------
function setup() {
  // Create top text (title & instructions) before the canvas
  topDiv = createDiv();
  topDiv.style("text-align", "center");
  topDiv.style("color", "#FFFFFF");
  topDiv.style("font-family", "sans-serif");
  topDiv.style("margin-top", "10px");
  
  // Title
  let titleH1 = createElement("h1", "Ignis x Abyss – Life x Death");
  titleH1.parent(topDiv);
  titleH1.style("margin-bottom", "0");
  
  // Instructions
  instructionsDiv = createP("Use arrow keys or WASD to move. Space=Burst | V=Nova (survive as long as you can)");
  instructionsDiv.parent(topDiv);
  instructionsDiv.style("margin-top", "0");
  instructionsDiv.style("color", "#CCCCCC");

  // Create the canvas for the game
  createCanvas(1200, 900);
  angleMode(RADIANS);
  document.body.style.backgroundColor = "#000000";
  
  // Define colors
  purpleColor = color(130, 0, 130);
  cyanColor = color(0, 255, 255);
  blackColor = color(0, 0, 0);
  
  // Meter styling
  let styleEl = createElement('style', `
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
  `);
  styleEl.parent(document.head);

  // Control panel container at the bottom
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
  controlPanel.style("font-family", "sans-serif");

  // Row 1: Buttons
  rowButtons = createDiv();
  rowButtons.parent(controlPanel);
  rowButtons.style("display", "flex");
  rowButtons.style("justify-content", "center");
  rowButtons.style("align-items", "center");
  rowButtons.style("margin-bottom", "10px");
  rowButtons.style("gap", "10px");

  spawnBtn = createButton("Spawn");
  spawnBtn.parent(rowButtons);
  spawnBtn.style("font-size", "20px");
  spawnBtn.style("background-color", "#202325");
  spawnBtn.style("color", "#9C89B8");
  spawnBtn.mousePressed(() => spawnTendrils(5));
  
  huntBtn = createButton("Hunt");
  huntBtn.parent(rowButtons);
  huntBtn.style("font-size", "20px");
  huntBtn.style("background-color", "#202325");
  huntBtn.style("color", "#9C89B8");
  huntBtn.mousePressed(triggerHunt);
  
  burstBtn = createButton("Burst");
  burstBtn.parent(rowButtons);
  burstBtn.style("font-size", "20px");
  burstBtn.style("background-color", "#202325");
  burstBtn.style("color", "#00FFFF");
  burstBtn.mousePressed(triggerRepel);
  
  novaBtn = createButton("Nova");
  novaBtn.parent(rowButtons);
  novaBtn.style("font-size", "20px");
  novaBtn.style("background-color", "#202325");
  novaBtn.style("color", "#00FFFF");
  novaBtn.mousePressed(() => { 
    if(novaCooldown <= 0) { 
      triggerNovaManual(); 
      novaCooldown = NOVA_COOLDOWN_TIME; 
    } 
  });

  // Row 2: Inputs + Labels
  rowInputs = createDiv();
  rowInputs.parent(controlPanel);
  rowInputs.style("display", "flex");
  rowInputs.style("justify-content", "center");
  rowInputs.style("align-items", "flex-end"); // so labels can appear below inputs
  rowInputs.style("margin-bottom", "10px");
  rowInputs.style("gap", "20px");

  // Container for Aggression input + label
  let aggressionContainer = createDiv();
  aggressionContainer.parent(rowInputs);
  aggressionContainer.style("display", "flex");
  aggressionContainer.style("flex-direction", "column");
  aggressionContainer.style("align-items", "center");

  aggressionInput = createInput('1.7', 'number');
  aggressionInput.parent(aggressionContainer);
  aggressionInput.style("font-size", "20px");
  aggressionInput.style("width", "60px");
  aggressionInput.style("text-align", "center");

  aggressionLabel = createSpan("Aggression");
  aggressionLabel.parent(aggressionContainer);
  aggressionLabel.style("font-size", "16px");
  aggressionLabel.style("margin-top", "3px");
  aggressionLabel.style("color", "#CCCCCC");

  // Container for Gravity input + label
  let gravityContainer = createDiv();
  gravityContainer.parent(rowInputs);
  gravityContainer.style("display", "flex");
  gravityContainer.style("flex-direction", "column");
  gravityContainer.style("align-items", "center");

  gravityInput = createInput('1.5', 'number');
  gravityInput.parent(gravityContainer);
  gravityInput.style("font-size", "20px");
  gravityInput.style("width", "60px");
  gravityInput.style("text-align", "center");

  gravityLabel = createSpan("Gravity");
  gravityLabel.parent(gravityContainer);
  gravityLabel.style("font-size", "16px");
  gravityLabel.style("margin-top", "3px");
  gravityLabel.style("color", "#CCCCCC");

  // Container for Speed input + label
  let speedContainer = createDiv();
  speedContainer.parent(rowInputs);
  speedContainer.style("display", "flex");
  speedContainer.style("flex-direction", "column");
  speedContainer.style("align-items", "center");

  moveSpeedInput = createInput('1.95', 'number');
  moveSpeedInput.parent(speedContainer);
  moveSpeedInput.style("font-size", "20px");
  moveSpeedInput.style("width", "60px");
  moveSpeedInput.style("text-align", "center");

  speedLabel = createSpan("Speed");
  speedLabel.parent(speedContainer);
  speedLabel.style("font-size", "16px");
  speedLabel.style("margin-top", "3px");
  speedLabel.style("color", "#CCCCCC");

  // Row 3: Meters
  rowMeters = createDiv();
  rowMeters.parent(controlPanel);
  rowMeters.style("display", "flex");
  rowMeters.style("justify-content", "center");
  rowMeters.style("align-items", "center");
  rowMeters.style("gap", "20px");
  rowMeters.style("margin-bottom", "10px");

  novaMeter = createElement('meter');
  novaMeter.parent(rowMeters);
  novaMeter.attribute("min", "0");
  novaMeter.attribute("max", NOVA_THRESHOLD.toString());
  novaMeter.attribute("value", "0");
  novaMeter.addClass("nova");
  novaMeter.style("width", "200px");
  novaMeter.style("height", "20px");

  novaCooldownMeter = createElement('meter');
  novaCooldownMeter.parent(rowMeters);
  novaCooldownMeter.attribute("min", "0");
  novaCooldownMeter.attribute("max", NOVA_COOLDOWN_TIME.toString());
  novaCooldownMeter.attribute("value", "0");
  novaCooldownMeter.addClass("novacooldown");
  novaCooldownMeter.style("width", "200px");
  novaCooldownMeter.style("height", "20px");

  huntMeter = createElement('meter');
  huntMeter.parent(rowMeters);
  huntMeter.attribute("min", "0");
  huntMeter.attribute("max", HUNT_THRESHOLD.toString());
  huntMeter.attribute("value", "0");
  huntMeter.addClass("hunt");
  huntMeter.style("width", "200px");
  huntMeter.style("height", "20px");

  abyssMeter = createElement('meter');
  abyssMeter.parent(rowMeters);
  abyssMeter.attribute("min", "0");
  abyssMeter.attribute("max", ABSYSS_THRESHOLD.toString());
  abyssMeter.attribute("value", "0");
  abyssMeter.addClass("abyss");
  abyssMeter.style("width", "200px");
  abyssMeter.style("height", "20px");

  // Row 4: Footer
  rowFooter = createDiv();
  rowFooter.parent(controlPanel);
  rowFooter.style("text-align", "center");
  rowFooter.style("margin-top", "5px");

  footerSpan = createSpan("The Ignis x The Abyss");
  footerSpan.parent(rowFooter);
  footerSpan.style("color", "#CCCCCC");
  footerSpan.style("font-size", "18px");

  resetSimulation();
}

// ---------------- Simulation Setup ----------------
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

// ---------------- Spawning ----------------
function spawnTendrils(n = 1) {
  let available = 50 - tendrils.length;
  let toSpawn = min(n, available);
  for (let i = 0; i < toSpawn; i++) {
    let t = new Tendril();
    t.autoHunt(singularity.pos);
    tendrils.push(t);
  }
}

// ---------------- Keyboard ----------------
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

// ---------------- Button Triggers ----------------
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

// ---------------- Draw ----------------
function draw() {
  background(0);
  handleKeyboard();
  
  let simSpeed = parseFloat(aggressionInput.value());
  let gravPull = parseFloat(gravityInput.value());
  
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
  
  // Update and show all tendrils
  for (let t of tendrils) {
    let d = p5.Vector.dist(t.pos, singularity.pos);
    if (d < ORBIT_DISTANCE) { t.orbit(singularity.pos, gravPull); }
    t.update();
    t.show();
  }
  
  // Count how many are in orbit
  let countOrbit = 0;
  for (let t of tendrils) {
    let d = p5.Vector.dist(t.pos, singularity.pos);
    if (d < ORBIT_DISTANCE) { countOrbit++; }
  }
  
  // Abyss assimilation
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
  
  // Death burst chain
  if ((singularity.state === "assimilating" || singularity.state === "dead") && deathBurstCount > 0) {
    deathBurstTimer += deltaTime;
    if (deathBurstTimer >= deathBurstInterval) {
      explosionType = "death";
      explosionTimer = explosionDuration;
      deathBurstTimer = 0;
      deathBurstCount--;
    }
  }
  
  // Filter out dead tendrils
  tendrils = tendrils.filter(t => !t.dead);
  
  // Show explosions
  if (explosionTimer > 0) {
    drawExplosion();
    explosionTimer -= deltaTime;
  }
}

// ---------------- Classes ----------------
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
      // Pulsate between gold and orange
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
    } 
    else if (this.state === "assimilating") {
      this.assimilationTimer += deltaTime;
      if (this.assimilationTimer < 2000) {
        let t = this.assimilationTimer / 2000;
        this.currentColor = lerpColor(color(255,0,255), color(0,0,0), t);
      } else {
        this.state = "dead";
        this.respawnTimer = 0;
        this.currentColor = color(0,0,0);
      }
    } 
    else if (this.state === "dead") {
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
    // spawn along an edge
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
  
  hunt(targetPos) {
    this.boostTimer = 30; // short hunt boost
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
      let d = p5.Vector.dist(this.pos, singularity.pos);
      // Move in if outside orbit
      if (d > ORBIT_DISTANCE) {
        let baseForce = p5.Vector.sub(singularity.pos, this.pos);
        baseForce.setMag(0.05);
        this.acc.add(baseForce);
      }
      // Hunt boost
      if (this.boostTimer > 0) {
        let boostForce = p5.Vector.sub(singularity.pos, this.pos);
        boostForce.setMag(0.2);
        this.acc.add(boostForce);
        this.boostTimer--;
      }
      
      // Standard update
      this.vel.add(this.acc);
      this.vel.limit(this.maxSpeed * parseFloat(aggressionInput.value()));
      this.pos.add(this.vel);
      this.acc.mult(0);
    }
    
    // Tail
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

// ---------------- Explosion Effects ----------------
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

// Start on load
window.onload = function() {
  setup();
};
