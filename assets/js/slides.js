/* =========================================================
   Showreel controller — scroll-snap slides + one shared
   three.js stage. Each [data-slide] declares its model
   (data-model / data-fit / data-cam / data-speed) and the
   side the model occupies (data-mside). Models lazy-load
   when their slide approaches and cross-fade on change.
   ========================================================= */

(function () {
  'use strict';

  var slides = Array.prototype.slice.call(document.querySelectorAll('[data-slide]'));
  if (!slides.length) return;

  var railLinks = Array.prototype.slice.call(document.querySelectorAll('[data-rail]'));
  var frameEl = document.querySelector('[data-frame]');
  var tickerEl = document.querySelector('[data-ticker]');
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var narrowQuery = window.matchMedia('(max-width: 880px)');

  Array.prototype.forEach.call(document.querySelectorAll('[data-year]'), function (el) {
    el.textContent = new Date().getFullYear();
  });

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  /* ---------------- active slide bookkeeping ---------------- */

  var activeIndex = -1;

  function setActive(i) {
    if (i === activeIndex || !slides[i]) return;
    activeIndex = i;

    slides.forEach(function (s, j) {
      s.classList.toggle('is-active', j === i);
    });

    railLinks.forEach(function (a) {
      var isActive = parseInt(a.getAttribute('data-rail'), 10) === i;
      a.classList.toggle('is-active', isActive);
      if (isActive) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });

    if (frameEl) frameEl.textContent = pad(i);
    if (tickerEl) tickerEl.textContent = (slides[i].getAttribute('data-label') || '').toUpperCase();
    document.body.setAttribute('data-mside', slides[i].getAttribute('data-mside') || 'right');

    if (stage) stage.show(i);
  }

  /* Middle-of-viewport band detection — robust even when a slide is
     taller than the viewport (mobile portrait). */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) setActive(slides.indexOf(entry.target));
      });
    }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
    slides.forEach(function (s) { io.observe(s); });
  }

  /* ---------------- keyboard navigation ---------------- */

  /* Rapid presses are based on the last *requested* slide, not the one the
     IntersectionObserver has caught up to, so each press queues one step. */
  var navIndex = -1;
  var navTime = 0;

  document.addEventListener('keydown', function (e) {
    if (e.altKey || e.metaKey || e.ctrlKey || e.shiftKey) return;
    if (document.documentElement.classList.contains('case-open')) return;
    var tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    var base = (navIndex >= 0 && Date.now() - navTime < 800) ? navIndex : Math.max(0, activeIndex);

    var target = -1;
    if (e.key === 'ArrowDown' || e.key === 'PageDown') target = Math.min(slides.length - 1, base + 1);
    else if (e.key === 'ArrowUp' || e.key === 'PageUp') target = Math.max(0, base - 1);
    else if (e.key === 'Home') target = 0;
    else if (e.key === 'End') target = slides.length - 1;

    if (target >= 0) {
      e.preventDefault();
      navIndex = target;
      navTime = Date.now();
      slides[target].scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth' });
    }
  });

  /* ---------------- scroll ratio (particle parallax) ---------------- */

  var scrollRatio = 0;
  function readScroll() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    scrollRatio = max > 0 ? (window.scrollY || window.pageYOffset) / max : 0;
  }
  window.addEventListener('scroll', readScroll, { passive: true });
  readScroll();

  /* ================= shared three.js stage ================= */

  function createStage() {
    var container = document.querySelector('[data-stage]');
    if (!container) return null;
    if (typeof THREE === 'undefined' || !THREE.GLTFLoader) {
      document.body.classList.add('no-webgl');
      return null;
    }

    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    } catch (err) {
      document.body.classList.add('no-webgl');
      return null;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    var contextDead = false;
    renderer.domElement.addEventListener('webglcontextlost', function (e) {
      e.preventDefault();
      contextDead = true;
      document.body.classList.add('no-webgl');
      stopLoop();
    });

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 100);
    var camTarget = 5.2;
    camera.position.set(0, 0, camTarget);

    /* ---- dark studio lighting: white key, amber rim, cool fill ---- */
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    var key = new THREE.DirectionalLight(0xffffff, 1.15);
    key.position.set(-3, 3.5, 4); scene.add(key);

    var rim = new THREE.DirectionalLight(0xF2B24C, 0.9);
    rim.position.set(2.5, 2, -3); scene.add(rim);

    var fill = new THREE.DirectionalLight(0x8FA4C9, 0.4);
    fill.position.set(3, -1, 3); scene.add(fill);

    var under = new THREE.PointLight(0xF2B24C, 0.3, 9, 2);
    under.position.set(0, -2.2, 1.5); scene.add(under);

    /* ---- dark env map with an amber hotspot ---- */
    try {
      var pmrem = new THREE.PMREMGenerator(renderer);
      pmrem.compileEquirectangularShader();
      var c = document.createElement('canvas'); c.width = 512; c.height = 256;
      var g = c.getContext('2d');
      var grd = g.createLinearGradient(0, 0, 0, 256);
      grd.addColorStop(0, '#2E3138');
      grd.addColorStop(0.5, '#16181D');
      grd.addColorStop(1, '#0B0C0F');
      g.fillStyle = grd; g.fillRect(0, 0, 512, 256);
      var hot = g.createRadialGradient(390, 60, 5, 390, 60, 130);
      hot.addColorStop(0, 'rgba(242,178,76,0.5)');
      hot.addColorStop(1, 'rgba(242,178,76,0)');
      g.fillStyle = hot; g.fillRect(0, 0, 512, 256);
      var cool = g.createRadialGradient(110, 110, 5, 110, 110, 140);
      cool.addColorStop(0, 'rgba(124,146,187,0.25)');
      cool.addColorStop(1, 'rgba(124,146,187,0)');
      g.fillStyle = cool; g.fillRect(0, 0, 512, 256);
      var envTex = new THREE.CanvasTexture(c);
      envTex.mapping = THREE.EquirectangularReflectionMapping;
      envTex.encoding = THREE.sRGBEncoding;
      scene.environment = pmrem.fromEquirectangular(envTex).texture;
      envTex.dispose(); pmrem.dispose();
    } catch (err) {
      /* env map is a nicety — lights alone still read fine */
    }

    /* ---- amber dust, additive so it glows on the dark frame ---- */
    var dustGeo = new THREE.BufferGeometry();
    var dustCount = 340;
    var dustPos = new Float32Array(dustCount * 3);
    for (var i = 0; i < dustCount * 3; i++) dustPos[i] = (Math.random() - 0.5) * 16;
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    var dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
      size: 0.035,
      color: 0xF2B24C,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    }));
    scene.add(dust);

    /* ---- load progress bar ---- */
    var loadbar = document.querySelector('[data-loadbar]');
    var pendingLoads = 0;
    var maxProgress = 0;
    function lbStart() {
      pendingLoads++;
      if (loadbar) {
        loadbar.classList.add('is-loading');
        loadbar.style.transform = 'scaleX(0.12)';
      }
    }
    function lbProgress(ratio) {
      if (!loadbar || !isFinite(ratio)) return;
      maxProgress = Math.max(maxProgress, Math.min(1, ratio));
      loadbar.style.transform = 'scaleX(' + (0.12 + maxProgress * 0.88) + ')';
    }
    function lbEnd() {
      pendingLoads = Math.max(0, pendingLoads - 1);
      if (pendingLoads === 0 && loadbar) {
        loadbar.style.transform = 'scaleX(1)';
        setTimeout(function () {
          if (pendingLoads === 0) {
            loadbar.classList.remove('is-loading');
            loadbar.style.transform = 'scaleX(0)';
            maxProgress = 0;
          }
        }, 500);
      }
    }

    /* ---- loaders + template cache (Headset is shared by two slides) ---- */
    var loader = new THREE.GLTFLoader();
    if (THREE.DRACOLoader) {
      var draco = new THREE.DRACOLoader();
      draco.setDecoderPath('assets/vendor/draco/');
      loader.setDRACOLoader(draco);
    }

    var templates = {};
    function loadTemplate(path) {
      if (!templates[path]) {
        templates[path] = new Promise(function (resolve, reject) {
          lbStart();
          loader.load(path, function (gltf) {
            lbEnd();
            resolve(gltf.scene);
          }, function (ev) {
            if (ev && ev.total) lbProgress(ev.loaded / ev.total);
          }, function (err) {
            lbEnd();
            /* drop the rejected promise so a flaky fetch can retry later */
            delete templates[path];
            reject(err);
          });
        });
      }
      return templates[path];
    }

    function prepMaterials(root) {
      root.traverse(function (obj) {
        if (obj.isMesh && obj.material) {
          var m = obj.material;
          /* calm extremes so authored PBR reads on the dark stage */
          if ('roughness' in m) m.roughness = Math.max(m.roughness, 0.3);
          if ('metalness' in m) m.metalness = Math.min(m.metalness, 0.85);
          if ('envMapIntensity' in m) m.envMapIntensity = 0.65;
          m.needsUpdate = true;
        }
      });
    }

    /* ---- procedural "Dynamic Island" pill for the macOS widget slide ---- */
    function roundedRectShape(w, h, r) {
      var s = new THREE.Shape();
      var x = -w / 2, y = -h / 2;
      s.moveTo(x + r, y);
      s.lineTo(x + w - r, y);
      s.quadraticCurveTo(x + w, y, x + w, y + r);
      s.lineTo(x + w, y + h - r);
      s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      s.lineTo(x + r, y + h);
      s.quadraticCurveTo(x, y + h, x, y + h - r);
      s.lineTo(x, y + r);
      s.quadraticCurveTo(x, y, x + r, y);
      return s;
    }

    function buildIsland() {
      var group = new THREE.Group();

      var geo = new THREE.ExtrudeGeometry(roundedRectShape(2.3, 0.72, 0.36), {
        depth: 0.2, bevelEnabled: true, bevelThickness: 0.05,
        bevelSize: 0.05, bevelSegments: 4, curveSegments: 24
      });
      geo.center();
      group.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
        color: 0x111318, metalness: 0.7, roughness: 0.28
      })));

      var dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.065, 18, 18),
        new THREE.MeshStandardMaterial({
          color: 0xF2B24C, emissive: 0xF2B24C, emissiveIntensity: 1.4, roughness: 0.4
        })
      );
      dot.position.set(-0.82, 0, 0.18);
      group.add(dot);

      var bars = [];
      var heights = [0.18, 0.32, 0.22, 0.36];
      for (var b = 0; b < heights.length; b++) {
        var bar = new THREE.Mesh(
          new THREE.BoxGeometry(0.05, heights[b], 0.05),
          new THREE.MeshStandardMaterial({
            color: 0xF2B24C, emissive: 0xF2B24C, emissiveIntensity: 0.9, roughness: 0.4
          })
        );
        bar.position.set(0.5 + b * 0.15, 0, 0.18);
        group.add(bar);
        bars.push(bar);
      }
      group.userData.bars = bars;
      return Promise.resolve(group);
    }

    /* ---- per-slide entries ---- */
    var entries = slides.map(function (s, idx) {
      return {
        idx: idx,
        path: s.getAttribute('data-model') || '',
        fit: parseFloat(s.getAttribute('data-fit') || '2.5'),
        cam: parseFloat(s.getAttribute('data-cam') || '5.2'),
        speed: parseFloat(s.getAttribute('data-speed') || '0.15'),
        side: s.getAttribute('data-mside') || 'right',
        wrapper: null,
        inner: null,
        bars: null,
        target: 0,
        anim: 0,
        x: 0,
        warmFrames: 0,
        loading: false,
        failed: false
      };
    });

    function sideOffset(entry) {
      if (narrowQuery.matches || entry.side === 'center') return 0;
      /* Push the model toward its edge, but keep it fully in frame: the
         offset backs off from the visible half-width by half the model's
         fitted size, clamped so it never drifts over the copy column. */
      var halfW = Math.tan(camera.fov * Math.PI / 360) * entry.cam *
        (window.innerWidth / window.innerHeight);
      var off = Math.min(0.30 * entry.cam,
        Math.max(0.16 * entry.cam, 0.92 * halfW - entry.fit / 2));
      return entry.side === 'left' ? -off : off;
    }
    function baseY(entry) {
      return narrowQuery.matches ? 0.55 : 0.05;
    }

    function buildObject(entry) {
      if (entry.path.indexOf('procedural:') === 0) return buildIsland();
      return loadTemplate(entry.path).then(function (template) {
        return template.clone();
      });
    }

    function ensureWrapper(i) {
      var entry = entries[i];
      if (!entry || entry.wrapper || entry.loading || entry.failed || !entry.path) return;
      entry.loading = true;

      buildObject(entry).then(function (obj) {
        entry.loading = false;

        var bbox = new THREE.Box3().setFromObject(obj);
        var size = bbox.getSize(new THREE.Vector3());
        var center = bbox.getCenter(new THREE.Vector3());
        var maxDim = Math.max(size.x, size.y, size.z);
        if (!(maxDim > 0)) { entry.failed = true; return; }

        obj.position.sub(center);
        prepMaterials(obj);

        var inner = new THREE.Group();
        inner.add(obj);
        inner.scale.setScalar(entry.fit / maxDim);

        var wrapper = new THREE.Group();
        wrapper.add(inner);
        wrapper.scale.setScalar(0.0001);

        entry.inner = inner;
        entry.wrapper = wrapper;
        entry.bars = obj.userData ? obj.userData.bars : null;
        entry.x = sideOffset(entry);
        wrapper.position.set(entry.x, baseY(entry), 0);
        scene.add(wrapper);

        /* Render the new model for a couple of frames at microscopic scale so
           geometry/texture upload and shader compile happen now (while the
           user is reading), not on the first frame of its slide transition. */
        entry.warmFrames = 2;

        if (prefersReduced) {
          entry.anim = entry.target;
          renderOnce();
        }
      }).catch(function (err) {
        entry.loading = false;
        entry.failed = true;
        if (window.console) console.warn('[slides] model load failed:', entry.path, err);
      });
    }

    function prefetchTemplate(i) {
      /* Build the whole wrapper (not just the template): ensureWrapper's warm
         frames push GPU upload off the slide-transition frame. */
      if (i >= 0 && i < entries.length) ensureWrapper(i);
    }

    /* ---- mouse parallax (fine pointers only) ---- */
    var mouseX = 0, mouseY = 0;
    if (!prefersReduced && window.matchMedia('(pointer: fine)').matches) {
      document.addEventListener('mousemove', function (e) {
        mouseX = (e.clientX / window.innerWidth) * 2 - 1;
        mouseY = (e.clientY / window.innerHeight) * 2 - 1;
      }, { passive: true });
    }

    /* ---- render loop ---- */
    var clock = new THREE.Clock();
    var rafId = null;

    function animate() {
      rafId = null;
      if (document.hidden) return;

      var dt = Math.min(clock.getDelta(), 0.05);
      var t = clock.elapsedTime;
      var k = Math.min(1, dt * 4.2);

      entries.forEach(function (entry) {
        if (!entry.wrapper) return;

        entry.anim += (entry.target - entry.anim) * k;
        var visible = entry.anim > 0.015 || entry.target === 1 || entry.warmFrames > 0;
        if (entry.warmFrames > 0) entry.warmFrames--;
        entry.wrapper.visible = visible;
        if (!visible) return;

        var xTarget = sideOffset(entry);
        entry.x += (xTarget - entry.x) * k;

        var scale = Math.max(0.0001, entry.anim);
        entry.wrapper.scale.setScalar(scale);
        entry.wrapper.position.set(
          entry.x,
          baseY(entry) - (1 - entry.anim) * 0.7 + Math.sin(t * 0.5 + entry.idx) * 0.05,
          0
        );

        entry.inner.rotation.y = t * entry.speed + (1 - entry.anim) * 0.9;
        entry.wrapper.rotation.x += (mouseY * 0.1 - entry.wrapper.rotation.x) * k;
        entry.wrapper.rotation.y += (mouseX * 0.16 - entry.wrapper.rotation.y) * k;

        if (entry.bars) {
          entry.bars.forEach(function (bar, bi) {
            bar.scale.y = 0.6 + Math.abs(Math.sin(t * 2.6 + bi * 1.1)) * 0.9;
          });
        }
      });

      camera.position.z += (camTarget - camera.position.z) * Math.min(1, dt * 3);

      dust.rotation.y = t * 0.02 + scrollRatio * 0.5;
      dust.rotation.x = scrollRatio * 0.18;

      renderer.render(scene, camera);
      rafId = requestAnimationFrame(animate);
    }

    function startLoop() {
      if (contextDead) return;
      if (prefersReduced) { renderOnce(); return; }
      if (rafId === null && !document.hidden) rafId = requestAnimationFrame(animate);
    }
    function stopLoop() {
      if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    }
    function renderOnce() {
      entries.forEach(function (entry) {
        if (!entry.wrapper) return;
        entry.anim = entry.target;
        entry.wrapper.visible = entry.target === 1;
        entry.wrapper.scale.setScalar(Math.max(0.0001, entry.anim));
        entry.wrapper.position.set(sideOffset(entry), baseY(entry), 0);
      });
      camera.position.z = camTarget;
      renderer.render(scene, camera);
    }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stopLoop();
      else startLoop();
    });

    window.addEventListener('resize', function () {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
      renderer.setSize(window.innerWidth, window.innerHeight);
      if (prefersReduced) renderOnce();
    });

    startLoop();

    return {
      show: function (i) {
        entries.forEach(function (entry, j) { entry.target = j === i ? 1 : 0; });
        var entry = entries[i];
        if (entry && entry.path) camTarget = entry.cam;
        ensureWrapper(i);
        prefetchTemplate(i + 1);
        prefetchTemplate(i - 1);
        if (prefersReduced) renderOnce();
      }
    };
  }

  var stage = createStage();

  /* ---------------- in-deck case studies ---------------- */
  /* "Case study" links open a <dialog> dossier styled like the deck instead
     of navigating to the classic pages; hrefs stay as a no-JS fallback. */

  (function () {
    var dialog = document.querySelector('[data-case-dialog]');
    if (!dialog || typeof dialog.showModal !== 'function') return;

    var content = dialog.querySelector('[data-case-content]');
    var headLabel = dialog.querySelector('[data-case-head]');
    var pushedState = false;

    function openCase(id, viaHistory) {
      var tpl = document.getElementById('case-' + id);
      if (!tpl || !content) return false;

      content.innerHTML = '';
      content.appendChild(tpl.content.cloneNode(true));
      dialog.setAttribute('aria-label', tpl.getAttribute('data-title') || 'Case study');
      if (headLabel) headLabel.textContent = 'Case file — ' + (tpl.getAttribute('data-title') || '');

      if (!dialog.open) dialog.showModal();
      dialog.scrollTop = 0;
      document.documentElement.classList.add('case-open');

      if (!viaHistory) {
        history.pushState({ caseId: id }, '', '#case-' + id);
        pushedState = true;
      }
      return true;
    }

    dialog.addEventListener('close', function () {
      document.documentElement.classList.remove('case-open');
      if (pushedState) {
        pushedState = false;
        history.back();
      } else if (location.hash.indexOf('#case-') === 0) {
        history.replaceState(null, '', location.pathname);
      }
    });

    /* back/forward buttons close and reopen the dossier */
    window.addEventListener('popstate', function (e) {
      if (dialog.open) {
        pushedState = false;
        dialog.close();
      } else if (e.state && e.state.caseId) {
        openCase(e.state.caseId, true);
      }
    });

    /* click on the dimmed backdrop closes */
    dialog.addEventListener('click', function (e) {
      if (e.target === dialog) dialog.close();
    });

    var closeBtn = dialog.querySelector('[data-case-close]');
    if (closeBtn) closeBtn.addEventListener('click', function () { dialog.close(); });

    document.addEventListener('click', function (e) {
      var link = e.target && e.target.closest ? e.target.closest('[data-case]') : null;
      if (!link) return;
      if (openCase(link.getAttribute('data-case'))) e.preventDefault();
    });

    /* deep link: slides.html#case-aston (fresh load or in-page hash edit) */
    function openFromHash(viaHistory) {
      if (location.hash.indexOf('#case-') !== 0) return;
      var id = location.hash.slice(6);
      var section = document.getElementById(id);
      if (section) section.scrollIntoView({ behavior: 'auto' });
      openCase(id, viaHistory);
    }
    window.addEventListener('hashchange', function () {
      if (!dialog.open) openFromHash(true);
    });
    openFromHash(true);
  })();

  /* ---------------- boot ---------------- */

  var initial = 0;
  var bootId = location.hash.indexOf('#case-') === 0
    ? location.hash.slice(6)
    : location.hash.slice(1);
  if (bootId) {
    slides.forEach(function (s, j) {
      if (s.id === bootId) initial = j;
    });
  }
  setActive(initial);
})();
