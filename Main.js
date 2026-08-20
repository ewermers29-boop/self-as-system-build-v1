/* ==========================================================================
   SWARM — script.js
   Stage 1: canvas setup only.
   No creatures, animation, interaction, or atmosphere yet.
   ========================================================================== */

(function () {

  // Each test section, identified by its canvas id.
  const TEST_IDS = [
    "canvas-sigil-seed",
    "canvas-behavior-rule",
    "canvas-gesture-language",
    "canvas-atmosphere-constraint"
  ];

  // Holds references to each canvas + its 2D context, keyed by id.
  // Later stages (creatures, animation) will read from this object.
  const canvases = {};

  function setupCanvas(id) {
    const canvas = document.getElementById(id);

    if (!canvas) {
      console.warn(`swarm: could not find canvas with id "${id}"`);
      return;
    }

    const ctx = canvas.getContext("2d");

    // fill with background color so the canvas isn't transparent
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    canvases[id] = { canvas, ctx };
  }

  function init() {
    TEST_IDS.forEach(setupCanvas);
  }

  document.addEventListener("DOMContentLoaded", init);

  // exposed for later stages to build on
  window.SWARM = { canvases };

})();