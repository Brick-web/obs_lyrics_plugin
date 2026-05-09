export function renderSvgCurve(el, text) {
    el.classList.add('mode-svg-curve');
    el.innerHTML = ''; // 清空内容以构建 DOM 结构

    // 拆分文字实现随机遮挡
    const chars = text.split('');
    chars.forEach(char => {
        const span = document.createElement('span');
        span.innerText = char;
        span.style.position = 'relative';
        // 随机层级：50%概率在曲线之上(z2)，50%在之下(z0)
        // 曲线 z-index 为 1
        span.style.zIndex = Math.random() > 0.5 ? '2' : '0';
        el.appendChild(span);
    });

    // 动态插入 SVG 曲线 (带飘动动画)
    // viewBox="0 0 100 100" 提供更多垂直空间
    // 增大曲率：控制点 Y 轴偏移量从 60/40 增加到 90/10
    const svgHtml = `
    <svg class="lyric-svg-container" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path class="lyric-curve-path" 
              d="M0,50 Q25,90 50,50 T100,50" 
              pathLength="1">
            <!-- 飘动动画：大幅度上下摆动 -->
            <animate attributeName="d" 
                     values="M0,50 Q25,90 50,50 T100,50;
                             M0,50 Q25,10 50,50 T100,50;
                             M0,50 Q25,90 50,50 T100,50" 
                     dur="8s" 
                     repeatCount="indefinite"
                     calcMode="spline" 
                     keySplines="0.4 0 0.2 1; 0.4 0 0.2 1" />
        </path>
    </svg>`;
    el.innerHTML += svgHtml;
}