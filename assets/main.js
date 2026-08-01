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

  /* ── Config ── */
  const CFG = {
    COLS:        28,          // grid columns (approx)
    ROWS:        18,          // grid rows (approx)
    PULL_RADIUS: 220,         // px — cursor influence radius
    PULL_FORCE:  0.22,        // how strongly dots gravitate to cursor (0-1)
    RELAX:       0.055,       // spring-back speed when cursor away
    DAMPING:     0.78,        // velocity damping
    LINE_DIST:   180,         // max distance between dots to draw a line
    DOT_IDLE_R:  1.3,         // dot radius at rest
    DOT_ACTIVE_R:2.8,         // dot radius when pulled
    DRIFT_SPEED: 0.18,        // slow ambient drift speed
    RIPPLE_FADE: 0.028,       // ripple alpha decay per frame
    MAX_RIPPLES: 6,
    CYAN:        '0,190,210',
    CYAN_DIM:    '0,130,155',
  };

  let W, H, dots, animId;
  let mouse = { x: -9999, y: -9999, active: false };
  let prev  = { x: -9999, y: -9999 };
  let ripples = [];
  let frameCount = 0;

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

  /* ── Resize ── */
  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    buildGrid();
  }

  /* ── Spawn ripple ── */
  function spawnRipple(x, y) {
    if (ripples.length >= CFG.MAX_RIPPLES) ripples.shift();
    ripples.push({ x, y, r: 0, alpha: 0.65, speed: 3.2 + Math.random() * 1.5 });
  }

  /* ── Main loop ── */
  function draw() {
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

    /* Draw connection lines */
    for (let i = 0; i < dots.length; i++) {
      for (let j = i + 1; j < dots.length; j++) {
        const a = dots[i], b = dots[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d > CFG.LINE_DIST) continue;

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

        const proximity = (1 - d / CFG.LINE_DIST);
        const alpha = proximity * (0.06 + Math.min(tension / 18, 0.28) + cursorBoost);

        /* Colour interpolates from dim (ambient) to vivid cyan (active) */
        const colourAlpha = 0.04 + cursorBoost * 0.35 + Math.min(tension / 18, 0.25);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = `rgba(${CFG.CYAN}, ${alpha})`;
        ctx.lineWidth   = 0.5 + cursorBoost * 0.8;
        ctx.stroke();
      }
    }

    /* Draw dots */
    dots.forEach(d => {
      const disp = Math.hypot(d.x - d.ox, d.y - d.oy);
      const mDist = Math.hypot(mouse.x - d.x, mouse.y - d.y);
      const active = mouse.active && mDist < CFG.PULL_RADIUS;
      const brightness = active
        ? (1 - mDist / CFG.PULL_RADIUS) * 0.9 + 0.1
        : Math.min(disp / 10, 0.4) + 0.12;
      const r = active
        ? CFG.DOT_IDLE_R + (CFG.DOT_ACTIVE_R - CFG.DOT_IDLE_R) * (1 - mDist / CFG.PULL_RADIUS)
        : CFG.DOT_IDLE_R;

      ctx.beginPath();
      ctx.arc(d.x, d.y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${CFG.CYAN}, ${brightness})`;
      ctx.fill();
    });

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

    animId = requestAnimationFrame(draw);
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
