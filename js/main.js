/* LINH LISA Nails et Spa — mouvement : GSAP + ScrollTrigger + Lenis
   Règles : on n'anime que transform et opacity (sauf masques d'image demandés),
   courbes douces (expo / power3), prefers-reduced-motion respecté. */
(() => {
  'use strict';

  const doc = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);

  /* ───────── Éléments indépendants de GSAP ───────── */
  initDrips();
  initFaq();
  initOpenNow();
  initCarousel();

  if (reduce || !hasGsap) {
    if (reduce) doc.classList.add('reduce');
    initAnchors(null, initMenu(null));
    initCounters(true);
    initSimpleNav();
    return;
  }

  doc.classList.add('anim');
  /* le préchargeur et les sections épinglées partent toujours du haut de page */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  /* ───────── Smooth scroll (Lenis) ───────── */
  let lenis = null;
  if (window.Lenis) {
    lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.4
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }

  /* Images clés en chargement immédiat (elles défilent dans des conteneurs transformés) */
  $$('.story__img, .arch img').forEach((img) => { img.loading = 'eager'; });

  initVideo();
  const menuApi = initMenu(lenis);
  initAnchors(lenis, menuApi);
  initNav(lenis, menuApi);
  initProgress();

  /* ───────── Découpe de texte ───────── */
  function splitWords(el) {
    const label = el.textContent.replace(/\s+/g, ' ').trim();
    el.setAttribute('aria-label', label);
    const walk = (node) => {
      Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = 'w'; w.setAttribute('aria-hidden', 'true');
            const i = document.createElement('span'); i.className = 'wi'; i.textContent = part;
            w.appendChild(i); frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
      });
    };
    walk(el);
    return $$('.wi', el);
  }
  function splitChars(el) {
    const txt = el.textContent.trim();
    el.textContent = '';
    el.setAttribute('aria-hidden', 'true');
    return Array.from(txt).map((ch) => {
      const s = document.createElement('span');
      s.className = 'c'; s.textContent = ch;
      el.appendChild(s);
      return s;
    });
  }

  /* ───────── Préchargeur → hero ───────── */
  const heroTl = buildHeroIntro();
  runLoader();

  function buildHeroIntro() {
    const chars = $$('.hero__word').flatMap(splitChars);
    const tl = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } });
    tl.fromTo('[data-hero-media]', { scale: 1.3 }, { scale: 1, duration: 2.8, ease: 'power3.out' }, 0)
      .from('.hero__eyebrow', { yPercent: 80, opacity: 0, duration: 1.2 }, 0.3)
      .from(chars, { yPercent: 118, rotate: 4, duration: 1.6, stagger: 0.055 }, 0.1)
      .from('.hero__amp span', { yPercent: 120, duration: 1.4 }, 0.75)
      .from('.hero__lead', { yPercent: 40, opacity: 0, duration: 1.3 }, 0.95)
      .from('.hero__cta .btn', { yPercent: 70, opacity: 0, duration: 1.2, stagger: 0.1 }, 1.05)
      .from('[data-hero-badge]', { yPercent: 40, opacity: 0, duration: 1.3 }, 1.15)
      .from('.hero__open', { opacity: 0, yPercent: -60, duration: 1.1 }, 1.25)
      .from('.hero__scroll', { opacity: 0, duration: 1.2 }, 1.6)
      .from('.nav', { yPercent: -100, opacity: 0, duration: 1.3 }, 0.9);
    return tl;
  }

  function imgReady(src) {
    return new Promise((res) => { const i = new Image(); i.onload = i.onerror = res; i.src = src; });
  }

  async function runLoader() {
    const loader = $('#loader');
    document.body.classList.add('is-loading');
    const stroke = $('.loader__stroke'), mark = $('.loader__l'), name = $('.loader__name span');
    const gold = $('.loader__gold'), edge = $('.loader__edge'), inner = $('.loader__inner');
    const countEl = $('#loaderCount');
    const state = { n: 0 };
    const paint = () => { countEl.textContent = String(Math.round(state.n)); };

    gsap.set(name, { yPercent: 120 });
    const ready = Promise.race([
      Promise.all([document.fonts ? document.fonts.ready : null, imgReady('media/hero-poster.jpg')]),
      new Promise((r) => setTimeout(r, 3000))
    ]);

    /* visite répétée dans la même session : préchargeur plus court */
    let seen = false;
    try { seen = sessionStorage.getItem('ll-seen') === '1'; sessionStorage.setItem('ll-seen', '1'); } catch (e) { /* stockage indisponible */ }
    const k = seen ? 0.5 : 1;

    await new Promise((resolve) => {
      const t = gsap.timeline({ onComplete: resolve });
      t.to(stroke, { strokeDashoffset: 0, duration: 1.2 * k, ease: 'power2.inOut' }, 0)
       .to(mark, { opacity: 1, duration: 0.7 * k, ease: 'power2.out' }, 0.45 * k)
       .to(name, { yPercent: 0, duration: 1 * k, ease: 'expo.out' }, 0.35 * k)
       .to(state, { n: 88, duration: 1.45 * k, ease: 'power2.out', onUpdate: paint }, 0);
    });
    await ready;
    await new Promise((resolve) => gsap.to(state, { n: 100, duration: 0.3, ease: 'none', onUpdate: paint, onComplete: resolve }));

    /* Transition d'entrée : l'amande dorée envahit l'écran, puis le rideau se lève */
    await new Promise((resolve) => {
      const t = gsap.timeline({ onComplete: resolve });
      t.to(inner, { opacity: 0, scale: 0.94, duration: 0.4, ease: 'power2.in' }, 0)
       .to(gold, { scale: 13, duration: 0.95, ease: 'expo.in' }, 0.05);
    });
    gsap.set(loader, { backgroundColor: '#D8B25A' });
    gsap.set([gold, inner], { display: 'none' });
    gsap.set(edge, { opacity: 1 });

    const lift = gsap.timeline({
      onComplete: () => {
        loader.style.display = 'none';
        document.body.classList.remove('is-loading');
        if (lenis) lenis.start();
        ScrollTrigger.refresh();
      }
    });
    lift.to(loader, { yPercent: -100, y: () => -edge.offsetHeight, duration: 1.15, ease: 'expo.inOut' }, 0)
        .add(() => heroTl.play(), 0.3);
  }

  /* ───────── Vidéo d'entrée ───────── */
  function initVideo() {
    const video = $('#heroVideo');
    if (!video) return;
    const saveData = navigator.connection && navigator.connection.saveData;
    if (saveData) return;
    video.src = window.innerWidth < 800 ? 'media/hero-540.mp4' : 'media/hero-1080.mp4';
    video.muted = true; video.loop = true; video.playsInline = true;
    const play = () => { const p = video.play(); if (p && p.catch) p.catch(() => {}); };
    video.addEventListener('playing', () => video.classList.add('is-ready'), { once: true });
    play();
    ScrollTrigger.create({
      trigger: '.hero', start: 'top top', end: 'bottom top',
      onToggle: (self) => { if (self.isActive) play(); else video.pause(); }
    });
  }

  /* ───────── Navigation, menu, ancres ───────── */
  function initNav(lenisInst, menuApi) {
    const nav = $('#nav');
    let hidden = false, lastY = window.scrollY;
    const set = (hide) => {
      if (hide === hidden) return;
      hidden = hide;
      gsap.to(nav, { yPercent: hide ? -110 : 0, duration: 0.7, ease: 'power3.out', overwrite: 'auto' });
    };
    const onScroll = () => {
      const y = window.scrollY;
      nav.classList.toggle('is-scrolled', y > 40);
      if (!menuApi.isOpen()) {
        if (y > lastY + 4 && y > 260) set(true);
        else if (y < lastY - 4 || y < 120) set(false);
      }
      lastY = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    /* barre d'action mobile */
    const fab = $('#fab');
    ScrollTrigger.create({
      start: () => window.innerHeight * 0.7, end: 'max',
      onToggle: (self) => fab.classList.toggle('is-in', self.isActive)
    });
  }

  function initSimpleNav() {
    const nav = $('#nav');
    const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    const fab = $('#fab');
    const f = () => fab.classList.toggle('is-in', window.scrollY > window.innerHeight * 0.7);
    window.addEventListener('scroll', f, { passive: true });
    f();
  }

  function initMenu(lenisInst) {
    const burger = $('#burger'), menu = $('#menu');
    let open = false;
    $$('.menu__links a', menu).forEach((a, i) => a.style.setProperty('--i', i));
    const set = (state) => {
      open = state;
      burger.setAttribute('aria-expanded', String(state));
      burger.setAttribute('aria-label', state ? 'Fermer le menu' : 'Ouvrir le menu');
      menu.classList.toggle('is-open', state);
      menu.setAttribute('aria-hidden', String(!state));
      document.body.style.overflow = state ? 'hidden' : '';
      if (lenisInst) state ? lenisInst.stop() : lenisInst.start();
    };
    burger.addEventListener('click', () => set(!open));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && open) { set(false); burger.focus(); } });
    return { isOpen: () => open, close: () => set(false) };
  }

  function initAnchors(lenisInst, menuApi) {
    $$('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const id = a.getAttribute('href');
        if (!id || id === '#') return;
        const target = id === '#top' ? 0 : $(id);
        if (target === null) return;
        e.preventDefault();
        const wasOpen = menuApi && menuApi.isOpen();
        if (wasOpen) menuApi.close();
        const go = () => {
          if (lenisInst) lenisInst.scrollTo(target, { offset: 0, duration: 1.7, easing: (t) => 1 - Math.pow(1 - t, 4) });
          else if (target === 0) window.scrollTo({ top: 0 });
          else target.scrollIntoView();
        };
        wasOpen ? setTimeout(go, 350) : go();
      });
    });
  }

  function initProgress() {
    const set = gsap.quickSetter('.progress span', 'scaleX');
    const upd = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      set(max > 0 ? Math.min(1, window.scrollY / max) : 0);
    };
    window.addEventListener('scroll', upd, { passive: true });
    upd();
  }

  /* ───────── Hero : parallax multicouche ───────── */
  const heroST = { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true };
  gsap.to('[data-hero-media]', { yPercent: 12, ease: 'none', scrollTrigger: heroST });
  gsap.to('[data-hero-mid]', { yPercent: -22, ease: 'none', scrollTrigger: heroST });
  gsap.to('[data-hero-content]', { yPercent: -14, opacity: 0.15, ease: 'none', scrollTrigger: heroST });
  gsap.to('[data-hero-badge]', { yPercent: -60, opacity: 0, ease: 'none', scrollTrigger: heroST });

  /* poussière d'or */
  (function dust() {
    const host = $('#dust');
    if (!host) return;
    const n = window.innerWidth < 800 ? 12 : 30;
    const tl = gsap.timeline({ paused: false });
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span');
      const size = gsap.utils.random(2, 6);
      s.style.cssText = `left:${gsap.utils.random(2, 98)}%;top:${gsap.utils.random(10, 96)}%;width:${size}px;height:${size}px`;
      host.appendChild(s);
      tl.fromTo(s,
        { opacity: 0, y: 0 },
        { opacity: gsap.utils.random(0.35, 0.95), y: -gsap.utils.random(40, 150), duration: gsap.utils.random(3, 6.5), repeat: -1, yoyo: true, ease: 'sine.inOut' },
        gsap.utils.random(0, 4));
    }
    ScrollTrigger.create({ trigger: '.hero', start: 'top top', end: 'bottom top', onToggle: (s) => (s.isActive ? tl.resume() : tl.pause()) });
  })();

  /* parallax souris (desktop) */
  if (finePointer) {
    const hero = $('.hero');
    $$('.float').forEach((el) => {
      const d = parseFloat(el.dataset.depth || 1);
      const qx = gsap.quickTo(el, 'x', { duration: 1.4, ease: 'power3' });
      const qy = gsap.quickTo(el, 'y', { duration: 1.4, ease: 'power3' });
      hero.addEventListener('pointermove', (e) => {
        qx(-(e.clientX / window.innerWidth - 0.5) * 70 * d);
        qy(-(e.clientY / window.innerHeight - 0.5) * 50 * d);
      }, { passive: true });
    });
    const ring = $('.story__ring');
    if (ring) {
      const qx = gsap.quickTo(ring, 'x', { duration: 1.2, ease: 'power3' });
      const qy = gsap.quickTo(ring, 'y', { duration: 1.2, ease: 'power3' });
      $('.story').addEventListener('pointermove', (e) => {
        qx((e.clientX / window.innerWidth - 0.5) * 36);
        qy((e.clientY / window.innerHeight - 0.5) * 28);
      }, { passive: true });
    }
  }

  /* ───────── Marquees réactifs au scroll ───────── */
  (function marquees() {
    const items = $$('.marquee').map((el) => {
      const inner = $('.marquee__inner', el);
      return { el, inner, base: parseFloat(el.dataset.speed || 60), dir: parseFloat(el.dataset.dir || 1), x: 0, gw: 0 };
    });
    const build = (m) => {
      $$('.marquee__group.is-clone', m.inner).forEach((n) => n.remove());
      const group = m.inner.firstElementChild;
      m.gw = group.getBoundingClientRect().width;
      if (!m.gw) return;
      const need = Math.ceil((m.el.offsetWidth * 1.1) / m.gw) + 1;
      for (let i = 0; i < need; i++) {
        const c = group.cloneNode(true);
        c.classList.add('is-clone'); c.setAttribute('aria-hidden', 'true');
        m.inner.appendChild(c);
      }
    };
    items.forEach(build);
    if (document.fonts) document.fonts.ready.then(() => items.forEach(build));
    window.addEventListener('resize', () => items.forEach(build));

    let lastY = window.scrollY, boost = 0, flip = 1;
    gsap.ticker.add((time, dt) => {
      const y = window.scrollY;
      const vel = ((y - lastY) / Math.max(dt, 1)) * 1000; // px/s
      lastY = y;
      boost += (Math.min(Math.abs(vel) / 500, 7) - boost) * 0.08;
      if (Math.abs(vel) > 20) flip += ((vel > 0 ? 1 : -1) - flip) * 0.07;
      items.forEach((m) => {
        if (!m.gw) return;
        m.x -= m.dir * flip * m.base * (1 + boost) * (dt / 1000);
        if (m.x <= -m.gw) m.x += m.gw;
        if (m.x > 0) m.x -= m.gw;
        m.inner.style.transform = `translate3d(${m.x}px,0,0)`;
      });
    });
  })();

  /* ───────── Titres : mots qui montent (masque) ───────── */
  $$('[data-split]').forEach((el) => {
    const words = splitWords(el);
    gsap.set(words, { yPercent: 118 });
    ScrollTrigger.create({
      trigger: el, start: 'top 86%', once: true,
      onEnter: () => gsap.to(words, { yPercent: 0, duration: 1.4, ease: 'expo.out', stagger: 0.07 })
    });
  });

  /* ───────── 01 · Le salon : section pinnée ───────── */
  (function story() {
    const pin = $('.story__pin');
    const steps = $$('.story__step');
    const imgs = $$('.story__img');
    const ring = $('.story__ring');
    const nowEl = $('#storyNow'), bar = $('#storyBar'), ghost = $('#storyGhost');
    const n = steps.length;

    gsap.set(steps, { autoAlpha: 0, y: 40 });
    gsap.set(steps[0], { autoAlpha: 1, y: 0 });
    gsap.set(imgs.slice(1), { clipPath: 'inset(100% 0% 0% 0%)', scale: 1.3 });

    let current = 0;
    const setIndex = (i) => {
      if (i === current) return;
      current = i;
      nowEl.textContent = String(i + 1).padStart(2, '0');
      gsap.fromTo(ghost, { yPercent: 18, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.9, ease: 'expo.out' });
      ghost.textContent = String(i + 1).padStart(2, '0');
    };

    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      onUpdate: () => setIndex(Math.min(n - 1, Math.floor(tl.time() + 0.38))),
      scrollTrigger: {
        trigger: pin, start: 'top top', end: () => '+=' + (n * 85) + '%',
        pin: true, scrub: 0.6, anticipatePin: 1, invalidateOnRefresh: true
      }
    });
    for (let i = 0; i < n - 1; i++) {
      const t = i + 0.62;
      tl.to(steps[i], { autoAlpha: 0, y: -40, duration: 0.3, ease: 'power2.in' }, t)
        .fromTo(steps[i + 1], { autoAlpha: 0, y: 50 }, { autoAlpha: 1, y: 0, duration: 0.36, ease: 'power2.out' }, t + 0.12)
        .to(imgs[i + 1], { clipPath: 'inset(0% 0% 0% 0%)', scale: 1, duration: 0.45, ease: 'power2.inOut' }, t);
    }
    tl.to(bar, { scaleX: 1, duration: n }, 0);
    tl.to({}, { duration: 0.001 }, n);
  })();

  /* ───────── 02 · La carte : défilement horizontal ───────── */
  const mm = gsap.matchMedia();
  mm.add('(min-width: 900px)', () => {
    const track = $('#carteTrack'), pin = $('.carte__pin'), barI = $('.carte__bar i');
    const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
    let st;
    const tween = gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: {
        trigger: pin, start: 'top top', end: () => '+=' + dist(),
        pin: true, scrub: 0.8, anticipatePin: 1, invalidateOnRefresh: true,
        onUpdate: (self) => gsap.set(barI, { scaleX: self.progress }),
        onRefresh: (self) => { st = self; }
      }
    });
    gsap.fromTo('#veins', { scale: 1.12, xPercent: 3 }, { xPercent: -4, ease: 'none', scrollTrigger: { trigger: pin, start: 'top top', end: () => '+=' + dist(), scrub: true, invalidateOnRefresh: true } });

    $$('.panel', track).forEach((panel) => {
      const img = $('.arch img', panel);
      if (img) gsap.fromTo(img, { xPercent: -7 }, { xPercent: 7, ease: 'none', scrollTrigger: { trigger: panel, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } });
      const rows = $$('.prices li', panel);
      if (rows.length) {
        gsap.set(rows, { opacity: 0, y: 26 });
        ScrollTrigger.create({
          trigger: panel, containerAnimation: tween, start: 'left 82%', once: true,
          onEnter: () => gsap.to(rows, { opacity: 1, y: 0, duration: 0.9, stagger: 0.06, ease: 'expo.out', onComplete: () => gsap.set(rows, { clearProps: 'transform,opacity' }) })
        });
      }
      const num = $('.panel__num', panel);
      if (num) gsap.fromTo(num, { yPercent: 30, opacity: 0 }, { yPercent: 0, opacity: 1, ease: 'power3.out', scrollTrigger: { trigger: panel, containerAnimation: tween, start: 'left 90%', end: 'left 40%', scrub: true } });
    });
    gsap.from('.panel--intro .carte__title, .panel--intro .panel__lead, .panel--intro .forfait, .panel--intro .hint', {
      y: 60, opacity: 0, duration: 1.3, stagger: 0.12, ease: 'expo.out',
      scrollTrigger: { trigger: '.carte', start: 'top 60%', once: true }
    });

    /* clavier : amener le panneau focalisé dans la fenêtre */
    pin.addEventListener('scroll', () => { pin.scrollLeft = 0; });
    track.addEventListener('focusin', (e) => {
      const panel = e.target.closest('.panel');
      if (!panel || !st) return;
      const x = Math.min(dist(), Math.max(0, panel.offsetLeft - (window.innerWidth - panel.offsetWidth) / 2));
      const y = st.start + x;
      lenis ? lenis.scrollTo(y, { immediate: true }) : window.scrollTo(0, y);
    });
  });
  mm.add('(max-width: 899px)', () => {
    $$('.panel:not(.panel--intro):not(.panel--outro)').forEach((panel) => {
      const img = $('.arch img', panel);
      if (img) gsap.fromTo(img, { xPercent: -4 }, { xPercent: 4, ease: 'none', scrollTrigger: { trigger: panel, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  });

  /* ───────── 03 · Chiffres ───────── */
  initCounters(false);
  gsap.from('.stat__shape', {
    scale: 0.6, opacity: 0, duration: 1.6, stagger: 0.15, ease: 'expo.out',
    scrollTrigger: { trigger: '.stats', start: 'top 82%', once: true }
  });
  gsap.from('.stat__label', {
    y: 30, opacity: 0, duration: 1.2, stagger: 0.15, ease: 'expo.out',
    scrollTrigger: { trigger: '.stats', start: 'top 82%', once: true }
  });

  /* ───────── 04 · Galerie : colonnes décalées + rideaux ───────── */
  (function gallery() {
    $$('.shot').forEach((shot) => {
      const img = $('img', shot);
      const cover = document.createElement('div');
      cover.className = 'cover';
      shot.appendChild(cover);
      gsap.to(cover, { scaleY: 0, duration: 1.4, ease: 'expo.inOut', scrollTrigger: { trigger: shot, start: 'top 90%', once: true } });
      gsap.fromTo(img, { yPercent: -5 }, { yPercent: 5, ease: 'none', scrollTrigger: { trigger: shot, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    const m = gsap.matchMedia();
    m.add('(min-width: 900px)', () => {
      $$('.galerie__col').forEach((col) => {
        const s = parseFloat(col.dataset.shift || 0);
        gsap.fromTo(col,
          { y: () => -s * window.innerHeight / 100 },
          { y: () => s * window.innerHeight / 100, ease: 'none', scrollTrigger: { trigger: '#galerieGrid', start: 'top bottom', end: 'bottom top', scrub: 0.8, invalidateOnRefresh: true } });
      });
    });
  })();

  /* ───────── 05 · Le lieu : ouverture en cercle ───────── */
  (function lieu() {
    const stage = $('.lieu__stage'), reveal = $('#lieuReveal');
    gsap.set(reveal, { clipPath: 'circle(7% at 50% 52%)' });
    gsap.to(reveal, {
      clipPath: 'circle(80% at 50% 52%)', ease: 'power1.inOut',
      scrollTrigger: { trigger: stage, start: 'top top', end: '+=110%', pin: true, scrub: 0.6, anticipatePin: 1 }
    });
    gsap.from('.lieu__caption .eyebrow', { opacity: 0, y: 20, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: stage, start: 'top 60%', once: true } });
    gsap.from('.lieu__lead', { y: 50, opacity: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.lieu__lead', start: 'top 85%', once: true } });
    gsap.from('.card', { y: 90, opacity: 0, duration: 1.4, stagger: 0.16, ease: 'expo.out', scrollTrigger: { trigger: '.cards', start: 'top 85%', once: true } });
  })();

  /* ───────── 06 · Avis ───────── */
  gsap.from('.review', { y: 70, opacity: 0, duration: 1.3, stagger: 0.09, ease: 'expo.out', scrollTrigger: { trigger: '#carouselTrack', start: 'top 88%', once: true } });
  gsap.from('.avis__score > *', { y: 30, opacity: 0, duration: 1.2, stagger: 0.1, ease: 'expo.out', scrollTrigger: { trigger: '.avis__score', start: 'top 88%', once: true } });

  /* ───────── 07/08/09 ───────── */
  gsap.from('.faq__item', { y: 40, opacity: 0, duration: 1.2, stagger: 0.07, ease: 'expo.out', scrollTrigger: { trigger: '#faq', start: 'top 85%', once: true } });
  gsap.from('.infos__side > :not(h2)', { y: 30, opacity: 0, duration: 1.2, stagger: 0.12, ease: 'expo.out', scrollTrigger: { trigger: '.infos__side', start: 'top 80%', once: true } });
  gsap.from('.reserver__lead, .reserver__actions .btn, .reserver__facts li', { y: 40, opacity: 0, duration: 1.2, stagger: 0.08, ease: 'expo.out', scrollTrigger: { trigger: '.reserver__lead', start: 'top 88%', once: true } });
  gsap.from('.seal', { scale: 0.3, opacity: 0, rotate: -90, duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: '.reserver', start: 'top 60%', once: true } });
  gsap.to('.big--1', { yPercent: -18, rotate: -4, ease: 'none', scrollTrigger: { trigger: '.reserver', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.to('.big--2', { yPercent: 30, rotate: 40, ease: 'none', scrollTrigger: { trigger: '.reserver', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.from('.acces__row, .hours, .social', { y: 40, opacity: 0, duration: 1.2, stagger: 0.1, ease: 'expo.out', scrollTrigger: { trigger: '.acces__list', start: 'top 85%', once: true } });
  gsap.from('.map', { yPercent: 12, opacity: 0, duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: '.map', start: 'top 90%', once: true } });

  /* ───────── Footer géant ───────── */
  (function footer() {
    const giantSpans = $$('.footer__giant span');
    const chars = giantSpans.flatMap(splitChars);
    gsap.set(chars, { yPercent: 105 });
    ScrollTrigger.create({
      trigger: '.footer__giant', start: 'top 94%', once: true,
      onEnter: () => gsap.to(chars, { yPercent: 0, duration: 1.6, stagger: 0.07, ease: 'expo.out' })
    });
    gsap.from('.footer__col', { y: 30, opacity: 0, duration: 1.1, stagger: 0.1, ease: 'expo.out', scrollTrigger: { trigger: '.footer__top', start: 'top 90%', once: true } });
  })();

  /* ───────── Interactions fines : magnétisme, tilt, curseur ───────── */
  initMagnetic();
  initTilt();
  initCursor();

  /* ───────── Rafraîchir quand tout est chargé ───────── */
  window.addEventListener('load', () => ScrollTrigger.refresh());
  if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());

  /* ═════════════ Fonctions utilitaires ═════════════ */

  function initCounters(instant) {
    $$('[data-count]').forEach((el) => {
      const end = parseFloat(el.dataset.count);
      const dec = parseInt(el.dataset.decimals || '0', 10);
      const fmt = (v) => v.toFixed(dec).replace('.', ',');
      if (instant || !window.gsap) { el.textContent = fmt(end); return; }
      const o = { v: 0 };
      el.textContent = fmt(0);
      ScrollTrigger.create({
        trigger: el, start: 'top 88%', once: true,
        onEnter: () => gsap.to(o, { v: end, duration: 2.6, ease: 'power3.out', onUpdate: () => { el.textContent = fmt(o.v); } })
      });
    });
  }

  function initMagnetic() {
    if (!finePointer) return;
    $$('.magnetic').forEach((el) => {
      const label = $('.btn__label', el);
      const qx = gsap.quickTo(el, 'x', { duration: 1, ease: 'elastic.out(1,.55)' });
      const qy = gsap.quickTo(el, 'y', { duration: 1, ease: 'elastic.out(1,.55)' });
      const lx = label ? gsap.quickTo(label, 'x', { duration: 1, ease: 'elastic.out(1,.6)' }) : null;
      const ly = label ? gsap.quickTo(label, 'y', { duration: 1, ease: 'elastic.out(1,.6)' }) : null;
      const mark = (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--x', (e.clientX - r.left) + 'px');
        el.style.setProperty('--y', (e.clientY - r.top) + 'px');
      };
      el.addEventListener('pointerenter', mark);
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        qx(dx * 0.3); qy(dy * 0.4);
        if (lx) { lx(dx * 0.12); ly(dy * 0.18); }
      });
      el.addEventListener('pointerleave', (e) => { mark(e); qx(0); qy(0); if (lx) { lx(0); ly(0); } });
    });
  }

  function initTilt() {
    if (!finePointer) return;
    $$('.tilt').forEach((el) => {
      const max = parseFloat(el.dataset.tiltMax || 7);
      let glare = $('.glare', el);
      if (!glare) { glare = document.createElement('i'); glare.className = 'glare'; glare.setAttribute('aria-hidden', 'true'); el.appendChild(glare); }
      const blob = document.createElement('b');
      glare.appendChild(blob);
      gsap.set(el, { transformPerspective: 900 });
      const rx = gsap.quickTo(el, 'rotationX', { duration: 0.7, ease: 'power3' });
      const ry = gsap.quickTo(el, 'rotationY', { duration: 0.7, ease: 'power3' });
      const gx = gsap.quickTo(blob, 'x', { duration: 0.45, ease: 'power3' });
      const gy = gsap.quickTo(blob, 'y', { duration: 0.45, ease: 'power3' });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        ry((px - 0.5) * max * 2); rx(-(py - 0.5) * max * 2);
        gx(px * r.width); gy(py * r.height);
      });
      el.addEventListener('pointerleave', () => { rx(0); ry(0); });
    });
  }

  function initCursor() {
    if (!finePointer) return;
    const c = $('.cursor');
    const qx = gsap.quickTo(c, 'x', { duration: 0.4, ease: 'power3' });
    const qy = gsap.quickTo(c, 'y', { duration: 0.4, ease: 'power3' });
    window.addEventListener('pointermove', (e) => { c.classList.add('is-on'); qx(e.clientX); qy(e.clientY); }, { passive: true });
    document.addEventListener('pointerover', (e) => c.classList.toggle('is-link', !!e.target.closest('a, button, .tilt')));
    document.documentElement.addEventListener('pointerleave', () => c.classList.remove('is-on'));
  }
})();

/* ═════════════ Fonctions sans dépendance GSAP ═════════════ */

function initDrips() {
  document.querySelectorAll('svg.drip').forEach((svg, k) => {
    const w = 1440, y0 = 22;
    let r = (k + 3) * 7919;
    const rnd = () => { r = (r * 9301 + 49297) % 233280; return r / 233280; };
    let d = `M0 0H${w}V${y0}`;
    let x = w - 40 - rnd() * 50;
    while (x > 50) {
      const dw = 14 + rnd() * 20;
      const len = rnd() < 0.5 ? 14 + rnd() * 26 : 46 + rnd() * 66;
      const xr = x + dw / 2, xl = x - dw / 2;
      d += ` L${xr + 14} ${y0} Q${xr} ${y0} ${xr} ${y0 + 14} V${y0 + len} A${dw / 2} ${dw / 2} 0 0 1 ${xl} ${y0 + len} V${y0 + 14} Q${xl} ${y0} ${xl - 14} ${y0}`;
      x -= dw + 34 + rnd() * 130;
    }
    d += ` L0 ${y0}Z`;
    svg.querySelector('path').setAttribute('d', d);
    if (svg.dataset.drip) svg.style.color = svg.dataset.drip;
  });
}

function initFaq() {
  const items = Array.from(document.querySelectorAll('.faq__item'));
  items.forEach((item) => {
    const btn = item.querySelector('button');
    btn.addEventListener('click', () => {
      const open = !item.classList.contains('is-open');
      items.forEach((o) => {
        o.classList.remove('is-open');
        o.querySelector('button').setAttribute('aria-expanded', 'false');
      });
      if (open) { item.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true'); }
      if (window.ScrollTrigger) setTimeout(() => ScrollTrigger.refresh(), 750);
    });
  });
}

function initOpenNow() {
  const el = document.getElementById('openNow');
  const rows = Array.from(document.querySelectorAll('#hours tr'));
  const label = el ? el.querySelector('span') : null;
  const schedule = { 0: null, 1: null, 2: [10, 19], 3: [10, 19], 4: [10, 19], 5: [10, 19], 6: [10, 19] };
  const names = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const paris = () => {
    try {
      const f = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' });
      const p = {};
      f.formatToParts(new Date()).forEach((x) => { p[x.type] = x.value; });
      return { d: map[p.weekday], h: parseInt(p.hour, 10) % 24, m: parseInt(p.minute, 10) };
    } catch (e) {
      const n = new Date();
      return { d: n.getDay(), h: n.getHours(), m: n.getMinutes() };
    }
  };
  const render = () => {
    const { d, h, m } = paris();
    const today = schedule[d];
    const mins = h * 60 + m;
    let open = false, txt;
    if (today && mins >= today[0] * 60 && mins < today[1] * 60) {
      open = true; txt = `Ouvert · ferme à ${today[1]} h`;
    } else if (today && mins < today[0] * 60) {
      txt = `Fermé · ouvre à ${today[0]} h`;
    } else {
      let nd = d, add = 1;
      for (let i = 1; i <= 7; i++) { const k = (d + i) % 7; if (schedule[k]) { nd = k; add = i; break; } }
      txt = `Fermé · ouvre ${add === 1 ? 'demain' : names[nd]} à ${schedule[nd][0]} h`;
    }
    if (el) { el.classList.toggle('is-open', open); label.textContent = txt; }
    rows.forEach((tr) => {
      const is = parseInt(tr.dataset.day, 10) === d;
      tr.classList.toggle('is-today', is);
      if (is) tr.setAttribute('aria-current', 'date'); else tr.removeAttribute('aria-current');
    });
  };
  render();
  setInterval(render, 60000);
}

function initCarousel() {
  const track = document.getElementById('carouselTrack');
  if (!track || track.dataset.ready) return;
  track.dataset.ready = '1';
  const slides = Array.from(track.querySelectorAll('.review'));
  const bar = document.getElementById('carouselBar');
  const prev = document.getElementById('prevRev'), next = document.getElementById('nextRev');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gap = () => parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap || 0) || 0;
  const step = () => slides[0].getBoundingClientRect().width + gap();
  const update = () => {
    const max = track.scrollWidth - track.clientWidth;
    const p = max > 0 ? track.scrollLeft / max : 1;
    bar.style.transform = `scaleX(${0.08 + 0.92 * p})`;
  };
  track.addEventListener('scroll', update, { passive: true });
  update();
  const go = (dirn) => {
    const max = track.scrollWidth - track.clientWidth;
    let left = track.scrollLeft + dirn * step();
    if (dirn > 0 && track.scrollLeft >= max - 6) left = 0;
    if (dirn < 0 && track.scrollLeft <= 6) left = max;
    track.scrollTo({ left, behavior: reduceMotion ? 'auto' : 'smooth' });
  };
  next.addEventListener('click', () => go(1));
  prev.addEventListener('click', () => go(-1));

  if (reduceMotion) return;
  let timer = null, visible = false, hover = false;
  const stop = () => { clearInterval(timer); timer = null; };
  const start = () => { stop(); if (visible && !hover) timer = setInterval(() => go(1), 5200); };
  ['pointerenter', 'focusin', 'touchstart'].forEach((ev) => track.addEventListener(ev, () => { hover = true; stop(); }, { passive: true }));
  ['pointerleave', 'focusout'].forEach((ev) => track.addEventListener(ev, () => { hover = false; start(); }));
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; start(); }, { threshold: 0.35 }).observe(track);
  }
}
