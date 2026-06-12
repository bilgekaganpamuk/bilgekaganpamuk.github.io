/* =========================================================
   Hero scene — model with amber dust motes
   Transparent canvas, smooth mouse-parallax rotation.
   Reads the model path from [data-hero-stage][data-model].
   ========================================================= */

(function () {
  'use strict';

  const container = document.querySelector('[data-hero-stage]');
  if (!container) return;

  const loaderText = container.querySelector('.hero-stage-loader');
  const showLoadError = () => {
    if (loaderText) {
      loaderText.textContent = 'Preview unavailable';
      loaderText.classList.remove('hidden');
      loaderText.style.display = '';
    }
  };

  // Bail out gracefully if the vendored three.js / GLTFLoader failed to load
  if (typeof THREE === 'undefined' || !THREE.GLTFLoader) {
    showLoadError();
    return;
  }

  const modelPath = container.getAttribute('data-model');
  if (!modelPath) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- Scene, camera, renderer
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    45, container.clientWidth / container.clientHeight, 0.1, 100
  );
  camera.position.set(0, 0, 5);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.appendChild(renderer.domElement);
  } catch (err) {
    console.error('[hero-scene] renderer creation failed:', err);
    showLoadError();
    return;
  }

  // ---- Lights — soft studio levels; hot lights glare on the light page
  scene.add(new THREE.AmbientLight(0xffffff, 1.0));

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.35);
  directionalLight.position.set(5, 5, 5);
  scene.add(directionalLight);

  // ---- Amber dust motes
  const particlesGeometry = new THREE.BufferGeometry();
  const particlesCount = 300;
  const posArray = new Float32Array(particlesCount * 3);
  for (let i = 0; i < particlesCount * 3; i++) {
    posArray[i] = (Math.random() - 0.5) * 15;
  }
  particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
  const particlesMaterial = new THREE.PointsMaterial({
    size: 0.04,
    color: 0xB07818, // dark amber — readable on the light page
    transparent: true,
    opacity: 0.35,
    blending: THREE.NormalBlending
  });
  const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
  scene.add(particlesMesh);

  // ---- Model group
  // Parallax rotates this group so the model spins around its visual
  // center rather than orbiting the GLTF's authored origin.
  const modelGroup = new THREE.Group();
  modelGroup.position.set(0, 0.5, 0);
  scene.add(modelGroup);

  let modelReady = false;

  // ---- Mouse parallax (fine pointers, full-motion only)
  let mouseX = 0;
  let mouseY = 0;
  let containerRect = container.getBoundingClientRect();
  const refreshRect = () => { containerRect = container.getBoundingClientRect(); };

  if (!prefersReduced && window.matchMedia('(pointer: fine)').matches) {
    document.addEventListener('mousemove', (event) => {
      // Offset from the stage center, scaled to a gentle rotation target
      const centerX = containerRect.left + containerRect.width / 2;
      const centerY = containerRect.top + containerRect.height / 2;
      mouseX = (event.clientX - centerX) * 0.001;
      mouseY = (event.clientY - centerY) * 0.001;
    });
    // Keep the cached rect fresh without layout reads on every mousemove
    window.addEventListener('scroll', refreshRect, { passive: true });
  }

  const renderFrame = () => renderer.render(scene, camera);

  // ---- Resize
  window.addEventListener('resize', () => {
    refreshRect();
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    if (prefersReduced) renderFrame();
  });

  // ---- Model loading (Draco-compressed glTF)
  const loader = new THREE.GLTFLoader();
  if (THREE.DRACOLoader) {
    const dracoLoader = new THREE.DRACOLoader();
    dracoLoader.setDecoderPath('assets/vendor/draco/');
    loader.setDRACOLoader(dracoLoader);
  }
  loader.load(
    modelPath,
    (gltf) => {
      const model = gltf.scene;

      // The model is authored small — keep the original 10x scale, then
      // center the whole scene via its bounding box (per-mesh
      // geometry.center() would distort multi-mesh models).
      model.scale.set(10, 10, 10);
      const bbox = new THREE.Box3().setFromObject(model);
      const center = bbox.getCenter(new THREE.Vector3());
      model.position.sub(center);

      modelGroup.add(model);
      modelReady = true;

      // Hide the "Loading scene" text once the model is in
      if (loaderText) {
        loaderText.classList.add('hidden');
        setTimeout(() => { loaderText.style.display = 'none'; }, 300);
      }

      if (prefersReduced) renderFrame();
    },
    undefined,
    (error) => {
      console.error('[hero-scene] model load failed:', error);
      showLoadError();
    }
  );

  // ---- Animation loop
  // Paused while the tab is hidden or the stage is scrolled offscreen;
  // skipped entirely when the user prefers reduced motion.
  let inView = true;
  let rafId = null;

  function tick() {
    rafId = null;
    if (document.hidden || !inView) return;

    // Slowly drifting particles
    particlesMesh.rotation.y += 0.001;
    particlesMesh.rotation.x += 0.0005;

    // Lerp the model toward the mouse-driven rotation target
    if (modelReady) {
      const targetRotationY = mouseX * 1.2;
      const targetRotationX = mouseY * 1.2;
      modelGroup.rotation.y += (targetRotationY - modelGroup.rotation.y) * 0.05;
      modelGroup.rotation.x += (targetRotationX - modelGroup.rotation.x) * 0.05;
    }

    renderFrame();
    rafId = requestAnimationFrame(tick);
  }

  function start() {
    if (prefersReduced) return;
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
    io.observe(container);
  }

  if (prefersReduced) {
    // Single static frame now; another renders once the model loads
    renderFrame();
  } else {
    start();
  }
})();
