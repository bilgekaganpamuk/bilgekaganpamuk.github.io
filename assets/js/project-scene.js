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

  const loaderEl = stage.querySelector('.showcase-loader');

  // Bail out gracefully if the vendored three.js / GLTFLoader failed to load
  if (typeof THREE === 'undefined' || !THREE.GLTFLoader) {
    if (loaderEl) loaderEl.textContent = 'Preview unavailable';
    return;
  }

  // Model-specific tuning (scale, rotation rate, camera distance)
  const fitSize = parseFloat(stage.dataset.fit || '2.6');
  const rotSpeed = parseFloat(stage.dataset.speed || '0.12');
  const camZ = parseFloat(stage.dataset.cam || '6.2');

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clock = new THREE.Clock();

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true, alpha: true, powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(stage.clientWidth, stage.clientHeight, false); // CSS owns canvas layout
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    stage.appendChild(renderer.domElement);
  } catch (err) {
    console.warn('[project-scene] renderer creation failed:', err);
    if (loaderEl) loaderEl.textContent = 'Preview unavailable';
    return;
  }

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xFAFAF8, 7, 20);

  const camera = new THREE.PerspectiveCamera(
    30, stage.clientWidth / stage.clientHeight, 0.1, 100
  );
  camera.position.set(0, 0, camZ);

  scene.add(new THREE.AmbientLight(0xffffff, 0.4));

  const key = new THREE.DirectionalLight(0xffffff, 1.25);
  key.position.set(-3, 3.5, 4); scene.add(key);

  const fill = new THREE.DirectionalLight(0xbfcbdf, 0.45);
  fill.position.set(3, -1, 3); scene.add(fill);

  const rim = new THREE.DirectionalLight(0xffb87a, 0.65);
  rim.position.set(2, 1.8, -3); scene.add(rim);

  const accent = new THREE.PointLight(0xffc28a, 0.45, 8, 2);
  accent.position.set(0, -2, 2); scene.add(accent);

  // Soft env map — light studio gradient
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  function makeEnv() {
    const c = document.createElement('canvas'); c.width = 512; c.height = 256;
    const g = c.getContext('2d');
    const grd = g.createLinearGradient(0, 0, 0, 256);
    grd.addColorStop(0, '#FFFFFF');
    grd.addColorStop(0.45, '#F3EEE4');
    grd.addColorStop(1, '#DDD8CC');
    g.fillStyle = grd; g.fillRect(0, 0, 512, 256);
    const rg = g.createRadialGradient(380, 70, 5, 380, 70, 120);
    rg.addColorStop(0, 'rgba(255,230,200,0.4)');
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
  if (THREE.DRACOLoader) {
    const dracoLoader = new THREE.DRACOLoader();
    dracoLoader.setDecoderPath('assets/vendor/draco/');
    loader.setDRACOLoader(dracoLoader);
  }
  let model = null;
  let ready = false;

  loader.load(
    modelPath,
    (gltf) => {
      model = gltf.scene;
      const bbox = new THREE.Box3().setFromObject(model);
      const size = bbox.getSize(new THREE.Vector3());
      const center = bbox.getCenter(new THREE.Vector3());

      const maxDim = Math.max(size.x, size.y, size.z);
      if (!(maxDim > 0)) {
        // Degenerate/empty bounding box — treat as a failed load
        console.warn('[project-scene] model bounding box is empty:', modelPath);
        if (loaderEl) loaderEl.textContent = 'Preview unavailable';
        failed = true;
        stop();
        return;
      }

      model.position.sub(center);
      const scale = fitSize / maxDim;
      model.scale.setScalar(scale);

      model.traverse((obj) => {
        if (obj.isMesh && obj.material) {
          const m = obj.material;
          // Respect authored PBR values; on the light background only calm
          // the highlights down — matte floor, capped metalness, soft env.
          if ('roughness' in m) m.roughness = Math.max(m.roughness, 0.45);
          if ('metalness' in m) m.metalness = Math.min(m.metalness, 0.6);
          if ('envMapIntensity' in m) m.envMapIntensity = 0.5;
          m.needsUpdate = true;
        }
      });

      group.add(model);
      ready = true;
      if (loaderEl) loaderEl.classList.add('hidden');
      if (prefersReduced) renderFrame();
    },
    undefined,
    (err) => {
      console.warn('[project-scene] model load failed:', err);
      if (loaderEl) loaderEl.textContent = 'Preview unavailable';
      failed = true;
      stop();
    }
  );

  function onResize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h, false);
    if (prefersReduced) renderFrame();
  }
  window.addEventListener('resize', onResize);

  function renderFrame() {
    renderer.render(scene, camera);
  }

  // ---- Render loop
  // Paused while the tab is hidden, the stage is scrolled offscreen, or the
  // model failed to load; with reduced motion, renders static frames only.
  let inView = true;
  let failed = false;
  let rafId = null;

  function tick() {
    rafId = null;
    if (failed || document.hidden || !inView) return;
    const t = clock.getElapsedTime();
    if (ready && model) {
      group.rotation.y = t * rotSpeed;
      group.position.y = Math.sin(t * 0.5) * 0.06;
    }
    renderFrame();
    rafId = requestAnimationFrame(tick);
  }

  function start() {
    if (prefersReduced || failed) return;
    if (rafId === null && !document.hidden && inView) rafId = requestAnimationFrame(tick);
  }

  function stop() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else start();
  });

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      inView = entries[0].isIntersecting;
      if (inView) start();
      else stop();
    });
    io.observe(stage);
  }

  if (prefersReduced) {
    // Single static frame now; another renders once the model loads
    renderFrame();
  } else {
    start();
  }
})();
