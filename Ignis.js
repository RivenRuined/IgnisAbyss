console.log("Ignis.js loaded and running!!!");

/*
  Ignis x Abyss – Life x Death
  Final version:

  1) Auto-screens on load (createCanvas(windowWidth, windowHeight)).
  2) Resizes on windowResized() → matches the new window size.
  3) "PC" (1200×900), "Mobile" (360×640), "Tablet" (768×1024), and "Auto" buttons near D-Pad.
  4) Walls: tendrils bounce off screen edges (brick-breaker style).
  5) One slider: "Speed."
  6) Orbit Slowing: each tendril in orbit reduces final speed. If speed ≤ 0, the singularity is stuck 
     until the user kills/repels some tendrils with Nova/Burst.
*/

// -------------------------------------------------------------------
// 1) Classes
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
      // Pulsate color from gold to orange
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
      this.immolateTimer += deltaTime;
      if (this.immolateTimer > this.immolateDuration) {
        this.dead = true;
      }
    } else {
      // Movement speed depends on the "Agro" slider
      let simSpeed = speedSlider.value(); 
      // But note we'll do orbit slowdown on the singularity side, not here.
      // We'll do bounce off walls:
      if (this.pos.x < 0) {
        this.pos.x = 0; 
        this.vel.x *= -1;
      } else if (this.pos.x > width) {
        this.pos.x = width; 
        this.vel.x *= -1;
      }
      if (this.pos.y < 0) {
        this.pos.y = 0; 
        this.vel.y *= -1;
      } else if (this.pos.y > height) {
        this.pos.y = height; 
        this.vel.y *= -1;
      }

      // base orbit logic
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

// Sliders
let speedSlider; // The single "Speed" slider

// D-Pad
let dPadUp, dPadDown, dPadLeft, dPadRight;
let dPadDirection;
let dPadActive = false;
let touchStartX = 0;
let touchStartY = 0;

// HUD & Canvas
let container, cnv, controlPanel;
let huntMeter, abyssMeter, novaMeter, novaCooldownMeter;

// For toggling auto-resize
let autoResize = true;

// -------------------------------------------------------------------
// 3) Setup & Draw
// -------------------------------------------------------------------
function setup() {
  // ***Define color variables***
  purpleColor = color(130, 0, 130);
  cyanColor   = color(0, 255, 255);
  blackColor  = color(0, 0, 0);

  // Create the container & auto-sized canvas
  container = createDiv();
  container.style("display", "flex");
  container.style("flex-direction", "column");
  container.style("align-items", "center");
  container.style("margin", "0 auto");
  container.style("padding", "0");
  container.style("background-color", "#000");
  container.style("width", "100%");
  container.style("max-width", "100%");
  container.parent(document.body);

  createCanvas(windowWidth, windowHeight);
  cnv = canvas;
  cnv.style("position", "relative");
  cnv.style("z-index", "0");

  createHUD();
  resetSimulation();
}

function draw() {
  background(0);

  // 1) Count how many tendrils orbit
  let countOrbit = 0;
  for (let t of tendrils) {
    let d = p5.Vector.dist(t.pos, singularity.pos);
    if (d < ORBIT_DISTANCE) countOrbit++;
  }

  // 2) Effective Speed = speedSlider.value() - orbit slow
  let baseSpeed = speedSlider.value();
  let orbitSlow = countOrbit * 0.05; 
  let finalSpeed = max(0, baseSpeed - orbitSlow);

  // If finalSpeed == 0 => "stuck" => can't move
  // We'll handle that in handleKeyboard() + D-Pad logic

  handleKeyboard(finalSpeed);

  // D-Pad movement
  if (dPadDirection.x !== 0 || dPadDirection.y !== 0) {
    if (finalSpeed > 0) {
      singularity.pos.x += dPadDirection.x * finalSpeed;
      singularity.pos.y += dPadDirection.y * finalSpeed;
    }
  }

  // Timers
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

  // Singularity update
  singularity.update();
  singularity.show();

  // Tendrils
  for (let t of tendrils) {
    t.update();
    t.show();
  }

  // Assimilation
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

// Window resized => if autoResize is true, do it
function windowResized() {
  if (autoResize) {
    resizeCanvas(windowWidth, windowHeight);
  }
}

// -------------------------------------------------------------------
// 4) Setup Helpers
// -------------------------------------------------------------------
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
  controlPanel.style("position", "relative");
  controlPanel.style("z-index", "9999");
  controlPanel.style("pointer-events", "auto");

  // Row 1: Buttons
  let row1 = createDiv();
  row1.parent(controlPanel);
  row1.style("display", "flex");
  row1.style("justify-content", "center");
  row1.style("align-items", "center");
  row1.style("gap", "10px");
  row1.style("margin-bottom", "10px");

  let spawnBtn = createButton("Spawn");
  spawnBtn.parent(row1);
  spawnBtn.mousePressed(() => spawnTendrils(5));

  let huntBtn = createButton("Hunt");
  huntBtn.parent(row1);
  huntBtn.mousePressed(triggerHunt);

  let burstBtn = createButton("Burst");
  burstBtn.parent(row1);
  burstBtn.mousePressed(triggerRepel);

  let novaBtn = createButton("Nova");
  novaBtn.parent(row1);
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

  // Row 2: Speed Slider
  let row2 = createDiv();
  row2.parent(controlPanel);
  row2.style("display", "flex");
  row2.style("justify-content", "center");
  row2.style("align-items", "center");
  row2.style("gap", "20px");
  row2.style("margin-bottom", "5px");

  speedSlider = createSlider(0, 5, 1.95, 0.1);
  speedSlider.parent(row2);
  speedSlider.style("width", "200px");
  speedSlider.style("z-index", "9999");

  let spdLabel = createSpan("Speed");
  spdLabel.parent(row2);
  spdLabel.style("font-size", "14px");
  spdLabel.style("color", "#CCCCCC");

  // Row 3: Nova & NovaCooldown
  let row3 = createDiv();
  row3.parent(controlPanel);
  row3.style("display", "flex");
  row3.style("justify-content", "center");
  row3.style("align-items", "center");
  row3.style("gap", "20px");
  row3.style("margin-bottom", "5px");

  novaMeter = createElement('meter');
  novaMeter.parent(row3);
  novaMeter.attribute("min", "0");
  novaMeter.attribute("max", NOVA_THRESHOLD.toString());
  novaMeter.attribute("value", "0");
  novaMeter.addClass("nova");
  novaMeter.style("width", "200px");
  novaMeter.style("height", "20px");
  novaMeter.style("z-index", "9999");

  novaCooldownMeter = createElement('meter');
  novaCooldownMeter.parent(row3);
  novaCooldownMeter.attribute("min", "0");
  novaCooldownMeter.attribute("max", NOVA_COOLDOWN_TIME.toString());
  novaCooldownMeter.attribute("value", "0");
  novaCooldownMeter.addClass("novacooldown");
  novaCooldownMeter.style("width", "200px");
  novaCooldownMeter.style("height", "20px");
  novaCooldownMeter.style("z-index", "9999");

  // Row 4: Hunt & Abyss
  let row4 = createDiv();
  row4.parent(controlPanel);
  row4.style("display", "flex");
  row4.style("justify-content", "center");
  row4.style("align-items", "center");
  row4.style("gap", "20px");
  row4.style("margin-bottom", "10px");

  huntMeter = createElement('meter');
  huntMeter.parent(row4);
  huntMeter.attribute("min", "0");
  huntMeter.attribute("max", HUNT_THRESHOLD.toString());
  huntMeter.attribute("value", "0");
  huntMeter.addClass("hunt");
  huntMeter.style("width", "200px");
  huntMeter.style("height", "20px");
  huntMeter.style("z-index", "9999");

  abyssMeter = createElement('meter');
  abyssMeter.parent(row4);
  abyssMeter.attribute("min", "0");
  abyssMeter.attribute("max", ABSYSS_THRESHOLD.toString());
  abyssMeter.attribute("value", "0");
  abyssMeter.addClass("abyss");
  abyssMeter.style("width", "200px");
  abyssMeter.style("height", "20px");
  abyssMeter.style("z-index", "9999");

  // Row 5: D-Pad + Preset Buttons
  let row5 = createDiv();
  row5.parent(controlPanel);
  row5.style("display", "flex");
  row5.style("gap", "60px");
  row5.style("justify-content", "center");
  row5.style("align-items", "flex-start");

  // Left side: D-Pad
  let dPadContainer = createDiv();
  dPadContainer.parent(row5);
  dPadContainer.style("display", "flex");
  dPadContainer.style("flex-direction", "column");
  dPadContainer.style("align-items", "center");
  dPadContainer.style("gap", "5px");
  dPadContainer.style("z-index", "9999");

  let dPadRow1 = createDiv();
  dPadRow1.parent(dPadContainer);
  dPadRow1.style("display", "flex");
  dPadRow1.style("justify-content", "center");
  dPadUp = createButton("↑");
  dPadUp.parent(dPadRow1);
  dPadUp.style("font-size", "18px");
  dPadUp.style("padding", "5px 10px");
  dPadUp.mousePressed(() => { dPadDirection.set(0, -1); });
  dPadUp.mouseReleased(() => { dPadDirection.y = 0; });

  let dPadRow2 = createDiv();
  dPadRow2.parent(dPadContainer);
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

  let dPadRow3 = createDiv();
  dPadRow3.parent(dPadContainer);
  dPadRow3.style("display", "flex");
  dPadRow3.style("justify-content", "center");
  dPadDown = createButton("↓");
  dPadDown.parent(dPadRow3);
  dPadDown.style("font-size", "18px");
  dPadDown.style("padding", "5px 10px");
  dPadDown.mousePressed(() => { dPadDirection.set(dPadDirection.x, 1); });
  dPadDown.mouseReleased(() => { dPadDirection.y = 0; });

  dPadDirection = createVector(0, 0);

  // Right side: Preset Buttons
  let presetContainer = createDiv();
  presetContainer.parent(row5);
  presetContainer.style("display", "flex");
  presetContainer.style("flex-direction", "column");
  presetContainer.style("align-items", "center");
  presetContainer.style("gap", "5px");
  presetContainer.style("z-index", "9999");

  let pcBtn = createButton("PC (1200×900)");
  pcBtn.parent(presetContainer);
  pcBtn.style("font-size", "14px");
  pcBtn.mousePressed(() => setCanvasSize(1200, 900));

  let mobileBtn = createButton("Mobile (360×640)");
  mobileBtn.parent(presetContainer);
  mobileBtn.style("font-size", "14px");
  mobileBtn.mousePressed(() => setCanvasSize(360, 640));

  let tabletBtn = createButton("Tablet (768×1024)");
  tabletBtn.parent(presetContainer);
  tabletBtn.style("font-size", "14px");
  tabletBtn.mousePressed(() => setCanvasSize(768, 1024));

  let autoBtn = createButton("Auto");
  autoBtn.parent(presetContainer);
  autoBtn.style("font-size", "14px");
  autoBtn.mousePressed(() => {
    autoResize = true;
    resizeCanvas(windowWidth, windowHeight);
  });
}

// -------------------------------------------------------------------
// 5) The rest of the logic
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

function handleKeyboard(finalSpeed) {
  // If finalSpeed is 0 => stuck
  if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) {
    if (finalSpeed > 0) singularity.pos.x -= finalSpeed;
  }
  if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) {
    if (finalSpeed > 0) singularity.pos.x += finalSpeed;
  }
  if (keyIsDown(UP_ARROW) || keyIsDown(87)) {
    if (finalSpeed > 0) singularity.pos.y -= finalSpeed;
  }
  if (keyIsDown(DOWN_ARROW) || keyIsDown(83)) {
    if (finalSpeed > 0) singularity.pos.y += finalSpeed;
  }

  singularity.pos.x = constrain(singularity.pos.x, singularity.radius, width - singularity.radius);
  singularity.pos.y = constrain(singularity.pos.y, singularity.radius, height - singularity.radius);
}

function keyReleased() {
  if (keyCode === 32) triggerRepel(); // SPACE
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
      let factor = speedSlider.value();
      singularity.pos.x += dx * factor;
      singularity.pos.y += dy * factor;
    } else {
      let dx = t.x - touchStartX;
      let dy = t.y - touchStartY;
      let factor = speedSlider.value();
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

// Window resized => if autoResize is true, we do it
function windowResized() {
  if (autoResize) {
    resizeCanvas(windowWidth, windowHeight);
  }
}

// Let user pick a preset => disable autoResize
function setCanvasSize(w, h) {
  autoResize = false;
  resizeCanvas(w, h);
}
