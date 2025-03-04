// Game configuration
const config = {
  type: Phaser.AUTO,
  width: 900,
  height: 600,
  parent: "game-container",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 1000 },
      debug: false,
    },
  },
  scene: {
    preload: preload,
    create: create,
    update: update,
  },
};

// Game variables
let bird;
let background;
let roads;
let pipes;
let gameStarted = false;
let gameOver = false;
let score = 0;
let scoreText;
let pipeGap = 120;
let pipeSpeed = -200;
let pipeSpawnTime = 1500; // Time between pipe spawns in ms
let lastPipeTime = 0;

let startText;
let gameOverText;
let restartText;
let spaceKey;

// Initialize game
const game = new Phaser.Game(config);

// Preload assets
function preload() {
  this.load.image("background", "assets/background.png");
  this.load.image("pipe", "assets/column.png");
  this.load.image("road", "assets/road.png");
  this.load.spritesheet("bird", "assets/bird.png", {
    frameWidth: 64,
    frameHeight: 96,
  });
  
  // Explicit font loading
  this.load.script('webfont', 'https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js');
}

// Create text elements function - add this new function
function createTextElements() {
  // Initial instruction text
  startText = this.add.text(450, 300, "Tap or Press SPACE to Start", {
    fontFamily: "FlappyFont, Arial, sans-serif",
    fontSize: "16px",
    fill: "#ffffff",
    stroke: "#000000",
    strokeThickness: 4,
    padding: { x: 10, y: 5 },
  });
  startText.setOrigin(0.5);
  startText.setDepth(30);

  // Game over text
  gameOverText = this.add.text(450, 300, "GAME OVER", {
    fontFamily: "FlappyFont, Arial, sans-serif",
    fontSize: "40px",
    fill: "#ffffff",
    stroke: "#000000",
    strokeThickness: 6,
    padding: { x: 10, y: 5 },
  });
  gameOverText.setOrigin(0.5);
  gameOverText.visible = false;
  gameOverText.setDepth(30);

  // Restart text
  restartText = this.add.text(450, 340, "Tap or Press SPACE to Restart", {
    fontFamily: "FlappyFont, Arial, sans-serif",
    fontSize: "16px",
    fill: "#ffffff",
    stroke: "#000000",
    strokeThickness: 4,
    padding: { x: 10, y: 5 },
  });
  restartText.setOrigin(0.5);
  restartText.visible = false;
  restartText.setDepth(30);
}

// Create game elements
function create() {
  // Set up the background
  background = this.add.tileSprite(450, 300, 900, 600, "background");
  background.setDepth(0);

  // Set up the pipes group
  pipes = this.physics.add.group();

  // Set up the road
  roads = this.physics.add.staticGroup();
  roads.create(450, 590, "road").setScale(1).refreshBody();

  // Set the depth of all road elements
  roads.getChildren().forEach((road) => {
    road.setDepth(10);
  });

  // Set up the bird
  bird = this.physics.add.sprite(80, 300, "bird");
  bird.setCollideWorldBounds(true);
  bird.body.allowGravity = false; // Disable gravity until game starts
  bird.setDepth(20);
  bird.setScale(2);

  // Set up collisions
  this.physics.add.collider(bird, roads, gameOverHandler, null, this);
  this.physics.add.collider(bird, pipes, gameOverHandler, null, this);

  // Set up input
  this.input.on("pointerdown", flapBird, this);
  spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

  // Set up score display
  scoreText = document.getElementById("score-display");

  // Load fonts with WebFont and create text elements
  if (window.WebFont) {
    WebFont.load({
      custom: {
        families: ['FlappyFont']
      },
      active: () => {
        createTextElements.call(this);
      },
      inactive: () => {
        // Fallback if font can't load
        createTextElements.call(this);
      }
    });
  } else {
    // Fallback if WebFont isn't available
    createTextElements.call(this);
  }

  // Store reference to the scene for later use
  this.scene.scene = this;
}

