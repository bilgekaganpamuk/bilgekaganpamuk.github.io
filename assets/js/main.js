/* =========================================================
   Main site behaviors — nav, scroll, reveals, mobile menu
   ========================================================= */

(function () {
  'use strict';

  // ---- Nav scroll state
  const nav = document.querySelector('.nav');
  if (nav) {
    const onScroll = () => {
      if (window.scrollY > 24) nav.classList.add('scrolled');
      else nav.classList.remove('scrolled');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ---- Mobile menu
  const menuBtn = document.querySelector('.menu-btn');
  const mobileMenu = document.querySelector('.mobile-menu');
  if (menuBtn && mobileMenu) {
    const setMenuState = (open) => {
      mobileMenu.classList.toggle('open', open);
      mobileMenu.setAttribute('aria-hidden', String(!open));
      if ('inert' in mobileMenu) mobileMenu.inert = !open;
      menuBtn.setAttribute('aria-expanded', String(open));
      menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      document.body.style.overflow = open ? 'hidden' : '';
    };

    // Normalize initial ARIA state (closed)
    setMenuState(false);

    menuBtn.addEventListener('click', () => {
      setMenuState(!mobileMenu.classList.contains('open'));
    });
    mobileMenu.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => setMenuState(false));
    });

    // Escape closes the menu and returns focus to the toggle button
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileMenu.classList.contains('open')) {
        setMenuState(false);
        menuBtn.focus();
      }
    });

    // If the viewport grows past the mobile breakpoint while the menu is
    // open, CSS hides the menu — release the scroll lock and ARIA state too.
    const desktopMq = window.matchMedia('(min-width: 961px)');
    const onBreakpoint = () => {
      if (desktopMq.matches && mobileMenu.classList.contains('open')) setMenuState(false);
    };
    if (typeof desktopMq.addEventListener === 'function') desktopMq.addEventListener('change', onBreakpoint);
    else if (typeof desktopMq.addListener === 'function') desktopMq.addListener(onBreakpoint);
  }

  // ---- Intersection-observer reveals
  // If the browser doesn't support IO or motion is reduced, just reveal everything.
  const revealEls = document.querySelectorAll('.reveal');
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (revealEls.length) {
    if (!('IntersectionObserver' in window) || prefersReduced) {
      revealEls.forEach(el => el.classList.add('in'));
    } else {
      const io = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
      revealEls.forEach(el => io.observe(el));

      // Fail-safe: elements that are already near/above the viewport when the
      // observer attaches should be force-revealed after one tick to avoid
      // flashes on slow connections / initial paint oddities.
      setTimeout(() => {
        revealEls.forEach(el => {
          const r = el.getBoundingClientRect();
          if (r.top < window.innerHeight * 0.95) el.classList.add('in');
        });
      }, 50);
    }
  }

  // ---- Trigger hero load animation after a tick
  const hero = document.querySelector('.hero');
  if (hero) {
    requestAnimationFrame(() => {
      setTimeout(() => hero.classList.add('loaded'), 60);
    });
  }

  // ---- Smooth anchor scroll with offset for fixed nav
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const id = link.getAttribute('href');
      if (!id || id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 72;
      const y = target.getBoundingClientRect().top + window.scrollY - navH + 1;
      window.scrollTo({ top: y, behavior: prefersReduced ? 'auto' : 'smooth' });
      // Move keyboard focus to the target so skip links / nav anchors work
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    });
  });

  // ---- Year in footer
  const yearEl = document.querySelector('[data-year]');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ---- 3D Vanilla Tilt
  // The tilt library script tag comes after main.js (both deferred), so it
  // is not defined yet at execution time — initialize on window load, which
  // fires after every deferred script has run.
  window.addEventListener('load', () => {
    if (typeof VanillaTilt === 'undefined' || !window.matchMedia('(pointer: fine)').matches) return;

    VanillaTilt.init(document.querySelectorAll(".about-card"), {
      max: 5,
      speed: 400,
      glare: false,
    });

    VanillaTilt.init(document.querySelectorAll(".caps-cell"), {
      max: 10,
      speed: 400,
      glare: false,
    });
  });
})();
