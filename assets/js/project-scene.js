/* =========================================================
   Project showcase scene — non-interactive slow render
   One model per page. Reads data from [data-showcase].
   ========================================================= */

(function () {
  'use strict';

  const stage = document.querySelector('[data-showcase]');
  if (!stage) return;

  const modelPath = stage.dataset.model;
  if (!modelPath) return;

  // Model-specific tuning (scale, rotation rate, camera distance)
  const fitSize = parseFloat(stage.dataset.fit || '2.6');
  const rotSpeed = parseFloat(stage.dataset.speed || '0.12');
  const camZ = parseFloat(stage.dataset.cam || '6.2');

  const loaderEl = stage.querySelector('.showcase-loader');
  const clock = new THREE.Clock();

  const renderer = new THREE.WebGLRenderer({
    antialias: true, alpha: true, powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(stage.clientWidth, stage.clientHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0a0a0b, 7, 20);

  const camera = new THREE.PerspectiveCamera(
    30, stage.clientWidth / stage.clientHeight, 0.1, 100
  );
  camera.position.set(0, 0, camZ);

  scene.add(new THREE.AmbientLight(0xffffff, 0.2));

  const key = new THREE.DirectionalLight(0xffffff, 1.8);
  key.position.set(-3, 3.5, 4); scene.add(key);

  const fill = new THREE.DirectionalLight(0xbfcbdf, 0.55);
  fill.position.set(3, -1, 3); scene.add(fill);

  const rim = new THREE.DirectionalLight(0xffb87a, 1.15);
  rim.position.set(2, 1.8, -3); scene.add(rim);

  const accent = new THREE.PointLight(0xffc28a, 0.9, 8, 2);
  accent.position.set(0, -2, 2); scene.add(accent);

  // Soft env map
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  function makeEnv() {
    const c = document.createElement('canvas'); c.width = 512; c.height = 256;
    const g = c.getContext('2d');
    const grd = g.createLinearGradient(0, 0, 0, 256);
    grd.addColorStop(0, '#3a2a1e');
    grd.addColorStop(0.45, '#2a2327');
    grd.addColorStop(1, '#0a0c12');
    g.fillStyle = grd; g.fillRect(0, 0, 512, 256);
    const rg = g.createRadialGradient(380, 70, 5, 380, 70, 120);
    rg.addColorStop(0, 'rgba(255,230,200,0.9)');
    rg.addColorStop(1, 'rgba(255,230,200,0)');
    g.fillStyle = rg; g.fillRect(0, 0, 512, 256);
    const tex = new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  }
  const envRaw = makeEnv();
  const envMap = pmrem.fromEquirectangular(envRaw).texture;
  scene.environment = envMap;
  envRaw.dispose(); pmrem.dispose();

  const group = new THREE.Group();
  scene.add(group);

  const loader = new THREE.GLTFLoader();
  let model = null;
  let ready = false;

  loader.load(
    modelPath,
    (gltf) => {
      model = gltf.scene;
      const bbox = new THREE.Box3().setFromObject(model);
      const size = bbox.getSize(new THREE.Vector3());
      const center = bbox.getCenter(new THREE.Vector3());
      model.position.sub(center);

      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = fitSize / maxDim;
      model.scale.setScalar(scale);

      model.traverse((obj) => {
        if (obj.isMesh && obj.material) {
          const m = obj.material;
          if ('metalness' in m) m.metalness = Math.max(m.metalness, 0.55);
          if ('roughness' in m) m.roughness = Math.min(Math.max(m.roughness, 0.2), 0.4);
          if ('envMapIntensity' in m) m.envMapIntensity = 1.0;
          m.needsUpdate = true;
        }
      });

      group.add(model);
      ready = true;
      if (loaderEl) loaderEl.classList.add('hidden');
    },
    undefined,
    (err) => {
      console.warn('[project-scene] model load failed:', err);
      if (loaderEl) loaderEl.textContent = 'Preview unavailable';
    }
  );

  function onResize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  window.addEventListener('resize', onResize);

  function tick() {
    const t = clock.getElapsedTime();
    if (ready && model) {
      group.rotation.y = t * rotSpeed;
      group.position.y = Math.sin(t * 0.5) * 0.06;
    }
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();
})();
