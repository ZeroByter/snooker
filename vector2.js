export default class vector2 {
  constructor(x, y) {
    if (x != null && y == null) {
      this.y = x.y;
      this.x = x.x;
    } else {
      this.x = x || 0;
      this.y = y || 0;
    }
  }

  add = (x, y) => {
    if (y == null && x != null) {
      y = x.y;
      x = x.x;
    }

    return new vector2(this.x + x, this.y + y);
  };
  minus = (x, y) => {
    if (y == null && x != null) {
      y = x.y;
      x = x.x;
    }

    return new vector2(this.x - x, this.y - y);
  };
  multiply = (factor) => {
    return new vector2(this.x * factor, this.y * factor);
  };
  divide = (factor) => {
    return new vector2(this.x / factor, this.y / factor);
  };
  floor = () => {
    return new vector2(Math.floor(this.x), Math.floor(this.y));
  };
  ceil = () => {
    return new vector2(Math.ceil(this.x), Math.ceil(this.y));
  };
  round = () => {
    return new vector2(Math.round(this.x), Math.round(this.y));
  };
  magnitude = () => {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  };
  normalized = () => {
    const length = this.magnitude();
    return new vector2(this.x / length, this.y / length);
  };
  static distance = (x1, y1, x2, y2) => {
    return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
  };
  distance = (otherVector) => {
    return vector2.distance(this.x, this.y, otherVector.x, otherVector.y);
  };
  midWayTo = (otherVector) => {
    return new vector2(
      (this.x + otherVector.x) / 2,
      (this.y + otherVector.y) / 2
    );
  };
  toAngle = () => {
    let angle = (Math.atan2(this.x, this.y) / Math.PI) * 180;

    if (angle > 180) angle -= 360;
    if (angle < -180) angle += 360;

    return angle;
  };
  static fromAngle = (angle) => {
    if (angle > 180) angle -= 360;
    if (angle < -180) angle += 360;

    return new vector2(
      Math.sin((angle * Math.PI) / 180),
      Math.cos((angle * Math.PI) / 180)
    );
  };
  newVectorFromAngleAndDistance = (angle, length) => {
    return new vector2(
      this.x + Math.sin((angle * Math.PI) / 180) * length,
      this.y + Math.cos((angle * Math.PI) / 180) * length
    );
  };
  clone = () => {
    return new vector2(this.x, this.y);
  };
  equals = (otherVector) => {
    return this.x == otherVector.x && this.y == otherVector.y;
  };
}
