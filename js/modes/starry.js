// 模块级状态，保证每次切换歌词都能完整清理
let _intervalId = null;

function _clearStarry() {
    if (_intervalId !== null) {
        clearInterval(_intervalId);
        _intervalId = null;
    }
}

function _createStar(container) {
    const star = document.createElement('div');
    star.className = 'star';

    // 相对于歌词元素散布：横向 -20%~120%，纵向 -150%~250%（营造文字上下漂浮感）
    const x        = (Math.random() * 140) - 20;
    const y        = (Math.random() * 400) - 150;
    const size     = Math.random() * 15 + 5;
    const delay    = Math.random() * 2;
    const duration = Math.random() * 1.5 + 1;

    star.style.left            = `${x}%`;
    star.style.top             = `${y}%`;
    star.style.width           = `${size}px`;
    star.style.height          = `${size}px`;
    star.style.animationDelay  = `${delay}s`;
    star.style.animationDuration = `${duration}s`;

    const isCross = Math.random() > 0.5;
    star.innerHTML = isCross
        ? `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0L14 10L24 12L14 14L12 24L10 14L0 12L10 10Z"/></svg>`
        : `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9Z"/></svg>`;

    container.appendChild(star);

    // 自动移除，避免 DOM 无限积累
    setTimeout(() => star.remove(), (delay + duration + 0.5) * 1000);
}

export function renderStarry(el, text) {
    // 清理上一句遗留的 interval（原始 bug 根源）
    _clearStarry();

    el.innerHTML = '';
    el.classList.add('mode-starry');
    el.setAttribute('data-text', text);

    // 文字层
    const textSpan = document.createElement('span');
    textSpan.innerText = text;
    textSpan.style.position = 'relative';
    textSpan.style.zIndex = '2';
    el.appendChild(textSpan);

    // 初始批次（每颗都带有移除计时）
    for (let i = 0; i < 20; i++) {
        _createStar(el);
    }

    // 持续生成，ID 存到模块变量以便下次清除
    _intervalId = setInterval(() => _createStar(el), 500);

    // 文字入场动画
    textSpan.style.opacity = '0';
    textSpan.style.transform = 'translateY(20px)';
    textSpan.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    setTimeout(() => {
        textSpan.style.opacity = '1';
        textSpan.style.transform = 'translateY(0)';
    }, 100);
}

export function stopStarry() {
    _clearStarry();
}
