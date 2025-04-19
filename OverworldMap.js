// Initialize player flags if they don't exist
window.playerFlags = window.playerFlags || {};

window.playerState = window.playerState || {
  storyFlags: {}
};


function setObjective(text) {
  const box = document.getElementById("objectiveBox");
  const textElem = document.getElementById("objectiveText");

  if (text) {
    textElem.textContent = `Objective: ${text}`;
    box.classList.remove("hidden");
  } else {
    box.classList.add("hidden");
  }
}

function showInteractionPrompt() {
  document.getElementById("interactionPrompt").classList.remove("hidden");
}

function hideInteractionPrompt() {
  document.getElementById("interactionPrompt").classList.add("hidden");
}

setObjective(null);

class OverworldMap {
  constructor(config) {
    this.overworld = null;
    this.gameObjects = config.gameObjects;
    this.cutsceneSpaces = config.cutsceneSpaces || {};
    this.walls = config.walls || {};

    this.lowerImage = new Image();
    this.lowerImage.src = config.lowerSrc;

    this.upperImage = new Image();
    this.upperImage.src = config.upperSrc;

    this.isCutscenePlaying = false;

    this.startOnLoad = config.startOnLoad || null; // ✅ Add this line

    this.isJournalOpen = false;
    this.journalOverlay = null;
  }


  drawLowerImage(ctx, cameraPerson) {
    ctx.drawImage(
      this.lowerImage, 
      utils.withGrid(10.5) - cameraPerson.x, 
      utils.withGrid(6) - cameraPerson.y
      )
  }

  drawUpperImage(ctx, cameraPerson) {
    ctx.drawImage(
      this.upperImage, 
      utils.withGrid(10.5) - cameraPerson.x, 
      utils.withGrid(6) - cameraPerson.y
    )
  } 

  isSpaceTaken(currentX, currentY, direction) {
    const {x,y} = utils.nextPosition(currentX, currentY, direction);
    return this.walls[`${x},${y}`] || false;
  }

  mountObjects() {
    Object.keys(this.gameObjects).forEach(key => {

      let object = this.gameObjects[key];
      object.id = key;

      //TODO: determine if this object should actually mount
      object.mount(this);

    })
  }

  async startCutscene(events, options = {}) {
    if (this.isCutscenePlaying) {
      console.log("Cutscene already playing. Aborting.");
      return;
    }
  
    if (options.flag && playerState.storyFlags[options.flag]) {
      console.log(`Cutscene with flag "${options.flag}" already seen. Skipping.`);
      return;
    }
  
    this.isCutscenePlaying = true;
    console.log("Starting cutscene:", events);
  
    for (let event of events) {
      const eventHandler = new OverworldEvent({
        event,
        map: this,
      });
      await eventHandler.init();  // <-- if this never resolves, game freezes
    }
  
    this.isCutscenePlaying = false;
    console.log("Cutscene ended");
  
    if (options.flag) {
      playerState.storyFlags[options.flag] = true;
    }
  }
  
  

  checkForActionCutscene() {
    const hero = this.gameObjects["hero"];
    const nextCoords = utils.nextPosition(hero.x, hero.y, hero.direction);
    const match = Object.values(this.gameObjects).find(object => {
      return `${object.x},${object.y}` === `${nextCoords.x},${nextCoords.y}`
    });
    if (!this.isCutscenePlaying && match && match.talking.length) {
      this.startCutscene(match.talking[0].events)
    }
  }

  checkForFootstepCutscene() {
    const hero = this.gameObjects["hero"];
    const match = this.cutsceneSpaces[`${hero.x},${hero.y}`];
    if (!this.isCutscenePlaying && match) {
      this.startCutscene(match[0].events, { 
        flag: match[0].flag // Pass the flag through
      });
    }
  }

  addWall(x,y) {
    this.walls[`${x},${y}`] = true;
  }
  removeWall(x,y) {
    delete this.walls[`${x},${y}`]
  }
  moveWall(wasX, wasY, direction) {
    this.removeWall(wasX, wasY);
    const {x,y} = utils.nextPosition(wasX, wasY, direction);
    this.addWall(x,y);
  }

  checkForMovementStart(hero) {
    const match = this.cutsceneSpaces[`${hero.x},${hero.y}:move`];
    if (!this.isCutscenePlaying && match) {
      this.startCutscene(match[0].events, {
        flag: match[0].flag
      });
    }
  }
}

