export class HeadSmoother {
  constructor(lerpFactor = 0.08) {
    this.targetX = 0;
    this.targetY = 0;
    this.targetZ = 1;
    this.currentX = 0;
    this.currentY = 0;
    this.currentZ = 1;
    this.lerpFactor = lerpFactor;
    this.hasTarget = false;
  }

  setTarget(x, y, z) {
    this.targetX = x;
    this.targetY = y;
    this.targetZ = z;
    this.hasTarget = true;
  }

  update(deltaTime) {
    // Frame-rate independent exponential smoothing
    const factor = 1 - Math.pow(1 - this.lerpFactor, deltaTime * 60);

    this.currentX += (this.targetX - this.currentX) * factor;
    this.currentY += (this.targetY - this.currentY) * factor;
    this.currentZ += (this.targetZ - this.currentZ) * factor;

    return {
      x: this.currentX,
      y: this.currentY,
      z: this.currentZ
    };
  }
}
