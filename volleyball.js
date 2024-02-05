// Sime volleyball object!

const { Vector } = p5;

let MAX_VELOCITY_Y = 22 * 60;
let MAX_VELOCITY_X = 15 * 60;

export class SVBGame {
  constructor({
    width,
    height,
    netHeight,
    slimeRad,
    ballRad,
    slimeSpeed,
    slimeJumpPower,
    gravity,
  }) {
    this.width = width;
    this.height = height;
    this.netHeight = netHeight; // Net height
    this.slimeRad = slimeRad; // Slime radius
    this.ballRad = ballRad; // Ball radius
    this.slimeSpeed = slimeSpeed; // Slime speed, in units per second
    this.slimeJumpPower = slimeJumpPower; // Slime intial jump velocity, in units per second
    this.gravity = gravity; // Global gravity, in units per second squared

    this.p0 = {
      pos: new Vector(width * 0.2, height),
      vel: new Vector(0, 0),
      horiz: 0,
      vert: 0,
    };
    this.p1 = {
      pos: new Vector(width * 0.8, height),
      vel: new Vector(0, 0),
      horiz: 0,
      vert: 0,
    };

    this.ball = {
      pos: new Vector(this.p0.pos.x, height / 2),
      vel: new Vector(0, 0),
      horiz: 0,
      vert: 0,
    };
  }

  update(dt) {
    // Update positions etc. using delta time
    for (let [player, minX, maxX] of [
      [this.p0, this.slimeRad, this.width / 2 - this.slimeRad],
      [this.p1, this.width / 2 + this.slimeRad, this.width - this.slimeRad],
    ]) {
      player.vel.x = player.horiz;
      if (player.pos.y === this.height)
        player.vel.y = -this.slimeJumpPower * player.vert;
      player.vel.y += this.gravity;
      player.pos.add(Vector.mult(player.vel, dt));

      // Constrain
      player.pos.x = Math.max(Math.min(player.pos.x, maxX), minX);
      player.pos.y = Math.min(player.pos.y, this.height);
    }

    // Ball updates
    this.ball.vel.y = Math.min(
      this.ball.vel.y + this.gravity * 0.5,
      MAX_VELOCITY_Y,
    );
    this.ball.pos.add(Vector.mult(this.ball.vel, dt));
    this.ball.pos.y = Math.min(this.ball.pos.y, this.height - this.ballRad);
    this.ball.pos.y = Math.max(this.ballRad, this.ball.pos.y);
    this.ball.pos.x = Math.max(0, Math.min(this.ball.pos.x, this.width));

    // Ball interactions with slimes
    // Derived from https://www.cwest.net/games/slime-volleyball
    let FUDGE = 5; // Not sure why this is needed

    for (let player of [this.p0, this.p1]) {
      let dPos = Vector.sub(this.ball.pos, player.pos);
      let dist = dPos.mag();
      if (dPos.y < 0 && dist <= this.slimeRad + this.ballRad && dist > FUDGE) {
        // Unintersect
        this.ball.pos.x =
          player.pos.x + ((this.ballRad + this.slimeRad) * dPos.x) / dist;
        this.ball.pos.y =
          player.pos.y + ((this.ballRad + this.slimeRad) * dPos.y) / dist;

        let dVel = Vector.sub(this.ball.vel, player.vel);
        let something = (dPos.x * dVel.x + dPos.y * dVel.y) / dist; // Dot product?

        if (something <= 0) {
          this.ball.vel.x +=
            player.vel.x * 0.001 - (2.1 * dPos.x * something) / dist;
          this.ball.vel.y +=
            player.vel.y * 0.001 - (2.1 * dPos.y * something) / dist;
          this.ball.vel.x = Math.max(
            Math.min(this.ball.vel.x, MAX_VELOCITY_X),
            -MAX_VELOCITY_X,
          );
          this.ball.vel.y = Math.max(
            Math.min(this.ball.vel.y, MAX_VELOCITY_Y),
            -MAX_VELOCITY_Y,
          );
        }
      }
    }
  }

  control(player, horiz, vert) {
    // Set player controls
    if (player === 0) {
      if (horiz !== null) this.p0.horiz = horiz * this.slimeSpeed;
      if (vert !== null) this.p0.vert = vert;
    }
    if (player === 1) {
      if (horiz !== null) this.p1.horiz = horiz * this.slimeSpeed;
      if (vert !== null) this.p1.vert = vert;
    }
  }

  display(p) {
    // Draw players
    p.ellipseMode(p.CENTER);
    p.fill('#57ba46');
    p.noStroke();
    p.arc(
      this.p0.pos.x,
      this.p0.pos.y,
      this.slimeRad * 2,
      this.slimeRad * 2,
      -p.PI,
      0,
    );
    p.fill('#ffffff');
    p.noStroke();
    p.arc(
      this.p1.pos.x,
      this.p1.pos.y,
      this.slimeRad * 2,
      this.slimeRad * 2,
      -p.PI,
      0,
    );

    // Draw ball
    p.fill('#fff');
    p.stroke('#808080');
    p.strokeWeight(1.5);
    p.ellipse(
      this.ball.pos.x,
      this.ball.pos.y,
      this.ballRad * 2,
      this.ballRad * 2,
    );

    // Draw net
    p.stroke('#ffffff');
    p.strokeWeight(5);
    p.line(
      this.width / 2,
      this.height - this.netHeight,
      this.width / 2,
      this.height + 5,
    );
  }
}
