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
  // Wide screens show events in the side margins; narrower ones have no
  // margins, so events cover the whole screen at a lower strength.
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
  const PEAK      = 0.3;      // opacity of a fresh event
  const QUIET     = 0.3;      // strength once past the hero section
  const NARROW    = 0.35;     // narrow screens: strength in the hero (events cover the content)
  const NARROW_QUIET = 0.5;   //   and the fraction of that kept further down
  const CONTENT   = 640;      // half the content column width, CSS px

  // ── The wall: 256×1024 strips (powers of two, so coordinates wrap with
  // a mask). Each side margin reads the wall starting at the content edge.
  // The layout copies the hand-placed 256×256 tile of the event-camera wall
  // that inspired this: 12 spots (6 icons, 5 letters, 1 word) at fixed
  // positions and tilts. A strip stacks four such tiles, each with different
  // items, so the margins don't repeat every tile. There are four variants of
  // the strip, each shifted a quarter tile further down; neighbouring strips
  // across the screen always use adjacent variants. Items are shuffled into
  // the spots so the same item is never near itself within a strip and
  // never shares a row with itself in an adjacent variant.
  const TW = 256, TH = 1024, TILE = 256, MASK_X = TW - 1, MASK_Y = TH - 1;
  const VARIANTS = 4, TILES = TH / TILE;
  const WALL = 'rgb(235, 235, 235)', INK = 'rgb(20, 20, 20)';
  // [x, y, angle, kind of spot] within one tile
  const SPOTS = [
    [ 32,  36, -0.12, 'icon'],
    [100,  28,  0.15, 'letter'],
    [222,  40,  0.08, 'icon'],
    [104, 100,  0.03, 'icon'],
    [166,  92, -0.12, 'letter'],
    [ 30, 160, -0.20, 'letter'],
    [170, 168, -0.05, 'icon'],
    [232, 150,  0.10, 'letter'],
    [ 40, 226,  0.30, 'icon'],
    [110, 222,  0.06, 'icon'],
    [214, 220, -0.15, 'letter'],
    [ 96, 160, -0.12, 'word'],
  ];
  // Anything not a known icon is drawn as text
  const ICONS = ['eye', 'ecg', 'robot', 'brain', 'spike', 'watch',
                 'ai', 'soccer', 'cube', 'spikes', 'basketball', 'cricket'];
  const LETTERS = ['M', 'O', 'B', 'I', 'N'];
  const WORDS = ['SAMSUNG', 'SUST'];
  const PHASE = TILE / 4;        // each variant is shifted down this much more than the
                                 // last, so adjacent strips never line their spots up
  const NEAR = 130;              // the same item never closer than this within a strip
  const ROW = 40;                // nor within this height in an adjacent variant
  const SEED = 3;                // layout seed (picked so every rule above holds)

  // Small seeded PRNG (mulberry32), so the wall is the same on every visit
  function rng(seed) {
    return () => {
      seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Signed distances on the wrapping strip
  const wrapDy = (d) => ((d % TH) + TH * 1.5) % TH - TH / 2;
  const wrapDx = (d) => ((d % TW) + TW * 1.5) % TW - TW / 2;

  const shuffle = (a, rand) => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // [x, y, angle, icon] for every item of every strip variant
  function buildLayouts() {
    const LAYOUTS = [];
    for (let v = 0; v < VARIANTS; v++) {
      const rand = rng(SEED + 97 * v);
      // Variants that can sit beside this one across the screen (strips
      // cycle through the variants, so only v - 1 and v + 1 are neighbours)
      const beside = LAYOUTS.filter((_, w) => (v - w + VARIANTS) % VARIANTS === 1 || (w - v + VARIANTS) % VARIANTS === 1)
        .flat();
      const icons = shuffle([...ICONS], rand);   // half per tile, alternating halves
      const placed = [];
      for (let t = 0; t < TILES; t++) {
        const set = t % 2 ? icons.slice(6) : icons.slice(0, 6);
        // Reshuffle this tile until no item lands near itself (keeping the
        // best attempt if none is perfect)
        let best = null, fewest = Infinity;
        for (let attempt = 0; attempt < 400 && fewest > 0; attempt++) {
          const pools = { icon: shuffle([...set], rand), letter: shuffle([...LETTERS], rand), word: [WORDS[(t + v) % 2]] };
          const tile = SPOTS.map(([x, y, angle, spot]) => [x, (y + t * TILE + v * PHASE) % TH, angle, pools[spot].pop()]);
          let bad = 0;
          for (const [x, y, , k] of tile) {
            if (placed.some(([px, py, , pk]) => pk === k && Math.hypot(wrapDx(x - px), wrapDy(y - py)) < NEAR)) bad++;
            if (beside.some(([, py, , pk]) => pk === k && Math.abs(wrapDy(y - py)) < ROW)) bad++;
          }
          if (bad < fewest) { fewest = bad; best = tile; }
        }
        placed.push(...best);
      }
      LAYOUTS.push(placed);
    }
    return LAYOUTS;
  }

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

  // Log-brightness texture of all strip variants, stacked one after another.
  // Each icon is also drawn shifted by a strip in every direction so icons
  // crossing the border wrap around. Built lazily, the first time events are
  // switched on, so visitors who never turn them on pay nothing.
  const STRIP = TW * TH;
  let tex = null;
  function buildWall() {
    const LAYOUTS = buildLayouts();
    const out = new Float32Array(VARIANTS * STRIP);
    for (let v = 0; v < VARIANTS; v++) {
      const c = document.createElement('canvas');
      c.width = TW; c.height = TH;
      const g = c.getContext('2d');
      g.fillStyle = WALL;
      g.fillRect(0, 0, TW, TH);
      for (const [x, y, angle, kind] of LAYOUTS[v]) {
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
      for (let i = 0; i < STRIP; i++) out[v * STRIP + i] = Math.log((px[4 * i] + 1) / 256);
    }
    return out;
  }

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

  let W = 0, H = 0, N = 0, ref, cur, stamp, pol, image, pixels, colBase;
  let lastScroll = window.scrollY, lastEvent = -Infinity, running = false, enabled = false;

  // Log brightness each sensor pixel sees at the current scroll position,
  // sampling the wall with vertical linear interpolation (same sub-pixel
  // weight for every pixel).
  function sense(out) {
    if (!tex) {
      if (!enabled) return;   // not needed yet
      tex = buildWall();
    }
    const oy = window.scrollY / CELL;
    const iy = Math.floor(oy), fy = oy - iy;
    for (let y = 0, i = 0; y < H; y++) {
      const r0 = ((y + iy) & MASK_Y) * TW, r1 = ((y + iy + 1) & MASK_Y) * TW;
      for (let x = 0; x < W; x++, i++) {
        out[i] = (1 - fy) * tex[colBase[x] + r0] + fy * tex[colBase[x] + r1];
      }
    }
  }

  // Full strength while the hero is on screen, then fade to QUIET over the
  // next half screen so events don't compete with the rest of the page.
  // Narrow screens start lower, since there events sit over the content.
  const hero = document.getElementById('hero');
  function strength() {
    const base = wide.matches ? 1 : NARROW, quiet = wide.matches ? QUIET : NARROW_QUIET;
    if (!hero) return base;
    const t = -hero.getBoundingClientRect().bottom / (0.5 * window.innerHeight);
    return base * (1 - (1 - quiet) * Math.min(1, Math.max(0, t)));
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
    // Strip and column for each sensor column: strips are counted outwards
    // from the content edges (the left margin ends at a strip's right edge,
    // the right margin starts at a strip's left edge), and consecutive
    // strips cycle through the variants, the right side offset by two.
    const mid = cw / 2 / CELL;
    const edgeL = Math.round((cw / 2 - CONTENT) / CELL), edgeR = Math.round((cw / 2 + CONTENT) / CELL);
    colBase = new Int32Array(W);
    for (let x = 0; x < W; x++) {
      const d = x < mid ? x - edgeL : x - edgeR;
      const k = Math.floor(d / TW) + (x < mid ? 0 : 2);
      colBase[x] = (((k % VARIANTS) + VARIANTS) % VARIANTS) * STRIP + (d & MASK_X);
    }
    ref = new Float32Array(N); cur = new Float32Array(N);
    stamp = new Float64Array(N).fill(-Infinity); pol = new Uint8Array(N);
    image = ctx.createImageData(W, H);
    pixels = new Uint32Array(image.data.buffer);
    sense(ref);
    lastScroll = window.scrollY;
  }

  function step(now) {
    if (!enabled) { running = false; return; }
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
    if (running || !enabled) return;
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
