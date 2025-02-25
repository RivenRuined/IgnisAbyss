console.log("Ignis.js loaded and running!");
/* 
  Cosmic Hunt – Life vs. Death (Final Version with Hunt Meter, Keyboard Control, 
  Multi-Activation Death Burst, Updated Defaults, Nova Cooldown, and Pulsating Ignis)

  Tendrils spawn at the canvas edges and pursue a pulsing golden singularity.
  
  When tendrils orbit the singularity (within 50px), a global Nova meter fills over 3.5 seconds.
  When full, an automatic Nova burst is unleashed that immolates (kills) up to 5 tendrils in orbit.
  (The Nova button—and the V key when released—trigger Nova, but only if the cooldown has expired.)
  
  Meanwhile, if 3 or more tendrils remain in orbit (within 50px) of the singularity,
  an Abyss (Assimilation) meter fills over 13 seconds. If that meter fills, the singularity is assimilated:
  its health degrades from its healthy state (now pulsating between gold and sunset orange) to Magenta,
  and then it dies. When fewer than 3 tendrils remain in orbit, the Abyss meter resets immediately.
  
  The Burst button forcefully repels tendrils in orbit by immediately overriding their velocity
  with a strong outward vector (20% increased force). (Press SPACE to trigger Burst.)
  
  Additionally, a Hunt Meter (filling over 5 seconds) is added. When it fills, the Hunt action is automatically triggered,
  drawing tendrils inward.
  
  When assimilation is triggered (the Abyss meter fills), a "Death Burst" visual effect is activated.
  In this state, the singularity is drawn as a black circle with a MAGENTA outline and remains dead for 7 seconds before respawning.
  Also, upon assimilation, the Death Burst effect fires 5 times in a row (with a 300 ms interval) for a "death flare."
  
  The singularity (“The Ignis”) is user-controlled via arrow keys or WASD; its movement speed is adjustable via the "Movement" input.
  
  Additionally, because Nova is very strong, manual Nova can only be triggered once every 10 seconds.
  A Nova Cooldown Meter is displayed next to the Nova Meter.
  
  Control panel layout:
  
    Spawn | Hunt | Aggression | Gravity | Movement | Burst | Nova  
             Nova Threshold Meter  | Nova Cooldown Meter  
             [ Hunt Meter | Assimilation Meter ]  
             The Ignis & The Abyss
  
  Defaults: Aggression = 1.7, Gravity = 1.5, Movement = 1.95.
  Tendrils spawn every 5 seconds (10 at a time) up to a hard cap of 50.
  Canvas size is 1200×900.
*/

// ---------------- Global Constants and Variables ----------------

const TENDRIL_COUNT = 20;        // Initially spawned
const ORBIT_DISTANCE = 50;       // Orbit zone (px)
const NOVA_THRESHOLD = 3500;     // 3.5 seconds for Nova burst events
const ABSYSS_THRESHOLD = 13000;  // 13 seconds for assimilation
const HUNT_THRESHOLD = 5000;     // 5 seconds for Hunt boost
const NOVA_COOLDOWN_TIME = 10000; // 10 seconds cooldown for manual Nova

let novaTimer = 0;               // Global Nova timer
let huntTimer = 0;               // Global Hunt timer
let abyssAccumulator = 0;        // Abyss accumulator for assimilation
let novaCooldown = 0;            // Cooldown timer for manual Nova

let spawnTimer = 0;              // Timer for periodic spawning
const SPAWN_INTERVAL = 5000;     // Every 5 seconds, spawn 10 tendrils

let lastNovaTime = 0;            // For throttling Nova bursts

let explosionTimer = 0;          // Timer for explosion visuals
const explosionDuration = 500;   // in ms

// Explosion type: "nova", "burst", or "death"
let explosionType = "none";

// Death Burst variables (for multi-activation)
let deathBurstCount = 0;
let deathBurstInterval = 300;    // ms between death bursts
let deathBurstTimer = 0;

// Colors
let purpleColor, cyanColor, blackColor;

// Arrays and simulation flag
let tendrils = [];
let singularity;
let simulationRunning = true;

