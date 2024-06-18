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