// Update game state
function update(time) {
  // Scroll the background
  background.tilePositionX += 0.5;

  // Handle space key press
  if (Phaser.Input.Keyboard.JustDown(spaceKey)) {
    if (!gameStarted) {
      startGame(this);
    } else if (gameOver) {
      restartGame(this);
    } else {
      flapBird.call(this);
    }
  }

  // Rotate bird based on velocity
  if (gameStarted && !gameOver) {
    bird.angle = Math.clamp(bird.body.velocity.y / 10, -30, 90);
  }

  // Spawn pipes
  if (gameStarted && !gameOver && time > lastPipeTime + pipeSpawnTime) {
    spawnPipes.call(this);
    lastPipeTime = time;
  }

  // Remove pipes that have gone off screen
  pipes.getChildren().forEach((pipe) => {
    if (pipe.x < -50) {
      pipe.destroy();
    }

    // Check if bird has passed a pipe to score a point
    // Only check top pipes to avoid counting twice
    if (
      !pipe.scored &&
      pipe.x < bird.x &&
      pipe.texture.key === "pipe" &&
      pipe.y < 300
    ) {
      addScore();
      pipe.scored = true;
    }
  });
}

// Start the game
function startGame(scene) {
  gameStarted = true;
  bird.body.allowGravity = true;
  flapBird.call(scene);
  lastPipeTime = scene.time.now;

  if (startText) {
    startText.visible = false;
  }
}

// Make the bird flap
function flapBird() {
  if (gameOver) {
    restartGame(this);
    return;
  }

  if (!gameStarted) {
    startGame(this);
    return;
  }

  bird.body.velocity.y = -350;
}

// Spawn a new pair of pipes
function spawnPipes() {
  const gapY = Phaser.Math.Between(100, 500);

  // Create top pipe
  const topPipe = pipes.create(960, gapY - pipeGap / 2, "pipe");
  topPipe.body.allowGravity = false;
  topPipe.body.velocity.x = pipeSpeed;
  topPipe.scored = false;
  topPipe.setDepth(5);

  // Flip and position the top pipe
  topPipe.flipY = true;
  topPipe.y = gapY - pipeGap / 2 - topPipe.height / 2;

  // Create bottom pipe
  const bottomPipe = pipes.create(960, gapY + pipeGap / 2, "pipe");
  bottomPipe.body.allowGravity = false;
  bottomPipe.body.velocity.x = pipeSpeed;
  bottomPipe.scored = true;
  bottomPipe.y = gapY + pipeGap / 2 + bottomPipe.height / 2;
  bottomPipe.setDepth(5);
}

// Handle game over
function gameOverHandler() {
  if (gameOver) return;

  gameOver = true;

  // Stop all pipes
  pipes.getChildren().forEach((pipe) => {
    pipe.body.velocity.x = 0;
  });

  // Show game over text
  gameOverText.visible = true;
  restartText.visible = true;

  // Disable bird physics
  bird.body.allowGravity = false;
  bird.body.velocity.y = 0;
  bird.body.velocity.x = 0;
}

// Add score
function addScore() {
  score += 1;
  scoreText.textContent = "Score: " + score;
}

// Restart the game
function restartGame(scene) {
  // Reset game state
  gameOver = false;
  gameStarted = false;
  score = 0;

  // Reset score display
  scoreText.textContent = "Score: " + score;

  gameOverText.visible = false;
  restartText.visible = false;

  if (startText) {
    startText.visible = true;
  }

  // Reset pipes
  pipes.clear(true, true);

  // Reset bird
  bird.x = 80;
  bird.y = 300;
  bird.angle = 0;
  bird.body.velocity.y = 0;
  bird.body.allowGravity = false;
}

// Utility function for angle clamping
Math.clamp = function (value, min, max) {
  return Math.max(min, Math.min(max, value));
};