// ---------------- Control Panel Elements ----------------
let controlPanel, row1, row2, row3, row4;
let spawnBtn, huntBtn, burstBtn, novaBtn;
let aggressionInput, gravityInput, moveSpeedInput;
let novaMeter, novaCooldownMeter, abyssMeter, huntMeter;
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
  
  // --- Add custom CSS for meter styling ---
  let novaMeterCSS = createElement('style', `
    meter.nova::-webkit-meter-optimum-value { background: #008B8B; }
    meter.nova::-webkit-meter-suboptimum-value { background: #008B8B; }
    meter.nova::-moz-meter-bar { background: #008B8B; }
  `);
  novaMeterCSS.parent(document.head);
  
  let abyssMeterCSS = createElement('style', `
    meter.abyss::-webkit-meter-optimum-value { background: #9C89B8; }
    meter.abyss::-webkit-meter-suboptimum-value { background: #9C89B8; }
    meter.abyss::-moz-meter-bar { background: #9C89B8; }
  `);
  abyssMeterCSS.parent(document.head);
  
  let huntMeterCSS = createElement('style', `
    meter.hunt::-webkit-meter-optimum-value { background: #7D6E93; }
    meter.hunt::-webkit-meter-suboptimum-value { background: #7D6E93; }
    meter.hunt::-moz-meter-bar { background: #7D6E93; }
  `);
  huntMeterCSS.parent(document.head);
  
  let novaCooldownCSS = createElement('style', `
    meter.novacooldown::-webkit-meter-optimum-value { background: #555555; }
    meter.novacooldown::-webkit-meter-suboptimum-value { background: #555555; }
    meter.novacooldown::-moz-meter-bar { background: #555555; }
  `);
  novaCooldownCSS.parent(document.head);
  
  // --- Create the Control Panel ---
  controlPanel = createDiv();
  controlPanel.position(0, height);
  controlPanel.style("width", "1200px");
  controlPanel.style("background", "black");
  controlPanel.style("color", "grey");
  controlPanel.style("text-align", "center");
  controlPanel.style("padding", "10px 0");
  
  // Row 1: Buttons and Numeric Inputs
  row1 = createDiv();
  row1.parent(controlPanel);
  row1.style("display", "block");
  row1.style("text-align", "center");
  row1.style("margin-bottom", "10px");
  
  spawnBtn = createButton("Spawn");
  spawnBtn.parent(row1);
  spawnBtn.style("font-size", "24px");
  spawnBtn.style("margin", "0 10px");
  spawnBtn.style("background-color", "#202325");
  spawnBtn.style("color", "#9C89B8");
  spawnBtn.mousePressed(() => spawnTendrils(5));
  
  huntBtn = createButton("Hunt");
  huntBtn.parent(row1);
  huntBtn.style("font-size", "24px");
  huntBtn.style("margin", "0 10px");
  huntBtn.style("background-color", "#202325");
  huntBtn.style("color", "#9C89B8");
  huntBtn.mousePressed(triggerHunt);
  
  let aggressionLabel = createDiv("Aggression");
  aggressionLabel.parent(row1);
  aggressionLabel.style("display", "inline-block");
  aggressionLabel.style("font-size", "24px");
  aggressionLabel.style("margin", "0 10px");
  
  aggressionInput = createInput('1.7', 'number');
  aggressionInput.parent(row1);
  aggressionInput.style("font-size", "24px");
  aggressionInput.style("width", "80px");
  aggressionInput.style("margin", "0 10px");
  aggressionInput.attribute("step", "0.1");
  
  let gravityLabel = createDiv("Gravity");
  gravityLabel.parent(row1);
  gravityLabel.style("display", "inline-block");
  gravityLabel.style("font-size", "24px");
  gravityLabel.style("margin", "0 10px");
  
  gravityInput = createInput('1.5', 'number');
  gravityInput.parent(row1);
  gravityInput.style("font-size", "24px");
  gravityInput.style("width", "80px");
  gravityInput.style("margin", "0 10px");
  gravityInput.attribute("step", "0.1");
  
  let moveLabel = createDiv("Movement");
  moveLabel.parent(row1);
  moveLabel.style("display", "inline-block");
  moveLabel.style("font-size", "24px");
  moveLabel.style("margin", "0 10px");
  
  moveSpeedInput = createInput('1.95', 'number');
  moveSpeedInput.parent(row1);
  moveSpeedInput.style("font-size", "24px");
  moveSpeedInput.style("width", "80px");
  moveSpeedInput.style("margin", "0 10px");
  moveSpeedInput.attribute("step", "0.1");
  
  burstBtn = createButton("Burst");
  burstBtn.parent(row1);
  burstBtn.style("font-size", "24px");
  burstBtn.style("margin", "0 10px");
  burstBtn.style("background-color", "#202325");
  burstBtn.style("color", "#00FFFF");
  burstBtn.mousePressed(triggerRepel);
  
  novaBtn = createButton("Nova");
  novaBtn.parent(row1);
  novaBtn.style("font-size", "24px");
  novaBtn.style("margin", "0 10px");
  novaBtn.style("background-color", "#202325");
  novaBtn.style("color", "#00FFFF");
  novaBtn.mousePressed(() => { if(novaCooldown <= 0) { triggerNovaManual(); novaCooldown = NOVA_COOLDOWN_TIME; } });
  
  // Row 2: Nova Meter and Nova Cooldown Meter side-by-side
  row2 = createDiv();
  row2.parent(controlPanel);
  row2.style("display", "flex");
  row2.style("justify-content", "center");
  row2.style("align-items", "center");
  row2.style("gap", "20px");
  
  novaMeter = createElement('meter');
  novaMeter.parent(row2);
  novaMeter.attribute("min", "0");
  novaMeter.attribute("max", NOVA_THRESHOLD.toString());
  novaMeter.attribute("value", "0");
  novaMeter.addClass("nova");
  novaMeter.style("width", "300px");
  novaMeter.style("height", "30px");
  
  novaCooldownMeter = createElement('meter');
  novaCooldownMeter.parent(row2);
  novaCooldownMeter.attribute("min", "0");
  novaCooldownMeter.attribute("max", NOVA_COOLDOWN_TIME.toString());
  novaCooldownMeter.attribute("value", "0");
  novaCooldownMeter.addClass("novacooldown");
  novaCooldownMeter.style("width", "300px");
  novaCooldownMeter.style("height", "30px");
  
  // Row 3: Hunt Meter and Assimilation (Abyss) Meter side-by-side
  row3 = createDiv();
  row3.parent(controlPanel);
  row3.style("display", "flex");
  row3.style("justify-content", "center");
  row3.style("align-items", "center");
  row3.style("gap", "20px");
  
  huntMeter = createElement('meter');
  huntMeter.parent(row3);
  huntMeter.attribute("min", "0");
  huntMeter.attribute("max", HUNT_THRESHOLD.toString());
  huntMeter.attribute("value", "0");
  huntMeter.addClass("hunt");
  huntMeter.style("width", "300px");
  huntMeter.style("height", "30px");
  
  abyssMeter = createElement('meter');
  abyssMeter.parent(row3);
  abyssMeter.attribute("min", "0");
  abyssMeter.attribute("max", ABSYSS_THRESHOLD.toString());
  abyssMeter.attribute("value", "0");
  abyssMeter.addClass("abyss");
  abyssMeter.style("width", "300px");
  abyssMeter.style("height", "30px");
  
  // Row 4: Title
  row4 = createDiv();
  row4.parent(controlPanel);
  row4.style("display", "block");
  row4.style("text-align", "center");
  row4.style("margin-top", "10px");
  titleSpan = createSpan('<span style="color: rgb(255,215,0); font-size:24px;">The Ignis</span> & <span style="color: #9C89B8; font-size:24px;">The Abyss</span>');
  titleSpan.parent(row4);
  
  // Reset simulation.
  resetSimulation();
}

