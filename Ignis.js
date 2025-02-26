console.log("Ignis.js loaded and running!!!");

/*
  Ignis x Abyss – Life x Death

  Health States (assimilation fraction):
    • 0–50%: Gold  → full speed (slider value), color gold.
    • 50–75%: Pink  → 75% speed, color pink.
    • 75–100%: Purple → 50% speed, color purple.
    • 100%: Black → 0 speed (dead). After 7 s, singularity respawns (assimilation resets to 0).
  
  Controls:
    • Movement via WSAD/Arrow keys and swiping on the canvas.
    • HUD at the bottom with:
         Row 1: Buttons: Spawn, Hunt, Burst, Nova.
         Row 2: Sliders: Agro, Gravity, Speed.
         Row 3: Labels: Agro, Gravity, Speed.
         Row 4: Meters: Burst Meter, Nova Meter.
         Row 5: Meters: Hunt Meter, Assimilation Meter.
         Row 6: Preset buttons: Walls On/Off, Auto, PC, Tablet, Mobile.
  
  Additional:
    • Walls On/Off toggles tendril bouncing.
    • Hunt and Assimilation meters use a desaturated purple style.
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
    this.state = "healthy"; // "healthy", "assimilating", "dead"
    this.deadTimer = 0; // counts when dead
    this.currentColor = color(255,215,0); // gold
  }
  
  update() {
    // Visual updates handled externally; this class simply displays current color/state.
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
      
      // Bounce off walls if enabled
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
// 2) Global Variables & Constants
// -------------------------------------------------------------------
let TENDRIL_COUNT = 20;
let ORBIT_DISTANCE = 50;
let NOVA_THRESHOLD = 3500;
let ABSYSS_THRESHOLD = 13000;
let HUNT_THRESHOLD = 5000;
let NOVA_COOLDOWN_TIME = 10000;

let novaTimer = 0;
let huntTimer = 0;
let abyssAccumulator = 0;  // assimilation bar
let novaCooldown = 0;
let spawnTimer = 0;
const SPAWN_INTERVAL = 5000;
let lastNovaTime = 0;
let explosionTimer = 0;
const explosionDuration = 500;
let explosionType = "none";
let deathBurstCount = 0;
const deathBurstInterval = 300;
let deathBurstTimer = 0;

let purpleColor, cyanColor, blackColor;
let tendrils = [];
let singularity;
let simulationRunning = true;

// p5 DOM objects for HUD
let container, cnv, controlPanel;
// Sliders
let agroSlider, gravitySlider, speedSlider;
// Meters
let burstMeter, novaMeter, huntMeter, abyssMeter;
// Walls and screen presets
let wallsOn = false;
let autoMode = true;

// For touch swiping (store last touch coordinates)
let lastTouchX = 0, lastTouchY = 0;

// -------------------------------------------------------------------
// 3) Setup & Draw
// -------------------------------------------------------------------
function setup() {
  // Set color variables
  purpleColor = color(130, 0, 130);
  cyanColor = color(0, 255, 255);
  blackColor = color(0, 0, 0);
  
  // Auto screen size by default
  createCanvas(windowWidth, windowHeight);
  
  createHUD_Bottom();
  resetSimulation();
}

function draw() {
  background(0);
  
  // Determine assimilation fraction (0 to 1)
  let frac = abyssAccumulator / ABSYSS_THRESHOLD;
  if (frac > 1) frac = 1;
  
  // Determine health state and speed factor based on fraction:
  // Gold: 0–0.5 → full speed
  // Pink: 0.5–0.75 → 75% speed
  // Purple: 0.75–1 → 50% speed
  // Black: 1 → 0 speed (dead)
  let healthState;
  let speedFactor = 1;
  if (frac < 0.5) {
    healthState = "gold";
    speedFactor = 1;
  } else if (frac < 0.75) {
    healthState = "pink";
    speedFactor = 0.75;
  } else if (frac < 1) {
    healthState = "purple";
    speedFactor = 0.5;
  } else {
    healthState = "black";
    speedFactor = 0;
  }
  
  // If black (dead), increment dead timer; if >7 s, reset assimilation.
  if (healthState === "black") {
    singularity.deadTimer = (singularity.deadTimer || 0) + deltaTime;
    if (singularity.deadTimer > 7000) {
      resetAssimilation();
    }
  } else {
    singularity.deadTimer = 0;
  }
  
  // Set singularity color based on health state
  let finalColor;
  if (healthState === "gold") {
    finalColor = color(255,215,0);  // gold
  } else if (healthState === "pink") {
    finalColor = color(255,105,180);  // pink
  } else if (healthState === "purple") {
    finalColor = color(128,0,128);  // purple
  } else {
    finalColor = color(0,0,0);      // black
  }
  singularity.currentColor = finalColor;
  singularity.state = healthState;
  
  // Final speed from slider multiplied by speedFactor
  let baseSpeed = speedSlider.value();
  let finalSpeed = baseSpeed * speedFactor;
  
  // Handle keyboard movement (WSAD / arrows) using finalSpeed
  handleKeyboard(finalSpeed);
  
  // Handle touchscreen swiping:
  // When a touch is moved, update singularity position by the change.
  // (This is handled in touchMoved below.)
  
  // Timers for spawning, hunt, and nova:
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
  // (We don’t use burstMeter for now; it could be used to show repulsion events.)
  
  singularity.update();
  singularity.show();
  
  // Update and show tendrils
  let gravPull = gravitySlider.value();
  for (let t of tendrils) {
    let d = p5.Vector.dist(t.pos, singularity.pos);
    if (d < ORBIT_DISTANCE) {
      t.orbit(singularity.pos, gravPull);
    }
    t.update();
    t.show();
  }
  
  // Assimilation: if 3+ tendrils are in orbit, increase abyssAccumulator.
  let countOrbit = 0;
  for (let t of tendrils) {
    let d = p5.Vector.dist(t.pos, singularity.pos);
    if (d < ORBIT_DISTANCE) countOrbit++;
  }
  if (countOrbit >= 3 && healthState !== "black") {
    abyssAccumulator += deltaTime;
  }
  abyssMeter.attribute("value", abyssAccumulator.toString());
  
  // Death burst chain if in dead state (optional)
  if (healthState === "black" && deathBurstCount > 0) {
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

function resetAssimilation() {
  abyssAccumulator = 0;
  singularity.deadTimer = 0;
  singularity.state = "gold";
  singularity.currentColor = color(255,215,0);
}

// -------------------------------------------------------------------
// 4) HUD Creation at Bottom (No D-Pad)
// -------------------------------------------------------------------
function createHUD_Bottom() {
  controlPanel = createDiv();
  controlPanel.style("position", "absolute");
  controlPanel.style("bottom", "0");
  controlPanel.style("left", "0");
  controlPanel.style("width", "100%");
  controlPanel.style("background", "black");
  controlPanel.style("color", "grey");
  controlPanel.style("text-align", "center");
  controlPanel.style("padding", "10px 0");
  controlPanel.style("font-family", "sans-serif");
  controlPanel.style("z-index", "9999");
  controlPanel.parent(document.body);
  
  // Row 1: Buttons: Spawn | Hunt | Burst | Nova (using mouseClicked for touch)
  let row1 = createDiv();
  row1.parent(controlPanel);
  row1.style("display", "flex");
  row1.style("justify-content", "center");
  row1.style("align-items", "center");
  row1.style("gap", "10px");
  row1.style("margin-bottom", "10px");
  
  let spawnBtn = createButton("Spawn");
  spawnBtn.parent(row1);
  spawnBtn.mouseClicked(() => spawnTendrils(5));
  
  let huntBtn = createButton("Hunt");
  huntBtn.parent(row1);
  huntBtn.mouseClicked(triggerHunt);
  
  let burstBtn = createButton("Burst");
  burstBtn.parent(row1);
  burstBtn.mouseClicked(triggerRepel);
  
  let novaBtn = createButton("Nova");
  novaBtn.parent(row1);
  novaBtn.mouseClicked(() => {
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
  });
  burstBtn.style("color", "#00FFFF");
  novaBtn.style("color", "#00FFFF");
  
  // Row 2: Sliders for Agro, Gravity, Speed
  let row2 = createDiv();
  row2.parent(controlPanel);
  row2.style("display", "flex");
  row2.style("justify-content", "center");
  row2.style("align-items", "center");
  row2.style("gap", "20px");
  row2.style("margin-bottom", "5px");
  
  agroSlider = createSlider(0, 5, 1.7, 0.1);
  agroSlider.parent(row2);
  agroSlider.style("width", "120px");
  
  gravitySlider = createSlider(0, 5, 1.5, 0.1);
  gravitySlider.parent(row2);
  gravitySlider.style("width", "120px");
  
  speedSlider = createSlider(0, 5, 1.95, 0.1);
  speedSlider.parent(row2);
  speedSlider.style("width", "120px");
  
  // Row 3: Labels for the sliders
  let row3 = createDiv();
  row3.parent(controlPanel);
  row3.style("display", "flex");
  row3.style("justify-content", "center");
  row3.style("align-items", "center");
  row3.style("gap", "60px");
  row3.style("margin-bottom", "10px");
  
  let agroLabel = createSpan("Agro");
  agroLabel.parent(row3);
  agroLabel.style("font-size", "14px");
  agroLabel.style("color", "#CCCCCC");
  
  let gravLabel = createSpan("Gravity");
  gravLabel.parent(row3);
  gravLabel.style("font-size", "14px");
  gravLabel.style("color", "#CCCCCC");
  
  let spdLabel = createSpan("Speed");
  spdLabel.parent(row3);
  spdLabel.style("font-size", "14px");
  spdLabel.style("color", "#CCCCCC");
  
  // Row 4: Meters: Burst Meter and Nova Meter
  let row4 = createDiv();
  row4.parent(controlPanel);
  row4.style("display", "flex");
  row4.style("justify-content", "center");
  row4.style("align-items", "center");
  row4.style("gap", "20px");
  row4.style("margin-bottom", "5px");
  
  burstMeter = createElement('meter');
  burstMeter.parent(row4);
  burstMeter.attribute("min", "0");
  burstMeter.attribute("max", NOVA_THRESHOLD.toString());
  burstMeter.attribute("value", "0");
  
  novaMeter = createElement('meter');
  novaMeter.parent(row4);
  novaMeter.attribute("min", "0");
  novaMeter.attribute("max", NOVA_THRESHOLD.toString());
  novaMeter.attribute("value", "0");
  
  // Row 5: Meters: Hunt Meter and Assimilation Meter
  let row5 = createDiv();
  row5.parent(controlPanel);
  row5.style("display", "flex");
  row5.style("justify-content", "center");
  row5.style("align-items", "center");
  row5.style("gap", "20px");
  row5.style("margin-bottom", "10px");
  
  huntMeter = createElement('meter');
  huntMeter.parent(row5);
  huntMeter.attribute("min", "0");
  huntMeter.attribute("max", HUNT_THRESHOLD.toString());
  huntMeter.attribute("value", "0");
  huntMeter.addClass("desatpurple");
  
  abyssMeter = createElement('meter');
  abyssMeter.parent(row5);
  abyssMeter.attribute("min", "0");
  abyssMeter.attribute("max", ABSYSS_THRESHOLD.toString());
  abyssMeter.attribute("value", "0");
  abyssMeter.addClass("desatpurple");
  
  // Row 6: Preset Buttons: Walls On/Off | Auto | PC | Tablet | Mobile
  let row6 = createDiv();
  row6.parent(controlPanel);
  row6.style("display", "flex");
  row6.style("justify-content", "center");
  row6.style("align-items", "center");
  row6.style("gap", "10px");
  
  let wallsBtn = createButton("Walls: OFF");
  wallsBtn.parent(row6);
  wallsBtn.mousePressed(() => {
    wallsOn = !wallsOn;
    wallsBtn.html("Walls: " + (wallsOn ? "ON" : "OFF"));
  });
  
  let autoBtn = createButton("Auto");
  autoBtn.parent(row6);
  autoBtn.mousePressed(() => {
    autoMode = true;
    resizeCanvas(windowWidth, windowHeight);
    resetSimulation();
  });
  
  let pcBtn = createButton("PC");
  pcBtn.parent(row6);
  pcBtn.mousePressed(() => {
    autoMode = false;
    resizeCanvas(1200, 900);
    resetSimulation();
  });
  
  let tabletBtn = createButton("Tablet");
  tabletBtn.parent(row6);
  tabletBtn.mousePressed(() => {
    autoMode = false;
    resizeCanvas(768, 1024);
    resetSimulation();
  });
  
  let mobileBtn = createButton("Mobile");
  mobileBtn.parent(row6);
  mobileBtn.mousePressed(() => {
    autoMode = false;
    resizeCanvas(360, 640);
    resetSimulation();
  });
  
  // Add style for desatpurple meters
  createElement('style', `
    meter.desatpurple::-webkit-meter-optimum-value { background: #7D6E93; }
    meter.desatpurple::-webkit-meter-suboptimum-value { background: #7D6E93; }
    meter.desatpurple::-moz-meter-bar { background: #7D6E93; }
  `).parent(document.head);
}

// -------------------------------------------------------------------
// 5) The Rest of the Game Logic
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
  deathBurstCount = 0;
  deathBurstTimer = 0;
  
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
  if (keyIsDown(LEFT_ARROW) || keyIsDown(65))
    singularity.pos.x -= finalSpeed;
  if (keyIsDown(RIGHT_ARROW) || keyIsDown(68))
    singularity.pos.x += finalSpeed;
  if (keyIsDown(UP_ARROW) || keyIsDown(87))
    singularity.pos.y -= finalSpeed;
  if (keyIsDown(DOWN_ARROW) || keyIsDown(83))
    singularity.pos.y += finalSpeed;
  
  singularity.pos.x = constrain(singularity.pos.x, singularity.radius, width - singularity.radius);
  singularity.pos.y = constrain(singularity.pos.y, singularity.radius, height - singularity.radius);
}

function keyReleased() {
  if (keyCode === 32) triggerRepel();
  if (keyCode === 86 && novaCooldown <= 0) {
    triggerNovaManual();
    novaCooldown = NOVA_COOLDOWN_TIME;
  }
}

function triggerHunt() {
  for (let t of tendrils) {
    t.hunt(singularity.pos);
  }
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
    if (d < ORBIT_DISTANCE && !t.immolating) {
      t.startImmolation();
    }
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

// Touchscreen swiping: update singularity by the delta of touch movements.
function touchStarted() {
  if (touches.length > 0) {
    let t = touches[0];
    lastTouchX = t.x;
    lastTouchY = t.y;
  }
}

function touchMoved() {
  if (touches.length > 0) {
    let t = touches[0];
    let dx = t.x - lastTouchX;
    let dy = t.y - lastTouchY;
    singularity.pos.x += dx;
    singularity.pos.y += dy;
    lastTouchX = t.x;
    lastTouchY = t.y;
  }
}

function touchEnded() {
  // Nothing to do
}

function windowResized() {
  if (autoMode) {
    resizeCanvas(windowWidth, windowHeight);
    resetSimulation();
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
