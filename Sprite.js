class Sprite {
  constructor(config) {

    this.gameObject = config.gameObject;
    this.isHero = this.gameObject.id === "hero";

    this.srcNormal = config.src;
    this.srcBlue = config.srcBlue || config.src;

    this.image = new Image();
    this.setImageSource();

    this.image.onload = () => {
      this.isLoaded = true;
    };

    //Shadow
    this.shadow = new Image();
    this.useShadow = true; //config.useShadow || false
    if (this.useShadow) {
      this.shadow.src = "images/characters/shadow.png";
    }
    this.shadow.onload = () => {
      this.isShadowLoaded = true;
    }

    //Configure Animation & Initial State
    this.animations = config.animations || {
      "idle-down" : [ [0,0] ],
      "idle-right": [ [0,1] ],
      "idle-up"   : [ [0,2] ],
      "idle-left" : [ [0,3] ],
      "walk-down" : [ [1,0],[2,0],[3,0],[4,0],[5,0],[6,0], ],
      "walk-right": [ [1,1],[2,1],[3,1],[4,1],[5,1],[6,1], ],
      "walk-up"   : [ [1,2],[2,2],[3,2],[4,2],[5,2],[6,2], ],
      "walk-left" : [ [1,3],[2,3],[3,3],[4,3],[5,3],[6,3], ]
    }
    this.currentAnimation = "idle-right"; // config.currentAnimation || "idle-down";
    this.currentAnimationFrame = 0;

    this.animationFrameLimit = config.animationFrameLimit || 8;
    this.animationFrameProgress = this.animationFrameLimit;
    

    //Reference the game object
    this.gameObject = config.gameObject;
  }

  get frame() {
    return this.animations[this.currentAnimation][this.currentAnimationFrame]
  }

  setAnimation(key) {
    if (this.currentAnimation !== key) {
      this.currentAnimation = key;
      this.currentAnimationFrame = 0;
      this.animationFrameProgress = this.animationFrameLimit;
    }
  }

  setImageSource() {
    if (this.isHero) {
      this.image.src = window.flashlightOn ? this.srcNormal : this.srcBlue;
    } else {
      this.image.src = this.srcNormal;
    }
  }  

  updateAnimationProgress() {
    //Downtick frame progress
    if (this.animationFrameProgress > 0) {
      this.animationFrameProgress -= 1;
      return;
    }

    //Reset the counter
    this.animationFrameProgress = this.animationFrameLimit;
    this.currentAnimationFrame += 1;

    if (this.frame === undefined) {
      this.currentAnimationFrame = 0
    }


  }
  

  draw(ctx, cameraPerson) {
    const x = this.gameObject.x - 9 + utils.withGrid(10.5) - cameraPerson.x;
    const y = this.gameObject.y - 14 + utils.withGrid(6) - cameraPerson.y;
  
    const [frameX, frameY] = this.frame;
  
    ctx.save();
  
    if (this.isHero) {
      const expectedSrc = window.flashlightOn ? this.srcNormal : this.srcBlue;
      if (this.image.src !== expectedSrc) {
        this.setImageSource();
      }
    }    
    
    // Draw shadow
    if (this.isGlowLoaded) {
      ctx.drawImage(this.glow, x, y - 5);
    }
  
    // Draw shadow
    if (this.isShadowLoaded) {
      ctx.drawImage(this.shadow, x, y - 5);
    }
  
    // Draw the main sprite
    if (this.isLoaded) {
      ctx.drawImage(
        this.image,
        frameX * 32, frameY * 32,
        32, 32,
        x, y,
        32, 32
      );
    }
  
    ctx.restore();
  
    this.updateAnimationProgress();
  }
  

}