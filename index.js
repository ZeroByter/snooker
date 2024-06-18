import vector2 from "./vector2.js";
import {
  doesRayInterceptCircle,
  getBallCollisionData,
  ilerpUnclamped,
  rayDistanceToCircle,
} from "./math.js";

const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// main game loop stuff
let lastRanTime = 0;
let unprocessed = 0;
let secsPerTick = 1000 / 60;
let ticks = 0;

let DEBUG_DRAW_LINES = [];

// some constants
const tableSize = 100;

const FRICTION_CONSTANT = 0.985;

export const ballRadius = 3;
const holeRadius = ballRadius * 1.5;

let ballCollisionQuery = null;
let ballCollisionResults = null;

let isMouseDown = false;
let mouseLocation = new vector2();

let zoom = Math.min(canvas.width + 300, canvas.height) / 100 / 2 - 0.5;

const ballColors = [
  "#FD0F10",
  "#291DEC",
  "#FFFF00",
  "#FF00FF",
  "#A2402C",
  "#00FF00",
  "#F7931E",
];
const availableBallColors = [...ballColors];
const availableStrippedBallColors = [...ballColors];
let balls = [];

const holes = [];

const getBallColor = (isPlayer, isStripped) => {
  if (isPlayer) {
    return "white";
  }

  const source = isStripped ? availableStrippedBallColors : availableBallColors;

  if (source.length == 0) {
    return "black";
  }

  const colorIndex = Math.floor(Math.random() * source.length);
  const color = source[colorIndex];
  source.splice(colorIndex, 1);

  return color;
};

const addBall = (x, y, isPlayer, isStripped) => {
  const newBall = {
    location: new vector2(x, y),
    velocity: new vector2(0, 0),
    isPlayer,
    isStripped,
    color: getBallColor(isPlayer, isStripped),
    forceNextCollisionVelocity: null,
  };

  balls.push(newBall);

  return newBall;
};

for (let y = 0; y < 5; y++) {
  for (let x = 0; x < 6 - (y + 1); x++) {
    addBall(
      tableSize / 2 +
        (y - 4) * ((ballRadius * 2.25) / 2) +
        x * ballRadius * 2.25,
      tableSize * 0.33 + y * ballRadius * 2,
      false,
      balls.length < 7
    );
  }
}

// for (let i = 0; i < 4; i++) {
//   addBall(Math.random() * 80 + 10, Math.random() * 180 + 10, false, false);
// }

const playerBall = addBall(tableSize / 2, tableSize * 2 * 0.76, true);

const queryBallCollision = (initialLocation, initialVelocity) => {
  ballCollisionQuery = {
    initialLocation,
    initialVelocity,
  };
};

const addHole = (x, y) => {
  holes.push({
    location: new vector2(x, y),
  });
};

for (let y = 0; y < 3; y++) {
  for (let x = 0; x < 2; x++) {
    addHole(x * tableSize, y * tableSize);
  }
}

const getHoleNearBallLocation = (location) => {
  for (const hole of holes) {
    if (hole.location.distance(location) < ballRadius / 1 + holeRadius / 1) {
      return hole;
    }
  }

  return null;
};

const screenToTableLocation = (x, y) => {
  const renderTableWidth = (tableSize / 2) * zoom;
  const renderTableHeight = tableSize * zoom;

  const tableX =
    ilerpUnclamped(
      0,
      renderTableWidth * 2,
      x - canvas.width / 2 + renderTableWidth
    ) * tableSize;
  const tableY =
    ilerpUnclamped(
      0,
      renderTableHeight * 2,
      y - canvas.height / 2 + renderTableHeight
    ) *
    tableSize *
    2;

  return new vector2(tableX, tableY);
};

canvas.addEventListener("mouseup", (e) => {
  const tableLocation = screenToTableLocation(e.clientX, e.clientY);

  const dir = tableLocation.minus(playerBall.location).multiply(0.035);

  playerBall.velocity = dir;

  isMouseDown = false;
});

canvas.addEventListener("mousedown", (e) => {
  isMouseDown = true;

  for (const ball of balls) {
    ball.velocity = new vector2();
  }
});

canvas.addEventListener("mousemove", (e) => {
  if (isMouseDown) {
    DEBUG_DRAW_LINES = [];

    const tableLocation = screenToTableLocation(e.clientX, e.clientY);

    const initialVelocity = tableLocation
      .minus(playerBall.location)
      .multiply(0.035);
    const normalizedInitialVelocity = initialVelocity.normalized();

    let simulatedVelocity = initialVelocity.clone();

    const rayEnd = playerBall.location.add(
      normalizedInitialVelocity.multiply(300)
    );

    let closestBallHit = null;
    let closestBallDistance = 1000;

    const refinedBallRadius = ballRadius * 2;

    for (const ball of balls) {
      if (ball == playerBall) {
        continue;
      }

      if (
        doesRayInterceptCircle(
          playerBall.location,
          rayEnd,
          ball.location,
          refinedBallRadius
        )
      ) {
        const ballDistance = ball.location.distance(playerBall.location);

        if (closestBallHit == null || ballDistance < closestBallDistance) {
          closestBallHit = ball;
          closestBallDistance = ballDistance;
        }
      }
    }

    if (closestBallHit) {
      const rayDistance = rayDistanceToCircle(
        playerBall.location,
        rayEnd,
        closestBallHit.location,
        refinedBallRadius
      );

      const hitPoint = playerBall.location.add(
        normalizedInitialVelocity.multiply(rayDistance)
      );

      DEBUG_DRAW_LINES.push([playerBall.location, hitPoint]);

      // simulatedVelocity = simulatedVelocity.multiply(
      //   FRICTION_CONSTANT ** rayDistance
      // );

      const collisionData = getBallCollisionData(
        hitPoint,
        simulatedVelocity,
        closestBallHit.location,
        closestBallHit.velocity
      );

      closestBallHit.forceNextCollisionVelocity = collisionData.ballBVelocity;

      DEBUG_DRAW_LINES.push([
        closestBallHit.location,
        closestBallHit.location.add(
          collisionData.ballBVelocity.normalized().multiply(100)
        ),
      ]);
    }
  }
});

