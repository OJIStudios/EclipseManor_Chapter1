const overlay = document.querySelector('.overlay');
const glow = document.querySelector('.flashlight-glow');
let flashlightOn = true;
window.flashlightOn = flashlightOn;

let glowingObjects = [];

function updateFlashlightPosition(hero) {
  const heroScreenX = utils.withGrid(10.95);
  const heroScreenY = utils.withGrid(6.1);

  overlay.style.setProperty('--x', `${heroScreenX}px`);
  overlay.style.setProperty('--y', `${heroScreenY}px`);

  glow.style.setProperty('--x', `${heroScreenX}px`);
  glow.style.setProperty('--y', `${heroScreenY}px`);
}

document.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 'f') {
    flashlightOn = !flashlightOn;

    glow.style.setProperty('--glow-color', flashlightOn
      ? 'rgba(255, 255, 255, 0.15)'
      : 'rgba(0,180,255,0.2)'
    );

    glowingObjects.forEach(div => {
      div.style.display = flashlightOn ? "none" : "block";
    });

    updateItemGlowColor();
  }
});

function createObjectGlow(map) {
  glowingObjects.forEach(g => g.remove());
  glowingObjects = [];

  Object.values(map.gameObjects).forEach(obj => {
    if (obj.glow) {
      const div = document.createElement("div");
      div.classList.add("object-glow");

      // Set tighter size for tighter glow effect
      div.style.position = "absolute";
      div.style.width = "32px";
      div.style.height = "32px";
      div.style.borderRadius = "50%";
      div.style.pointerEvents = "none";
      div.style.zIndex = "9999";
      div.style.mixBlendMode = "screen";
      div.style.animation = "pulseGlow 2s ease-in-out infinite";
      div.style.background = "radial-gradient(circle, rgba(255, 255, 0, 0.6), rgba(255, 255, 0, 0))";
      div.style.display = flashlightOn ? "none" : "block";

      document.querySelector(".game-container").appendChild(div);
      glowingObjects.push(div);
      obj._glowDiv = div;
    }
  });
}

function updateObjectGlowPositions(map, cameraPerson) {
  Object.values(map.gameObjects).forEach(obj => {
    if (obj.glow && obj._glowDiv) {
      const offsetX = utils.withGrid(10.5) - cameraPerson.x;
      const offsetY = utils.withGrid(6) - cameraPerson.y;
      const screenX = obj.x + offsetX;
      const screenY = obj.y + offsetY;

      obj._glowDiv.style.left = `${screenX - 16}px`;
      obj._glowDiv.style.top = `${screenY - 16}px`;
    }
  });
}

function updateItemGlowColor() {
  glowingObjects.forEach(div => {
    div.style.background = flashlightOn
      ? "none"
      : "radial-gradient(circle, rgba(255, 255, 0, 0.6), rgba(255, 255, 0, 0))";
  });
}

// Export functions for external use
window.updateFlashlightPosition = updateFlashlightPosition;
window.createObjectGlow = createObjectGlow;
window.updateObjectGlowPositions = updateObjectGlowPositions;
// Inside LightToggle.js draw method
if (this.lightOn) {
  ctx.save();

  // Clear and fill the canvas with darkness
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
  ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

  // Create a glow around the player
  ctx.globalCompositeOperation = "destination-out";
  let playerX = this.cameraPerson.x - 8 + utils.withGrid(10.5);
  let playerY = this.cameraPerson.y - 18 + utils.withGrid(6);
  ctx.beginPath();
  ctx.fillStyle = "rgba(0,0,0,1)";
  ctx.arc(playerX, playerY, 40, 0, Math.PI * 2, false);
  ctx.fill();
  // 🌟 Add yellow highlight over the key
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = "rgba(255, 255, 0, 0.4)";
  ctx.beginPath();
  ctx.arc(keyX, keyY, 50, 0, Math.PI * 2, false);
  ctx.fill();

  ctx.restore();
}
