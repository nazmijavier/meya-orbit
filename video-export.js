/* Meya Animate MP4 export. Requires the bundled mp4-muxer UMD build and WebCodecs. */
(() => {
  'use strict';
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const even = n => Math.max(2, Math.round(n / 2) * 2);
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const abortIfNeeded = signal => { if (signal?.aborted) throw new DOMException('Export cancelled.', 'AbortError'); };
  function sourceURL(value) {
    try { const url = new URL(value, location.href); return ['https:', 'http:', 'blob:', 'data:'].includes(url.protocol) ? url.href : ''; }
    catch { return ''; }
  }
  function roundedPath(ctx, x, y, w, h, radius) {
    const r = Math.min(radius, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  async function loadImage(item, signal) {
    abortIfNeeded(signal);
    const src = sourceURL(item.type === 'image' ? item.src : item.poster);
    if (!src) throw new Error('Add an image URL or poster image before exporting MP4.');
    const image = new Image();
    if (/^https?:/i.test(src)) image.crossOrigin = 'anonymous';
    image.decoding = 'async'; image.src = src;
    await image.decode().catch(() => { throw new Error('Could not load an image or poster. Check the URL and CORS settings.'); });
    return image;
  }
  async function loadVideo(item, signal) {
    abortIfNeeded(signal);
    const src = sourceURL(item.src);
    if (!src) throw new Error('Add a direct MP4 or WebM URL before exporting MP4.');
    const video = document.createElement('video');
    video.preload = 'auto'; video.muted = true; video.playsInline = true; video.src = src;
    await new Promise((resolve, reject) => {
      const done = () => { cleanup(); resolve(); }, fail = () => { cleanup(); reject(new Error('Could not load a video for MP4 export. Check that the URL is a direct MP4/WebM with CORS enabled.')); };
      const cleanup = () => { video.removeEventListener('loadedmetadata', done); video.removeEventListener('error', fail); };
      video.addEventListener('loadedmetadata', done, { once: true }); video.addEventListener('error', fail, { once: true });
      video.load();
    });
    return video;
  }
  async function seek(video, time, signal) {
    abortIfNeeded(signal);
    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
    if (!duration) return;
    const target = Math.min(Math.max(0, time % duration), Math.max(0, duration - 0.001));
    if (Math.abs(video.currentTime - target) < 0.001 && video.readyState >= 2) return;
    await new Promise((resolve, reject) => {
      let finished = false;
      const done = () => { if (finished) return; finished = true; cleanup(); resolve(); };
      const fail = () => { if (finished) return; finished = true; cleanup(); reject(new Error('A source video could not seek during export.')); };
      const cleanup = () => { video.removeEventListener('seeked', done); video.removeEventListener('error', fail); };
      video.addEventListener('seeked', done, { once: true }); video.addEventListener('error', fail, { once: true });
      video.currentTime = target;
    });
  }
  function drawObjectFit(ctx, source, x, y, w, h) {
    const sw = source.videoWidth || source.naturalWidth || source.width || 1;
    const sh = source.videoHeight || source.naturalHeight || source.height || 1;
    const scale = Math.max(w / sw, h / sh); const dw = sw * scale, dh = sh * scale;
    ctx.drawImage(source, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  }
  async function exportMP4(config = {}, options = {}) {
    if (!window.VideoEncoder || !window.VideoFrame) throw new Error('This browser cannot export MP4 here. Try the latest Chrome, Edge, or Safari.');
    const muxerAPI = window.Mp4Muxer;
    if (!muxerAPI?.Muxer || !muxerAPI?.ArrayBufferTarget) throw new Error('The MP4 encoder is not available. Reload the editor and try again.');
    const width = even(clamp(Number(options.width || config.canvasWidth || 1200), 320, 1920));
    const height = even(clamp(Number(options.height || config.canvasHeight || 800), 240, 1920));
    const fps = clamp(Number(options.fps || config.fps || 30), 12, 60);
    const duration = clamp(Number(options.duration || config.duration || 8), 1, 30);
    const signal = options.signal;
    const media = (config.media || []).filter(item => sourceURL(item.src) && ['image', 'video', 'vimeo'].includes(item.type)).slice(0, 48);
    if (!media.length) throw new Error('Add at least one hosted image or video before exporting MP4.');
    if (media.some(item => item.type === 'vimeo' && !sourceURL(item.poster))) throw new Error('Add a poster image to every Vimeo card before exporting MP4. Vimeo cards export their poster image.');
    const canvas = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(width, height) : Object.assign(document.createElement('canvas'), { width, height });
    const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
    const sources = await Promise.all(media.map(item => item.type === 'video' ? loadVideo(item, signal) : loadImage(item, signal)));
    const codecCandidates = ['avc1.4d401f', 'avc1.42001f', 'avc1.42E01E'];
    let supported;
    for (const codec of codecCandidates) {
      try {
        const result = await VideoEncoder.isConfigSupported({ codec, width, height, bitrate: 5_000_000, framerate: fps });
        if (result.supported) { supported = { ...result.config, codec }; break; }
      } catch { /* Try the next H.264 profile. */ }
    }
    if (!supported) throw new Error('This browser does not expose an H.264 encoder, so it cannot create an MP4. Try Safari or Chrome with hardware video encoding enabled.');
    const target = new muxerAPI.ArrayBufferTarget();
    const muxer = new muxerAPI.Muxer({ target, video: { codec: 'avc', width, height, frameRate: fps }, fastStart: 'in-memory' });
    let encoderError;
    const encoder = new VideoEncoder({
      output: (chunk, metadata) => muxer.addVideoChunk(chunk, metadata),
      error: error => { encoderError = error; }
    });
    encoder.configure(supported);
    const cardCount = Math.max(media.length, clamp(Number(config.count || 22), 1, 48));
    for (let frameIndex = 0; frameIndex < Math.ceil(duration * fps); frameIndex++) {
      abortIfNeeded(signal); if (encoderError) throw encoderError;
      const time = frameIndex / fps;
      ctx.clearRect(0, 0, width, height);
      if (options.background && options.background !== 'transparent') { ctx.fillStyle = options.background; ctx.fillRect(0, 0, width, height); }
      for (const [index, item] of media.entries()) if (item.type === 'video') await seek(sources[index], time, signal);
      const layout = window.MeyaScene?.sample ? window.MeyaScene.sample({ ...config, count: cardCount }, width, height, time) : { cards: [] };
      const cards = layout.cards?.length ? layout.cards : Array.from({ length: cardCount }, (_, index) => ({ index, item: media[index % media.length], x: width / 2, y: height / 2, width: width * .18, height: height * .18, depth: 0, opacity: 1, rotation: 0, blur: 0 }));
      cards.slice().sort((a, b) => (a.depth || 0) - (b.depth || 0)).forEach(card => {
        const item = card.item || media[card.index % media.length]; const source = sources[card.index % sources.length];
        ctx.save(); ctx.translate(card.x, card.y); ctx.rotate(card.rotation || 0); ctx.globalAlpha = clamp(Number(card.opacity ?? 1), 0, 1);
        if (card.blur) ctx.filter = `blur(${clamp(card.blur, 0, 24)}px)`;
        const x = -card.width / 2, y = -card.height / 2; roundedPath(ctx, x, y, card.width, card.height, Number(config.radius || 3)); ctx.clip(); drawObjectFit(ctx, source, x, y, card.width, card.height); ctx.restore();
      });
      const timestamp = Math.round(time * 1_000_000);
      const frame = new VideoFrame(canvas, { timestamp, duration: Math.round(1_000_000 / fps) });
      encoder.encode(frame, { keyFrame: frameIndex % Math.max(1, fps * 2) === 0 }); frame.close();
      options.onProgress?.((frameIndex + 1) / Math.ceil(duration * fps));
      if (frameIndex % 4 === 0) await wait(0);
    }
    await encoder.flush(); encoder.close(); if (encoderError) throw encoderError;
    muxer.finalize();
    if (!target.buffer?.byteLength) throw new Error('MP4 export produced an empty file.');
    return new Blob([target.buffer], { type: 'video/mp4' });
  }
  window.MeyaVideo = { exportMP4 };
})();
