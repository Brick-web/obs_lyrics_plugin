<<<<<<< HEAD
export function renderNeon(container, text, config) {
    container.innerHTML = '';
    container.className = 'lyric-line mode-neon';

    // 设置霓虹灯颜色变量
    const neonColor = config.neonColor || '#ff00de';
    container.style.setProperty('--neon-color', neonColor);

    const chars = text.split('');

    chars.forEach((char, index) => {
        const span = document.createElement('span');
        span.textContent = char;
        span.className = 'neon-char';

        // 随机添加故障效果
        // 10% 概率闪烁
        // 2% 概率熄灭
        const rand = Math.random();
        if (rand < 0.02) {
            span.classList.add('neon-broken');
        } else if (rand < 0.12) {
            span.classList.add('neon-faulty');
            // 随机延迟动画，让闪烁不同步
            span.style.animationDelay = `${Math.random() * 2}s`;
        }

        container.appendChild(span);
    });
}
=======
export function renderNeon(container, text, config) {
    container.innerHTML = '';
    container.className = 'lyric-line mode-neon';

    // 设置霓虹灯颜色变量
    const neonColor = config.neonColor || '#ff00de';
    container.style.setProperty('--neon-color', neonColor);

    const chars = text.split('');

    chars.forEach((char, index) => {
        const span = document.createElement('span');
        span.textContent = char;
        span.className = 'neon-char';

        // 随机添加故障效果
        // 10% 概率闪烁
        // 2% 概率熄灭
        const rand = Math.random();
        if (rand < 0.02) {
            span.classList.add('neon-broken');
        } else if (rand < 0.12) {
            span.classList.add('neon-faulty');
            // 随机延迟动画，让闪烁不同步
            span.style.animationDelay = `${Math.random() * 2}s`;
        }

        container.appendChild(span);
    });
}
>>>>>>> ce06bf7e3ef514af1e39fdb9769e4f30278f895d
