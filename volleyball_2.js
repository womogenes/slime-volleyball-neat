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

var logString;
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
  var dx = 2 * (ball.x - s.x);
  var dy = ball.y - s.y;
  var dist = Math.trunc(Math.sqrt(dx * dx + dy * dy));

  var dVelocityX = ball.velocityX - s.velocityX;
  var dVelocityY = ball.velocityY - s.velocityY;

  if (dy > 0 && dist < ball.radius + s.radius && dist > FUDGE) {
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

function gameIteration() {
  if (gameState == GAME_STATE_RUNNING) {
    updateCount++;
    if (slowMotion && updateCount % 2 == 0) return;
    if (updatesToPaint > 0) {
      console.log('WARNING: updating frame before it was rendered');
    }
    if (physicsLog > 0) {
      log('Frame');
      log(' ball.x  ' + ball.x);
      log(' ball.y  ' + ball.y);
      log(' ball.vx ' + ball.velocityX);
      log(' ball.vy ' + ball.velocityY);
      physicsLog--;
      if (physicsLog == 0) {
        var logDom = document.createElement('pre');
        logDom.innerHTML = logString;
        document.body.appendChild(logDom);
      }
    }
    updateFrame();
    updatesToPaint++;
    if (updatesToPaint == 1) {
      requestAnimationFrame(renderGame);
    }
  }
}

function spaceKeyDown() {
  if (gameState == GAME_STATE_SHOW_WINNER) {
    if (onePlayer && nextSlimeIndex >= slimeAIs.length) {
      nextSlimeIndex = 0;
      toInitialMenu();
    } else {
      start(onePlayer);
    }
  }
}
function endMatch() {
  gameState = GAME_STATE_SHOW_WINNER;
  clearInterval(gameIntervalObject);
  var heading, message;
  if (onePlayer) {
    if (leftWon) {
      nextSlimeIndex++;
      if (nextSlimeIndex >= slimeAIs.length) {
        heading = 'You beat everyone!';
        message = 'Press "space" to do it all over again!';
      } else {
        heading = 'You won!';
        message = 'Press "space" to continue\u2026';
      }
    } else {
      // nextSlimeIndex = 0;
      heading = 'You lost \uD83D\uDE1E';
      message = 'Press "space" to retry\u2026';
    }
  } else {
    heading = 'Player ' + (leftWon ? 1 : 2) + ' Wins!';
    message = 'Press "space" for rematch\u2026';
  }
  menuDiv.innerHTML = '';
  menuDiv.style.display = 'block';
  menuDiv.appendChild(
    JS.dom({
      _: 'div',
      cls: 'text-center',
      $: [
        { _: 'h1', style: { margin: '50px 0 20px 0' }, text: heading },
        { _: 'span', text: message },
      ],
    }),
  );
  canvas.style.display = 'none';
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
  JS.extend(ball, {
    x: server ? 200 : 800,
    y: 356,
    velocityX: 0,
    velocityY: 0,
  });
  JS.extend(slimeLeft, { x: 200, y: 0, velocityX: 0, velocityY: 0 });
  JS.extend(slimeRight, { x: 800, y: 0, velocityX: 0, velocityY: 0 });
}

function updateWindowSize(width, height) {
  viewWidth = width;
  viewHeight = height;
  console.log('ViewSize x: ' + width + ', y: ' + height);
  pixelsPerUnitX = width / gameWidth;
  pixelsPerUnitY = height / gameHeight;
  console.log('GAMESIZE x: ' + gameWidth + ', y: ' + gameHeight);
  console.log('PPU      x: ' + pixelsPerUnitX + ', y: ' + pixelsPerUnitY);
  courtYPix = (4 * viewHeight) / 5;
}

function setupView(view) {
  JS.extend(view.style, { position: 'absolute', left: 0, top: 0 });
}

function bodyload() {
  var contentDiv = document.getElementById('GameContentDiv');

  // Create Render objects
  canvas = document.createElement('canvas');
  canvas.width = 750;
  canvas.height = 375;
  setupView(canvas, true);
  canvas.style.display = 'none';

  ctx = canvas.getContext('2d');
  ctx.font = '20px Georgia';

  gameWidth = 1000;
  gameHeight = 1000;

  // Setup Render Data
  updateWindowSize(canvas.width, canvas.height);
  contentDiv.appendChild(canvas);

  // Create Menu Objects
  menuDiv = document.createElement('div');
  setupView(menuDiv, false);
  JS.extend(menuDiv.style, {
    width: '750px',
    height: '375px',
    background: "#ca6 url('" + IMAGE_ROOT_PATH + "sky2.jpg') no-repeat",
    borderRadius: '10px',
    boxShadow: '0 40px 80px -20px',
  });
  contentDiv.appendChild(menuDiv);

  // Create options menu div
  smallMenuDiv = document.createElement('div');
  smallMenuDiv.style.position = 'absolute';

  // Initialize Logging
  logString = '';

  // Initialize Game Data
  nextSlimeIndex = 0;
  ball = newLegacyBall(25, '#ff0');
  slimeLeft = newLegacySlime(true, 100, '#0f0');
  slimeRight = newLegacySlime(false, 100, '#f00');

  var localSkyImage = new Image();
  localSkyImage.src = IMAGE_ROOT_PATH + 'sky2.jpg';
  localSkyImage.onload = function () {
    backImages.sky = this;
  };
  var localCaveImage = new Image();
  localCaveImage.src = IMAGE_ROOT_PATH + 'cave.jpg';
  localCaveImage.onload = function () {
    backImages.cave = this;
  };
  var sunsetImage = new Image();
  sunsetImage.src = IMAGE_ROOT_PATH + 'sunset.jpg';
  sunsetImage.onload = function () {
    backImages.sunset = this;
  };

  var localBallImage = new Image();
  localBallImage.src = IMAGE_ROOT_PATH + 'vball.png';
  localBallImage.onload = function () {
    ballImage = this;
  };

  greenSlimeImage = new Image();
  greenSlimeImage.src = IMAGE_ROOT_PATH + 'slime175green.png';
  /*
  greenSlimeImage.onload = function() {
    slimeLeft.img = this;
  }
  */
  redSlimeImage = new Image();
  redSlimeImage.src = IMAGE_ROOT_PATH + 'slime175red.png';
  /*
  redSlimeImage.onload = function() {
    slimeRight.img = this;
  }
  */

  toInitialMenu();
}

// Menu Functions
function start(startAsOnePlayer) {
  onePlayer = startAsOnePlayer;

  slimeLeftScore = 0;
  slimeRightScore = 0;

  slimeLeft.img = greenSlimeImage;
  if (onePlayer) {
    var slimeAIProps = slimeAIs[nextSlimeIndex];
    slimeRight.color = slimeAIProps.color;
    legacySkyColor = slimeAIProps.legacySkyColor;
    backImage = backImages[slimeAIProps.backImageName];
    backTextColor = slimeAIProps.backTextColor;
    legacyGroundColor = slimeAIProps.legacyGroundColor;
    legacyBallColor = slimeAIProps.legacyBallColor;
    newGroundColor = slimeAIProps.newGroundColor;

    slimeRight.img = null;
    slimeAI = newSlimeAI(false, slimeAIProps.name);
    slimeAIProps.initAI(slimeAI);
  } else {
    legacySkyColor = '#00f';
    backImage = backImages.sky;
    backTextColor = '#000';
    legacyGroundColor = '#888';
    legacyBallColor = '#fff';
    newGroundColor = '#ca6';

    slimeRight.img = redSlimeImage;
    slimeAI = null;
  }

  initRound(true);

  updatesToPaint = 0;
  updateCount = 0;
  loadOptions();
  gameState = GAME_STATE_RUNNING;
  renderBackground(); // clear the field
  canvas.style.display = 'block';
  menuDiv.style.display = 'none';
  gameIntervalObject = setInterval(gameIteration, 20);
}
function toInitialMenu() {
  menuDiv.innerHTML = '';
  menuDiv.appendChild(
    JS.dom({
      _: 'div',
      style: { textAlign: 'center' },
      $: [
        { _: 'h1', style: { marginTop: '30px' }, text: 'Slime Volleyball' },
        {
          _: 'span',
          onclick: JS.partial(start, [true]),
          cls: 'btn',
          style: {
            display: 'inline-block',
            margin: '20px 30px',
            fontSize: '40px',
          },
          text: 'One Player',
        },
        {
          _: 'span',
          onclick: JS.partial(start, [false]),
          cls: 'btn',
          style: {
            display: 'inline-block',
            margin: '20px 30px',
            fontSize: '40px',
          },
          text: 'Two Players',
        },
        {
          _: 'p',
          $: [
            'Originally written by Quin Pendragon and Daniel Wedge (',
            {
              _: 'a',
              href: 'http://oneslime.net',
              target: '_blank',
              text: 'oneslime.net',
            },
            ')',
            { _: 'br' },
            'Rewritten by Jonathan Marler (',
            {
              _: 'a',
              href: 'https://github.com/marler8997/SlimeJavascript',
              target: '_blank',
              text: 'GitHub',
            },
            ')',
            { _: 'br' },
            'Slightly modified and simply hosted by Chris West (',
            {
              _: 'a',
              href: location.origin,
              target: '_blank',
              text: location.origin.replace(/^https?:\/\//, ''),
            },
            ')',
          ],
        },
      ],
    }),
  );
}
function loadOptions() {
  legacyGraphics = document.getElementById('LegacyGraphics').checked;
  slowMotion = document.getElementById('SlowMotion').checked;
  physicsLog = document.getElementById('PhysicsLog').checked ? 120 : 0;
}
function showOptions() {
  if (gameState == GAME_STATE_RUNNING) {
    gameState = GAME_STATE_MENU_PAUSE;
  } else if (gameState == GAME_STATE_POINT_PAUSE) {
    gameState = GAME_STATE_MENU_PAUSE_BETWEEN_POINTS;
  }
  document.getElementById('OptionsDiv').style.display = 'block';
}
function hideOptions() {
  document.getElementById('OptionsDiv').style.display = 'none';
  if (gameState == GAME_STATE_MENU_PAUSE) {
    updateCount = 0;
    gameState = GAME_STATE_RUNNING;
  } else if (gameState == GAME_STATE_MENU_PAUSE_BETWEEN_POINTS) {
    startNextPoint();
  }
  loadOptions();
}

$(bodyload);
