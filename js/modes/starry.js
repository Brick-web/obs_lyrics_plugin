export function renderStarry(el, text) {
    // 清空内容并设置基本文本
    el.innerHTML = '';

    // 创建文本容器
    const textSpan = document.createElement('span');
    textSpan.innerText = text;
    textSpan.style.position = 'relative';
    textSpan.style.zIndex = '2';
    el.appendChild(textSpan);

    el.classList.add('mode-starry');
    el.setAttribute('data-text', text);

    // 生成星星
    const starCount = 20;
    for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        star.className = 'star';

        // 随机位置 (相对于文字区域)
        const x = (Math.random() * 120) - 10; // -10% to 110%
        const y = (Math.random() * 140) - 20; // -20% to 120%
        const size = Math.random() * 15 + 5; // 5-20px (SVG需要大一点)
        const delay = Math.random() * 2;
        const duration = Math.random() * 1.5 + 1; // 1-2.5s

        star.style.left = `${x}%`;
        star.style.top = `${y}%`;
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;
        star.style.animationDelay = `${delay}s`;
        star.style.animationDuration = `${duration}s`;

        // 随机选择星星形状 (十字星 或 钻石星)
        const isCross = Math.random() > 0.5;
        if (isCross) {
            star.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0L14 10L24 12L14 14L12 24L10 14L0 12L10 10Z" /></svg>`;
        } else {
            star.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9Z" /></svg>`;
        }

        el.appendChild(star);
    }

    // 让星星持续出现
    setInterval(() => {
        const star = document.createElement('div');
        star.className = 'star';
        const x = (Math.random() * 120) - 10;
        const y = (Math.random() * 140) - 20;
        const size = Math.random() * 15 + 5;
        const delay = Math.random() * 2;
        const duration = Math.random() * 1.5 + 1;

        star.style.left = `${x}%`;
        star.style.top = `${y}%`;
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;
        star.style.animationDelay = `${delay}s`;
        star.style.animationDuration = `${duration}s`;

        const isCross = Math.random() > 0.5;
        if (isCross) {
            star.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0L14 10L24 12L14 14L12 24L10 14L0 12L10 10Z" /></svg>`;
        } else {
            star.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9Z" /></svg>`;
        }

        el.appendChild(star);

        // 移除超时的星星
        setTimeout(() => {
            star.remove();
        }, duration * 1000);
    }, 500);

    // 文字从下往上渐显
    textSpan.style.opacity = '0';
    textSpan.style.transform = 'translateY(20px)';
    textSpan.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    setTimeout(() => {
        textSpan.style.opacity = '1';
        textSpan.style.transform = 'translateY(0)';
    }, 100);
}