window.OverworldMaps = {
  TutorialRoom: {
    id: "TutorialRoom",
    lowerSrc: "images/maps/GreenRoomLower.png",
    upperSrc: "images/maps/GreenRoomUpper.png",
    gameObjects: {
      hero: new Person({
        id: "hero",
  src: "images/characters/people/hero.png",
  srcBlue: "images/characters/people/hero_blue.png",
        isPlayerControlled: true,
        x: utils.withGrid(5),
        y: utils.withGrid(5),
      }),
      
      skeleton_key: new Person({
        x: utils.withGrid(9),
        y: utils.withGrid(9),
        src: "images/icons/skeleton_key.png",
        glow: true, // <--- This enables the glow logic
        talking: [
          {
            events: [
              { type: "removeNPC", id: "skeleton_key" }, // NPC disappears immediately
              { type: "setObjective", text: null },
              { type: "showItemNotification", image: "images/popup/ArtRoom_key.png", text: "Art Room Key x 1" },
              {
                type: "setFlag",
                flag: "hasSkeletonKey"
              },              
              { type: "setObjective", text: "Open the door" },
              { type: "textMessage", text: "Face the door (brown rectangle) and press [E] to open" },
            ]
          }
        ]
      }),

      door: new Person({
        x: utils.withGrid(1),
        y: utils.withGrid(7),
        src: "images/icons/door.png",  
        talking: [
          {
            events: [
              {
                type: "textMessage",
                text: "It's locked. Key required.",
                required: "!hasSkeletonKey"
              },
              {
                type: "changeMap",
                map: "MainHall",
                required: "hasSkeletonKey"
              },
              { type: "setObjective", 
                text: "Find the correct room. (Tip: its at the top right)" ,
                required: "hasSkeletonKey"
              },
            ]
          }
        ],
      }),
      
    },

    walls: {
      [utils.asGridCoord(5,2)] : true,
      [utils.asGridCoord(6,2)] : true,
      [utils.asGridCoord(7,2)] : true,
      [utils.asGridCoord(8,2)] : true,
      [utils.asGridCoord(9,3)] : true,
      [utils.asGridCoord(10,4)] : true,
      [utils.asGridCoord(10,5)] : true,
      [utils.asGridCoord(11,6)] : true,
      [utils.asGridCoord(11,7)] : true,
      [utils.asGridCoord(11,8)] : true,
      [utils.asGridCoord(11,9)] : true,
      [utils.asGridCoord(11,10)] : true,
      [utils.asGridCoord(11,11)] : true,
      [utils.asGridCoord(10,12)] : true,
      [utils.asGridCoord(9,12)] : true,
      [utils.asGridCoord(8,12)] : true,
      [utils.asGridCoord(7,12)] : true,
      [utils.asGridCoord(6,12)] : true,
      [utils.asGridCoord(5,12)] : true,
      [utils.asGridCoord(4,12)] : true,
      [utils.asGridCoord(3,12)] : true,
      [utils.asGridCoord(2,12)] : true,
      [utils.asGridCoord(1,11)] : true,
      [utils.asGridCoord(1,10)] : true,
      [utils.asGridCoord(1,9)] : true,
      [utils.asGridCoord(1,8)] : true,
      [utils.asGridCoord(1,7)] : true,
      [utils.asGridCoord(1,6)] : true,
      [utils.asGridCoord(2,5)] : true,
      [utils.asGridCoord(3,4)] : true,
      [utils.asGridCoord(4,3)] : true,
      [utils.asGridCoord(6,7)] : true,
      [utils.asGridCoord(4,10)] : true,
    },

    
    startOnLoad: {
      flag: "greenRoomIntroPlayed",
      events: [
        { type: "textMessage", text: "[E] to continue texts" },
        { type: "textMessage", text: "[WASD/Arrows] to move" },
        { type: "textMessage", text: "[E] to interact (Keys, Journals, Items, etc.)" },
        { type: "textMessage", text: "[F] to toggle lamp" },
        { type: "textMessage", text: "Light detects entities, Dark shows items" },
        { type: "textMessage", text: "If you stay in a room (including this room) for too long, something will come for you..." },
        { type: "setObjective", text: "Find the Skeleton Key" }
      ]
    },
    

  },

  GreenRoom: {
    lowerSrc: "images/maps/NewGreenRoomLower.png",
    upperSrc: "images/maps/NewGreenRoomUpper.png",
    gameObjects: {
      hero: new Person({
        isPlayerControlled: true,
        x: utils.withGrid(2),
        y: utils.withGrid(7),
      }),

      journal: new Person({
        x: utils.withGrid(4),
        y: utils.withGrid(10),
        src: "images/icons/journal.png",
        talking: [
          {
            events: [
              { type: "removeNPC", id: "journal" },
              { 
                type: "showJournal", 
                image: "images/journals/Journal1.png" // Path to your journal image
              }
            ]
          }
        ]
      }),

      door: new Person({
        x: utils.withGrid(1),
        y: utils.withGrid(7),
        src: "images/icons/door.png",  
        talking: [
          {
            events: [
              {
                type: "changeMap",
                map: "MainHall",
              }
            ]
          }
        ],
        customText: "[E] Unlock Door",
      }),
      
    },

    walls: {
      [utils.asGridCoord(5,2)] : true,
      [utils.asGridCoord(6,2)] : true,
      [utils.asGridCoord(7,2)] : true,
      [utils.asGridCoord(8,2)] : true,
      [utils.asGridCoord(9,3)] : true,
      [utils.asGridCoord(10,4)] : true,
      [utils.asGridCoord(10,5)] : true,
      [utils.asGridCoord(11,6)] : true,
      [utils.asGridCoord(11,7)] : true,
      [utils.asGridCoord(11,8)] : true,
      [utils.asGridCoord(11,9)] : true,
      [utils.asGridCoord(11,10)] : true,
      [utils.asGridCoord(11,11)] : true,
      [utils.asGridCoord(10,12)] : true,
      [utils.asGridCoord(9,12)] : true,
      [utils.asGridCoord(8,12)] : true,
      [utils.asGridCoord(7,12)] : true,
      [utils.asGridCoord(6,12)] : true,
      [utils.asGridCoord(5,12)] : true,
      [utils.asGridCoord(4,12)] : true,
      [utils.asGridCoord(3,12)] : true,
      [utils.asGridCoord(2,12)] : true,
      [utils.asGridCoord(1,11)] : true,
      [utils.asGridCoord(1,10)] : true,
      [utils.asGridCoord(1,9)] : true,
      [utils.asGridCoord(1,8)] : true,
      [utils.asGridCoord(1,7)] : true,
      [utils.asGridCoord(1,6)] : true,
      [utils.asGridCoord(2,5)] : true,
      [utils.asGridCoord(3,4)] : true,
      [utils.asGridCoord(4,3)] : true,
      [utils.asGridCoord(6,7)] : true,
      [utils.asGridCoord(4,10)] : true,
      [utils.asGridCoord(9,9)] : true,
    },
  
  },

  MainHall: {
    lowerSrc: "images/maps/MainHallLower.png",
    upperSrc: "images/maps/MainHallUpper.png",
    gameObjects: {
      hero: new Person({
        isPlayerControlled: true,
        x: utils.withGrid(10),
        y: utils.withGrid(5),
      }),

      journal2: new Person({
        x: utils.withGrid(17),
        y: utils.withGrid(25),
        src: "images/icons/journal.png",
        talking: [
          {
            events: [
              { type: "removeNPC", id: "journal2" },
              { 
                type: "showJournal", 
                image: "images/journals/Journal2.png"
              }
            ]
          }
        ]
      }),

      basement: new Person({
        x: utils.withGrid(15),
        y: utils.withGrid(8),
        src: "images/icons/door.png",  
        talking: [
          {
            events: [
              {
                type: "textMessage",
                text: "It's locked. Key required.",
                required: "!hasBasementKey"
              },
              {
                type: "goToPage",
                url: "endcredits.html",
                required: "hasBasementKey"
              }
              
            ]
          }
        ],
        customText: "[E] Unlock Door",
      }),

      door: new Person({
        x: utils.withGrid(11),
        y: utils.withGrid(5),
        src: "images/icons/door.png",  
        talking: [
          {
            events: [
              { type: "changeMap", map:"GreenRoom" },
            ]
          }
        ],
        customText: "[E] Unlock Door",
      }),

      door2: new Person({
        x: utils.withGrid(3),
        y: utils.withGrid(5),
        src: "images/icons/door.png",  
        talking: [
          {
            events: [
              {
                type: "textMessage",
                text: "It's locked. Key required.",
                required: "!hasStorageKey"
              },
              {
                type: "changeMap",
                map: "Storage",
                required: "hasStorageKey"
              }
            ]
          }
        ],
        customText: "[E] Unlock Door",
      }),

      door3: new Person({
        x: utils.withGrid(3),
        y: utils.withGrid(13),
        src: "images/icons/door.png",  
        talking: [
          {
            events: [
              {
                type: "textMessage",
                text: "It's locked. Key required.",
                required: "!hasKitchenKey"
              },
              {
                type: "changeMap",
                map: "Kitchen",
                required: "hasKitchenKey"
              }
            ]
          }
        ],
        customText: "[E] Unlock Door",
      }),

      door4: new Person({
        x: utils.withGrid(5),
        y: utils.withGrid(15),
        src: "images/icons/door.png",  
        talking: [
          {
            events: [
              {
                type: "textMessage",
                text: "It's locked. Key required.",
                required: "!hasDiningRoomKey"
              },
              {
                type: "changeMap",
                map: "DiningRoom",
                required: "hasDiningRoomKey"
              }
            ]
          }
        ],
        customText: "[E] Unlock Door",
      }),

      door5: new Person({
        x: utils.withGrid(23),
        y: utils.withGrid(7),
        src: "images/icons/door.png",  
        talking: [
          {
            events: [
              { type: "changeMap", map:"ArtRoom" },
            ]
          }
        ],
        customText: "[E] Unlock Door",
      }),

      door6: new Person({
        x: utils.withGrid(25),
        y: utils.withGrid(14),
        src: "images/icons/door.png",  
        talking: [
          {
            events: [
              {
                type: "textMessage",
                text: "It's locked. Key required.",
                required: "!hasDisplayRoomKey"
              },
              {
                type: "changeMap",
                map: "DisplayRoom",
                required: "hasDisplayRoomKey"
              }
            ]
          }
        ],
        customText: "[E] Unlock Door",
      }),

      door7: new Person({
        x: utils.withGrid(22),
        y: utils.withGrid(16),
        src: "images/icons/door.png",  
        talking: [
          {
            events: [
              {
                type: "textMessage",
                text: "It's locked. Key required.",
                required: "!hasLivingRoomKey"
              },
              {
                type: "changeMap",
                map: "LivingRoom",
                required: "hasLivingRoomKey"
              }
            ]
          }
        ],
        customText: "[E] Unlock Door",
      }),

      door8: new Person({
        x: utils.withGrid(20),
        y: utils.withGrid(19),
        src: "images/icons/door.png",  
        talking: [
          {
            events: [
              { type: "changeMap", map:"DressingRoom" },
            ]
          }
        ],
        customText: "[E] Unlock Door",
      }),

      door9: new Person({
        x: utils.withGrid(10),
        y: utils.withGrid(19),
        src: "images/icons/door.png",  
        talking: [
          {
            events: [
              { type: "changeMap", map:"Toilet" },
            ]
          }
        ],
        customText: "[E] Unlock Door",
      })
    },
    
    walls: {
      [utils.asGridCoord(3,3)] : true,
      [utils.asGridCoord(4,3)] : true,
      [utils.asGridCoord(5,3)] : true,
      [utils.asGridCoord(6,3)] : true,
      [utils.asGridCoord(7,3)] : true,
      [utils.asGridCoord(8,3)] : true,
      [utils.asGridCoord(9,3)] : true,
      [utils.asGridCoord(10,3)] : true,
      [utils.asGridCoord(11,4)] : true,
      [utils.asGridCoord(11,5)] : true,
      [utils.asGridCoord(10,6)] : true,
      [utils.asGridCoord(9,7)] : true,
      [utils.asGridCoord(3,4)] : true,
      [utils.asGridCoord(3,5)] : true,
      [utils.asGridCoord(3,6)] : true,
      [utils.asGridCoord(3,7)] : true,
      [utils.asGridCoord(3,8)] : true,
      [utils.asGridCoord(3,9)] : true,
      [utils.asGridCoord(3,10)] : true,
      [utils.asGridCoord(3,11)] : true,
      [utils.asGridCoord(3,12)] : true,
      [utils.asGridCoord(3,13)] : true,
      [utils.asGridCoord(3,14)] : true,
      [utils.asGridCoord(4,15)] : true,
      [utils.asGridCoord(5,15)] : true,
      [utils.asGridCoord(6,15)] : true,
      [utils.asGridCoord(7,15)] : true,
      [utils.asGridCoord(8,15)] : true,
      [utils.asGridCoord(9,8)] : true,
      [utils.asGridCoord(9,9)] : true,
      [utils.asGridCoord(9,10)] : true,
      [utils.asGridCoord(9,11)] : true,
      [utils.asGridCoord(10,7)] : true,
      [utils.asGridCoord(10,9)] : true,
      [utils.asGridCoord(11,7)] : true,
      [utils.asGridCoord(11,9)] : true,
      [utils.asGridCoord(12,7)] : true,
      [utils.asGridCoord(12,8)] : true,
      [utils.asGridCoord(12,9)] : true,
      [utils.asGridCoord(13,7)] : true,
      [utils.asGridCoord(14,8)] : true,
      [utils.asGridCoord(15,8)] : true,
      [utils.asGridCoord(16,8)] : true,
      [utils.asGridCoord(17,7)] : true,
      [utils.asGridCoord(18,8)] : true,
      [utils.asGridCoord(18,9)] : true,
      [utils.asGridCoord(19,9)] : true,
      [utils.asGridCoord(20,9)] : true,
      [utils.asGridCoord(21,8)] : true,
      [utils.asGridCoord(21,9)] : true,
      [utils.asGridCoord(21,10)] : true,
      [utils.asGridCoord(21,11)] : true,
      [utils.asGridCoord(22,7)] : true,
      [utils.asGridCoord(23,7)] : true,
      [utils.asGridCoord(24,7)] : true,
      [utils.asGridCoord(25,8)] : true,
      [utils.asGridCoord(25,9)] : true,
      [utils.asGridCoord(25,10)] : true,
      [utils.asGridCoord(25,11)] : true,
      [utils.asGridCoord(25,12)] : true,
      [utils.asGridCoord(25,13)] : true,
      [utils.asGridCoord(25,14)] : true,
      [utils.asGridCoord(24,15)] : true,
      [utils.asGridCoord(23,15)] : true,
      [utils.asGridCoord(22,15)] : true,
      [utils.asGridCoord(22,16)] : true,
      [utils.asGridCoord(22,17)] : true,
      [utils.asGridCoord(22,18)] : true,
      [utils.asGridCoord(21,19)] : true,
      [utils.asGridCoord(20,19)] : true,
      [utils.asGridCoord(19,19)] : true,
      [utils.asGridCoord(18,19)] : true,
      [utils.asGridCoord(18,20)] : true,
      [utils.asGridCoord(18,21)] : true,
      [utils.asGridCoord(18,22)] : true,
      [utils.asGridCoord(18,23)] : true,
      [utils.asGridCoord(18,24)] : true,
      [utils.asGridCoord(18,25)] : true,
      [utils.asGridCoord(17,26)] : true,
      [utils.asGridCoord(16,26)] : true,
      [utils.asGridCoord(15,26)] : true,
      [utils.asGridCoord(14,26)] : true,
      [utils.asGridCoord(13,26)] : true,
      [utils.asGridCoord(12,25)] : true,
      [utils.asGridCoord(12,24)] : true,
      [utils.asGridCoord(12,23)] : true,
      [utils.asGridCoord(12,22)] : true,
      [utils.asGridCoord(12,21)] : true,
      [utils.asGridCoord(12,20)] : true,
      [utils.asGridCoord(12,19)] : true,
      [utils.asGridCoord(11,19)] : true,
      [utils.asGridCoord(10,19)] : true,
      [utils.asGridCoord(9,19)] : true,
      [utils.asGridCoord(8,18)] : true,
      [utils.asGridCoord(8,17)] : true,
      [utils.asGridCoord(8,16)] : true,
      //Tables
      [utils.asGridCoord(8,10)] : true,
      [utils.asGridCoord(8,11)] : true,
      [utils.asGridCoord(4,7)] : true,
      [utils.asGridCoord(4,8)] : true,
      [utils.asGridCoord(4,9)] : true,
      [utils.asGridCoord(4,10)] : true,
      [utils.asGridCoord(11,18)] : true,
      [utils.asGridCoord(19,18)] : true,
    },
    
  },
  
  ArtRoom: {
    lowerSrc: "images/maps/ArtRoomLower.png",
    upperSrc: "images/maps/ArtRoomUpper.png",
    gameObjects: {
      hero: new Person({
        isPlayerControlled: true,
        x: utils.withGrid(5),
        y: utils.withGrid(10),
      }),

      artroom_puzzle: new Person({
        x: utils.withGrid(3),
        y: utils.withGrid(3),
        src: "images/icons/dummy.png",  
        talking: [
          {
            events: [
              { type: "showPuzzle", url: " puzzle1.html", id: "puzzle1" },
              {
                type: "conditional",
                condition: () => !!playerState.tempFlags?.puzzle1,
                then: [
                  { type: "setFlag", flag: "solvedPuzzle1" },
                  { type: "removeNPC", id:"artroom_puzzle"},
                  { type: "setObjective", text: null },
                  { type: "showItemNotification", image: "images/popup/DiningRoom_key.png", text: "Dining Room Key x 1" },
                  {
                    type: "setFlag",
                    flag: "hasDiningRoomKey"
                  },  
                  { type: "setObjective", text: "Find the Dining Room (Tip: the symbol on the key indicates the room" },
                ],
                else: [
                ]
              }
            ]
            
          }
        ],
        customText: "[E] Solve Puzzle",
      }),

      journal3: new Person({
        x: utils.withGrid(3),
        y: utils.withGrid(7),
        src: "images/icons/journal.png",
        talking: [
          {
            events: [
              { type: "removeNPC", id: "journal3" },
              { 
                type: "showJournal", 
                image: "images/journals/Journal3.png"
              }
            ]
          }
        ]
      }),

      door: new Person({
        x: utils.withGrid(5),
        y: utils.withGrid(11),
        src: "images/icons/door.png",  
        talking: [
          {
            events: [
              { type: "changeMap", map:"MainHall" },
            ]
          }
        ],
        customText: "[E] Unlock Door",
      })
    },

    walls: {
      [utils.asGridCoord(3,11)] : true,
      [utils.asGridCoord(4,11)] : true,
      [utils.asGridCoord(5,11)] : true,
      [utils.asGridCoord(6,11)] : true,
      [utils.asGridCoord(7,11)] : true,
      [utils.asGridCoord(8,10)] : true,
      [utils.asGridCoord(8,9)] : true,
      [utils.asGridCoord(8,8)] : true,
      [utils.asGridCoord(8,7)] : true,
      [utils.asGridCoord(8,6)] : true,
      [utils.asGridCoord(8,5)] : true,
      [utils.asGridCoord(8,4)] : true,
      [utils.asGridCoord(8,3)] : true,
      [utils.asGridCoord(7,2)] : true,
      [utils.asGridCoord(6,1)] : true,
      [utils.asGridCoord(5,1)] : true,
      [utils.asGridCoord(4,1)] : true,
      [utils.asGridCoord(3,1)] : true,
      [utils.asGridCoord(2,2)] : true,
      [utils.asGridCoord(3,3)] : true,
      [utils.asGridCoord(2,4)] : true,
      [utils.asGridCoord(2,5)] : true,
      [utils.asGridCoord(2,6)] : true,
      [utils.asGridCoord(3,7)] : true,
      [utils.asGridCoord(3,8)] : true,
      [utils.asGridCoord(2,9)] : true,
      [utils.asGridCoord(2,10)] : true,
    },

    startOnLoad: {
      flag: "artRoomIntroPlayed",
      events: [
        { type: "textMessage", text: "To solve puzzles, use your cursor." },
        { type: "setObjective", text: "Solve the puzzle. (Tip: interact with all objects)" }
      ]
    },
  },

  DisplayRoom: {
    lowerSrc: "images/maps/DisplayRoomLower.png",
    upperSrc: "images/maps/DisplayRoomUpper.png",
    gameObjects: {
      hero: new Person({
        isPlayerControlled: true,
        x: utils.withGrid(1),
        y: utils.withGrid(11),
      }),

      hammer: new Person({
        x: utils.withGrid(1),
        y: utils.withGrid(7),
        src: "images/icons/hammer.png",  
        talking: [
          {
            events: [
              { type: "removeNPC", id: "hammer" },
              { type: "setObjective", text: null },
              { type: "showItemNotification", image: "images/popup/hammer_popup.png", text: "Hammer x 1" },
              {
                type: "setFlag",
                flag: "hasHammer"
              },              
              { type: "setObjective", text: "Break the vases" },
              { type: "textMessage", text: "Press [E] to use tools" }, 
            ]
          }
        ],
        customText: "[E] Pick up Tool",
      }),

      vase1: new Person({
        x: utils.withGrid(6),
        y: utils.withGrid(6),
        src: "images/icons/vase.png",  
        talking: [
          {
            events: [
              {
                type: "textMessage",
                text: "A tool is required.",
                required: "!hasHammer"
              },
              { type: "removeNPC", id: "vase1", required: "hasHammer"},
              { type: "setObjective", text: null ,required: "hasHammer"},
              { type: "showItemNotification", image: "images/popup/Kitchen_key.png", text: "Kitchen Key x 1" ,required: "hasHammer"},
              {
                type: "setFlag",
                flag: "hasKitchenKey"
                ,required: "hasHammer"
              },              
              { type: "setObjective", text: "Find the Kitchen" , required: "hasHammer"},
            ]
          }
        ],
        customText: "[E] Break Vase",
      }),

      vase2: new Person({
        x: utils.withGrid(4),
        y: utils.withGrid(9),
        src: "images/icons/vase.png",  
        talking: [
          {
            events: [
              {
                type: "textMessage",
                text: "A tool is required.",
                required: "!hasHammer"
              },
              { type: "removeNPC", id: "vase2", required: "hasHammer"},
              { type: "showItemNotification", image: "images/popup/skeleton_key_popup.png", text: "Secret Key x 1" ,required: "hasHammer"},
              {
                type: "setFlag",
                flag: "hasEasterEgg2Key"
                ,required: "hasHammer"
              },
            ]
          }
        ],
        customText: "[E] Break Vase",
      }),
      
      door: new Person({
        x: utils.withGrid(0),
        y: utils.withGrid(11),
        src: "images/icons/door.png",  
        talking: [
          {
            events: [
              { type: "changeMap", map:"MainHall" },
            ]
          }
        ],
        customText: "[E] Unlock Door",
      })
    },

    walls: {
      [utils.asGridCoord(0,11)] : true,
      [utils.asGridCoord(1,12)] : true,
      [utils.asGridCoord(2,12)] : true,
      [utils.asGridCoord(3,12)] : true,
      [utils.asGridCoord(4,12)] : true,
      [utils.asGridCoord(5,12)] : true,
      [utils.asGridCoord(6,12)] : true,
      [utils.asGridCoord(7,12)] : true,
      [utils.asGridCoord(8,11)] : true,
      [utils.asGridCoord(8,10)] : true,
      [utils.asGridCoord(8,8)] : true,
      [utils.asGridCoord(8,9)] : true,
      [utils.asGridCoord(9,8)] : true,
      [utils.asGridCoord(9,7)] : true,
      [utils.asGridCoord(9,6)] : true,
      [utils.asGridCoord(9,5)] : true,
      [utils.asGridCoord(9,4)] : true,
      [utils.asGridCoord(9,3)] : true,
      [utils.asGridCoord(9,2)] : true,
      [utils.asGridCoord(8,1)] : true,
      [utils.asGridCoord(7,1)] : true,
      [utils.asGridCoord(6,1)] : true,
      [utils.asGridCoord(5,1)] : true,
      [utils.asGridCoord(4,1)] : true,
      [utils.asGridCoord(3,2)] : true,
      [utils.asGridCoord(3,3)] : true,
      [utils.asGridCoord(2,3)] : true,
      [utils.asGridCoord(1,3)] : true,
      [utils.asGridCoord(0,4)] : true,
      [utils.asGridCoord(0,5)] : true,
      [utils.asGridCoord(0,6)] : true,
      [utils.asGridCoord(0,7)] : true,
      [utils.asGridCoord(0,8)] : true,
      [utils.asGridCoord(0,9)] : true,
      [utils.asGridCoord(0,10)] : true,
      [utils.asGridCoord(4,9)] : true,
      [utils.asGridCoord(6,6)] : true,
      [utils.asGridCoord(6,3)] : true,
    },

    startOnLoad: {
      flag: "displayRoomIntroPlayed",
      events: [
        { type: "setObjective", text: "Find a tool" }
      ]
    },
  },

  LivingRoom: {
    lowerSrc: "images/maps/LivingRoomLower.png",
    upperSrc: "images/maps/LivingRoomUpper.png",
    gameObjects: {
      hero: new Person({
        isPlayerControlled: true,
        x: utils.withGrid(1),
        y: utils.withGrid(5),
      }),

      livingroom_puzzle: new Person({
        x: utils.withGrid(1),
        y: utils.withGrid(9),
        src: "images/icons/dummy.png",  
        talking: [
          {
            events: [
              { type: "showPuzzle", url: " puzzle4.html", id: "puzzle4" },
              {
                type: "conditional",
                condition: () => !!playerState.tempFlags?.puzzle4,
                then: [
                  { type: "setFlag", flag: "solvedPuzzle4" },
                  { type: "removeNPC", id:"livingroom_puzzle"},
                  { type: "setObjective", text: null },
                  { type: "showItemNotification", image: "images/popup/skeleton_key_popup.png", text: "Basement Key x 1" },
                  {
                    type: "setFlag",
                    flag: "hasBasementKey"
                  },  
                  { type: "setObjective", text: "Escape (Tip: top center of the hall)" },
                ],
                else: [
                ]
              }
            ]
            
          }
        ],
        customText: "[E] Solve Puzzle",
      }),

      journal4: new Person({
        x: utils.withGrid(7),
        y: utils.withGrid(4),
        src: "images/icons/journal.png",
        talking: [
          {
            events: [
              { type: "removeNPC", id: "journal4" },
              { 
                type: "showJournal", 
                image: "images/journals/Journal4.png"
              }
            ]
          }
        ]
      }),

      door: new Person({
        x: utils.withGrid(0),
        y: utils.withGrid(5),
        src: "images/icons/door.png",  
        talking: [
          {
            events: [
              { type: "changeMap", map:"MainHall" },
            ]
          }
        ],
        customText: "[E] Unlock Door",
      })
    },

    walls: {
      [utils.asGridCoord(0,5)] : true,
      [utils.asGridCoord(0,6)] : true,
      [utils.asGridCoord(0,7)] : true,
      [utils.asGridCoord(0,8)] : true,
      [utils.asGridCoord(1,9)] : true,
      [utils.asGridCoord(0,10)] : true,
      [utils.asGridCoord(1,11)] : true,
      [utils.asGridCoord(2,11)] : true,
      [utils.asGridCoord(3,11)] : true,
      [utils.asGridCoord(4,11)] : true,
      [utils.asGridCoord(5,11)] : true,
      [utils.asGridCoord(6,11)] : true,
      [utils.asGridCoord(7,11)] : true,
      [utils.asGridCoord(8,10)] : true,
      [utils.asGridCoord(9,11)] : true,
      [utils.asGridCoord(10,10)] : true,
      [utils.asGridCoord(11,9)] : true,
      [utils.asGridCoord(12,8)] : true,
      [utils.asGridCoord(12,7)] : true,
      [utils.asGridCoord(12,6)] : true,
      [utils.asGridCoord(12,5)] : true,
      [utils.asGridCoord(12,4)] : true,
      [utils.asGridCoord(12,3)] : true,
      [utils.asGridCoord(11,2)] : true,
      [utils.asGridCoord(10,2)] : true,
      [utils.asGridCoord(9,2)] : true,
      [utils.asGridCoord(8,2)] : true,
      [utils.asGridCoord(7,2)] : true,
      [utils.asGridCoord(6,2)] : true,
      [utils.asGridCoord(5,2)] : true,
      [utils.asGridCoord(4,2)] : true,
      [utils.asGridCoord(3,2)] : true,
      [utils.asGridCoord(2,2)] : true,
      [utils.asGridCoord(1,2)] : true,
      [utils.asGridCoord(0,3)] : true,
      [utils.asGridCoord(0,4)] : true,
      [utils.asGridCoord(5,4)] : true,
      [utils.asGridCoord(6,4)] : true,
      [utils.asGridCoord(7,4)] : true,
      [utils.asGridCoord(8,4)] : true,
    },

    startOnLoad: {
      flag: "livingRoomIntroPlayed",
      events: [
        { type: "setObjective", text: "Solve the puzzle." }
      ]
    },
  },

  DressingRoom: {
    lowerSrc: "images/maps/DressingRoomLower.png",
    upperSrc: "images/maps/DressingRoomUpper.png",
    gameObjects: {
      hero: new Person({
        isPlayerControlled: true,
        x: utils.withGrid(5),
        y: utils.withGrid(3),
      }),

      
      easter_egg1: new Person({
        x: utils.withGrid(6),
        y: utils.withGrid(5),
        src: "images/icons/dummy.png",  
        talking: [
          {
            events: [
              {
                type: "textMessage",
                text: "You need something.",
                required: "!hasEasterEgg1Key"
              },
              { type: "removeNPC", id: "easter_egg1", required: "hasEasterEgg1Key"},
              { 
                type: "showJournal", 
                image: "images/easteregg/EasterEgg1.png",
                required: "hasEasterEgg1Key"
              }
            ]
          }
        ],
        customText: "[E] ???",
      }),

      door: new Person({
        x: utils.withGrid(5),
        y: utils.withGrid(2),
        src: "images/icons/door.png",  
        talking: [
          {
            events: [
              { type: "changeMap", map:"MainHall" },
            ]
          }
        ],
        customText: "[E] Unlock Door",
      })
    },

    walls: {
      [utils.asGridCoord(5,2)] : true,
      [utils.asGridCoord(4,2)] : true,
      [utils.asGridCoord(3,2)] : true,
      [utils.asGridCoord(2,3)] : true,
      [utils.asGridCoord(2,4)] : true,
      [utils.asGridCoord(2,5)] : true,
      [utils.asGridCoord(2,6)] : true,
      [utils.asGridCoord(1,7)] : true,
      [utils.asGridCoord(2,8)] : true,
      [utils.asGridCoord(3,8)] : true,
      [utils.asGridCoord(4,8)] : true,
      [utils.asGridCoord(5,8)] : true,
      [utils.asGridCoord(6,7)] : true,
      [utils.asGridCoord(7,6)] : true,
      [utils.asGridCoord(6,5)] : true,
      [utils.asGridCoord(7,4)] : true,
      [utils.asGridCoord(7,3)] : true,
      [utils.asGridCoord(6,2)] : true,
    },
  },

  Toilet: {
    lowerSrc: "images/maps/ToiletLower.png",
    upperSrc: "images/maps/ToiletUpper.png",
    gameObjects: {
      hero: new Person({
        isPlayerControlled: true,
        x: utils.withGrid(4),
        y: utils.withGrid(3),
      }),

      door: new Person({
        x: utils.withGrid(4),
        y: utils.withGrid(2),
        src: "images/icons/door.png",  
        talking: [
          {
            events: [
              { type: "changeMap", map:"MainHall" },
            ]
          }
        ],
        customText: "[E] Unlock Door",
      }),

      easter_egg3: new Person({
        x: utils.withGrid(7),
        y: utils.withGrid(7),
        src: "images/icons/dummy.png",
        talking: [
          {
            events: [
              { type: "removeNPC", id: "easter_egg3" },
              {
                type: "textMessage",
                text: "SKIBIDIII!?!?!?",
              }, 
            ]
          }
        ]
      }),
    },

    walls: {
      [utils.asGridCoord(4,2)] : true,
      [utils.asGridCoord(3,2)] : true,
      [utils.asGridCoord(2,3)] : true,
      [utils.asGridCoord(2,4)] : true,
      [utils.asGridCoord(2,5)] : true,
      [utils.asGridCoord(2,6)] : true,
      [utils.asGridCoord(3,7)] : true,
      [utils.asGridCoord(4,8)] : true,
      [utils.asGridCoord(5,9)] : true,
      [utils.asGridCoord(6,9)] : true,
      [utils.asGridCoord(7,7)] : true,
      [utils.asGridCoord(7,6)] : true,
      [utils.asGridCoord(7,5)] : true,
      [utils.asGridCoord(7,3)] : true,
      [utils.asGridCoord(6,2)] : true,
      [utils.asGridCoord(5,2)] : true,
      [utils.asGridCoord(7,9)] : true,
      [utils.asGridCoord(8,8)] : true,
      [utils.asGridCoord(8,4)] : true,
    },
  },

  DiningRoom: {
    lowerSrc: "images/maps/DiningRoomLower.png",
    upperSrc: "images/maps/DiningRoomUpper.png",
    gameObjects: {
      hero: new Person({
        isPlayerControlled: true,
        x: utils.withGrid(12),
        y: utils.withGrid(2),
      }),

      diningroom_puzzle: new Person({
        x: utils.withGrid(12),
        y: utils.withGrid(9),
        src: "images/icons/dummy.png",  
        talking: [
          {
            events: [
              { type: "showPuzzle", url: " puzzle2.html", id: "puzzle2" },
              {
                type: "conditional",
                condition: () => !!playerState.tempFlags?.puzzle2,
                then: [
                  { type: "setFlag", flag: "solvedPuzzle2" },
                  { type: "removeNPC", id:"diningroom_puzzle"},
                  { type: "setObjective", text: null },
                  { type: "showItemNotification", image: "images/popup/DisplayRoom_key.png", text: "Display Room Key x 1" },
                  {
                    type: "setFlag",
                    flag: "hasDisplayRoomKey"
                  },  
                  { type: "setObjective", text: "Find the Display Room" },
                ],
                else: [
                ]
              }
            ]
            
          }
        ],
        customText: "[E] Solve Puzzle",
      }),

      easter_egg1_key: new Person({
        x: utils.withGrid(5),
        y: utils.withGrid(11),
        src: "images/icons/skeleton_key.png",
        talking: [
          {
            events: [
              { type: "removeNPC", id: "easter_egg1_key" },
              { type: "showItemNotification", image: "images/popup/skeleton_key_popup.png", text: "Secret Key x 1" },
              {
                type: "setFlag",
                flag: "hasEasterEgg1Key"
              },  
            ]
          }
        ]
      }),

      door: new Person({
        x: utils.withGrid(12),
        y: utils.withGrid(1),
        src: "images/icons/door.png",  
        talking: [
          {
            events: [
              { type: "changeMap", map:"MainHall" },
            ]
          }
        ],
        customText: "[E] Unlock Door",
      })
    },

    walls: {
      [utils.asGridCoord(12,1)] : true,
      [utils.asGridCoord(13,1)] : true,
      [utils.asGridCoord(14,1)] : true,
      [utils.asGridCoord(15,1)] : true,
      [utils.asGridCoord(16,2)] : true,
      [utils.asGridCoord(16,3)] : true,
      [utils.asGridCoord(16,4)] : true,
      [utils.asGridCoord(16,5)] : true,
      [utils.asGridCoord(16,6)] : true,
      [utils.asGridCoord(16,7)] : true,
      [utils.asGridCoord(16,8)] : true,
      [utils.asGridCoord(16,9)] : true,
      [utils.asGridCoord(16,10)] : true,
      [utils.asGridCoord(16,11)] : true,
      [utils.asGridCoord(15,12)] : true,
      [utils.asGridCoord(14,12)] : true,
      [utils.asGridCoord(13,12)] : true,
      [utils.asGridCoord(12,12)] : true,
      [utils.asGridCoord(11,12)] : true,
      [utils.asGridCoord(10,12)] : true,
      [utils.asGridCoord(9,13)] : true,
      [utils.asGridCoord(8,14)] : true,
      [utils.asGridCoord(7,15)] : true,
      [utils.asGridCoord(6,15)] : true,
      [utils.asGridCoord(5,15)] : true,
      [utils.asGridCoord(4,15)] : true,
      [utils.asGridCoord(3,14)] : true,
      [utils.asGridCoord(2,13)] : true,
      [utils.asGridCoord(1,12)] : true,
      [utils.asGridCoord(1,11)] : true,
      [utils.asGridCoord(1,10)] : true,
      [utils.asGridCoord(2,9)] : true,
      [utils.asGridCoord(3,8)] : true,
      [utils.asGridCoord(4,7)] : true,
      [utils.asGridCoord(4,6)] : true,
      [utils.asGridCoord(4,5)] : true,
      [utils.asGridCoord(4,4)] : true,
      [utils.asGridCoord(4,3)] : true,
      [utils.asGridCoord(4,2)] : true,
      [utils.asGridCoord(5,1)] : true,
      [utils.asGridCoord(6,1)] : true,
      [utils.asGridCoord(7,1)] : true,
      [utils.asGridCoord(8,1)] : true,
      [utils.asGridCoord(9,1)] : true,
      [utils.asGridCoord(10,1)] : true,
      [utils.asGridCoord(11,1)] : true,
      [utils.asGridCoord(4,11)] : true,
      [utils.asGridCoord(5,11)] : true,
      [utils.asGridCoord(6,11)] : true,
      [utils.asGridCoord(7,11)] : true,
      [utils.asGridCoord(10,9)] : true,
      [utils.asGridCoord(11,9)] : true,
      [utils.asGridCoord(12,9)] : true,
      [utils.asGridCoord(13,9)] : true,
      [utils.asGridCoord(10,8)] : true,
      [utils.asGridCoord(11,8)] : true,
      [utils.asGridCoord(12,8)] : true,
      [utils.asGridCoord(11,7)] : true,
      [utils.asGridCoord(12,7)] : true,
      [utils.asGridCoord(8,3)] : true,
      [utils.asGridCoord(7,3)] : true,
    },

    startOnLoad: {
      flag: "diningRoomIntroPlayed",
      events: [
        { type: "setObjective", text: `Solve the puzzle. (Tip: its "playable")` }
      ]
    },
  },

  Kitchen: {
    lowerSrc: "images/maps/KitchenLower.png",
    upperSrc: "images/maps/KitchenUpper.png",
    gameObjects: {
      hero: new Person({
        isPlayerControlled: true,
        x: utils.withGrid(9),
        y: utils.withGrid(8),
      }),

      kitchen_puzzle: new Person({
        x: utils.withGrid(9),
        y: utils.withGrid(6),
        src: "images/icons/dummy.png",  
        talking: [
          {
            events: [
              { type: "showPuzzle", url: " puzzle3.html", id: "puzzle3" },
              {
                type: "conditional",
                condition: () => !!playerState.tempFlags?.puzzle3,
                then: [
                  { type: "setFlag", flag: "solvedPuzzle3" },
                  { type: "removeNPC", id:"kitchen_puzzle"},
                  { type: "setObjective", text: null },
                  { type: "showItemNotification", image: "images/popup/LivingRoom_key.png", text: "Living Room Key x 1" },
                  {
                    type: "setFlag",
                    flag: "hasLivingRoomKey"
                  },  
                  { type: "setObjective", text: "Find the Living Room" },
                ],
                else: [
                ]
              }
            ]
            
          }
        ],
        customText: "[E] Solve Puzzle",
      }),

      puzz_note_main: new Person({
        x: utils.withGrid(6),
        y: utils.withGrid(6),
        src: "images/icons/puzzlenote.png",
        talking: [
          {
            events: [
              { 
                type: "showJournal", 
                image: "images/puzzle/puzzlenotemain.png" // Path to your journal image
              }
            ]
          }
        ]
      }),

      puzz_note1: new Person({
        x: utils.withGrid(2),
        y: utils.withGrid(1),
        src: "images/icons/puzzlenote.png",
        talking: [
          {
            events: [
              { 
                type: "showJournal", 
                image: "images/puzzle/puzzlenote1.png" // Path to your journal image
              }
            ]
          }
        ]
      }),

      puzz_note2: new Person({
        x: utils.withGrid(2),
        y: utils.withGrid(8),
        src: "images/icons/puzzlenote.png",
        talking: [
          {
            events: [
              { 
                type: "showJournal", 
                image: "images/puzzle/puzzlenote2.png" // Path to your journal image
              }
            ]
          }
        ]
      }),

      door: new Person({
        x: utils.withGrid(10),
        y: utils.withGrid(8),
        src: "images/icons/door.png",  
        talking: [
          {
            events: [
              { type: "changeMap", map:"MainHall" },
            ]
          }
        ],
        customText: "[E] Unlock Door",
      }),

      door2: new Person({
        x: utils.withGrid(8),
        y: utils.withGrid(0),
        src: "images/icons/door.png",  
        talking: [
          {
            events: [
              {
                type: "changeMap",
                map: "Storage",
              }
            ]
          }
        ],
        customText: "[E] Unlock Door",
      })
    },

    walls: {
      [utils.asGridCoord(10,3)] : true,
      [utils.asGridCoord(10,2)] : true,
      [utils.asGridCoord(10,1)] : true,
      [utils.asGridCoord(9,0)] : true,
      [utils.asGridCoord(8,0)] : true,
      [utils.asGridCoord(7,0)] : true,
      [utils.asGridCoord(6,0)] : true,
      [utils.asGridCoord(5,1)] : true,
      [utils.asGridCoord(4,1)] : true,
      [utils.asGridCoord(3,1)] : true,
      [utils.asGridCoord(2,1)] : true,
      [utils.asGridCoord(1,1)] : true,
      [utils.asGridCoord(0,2)] : true,
      [utils.asGridCoord(0,3)] : true,
      [utils.asGridCoord(1,4)] : true,
      [utils.asGridCoord(2,4)] : true,
      [utils.asGridCoord(2,5)] : true,
      [utils.asGridCoord(2,6)] : true,
      [utils.asGridCoord(2,7)] : true,
      [utils.asGridCoord(2,8)] : true,
      [utils.asGridCoord(2,9)] : true,
      [utils.asGridCoord(3,10)] : true,
      [utils.asGridCoord(4,10)] : true,
      [utils.asGridCoord(5,10)] : true,
      [utils.asGridCoord(6,10)] : true,
      [utils.asGridCoord(7,10)] : true,
      [utils.asGridCoord(8,10)] : true,
      [utils.asGridCoord(9,10)] : true,
      [utils.asGridCoord(10,9)] : true,
      [utils.asGridCoord(10,8)] : true,
      [utils.asGridCoord(10,7)] : true,
      [utils.asGridCoord(9,6)] : true,
      [utils.asGridCoord(9,5)] : true,
      [utils.asGridCoord(10,4)] : true,
      [utils.asGridCoord(6,6)] : true,
      [utils.asGridCoord(6,5)] : true,
    },

    startOnLoad: {
      flag: "KitchenIntroPlayed",
      events: [
        { type: "setObjective", text: "Solve the puzzle." }
      ]
    },
  },

  Storage: {
    lowerSrc: "images/maps/StorageLower.png",
    upperSrc: "images/maps/StorageUpper.png",
    gameObjects: {
      hero: new Person({
        isPlayerControlled: true,
        x: utils.withGrid(7),
        y: utils.withGrid(8),
      }),

      easter_egg2: new Person({
        x: utils.withGrid(5),
        y: utils.withGrid(8),
        src: "images/icons/dummy.png",  
        talking: [
          {
            events: [
              {
                type: "textMessage",
                text: "You need something.",
                required: "!hasEasterEgg2Key"
              },
              { type: "removeNPC", id: "easter_egg2", required: "hasEasterEgg2Key"},
              { 
                type: "showJournal", 
                image: "images/easteregg/EasterEgg2.png",
                required: "hasEasterEgg2Key"
              }
            ]
          }
        ],
        customText: "[E] ???",
      }),

      puzz_note3: new Person({
        x: utils.withGrid(5),
        y: utils.withGrid(3),
        src: "images/icons/puzzlenote.png",
        talking: [
          {
            events: [
              { 
                type: "showJournal", 
                image: "images/puzzle/puzzlenote3.png" // Path to your journal image
              }
            ]
          }
        ]
      }),

      puzz_note4: new Person({
        x: utils.withGrid(1),
        y: utils.withGrid(7),
        src: "images/icons/puzzlenote.png",
        talking: [
          {
            events: [
              { 
                type: "showJournal", 
                image: "images/puzzle/puzzlenote4.png" // Path to your journal image
              }
            ]
          }
        ]
      }),

      door: new Person({
        x: utils.withGrid(9),
        y: utils.withGrid(6),
        src: "images/icons/door.png",  
        talking: [
          {
            events: [
              {
                type: "textMessage",
                text: "It's locked. Key required.",
                required: "!hasStorageKey"
              },
              {
                type: "changeMap",
                map: "MainHall",
                required: "hasStorageKey"
              }
            ]
          }
        ],
        customText: "[E] Unlock Door",
      }),

      door2: new Person({
        x: utils.withGrid(7),
        y: utils.withGrid(9),
        src: "images/icons/door.png",  
        talking: [
          {
            events: [
              { type: "changeMap", map:"Kitchen" },
            ]
          }
        ],
        customText: "[E] Unlock Door",
      })
    },

    walls: {
      [utils.asGridCoord(9,6)] : true,
      [utils.asGridCoord(9,7)] : true,
      [utils.asGridCoord(9,8)] : true,
      [utils.asGridCoord(8,9)] : true,
      [utils.asGridCoord(7,9)] : true,
      [utils.asGridCoord(6,8)] : true,
      [utils.asGridCoord(5,8)] : true,
      [utils.asGridCoord(4,8)] : true,
      [utils.asGridCoord(3,9)] : true,
      [utils.asGridCoord(2,9)] : true,
      [utils.asGridCoord(1,8)] : true,
      [utils.asGridCoord(1,7)] : true,
      [utils.asGridCoord(1,6)] : true,
      [utils.asGridCoord(1,5)] : true,
      [utils.asGridCoord(1,4)] : true,
      [utils.asGridCoord(1,3)] : true,
      [utils.asGridCoord(1,2)] : true,
      [utils.asGridCoord(2,1)] : true,
      [utils.asGridCoord(3,1)] : true,
      [utils.asGridCoord(4,1)] : true,
      [utils.asGridCoord(5,2)] : true,
      [utils.asGridCoord(5,3)] : true,
      [utils.asGridCoord(6,3)] : true,
      [utils.asGridCoord(7,3)] : true,
      [utils.asGridCoord(8,3)] : true,
      [utils.asGridCoord(9,4)] : true,
      [utils.asGridCoord(9,5)] : true,
    },
  },
}



//change map by coordinates
/*[utils.asGridCoord(10,19)]: [
        {
          events: [
            { type: "changeMap", map:"Toilet" },
          ]
        }
      ]*/