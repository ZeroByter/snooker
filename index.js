import vector2 from "./vector2.js";
import {
  doLinesIntersect,
  doesRayInterceptCircle,
  getBallCollisionData,
  ilerpUnclamped,
  lerp,
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

let isMouseDown = false;

let aimData = {
  direction: null,
  aimMouseStartAngle: null,
  aimMouseStartLocation: null,
}

let onMouseHoldTimeout = -1;
let isHoldingMouse = false;

const powerChargeArea = 200
const powerChargeMinLevel = 0.2
const powerChargeMaxLevel = 8

let powerChargeLevel = 0;
let powerChargeMouseStartLocation = null;

let gameState = "playing" // or "win" or "lose", too lazy to do proper enum sue me

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

window.addEventListener("resize", e => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  zoom = Math.min(canvas.width + 300, canvas.height) / 100 / 2 - 0.5;
})

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
    forceNextCollisionDirection: null,
  };

  balls.push(newBall);

  return newBall;
};

// for (let y = 0; y < 5; y++) {
//   for (let x = 0; x < 6 - (y + 1); x++) {
//     addBall(
//       tableSize / 2 +
//       (y - 4) * ((ballRadius * 2.25) / 2) +
//       x * ballRadius * 2.25,
//       tableSize * 0.33 + y * ballRadius * 2,
//       false,
//       balls.length < 7
//     );
//   }
// }

for (let i = 0; i < 2; i++) {
  addBall(Math.random() * 80 + 10, Math.random() * 180 + 10, false, false);
}

const playerBall = addBall(tableSize / 2, tableSize * 2 * 0.76, true);
let isAlive = true;

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

const areAllBallsStopped = () => {
  let totalBallsSpeed = 0;
  for (const ball of balls) {
    totalBallsSpeed += ball.velocity.magnitude()
  }

  return totalBallsSpeed < 0.01
}

const onMouseHold = (mouseLocation) => {
  isHoldingMouse = true;

  powerChargeLevel = 0
  powerChargeMouseStartLocation = mouseLocation
}

const onMouseUp = () => {
  clearTimeout(onMouseHoldTimeout)
  isMouseDown = false;

  if (isHoldingMouse) {
    playerBall.velocity = aimData.direction.multiply(powerChargeLevel)
    aimData.direction = null
  }

  isHoldingMouse = false;

  if (!areAllBallsStopped()) {
    return;
  }
};

canvas.addEventListener("mouseup", (e) => {
  onMouseUp()
})
canvas.addEventListener("touchend", e => {
  onMouseUp()
})

const initializeAiming = (x, y) => {
  const tableLocation = screenToTableLocation(x, y);
  aimData.direction = tableLocation.minus(playerBall.location).normalized()

  aimData.aimMouseStartAngle = aimData.direction.toAngle()
  aimData.aimMouseStartLocation = new vector2(x, y)
}

const onMouseDown = (mouseX, mouseY) => {
  if (!isAlive) {
    return null
  }

  isMouseDown = true;

  onMouseHoldTimeout = setTimeout(() => onMouseHold(new vector2(mouseX, mouseY)), 500)

  if (!areAllBallsStopped()) {
    return;
  }

  if (aimData.direction == null) {
    initializeAiming(mouseX, mouseY)
  }

  aimData.aimMouseStartAngle = aimData.direction.toAngle()
  aimData.aimMouseStartLocation = new vector2(mouseX, mouseY)
};

canvas.addEventListener("mousedown", (e) => {
  onMouseDown(e.clientX, e.clientY)
})
canvas.addEventListener("touchstart", e => {
  onMouseDown(e.touches[0].clientX, e.touches[0].clientY)
})

const onMouseMove = (mouseX, mouseY) => {
  if (!isAlive) {
    return null
  }

  if (isMouseDown) {
    clearTimeout(onMouseHoldTimeout)

    if (!areAllBallsStopped()) {
      return;
    }

    if (aimData.direction == null) {
      initializeAiming(mouseX, mouseY)
    }

    if (aimData.direction != null) {
      const mouseLocation = new vector2(mouseX, mouseY)
      if (isHoldingMouse) {
        powerChargeLevel = Math.min(1, mouseLocation.distance(powerChargeMouseStartLocation) / powerChargeArea) * powerChargeMaxLevel
      } else {
        const mouseMovement = mouseLocation.minus(aimData.aimMouseStartLocation)

        aimData.direction = vector2.fromAngle(aimData.aimMouseStartAngle - (mouseMovement.x / 180 * Math.PI * lerp(0, 20, 1 - mouseY / window.innerHeight)))
      }
    }
  }
}

canvas.addEventListener("mousemove", (e) => {
  onMouseMove(e.clientX, e.clientY)
})
canvas.addEventListener("touchmove", e => {
  onMouseMove(e.touches[0].clientX, e.touches[0].clientY)
})

