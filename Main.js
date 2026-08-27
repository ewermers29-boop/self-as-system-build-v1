// -----------------------------------------------------
// V1 REFLECTION — TO BE WRITTEN AFTER TESTING
// -----------------------------------------------------

const canvas = document.getElementById('swarm-canvas');
const ctx = canvas.getContext('2d');
const panel = document.getElementById('panel');
const infoTemp = document.getElementById('info-temp');

const BG_COLOR = '#000000';
const CREATURE_COLOR = '#FF0000';

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// ----------------------------
// Swarm speed state
// ----------------------------
let swarmSpeed = 0; // px/sec — starts at 0 until temperature is known, never rounded

function setSwarmSpeed(pxPerSec) {
  swarmSpeed = pxPerSec;
}

// Fixed two-point rule: 36°F -> 0 px/sec, 100°F -> 10 px/sec.
// Linear between those points. Clamped outside the range.
function tempToSpeed(tempF) {
  const LOW_TEMP = 36;
  const HIGH_TEMP = 100;
  const LOW_SPEED = 0;
  const HIGH_SPEED = 100;

  if (tempF <= LOW_TEMP) return LOW_SPEED;
  if (tempF >= HIGH_TEMP) return HIGH_SPEED;

  const ratio = (tempF - LOW_TEMP) / (HIGH_TEMP - LOW_TEMP);
  return LOW_SPEED + ratio * (HIGH_SPEED - LOW_SPEED);
}

// ----------------------------
// Panel state display
// ----------------------------
function renderState(state, data = {}) {
  switch (state) {
    case 'requesting':
      panel.innerHTML = 'REQUESTING LOCATION...';
      infoTemp.textContent = 'TEMP: —';
      break;

    case 'unavailable':
      panel.innerHTML =
`TEMPERATURE: UNAVAILABLE
SWARM SPEED: 0 PX/SEC
LOCATION ACCESS REQUIRED
<span class="flicker">[ REASON: ${data.reason || 'UNKNOWN'} ]</span>`;
      infoTemp.textContent = 'TEMP: UNAVAILABLE';
      setSwarmSpeed(0);
      break;

    case 'live':
      // data.temp and data.speed are the raw, unrounded values.
      // setSwarmSpeed receives the raw speed — display formatting
      // below does not affect the value driving movement.
      setSwarmSpeed(data.speed);

      panel.innerHTML =
`TEMPERATURE: ${Math.round(data.temp)}°F
SWARM SPEED: ${data.speed.toFixed(1)} PX/SEC
LOCATION: LOCKED`;
      infoTemp.textContent = `TEMP: ${Math.round(data.temp)}°F`;
      break;
  }
}

// ----------------------------
// Geolocation + temperature fetch
// ----------------------------
function fetchTemperature(lat, lon) {
  fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m&temperature_unit=fahrenheit`)
    .then(res => {
      if (!res.ok) throw new Error('BAD_RESPONSE');
      return res.json();
    })
    .then(data => {
      const temp = data.current.temperature_2m;
      const speed = tempToSpeed(temp);
      renderState('live', { temp, speed });
    })
    .catch(() => {
      renderState('unavailable', { reason: 'FETCH_FAILED' });
    });
}

function initTemperature() {
  if (!('geolocation' in navigator)) {
    renderState('unavailable', { reason: 'UNSUPPORTED_BROWSER' });
    return;
  }

  renderState('requesting');

  navigator.geolocation.getCurrentPosition(
    (position) => {
      fetchTemperature(position.coords.latitude, position.coords.longitude);
    },
    (error) => {
      const reasons = {
        1: 'PERMISSION_DENIED',
        2: 'POSITION_UNAVAILABLE',
        3: 'TIMEOUT'
      };
      renderState('unavailable', { reason: reasons[error.code] || 'UNKNOWN' });
    },
    { timeout: 10000 }
  );
}

// --------------------------------------------------------------------------
// drawCreature(ctx, x, y, rotation)
//
// Retrieved from the Visual Rule Tests project (Test 1: Sigil Seed).
// The single reusable function that defines the creature's form.
// Built from simple primitives:
//   - one abdomen (ellipse)
//   - one head (ellipse)
//   - three legs per side (straight lines)
// --------------------------------------------------------------------------
function drawCreature(ctx, x, y, rotation = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  ctx.fillStyle = CREATURE_COLOR;
  ctx.strokeStyle = CREATURE_COLOR;
  ctx.lineWidth = 1;

  // Abdomen (rear body segment)
  ctx.beginPath();
  ctx.ellipse(-6, 0, 6, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head (front body segment)
  ctx.beginPath();
  ctx.ellipse(7, 0, 4, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs — three per side, drawn as simple angled lines
  const legOffsets = [-4, 0, 4];
  legOffsets.forEach((offsetX) => {
    // top leg
    ctx.beginPath();
    ctx.moveTo(offsetX, -2);
    ctx.lineTo(offsetX - 3, -8);
    ctx.stroke();

    // bottom leg
    ctx.beginPath();
    ctx.moveTo(offsetX, 2);
    ctx.lineTo(offsetX - 3, 8);
    ctx.stroke();
  });

  ctx.restore();
}

// ----------------------------
// Swarm — single shared movement state
// ----------------------------
const CREATURE_COUNT = 10;

// One shared velocity/direction for the whole swarm.
const swarm = {
  x: 0,
  y: 0,
  angle: 0
};

// Fixed offsets from the swarm's centroid — exactly 10 predetermined
// positions forming a compact cluster. Identical every page load.
// No Math.random() — positions are hardcoded.
const offsets = [
  { dx: 0,   dy: 0 },
  { dx: 30,  dy: -14 },
  { dx: -30, dy: -14 },
  { dx: 30,  dy: 14 },
  { dx: -30, dy: 14 },
  { dx: 15,  dy: -34 },
  { dx: -15, dy: -34 },
  { dx: 15,  dy: 34 },
  { dx: -15, dy: 34 },
  { dx: 0,   dy: -54 }
];

function initSwarmPosition() {
  swarm.x = canvas.width / 2;
  swarm.y = canvas.height / 2;
}
initSwarmPosition();

function stepSwarm(dt) {
  const dx = Math.cos(swarm.angle) * swarmSpeed * dt;
  const dy = Math.sin(swarm.angle) * swarmSpeed * dt;

  swarm.x += dx;
  swarm.y += dy;

  if (swarm.x < 0) swarm.x = canvas.width;
  if (swarm.x > canvas.width) swarm.x = 0;
  if (swarm.y < 0) swarm.y = canvas.height;
  if (swarm.y > canvas.height) swarm.y = 0;
}

function drawSwarm(ctx) {
  offsets.forEach(offset => {
    drawCreature(ctx, swarm.x + offset.dx, swarm.y + offset.dy, swarm.angle);
  });
}

let lastTime = performance.now();

function loop(now) {
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  stepSwarm(dt);
  drawSwarm(ctx);

  requestAnimationFrame(loop);
}

initTemperature();
requestAnimationFrame(loop);