// ---------------- Global Movement Speed Variable ----------------
let moveSpeed = 1.95;

// ---------------- Simulation Reset and Spawning ----------------

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

// ---------------- Keyboard Control for the Singularity ----------------

function handleKeyboard() {
  moveSpeed = parseFloat(moveSpeedInput.value());
  if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) { singularity.pos.x -= moveSpeed; }
  if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) { singularity.pos.x += moveSpeed; }
  if (keyIsDown(UP_ARROW) || keyIsDown(87)) { singularity.pos.y -= moveSpeed; }
  if (keyIsDown(DOWN_ARROW) || keyIsDown(83)) { singularity.pos.y += moveSpeed; }
  singularity.pos.x = constrain(singularity.pos.x, singularity.radius, width - singularity.radius);
  singularity.pos.y = constrain(singularity.pos.y, singularity.radius, height - singularity.radius);
}

// Allow SPACE to trigger Burst and V to trigger Nova manually.
function keyReleased() {
  if (keyCode === 32) { triggerRepel(); }
  if (keyCode === 86 && novaCooldown <= 0) { triggerNovaManual(); novaCooldown = NOVA_COOLDOWN_TIME; }
}

// ---------------- Control Functions ----------------

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

// ---------------- Death Burst Multi-Activation ----------------

if (typeof deathBurstCount === 'undefined') {
  deathBurstCount = 0;
  deathBurstInterval = 300;
  deathBurstTimer = 0;
}

// ---------------- Draw Loop ----------------

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
    // Use a pulsating gradient from gold to sunset orange for the healthy state.
    this.currentColor = color(255,215,0);
  }
  update() {
    if (this.state === "healthy") {
      this.radius = this.baseRadius + sin(frameCount * this.pulseSpeed) * 5;
      // Create a pulsating base color between Gold and Sunset Orange.
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
      if (this.immolateTimer > this.immolateDuration) { this.dead = true; }
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
    if (this.tail.length > this.tailMax) { this.tail.shift(); }
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
    } else { drawColor = color(130, 0, 130); }
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
  if (explosionType === "nova") { stroke(0,255,255, alphaVal); }
  else if (explosionType === "burst") { stroke(255,215,0, alphaVal); }
  else if (explosionType === "death") { stroke(255,0,255, alphaVal); }
  else { stroke(255,215,0, alphaVal); }
  noFill();
  for (let i = 0; i < 20; i++) {
    push();
    rotate(random(TWO_PI));
    beginShape();
    let len = random(20, 50);
    vertex(0, 0);
    for (let j = 0; j < steps; j++) {
      let angle = random(-PI/4, PI/4);
      let x = cos(angle) * len;
      let y = sin(angle) * len;
      vertex(x, y);
    }
    endShape();
    pop();
  }
  pop();
}
