import vector2 from "./vector2.js"
import { ilerp, ilerpUnclamped } from "./math.js"

const canvas = document.querySelector("canvas")
const ctx = canvas.getContext("2d")

canvas.width = window.innerWidth
canvas.height = window.innerHeight

// main game loop stuff
let lastRanTime = 0
let unprocessed = 0
let secsPerTick = 1000 / 60
let ticks = 0

// some constants
const tableSize = 100

const ballRadius = 7
const holeRadius = ballRadius * 1.5
const ballMass = 1

let zoom = Math.min(canvas.width, canvas.height) / 100 / 2 - 0.5

const ballColors = ["#FD0F10", "#291DEC", "#FFFF00", "#FF00FF", "#A2402C", "#00FF00", "#F7931E"]
const availableBallColors = [...ballColors, ...ballColors]
let balls = []

const holes = []


const getBallColor = (isPlayer) => {
  if (isPlayer) {
    return "white"
  }

  if (availableBallColors.length == 0) {
    return "black"
  }

  const colorIndex = Math.floor(Math.random() * availableBallColors.length)
  const color = availableBallColors[colorIndex]
  availableBallColors.splice(colorIndex, 1)

  return color
}

const addBall = (x, y, isPlayer, isStripped) => {
  const newBall = {
    location: new vector2(x, y),
    velocity: new vector2(0, 0),
    isPlayer,
    isStripped,
    color: getBallColor(isPlayer)
  }

  balls.push(newBall)

  return newBall
}

for (let y = 0; y < 5; y++) {
  for (let x = 0; x < 6 - (y + 1); x++) {
    let i = x + y

    addBall(tableSize / 2 - (-(y - 4) / 2 * ballRadius) + x * ballRadius, tableSize * 0.33 + y * ballRadius * 0.78, false, balls.length < 7)
  }
}

const playerBall = addBall(tableSize / 2, tableSize * 2 * 0.76, true)

const addHole = (x, y) => {
  holes.push({
    location: new vector2(x, y)
  })
}

for (let y = 0; y < 3; y++) {
  for (let x = 0; x < 2; x++) {
    addHole(x * tableSize, y * tableSize)
  }
}

const getHoleNearBallLocation = (location) => {
  for (const hole of holes) {
    if (hole.location.distance(location) < ballRadius / 2 + holeRadius / 2) {
      return hole
    }
  }

  return null
}

canvas.addEventListener("mousedown", e => {
  const renderTableWidth = tableSize / 2 * zoom
  const renderTableHeight = tableSize * zoom

  const tableX = ilerpUnclamped(0, renderTableWidth * 2, e.clientX - canvas.width / 2 + renderTableWidth) * tableSize
  const tableY = ilerpUnclamped(0, renderTableHeight * 2, e.clientY - canvas.height / 2 + renderTableHeight) * tableSize * 2

  const tableLocation = new vector2(tableX, tableY)

  const dir = tableLocation.minus(playerBall.location).multiply(0.025)

  playerBall.velocity = dir
})

