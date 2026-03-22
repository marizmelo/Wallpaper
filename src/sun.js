import * as THREE from 'three';

// Returns a sun direction based on current time of day
// Noon = sun facing camera (full day), Midnight = sun behind Earth (full night)
export function getSunDirection() {
  const now = new Date();
  const hours = now.getHours() + now.getMinutes() / 60;

  // Map 24h to a full circle. Noon (12:00) = sun in front (+Z), Midnight (0:00) = sun behind (-Z)
  const angle = ((hours - 12) / 24) * Math.PI * 2;

  return new THREE.Vector3(
    Math.sin(angle) * 0.3,   // slight lateral drift
    0.15,                     // slightly above equator
    Math.cos(angle)           // main axis: +Z at noon, -Z at midnight
  ).normalize();
}

export function createSun() {
  const group = new THREE.Group();

  const dir = getSunDirection();
  const sunDistance = 50;

  // Directional light (sunlight)
  const sunLight = new THREE.DirectionalLight(0xfff5e0, 2.0);
  sunLight.position.copy(dir).multiplyScalar(sunDistance);
  group.add(sunLight);

  // Ambient light so dark side isn't pure black
  const ambientLight = new THREE.AmbientLight(0x111122, 0.15);
  group.add(ambientLight);

  // Sun glow sprite
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, 'rgba(255, 250, 230, 1)');
  gradient.addColorStop(0.15, 'rgba(255, 220, 150, 0.8)');
  gradient.addColorStop(0.4, 'rgba(255, 180, 80, 0.3)');
  gradient.addColorStop(1, 'rgba(255, 150, 50, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);

  const sunTexture = new THREE.CanvasTexture(canvas);
  const sunSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: sunTexture,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false
    })
  );
  sunSprite.position.copy(dir).multiplyScalar(sunDistance);
  sunSprite.scale.set(30, 30, 1);
  group.add(sunSprite);

  // Expose references for updating
  group.userData = { sunLight, sunSprite, sunDistance };

  return group;
}

export function updateSun(sunGroup, sunDir) {
  const { sunLight, sunSprite, sunDistance } = sunGroup.userData;
  sunLight.position.copy(sunDir).multiplyScalar(sunDistance);
  sunSprite.position.copy(sunDir).multiplyScalar(sunDistance);
}
