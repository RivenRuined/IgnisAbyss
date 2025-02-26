console.log("Ignis.js loaded and running!!!");

/*
  Ignis x Abyss – Life x Death
  Final version with:
    - Sliders for Agro, Gravity, Speed, Movement
    - No bounding checks or "return false" in touch events
    - Control panel has higher z-index so sliders are clickable

  This should fix "frames" error & freezing, letting the user drag sliders freely.
*/

// -------------------------------------------------------------------
// 1) Classes FIRST
// -------------------------------------------------------------------

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
      // Pulsate from gold to orange
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
      let simSpeed = agroSlider.value(); // "Agro" slider
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

// -------------------------------------------------------------------
// 2) Global Variables
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

// p5 DOM references for Sliders
let agroSlider, gravitySlider, speedSlider, movementSlider;

// D-Pad
let dPadUp, dPadDown, dPadLeft, dPadRight;
let dPadDirection;
let dPadActive = false;
let touchStartX = 0;
let touchStartY = 0;

// -------------------------------------------------------------------
// 3) Setup & Draw
// -------------------------------------------------------------------
function setup() {
  createContainerAndCanvas();
  createHUD();
  resetSimulation();
}

function draw() {
  background(0);
  handleKeyboard();

  // D-Pad movement
  if (dPadDirection.x !== 0 || dPadDirection.y !== 0) {
    let touchSpeed = movementSlider.value();
    singularity.pos.x += dPadDirection.x * touchSpeed;
    singularity.pos.y += dPadDirection.y * touchSpeed;
  }

  let simSpeed = agroSlider.value();       // for Tendrils
  let gravPull = gravitySlider.value();    // orbit pull
  let kbSpeed = speedSlider.value();       // keyboard speed (we store in a local var if needed)

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
    if (novaCooldown < 0) novaCooldown = 0;
  }
  novaCooldownMeter.attribute("value", novaCooldown.toString());

  singularity.update();
  singularity.show();

  // Tendrils
  for (let t of tendrils) {
    let d = p5.Vector.dist(t.pos, singularity.pos);
    if (d < ORBIT_DISTANCE) {
      t.orbit(singularity.pos, gravPull);
    }
    t.update();
    t.show();
  }

  let countOrbit = 0;
  for (let t of tendrils) {
    let d = p5.Vector.dist(t.pos, singularity.pos);
    if (d < ORBIT_DISTANCE) countOrbit++;
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

// -------------------------------------------------------------------
// 4) Setup Helpers
// -------------------------------------------------------------------
let container, cnv, controlPanel;

function createContainerAndCanvas() {
  container = createDiv();
  container.style("display", "flex");
  container.style("flex-direction", "column");
  container.style("align-items", "center");
  container.style("margin", "0 auto");
  container.style("padding", "0");
  container.style("background-color", "#000");
  container.style("width", "100%");
  container.style("max-width", "100%");

  cnv = createCanvas(1200, 900);
  cnv.parent(container);

  // Ensure canvas is behind the HUD, so sliders can be clicked
  cnv.style("position", "relative");
  cnv.style("z-index", "0");
}

function createHUD() {
  controlPanel = createDiv();
  controlPanel.parent(container);
  controlPanel.style("background", "black");
  controlPanel.style("color", "grey");
  controlPanel.style("text-align", "center");
  controlPanel.style("padding", "10px 0");
  controlPanel.style("width", "100%");
  controlPanel.style("max-width", "1200px");
  controlPanel.style("font-family", "sans-serif");
  // Put HUD above canvas
  controlPanel.style("position", "relative");
  controlPanel.style("z-index", "9999");
  controlPanel.style("pointer-events", "auto");

  createRow1_Buttons();
  createRow2_Sliders();
  createRow3_Labels();
  createRow4_NovaMeters();
  createRow5_HuntAbyss();
  createRow6_DPad();
}

function createRow1_Buttons() {
  let row = createDiv();
  row.parent(controlPanel);
  row.style("display", "flex");
  row.style("justify-content", "center");
  row.style("align-items", "center");
  row.style("gap", "10px");
  row.style("margin-bottom", "10px");

  spawnBtn = createButton("Spawn");
  spawnBtn.parent(row);
  spawnBtn.mousePressed(() => spawnTendrils(5));

  huntBtn = createButton("Hunt");
  huntBtn.parent(row);
  huntBtn.mousePressed(triggerHunt);

  burstBtn = createButton("Burst");
  burstBtn.parent(row);
  burstBtn.mousePressed(triggerRepel);

  novaBtn = createButton("Nova");
  novaBtn.parent(row);
  novaBtn.mousePressed(() => {
    if (novaCooldown <= 0) {
      triggerNovaManual();
      novaCooldown = NOVA_COOLDOWN_TIME;
    }
  });

  [spawnBtn, huntBtn, burstBtn, novaBtn].forEach(btn => {
    btn.style("font-size", "18px");
    btn.style("background-color", "#202325");
    btn.style("color", "#9C89B8");
    btn.style("padding", "5px 10px");
    btn.style("pointer-events", "auto");
    btn.style("z-index", "9999");
  });
  burstBtn.style("color", "#00FFFF");
  novaBtn.style("color", "#00FFFF");
}

function createRow2_Sliders() {
  let row = createDiv();
  row.parent(controlPanel);
  row.style("display", "flex");
  row.style("justify-content", "center");
  row.style("align-items", "center");
  row.style("gap", "20px");
  row.style("margin-bottom", "5px");

  agroSlider = createSlider(0, 5, 1.7, 0.1);
  agroSlider.parent(row);
  agroSlider.style("width", "120px");
  agroSlider.style("z-index", "9999");

  gravitySlider = createSlider(0, 5, 1.5, 0.1);
  gravitySlider.parent(row);
  gravitySlider.style("width", "120px");
  gravitySlider.style("z-index", "9999");

  speedSlider = createSlider(0, 5, 1.95, 0.1);
  speedSlider.parent(row);
  speedSlider.style("width", "120px");
  speedSlider.style("z-index", "9999");

  movementSlider = createSlider(0, 5, 1.0, 0.1);
  movementSlider.parent(row);
  movementSlider.style("width", "120px");
  movementSlider.style("z-index", "9999");
}

function createRow3_Labels() {
  let row = createDiv();
  row.parent(controlPanel);
  row.style("display", "flex");
  row.style("justify-content", "center");
  row.style("align-items", "center");
  row.style("gap", "60px");
  row.style("margin-bottom", "10px");

  let agroLabel = createSpan("Agro");
  agroLabel.parent(row);
  agroLabel.style("font-size", "14px");
  agroLabel.style("color", "#CCCCCC");

  let gravLabel = createSpan("Gravity");
  gravLabel.parent(row);
  gravLabel.style("font-size", "14px");
  gravLabel.style("color", "#CCCCCC");

  let spdLabel = createSpan("Speed");
  spdLabel.parent(row);
  spdLabel.style("font-size", "14px");
  spdLabel.style("color", "#CCCCCC");

  let moveLabel = createSpan("Movement");
  moveLabel.parent(row);
  moveLabel.style("font-size", "14px");
  moveLabel.style("color", "#CCCCCC");
}

function createRow4_NovaMeters() {
  let row = createDiv();
  row.parent(controlPanel);
  row.style("display", "flex");
  row.style("justify-content", "center");
  row.style("align-items", "center");
  row.style("gap", "20px");
  row.style("margin-bottom", "5px");

  novaMeter = createElement('meter');
  novaMeter.parent(row);
  novaMeter.attribute("min", "0");
  novaMeter.attribute("max", NOVA_THRESHOLD.toString());
  novaMeter.attribute("value", "0");
  novaMeter.addClass("nova");
  novaMeter.style("width", "200px");
  novaMeter.style("height", "20px");
  novaMeter.style("z-index", "9999");

  novaCooldownMeter = createElement('meter');
  novaCooldownMeter.parent(row);
  novaCooldownMeter.attribute("min", "0");
  novaCooldownMeter.attribute("max", NOVA_COOLDOWN_TIME.toString());
  novaCooldownMeter.attribute("value", "0");
  novaCooldownMeter.addClass("novacooldown");
  novaCooldownMeter.style("width", "200px");
  novaCooldownMeter.style("height", "20px");
  novaCooldownMeter.style("z-index", "9999");
}

function createRow5_HuntAbyss() {
  let row = createDiv();
  row.parent(controlPanel);
  row.style("display", "flex");
  row.style("justify-content", "center");
  row.style("align-items", "center");
  row.style("gap", "20px");
  row.style("margin-bottom", "10px");

  huntMeter = createElement('meter');
  huntMeter.parent(row);
  huntMeter.attribute("min", "0");
  huntMeter.attribute("max", HUNT_THRESHOLD.toString());
  huntMeter.attribute("value", "0");
  huntMeter.addClass("hunt");
  huntMeter.style("width", "200px");
  huntMeter.style("height", "20px");
  huntMeter.style("z-index", "9999");

  abyssMeter = createElement('meter');
  abyssMeter.parent(row);
  abyssMeter.attribute("min", "0");
  abyssMeter.attribute("max", ABSYSS_THRESHOLD.toString());
  abyssMeter.attribute("value", "0");
  abyssMeter.addClass("abyss");
  abyssMeter.style("width", "200px");
  abyssMeter.style("height", "20px");
  abyssMeter.style("z-index", "9999");
}

function createRow6_DPad() {
  let row = createDiv();
  row.parent(controlPanel);
  row.style("display", "flex");
  row.style("flex-direction", "column");
  row.style("align-items", "center");
  row.style("gap", "5px");
  row.style("margin-bottom", "10px");
  row.style("z-index", "9999");

  // Up
  let dPadRow1 = createDiv();
  dPadRow1.parent(row);
  dPadRow1.style("display", "flex");
  dPadRow1.style("justify-content", "center");
  dPadUp = createButton("↑");
  dPadUp.parent(dPadRow1);
  dPadUp.style("font-size", "18px");
  dPadUp.style("padding", "5px 10px");
  dPadUp.mousePressed(() => { dPadDirection.set(0, -1); });
  dPadUp.mouseReleased(() => { dPadDirection.y = 0; });

  // Left & Right
  let dPadRow2 = createDiv();
  dPadRow2.parent(row);
  dPadRow2.style("display", "flex");
  dPadRow2.style("justify-content", "space-between");
  dPadRow2.style("width", "100px");

  dPadLeft = createButton("←");
  dPadLeft.parent(dPadRow2);
  dPadLeft.style("font-size", "18px");
  dPadLeft.style("padding", "5px 10px");
  dPadLeft.mousePressed(() => { dPadDirection.set(-1, dPadDirection.y); });
  dPadLeft.mouseReleased(() => { dPadDirection.x = 0; });

  dPadRight = createButton("→");
  dPadRight.parent(dPadRow2);
  dPadRight.style("font-size", "18px");
  dPadRight.style("padding", "5px 10px");
  dPadRight.mousePressed(() => { dPadDirection.set(1, dPadDirection.y); });
  dPadRight.mouseReleased(() => { dPadDirection.x = 0; });

  // Down
  let dPadRow3 = createDiv();
  dPadRow3.parent(row);
  dPadRow3.style("display", "flex");
  dPadRow3.style("justify-content", "center");
  dPadDown = createButton("↓");
  dPadDown.parent(dPadRow3);
  dPadDown.style("font-size", "18px");
  dPadDown.style("padding", "5px 10px");
  dPadDown.mousePressed(() => { dPadDirection.set(dPadDirection.x, 1); });
  dPadDown.mouseReleased(() => { dPadDirection.y = 0; });

  dPadDirection = createVector(0, 0);
}

// -------------------------------------------------------------------
// 5) The rest of the game logic
// -------------------------------------------------------------------
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
  // "Speed" slider for keyboard movement
  let kbSpeed = speedSlider.value();
  if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) singularity.pos.x -= kbSpeed;
  if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) singularity.pos.x += kbSpeed;
  if (keyIsDown(UP_ARROW) || keyIsDown(87)) singularity.pos.y -= kbSpeed;
  if (keyIsDown(DOWN_ARROW) || keyIsDown(83)) singularity.pos.y += kbSpeed;

  singularity.pos.x = constrain(singularity.pos.x, singularity.radius, width - singularity.radius);
  singularity.pos.y = constrain(singularity.pos.y, singularity.radius, height - singularity.radius);
}

