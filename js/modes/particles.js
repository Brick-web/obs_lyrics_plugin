const SCATTER_DURATION = 260; // ms
const ACCELERATION = 22;
const DRAG = 0.72;
const SCATTER_DRAG = 0.88;
const MAX_PARTICLES = 650; // 增加粒子数量

let canvas = null;
let ctx = null;
let width = 0;
let height = 0;
let animationId = null;
let lastTime = 0;
let particles = [];
let pendingTargets = [];
let phase = 'idle';
let phaseStart = 0;
let active = false;
let hasActiveText = false;
let colors = {
    primary: '#FFE082',
    glow: '#FFAB40'
};

function ensureCanvas() {
    if (canvas) return;

    canvas = document.createElement('canvas');
    canvas.id = 'particles-canvas';
    document.body.appendChild(canvas);

    ctx = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function refreshColors() {
    const rootStyle = getComputedStyle(document.documentElement);
    const primary = rootStyle.getPropertyValue('--particles-primary-color').trim();
    const glow = rootStyle.getPropertyValue('--particles-glow-color').trim();
    colors.primary = primary || colors.primary;
    colors.glow = glow || colors.glow;
}

function createParticle(target, origin) {
    const base = origin || target || { x: width / 2, y: height / 2 };
    const spread = target ? 18 : 200;
    return {
        x: base.x + (Math.random() - 0.5) * spread,
        y: base.y + (Math.random() - 0.5) * spread,
        vx: (Math.random() - 0.5) * 40,
        vy: (Math.random() - 0.5) * 40,
        tx: target ? target.x : base.x,
        ty: target ? target.y : base.y,
        size: 0.5 + Math.random() * 0.4, // 缩小粒子大小
        opacity: 0,
        state: 'idle',
        noiseSeed: Math.random() * Math.PI * 2,
        fadeOut: false,
        dead: false,
        jitter: 0
    };
}

function generateTargets(el, text) {
    const rect = el.getBoundingClientRect();
    const sampleWidth = Math.max(1, Math.ceil(rect.width) + 40);
    const sampleHeight = Math.max(1, Math.ceil(rect.height) + 40);

    if (sampleWidth === 1 || sampleHeight === 1) return [];

    const offCanvas = document.createElement('canvas');
    offCanvas.width = sampleWidth;
    offCanvas.height = sampleHeight;
    const offCtx = offCanvas.getContext('2d');

    const computed = window.getComputedStyle(el);
    const font = `${computed.fontStyle} ${computed.fontWeight} ${computed.fontSize} ${computed.fontFamily}`.replace(/\s+/g, ' ');

    offCtx.clearRect(0, 0, sampleWidth, sampleHeight);
    offCtx.fillStyle = '#fff';
    offCtx.font = font;
    offCtx.textBaseline = 'top';
    offCtx.fillText(text, 20, 20);

    const imageData = offCtx.getImageData(0, 0, sampleWidth, sampleHeight).data;
    const step = Math.max(4, Math.floor(sampleWidth / 220));
    const points = [];

    for (let y = 0; y < sampleHeight; y += step) {
        for (let x = 0; x < sampleWidth; x += step) {
            const idx = (y * sampleWidth + x) * 4 + 3;
            const alpha = imageData[idx];
            if (alpha > 120) {
                points.push({
                    x: rect.left + x - 20,
                    y: rect.top + y - 20
                });
            }
        }
    }

    return points;
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function normalizeTargets(targets, desiredCount) {
    if (!targets.length || desiredCount <= 0) return [];
    if (targets.length === desiredCount) return targets.slice();

    if (targets.length > desiredCount) {
        return shuffle(targets.slice()).slice(0, desiredCount);
    }

    const result = targets.slice();
    let idx = 0;
    while (result.length < desiredCount) {
        const source = targets[idx % targets.length];
        result.push({
            x: source.x + (Math.random() - 0.5) * 1.4,
            y: source.y + (Math.random() - 0.5) * 1.4
        });
        idx += 1;
    }

    return shuffle(result);
}

function beginTransition(targets, options = {}) {
    const { skipScatter = false } = options;
    pendingTargets = shuffle(targets.slice());

    if (!particles.length) {
        pendingTargets.forEach(target => {
            particles.push(createParticle(target, target));
        });
    } else if (particles.length < pendingTargets.length) {
        const deficit = pendingTargets.length - particles.length;
        for (let i = 0; i < deficit; i += 1) {
            const target = pendingTargets[particles.length];
            const reference = particles[Math.floor(Math.random() * particles.length)] || target;
            particles.push(createParticle(target, { x: reference.x, y: reference.y }));
        }
    } else if (particles.length > pendingTargets.length) {
        particles = particles.slice(0, pendingTargets.length);
    }

    if (skipScatter) {
        const count = Math.min(particles.length, pendingTargets.length);
        for (let i = 0; i < count; i += 1) {
            const particle = particles[i];
            const target = pendingTargets[i];
            const offsetRange = 3;
            particle.x = target.x + (Math.random() - 0.5) * offsetRange;
            particle.y = target.y + (Math.random() - 0.5) * offsetRange;
            particle.tx = target.x;
            particle.ty = target.y;
            particle.vx = (Math.random() - 0.5) * 12;
            particle.vy = (Math.random() - 0.5) * 12;
            particle.state = 'toTarget';
            particle.opacity = 0;
            particle.fadeOut = false;
            particle.dead = false;
            particle.jitter = 0;
        }
        pendingTargets = [];
        phase = 'forming';
        phaseStart = performance.now();
        startLoop();
        return;
    }

    phase = 'scatter';
    phaseStart = performance.now();

    particles.forEach((p, index) => {
        p.state = 'scatter';
        p.fadeOut = false;
        p.dead = false;
        const angle = Math.random() * Math.PI * 2;
        const ringOffset = (index % 7) * 0.08; // break radial symmetry
        const speed = 140 + Math.random() * 200;
        const directionalBias = Math.random() < 0.45 ? Math.random() * Math.PI * 2 : angle + ringOffset;
        p.vx = Math.cos(directionalBias) * speed;
        p.vy = Math.sin(directionalBias) * speed;
        if (Math.random() < 0.25) {
            p.vx += (Math.random() - 0.5) * 120;
            p.vy += (Math.random() - 0.5) * 120;
        }
        p.opacity = Math.min(1, p.opacity + 0.2);
    });

    startLoop();
}

function assignTargets() {
    if (!pendingTargets.length) return;

    const count = Math.min(particles.length, pendingTargets.length);
    for (let i = 0; i < count; i += 1) {
        const target = pendingTargets[i];
        const particle = particles[i];
        particle.tx = target.x;
        particle.ty = target.y;
        particle.state = 'toTarget';
        particle.fadeOut = false;
        particle.vx += (Math.random() - 0.5) * 60;
        particle.vy += (Math.random() - 0.5) * 60;
        particle.jitter = 0;
    }

    pendingTargets = [];
    phase = 'forming';
}

function startLoop() {
    if (animationId) return;
    lastTime = performance.now();
    animationId = requestAnimationFrame(loop);
}

function loop(now) {
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;
    update(dt, now);
    draw();

    if (shouldContinue()) {
        animationId = requestAnimationFrame(loop);
    } else {
        animationId = null;
        if (canvas) canvas.style.opacity = '0';
    }
}

function shouldContinue() {
    if (active) return true;
    if (phase === 'scatter' || pendingTargets.length > 0) return true;
    return particles.length > 0;
}

function update(dt, now) {
    if (phase === 'scatter' && now - phaseStart >= SCATTER_DURATION) {
        assignTargets();
    }

    particles.forEach(p => {
        if (p.state === 'scatter') {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= SCATTER_DRAG;
            p.vy *= SCATTER_DRAG;
            if (p.fadeOut) {
                p.opacity -= dt * 2.2;
                if (p.opacity <= 0) {
                    p.opacity = 0;
                    p.dead = true;
                }
            } else {
                p.opacity = Math.min(1, p.opacity + dt * 1.5);
            }
        } else if (p.state === 'toTarget') {
            const dx = p.tx - p.x;
            const dy = p.ty - p.y;
            p.vx += dx * ACCELERATION * dt;
            p.vy += dy * ACCELERATION * dt;
            p.vx *= DRAG;
            p.vy *= DRAG;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.opacity = Math.min(1, p.opacity + dt * 3);

            if (Math.abs(dx) < 1.2 && Math.abs(dy) < 1.2 && Math.abs(p.vx) < 5 && Math.abs(p.vy) < 5) {
                p.x = p.tx;
                p.y = p.ty;
                p.vx = 0;
                p.vy = 0;
                p.state = 'idle';
                p.jitter = Math.random() < 0.08 ? 0.08 + Math.random() * 0.08 : 0;
            }
        } else if (p.state === 'idle') {
            if (p.jitter > 0) {
                p.x += Math.cos(p.noiseSeed + now * 0.001) * p.jitter;
                p.y += Math.sin(p.noiseSeed + now * 0.0013) * p.jitter;
            }
            p.opacity = Math.min(1, p.opacity + dt * 1.2);
        }
    });

    if (!active && particles.length > 0) {
        particles = particles.filter(p => !p.dead);
    }
}

function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = colors.primary;
    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = 8;

    particles.forEach(p => {
        if (p.opacity <= 0) return;
        ctx.globalAlpha = Math.max(0, Math.min(1, p.opacity));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
}

export function renderParticles(el, text) {
    ensureCanvas();
    refreshColors();

    const content = (text || '').trim();
    if (!content) {
        stopParticles({ fade: true });
        return;
    }

    active = true;
    canvas.style.opacity = '1';

    el.classList.add('mode-particles');
    el.innerText = text;
    el.style.opacity = 0;

    let targets = generateTargets(el, text);
    if (!targets.length) {
        // 采样失败时回退到直接显示
        stopParticles({ immediate: true });
        el.style.opacity = '';
        el.classList.remove('mode-particles');
        el.innerText = text;
        return;
    }

    const baseCount = Math.min(MAX_PARTICLES, targets.length);
    targets = normalizeTargets(targets, baseCount);

    const desiredCount = Math.min(
        MAX_PARTICLES,
        Math.max(particles.length, baseCount)
    );
    targets = normalizeTargets(targets, desiredCount);

    beginTransition(targets, { skipScatter: true });
    hasActiveText = true;
}

export function stopParticles(options = {}) {
    if (!canvas) return;

    const { immediate = false, fade = false } = options;

    if (immediate) {
        active = false;
        pendingTargets = [];
        particles = [];
        phase = 'idle';
        hasActiveText = false;
        if (!fade) {
            canvas.style.opacity = '0';
        }
        return;
    }

    if (fade) {
        if (!particles.length) {
            canvas.style.opacity = '0';
            active = false;
            hasActiveText = false;
            return;
        }
        active = false;
        pendingTargets = [];
        phase = 'idle';
        hasActiveText = false;
        particles.forEach((p, index) => {
            p.state = 'scatter';
            p.fadeOut = true;
            const angle = Math.random() * Math.PI * 2;
            const ringOffset = (index % 5) * 0.12;
            const speed = 150 + Math.random() * 210;
            const directionalBias = Math.random() < 0.5 ? Math.random() * Math.PI * 2 : angle + ringOffset;
            p.vx = Math.cos(directionalBias) * speed;
            p.vy = Math.sin(directionalBias) * speed;
        });
        startLoop();
        return;
    }

    active = false;
    hasActiveText = false;
}
