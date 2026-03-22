import * as THREE from 'three';

const earthVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const earthFragmentShader = `
  uniform sampler2D dayMap;
  uniform sampler2D nightMap;
  uniform sampler2D specularMap;
  uniform vec3 sunDirection;
  uniform float uOpacity;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec3 normal = normalize(vNormal);
    float NdotL = dot(normal, sunDirection);

    // Smooth transition between day and night
    float dayFactor = smoothstep(-0.15, 0.3, NdotL);

    vec3 dayColor = texture2D(dayMap, vUv).rgb;
    vec3 nightColor = texture2D(nightMap, vUv).rgb;

    // Boost night lights intensity
    nightColor *= 1.8;

    // Blend day and night
    vec3 color = mix(nightColor, dayColor, dayFactor);

    // Add diffuse lighting to day side
    float diffuse = max(NdotL, 0.0);
    color *= mix(0.05, 1.0, diffuse * dayFactor + (1.0 - dayFactor) * 0.05);

    // Add slight specular on day side (oceans)
    float spec = texture2D(specularMap, vUv).r;
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    vec3 halfDir = normalize(sunDirection + viewDir);
    float specular = pow(max(dot(normal, halfDir), 0.0), 20.0) * spec * dayFactor * 0.4;
    color += vec3(specular);

    // Brighten night lights on the dark side (emissive)
    color += nightColor * (1.0 - dayFactor) * 0.8;

    gl_FragColor = vec4(color, uOpacity);
  }
`;

export async function createEarth(textureLoader) {
  const group = new THREE.Group();

  // Load all textures and wait for them
  const [dayTexture, nightTexture, specularTexture, cloudTexture] = await Promise.all([
    textureLoader.loadAsync('assets/textures/earth_daymap.jpg'),
    textureLoader.loadAsync('assets/textures/earth_nightmap.jpg'),
    textureLoader.loadAsync('assets/textures/earth_specular.jpg'),
    textureLoader.loadAsync('assets/textures/earth_clouds.jpg')
  ]);

  // Sun direction will be updated each frame from app.js
  const sunDir = new THREE.Vector3(0, 0, 1);

  // Earth with custom day/night shader
  const earthGeometry = new THREE.SphereGeometry(1, 64, 64);
  const earthMaterial = new THREE.ShaderMaterial({
    uniforms: {
      dayMap: { value: dayTexture },
      nightMap: { value: nightTexture },
      specularMap: { value: specularTexture },
      sunDirection: { value: sunDir },
      uOpacity: { value: 0.0 }
    },
    vertexShader: earthVertexShader,
    fragmentShader: earthFragmentShader,
    transparent: true
  });
  const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
  group.add(earthMesh);

  // Cloud layer
  const cloudGeometry = new THREE.SphereGeometry(1.01, 64, 64);
  const cloudMaterial = new THREE.MeshPhongMaterial({
    map: cloudTexture,
    transparent: true,
    opacity: 0.35,
    depthWrite: false
  });
  const cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
  group.add(cloudMesh);

  // Correct orientation: axial tilt only (no flip)
  group.rotation.z = THREE.MathUtils.degToRad(23.4);

  return { group, earthMesh, cloudMesh };
}
