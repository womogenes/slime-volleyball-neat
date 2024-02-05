// Key definitions
let KEY_A = 65;
let KEY_D = 68;
let KEY_RIGHT = 39;
let KEY_LEFT = 37;
let KEY_W = 87;
let KEY_UP = 38;
let KEY_DELETE = 46;
let keysDown = [];

if (/[^\/]$/.test(location.pathname)) {
  location.replace(
    location.href.replace(location.pathname, location.pathname + '/'),
  );
}

var IMAGE_ROOT_PATH = '/games/slime-volleyball/images/';

var physicsLog = 0;
var TWO_PI = Math.PI * 2;
var WIN_AMOUNT = 7;

// Objects rendered in the slime engine
// need an x and a y parameter

var GAME_STATE_RUNNING = 1;
var GAME_STATE_POINT_PAUSE = 2;
var GAME_STATE_MENU_PAUSE = 3;
var GAME_STATE_MENU_PAUSE_BETWEEN_POINTS = 4;
var GAME_STATE_SHOW_WINNER = 5;

// MENU DATA
var menuDiv;
var smallMenuDiv;
var onePlayer;
var nextSlimeIndex;

var gameState;

// RENDER DATA
var ctx;
var canvas;
var viewWidth;
var viewHeight;
var courtYPix;
var pixelsPerUnitX;
var pixelsPerUnitY;
var updatesToPaint;
var legacySkyColor;
var legacyGroundColor;
var legacyBallColor;
var newGroundColor;
var backImage;
var backTextColor;
var backImages = {};
var ballImage;
var gameIntervalObject;
var endOfPointText;
var greenSlimeImage;
var redSlimeImage;
var legacyGraphics;

// GAME DATA
var gameWidth, gameHeight;
var ball;
var slimeLeft;
var slimeRight;
var slimeLeftScore;
var slimeRightScore;
var slimeAI;
var updateCount; // RESET every time GAME_STATE_RUNNING is set
var leftWon;
// GAME CHEAT DATA
// NOTE: this data should be reloaded every time the
//       gameState goes back to GAME_STATE_RUNNING
var slowMotion;

var logString = '';
function log(msg) {
  logString += msg + '\n';
}

// Game Update Functions
function updateSlimeVelocities(s, movement, jump) {
  if (movement == 0) {
    s.velocityX = 0;
  } else if (movement == 1) {
    s.velocityX = -8;
  } else if (movement == 2) {
    s.velocityX = 8;
  } else {
    throw 'slime movement ' + movement + ' is invalid';
  }
  if (jump && s.y == 0) {
    s.velocityY = 31;
  }
}
function updateSlimeVelocitiesWithKeys(s, left, right, up) {
  // update velocities
  s.velocityX = keysDown[left]
    ? keysDown[right]
      ? 0
      : -8
    : keysDown[right]
      ? 8
      : 0;
  if (s.y == 0 && keysDown[up]) {
    s.velocityY = 31;
  }
}
function updateSlimeVelocitiesWithDoubleKeys(
  s,
  left1,
  left2,
  right1,
  right2,
  up1,
  up2,
) {
  // update velocities
  s.velocityX =
    keysDown[left1] || keysDown[left2]
      ? keysDown[right1] || keysDown[right2]
        ? 0
        : -8
      : keysDown[right1] || keysDown[right2]
        ? 8
        : 0;
  if (s.y == 0 && (keysDown[up1] || keysDown[up2])) {
    s.velocityY = 31;
  }
}
function updateSlime(s, leftLimit, rightLimit) {
  if (s.velocityX != 0) {
    s.x += s.velocityX;
    if (s.x < leftLimit) {
      s.x = leftLimit;
    } else if (s.x > rightLimit) {
      s.x = rightLimit;
    }
  }
  if (s.velocityY != 0 || s.y > 0) {
    s.velocityY -= 2;
    s.y += s.velocityY;
    if (s.y < 0) {
      s.y = 0;
      s.velocityY = 0;
    }
  }
}

