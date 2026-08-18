(function () {
  "use strict";

  // ---------- setup ----------

  var canvas = document.getElementById("colony-canvas");
  var ctx = canvas.getContext("2d");
  var stage = document.getElementById("stage");
  var slider = document.getElementById("brightness-slider");
  var readout = document.getElementById("control-readout");

  var ACCENT = "#FF0000";
  var ANT_COUNT = 10; // restraint: only 10 creatures, ever

  var width = 0;
  var height = 0;

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
  }
  window.addEventListener("resize", resize);
  resize();

  // ---------- brightness state ----------

  var brightnessPercent = parseInt(slider.value, 10);

  function applyBrightnessVisual(p) {
    // scales the whole stage, background and creatures alike
    var factor = 0.15 + (p / 100) * 0.85; // never fully invisible at min
    stage.style.filter = "brightness(" + factor.toFixed(3) + ")";
  }

  function speedFromBrightness(p) {
    // 0 px/s at 6% brightness, 5 px/s at 100% brightness, linear between
    var minB = 6;
    var maxB = 100;
    var maxSpeed = 5;
    if (p <= minB) return 0;
    var t = (p - minB) / (maxB - minB);
    return t * maxSpeed;
  }

  slider.addEventListener("input", function () {
    brightnessPercent = parseInt(slider.value, 10);
    readout.textContent = brightnessPercent + "%";
    applyBrightnessVisual(brightnessPercent);
  });
  readout.textContent = brightnessPercent + "%";
  applyBrightnessVisual(brightnessPercent);

  // ---------- the hive (single shared state) ----------
  // there is exactly ONE mind here. every ant reads from it.
  // no ant has its own velocity, its own decision, or its own goal.

  var hive = {
    x: width / 2,
    y: height / 2,
    heading: Math.random() * Math.PI * 2,
    headingTarget: Math.random() * Math.PI * 2,
    turnCooldown: 0
  };

  // formation offsets: fixed positions relative to the hive's front point,
  // defined in hive-local space (forward, lateral). this is the ONLY thing
  // that differentiates one ant from another visually. it is not autonomy,
  // it is geometry, like cells in one body.
  var formation = [];
  (function buildFormation() {
    // a loose trailing cluster, like a real ant column funneling behind
    // a lead point
    var rows = [
      [0],
      [-14, 14],
      [-26, -4, 18, 30],
      [-36, -18, 6, 24, 38]
    ];
    var forward = 0;
    var idx = 0;
    for (var r = 0; r < rows.length; r++) {
      forward -= 16;
      for (var c = 0; c < rows[r].length; c++) {
        if (idx >= ANT_COUNT) break;
        formation.push({
          forward: forward,
          lateral: rows[r][c],
          phase: idx * 0.9 // used only to read the shared clock differently
        });
        idx++;
      }
    }
    while (formation.length < ANT_COUNT) {
      formation.push({ forward: -60, lateral: 0, phase: formation.length });
    }
  })();

  // ---------- shared clock ----------
  // every wobble, every twitch, every ant reads this same value.
  // there is no per-ant randomness generator.

  var clock = 0;

  // ---------- hive steering ----------
  // one heading, one turn decision, applied to the whole colony at once.

  function steerHive(dt) {
    hive.turnCooldown -= dt;
    if (hive.turnCooldown <= 0) {
      // pick a new shared target heading, a gentle drift, not a sharp turn
      var delta = (Math.random() - 0.5) * (Math.PI * 0.6);
      hive.headingTarget = hive.heading + delta;
      hive.turnCooldown = 1.5 + Math.random() * 2.5;
    }

    // steer toward the shared target at a shared turn rate
    var diff = hive.headingTarget - hive.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    var turnRate = 0.8; // radians/sec ceiling
    var maxStep = turnRate * dt;
    if (diff > maxStep) diff = maxStep;
    if (diff < -maxStep) diff = -maxStep;
    hive.heading += diff;

    // boundary awareness: bend the shared heading away from edges,
    // this is a hive-level response, not an individual one
    var margin = 80;
    var pushX = 0;
    var pushY = 0;
    if (hive.x < margin) pushX = 1;
    if (hive.x > width - margin) pushX = -1;
    if (hive.y < margin) pushY = 1;
    if (hive.y > height - margin) pushY = -1;
    if (pushX !== 0 || pushY !== 0) {
      var desired = Math.atan2(pushY || Math.sin(hive.heading), pushX || Math.cos(hive.heading));
      hive.headingTarget = desired;
    }

    var speed = speedFromBrightness(brightnessPercent);
    hive.x += Math.cos(hive.heading) * speed * dt;
    hive.y += Math.sin(hive.heading) * speed * dt;

    // clamp inside the stage regardless
    hive.x = Math.max(20, Math.min(width - 20, hive.x));
    hive.y = Math.max(20, Math.min(height - 20, hive.y));

    return speed;
  }

  // ---------- drawing a single ant ----------
  // form: resembles an ant. three body segments, six legs, two antennae.

  function drawAnt(x, y, angle, scale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(scale, scale);

    ctx.strokeStyle = ACCENT;
    ctx.fillStyle = ACCENT;
    ctx.lineWidth = 1;

    // legs (three pairs, thin lines off the thorax)
    ctx.beginPath();
    var legOffsets = [-3, 0, 3];
    for (var i = 0; i < legOffsets.length; i++) {
      var lx = legOffsets[i];
      ctx.moveTo(lx, -1.5);
      ctx.lineTo(lx - 3, -5);
      ctx.moveTo(lx, 1.5);
      ctx.lineTo(lx - 3, 5);
    }
    ctx.stroke();

    // abdomen (rear, largest)
    ctx.beginPath();
    ctx.ellipse(6, 0, 4.5, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // thorax (middle)
    ctx.beginPath();
    ctx.ellipse(0, 0, 2.6, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // head (front)
    ctx.beginPath();
    ctx.ellipse(-5, 0, 2.2, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // antennae
    ctx.beginPath();
    ctx.moveTo(-6.5, -0.8);
    ctx.lineTo(-9.5, -3);
    ctx.moveTo(-6.5, 0.8);
    ctx.lineTo(-9.5, 3);
    ctx.stroke();

    ctx.restore();
  }

  // ---------- main loop ----------

  var lastTime = null;

  function frame(t) {
    if (lastTime === null) lastTime = t;
    var dt = Math.min((t - lastTime) / 1000, 0.05); // seconds, clamped
    lastTime = t;
    clock += dt;

    var speed = steerHive(dt);
    var moving = speed > 0.01;

    ctx.clearRect(0, 0, width, height);

    var cosH = Math.cos(hive.heading);
    var sinH = Math.sin(hive.heading);
    // perpendicular vector for lateral offset
    var perpX = -sinH;
    var perpY = cosH;

    for (var i = 0; i < formation.length; i++) {
      var f = formation[i];

      // world position: hive point + rotated local offset
      var baseX = hive.x + cosH * f.forward + perpX * f.lateral;
      var baseY = hive.y + sinH * f.forward + perpY * f.lateral;

      // shared-clock wobble: same formula for everyone, only the phase
      // (a fixed property of the slot, not a private decision) differs.
      // this scales with the hive's own speed, so a still colony is still.
      var wobbleAmp = moving ? 1.4 : 0.3;
      var wobble = Math.sin(clock * 3 + f.phase) * wobbleAmp;
      var wx = baseX + perpX * wobble;
      var wy = baseY + perpY * wobble;

      var angleWobble = Math.sin(clock * 2.4 + f.phase) * (moving ? 0.12 : 0.03);
      var angle = hive.heading + angleWobble;

      drawAnt(wx, wy, angle, 1.6);
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();