import * as THREE from 'three';

export async function createSaturn(textureLoader) {
  const group = new THREE.Group();

  // Load all textures and wait for them
  const [saturnTexture, ringTexture] = await Promise.all([
    textureLoader.loadAsync('assets/textures/saturn.jpg'),
    textureLoader.loadAsync('assets/textures/saturn_ring.png')
  ]);

  // Saturn body
  const saturnGeometry = new THREE.SphereGeometry(1, 64, 64);
  const saturnMaterial = new THREE.MeshPhongMaterial({
    map: saturnTexture,
    shininess: 5
  });
  const saturnMesh = new THREE.Mesh(saturnGeometry, saturnMaterial);
  group.add(saturnMesh);

  // Rings
  const ringInner = 1.3;
  const ringOuter = 2.4;
  const ringGeometry = new THREE.RingGeometry(ringInner, ringOuter, 128);

  const pos = ringGeometry.attributes.position;
  const uv = ringGeometry.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const dist = Math.sqrt(x * x + y * y);
    uv.setXY(i, (dist - ringInner) / (ringOuter - ringInner), 0.5);
  }

  const ringMaterial = new THREE.MeshPhongMaterial({
    map: ringTexture,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85,
    depthWrite: false
  });
  const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
  ringMesh.rotation.x = -Math.PI / 2;
  group.add(ringMesh);

  // Front light so Saturn is always well-lit
  const frontLight = new THREE.DirectionalLight(0xfff5e0, 2.0);
  frontLight.position.set(5, 3, 10);
  group.add(frontLight);

  const ambientLight = new THREE.AmbientLight(0x666666, 0.5);
  group.add(ambientLight);

  // Axial tilt
  group.rotation.x = THREE.MathUtils.degToRad(-15);
  group.rotation.z = THREE.MathUtils.degToRad(26.7);

  return { group, saturnMesh, ringMesh };
}