function keyReleased() {
  if (keyCode === 32) triggerRepel();       // SPACE
  if (keyCode === 86 && novaCooldown <= 0) { // V
    triggerNovaManual();
    novaCooldown = NOVA_COOLDOWN_TIME;
  }
}

// Buttons
function triggerHunt() {
  for (let t of tendrils) t.hunt(singularity.pos);
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
  explosionTimer = 500;
}

function triggerNovaManual() {
  for (let t of tendrils) {
    let d = p5.Vector.dist(t.pos, singularity.pos);
    if (d < ORBIT_DISTANCE && !t.immolating) t.startImmolation();
  }
  explosionType = "nova";
  explosionTimer = 500;
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
  explosionTimer = 500;
  lastNovaTime = millis();
}

// Touch
function touchStarted() {
  if (touches.length > 0) {
    let t = touches[0];
    // No bounding checks or "return false"—so no p5 "frames" error
    // If x < 30% => D-Pad
    if (t.x < width * 0.3) {
      dPadActive = true;
    } else {
      touchStartX = t.x;
      touchStartY = t.y;
    }
  }
}

function touchMoved() {
  if (touches.length > 0) {
    let t = touches[0];
    if (dPadActive) {
      let dx = t.x - 80;
      let dy = t.y - 820;
      let factor = movementSlider.value();
      singularity.pos.x += dx * factor;
      singularity.pos.y += dy * factor;
    } else {
      let dx = t.x - touchStartX;
      let dy = t.y - touchStartY;
      let factor = movementSlider.value();
      singularity.pos.x += dx * factor;
      singularity.pos.y += dy * factor;
      touchStartX = t.x;
      touchStartY = t.y;
    }
  }
}

function touchEnded() {
  dPadActive = false;
}

// Explosion
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