const caluclateSimulatedBallCollision = () => {
  ballCollisionQuery = null;
};

const think = () => {
  if (ballCollisionQuery) {
    caluclateSimulatedBallCollision();
  }

  for (const ball of balls) {
    ball.location = ball.location.add(ball.velocity);

    for (const otherBall of balls) {
      if (ball == otherBall) {
        continue;
      }

      const distance = ball.location.distance(otherBall.location);

      if (distance < ballRadius + ballRadius) {
        const collisionData = getBallCollisionData(
          ball.location,
          ball.velocity,
          otherBall.location,
          otherBall.velocity
        );

        ball.velocity =
          ball.forceNextCollisionVelocity ?? collisionData.ballAVelocity;
        otherBall.velocity =
          otherBall.forceNextCollisionVelocity ?? collisionData.ballBVelocity;

        ball.forceNextCollisionVelocity = null;
        otherBall.forceNextCollisionVelocity = null;

        ball.location = collisionData.ballANewLocation;
        otherBall.location = collisionData.ballBNewLocation;
      }
    }

    if (
      ball.location.x - ballRadius < 0 ||
      ball.location.x + ballRadius > tableSize
    ) {
      ball.velocity.x = -ball.velocity.x;
    }
    if (
      ball.location.y - ballRadius < 0 ||
      ball.location.y + ballRadius > tableSize * 2
    ) {
      ball.velocity.y = -ball.velocity.y;
    }

    const nearHole = getHoleNearBallLocation(ball.location);
    if (nearHole) {
      balls = balls.filter((b) => b != ball);
    }

    ball.velocity = ball.velocity.multiply(FRICTION_CONSTANT);
  }
};

const render = () => {
  ctx.fillStyle = "rgb(15,15,15)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const tablePadding = 5;
  ctx.fillStyle = "#007030";
  ctx.fillRect(
    canvas.width / 2 - ((tableSize + tablePadding) / 2) * zoom,
    canvas.height / 2 - (tableSize + tablePadding / 2) * zoom,
    (tableSize + tablePadding) * zoom,
    (tableSize + tablePadding / 2) * 2 * zoom
  );

  ctx.fillStyle = "#009245";
  ctx.fillRect(
    canvas.width / 2 - (tableSize / 2) * zoom,
    canvas.height / 2 - tableSize * zoom,
    tableSize * zoom,
    tableSize * 2 * zoom
  );

  ctx.fillStyle = "black";
  for (const hole of holes) {
    ctx.beginPath();
    ctx.arc(
      canvas.width / 2 - (tableSize / 2) * zoom + hole.location.x * zoom,
      canvas.height / 2 - tableSize * zoom + hole.location.y * zoom,
      holeRadius * zoom,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  for (const ball of balls) {
    ctx.fillStyle = ball.color;

    ctx.beginPath();
    ctx.arc(
      canvas.width / 2 - (tableSize / 2) * zoom + ball.location.x * zoom,
      canvas.height / 2 - tableSize * zoom + ball.location.y * zoom,
      ballRadius * zoom,
      0,
      Math.PI * 2
    );
    ctx.fill();

    if (ball.isStripped) {
      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.arc(
        canvas.width / 2 - (tableSize / 2) * zoom + ball.location.x * zoom,
        canvas.height / 2 - tableSize * zoom + ball.location.y * zoom,
        ballRadius * zoom,
        Math.PI * 1.15,
        Math.PI * 1.85
      );
      ctx.fill();
      ctx.beginPath();
      ctx.arc(
        canvas.width / 2 - (tableSize / 2) * zoom + ball.location.x * zoom,
        canvas.height / 2 - tableSize * zoom + ball.location.y * zoom,
        ballRadius * zoom,
        Math.PI * 0.15,
        Math.PI * 0.85
      );
      ctx.fill();
    }
  }

  ctx.strokeStyle = "white";
  for (const [lineStart, lineEnd] of DEBUG_DRAW_LINES) {
    ctx.beginPath();
    ctx.moveTo(
      canvas.width / 2 - (tableSize / 2) * zoom + lineStart.x * zoom,
      canvas.height / 2 - tableSize * zoom + lineStart.y * zoom
    );
    ctx.lineTo(
      canvas.width / 2 - (tableSize / 2) * zoom + lineEnd.x * zoom,
      canvas.height / 2 - tableSize * zoom + lineEnd.y * zoom
    );
    ctx.stroke();
  }

  // TODO: render player ball trajectory, need to calculate first...
};

const mainLoop = (time) => {
  unprocessed += Math.min(60, (time - lastRanTime) / secsPerTick);
  lastRanTime = time;

  while (unprocessed >= 1) {
    ticks++;
    think(time);
    unprocessed -= 1;
  }

  render(time);

  window.requestAnimationFrame((time) => {
    mainLoop(time);
  });
};

window.requestAnimationFrame(mainLoop);