const clearBallsForceNextCollisionDirection = () => {
  for (const ball of balls) {
    ball.forceNextCollisionDirection = null
  }
}

/**
 * @param {CanvasRenderingContext2D} ctx 
 * @param {vector2} start 
 * @param {vector2} direction 
 * @param {number} iteration 
 */
const drawLine = (ctx, lineStart, direction, iteration) => {
  if (iteration < 4) {
    let minimumLength = 80

    const lineEnd = lineStart.add(direction.multiply(minimumLength))

    // Begin detecting ball collisions
    let closestBallHit = null;
    let closestBallDistance = 1000;

    let hitHole = false;

    for (const hole of holes) {
      if (doesRayInterceptCircle(lineStart, lineEnd, hole.location, holeRadius + ballRadius)) {
        const rayDistance = rayDistanceToCircle(
          lineStart,
          lineEnd,
          hole.location,
          holeRadius + ballRadius
        );

        minimumLength = Math.min(minimumLength, rayDistance)

        hitHole = true
        break
      }
    }

    if (!hitHole) {
      for (const ball of balls) {
        if (ball.location.distance(lineStart) < ballRadius / 2) {
          continue
        }
        if (ball == playerBall) {
          continue;
        }

        if (
          doesRayInterceptCircle(
            lineStart,
            lineEnd,
            ball.location,
            ballRadius * 2
          )
        ) {
          const ballDistance = ball.location.distance(lineStart);

          if (closestBallHit == null || ballDistance < closestBallDistance) {
            closestBallHit = ball;
            closestBallDistance = ballDistance;
          }
        }
      }
    }

    if (closestBallHit) {
      const rayDistance = rayDistanceToCircle(
        lineStart,
        lineEnd,
        closestBallHit.location,
        ballRadius * 2
      );

      const hitPoint = lineStart.add(
        direction.multiply(rayDistance)
      );


      const collisionData = getBallCollisionData(
        hitPoint,
        direction,
        closestBallHit.location,
        closestBallHit.velocity
      );

      closestBallHit.forceNextCollisionDirection = collisionData.ballBVelocity.normalized();

      drawLine(
        ctx,
        closestBallHit.location,
        collisionData.ballBVelocity.normalized(),
        iteration + 1
      )

      minimumLength = Math.min(minimumLength, rayDistance)
    }
    // Finish detecting ball collisions

    // Begin detecting wall collisions
    if (closestBallHit == null && !hitHole) {
      const leftWallCollision = doLinesIntersect(lineStart, lineEnd, new vector2(), new vector2(0, tableSize * 2))
      if (leftWallCollision) {
        minimumLength = Math.min(minimumLength, lineStart.distance(leftWallCollision))
        drawLine(ctx, leftWallCollision.add(0.01, 0), new vector2(-direction.x, direction.y), iteration + 1)
      }
      const rightWallCollision = doLinesIntersect(lineStart, lineEnd, new vector2(tableSize, 0), new vector2(tableSize, tableSize * 2))
      if (rightWallCollision) {
        minimumLength = Math.min(minimumLength, lineStart.distance(rightWallCollision))
        drawLine(ctx, rightWallCollision.add(-0.01, 0), new vector2(-direction.x, direction.y), iteration + 1)
      }
      const topWallCollision = doLinesIntersect(lineStart, lineEnd, new vector2(0, 0), new vector2(tableSize, 0))
      if (topWallCollision) {
        minimumLength = Math.min(minimumLength, lineStart.distance(topWallCollision))
        drawLine(ctx, topWallCollision.add(0, 0.01), new vector2(direction.x, -direction.y), iteration + 1)
      }
      const bottomWallCollision = doLinesIntersect(lineStart, lineEnd, new vector2(0, tableSize * 2), new vector2(tableSize, tableSize * 2))
      if (bottomWallCollision) {
        minimumLength = Math.min(minimumLength, lineStart.distance(bottomWallCollision))
        drawLine(ctx, bottomWallCollision.add(0, -0.01), new vector2(direction.x, -direction.y), iteration + 1)
      }
    }
    // Finish detecting wall collisions

    const finalLineEnd = lineStart.add(direction.multiply(minimumLength))

    // Render power charge level on first projected line
    // if (isHoldingMouse && powerChargeLevel > powerChargeMinLevel && iteration == 0) {
    //   const powerChargeLineEnd = lineStart.add(direction.multiply(powerChargeLevel / powerChargeMaxLevel * minimumLength))
    //   ctx.strokeStyle = "rgba(255,0,0,0.6)"
    //   ctx.beginPath();
    //   ctx.lineWidth = 15
    //   ctx.moveTo(
    //     canvas.width / 2 - (tableSize / 2) * zoom + lineStart.x * zoom,
    //     canvas.height / 2 - tableSize * zoom + lineStart.y * zoom
    //   );
    //   ctx.lineTo(
    //     canvas.width / 2 - (tableSize / 2) * zoom + powerChargeLineEnd.x * zoom,
    //     canvas.height / 2 - tableSize * zoom + powerChargeLineEnd.y * zoom
    //   );
    //   ctx.stroke()
    // }

    ctx.strokeStyle = "white"
    ctx.lineWidth = 1
    ctx.beginPath();
    ctx.moveTo(
      canvas.width / 2 - (tableSize / 2) * zoom + lineStart.x * zoom,
      canvas.height / 2 - tableSize * zoom + lineStart.y * zoom
    );
    ctx.lineTo(
      canvas.width / 2 - (tableSize / 2) * zoom + finalLineEnd.x * zoom,
      canvas.height / 2 - tableSize * zoom + finalLineEnd.y * zoom
    );
    ctx.stroke()
  }
}

