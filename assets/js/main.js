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
    menuBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('open');
      document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
    });
    mobileMenu.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
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
      window.scrollTo({ top: y, behavior: 'smooth' });
    });
  });

  // ---- Year in footer
  const yearEl = document.querySelector('[data-year]');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ---- Custom Cursor
  const cursorDot = document.querySelector('[data-cursor-dot]');
  const cursorOutline = document.querySelector('[data-cursor-outline]');
  if (cursorDot && cursorOutline && window.matchMedia('(pointer: fine)').matches) {
    let mouseX = 0, mouseY = 0;
    let outlineX = 0, outlineY = 0;
    
    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      
      cursorDot.style.left = `${mouseX}px`;
      cursorDot.style.top = `${mouseY}px`;
    });

    const animateCursor = () => {
      let distX = mouseX - outlineX;
      let distY = mouseY - outlineY;
      
      outlineX = outlineX + (distX * 0.2);
      outlineY = outlineY + (distY * 0.2);
      
      cursorOutline.style.left = `${outlineX}px`;
      cursorOutline.style.top = `${outlineY}px`;
      
      requestAnimationFrame(animateCursor);
    };
    requestAnimationFrame(animateCursor);

    const interactables = document.querySelectorAll('a, button, .work-item, .caps-cell');
    interactables.forEach(el => {
      el.addEventListener('mouseenter', () => cursorOutline.classList.add('hovering'));
      el.addEventListener('mouseleave', () => cursorOutline.classList.remove('hovering'));
    });
  }

  // ---- 3D Vanilla Tilt
  if (typeof VanillaTilt !== 'undefined' && window.matchMedia('(pointer: fine)').matches) {
    VanillaTilt.init(document.querySelectorAll(".about-card"), {
      max: 5,
      speed: 400,
      glare: true,
      "max-glare": 0.05,
    });
    
    VanillaTilt.init(document.querySelectorAll(".caps-cell"), {
      max: 10,
      speed: 400,
      glare: true,
      "max-glare": 0.1,
    });
  }
})();
