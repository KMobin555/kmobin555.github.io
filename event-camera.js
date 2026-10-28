// Event-camera scroll effect: a simulated event camera looking at a hidden,
// repeating wall of icons from my work and life (ECG beat, neuron spike,
// spike train, eye, robot, brain, AI chip, smartwatch, cube, cricket bat,
// soccer ball, basketball, M-O-B-I-N, SAMSUNG, SUST). The wall
// moves exactly with the page. Each sensor pixel fires an ON (blue) or OFF
// (red) event when its log brightness changes by more than a threshold, and
// events fade within ~125 ms, so a still page shows nothing. Icons are tilted
// a little so their upright edges also fire under purely vertical motion.
// Off by default; the floating switch turns it on.
(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const wide = window.matchMedia('(min-width: 1100px)');

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  canvas.className = 'event-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  // Pinned to the viewport even if a stale stylesheet is cached, so the
  // canvas can never fall into the page flow below the footer.
  Object.assign(canvas.style, { position: 'fixed', top: '0', left: '0', pointerEvents: 'none' });
  document.body.appendChild(canvas);

  // ── Floating on/off switch + hint bubble next to the photo ────────────
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'event-toggle';
  toggle.setAttribute('role', 'switch');
  toggle.innerHTML = 'Events<span class="event-switch" aria-hidden="true"></span>';
  document.body.appendChild(toggle);

  const photo = document.querySelector('.photo-wrap');
  if (photo) {
    const bubble = document.createElement('p');
    bubble.className = 'event-bubble';
    bubble.title = 'The page is watched by a simulated event camera: a pixel fires when its brightness changes.';
    bubble.innerHTML = 'Scroll to see<br>events!';
    photo.appendChild(bubble);
  }

  // ── Sensor model ──────────────────────────────────────────────────────
  const CELL      = 3;        // CSS px per sensor pixel
  const THRESHOLD = 0.4;      // contrast threshold, in log brightness
  const TAU       = 25;       // event fade time constant, ms
  const FADE      = 5 * TAU;  // events are gone after this long
  const PEAK      = 0.5;      // opacity of a fresh event
  const QUIET     = 0.3;      // strength once past the hero section
  const CONTENT   = 640;      // half the content column width, CSS px

  // ── The wall: a 128×1024 strip, two icons wide (powers of two, so
  // coordinates wrap with a mask). Each side margin reads it starting at
  // the content edge, the right side half a strip further down, so both
  // margins show whole icons and never the same ones at once.
  const TW = 128, TH = 1024, MASK_X = TW - 1, MASK_Y = TH - 1;
  const WALL = 'rgb(235, 235, 235)', INK = 'rgb(20, 20, 20)';
  const L = 34, R = 94;       // the two icon columns
  // [x, y, angle, icon]; anything not a known icon is drawn as text
  const ITEMS = [
    [L,   51, -0.12, 'eye'],      [R,   51,  0.15, 'M'],
    [L,  153, -0.08, 'ecg'],      [R,  153,  0.10, 'O'],
    [L,  255,  0.18, 'robot'],    [R,  255, -0.18, 'B'],
    [L,  357,  0.06, 'brain'],    [R,  357, -0.10, 'spike'],
    [64, 459,  0.06, 'SAMSUNG'],
    [L + 4, 561, -0.08, 'SUST'],  [R + 4, 561,  0.20, 'I'],
    [L,  663, -0.14, 'watch'],    [R,  663,  0.12, 'ai'],
    [L,  765,  0.10, 'soccer'],   [R,  765,  0.12, 'N'],
    [L,  867,  0.22, 'cube'],     [R,  867,  0.08, 'spikes'],
    [L,  969,  0.15, 'basketball'], [R, 969, -0.25, 'cricket'],
  ];

  const circle = (g, x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, 2 * Math.PI); g.fill(); };
  const ring = (g, x, y, r, w) => { g.lineWidth = w; g.beginPath(); g.arc(x, y, r, 0, 2 * Math.PI); g.stroke(); };
  const box = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); };
  const line = (g, pts, w) => {
    g.lineWidth = w; g.lineJoin = g.lineCap = 'round';
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.stroke();
  };
  const curve = (g, x0, y0, cx, cy, x1, y1, w) => {
    g.lineWidth = w; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(cx, cy, x1, y1); g.stroke();
  };

  // Draws an icon ~40 wall px across, centred on the origin, in ink; holes
  // are painted in the wall colour.
  function icon(g, kind) {
    switch (kind) {
      case 'eye':          // computer vision
        g.beginPath();
        g.moveTo(-21, 0);
        g.bezierCurveTo(-10, -16, 10, -16, 21, 0);
        g.bezierCurveTo(10, 16, -10, 16, -21, 0);
        g.fill();
        g.fillStyle = WALL; circle(g, 0, 0, 8);
        g.fillStyle = INK;  circle(g, 0, 0, 4.5);
        break;
      case 'ecg':          // one full heartbeat, P-QRS-T (Cardioformer, CinC, thesis)
        line(g, [[-23, 6], [-18, 6], [-15, 0], [-12, 6], [-8, 6], [-6, 10],
                 [-2, -20], [2, 17], [5, 6], [9, 6], [13, -3], [17, 6], [23, 6]], 3.5);
        break;
      case 'spike':        // a neuron's action potential, as on an oscilloscope
        line(g, [[-22, 7], [-9, 7], [-4, -18], [1, 15], [5, 10], [9, 7], [22, 7]], 4);
        break;
      case 'spikes':       // spike train: event-based vision, spiking nets
        line(g, [[-22, 12], [22, 12]], 3);
        line(g, [[-14, 12], [-14, -10]], 3);
        line(g, [[-4, 12], [-4, -18]], 3);
        line(g, [[5, 12], [5, -4]], 3);
        line(g, [[14, 12], [14, -14]], 3);
        break;
      case 'robot':        // embodied AI / VLN
        g.fillRect(-1.5, -21, 3, 8); circle(g, 0, -21, 3);
        box(g, -14, -14, 28, 22, 6);
        g.fillRect(-18, -7, 4, 8); g.fillRect(14, -7, 4, 8);
        box(g, -9, 10, 18, 10, 3);
        g.fillStyle = WALL;
        g.fillRect(-8, -7, 5, 5); g.fillRect(3, -7, 5, 5); g.fillRect(-6, 2, 12, 2.5);
        break;
      case 'brain':        // Brain Pulse, cognitive health
        circle(g, -7, -8, 9); circle(g, 7, -8, 9);
        circle(g, -11, 3, 8); circle(g, 11, 3, 8);
        circle(g, -3, 6, 8);  circle(g, 4, 6, 8);
        g.fillRect(-2, 12, 5, 8);
        g.strokeStyle = WALL;
        line(g, [[0, -16], [0, 9]], 2);
        line(g, [[-12, -4], [-6, -1], [-9, 6]], 1.8);
        line(g, [[12, -4], [6, -1], [9, 6]], 1.8);
        break;
      case 'ai':           // AI chip
        for (const p of [-8, 0, 8]) {
          g.fillRect(p - 1.5, -21, 3, 6); g.fillRect(p - 1.5, 15, 3, 6);
          g.fillRect(-21, p - 1.5, 6, 3); g.fillRect(15, p - 1.5, 6, 3);
        }
        box(g, -16, -16, 32, 32, 5);
        g.fillStyle = WALL;
        g.font = 'bold 15px Inter, Helvetica, Arial, sans-serif';
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText('AI', 0, 1);
        break;
      case 'watch':        // Samsung wearables
        box(g, -7, -21, 14, 9, 2); box(g, -7, 12, 14, 9, 2);
        box(g, -13, -13, 26, 26, 7);
        g.fillStyle = WALL; box(g, -9, -9, 18, 18, 4);
        g.strokeStyle = INK;
        line(g, [[0, -6], [0, 0], [4, 3]], 2);
        break;
      case 'cube':         // MindCube spatial reasoning
        line(g, [[0, -19], [17, -9], [17, 10], [0, 20], [-17, 10], [-17, -9], [0, -19]], 3);
        line(g, [[-17, -9], [0, 1], [17, -9]], 3);
        line(g, [[0, 1], [0, 20]], 3);
        break;
      case 'cricket':      // CricPose360
        box(g, -5, -8, 10, 28, 3);
        g.fillRect(-1.5, -21, 3, 14);
        circle(g, 14, 12, 5);
        break;
      case 'soccer': {     // classic ball: black centre pentagon, five half
                           // pentagons cut by the rim, seams between them
        const pent = (cx, cy, r, rot) => {
          g.beginPath();
          for (let k = 0; k < 5; k++) {
            const a = rot + k * 2 * Math.PI / 5;
            k ? g.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a)) : g.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
          }
          g.closePath(); g.fill();
        };
        const up = -Math.PI / 2;
        g.save();
        g.beginPath(); g.arc(0, 0, 19, 0, 2 * Math.PI); g.clip();
        pent(0, 0, 7.5, up);
        for (let k = 0; k < 5; k++) {
          const a = up + Math.PI / 5 + k * 2 * Math.PI / 5;   // between centre vertices
          pent(19 * Math.cos(a), 19 * Math.sin(a), 8, a);      // half hidden past the rim
          const v = up + k * 2 * Math.PI / 5;                  // seam: centre vertex outwards
          line(g, [[7.5 * Math.cos(v), 7.5 * Math.sin(v)], [16 * Math.cos(v), 16 * Math.sin(v)]], 2);
        }
        g.restore();
        ring(g, 0, 0, 19, 3);
        break;
      }
      case 'basketball':   // solid ball with seams cut out
        circle(g, 0, 0, 19);
        g.strokeStyle = WALL;
        line(g, [[0, -19], [0, 19]], 2.5);
        line(g, [[-19, 0], [19, 0]], 2.5);
        curve(g, -12, -15, -4, 0, -12, 15, 2.5);
        curve(g, 12, -15, 4, 0, 12, 15, 2.5);
        break;
      default:             // letters and words
        g.font = `bold ${kind.length > 4 ? 15 : kind.length > 1 ? 17 : 32}px Inter, Helvetica, Arial, sans-serif`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(kind, 0, 1);
    }
  }

  // Log-brightness texture of the wall. Each icon is also drawn shifted by a
  // strip in every direction so icons crossing the border wrap around.
  function buildWall() {
    const c = document.createElement('canvas');
    c.width = TW; c.height = TH;
    const g = c.getContext('2d');
    g.fillStyle = WALL;
    g.fillRect(0, 0, TW, TH);
    for (const [x, y, angle, kind] of ITEMS) {
      for (let ox = -TW; ox <= TW; ox += TW) {
        for (let oy = -TH; oy <= TH; oy += TH) {
          g.save();
          g.translate(x + ox, y + oy);
          g.rotate(angle);
          g.fillStyle = g.strokeStyle = INK;
          icon(g, kind);
          g.restore();
        }
      }
    }
    const px = g.getImageData(0, 0, TW, TH).data;
    const tex = new Float32Array(TW * TH);
    for (let i = 0; i < tex.length; i++) tex[i] = Math.log((px[4 * i] + 1) / 256);
    return tex;
  }
  const tex = buildWall();

  // ── Event colours (site blue / red, brighter in dark mode) ────────────
  const rgba = (c, a) => ((Math.round(a * 255) << 24) | (c[2] << 16) | (c[1] << 8) | c[0]) >>> 0;
  const onFade = new Uint32Array(FADE), offFade = new Uint32Array(FADE);
  function buildPalette() {
    const dark = document.documentElement.classList.contains('dark');
    const ON  = dark ? [96, 165, 250] : [30, 64, 175];
    const OFF = dark ? [248, 113, 113] : [220, 38, 38];
    for (let age = 0; age < FADE; age++) {
      const a = PEAK * Math.exp(-age / TAU);
      onFade[age] = rgba(ON, a);
      offFade[age] = rgba(OFF, a);
    }
  }
  buildPalette();
  new MutationObserver(buildPalette).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  let W = 0, H = 0, N = 0, ref, cur, stamp, pol, image, pixels, colX, colY;
  let lastScroll = window.scrollY, lastEvent = -Infinity, running = false, enabled = false;

  // Log brightness each sensor pixel sees at the current scroll position,
  // sampling the wall with vertical linear interpolation (same sub-pixel
  // weight for every pixel).
  function sense(out) {
    const oy = window.scrollY / CELL;
    const iy = Math.floor(oy), fy = oy - iy;
    for (let y = 0, i = 0; y < H; y++) {
      for (let x = 0; x < W; x++, i++) {
        const r0 = ((y + iy + colY[x]) & MASK_Y) * TW;
        const r1 = ((y + iy + colY[x] + 1) & MASK_Y) * TW;
        out[i] = (1 - fy) * tex[r0 + colX[x]] + fy * tex[r1 + colX[x]];
      }
    }
  }

  // Full strength while the hero is on screen, then fade to QUIET over the
  // next half screen so events don't compete with the rest of the page.
  const hero = document.getElementById('hero');
  function strength() {
    if (!hero) return 1;
    const t = -hero.getBoundingClientRect().bottom / (0.5 * window.innerHeight);
    return 1 - (1 - QUIET) * Math.min(1, Math.max(0, t));
  }

  // Size the sensor to the window. Only grow in height, so a collapsing
  // mobile address bar doesn't reset it mid-scroll.
  function setup() {
    const cw = document.documentElement.clientWidth;
    const w = Math.ceil(cw / CELL);
    const h = Math.ceil(window.innerHeight / CELL);
    if (w === W && h <= H) return;
    W = w; H = h; N = W * H;
    canvas.width = W; canvas.height = H;
    canvas.style.width = W * CELL + 'px';
    canvas.style.height = H * CELL + 'px';
    // Wall column for each sensor column: the left margin ends at the
    // strip's right edge, the right margin starts at its left edge.
    const mid = cw / 2 / CELL;
    const edgeL = Math.round((cw / 2 - CONTENT) / CELL), edgeR = Math.round((cw / 2 + CONTENT) / CELL);
    colX = new Int32Array(W); colY = new Int32Array(W);
    for (let x = 0; x < W; x++) {
      colX[x] = (x < mid ? x - edgeL : x - edgeR) & MASK_X;
      colY[x] = x < mid ? 0 : TH / 2;
    }
    ref = new Float32Array(N); cur = new Float32Array(N);
    stamp = new Float64Array(N).fill(-Infinity); pol = new Uint8Array(N);
    image = ctx.createImageData(W, H);
    pixels = new Uint32Array(image.data.buffer);
    sense(ref);
    lastScroll = window.scrollY;
  }

  function step(now) {
    if (!enabled || !wide.matches) { running = false; return; }
    const s = window.scrollY;
    if (s !== lastScroll) {
      // A jump of more than a screen (nav link, Home/End) isn't motion.
      const jump = Math.abs(s - lastScroll) > window.innerHeight;
      lastScroll = s;
      sense(jump ? ref : cur);
      if (!jump) {
        for (let i = 0; i < N; i++) {
          const d = cur[i] - ref[i];
          if (d >= THRESHOLD) {
            ref[i] += THRESHOLD * Math.floor(d / THRESHOLD);
            stamp[i] = now; pol[i] = 1; lastEvent = now;
          } else if (d <= -THRESHOLD) {
            ref[i] -= THRESHOLD * Math.floor(-d / THRESHOLD);
            stamp[i] = now; pol[i] = 0; lastEvent = now;
          }
        }
      }
    }
    for (let j = 0; j < N; j++) {
      const age = now - stamp[j];
      pixels[j] = age < FADE ? (pol[j] ? onFade[age | 0] : offFade[age | 0]) : 0;
    }
    canvas.style.opacity = strength();
    ctx.putImageData(image, 0, 0);
    if (now - lastEvent < FADE || window.scrollY !== lastScroll) {
      requestAnimationFrame(step);
    } else {
      running = false;
    }
  }

  function wake() {
    if (running || !enabled || !wide.matches) return;
    running = true;
    requestAnimationFrame(step);
  }

  // Switching on starts from the current view, so the switch itself fires
  // no events. The choice is remembered in this browser.
  function setEnabled(on) {
    enabled = on;
    toggle.setAttribute('aria-checked', String(on));
    toggle.title = on ? 'Turn off the event-camera effect' : 'Turn on the event-camera effect';
    document.documentElement.classList.toggle('events-off', !on);
    if (!N) return;
    stamp.fill(-Infinity);
    ctx.clearRect(0, 0, W, H);
    sense(ref);
    lastScroll = window.scrollY;
  }

  toggle.addEventListener('click', () => {
    setEnabled(!enabled);
    try { localStorage.setItem('events', enabled ? 'on' : 'off'); } catch (e) {}
  });
  try { enabled = localStorage.getItem('events') === 'on'; } catch (e) {}
  setup();
  setEnabled(enabled);

  window.addEventListener('scroll', wake, { passive: true });
  window.addEventListener('resize', () => { setup(); wake(); });
  wide.addEventListener('change', () => setEnabled(enabled));
})();
