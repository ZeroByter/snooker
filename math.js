import vector2 from "./vector2.js"

export const clamp = (min, max, value) => {
  if (value < min) return min
  if (value > max) return max
  return value
}

export const clamp01 = value => {
  return clamp(0, 1, value)
}

export const lerp = (a, b, t) => {
  return a + (b - a) * clamp01(t)
}

export const ilerp = (a, b, t) => {
  if (a != b) {
    return clamp01((t - a) / (b - a))
  } else {
    return 0
  }
}

export const ilerpUnclamped = (a, b, t) => {
  if (a != b) {
    return (t - a) / (b - a)
  } else {
    return 0
  }
}

/**
 * @param {vector2} point 
 * @param {vector2} lineStart 
 * @param {vector2} lineEnd 
 * @returns 
 */
export const distToSegment = (point, lineStart, lineEnd) => {
  var dx = lineEnd.x - lineStart.x;
  var dy = lineEnd.y - lineStart.y;
  var l2 = (dx * dx + dy * dy);

  if (l2 == 0) {
    return point.distance(lineStart)
  }

  var t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / l2;
  t = Math.max(0, Math.min(1, t));

  return vector2.distance(point.x, point.y, lineStart.x + t * dx, lineStart.y + t * dy);
}
