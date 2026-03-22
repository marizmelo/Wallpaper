import * as THREE from 'three';
import { createEarth } from './earth.js';
import { createSaturn } from './saturn.js';
import { getSunDirection } from './sun.js';
import { createStars } from './stars.js';
import { HolographicCamera } from './camera.js';
import { HeadSmoother } from './smoother.js';
import { FaceTracker } from './tracker.js';
import { createPostprocessing } from './postprocessing.js';

async function init() {
  const mode = window.location.hash.replace('#', '') || 'earth';
  const isPrimary = mode === 'earth';

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const textureLoader = new THREE.TextureLoader();

  // --- Phase 1: Stars (visible immediately) ---
  const stars = createStars();
  scene.add(stars);

  const ambientLight = new THREE.AmbientLight(0x111122, 0.15);
  scene.add(ambientLight);

  const sunLight = new THREE.DirectionalLight(0xfff5e0, 2.0);
  scene.add(sunLight);

  const aspect = window.innerWidth / window.innerHeight;
  const holoCam = new HolographicCamera(aspect);
  const camera = holoCam.camera;

  const { composer, bloomPass } = createPostprocessing(renderer, scene, camera);

  // Hide loading screen — stars are already visible
  const loadingEl = document.getElementById('loading');
  if (loadingEl) loadingEl.classList.add('hidden');

  // --- Phase 2: Load planet (hidden, fade in when all ready) ---
  let planetMesh, cloudMesh, planetGroup;

  if (isPrimary) {
    const earth = await createEarth(textureLoader);
    planetGroup = earth.group;
    planetMesh = earth.earthMesh;
    cloudMesh = earth.cloudMesh;
  } else {
    const saturn = await createSaturn(textureLoader);
    planetGroup = saturn.group;
    planetMesh = saturn.saturnMesh;
  }

  // Start invisible
  planetGroup.visible = false;
  scene.add(planetGroup);

  // Signal ready to main process
  if (window.electronAPI && window.electronAPI.sendReady) {
    window.electronAPI.sendReady();
  }

  // Fade in state
  let fadeIn = false;
  let fadeOpacity = 0;

  // Wait for all windows to be ready, then fade in
  if (window.electronAPI && window.electronAPI.onAllReady) {
    window.electronAPI.onAllReady(() => {
      planetGroup.visible = true;
      fadeIn = true;
    });
  } else {
    // No electron (dev mode) — show immediately
    planetGroup.visible = true;
    fadeIn = true;
  }

  // Clock + location (primary only)
  const clockOverlay = document.getElementById('clock-overlay');
  if (isPrimary) {
    const clockTimeEl = document.getElementById('clock-time');
    const clockDateEl = document.getElementById('clock-date');
    const clockLocationEl = document.getElementById('clock-location');

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const tzCity = tz.split('/').pop().replace(/_/g, ' ');
    clockLocationEl.textContent = tzCity;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=10`,
            { headers: { 'User-Agent': 'HolographicEarthApp/1.0' } }
          );
          const data = await res.json();
          const city = data.address.city || data.address.town || data.address.village || '';
          const country = data.address.country || '';
          if (city || country) {
            clockLocationEl.textContent = city ? `${city}, ${country}` : country;
          }
        } catch (_) {}
      }, () => {});
    }

    function wrapDigits(str) {
      return str.split('').map(ch =>
        ch === ':' ? '<span class="colon">:</span>' : `<span class="digit">${ch}</span>`
      ).join('');
    }

    function updateClock() {
      const now = new Date();
      const h = now.getHours().toString().padStart(2, '0');
      const m = now.getMinutes().toString().padStart(2, '0');
      const s = now.getSeconds().toString().padStart(2, '0');
      clockTimeEl.innerHTML = `${wrapDigits(h)}<span class="colon">:</span>${wrapDigits(m)}<span class="colon">:</span>${wrapDigits(s)}`;
      const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      clockDateEl.textContent = now.toLocaleDateString('en-US', options);
    }
    updateClock();
    setInterval(updateClock, 1000);
  } else {
    if (clockOverlay) clockOverlay.style.display = 'none';
  }

  // --- Phase 3: Head tracking (loaded last) ---
  const smoother = new HeadSmoother(0.08);
  let tracker = null;

  // Defer tracker init so it doesn't block rendering
  setTimeout(async () => {
    if (isPrimary) {
      tracker = new FaceTracker(smoother);
      await tracker.init();
    } else {
      if (window.electronAPI && window.electronAPI.onHeadData) {
        window.electronAPI.onHeadData((data) => {
          smoother.setTarget(data.x, data.y, data.z);
        });
      }
    }
  }, 100);

  // Parallax
  const parallaxScale = 0.6;
  let lastIpcTime = 0;

  // Render loop
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    // Fade in planet
    if (fadeIn && fadeOpacity < 1) {
      fadeOpacity = Math.min(1, fadeOpacity + delta * 0.8); // ~1.25s fade
      if (isPrimary) {
        // Earth uses custom shader with uOpacity uniform
        if (planetMesh.material.uniforms && planetMesh.material.uniforms.uOpacity) {
          planetMesh.material.uniforms.uOpacity.value = fadeOpacity;
        }
        // Clouds use standard material
        if (cloudMesh) {
          cloudMesh.material.transparent = true;
          cloudMesh.material.opacity = 0.35 * fadeOpacity;
        }
      } else {
        // Saturn uses standard materials
        planetGroup.traverse((child) => {
          if (child.isMesh && child.material) {
            child.material.transparent = true;
            child.material.opacity = fadeOpacity;
          }
        });
      }
    }

    // Head tracking
    const head = smoother.update(delta);

    if (isPrimary && window.electronAPI && window.electronAPI.sendHeadData) {
      const now = performance.now();
      if (now - lastIpcTime > 50) {
        lastIpcTime = now;
        window.electronAPI.sendHeadData({ x: head.x, y: head.y, z: head.z });
      }
    }

    holoCam.updateProjection(
      head.x * parallaxScale,
      head.y * parallaxScale
    );

    // Sun direction
    const sunDir = getSunDirection();
    sunLight.position.copy(sunDir).multiplyScalar(50);
    if (isPrimary && planetMesh.material.uniforms) {
      planetMesh.material.uniforms.sunDirection.value.copy(sunDir);
    }

    // Rotate
    planetMesh.rotation.y += 0.0008;
    if (cloudMesh) cloudMesh.rotation.y += 0.0011;

    composer.render(delta);
  }

  animate();

  // Resize
  window.addEventListener('resize', () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h);
    composer.setSize(w, h);
    holoCam.updateAspect(w / h);
    bloomPass.resolution.set(w, h);
  });

  // ESC to quit
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (tracker) tracker.stop();
      if (window.electronAPI) {
        window.electronAPI.quit();
      }
    }
  });
}

init().catch(console.error);
