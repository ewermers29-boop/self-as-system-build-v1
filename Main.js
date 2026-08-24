// Background and creature colors
const backgroundColor = "#000000";
const creatureColor = "#FF0000";

// Creature size (shared by all 10 creatures)
const creatureSize = 18;

// Positions for the 10 creatures
const creaturePositions = [
  { x: 60,  y: 60 },
  { x: 160, y: 100 },
  { x: 260, y: 50 },
  { x: 340, y: 140 },
  { x: 420, y: 70 },
  { x: 500, y: 130 },
  { x: 580, y: 60 },
  { x: 100, y: 160 },
  { x: 300, y: 170 },
  { x: 460, y: 40 }
];

// Draws one ant-like creature at (x, y) using simple canvas shapes
function drawCreature(ctx, x, y, size) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = creatureColor;
  ctx.strokeStyle = creatureColor;
  ctx.lineWidth = size * 0.08;

  // abdomen
  ctx.beginPath();
  ctx.ellipse(-size * 0.35, 0, size * 0.34, size * 0.26, 0, 0, Math.PI * 2);
  ctx.fill();

  // legs
  const legAngles = [-0.9, 0, 0.9];
  legAngles.forEach((angle) => {
    [1, -1].forEach((side) => {
      ctx.beginPath();
      ctx.moveTo(size * 0.15, 0);
      ctx.lineTo(
        size * 0.15 - Math.sin(angle) * size * 0.5,
        side * (size * 0.3 + Math.cos(angle) * size * 0.1)
      );
      ctx.stroke();
    });
  });

  // thorax
  ctx.beginPath();
  ctx.arc(size * 0.15, 0, size * 0.2, 0, Math.PI * 2);
  ctx.fill();

  // head
  ctx.beginPath();
  ctx.arc(size * 0.55, 0, size * 0.22, 0, Math.PI * 2);
  ctx.fill();

  // antennae
  [1, -1].forEach((side) => {
    ctx.beginPath();
    ctx.moveTo(size * 0.68, side * size * 0.09);
    ctx.lineTo(size * 0.9, side * size * 0.3);
    ctx.stroke();
  });

  ctx.restore();
}

// Set up the first canvas and draw the 10 creatures
const canvas = document.getElementById("canvas-sigil-seed");
const ctx = canvas.getContext("2d");

ctx.fillStyle = backgroundColor;
ctx.fillRect(0, 0, canvas.width, canvas.height);

creaturePositions.forEach((pos) => {
  drawCreature(ctx, pos.x, pos.y, creatureSize);
});