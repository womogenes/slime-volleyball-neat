import { SVBGame } from './volleyball.js';

let width = 750,
  height = 300;
let groundHeight = 75;

let gameConfig = {
  width: 750,
  height: 300,
  groundHeight: 75,
  netHeight: 40,
  slimeRad: 75 / 2,
  ballRad: 13,
  slimeSpeed: 300,
  slimeJumpPower: 600,
  gravity: 30,
};

new p5((p) => {
  let game;

  p.setup = () => {
    p.createCanvas(width, height + groundHeight);
    p.frameRate(60);

    game = new SVBGame(gameConfig);
  };

  p.draw = () => {
    game.update(1 / 60);
    if (p.isKeyPressed) {
      if (p.keyIsDown(p.UP_ARROW)) {
        game.control(0, null, 1);
      }
      let isLeft = p.keyIsDown(p.LEFT_ARROW);
      let isRight = p.keyIsDown(p.RIGHT_ARROW);
      if (isLeft ^ isRight) {
        if (isLeft) game.control(0, -1, null);
        if (isRight) game.control(0, 1, null);
      } else {
        game.control(0, 0, null);
      }
    } else {
      game.control(0, 0, 0);
    }

    p.background('#d4e8f1');
    p.noStroke();
    p.fill('#ccaa66');
    p.rect(0, height, width, groundHeight);

    game.display(p);
  };

  p5.keyPressed = () => {};
}, 'sketch-container');
