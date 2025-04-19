// script.js
const tileSize = 32;
const mapData = [
    "WWWWWWWWWW", 
    "W........W", 
    "W..WW.W..W", 
    "W..W..W..W", 
    "W..W..W..W", 
    "W........W", 
    "WWWWWWWWWW"
];

const gameContainer = document.getElementById("game-container");
let playerX = 1, playerY = 1;
let player = document.getElementById("player"); // Ensure player exists

function createMap() {
    for (let y = 0; y < mapData.length; y++) {
        for (let x = 0; x < mapData[y].length; x++) {
            let tile = document.createElement("div");
            tile.classList.add("tile", mapData[y][x] === "W" ? "wall" : "floor");
            tile.style.left = `${x * tileSize}px`;
            tile.style.top = `${y * tileSize}px`;
            gameContainer.appendChild(tile);
        }
    }
    updatePlayerPosition();
}

function updatePlayerPosition() {
    player.style.left = `${playerX * tileSize}px`;
    player.style.top = `${playerY * tileSize}px`;
}

document.addEventListener("keydown", (e) => {
    if (e.key === "w" && mapData[playerY - 1][playerX] !== "W") playerY--;
    if (e.key === "s" && mapData[playerY + 1][playerX] !== "W") playerY++;
    if (e.key === "a" && mapData[playerY][playerX - 1] !== "W") playerX--;
    if (e.key === "d" && mapData[playerY][playerX + 1] !== "W") playerX++;
    updatePlayerPosition();
});

createMap();
