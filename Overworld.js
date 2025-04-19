class Overworld {
  constructor(config) {
    this.config = config;
    this.id = config.id || null;
    this.element = config.element;
    this.canvas = this.element.querySelector(".game-canvas");
    this.ctx = this.canvas.getContext("2d");
    this.map = null;
    this.timeInRoom = 0;
    this.flickerStarted = false;
    this.killTimer = null;
    this.flickerInterval = null;
  }

  startGameLoop() {
    const safeDuration = Math.floor(60000 + Math.random() * 10000);

    const flickerFlashlight = () => {
      let flickerCount = 0;
      const maxFlickers = 30;

      const doFlicker = () => {
        const isOn = flickerCount % 2 === 0;
        glow.style.setProperty('--glow-color', isOn ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0)');
        flickerCount++;

        if (flickerCount < maxFlickers) {
          this.flickerInterval = setTimeout(doFlicker, 80 + Math.random() * 70);
        } else {
          glow.style.setProperty('--glow-color', 'rgba(0,0,0,0)');
        }
      };

      doFlicker();
    };

    const killPlayer = () => {
      const jumpscare = document.getElementById("jumpscare");
      const scream = document.getElementById("jumpscareSound");
      const deathScreen = document.getElementById("deathScreen");
      const deathMessage = document.getElementById("deathMessage");

      const messages = [
        "You made a promise. Get up.",
        "You’re not done yet. Get up.",
        "Was that your best? Get up.",
        "You’re just like the others. Get up.",
        "Not all who enter get to leave. Get up.",
        "This place remembers every scream. Get up.",
        "Wh̷̍͜y͚͂͘ d̸̢̊i̶̹̋d y̵͌ͅó̸̩u̷͙͐ ś̠͠t̵̮́ő̶̩p̷̩͂? Get up."
      ];

      const msg = messages[Math.floor(Math.random() * messages.length)];
      deathMessage.innerText = msg;

      jumpscare.classList.remove("hidden");
      scream.play();

      setTimeout(() => {
        jumpscare.classList.add("hidden");
        deathScreen.classList.remove("hidden");
        deathScreen.classList.add("show");

        const reincarnateListener = new KeyPressListener("KeyE", () => {
          reincarnateListener.unbind();
          location.reload();
        });
      }, 3600);
    };

    const step = () => {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      const cameraPerson = this.map.gameObjects.hero;

      Object.values(this.map.gameObjects).forEach(object => {
        object.update({
          arrow: this.directionInput.direction,
          map: this.map,
        });
      });

      //Draw Lower layer
      this.map.drawLowerImage(this.ctx, cameraPerson);
      createObjectGlow(this.map); // Makes glow DIVs for objects with glow: true

      //Draw Game Objects
      Object.values(this.map.gameObjects)
      .sort((a, b) => a.y - b.y)
      .forEach(object => {
        object.sprite.useGlow = object.glow === true;
        object.sprite.draw(this.ctx, cameraPerson);
      });

      const hero = this.map.gameObjects.hero;
      const nextPos = utils.nextPosition(hero.x, hero.y, hero.direction);

      const interactableObj = Object.values(this.map.gameObjects).find(obj => {
        return `${obj.x},${obj.y}` === `${nextPos.x},${nextPos.y}` && obj.talking;
      });

      if (!this.map.isCutscenePlaying && !this.map.isJournalOpen && interactableObj) {
        let promptText = "[E]";
        if (interactableObj.id?.includes("door")) {
          promptText = "[E] Open Door";
        } else if (interactableObj.id?.includes("puzzle")) {
          promptText = "[E] Solve Puzzle";
        } else if (interactableObj.id?.includes("vase")) {
          promptText = "[E] Break";
        }
        else if (interactableObj.id?.includes("basement")) {
          promptText = "[E] Escape";
        }
        const promptElem = document.getElementById("interactionPrompt");
        promptElem.innerText = promptText;
        showInteractionPrompt();
      } else {
        hideInteractionPrompt();
      }

      this.map.drawUpperImage(this.ctx, cameraPerson);
      updateFlashlightPosition(hero);

      this.timeInRoom += 16.67;

      if (!this.flickerStarted && this.timeInRoom > safeDuration) {
        this.flickerStarted = true;
        flickerFlashlight();
        this.killTimer = setTimeout(killPlayer, 5000);
      }

      requestAnimationFrame(() => {
        step();
      });
    };

    step();

    //Draw Lower layer
    this.map.drawLowerImage(this.ctx, cameraPerson);

      // 🔆 Create glowing divs
      createObjectGlow(this.map);

      //Draw Game Objects
      Object.values(this.map.gameObjects)
        .sort((a,b) => a.y - b.y)
        .forEach(object => {
          object.sprite.draw(this.ctx, cameraPerson);
        })

      //Draw Upper layer
      this.map.drawUpperImage(this.ctx, cameraPerson);

      // 🔁 Update glow positions
      updateObjectGlowPositions(this.map, cameraPerson);

      Object.values(this.map.gameObjects)
  .sort((a, b) => a.y - b.y)
  .forEach(object => {
    object.sprite.useGlow = object.glow === true;
    object.sprite.draw(this.ctx, cameraPerson);
  });
  }

  startMap(mapConfig) {
    this.map = new OverworldMap(mapConfig);
    this.map.overworld = this;
    this.map.mountObjects();
  
    this.timeInRoom = 0;
    this.flickerStarted = false;
  
    if (this.killTimer) {
      clearTimeout(this.killTimer);
      this.killTimer = null;
    }
  
    if (this.flickerInterval) {
      clearInterval(this.flickerInterval);
      this.flickerInterval = null;
    }
  
    glow.style.setProperty('--glow-color', 'rgba(255, 255, 255, 0.15)');
  
    if (this.map.startOnLoad) {
      this.map.startCutscene(this.map.startOnLoad.events, {
        flag: this.map.startOnLoad.flag,
      });
    }
  }
  

  bindActionInput() {
    new KeyPressListener("KeyE", () => {
      if (this.map.isJournalOpen) return;
      this.map.checkForActionCutscene();
    });
  }

  bindHeroPositionCheck() {
    document.addEventListener("PersonWalkingComplete", e => {
      if (e.detail.whoId === "hero") {
        this.map.checkForFootstepCutscene();
      }
    });
  }

  init() {
    // Ensure 'TutorialRoom' is the correct map
    const initialMap = window.OverworldMaps.TutorialRoom;
    console.log("Initial Map:", initialMap);
    this.startMap(initialMap);

    this.bindActionInput();
    this.bindHeroPositionCheck();

    this.directionInput = new DirectionInput();
    this.directionInput.init();

    this.startGameLoop();
  }
}
