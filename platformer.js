// # Quintus platformer example
//
// [Run the example](../examples/platformer/index.html)
// WARNING: this game must be run from a non-file:// url
// as it loads a level json file.
//
// This is the example from the website homepage, it consists
// a simple, non-animated platformer with some enemies and a 
// target for the player
var oneInQueue = false;
window.addEventListener("load",function() {

// Set up an instance of the Quintus engine  and include
// the Sprites, Scenes, Input and 2D module. The 2D module
// includes the `TileLayer` class as well as the `2d` componet.
var Q = window.Q = Quintus()
        .include("Sprites, Scenes, Input, 2D, Anim, Touch, UI, TMX")
        // Maximize this game to whatever the size of the browser is
        .setup({ maximize: true })
        // And turn on default input controls and touch input (for UI)
        .controls(true).touch()
        
Q.input.mouseControls({cursor: true});

Q.SPRITE_PLAYER = 1;
Q.SPRITE_COLLECTABLE = 2;
Q.SPRITE_ENEMY = 4;
Q.SPRITE_DOOR = 8;
Q.Sprite.extend("Player",{

  init: function(p) {

    this._super(p, {
      sheet: "player",  // Setting a sprite sheet sets sprite width and height
      sprite: "player",
      direction: "right",
      standingPoints: [ [ -16, 44], [ -23, 35 ], [-23,-48], [23,-48], [23, 35 ], [ 16, 44 ]],
      duckingPoints : [ [ -16, 44], [ -23, 35 ], [-23,-10], [23,-10], [23, 35 ], [ 16, 44 ]],
      jumpSpeed: -400,
      speed: 300,
      strength: 100,
      score: 0,
      focus: 0,
      calm: 0,
      flying: false,
      left: false,
      bulletSpeed: 300,
      type: Q.SPRITE_PLAYER,
      collisionMask: Q.SPRITE_DEFAULT | Q.SPRITE_DOOR | Q.SPRITE_COLLECTABLE
    });

    this.p.points = this.p.standingPoints;

    this.add('2d, platformerControls, animation, tween');

    this.on("bump.top","breakTile");

    this.on("sensor.tile","checkLadder");
    this.on("enemy.hit","enemyHit");
    this.on("jump");
    this.on("jumped");

    Q.input.on("down",this,"checkDoor");
    Q.input.on("fire",this,"fire");
  },

  fire: function(obj){
    var dx = this.p.x + this.p.w * 0.6;
    var dy = this.p.y + this.p.h * 0.125;
    var dvx = this.p.bulletSpeed;
    var dist = (this.p.focus * 0.02  + 0.5) * this.p.bulletSpeed;
    if(this.p.left){
      dvx = -dvx;
      dx -= 2 * 0.6 * this.p.w;
    }
    this.stage.insert(
      new Q.Lazer({
        x: dx, y: dy, vx: dvx, distance: dist 
      })
    )
  },

  jump: function(obj) {
    if (!obj.p.playedJump) {
      obj.p.playedJump = true;
    }
  },

  jumped: function(obj) {
    obj.p.playedJump = false;
  },

  checkLadder: function(colObj) {
    if(colObj.p.ladder) { 
      this.p.onLadder = true;
      this.p.ladderX = colObj.p.x;
    }
  },

  checkDoor: function() {
    this.p.checkDoor = true;
  },

  resetLevel: function() {
    Q.stageScene("level1");
    this.p.strength = 100;
    this.animate({opacity: 1});
    Q.stageScene('hud', 3, this.p);
  },

  enemyHit: function(data) {
    var col = data.col;
    var enemy = data.enemy;
    this.p.vy = -150;
    if (col.normalX == 1) {
      // Hit from left.
      this.p.x -=15;
      this.p.y -=15;
    }
    else {
      // Hit from right;
      this.p.x +=15;
      this.p.y -=15;
    }
    this.p.immune = true;
    this.p.immuneTimer = 0;
    this.p.immuneOpacity = 1;
    this.p.strength -= 25;
    Q.stageScene('hud', 3, this.p);
    if (this.p.strength == 0) {
      this.resetLevel();
    }
  },

  continueOverSensor: function() {
    this.p.vy = 0;
    if(this.p.vx != 0) {
      this.play("walk_" + this.p.direction);
    } else {
      this.play("stand_" + this.p.direction);
    }
  },

  breakTile: function(col) {
    if(col.obj.isA("TileLayer")) {
      if(col.tile == 24) { col.obj.setTile(col.tileX,col.tileY, 36); }
      else if(col.tile == 36) { col.obj.setTile(col.tileX,col.tileY, 24); }
    }
  },

  step: function(dt) {
    var processed = false;
    if (this.p.immune) {
      // Swing the sprite opacity between 50 and 100% percent when immune.
      if ((this.p.immuneTimer % 12) == 0) {
        var opacity = (this.p.immuneOpacity == 1 ? 0 : 1);
        this.animate({"opacity":opacity}, 0);
        this.p.immuneOpacity = opacity;
      }
      this.p.immuneTimer++;
      if (this.p.immuneTimer > 144) {
        // 3 seconds expired, remove immunity.
        this.p.immune = false;
        this.animate({"opacity": 1}, 1);
      }
    }

    if(Q.inputs['left']){
      this.p.left = true;
    }

    if(Q.inputs['right']){
      this.p.left = false;
    }

    var DATASOURCE = 'poop';

    var user = this;
    if (DATASOURCE == 'neurosky' && $ !== undefined) {
      if (!oneInQueue) {
        oneInQueue = true;
        $.ajax({
          type:  'GET',
          dataType: "jsonp",
          url:  'http://localhost:8080/ESenseData.json',
          success: function (response) {
            user.p.focus = parseInt(response.attention);
            user.p.calm = parseInt(response.meditation);            
          },
          error: function (xhr, textStatus, errorThrown) {
            console.log(xhr.toString());
            console.log(textStatus);
            console.log(errorThrown);
            keyboardData(); // fallback to keyboard
          },
          complete: function (jqXHR, textStatus) {
            oneInQueue = false;
          }
        });
      }
    } else if (DATASOURCE == 'mouse') { // debug mode with mouse
      this.p.focus = (Math.abs(Q.inputs["mouseX"] - this.p.x) > 100 ? 100 : Math.abs(Math.round(Q.inputs["mouseX"] - this.p.x)));
      this.p.calm = (Math.abs(Q.inputs["mouseY"] - this.p.y) > 100 ? 100 : Math.abs(Math.round(Q.inputs["mouseY"] - this.p.y)));
    } else {
      keyboardData(); // debug mode with keyboard
    }

    function keyboardData () {
      if (Q.inputs['S']) {
        user.p.focus = (user.p.focus + 1) < 100 ? user.p.focus + 1 : 100;
      } else {
        user.p.focus = (user.p.focus - 1) > 0 ? user.p.focus - 1 : 0;
      }
      if (Q.inputs['P']) {
        user.p.calm = (user.p.calm + 1) < 100 ? user.p.calm + 1 : 100;
      } else {
        user.p.calm = (user.p.calm - 1) > 0 ? user.p.calm - 1 : 0;
      }
    }

    var diff = user.p.calm / 100.0 - repeater.p.opacity;
    var amt = (diff > 0.05) ? 0.05 : (diff > -0.05 ? diff : -0.05);
    repeater.p.opacity = repeater.p.opacity + amt;

    if (this.p.calm >= 50){
      this.p.flying = true;
    } else {
      this.p.flying = false;
    }
    
    Q.stageScene('hud', 3, this.p);

    if(this.p.onLadder) {
      this.p.gravity = 0;

      if(Q.inputs['up']) {
        this.p.vy = -this.p.speed;
        this.p.x = this.p.ladderX;
        this.play("climb");
      } else if(Q.inputs['down']) {
        this.p.vy = this.p.speed;
        this.p.x = this.p.ladderX;
        this.play("climb");
      } else {
        this.continueOverSensor();
      }
      processed = true;
    } 
      
    if(!processed && this.p.door) {
      this.p.gravity = 1;
      if(this.p.checkDoor && this.p.landed > 0) {
        // Enter door.
        this.p.y = this.p.door.p.y;
        this.p.x = this.p.door.p.x;
        this.play('climb');
        this.p.toDoor = this.p.door.findLinkedDoor();
        processed = true;
      }
      else if (this.p.toDoor) {
        // Transport to matching door.
        this.p.y = this.p.toDoor.p.y;
        this.p.x = this.p.toDoor.p.x;
        this.stage.centerOn(this.p.x, this.p.y);
        this.p.toDoor = false;
        this.stage.follow(this);
        processed = true;
      }
    } 
      
    if(!processed) { 
      this.p.gravity = 1;

      if(Q.inputs['down'] && !this.p.door) {
        //this.p.ignoreControls = true;
        this.play("duck_" + this.p.direction);
        if(this.p.landed > 0) {
          this.p.vx = this.p.vx * (1 - dt*2);
        }
        this.p.points = this.p.duckingPoints;
      } else {
        this.p.ignoreControls = false;
        this.p.points = this.p.standingPoints;

        if(this.p.vx > 0) {
          if(this.p.landed > 0) {
            this.play("walk_right");
          } else {
            this.play("jump_right");
          }
          this.p.direction = "right";
        } else if(this.p.vx < 0) {
          if(this.p.landed > 0) {
            this.play("walk_left");
          } else {
            this.play("jump_left");
          }
          this.p.direction = "left";
        } else {
          this.play("stand_" + this.p.direction);
        }
           
      }
    }

    this.p.onLadder = false;
    this.p.door = false;
    this.p.checkDoor = false;


    if(this.p.y > 3000 || this.p.y < 0) {
      this.stage.unfollow();
    }
    if(this.p.y > 0 && this.p.y < 100) {
      this.stage.follow();
    }

    if(this.p.y > 4500) {
      this.resetLevel();
    }

    if(this.p.flying){
      this.p.gravity = 0;
    }else{
      this.p.gravity = this.p.gravity * (1 - this.p.calm / 100 * 0.75);
    }
  }
});

Q.Sprite.extend("Enemy", {
  init: function(p,defaults) {

    this._super(p,Q._defaults(defaults||{},{
      sheet: p.sprite,
      vx: -50,
      defaultDirection: 'left',
      type: Q.SPRITE_ENEMY,
      collisionMask: Q.SPRITE_FRIENDLY + Q.SPRITE_PLAYER
    }));

    this.add("2d, aiBounce, animation");
    this.on("bump.top",this,"die");
    this.on("bump.left",this,"hitByLazer");
    this.on("bump.right",this,"hitByLazer");
    this.on("bump.bottom",this,"hitByLazer");
    this.on("hit.sprite",this,"hit");
  },

  step: function(dt) {
    var p = this.p;

    p.vx += p.ax * dt;
    p.vy += p.ay * dt;

    p.x += p.vx * dt;
    p.y += p.vy * dt;

    if(this.p.dead) {
      this.del('2d, aiBounce');
      this.p.deadTimer++;
      if (this.p.deadTimer > 24) {
        // Dead for 24 frames, remove it.
        this.destroy();
      }
      return;
    }

    this.play('walk');
  },

  hit: function(col) {
    if(col.obj.isA("Player") && !col.obj.p.immune && !this.p.dead) {
      col.obj.trigger('enemy.hit', {"enemy":this,"col":col});
    }
  },

  hitByLazer: function(col){
    if(col.obj.isA("Lazer")){
      this.die(col);
    }
  },

  die: function(col) {
    if(col.obj.isA("Player") || col.obj.isA("Lazer")) {
      this.p.vx = 0;
      this.play('dead');
      this.p.dead = true;
      var that = this;
      col.obj.p.vy = -300;
      this.p.deadTimer = 0;
      this.p.vy = 300;
      this.p.ay = 40;
      this.p.gravity = 1;
    }
  }
});

Q.Enemy.extend("Fly", {
  init: function(p) {
    this._super(p,{
      w: 55,
      h: 34
    });
    this.p.gravity = 0;
  }
});

Q.Enemy.extend("Slime", {
  init: function(p) {
    this._super(p,{
      w: 55,
      h: 34
    });
  }
});

Q.Enemy.extend("Snail", {
  init: function(p) {
    this._super(p,{
      w: 55,
      h: 36
    });
  }
});

Q.Sprite.extend("Lazer", {
  init: function(p,defaults) {

    this._super(p,Q._defaults(defaults||{},{
      w:20,
      h:10,
      defaultDirection: 'left',
      startX: p.x,
      type: Q.SPRITE_FRIENDLY,
      collisionMask: Q.SPRITE_ENEMY + Q.SPRITE_DEFAULT
    }));

    this.add("2d");
    this.on("bump.left",this,"hit");
    this.on("bump.right",this,"hit");
    this.on("bump.top",this,"hit");
    this.on("bump.bottom",this,"hit");
    this.p.gravity = 0;
  },

  draw: function(ctx) {
    ctx.fillStyle = "#FFB00F";
    ctx.fillRect(-this.p.cx,-this.p.cy,this.p.w,this.p.h);
  },

  step: function(dt) {
    var p = this.p;

    p.vx += p.ax * dt;

    p.x += p.vx * dt;
    if(Math.abs(p.x - p.startX) > p.distance){
      this.destroy();
    }
  },

  hit: function(col) {
    this.die(col);
  },

  die: function(col) {
    this.destroy();
  }
})

Q.Sprite.extend("Collectable", {
  init: function(p) {
    this._super(p,{
      sheet: p.sprite,
      type: Q.SPRITE_COLLECTABLE,
      collisionMask: Q.SPRITE_PLAYER,
      sensor: true,
      vx: 0,
      vy: 0,
      gravity: 0
    });
    this.add("animation");

    this.on("sensor");
  },

  // When a Collectable is hit.
  sensor: function(colObj) {
    // Increment the score.
    if (this.p.amount) {
      colObj.p.score += this.p.amount;
      Q.stageScene('hud', 3, colObj.p);
    }
    this.destroy();
  }
});

Q.Sprite.extend("Door", {
  init: function(p) {
    this._super(p,{
      sheet: p.sprite,
      type: Q.SPRITE_DOOR,
      collisionMask: Q.SPRITE_NONE,
      sensor: true,
      vx: 0,
      vy: 0,
      gravity: 0
    });
    this.add("animation");

    this.on("sensor");
  },
  findLinkedDoor: function() {
    return this.stage.find(this.p.link);
  },
  // When the player is in the door.
  sensor: function(colObj) {
    // Mark the door object on the player.
    colObj.p.door = this;
  }
});

Q.Collectable.extend("Heart", {
  // When a Heart is hit.
  sensor: function(colObj) {
    // Increment the strength.
    if (this.p.amount) {
      colObj.p.strength = Math.max(colObj.p.strength + 25, 100);
      Q.stageScene('hud', 3, colObj.p);
    }
    this.destroy();
  }
});

var repeater;

Q.scene("level1",function(stage) {
  repeater = stage.insert(new Q.Repeater({ asset: "cloudsbg.jpg", speedX: 0.5, speedY: 0.5, type: 0 }));
  repeater.p.opacity = 0;
  Q.stageTMX("level1.tmx",stage);
  stage.add("viewport").follow(Q("Player").first());
});

Q.scene('hud',function(stage) {
  var container = stage.insert(new Q.UI.Container({
    x: 50, y: 0, fill: "#000"
  }));

  var label = container.insert(new Q.UI.Text({x:200, y: 20,
    label: "Score: " + stage.options.score, color: "white" }));

  var strength = container.insert(new Q.UI.Text({x:50, y: 20,
    label: "Health: " + stage.options.strength + '%', color: "white" }));

  var strength = container.insert(new Q.UI.Text({x:350, y: 20,
    label: "Focus: " + stage.options.focus + '%', color: "white" }));

  var strength = container.insert(new Q.UI.Text({x:500, y: 20,
    label: "Calm: " + stage.options.calm + '%', color: "white" }));
  container.fit(20);
});

Q.loadTMX("level1.tmx, collectables.json, doors.json, enemies.json, player.json, player.png, cloudsbg.jpg", function() {
    Q.compileSheets("player.png","player.json");
    Q.compileSheets("collectables.png","collectables.json");
    Q.compileSheets("enemies.png","enemies.json");
    Q.compileSheets("doors.png","doors.json");
    Q.animations("player", {
      walk_right: { frames: [0,1,2,3,4,5,6,7,8,9,10], rate: 1/15, flip: false, loop: true },
      walk_left: { frames:  [0,1,2,3,4,5,6,7,8,9,10], rate: 1/15, flip:"x", loop: true },
      jump_right: { frames: [13], rate: 1/10, flip: false },
      jump_left: { frames:  [13], rate: 1/10, flip: "x" },
      stand_right: { frames:[14], rate: 1/10, flip: false },
      stand_left: { frames: [14], rate: 1/10, flip:"x" },
      duck_right: { frames: [15], rate: 1/10, flip: false },
      duck_left: { frames:  [15], rate: 1/10, flip: "x" },
      climb: { frames:  [16, 17], rate: 1/3, flip: false }
    });
    var EnemyAnimations = {
      walk: { frames: [0,1], rate: 1/3, loop: true },
      dead: { frames: [2], rate: 1/10 }
    };
    Q.animations("fly", EnemyAnimations);
    Q.animations("slime", EnemyAnimations);
    Q.animations("snail", EnemyAnimations);
    Q.stageScene("level1");
    Q.stageScene('hud', 3, Q('Player').first().p);
  
}, {
  progressCallback: function(loaded,total) {
    var element = document.getElementById("loading_progress");
    element.style.width = Math.floor(loaded/total*100) + "%";
    if (loaded == total) {
      document.getElementById("loading").remove();
    }
  }
});

// ## Possible Experimentations:
// 
// The are lots of things to try out here.
// 
// 1. Modify level.json to change the level around and add in some more enemies.
// 2. Add in a second level by creating a level2.json and a level2 scene that gets
//    loaded after level 1 is complete.
// 3. Add in a title screen
// 4. Add in a hud and points for jumping on enemies.
// 5. Add in a `Repeater` behind the TileLayer to create a paralax scrolling effect.

});