var MAX_VELOCITY_X = 15;
var MAX_VELOCITY_Y = 22;
function collisionBallSlime(s) {
  console.log('checking for collision with', s);

  var dx = 2 * (ball.x - s.x);
  var dy = ball.y - s.y;
  var dist = Math.trunc(Math.sqrt(dx * dx + dy * dy));

  var dVelocityX = ball.velocityX - s.velocityX;
  var dVelocityY = ball.velocityY - s.velocityY;

  console.log(`dist: ${dist}`, `required: ${ball.radius + s.radius}`);
  if (dy > 0 && dist < ball.radius + s.radius && dist > FUDGE) {
    console.log('collided!');
    var oldBall = {
      x: ball.x,
      y: ball.y,
      velocityX: ball.velocityX,
      velocityY: ball.velocityY,
    };
    if (physicsLog > 0) {
      log('Collision:');
      log(' dx        ' + dx);
      log(' dy        ' + dy);
      log(' dist      ' + dist);
      log(' dvx       ' + dVelocityX);
      log(' dvy       ' + dVelocityY);
      log(' oldBallX  ' + ball.x);
      log(' oldBallY  ' + ball.y);
      log(' [DBG] s.x   : ' + s.x);
      log(' [DBG] s.rad : ' + s.radius);
      log(' [DBG] b.rad : ' + ball.radius);
      log(' [DBG] 0   : ' + Math.trunc((s.radius + ball.radius) / 2));
      log(' [DBG] 1   : ' + Math.trunc((s.radius + ball.radius) / 2) * dx);
      log(
        ' [DBG] 2   : ' +
          Math.trunc((Math.trunc((s.radius + ball.radius) / 2) * dx) / dist),
      );
    }
    ball.x =
      s.x + Math.trunc((Math.trunc((s.radius + ball.radius) / 2) * dx) / dist);
    ball.y = s.y + Math.trunc(((s.radius + ball.radius) * dy) / dist);

    var something = Math.trunc((dx * dVelocityX + dy * dVelocityY) / dist);
    if (physicsLog > 0) {
      log(' newBallX  ' + ball.x);
      log(' newBallY  ' + ball.y);
      log(' something ' + something);
    }

    if (something <= 0) {
      ball.velocityX += Math.trunc(s.velocityX - (2 * dx * something) / dist);
      ball.velocityY += Math.trunc(s.velocityY - (2 * dy * something) / dist);
      if (ball.velocityX < -MAX_VELOCITY_X) ball.velocityX = -MAX_VELOCITY_X;
      else if (ball.velocityX > MAX_VELOCITY_X) ball.velocityX = MAX_VELOCITY_X;
      if (ball.velocityY < -MAX_VELOCITY_Y) ball.velocityY = -MAX_VELOCITY_Y;
      else if (ball.velocityY > MAX_VELOCITY_Y) ball.velocityY = MAX_VELOCITY_Y;
      if (physicsLog > 0) {
        log(' ballVX    ' + ball.velocityX);
        log(' ballVY    ' + ball.velocityY);
      }
    }
  }
}
var FUDGE = 5; // not sure why this is needed
// returns true if end of point
function updateBall() {
  ball.velocityY = Math.max(ball.velocityY - 1, -MAX_VELOCITY_Y); // gravity

  var oldX = ball.x;

  ball.x += ball.velocityX;
  ball.y += ball.velocityY;

  collisionBallSlime(slimeLeft);
  collisionBallSlime(slimeRight);

  // handle wall hits
  if (keysDown[KEY_DELETE] && oldX > 500 && ball.x <= 500) {
    ball.x = 500;
    ball.velocityX = -ball.velocityX;
  } else if (ball.x < 15) {
    ball.x = 15;
    ball.velocityX = -ball.velocityX;
  } else if (ball.x > 985) {
    ball.x = 985;
    ball.velocityX = -ball.velocityX;
  }
  // hits the post
  if (ball.x > 480 && ball.x < 520 && ball.y < 140) {
    // bounces off top of net
    if (ball.velocityY < 0 && ball.y > 130) {
      ball.velocityY *= -1;
      ball.y = 130;
    } else if (ball.x < 500) {
      // hits side of net
      ball.x = 480;
      ball.velocityX = ball.velocityX >= 0 ? -ball.velocityX : ball.velocityX;
    } else {
      ball.x = 520;
      ball.velocityX = ball.velocityX <= 0 ? -ball.velocityX : ball.velocityX;
    }
  }

  // Check for end of point
  if (ball.y < 0) {
    if (ball.x > 500) {
      leftWon = true;
      slimeLeftScore++;
      // slimeRightScore -= slimeRightScore ? 1 : 0;
    } else {
      leftWon = false;
      // slimeLeftScore -= slimeLeftScore ? 1 : 0;
      slimeRightScore++;
    }
    endPoint();
    return true;
  }
  return false;
}
function updateFrame() {
  if (onePlayer) {
    slimeAI.move(false); // Move the right slime
    updateSlimeVelocitiesWithDoubleKeys(
      slimeLeft,
      KEY_A,
      KEY_LEFT,
      KEY_D,
      KEY_RIGHT,
      KEY_W,
      KEY_UP,
    );
    updateSlimeVelocities(slimeRight, slimeAI.movement, slimeAI.jumpSet);
  } else {
    updateSlimeVelocitiesWithKeys(slimeLeft, KEY_A, KEY_D, KEY_W);
    updateSlimeVelocitiesWithKeys(slimeRight, KEY_LEFT, KEY_RIGHT, KEY_UP);
  }

  updateSlime(slimeLeft, 50, 445);
  updateSlime(slimeRight, 555, 950);

  // Allows slimes to go accross the net
  // updateSlime(slimeLeft, 0, 1000);
  // updateSlime(slimeRight, 0, 1000);

  if (updateBall()) {
    return;
  }
}

