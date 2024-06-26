import { ballRadius } from "./index.js";
import vector2 from "./vector2.js";

export const clamp = (min, max, value) => {
  if (value < min) return min;
  if (value > max) return max;
  return value;
};

export const clamp01 = (value) => {
  return clamp(0, 1, value);
};

export const lerp = (a, b, t) => {
  return a + (b - a) * clamp01(t);
};

export const ilerp = (a, b, t) => {
  if (a != b) {
    return clamp01((t - a) / (b - a));
  } else {
    return 0;
  }
};

export const ilerpUnclamped = (a, b, t) => {
  if (a != b) {
    return (t - a) / (b - a);
  } else {
    return 0;
  }
};

/**
 * @param {vector2} point
 * @param {vector2} lineStart
 * @param {vector2} lineEnd
 * @returns
 */
export const distToSegment = (point, lineStart, lineEnd) => {
  var dx = lineEnd.x - lineStart.x;
  var dy = lineEnd.y - lineStart.y;
  var l2 = dx * dx + dy * dy;

  if (l2 == 0) {
    return point.distance(lineStart);
  }

  var t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / l2;
  t = Math.max(0, Math.min(1, t));

  return vector2.distance(
    point.x,
    point.y,
    lineStart.x + t * dx,
    lineStart.y + t * dy
  );
};

export const doesRayInterceptCircle = (rayStart, rayEnd, circle, radius) => {
  const dx = rayEnd.x - rayStart.x;
  const dy = rayEnd.y - rayStart.y;
  const u = Math.min(
    1,
    Math.max(
      0,
      ((circle.x - rayStart.x) * dx + (circle.y - rayStart.y) * dy) /
        (dy * dy + dx * dx)
    )
  );
  const nx = rayStart.x + dx * u - circle.x;
  const ny = rayStart.y + dy * u - circle.y;
  return nx * nx + ny * ny < radius * radius;
};
export const rayDistanceToCircle = (rayStart, rayEnd, circle, radius) => {
  const dx = rayEnd.x - rayStart.x;
  const dy = rayEnd.y - rayStart.y;
  const vcx = rayStart.x - circle.x;
  const vcy = rayStart.y - circle.y;
  var v = (vcx * dx + vcy * dy) * (-2 / Math.hypot(dx, dy));
  const dd = v * v - 4 * (vcx * vcx + vcy * vcy - radius * radius);
  if (dd <= 0) {
    return Infinity;
  }
  return (v - Math.sqrt(dd)) / 2;
};

export const getBallCollisionData = (
  ballALocation,
  ballAVelocity,
  ballBLocation,
  ballBVelocity
) => {
  const ballMass = 1;

  const distance = ballALocation.distance(ballBLocation);

  const diff = new vector2(
    ballBLocation.x - ballALocation.x,
    ballBLocation.y - ballALocation.y
  );

  const normal = diff.divide(distance);

  const tangent = new vector2(-normal.y, normal.x);

  const dotProductTangent1 =
    ballAVelocity.x * tangent.x + ballAVelocity.y * tangent.y;
  const dotProductTangent2 =
    ballBVelocity.x * tangent.x + ballBVelocity.y * tangent.y;

  const dotProductNormal1 =
    ballAVelocity.x * normal.x + ballAVelocity.y * normal.y;
  const dotProductNormal2 =
    ballBVelocity.x * normal.x + ballBVelocity.y * normal.y;

  const momentum1 =
    (dotProductNormal1 * (ballMass - ballMass) +
      2 * ballMass * dotProductNormal2) /
    (ballMass + ballMass);
  const momentum2 =
    (dotProductNormal2 * (ballMass - ballMass) +
      2 * ballMass * dotProductNormal1) /
    (ballMass + ballMass);

  const overlap = 0.5 * (ballRadius + ballRadius - distance);

  return {
    ballAVelocity: new vector2(
      tangent.x * dotProductTangent1 + normal.x * momentum1,
      tangent.y * dotProductTangent1 + normal.y * momentum1
    ),
    ballBVelocity: new vector2(
      tangent.x * dotProductTangent2 + normal.x * momentum2,
      tangent.y * dotProductTangent2 + normal.y * momentum2
    ),
    ballANewLocation: ballALocation.minus(
      overlap * normal.x,
      overlap * normal.y
    ),
    ballBNewLocation: ballBLocation.add(overlap * normal.x, overlap * normal.y),
  };
};

// line intercept math by Paul Bourke http://paulbourke.net/geometry/pointlineplane/
// Determine the intersection point of two line segments
// Return null if the lines don't intersect
const doLinesIntersectRaw = (x1, y1, x2, y2, x3, y3, x4, y4) => {
  // Check if none of the lines are of length 0
  if ((x1 === x2 && y1 === y2) || (x3 === x4 && y3 === y4)) {
    return false;
  }

  let denominator = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);

  // Lines are parallel
  if (denominator === 0) {
    return null;
  }

  let ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denominator;
  let ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denominator;

  // is the intersection along the segments
  if (ua < 0 || ua > 1 || ub < 0 || ub > 1) {
    return null;
  }

  // Return a object with the x and y coordinates of the intersection
  let x = x1 + ua * (x2 - x1);
  let y = y1 + ua * (y2 - y1);

  return new vector2(x, y);
};

export const doLinesIntersect = (
  line1Start,
  line1End,
  line2Start,
  line2End
) => {
  return doLinesIntersectRaw(
    line1Start.x,
    line1Start.y,
    line1End.x,
    line1End.y,
    line2Start.x,
    line2Start.y,
    line2End.x,
    line2End.y
  );
};

export const repeat = (t, length) => {
  return clamp(0, length, t - Math.floor(t / length) * length);
};

export const deltaAngle = (current, target) => {
  let delta = repeat(target - current, 360);
  if (delta > 180) {
    delta -= 360;
  }
  return delta;
};
