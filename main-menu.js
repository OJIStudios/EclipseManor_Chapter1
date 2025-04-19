setTimeout(() => {
  document.getElementById("loading-screen").style.display = "none";
  document.getElementById("game-content").style.display = "block";
}, 3000); // Adjust time as needed


window.addEventListener("load", function () {
  const music = document.getElementById("bg-music");

  // Start music when user clicks anywhere
  function enableMusic() {
      music.play().then(() => {
          document.body.removeEventListener("click", enableMusic);
      }).catch(error => console.log("Playback error:", error));
  }

  document.body.addEventListener("click", enableMusic);
});


document.addEventListener("DOMContentLoaded", function() {
  let hoverSound = new Audio("hover.mp3");

  document.querySelectorAll("button").forEach(item => {
      item.addEventListener("mouseenter", () => {
          hoverSound.currentTime = 0; // Restart the sound
          hoverSound.play().catch(error => console.log("Error playing sound:", error));
      });
  });
});

// Open the settings menu
document.getElementById("settings-button").addEventListener("click", function () {
  document.getElementById("settings-modal").style.display = "flex";
});

// Close the settings menu when clicking the close button
document.getElementById("close-settings").addEventListener("click", function () {
  document.getElementById("settings-modal").style.display = "none";
});

// Close the settings menu when clicking outside the modal
window.addEventListener("click", function (event) {
  let modal = document.getElementById("settings-modal");
  if (event.target === modal) {
      modal.style.display = "none";
  }
});

// Open the credits modal
document.getElementById("credits-button").addEventListener("click", function () {
  document.getElementById("credits-modal").style.display = "flex";
});

// Close the credits modal
document.getElementById("close-credits").addEventListener("click", function () {
  document.getElementById("credits-modal").style.display = "none";
});

// Close modal when clicking outside of it
window.addEventListener("click", function (event) {
  let modal = document.getElementById("credits-modal");
  if (event.target === modal) {
      modal.style.display = "none";
  }
});
