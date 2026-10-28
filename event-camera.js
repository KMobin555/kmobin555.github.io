// Event-camera scroll effect: a simulated event camera looking at a hidden,
// repeating wall of icons from my work (ECG trace, eye, robot, brain,
// smartwatch, cube, cricket bat, spike train, M-O-B-I-N, SUST). The wall moves
// exactly with the page. Each sensor pixel fires an ON (blue) or OFF (red)
// event when its log brightness changes by more than a threshold, and events
// fade within ~125 ms, so a still page shows nothing. Icons are tilted a
// little so their upright edges also fire under purely vertical motion.
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

  // ── The wall: one 256×256 tile (power of two, so coordinates wrap) ────
  const TILE = 256, MASK = TILE - 1;
  const WALL = 'rgb(235, 235, 235)', INK = 'rgb(20, 20, 20)';
  // [x, y, angle, icon]; anything not a known icon is drawn as text
  const ITEMS = [
    [ 32,  32, -0.12, 'eye'],
    [ 96,  30,  0.15, 'M'],
    [162,  36, -0.10, 'ecg'],
    [226,  30,  0.10, 'O'],
    [ 34,  98,  0.18, 'robot'],
    [ 98,  96, -0.08, 'SUST'],
    [162, 100,  0.06, 'brain'],
    [226,  94, -0.18, 'B'],
    [ 30, 162,  0.20, 'I'],
    [ 96, 160, -0.14, 'watch'],
    [160, 164,  0.12, 'N'],
    [224, 160,  0.22, 'cube'],
    [ 62, 224,  0.08, 'spikes'],
    [180, 226, -0.25, 'cricket'],
  ];

  const circle = (g, x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, 2 * Math.PI); g.fill(); };
  const box = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); };
  const line = (g, pts, w) => {
    g.lineWidth = w; g.lineJoin = g.lineCap = 'round';
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.stroke();
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
      case 'ecg':          // Cardioformer, CinC, thesis
        line(g, [[-22, 4], [-13, 4], [-10, -3], [-7, 4], [-3, 4], [0, -18],
                 [4, 15], [7, 4], [12, 4], [15, -5], [18, 4], [22, 4]], 3.5);
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
      case 'spikes':       // event-based vision, spiking nets
        line(g, [[-22, 12], [22, 12]], 3);
        line(g, [[-14, 12], [-14, -10]], 3);
        line(g, [[-4, 12], [-4, -18]], 3);
        line(g, [[5, 12], [5, -4]], 3);
        line(g, [[14, 12], [14, -14]], 3);
        break;
      case 'cricket':      // CricPose360
        box(g, -5, -8, 10, 28, 3);
        g.fillRect(-1.5, -21, 3, 14);
        circle(g, 14, 12, 5);
        break;
      default:             // letters and words
        g.font = `bold ${kind.length > 1 ? 18 : 32}px Inter, Helvetica, Arial, sans-serif`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(kind, 0, 1);
    }
  }

  // Log-brightness texture of the wall. Each icon is also drawn shifted by a
  // tile in every direction so icons crossing the border wrap around.
  function buildWall() {
    const c = document.createElement('canvas');
    c.width = c.height = TILE;
    const g = c.getContext('2d');
    g.fillStyle = WALL;
    g.fillRect(0, 0, TILE, TILE);
    for (const [x, y, angle, kind] of ITEMS) {
      for (let ox = -TILE; ox <= TILE; ox += TILE) {
        for (let oy = -TILE; oy <= TILE; oy += TILE) {
          g.save();
          g.translate(x + ox, y + oy);
          g.rotate(angle);
          g.fillStyle = g.strokeStyle = INK;
          icon(g, kind);
          g.restore();
        }
      }
    }
    const px = g.getImageData(0, 0, TILE, TILE).data;
    const tex = new Float32Array(TILE * TILE);
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

  let W = 0, H = 0, N = 0, ref, cur, stamp, pol, image, pixels;
  let lastScroll = window.scrollY, lastEvent = -Infinity, running = false, enabled = true;

  // Log brightness each sensor pixel sees at the current scroll position,
  // sampling the wall bilinearly (same sub-pixel weights for every pixel).
  function sense(out) {
    const oy = window.scrollY / CELL;
    const iy = Math.floor(oy), fy = oy - iy;
    for (let y = 0, i = 0; y < H; y++) {
      const r0 = ((y + iy) & MASK) * TILE, r1 = ((y + iy + 1) & MASK) * TILE;
      for (let x = 0; x < W; x++, i++) {
        const c = x & MASK;
        out[i] = (1 - fy) * tex[r0 + c] + fy * tex[r1 + c];
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
    const w = Math.ceil(document.documentElement.clientWidth / CELL);
    const h = Math.ceil(window.innerHeight / CELL);
    if (w === W && h <= H) return;
    W = w; H = h; N = W * H;
    canvas.width = W; canvas.height = H;
    canvas.style.width = W * CELL + 'px';
    canvas.style.height = H * CELL + 'px';
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
  try { enabled = localStorage.getItem('events') !== 'off'; } catch (e) {}
  setup();
  setEnabled(enabled);

  window.addEventListener('scroll', wake, { passive: true });
  window.addEventListener('resize', () => { setup(); wake(); });
  wide.addEventListener('change', () => setEnabled(enabled));
})();