const think = () => {
  for (const ball of balls) {
    ball.location = ball.location.add(ball.velocity)

    for (const otherBall of balls) {
      if (ball == otherBall) {
        continue
      }

      const distance = ball.location.distance(otherBall.location)

      if (distance < ballRadius) {
        const dx = otherBall.location.x - ball.location.x
        const dy = otherBall.location.y - ball.location.y

        const normalX = dx / distance
        const normalY = dy / distance

        const tangentX = -normalY
        const tangentY = normalX

        const dotProductTangent1 = ball.velocity.x * tangentX + ball.velocity.y * tangentY
        const dotProductTangent2 = otherBall.velocity.x * tangentX + otherBall.velocity.y * tangentY

        const dotProductNormal1 = ball.velocity.x * normalX + ball.velocity.y * normalY
        const dotProductNormal2 = otherBall.velocity.x * normalX + otherBall.velocity.y * normalY

        const momentum1 = (dotProductNormal1 * (ballMass - ballMass) + 2 * ballMass * dotProductNormal2) / (ballMass + ballMass)
        const momentum2 = (dotProductNormal2 * (ballMass - ballMass) + 2 * ballMass * dotProductNormal1) / (ballMass + ballMass)

        ball.velocity = new vector2(
          tangentX * dotProductTangent1 + normalX * momentum1,
          tangentY * dotProductTangent1 + normalY * momentum1
        )
        otherBall.velocity = new vector2(
          tangentX * dotProductTangent2 + normalX * momentum2,
          tangentY * dotProductTangent2 + normalY * momentum2
        )

        const overlap = 0.5 * (ballRadius - distance)
        ball.location = ball.location.minus(overlap * normalX, overlap * normalY)
        otherBall.location = otherBall.location.add(overlap * normalX, overlap * normalY)
      }
    }

    const nearHole = getHoleNearBallLocation(ball.location)
    if (!nearHole) {
      //wall collisions
      if (ball.location.x - ballRadius / 2 < 0 || ball.location.x + ballRadius / 2 > tableSize) {
        ball.velocity.x = -ball.velocity.x
      }
      if (ball.location.y - ballRadius / 2 < 0 || ball.location.y + ballRadius / 2 > tableSize * 2) {
        ball.velocity.y = -ball.velocity.y
      }
    } else {
      if (nearHole.location.distance(ball.location) < holeRadius / 4) {
        balls = balls.filter(b => b != ball)
      }
    }

    ball.velocity = ball.velocity.multiply(0.985)
  }
}

const render = (time) => {
  ctx.fillStyle = "rgb(15,15,15)"
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.fillStyle = "#009245"
  ctx.fillRect(
    canvas.width / 2 - (tableSize / 2 * zoom),
    canvas.height / 2 - tableSize * zoom,
    tableSize * zoom,
    tableSize * 2 * zoom
  )

  ctx.fillStyle = "black"
  for (const hole of holes) {
    ctx.beginPath()
    ctx.arc(
      canvas.width / 2 - (tableSize / 2 * zoom) + hole.location.x * zoom,
      canvas.height / 2 - (tableSize * zoom) + hole.location.y * zoom,
      holeRadius,
      0,
      Math.PI * 2
    )
    ctx.fill()
  }

  for (const ball of balls) {
    ctx.fillStyle = ball.color
    ctx.beginPath()
    ctx.arc(
      canvas.width / 2 - (tableSize / 2 * zoom) + ball.location.x * zoom,
      canvas.height / 2 - (tableSize * zoom) + ball.location.y * zoom,
      ballRadius,
      0,
      Math.PI * 2
    )
    ctx.fill()

    if (ball.isStripped) {
      ctx.fillStyle = "white"
      ctx.beginPath()
      ctx.arc(
        canvas.width / 2 - (tableSize / 2 * zoom) + ball.location.x * zoom,
        canvas.height / 2 - (tableSize * zoom) + ball.location.y * zoom,
        ballRadius,
        Math.PI * 1.15,
        Math.PI * 1.85
      )
      ctx.fill()
      ctx.beginPath()
      ctx.arc(
        canvas.width / 2 - (tableSize / 2 * zoom) + ball.location.x * zoom,
        canvas.height / 2 - (tableSize * zoom) + ball.location.y * zoom,
        ballRadius,
        Math.PI * 0.15,
        Math.PI * 0.85
      )
      ctx.fill()
    }
  }
}

const mainLoop = (time) => {
  unprocessed += Math.min(60, (time - lastRanTime) / secsPerTick)
  lastRanTime = time

  while (unprocessed >= 1) {
    ticks++
    think(time)
    unprocessed -= 1
  }

  render(time)

  window.requestAnimationFrame((time) => {
    mainLoop(time)
  })
}

window.requestAnimationFrame(mainLoop)