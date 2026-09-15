/* Meya Orbit — scoped, reusable HTML/CSS/JS. Vimeo SDK loads only for Vimeo cards. */
/* The scene sampler is shared by the live preview and the MP4 exporter. */
window.MeyaScene = window.MeyaScene || (() => {
  const clampScene = (n, a, b) => Math.min(b, Math.max(a, n));
  const ratioScene = value => ({ '4:3': 4 / 3, '1:1': 1, '3:4': 3 / 4, '16:9': 16 / 9, '9:16': 9 / 16 })[value] || 4 / 3;
  function cardSize(config, width, height, item) {
    const ratio = ratioScene(item?.cardRatio);
    const base = Math.min(width * 0.18, 180) * clampScene(Number(config.cardSize ?? 100) / 100, 0.55, 1.8);
    return { width: base * Math.min(1, ratio), height: base * Math.min(1, ratio) / ratio };
  }
  function sample(config = {}, width = 1200, height = 800, time = 0) {
    const media = (config.media || []).filter(item => item?.src && ['image', 'video', 'vimeo'].includes(item.type));
    const count = media.length ? Math.max(media.length, clampScene(Number(config.count ?? 22), 1, 48)) : 0;
    const template = config.template || 'orbit';
    const speed = clampScene(Number(config.speed ?? 0.1), 0, 0.5) * (config.reverse ? -1 : 1);
    const spread = clampScene(Number(config.spread ?? 100) / 100, 0.35, 2.2);
    const depthAmount = clampScene(Number(config.depth ?? 100) / 100, 0, 1.8);
    const tilt = Number(config.tilt ?? 0) * Math.PI / 180;
    const gap = clampScene(Number(config.gap ?? 12) / 100, 0, 0.5);
    const output = [];
    for (let i = 0; i < count; i++) {
      const item = media[i % media.length]; const size = cardSize(config, width, height, item);
      let nx = 0, ny = 0, depth = 0, rotation = 0;
      if (template === 'carousel') {
        const u = count === 1 ? 0 : i / (count - 1) * 2 - 1;
        nx = u * (0.82 + gap * 0.42) * spread; depth = (1 - Math.abs(u)) * depthAmount; ny = Math.sin(i * 1.37 + time * speed * 1.5) * (0.08 + gap * 0.12);
        rotation = u * -0.18 + tilt;
      } else if (template === 'wave') {
        const rows = clampScene(Number(config.rows ?? 3), 2, 6); const cols = Math.ceil(count / rows);
        const col = i % cols; const row = Math.floor(i / cols); const u = cols <= 1 ? 0 : col / (cols - 1) * 2 - 1;
        nx = u * (0.78 + gap * 0.34) * spread; ny = ((row + 0.5) / rows - 0.5) * (1.45 + gap * 0.55) + Math.sin(u * 3 + time * speed * 2) * (0.08 + gap * 0.1);
        depth = (Math.sin(u * Math.PI + time * speed * 1.4) + 1) * 0.5 * depthAmount; rotation = Math.sin(u * 2 + row) * 0.08 + tilt;
      } else {
        const yaw = time * speed * 1.6; const pitch = tilt - 0.12; const y = 1 - 2 * (i + 0.5) / Math.max(1, count);
        const r = Math.sqrt(Math.max(0, 1 - y * y)); const angle = i * Math.PI * (3 - Math.sqrt(5)) + yaw;
        const x0 = Math.cos(angle) * r, z0 = Math.sin(angle) * r; const cp = Math.cos(pitch), sp = Math.sin(pitch);
        nx = x0 * 0.87 * spread; ny = (y * cp - z0 * sp) * 0.9 * spread; depth = (y * sp + z0 * cp) * depthAmount; rotation = tilt + Math.sin(angle) * 0.035;
      }
      const perspective = 1 / (1 - depth * 0.17); const scale = (0.76 + (depth + 1) * 0.15) * perspective;
      const reveal = config.intro === false ? 1 : clampScene((time - i / Math.max(1, count) * 0.35) / 1.65, 0, 1);
      const ease = 1 - Math.pow(1 - reveal, 3); const outward = 1 + (1 - ease) * 1.8;
      output.push({ item, index: i, x: width / 2 + nx * width * 0.38 * perspective * outward, y: height / 2 + ny * height * 0.39 * perspective * outward, width: size.width * scale, height: size.height * scale, rotation, opacity: (0.3 + Math.pow((depth + 1) / 2, 0.8) * 0.7) * Math.min(1, reveal * 5), blur: Math.max(0, -depth) * 0.65, depth });
    }
    return { cards: output, width, height };
  }
  return { sample, ratio: ratioScene };
})();
(() => {
  'use strict';
  if (window.MeyaOrbit) { window.MeyaOrbit.scan(); return; }
  const instances = new WeakMap();
  let sdkPromise;
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  function safeURL(value) {
    try {
      const url = new URL(value);
      return ['https:', 'http:', 'blob:'].includes(url.protocol) ? url.href : '';
    } catch { return ''; }
  }
  function vimeoURL(value) {
    try {
      const url = new URL(value);
      if (!['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'].includes(url.hostname)) return '';
      const parts = url.pathname.split('/').filter(Boolean);
      const id = url.hostname === 'player.vimeo.com' ? parts[1] : parts[0];
      if (!/^\d+$/.test(id || '')) return '';
      const result = new URL('https://player.vimeo.com/video/' + id);
      const hash = url.searchParams.get('h') || (url.hostname !== 'player.vimeo.com' ? parts[1] : '');
      if (hash) result.searchParams.set('h', hash);
      for (const [key, val] of Object.entries({ background: 1, autoplay: 0, loop: 1, muted: 1, autopause: 0, playsinline: 1, dnt: 1 })) {
        result.searchParams.set(key, val);
      }
      return result.href;
    } catch { return ''; }
  }
  function vimeoSDK() {
    if (window.Vimeo?.Player) return Promise.resolve(window.Vimeo);
    if (!sdkPromise) sdkPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://player.vimeo.com/api/player.js';
      script.onload = () => window.Vimeo?.Player ? resolve(window.Vimeo) : reject(new Error('Vimeo unavailable'));
      script.onerror = () => reject(new Error('Could not load the Vimeo player SDK. Check network access or content blockers.'));
      document.head.append(script);
    });
    return sdkPromise;
  }
  function mount(root, config = {}) {
    instances.get(root)?.destroy();
    const abort = new AbortController();
    const listen = (el, type, fn) => el.addEventListener(type, fn, { signal: abort.signal });
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const items = (config.media || []).filter(item => safeURL(item.src) && ['image', 'video', 'vimeo'].includes(item.type)).slice(0, 48);
    const speed = clamp(Number(config.speed ?? 0.10), 0, 0.5);
    const density = clamp(Number(config.count ?? 22), 1, 48);
    root.style.setProperty('--orbit-height', clamp(Number(config.height ?? 420), 200, 900) + 'px');
    root.style.setProperty('--orbit-radius', clamp(Number(config.radius ?? 3), 0, 50) + 'px');
    root.style.setProperty('--orbit-canvas-ratio', (Number(config.canvasWidth || 1200) / Math.max(1, Number(config.canvasHeight || 800))).toFixed(5));
    root.classList.add('meya-orbit');
    root.setAttribute('role', 'group');
    root.setAttribute('aria-label', 'Orbiting project imagery');
    root.tabIndex = 0;
    const hint = document.createElement('span');
    hint.className = 'meya-orbit__hint';
    hint.textContent = 'Drag to rotate. Use arrow keys to rotate, and Space to pause or resume animation.';
    root.replaceChildren(hint);
    let frame = 0, alive = true, visible = true, paused = false, yaw = 0.35, pitch = -0.12;
    let lastTime = 0, width = 0, height = 0, radiusX = 0, radiusY = 0, cardWidth = 0;
    let drag = null, hover = false, pointerTilt = 0, tilt = 0, mediaTimer = 0;
    let introTime = config.intro === false || reduced.matches ? 2.2 : 0;
    let suppressClick = false, opener = null;
    const popup = document.createElement('dialog');
    popup.className = 'meya-orbit__popup';
    popup.setAttribute('aria-label', 'Project preview');
    const close = document.createElement('button');
    close.type = 'button'; close.className = 'meya-orbit__close'; close.textContent = '×';
    close.setAttribute('aria-label', 'Close preview');
    const viewer = document.createElement('div'); viewer.className = 'meya-orbit__viewer';
    const caption = document.createElement('p'); caption.className = 'meya-orbit__caption';
    popup.append(close, viewer, caption); document.body.append(popup);
    function openPreview(card) {
      if (popup.open || card.item.popup === false) return;
      opener = card.element;
      caption.textContent = card.item.title || ''; caption.hidden = !card.item.title;
      popup.setAttribute('aria-label', card.item.title || 'Project preview');
      let media;
      if (card.item.type === 'image') {
        media = document.createElement('img'); media.alt = card.item.title || 'Project image'; media.src = card.item.src;
      } else if (card.item.type === 'video') {
        media = document.createElement('video'); media.controls = true; media.playsInline = true;
        media.src = card.item.src; if (safeURL(card.item.poster)) media.poster = card.item.poster;
      } else {
        media = document.createElement('iframe');
        const url = new URL(vimeoURL(card.item.src));
        url.searchParams.set('background', '0'); url.searchParams.set('controls', '1');
        url.searchParams.set('muted', '0'); url.searchParams.set('loop', '0');
        media.src = url.href; media.title = card.item.title || 'Project video';
        media.allow = 'autoplay; fullscreen; picture-in-picture'; media.allowFullscreen = true;
        media.style.aspectRatio = String(clamp(Number(card.item.ratio || 16 / 9), 0.2, 5));
      }
      viewer.replaceChildren(media); popup.showModal(); close.focus(); resume();
    }
    listen(close, 'click', () => popup.close());
    let backdropDown = false;
    listen(popup, 'pointerdown', e => { backdropDown = e.target === popup; });
    listen(popup, 'click', e => { if (backdropDown && e.target === popup) popup.close(); });
    listen(popup, 'close', () => {
      viewer.querySelector('video')?.pause(); viewer.replaceChildren();
      if (alive) { opener?.focus({ preventScroll: true }); resume(); }
    });
    const count = items.length ? Math.max(items.length, density) : 0;
    const cards = Array.from({ length: count }, (_, i) => {
      const item = items[i % items.length];
      const element = document.createElement(item.popup === false ? 'div' : 'button');
      element.className = 'meya-orbit__card';
      if (item.popup !== false) {
        element.type = 'button'; element.setAttribute('aria-label', item.title ? 'Open ' + item.title : 'Open project ' + (i % items.length + 1));
        element.setAttribute('aria-haspopup', 'dialog');
      } else element.setAttribute('aria-hidden', 'true');
      const cardRatio = ({ '4:3': 4/3, '1:1': 1, '3:4': 3/4, '16:9': 16/9, '9:16': 9/16 })[item.cardRatio] || 4/3;
      element.style.aspectRatio = String(cardRatio);
      const y = 1 - 2 * (i + 0.5) / count;
      const r = Math.sqrt(1 - y * y), angle = i * Math.PI * (3 - Math.sqrt(5));
      const card = { element, item, cardRatio, index: i, x: Math.cos(angle) * r, y, z: Math.sin(angle) * r, depth: 0, wanted: false, node: null, player: null, loading: false };
      listen(element, 'click', e => { if (!suppressClick || e.detail === 0) openPreview(card); });
      if (item.type === 'image' || safeURL(item.poster)) {
        const img = document.createElement('img');
        img.src = item.type === 'image' ? item.src : item.poster;
        img.alt = ''; img.draggable = false; img.decoding = 'async';
        img.addEventListener('error', () => { element.dataset.mediaError = 'true'; img.style.visibility = 'hidden'; });
        element.append(img);
      }
      root.append(element);
      return card;
    });
    function setPlayback(card, wanted) {
      card.wanted = wanted;
      if (card.node?.tagName === 'VIDEO') {
        if (wanted && card.node.paused) card.node.play().catch(() => {});
        else if (!wanted && !card.node.paused) card.node.pause();
      }
      if (card.player) {
        (wanted ? card.player.play() : card.player.pause()).catch(() => {});
      }
    }
    async function prepare(card) {
      if (card.loading || card.node || !alive) return;
      card.loading = true;
      if (card.item.type === 'video') {
        const video = document.createElement('video');
        video.muted = true; video.defaultMuted = true; video.loop = true; video.playsInline = true;
        video.setAttribute('muted', ''); video.setAttribute('playsinline', '');
        video.preload = 'metadata';
        if (safeURL(card.item.poster)) video.poster = card.item.poster;
        video.src = card.item.src;
        video.addEventListener('error', () => { card.element.dataset.mediaError = 'true'; video.style.visibility = 'hidden'; });
        card.node = video; card.element.append(video);
        setPlayback(card, card.wanted);
      } else if (card.item.type === 'vimeo') {
        const src = vimeoURL(card.item.src);
        if (!src) { card.element.dataset.mediaError = 'true'; return; }
        try {
          const Vimeo = await vimeoSDK();
          if (!alive) return;
          const iframe = document.createElement('iframe');
          iframe.title = 'Decorative project video'; iframe.tabIndex = -1;
          iframe.allow = 'autoplay; fullscreen; picture-in-picture';
          iframe.src = src;
          // Source ratio and the displayed card shape are independent.
          const ratio = clamp(Number(card.item.ratio || 16 / 9), 0.2, 5);
          iframe.style.width = Math.max(100, ratio / card.cardRatio * 100) + '%';
          iframe.style.height = Math.max(100, card.cardRatio / ratio * 100) + '%';
          card.node = iframe; card.element.append(iframe);
          card.player = new Vimeo.Player(iframe);
          await card.player.ready();
          if (!alive) return;
          await card.player.setVolume(0);
          setPlayback(card, card.wanted);
        } catch (error) { card.element.dataset.mediaError = error.message || 'Vimeo player could not load'; }
      }
    }
    function syncMedia() {
      const active = alive && visible && !document.hidden && !paused && !popup.open && !reduced.matches;
      // Only the nearest three videos run; the rest retain their poster or paused frame.
      const front = active ? cards.filter(c => c.item.type !== 'image' && c.depth > -0.1).sort((a, b) => b.depth - a.depth).slice(0, 3) : [];
      for (const card of cards) {
        if (card.item.type === 'image') continue;
        const wanted = front.includes(card);
        if (wanted !== card.wanted) setPlayback(card, wanted);
        if (wanted) prepare(card);
      }
    }
    function draw() {
      if ((config.template || 'orbit') !== 'orbit') {
        const layout = window.MeyaScene.sample(config, width, height, (performance.now() || 0) / 1000);
        for (const card of cards) {
          const position = layout.cards[card.index]; if (!position) continue;
          card.depth = position.depth;
          card.element.style.width = position.width + 'px';
          card.element.style.aspectRatio = String(card.cardRatio);
          card.element.style.transform = `translate(-50%, -50%) translate3d(${(position.x - width / 2).toFixed(2)}px, ${(position.y - height / 2).toFixed(2)}px, 0) rotate(${position.rotation}rad)`;
          card.element.style.opacity = position.opacity.toFixed(3);
          card.element.style.zIndex = String(Math.round((position.depth + 1) * 1000));
          card.element.style.filter = `blur(${position.blur.toFixed(2)}px)`;
        }
        return;
      }
      const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch + tilt), sp = Math.sin(pitch + tilt);
      for (const card of cards) {
        const progress = clamp((introTime - card.index / Math.max(1, count) * 0.35) / 1.65, 0, 1);
        const reveal = 1 - Math.pow(1 - progress, 3);
        const x = card.x * cy + card.z * sy;
        const z0 = card.z * cy - card.x * sy;
        const y = card.y * cp - z0 * sp;
        const z = card.y * sp + z0 * cp;
        const perspective = 1 / (1 - z * 0.20 * clamp(Number(config.depth ?? 100) / 100, 0, 1.8));
        const scale = (0.76 + (z + 1) * 0.16) * perspective;
        card.depth = z;
        const spread = (1 + (1 - reveal) * 2.6) * clamp(Number(config.spread ?? 100) / 100, 0.35, 2.2);
        card.element.style.transform = `translate(-50%, -50%) translate3d(${(x * radiusX * perspective * spread).toFixed(2)}px, ${(y * radiusY * perspective * spread).toFixed(2)}px, 0) scale(${(scale * (1 + (1 - reveal) * 0.6)).toFixed(4)})`;
        card.element.style.opacity = ((0.27 + Math.pow((z + 1) / 2, 0.8) * 0.73) * Math.min(1, progress * 5)).toFixed(3);
        card.element.style.zIndex = String(Math.round((z + 1) * 1000));
        card.element.style.filter = `blur(${(Math.max(0, -z) * 0.65).toFixed(2)}px)`;
      }
    }
    function resize() {
      width = root.clientWidth; height = root.clientHeight;
      const span = Math.min(width * 0.90, 680, height * 1.7);
      cardWidth = Math.min(140, span * 0.215) * clamp(Number(config.cardSize ?? 100) / 100, 0.55, 1.8);
      radiusX = Math.max(0, (span - cardWidth * 1.45) / 2.12);
      const maxCardHeight = Math.max(0, ...cards.map(card => cardWidth * Math.min(1, card.cardRatio) / card.cardRatio));
      radiusY = Math.max(0, (height * 0.91 - maxCardHeight * 1.45) / 2.12);
      for (const card of cards) card.element.style.width = cardWidth * Math.min(1, card.cardRatio) + 'px';
      draw();
    }
    function tick(time) {
      frame = 0;
      if (!alive || !visible || document.hidden || paused || popup.open || reduced.matches) return;
      const dt = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0;
      lastTime = time;
      introTime = Math.min(2.2, introTime + dt);
      if (!drag) yaw += dt * speed * (hover ? 0.3 : 1) * (config.reverse ? -1 : 1);
      tilt += (pointerTilt - tilt) * (1 - Math.exp(-dt * 5));
      draw();
      if (time - mediaTimer > 300) { syncMedia(); mediaTimer = time; }
      frame = requestAnimationFrame(tick);
    }
    function resume() {
      cancelAnimationFrame(frame); frame = 0; lastTime = 0;
      if (reduced.matches) introTime = 2.2;
      draw(); syncMedia();
      if (alive && visible && !document.hidden && !paused && !popup.open && !reduced.matches) frame = requestAnimationFrame(tick);
    }
    listen(root, 'pointerdown', e => {
      if (e.button !== 0 || !e.isPrimary) return;
      suppressClick = false;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, yaw, pitch };
      root.dataset.dragging = 'true';
    });
    listen(root, 'pointermove', e => {
      if (drag && e.pointerId === drag.id) {
        if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 7) {
          suppressClick = true; introTime = 2.2;
          if (!root.hasPointerCapture(e.pointerId)) root.setPointerCapture(e.pointerId);
        }
        if (!suppressClick) return;
        yaw = drag.yaw + (e.clientX - drag.x) * 0.007;
        pitch = clamp(drag.pitch - (e.clientY - drag.y) * 0.004, -0.75, 0.75);
        draw();
      } else if (e.pointerType === 'mouse' && !reduced.matches) {
        const rect = root.getBoundingClientRect();
        pointerTilt = ((e.clientY - rect.top) / height - 0.5) * 0.16;
      }
    });
    function release(e) {
      if (!drag || e.pointerId !== drag.id) return;
      drag = null; root.dataset.dragging = 'false';
      if (root.hasPointerCapture(e.pointerId)) root.releasePointerCapture(e.pointerId);
      syncMedia();
    }
    listen(window, 'pointerup', release); listen(root, 'pointercancel', release); listen(root, 'lostpointercapture', release);
    listen(root, 'pointerenter', () => { hover = true; });
    listen(root, 'pointerleave', () => { hover = false; pointerTilt = 0; });
    listen(root, 'keydown', e => {
      if (e.target !== root && ['Space', 'Enter'].includes(e.code)) return;
      if (e.code === 'Space') { e.preventDefault(); paused = !paused; resume(); }
      else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        if (e.key === 'ArrowLeft') yaw -= 0.15;
        if (e.key === 'ArrowRight') yaw += 0.15;
        if (e.key === 'ArrowUp') pitch = clamp(pitch - 0.1, -0.75, 0.75);
        if (e.key === 'ArrowDown') pitch = clamp(pitch + 0.1, -0.75, 0.75);
        draw(); syncMedia();
      }
    });
    listen(document, 'visibilitychange', resume); listen(reduced, 'change', resume);
    const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; resume(); }, { threshold: 0.01 });
    const sizeObserver = new ResizeObserver(resize);
    observer.observe(root); sizeObserver.observe(root);
    resize(); resume();
    const instance = { destroy() {
      alive = false; abort.abort(); cancelAnimationFrame(frame);
      viewer.querySelector('video')?.pause(); if (popup.open) popup.close(); popup.remove();
      observer.disconnect(); sizeObserver.disconnect();
      for (const card of cards) {
        card.wanted = false;
        if (card.player) card.player.destroy().catch(() => {});
        if (card.node?.tagName === 'VIDEO') { card.node.pause(); card.node.removeAttribute('src'); card.node.load(); }
      }
      root.replaceChildren(); instances.delete(root);
    }};
    instances.set(root, instance);
    return instance;
  }
  function scan() {
    document.querySelectorAll('[data-meya-orbit]').forEach(root => {
      if (instances.has(root)) return;
      const data = root.querySelector('script[type="application/json"]');
      if (!data) return;
      try { mount(root, JSON.parse(data.textContent)); } catch (error) { console.warn('Check Meya Orbit configuration.', error); }
    });
  }
  window.MeyaOrbit = { mount, scan };
  scan();
})();