function renderPoints(score, initialX, xDiff) {
  ctx.fillStyle = '#ff0';
  var x = initialX;
  for (var i = 0; i < score; i++) {
    ctx.beginPath();
    ctx.arc(x, 25, 12, 0, TWO_PI);
    ctx.fill();
    x += xDiff;
  }
  ctx.strokeStyle = backTextColor;
  ctx.lineWidth = 2;
  x = initialX;
  for (var i = 0; i < WIN_AMOUNT; i++) {
    ctx.beginPath();
    ctx.arc(x, 25, 12, 0, TWO_PI);
    ctx.stroke();
    x += xDiff;
  }
}

// Rendering Functions
function renderBackground() {
  if (legacyGraphics) {
    ctx.fillStyle = legacySkyColor;
    ctx.fillRect(0, 0, viewWidth, courtYPix);
    ctx.fillStyle = legacyGroundColor;
  } else {
    ctx.drawImage(backImage, 0, 0);
    ctx.fillStyle = newGroundColor;
  }
  ctx.fillRect(0, courtYPix, viewWidth, viewHeight - courtYPix);
  ctx.fillStyle = '#fff';
  ctx.fillRect(
    viewWidth / 2 - 2,
    (7 * viewHeight) / 10,
    4,
    viewHeight / 10 + 5,
  );
  // render scores
  renderPoints(slimeLeftScore, 30, 40);
  renderPoints(slimeRightScore, viewWidth - 30, -40);
}

// GAME CODE
function renderGame() {
  if (updatesToPaint == 0) {
    console.log('ERROR: render called but not ready to paint');
  } else {
    if (updatesToPaint > 1) {
      console.log(
        'WARNING: render missed ' + (updatesToPaint - 1) + ' frame(s)',
      );
    }
    renderBackground();
    ctx.fillStyle = '#000';
    //ctx.font = "20px Georgia";
    //ctx.fillText("Score: " + slimeLeftScore, 140, 20);
    //ctx.fillText("Score: " + slimeRightScore, viewWidth - 230, 20);
    ball.render();
    slimeLeft.render();
    slimeRight.render();
    updatesToPaint = 0;
  }
}
function renderEndOfPoint() {
  var textWidth = ctx.measureText(endOfPointText).width;
  renderGame();
  ctx.fillStyle = '#000';
  ctx.fillText(
    endOfPointText,
    (viewWidth - textWidth) / 2,
    courtYPix + (viewHeight - courtYPix) / 2,
  );
}
function startNextPoint() {
  initRound(leftWon);
  updatesToPaint = 0;
  updateCount = 0;
  gameState = GAME_STATE_RUNNING;
}
function endPoint() {
  if (slimeAI) {
    keysDown[KEY_UP] = false;
    keysDown[KEY_RIGHT] = false;
    keysDown[KEY_LEFT] = false;
  }

  if (slimeLeftScore >= WIN_AMOUNT) {
    endMatch(true);
    return;
  }
  if (slimeRightScore >= WIN_AMOUNT) {
    endMatch(false);
    return;
  }

  if (onePlayer) {
    if (leftWon) {
      endOfPointText = 'Nice, you got the point!';
    } else {
      endOfPointText = slimeAI.name + ' scores!';
    }
  } else {
    endOfPointText = 'Player ' + (leftWon ? '1' : '2') + ' scores!';
  }
  gameState = GAME_STATE_POINT_PAUSE;
  requestAnimationFrame(renderEndOfPoint);

  setTimeout(function () {
    if (gameState == GAME_STATE_POINT_PAUSE) {
      startNextPoint();
    }
  }, 700);
}
function initRound(server) {
  ball = {
    x: server ? 200 : 800,
    y: 356,
    velocityX: 0,
    velocityY: 0,
    radius: 10,
  };
  slimeLeft = { x: 200, y: 0, velocityX: 0, velocityY: 0, radius: 30 };
  slimeRight = { x: 800, y: 0, velocityX: 0, velocityY: 0, radius: 30 };
}