const think = () => {
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

        if (ball.forceNextCollisionDirection) {
          ball.velocity = ball.forceNextCollisionDirection.multiply(collisionData.ballAVelocity.magnitude())
        } else {
          ball.velocity = collisionData.ballAVelocity
        }

        if (otherBall.forceNextCollisionDirection) {
          otherBall.velocity = otherBall.forceNextCollisionDirection.multiply(collisionData.ballBVelocity.magnitude())
        } else {
          otherBall.velocity = collisionData.ballBVelocity
        }

        ball.forceNextCollisionDirection = null;
        otherBall.forceNextCollisionDirection = null;

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

      if (ball == playerBall) {
        gameState = "lose"
        isAlive = false;
      } else {
        if (balls.length == 1 && isAlive) {
          gameState = "win"
        }
      }
    }

    ball.velocity = ball.velocity.multiply(FRICTION_CONSTANT);
  }
};

const render = () => {
  ctx.fillStyle = "rgb(15,15,15)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const tablePadding = 10;
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

  if (aimData.direction != null) {
    clearBallsForceNextCollisionDirection()
    drawLine(ctx, playerBall.location, aimData.direction, 0)

    if (isHoldingMouse) {
      ctx.strokeStyle = `rgba(255,0,0,${powerChargeLevel > powerChargeMinLevel ? 1 : 0.75})`
      ctx.beginPath()
      ctx.arc(powerChargeMouseStartLocation.x, powerChargeMouseStartLocation.y, powerChargeMinLevel / powerChargeMaxLevel * powerChargeArea, 0, Math.PI * 2)
      ctx.stroke()

      if (powerChargeLevel > powerChargeMinLevel) {
        ctx.fillStyle = `rgba(255,0,0,0.25)`
        ctx.beginPath()
        ctx.arc(powerChargeMouseStartLocation.x, powerChargeMouseStartLocation.y, powerChargeLevel / powerChargeMaxLevel * powerChargeArea, 0, Math.PI * 2, false)
        ctx.arc(powerChargeMouseStartLocation.x, powerChargeMouseStartLocation.y, powerChargeMinLevel / powerChargeMaxLevel * powerChargeArea, 0, Math.PI * 2, true)
        ctx.fill()
      }

      ctx.beginPath()
      ctx.arc(powerChargeMouseStartLocation.x, powerChargeMouseStartLocation.y, powerChargeArea, 0, Math.PI * 2)
      ctx.stroke()
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

  ctx.textAlign = "center"

  if (gameState == "win") {
    ctx.font = "52px Arial"
    ctx.fillStyle = "black"
    ctx.fillText("You win!", canvas.width / 2, canvas.height / 2)

    ctx.font = "50px Arial"
    ctx.fillStyle = "white"
    ctx.fillText("You win!", canvas.width / 2, canvas.height / 2)

    ctx.font = "32px Arial"
    ctx.fillStyle = "black"
    ctx.fillText("yay", canvas.width / 2, canvas.height / 2 + 30)

    ctx.font = "30px Arial"
    ctx.fillStyle = "white"
    ctx.fillText("yay", canvas.width / 2, canvas.height / 2 + 30)
  } else if (gameState == "lose") {
    ctx.font = "52px Arial"
    ctx.fillStyle = "red"
    ctx.fillText("You lost!", canvas.width / 2, canvas.height / 2)

    ctx.font = "50px Arial"
    ctx.fillStyle = "white"
    ctx.fillText("You lost!", canvas.width / 2, canvas.height / 2)

    ctx.font = "32px Arial"
    ctx.fillStyle = "red"
    ctx.fillText("loser", canvas.width / 2, canvas.height / 2 + 30)

    ctx.font = "30px Arial"
    ctx.fillStyle = "white"
    ctx.fillText("loser", canvas.width / 2, canvas.height / 2 + 30)
  }
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
