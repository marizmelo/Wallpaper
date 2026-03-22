import * as THREE from 'three';

export class HolographicCamera {
  constructor(aspect) {
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    this.cameraDistance = 3;
    this.camera.position.set(0, 0, this.cameraDistance);
    this.camera.lookAt(0, 0, 0);

    // Max orbit angle in radians (~15 degrees)
    this.maxAngle = THREE.MathUtils.degToRad(15);
  }

  updateAspect(aspect) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  updateProjection(headX, headY) {
    // Orbit camera around the Earth based on head position
    const angleX = headX * this.maxAngle;
    const angleY = headY * this.maxAngle;

    this.camera.position.x = this.cameraDistance * Math.sin(angleX);
    this.camera.position.y = this.cameraDistance * Math.sin(angleY);
    this.camera.position.z = this.cameraDistance * Math.cos(angleX) * Math.cos(angleY);

    this.camera.lookAt(0, 0, 0);
  }
}
