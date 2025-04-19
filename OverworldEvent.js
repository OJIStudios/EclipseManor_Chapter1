class OverworldEvent {
  constructor({ map, event }) {
    this.map = map;
    this.event = event;
  }

  stand(resolve) {
    const who = this.map.gameObjects[this.event.who];
    who.startBehavior(
      { map: this.map },
      { type: "stand", direction: this.event.direction, time: this.event.time }
    );

    const completeHandler = (e) => {
      if (e.detail.whoId === this.event.who) {
        document.removeEventListener("PersonStandComplete", completeHandler);
        resolve();
      }
    };
    document.addEventListener("PersonStandComplete", completeHandler);
  }

  walk(resolve) {
    const who = this.map.gameObjects[this.event.who];
    who.startBehavior(
      { map: this.map },
      { type: "walk", direction: this.event.direction, retry: true }
    );

    const completeHandler = (e) => {
      if (e.detail.whoId === this.event.who) {
        document.removeEventListener("PersonWalkingComplete", completeHandler);
        resolve();
      }
    };
    document.addEventListener("PersonWalkingComplete", completeHandler);
  }

  textMessage(resolve) {
    if (this.event.faceHero) {
      const obj = this.map.gameObjects[this.event.faceHero];
      obj.direction = utils.oppositeDirection(
        this.map.gameObjects["hero"].direction
      );
    }

    const message = new TextMessage({
      text: this.event.text,
      onComplete: () => resolve(),
    });
    message.init(document.querySelector(".game-container"));
  }

  changeMap(resolve) {
    const sceneTransition = new SceneTransition();
    const changemapSound = new Audio('music/opendoor.mp3');
    changemapSound .volume = 0.5;    // volume from 0.0 to 1.0
    changemapSound .play();
    sceneTransition.init(document.querySelector(".game-container"), () => {
      this.map.overworld.startMap(window.OverworldMaps[this.event.map]);
      resolve();
      sceneTransition.fadeOut();
    });
  }

  // ✅ Remove NPC Immediately
  removeNPC(resolve) {
    const id = this.event.id;
    if (this.map.gameObjects[id]) {
      delete this.map.gameObjects[id]; // Remove NPC from gameObjects
    }
    resolve();
  }

  showItemNotification(resolve) {
    const notificationSound = new Audio('music/notification.mp3');
    notificationSound.volume = 0.5;

    const container = document.querySelector(".game-container");
  
    const notification = document.createElement("div");
    notification.classList.add("item-notification");
    notification.innerHTML = `
      <img src="${this.event.image}" alt="Item Obtained">
      <p>${this.event.text}</p>
    `;
  
    container.appendChild(notification);
  
    // ✅ Immediately resolve so cutscene continues and player can move
    resolve();
  
    notificationSound.play();
    // ✅ Handle fade-out in background (not blocking)
    setTimeout(() => {
      notification.classList.add("fade-out");
      setTimeout(() => {
        notification.remove();
      }, 500);
    }, 3000);
  }
  

  // Show Alert
  showAlert(resolve) {
    const container = document.querySelector(".game-container");

    // Create the Alert element
    const alert = document.createElement("div");
    alert.classList.add("alert");
    alert.innerHTML = `
      <p>${this.event.text}</p>
    `;

    // Append to the container
    container.appendChild(alert);

    // Remove alert after delay
    setTimeout(() => {
      alert.classList.add("fade-out"); // Apply fade-out effect
      setTimeout(() => {
        alert.remove();
        resolve();
      }, 500); // Ensure it disappears after fade-out
    }, 3000); // Show for 3 seconds before fading
  }

  setObjective(resolve) {
    if (this.event.text) {
      setObjective(this.event.text);
    } else {
      setObjective(null); // Hide it if text is empty/null
    }
    resolve();
  }

  setFlag(resolve) {
    playerState.storyFlags[this.event.flag] = true;
    localStorage.setItem("playerFlags", JSON.stringify(playerState.storyFlags));
    resolve();
  }

  showJournal(resolve) {
    const container = document.querySelector(".game-container");
    const openJournal = new Audio('music/openjournal.mp3');
    openJournal .volume = 1;    // volume from 0.0 to 1.0
    openJournal .play();
    
    // Create journal overlay
    const journalOverlay = document.createElement("div");
    journalOverlay.classList.add("journal-overlay");
    
    // Create journal image
    const journalImage = document.createElement("img");
    journalImage.src = this.event.image;
    journalImage.classList.add("journal-image");
    
    journalOverlay.appendChild(journalImage);
    container.appendChild(journalOverlay);
    
    // Store reference to close it later
    this.map.journalOverlay = journalOverlay;
    
    // Don't resolve immediately - we'll keep the cutscene active
    // until the player presses E again
    this.map.isJournalOpen = true;
    
    // Listen for E key to close
    const closeListener = new KeyPressListener("KeyE", () => {
      if (this.map.isJournalOpen) {
        journalOverlay.remove();
        this.map.isJournalOpen = false;
        closeListener.unbind();
        resolve();
      }
    });
  }
  
  showPuzzle(resolve) {
    const overlay = document.createElement("div");
    overlay.classList.add("puzzle-overlay");
    overlay.innerHTML = `
      <iframe src="${this.event.url}" frameborder="0" class="puzzle-frame"></iframe>
      <button class="close-puzzle">Close</button>
    `;
  
    document.body.appendChild(overlay);
  
    const puzzleId = this.event.id || "puzzle_" + Date.now();
  
    function onPuzzleSolved(event) {
      if (event.data.puzzleSolved === true) {
        playerState.tempFlags = playerState.tempFlags || {};
        playerState.tempFlags[puzzleId] = true;
  
        window.removeEventListener("message", onPuzzleSolved);
        overlay.remove();
        resolve(); // ✅ Continue cutscene
      }
    }
  
    window.addEventListener("message", onPuzzleSolved);
  
    // Manual close
    overlay.querySelector(".close-puzzle").addEventListener("click", () => {
      window.removeEventListener("message", onPuzzleSolved);
      overlay.remove();
      resolve(); // ✅ Still resolve, but tempFlags remains false
    });
  }
  
  
  
  conditional(resolve) {
    const isTrue = this.event.condition();
    const events = isTrue ? this.event.then : this.event.else;
  
    const run = async () => {
      for (let e of events) {
        const eventHandler = new OverworldEvent({
          map: this.map,
          event: e,
        });
        await eventHandler.init();
      }
      resolve();
    };
  
    run();
  }

  goToPage(resolve) {
    // Optionally fade out first
    const sceneTransition = new SceneTransition();
    sceneTransition.init(document.querySelector(".game-container"), () => {
      window.location.href = this.event.url;
      resolve(); // Not really necessary since page is changing, but good practice
    });
  }
  
  
  init() {
    return new Promise((resolve) => {
      const required = this.event.required;
  
      if (required) {
        const isNegated = required.startsWith("!");
        const flag = isNegated ? required.slice(1) : required;
        const hasFlag = !!playerState.storyFlags[flag];
  
        // If we don't meet the requirement, skip this event
        if ((isNegated && hasFlag) || (!isNegated && !hasFlag)) {
          return resolve(); // skip
        }
      }
  
      this[this.event.type](resolve);
    });
  }
  
}
