/* ── Year ────────────────────────────────────────────────────── */
document.querySelectorAll('#year').forEach(el => {
  el.textContent = new Date().getFullYear();
});

/* ── Mobile nav ──────────────────────────────────────────────── */
const toggle   = document.querySelector('.nav-toggle');
const navLinks = document.getElementById('nav-links');
if (toggle && navLinks) {
  toggle.addEventListener('click', () => {
    const open = navLinks.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', open);
  });
  document.addEventListener('click', e => {
    if (!toggle.contains(e.target) && !navLinks.contains(e.target)) {
      navLinks.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
  navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    navLinks.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  }));
}

/* ── Active nav ──────────────────────────────────────────────── */
const page = window.location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.nav-links a').forEach(a => {
  if (a.getAttribute('href') === page || (page === '' && a.getAttribute('href') === 'index.html'))
    a.setAttribute('aria-current', 'page');
});

/* ══════════════════════════════════════════════════════════════
   SIGNAL FIELD — cursor-reactive background
   ──────────────────────────────────────────────────────────────
   Concept (inspired by XTX but distinct):
   • A grid of dots floats in a slow ambient drift
   • The cursor creates a "magnetic field" — nearby dots are
     pulled toward it, bending the grid
   • As dots displace, fading connection lines trace between
     them, forming an ever-changing geometric wake pattern
   • The cursor itself emits expanding ripple rings on move
   • On pointer-leave the field relaxes back to ambient rest
═══════════════════════════════════════════════════════════════ */
(function () {
  /* ── Canvas setup ── */
  const canvas = document.createElement('canvas');
  canvas.id = 'bg-canvas';
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d');

  /* ── Config — values scale with screen size on every resize ── */
  let CFG = {};

  function getConfig() {
    const isMobile = W <= 600;
    const isTablet = W <= 880;
    /* Grid density matches the build this replaced. Density is the dominant
       per-frame cost: it drives both the dot count and, quadratically, the
       number of connecting segments. Raising it to fill large monitors made
       scrolling stutter, so the monitor fix is done with line weight and
       opacity instead, which cost nothing per frame. */
    return {
      COLS:        isMobile ? 10 : isTablet ? 16 : 28,
      ROWS:        isMobile ? 14 : isTablet ? 14 : 18,
      PULL_RADIUS: isMobile ? 120 : 240,
      PULL_FORCE:  0.22,
      RELAX:       0.055,
      DAMPING:     0.78,
      LINE_DIST:   isMobile ? 100 : isTablet ? 130 : 180,
      DOT_IDLE_R:  isMobile ? 1.0 : 1.4,
      DOT_ACTIVE_R:isMobile ? 2.0 : 2.9,
      DRIFT_SPEED: 0.18,
      RIPPLE_FADE: 0.028,
      MAX_RIPPLES: isMobile ? 3 : 6,
      CYAN:        '0,190,210',
    };
  }

  let W, H, dots, animId;
  let mouse = { x: -9999, y: -9999, active: false };
  let prev  = { x: -9999, y: -9999 };
  let ripples = [];
  let frameCount = 0;

  /* Alpha-quantisation buckets used to batch ambient line/dot draw calls */
  const BUCKET_N   = 12;
  const BUCKET_MAX = 0.60;

  /* ── Dot factory ── */
  function makeDot(ox, oy) {
    return {
      ox, oy,          // origin (grid anchor)
      x:  ox, y:  oy, // current position
      vx: 0,  vy: 0,  // velocity
      driftAngle: Math.random() * Math.PI * 2,
      driftSpeed: CFG.DRIFT_SPEED * (0.5 + Math.random() * 0.5),
    };
  }

  /* ── Build grid ── */
  function buildGrid() {
    dots = [];
    const gapX = W / CFG.COLS;
    const gapY = H / CFG.ROWS;
    for (let row = 0; row <= CFG.ROWS; row++) {
      for (let col = 0; col <= CFG.COLS; col++) {
        /* Offset every other row for a hex-ish feel */
        const jitter = (col % 2 === 0 ? 0.5 : 0) * gapY;
        const ox = col * gapX - gapX * 0.3;
        const oy = row * gapY + jitter - gapY * 0.3;
        dots.push(makeDot(ox, oy));
      }
    }
  }

  /* ── Resize — rebuilds everything including config ──
     The backing store matches CSS pixels, as the previous build did. Scaling
     it by devicePixelRatio quadrupled the fill area on a DPR-2 display, and
     since this canvas is fixed and covers the viewport, that cost lands on
     the same main thread that scrolling needs. Hairlines are kept crisp with
     a 1px line width instead, which does not grow the backing store. */
  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    canvas.style.width  = '';
    canvas.style.height = '';
    ctx.setTransform(1, 0, 0, 1, 0, 0);  // must follow width/height assignment
    CFG = getConfig();   // recalculate density for new screen size
    ripples = [];
    buildGrid();
  }

  /* ── Spawn ripple ── */
  function spawnRipple(x, y) {
    if (ripples.length >= CFG.MAX_RIPPLES) ripples.shift();
    ripples.push({ x, y, r: 0, alpha: 0.65, speed: 3.2 + Math.random() * 1.5 });
  }

  /* ── Main loop ── */
  /* ── Main loop ──
     The field is ambient, so it redraws at ~36fps instead of matching the
     display's refresh rate. This canvas is fixed and covers the viewport, so
     every redraw competes with scrolling for the main thread; halving the rate
     roughly halves that contention with no visible change to the motion. */
  const FRAME_MS = 1000 / 36;
  let lastFrame = -Infinity;

  function draw(now) {
    animId = requestAnimationFrame(draw);
    if (now === undefined) now = performance.now();
    if (now - lastFrame < FRAME_MS) return;
    lastFrame = now;

    ctx.clearRect(0, 0, W, H);
    frameCount++;

    /* Ambient drift (sinusoidal, very slow) */
    const t = frameCount * 0.006;

    /* Update dots */
    dots.forEach(d => {
      /* Gentle ambient float */
      d.driftAngle += 0.004 * d.driftSpeed;
      const ambX = d.ox + Math.sin(d.driftAngle + t * 0.4) * 6;
      const ambY = d.oy + Math.cos(d.driftAngle * 0.7 + t * 0.3) * 6;

      const dx = mouse.x - d.x;
      const dy = mouse.y - d.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (mouse.active && dist < CFG.PULL_RADIUS) {
        /* Magnetic pull — stronger at centre, falls off smoothly */
        const strength = (1 - dist / CFG.PULL_RADIUS) ** 2 * CFG.PULL_FORCE;
        d.vx += dx * strength;
        d.vy += dy * strength;
      } else {
        /* Spring back to ambient position */
        d.vx += (ambX - d.x) * CFG.RELAX;
        d.vy += (ambY - d.y) * CFG.RELAX;
      }

      d.vx *= CFG.DAMPING;
      d.vy *= CFG.DAMPING;
      d.x  += d.vx;
      d.y  += d.vy;
    });

    /* Draw connection lines.
       Dots are bucketed into a uniform grid of LINE_DIST-sized cells so each
       dot only tests its 3x3 cell neighbourhood instead of every other dot.
       Keeps large monitors (1000+ dots) at 60fps; the old O(n^2) scan did
       ~850k pair tests per frame at 1440p and stalled the animation. */
    const cell  = CFG.LINE_DIST;
    const gcols = Math.ceil(W / cell) + 1;
    const grows = Math.ceil(H / cell) + 1;
    const buckets = new Array(gcols * grows);
    const linePaths = new Array(BUCKET_N);

    for (let i = 0; i < dots.length; i++) {
      const d = dots[i];
      let cx = Math.floor(d.x / cell);
      let cy = Math.floor(d.y / cell);
      if (cx < 0) cx = 0; else if (cx >= gcols) cx = gcols - 1;
      if (cy < 0) cy = 0; else if (cy >= grows) cy = grows - 1;
      const key = cy * gcols + cx;
      if (buckets[key]) buckets[key].push(i);
      else buckets[key] = [i];
    }

    for (let i = 0; i < dots.length; i++) {
      const a = dots[i];
      let cx = Math.floor(a.x / cell);
      let cy = Math.floor(a.y / cell);
      if (cx < 0) cx = 0; else if (cx >= gcols) cx = gcols - 1;
      if (cy < 0) cy = 0; else if (cy >= grows) cy = grows - 1;

      for (let oy = -1; oy <= 1; oy++) {
        const ny = cy + oy;
        if (ny < 0 || ny >= grows) continue;
        for (let ox = -1; ox <= 1; ox++) {
          const nx = cx + ox;
          if (nx < 0 || nx >= gcols) continue;
          const bucket = buckets[ny * gcols + nx];
          if (!bucket) continue;

          for (let k = 0; k < bucket.length; k++) {
            const j = bucket[k];
            if (j <= i) continue;          // each pair handled once
            const b = dots[j];
            const dx = a.x - b.x, dy = a.y - b.y;
            const d  = Math.sqrt(dx * dx + dy * dy);
            if (d > cell) continue;

            /* Displacement from origin = "tension" — lights up lines */
            const dispA = Math.hypot(a.x - a.ox, a.y - a.oy);
            const dispB = Math.hypot(b.x - b.ox, b.y - b.oy);
            const tension = Math.max(dispA, dispB);

            /* Proximity to cursor boosts line brightness */
            const midX = (a.x + b.x) * 0.5, midY = (a.y + b.y) * 0.5;
            const mDist = Math.hypot(mouse.x - midX, mouse.y - midY);
            const cursorBoost = mouse.active
              ? Math.max(0, 1 - mDist / (CFG.PULL_RADIUS * 1.3)) * 0.5
              : 0;

            const proximity = (1 - d / cell);
            const alpha = proximity * (0.22 + Math.min(tension / 12, 0.35) + cursorBoost);

            if (cursorBoost > 0.02) {
              /* Cursor-lit lines keep their exact alpha and weight — few of them */
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.strokeStyle = `rgba(${CFG.CYAN}, ${alpha})`;
              ctx.lineWidth   = 1 + cursorBoost * 0.8;
              ctx.stroke();
            } else {
              /* Ambient lines are batched into a handful of alpha buckets so
                 the whole field costs ~10 stroke calls instead of ~15,000 */
              let bi = (alpha * BUCKET_N / BUCKET_MAX) | 0;
              if (bi < 0) bi = 0; else if (bi >= BUCKET_N) bi = BUCKET_N - 1;
              let p = linePaths[bi];
              if (!p) p = linePaths[bi] = new Path2D();
              p.moveTo(a.x, a.y);
              p.lineTo(b.x, b.y);
            }
          }
        }
      }
    }

    ctx.lineWidth = 1;
    for (let bi = 0; bi < BUCKET_N; bi++) {
      const p = linePaths[bi];
      if (!p) continue;
      const a = (bi + 0.5) * (BUCKET_MAX / BUCKET_N);
      ctx.strokeStyle = `rgba(${CFG.CYAN}, ${a})`;
      ctx.stroke(p);
    }

    /* Draw dots — idle dots batched by brightness, cursor-lit dots drawn exactly */
    const dotPaths = new Array(BUCKET_N);
    for (let i = 0; i < dots.length; i++) {
      const d = dots[i];
      const mDist = Math.hypot(mouse.x - d.x, mouse.y - d.y);
      const active = mouse.active && mDist < CFG.PULL_RADIUS;

      if (active) {
        const brightness = (1 - mDist / CFG.PULL_RADIUS) * 0.9 + 0.1;
        const r = CFG.DOT_IDLE_R +
          (CFG.DOT_ACTIVE_R - CFG.DOT_IDLE_R) * (1 - mDist / CFG.PULL_RADIUS);
        ctx.beginPath();
        ctx.arc(d.x, d.y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${CFG.CYAN}, ${brightness})`;
        ctx.fill();
      } else {
        const disp = Math.hypot(d.x - d.ox, d.y - d.oy);
        const brightness = Math.min(disp / 8, 0.5) + 0.22;
        let bi = (brightness * BUCKET_N / BUCKET_MAX) | 0;
        if (bi < 0) bi = 0; else if (bi >= BUCKET_N) bi = BUCKET_N - 1;
        let p = dotPaths[bi];
        if (!p) p = dotPaths[bi] = new Path2D();
        p.moveTo(d.x + CFG.DOT_IDLE_R, d.y);
        p.arc(d.x, d.y, CFG.DOT_IDLE_R, 0, Math.PI * 2);
      }
    }
    for (let bi = 0; bi < BUCKET_N; bi++) {
      const p = dotPaths[bi];
      if (!p) continue;
      ctx.fillStyle = `rgba(${CFG.CYAN}, ${(bi + 0.5) * (BUCKET_MAX / BUCKET_N)})`;
      ctx.fill(p);
    }

    /* Draw ripples */
    ripples = ripples.filter(rp => rp.alpha > 0.005);
    ripples.forEach(rp => {
      /* Outer ring */
      ctx.beginPath();
      ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${CFG.CYAN}, ${rp.alpha})`;
      ctx.lineWidth   = 1;
      ctx.stroke();

      /* Inner trailing ring */
      if (rp.r > 20) {
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, rp.r * 0.55, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${CFG.CYAN}, ${rp.alpha * 0.4})`;
        ctx.lineWidth   = 0.5;
        ctx.stroke();
      }

      rp.r     += rp.speed;
      rp.alpha -= CFG.RIPPLE_FADE;
    });

    /* Cursor crosshair dot */
    if (mouse.active) {
      /* Pulsing outer glow ring */
      const pulse = 0.4 + 0.2 * Math.sin(t * 4);
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, 14, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${CFG.CYAN}, ${pulse * 0.5})`;
      ctx.lineWidth   = 1;
      ctx.stroke();

      /* Inner dot */
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${CFG.CYAN}, 0.9)`;
      ctx.fill();
    }
  }

  /* ── Cursor tracking ── */
  let rippleTimer = 0;
  document.addEventListener('mousemove', e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.active = true;

    /* Spawn ripple on significant movement, throttled */
    const moveDist = Math.hypot(e.clientX - prev.x, e.clientY - prev.y);
    const now = performance.now();
    if (moveDist > 28 && now - rippleTimer > 140) {
      spawnRipple(e.clientX, e.clientY);
      rippleTimer = now;
    }
    prev.x = e.clientX;
    prev.y = e.clientY;
  });

  document.addEventListener('mouseleave', () => { mouse.active = false; });
  document.addEventListener('mouseenter', e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.active = true;
  });

  /* Tap / touch support */
  document.addEventListener('touchmove', e => {
    const t = e.touches[0];
    mouse.x = t.clientX;
    mouse.y = t.clientY;
    mouse.active = true;
  }, { passive: true });
  document.addEventListener('touchend', () => { mouse.active = false; });

  /* Pause when hidden */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(animId);
    else { frameCount = 0; draw(); }
  });

  window.addEventListener('resize', resize);
  resize();
  draw();
})();
