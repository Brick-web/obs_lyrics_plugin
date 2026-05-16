import { renderKTV } from './modes/ktv.js';
import { renderDirect, renderFade } from './modes/basic.js';
import { renderSvgCurve } from './modes/svg_curve.js';
import { renderComic } from './modes/comic.js';
import { renderStarry, stopStarry } from './modes/starry.js';
import { renderParticles, stopParticles } from './modes/particles.js';
import { renderNeon } from './modes/neon.js';
import { themeConfig } from './theme_config.js';

const channel = new BroadcastChannel('obs_lyrics_channel');
const lineEl = document.getElementById('current-line');
const translationEl = document.getElementById('translation-line');
const songTitleScreenEl = document.getElementById('song-title-screen');
const songTitleTextEl = document.getElementById('song-title-text');
const songTitleLabelEl = document.getElementById('song-title-label');
const songContentTextEl = document.getElementById('song-content-text');
const gradientEl = document.getElementById('status-gradient');

// 应用主题配置
function applyTheme() {
    const root = document.documentElement;
    // 全局颜色
    root.style.setProperty('--global-text-color', themeConfig.global.textColor);
    root.style.setProperty('--global-text-shadow', themeConfig.global.textShadowColor);
    root.style.setProperty('--lyric-font-size', themeConfig.global.fontSize || '64px');
    root.style.setProperty('--text-stroke-width', themeConfig.global.textShadowWidth || '2px');
    root.style.setProperty('--text-shadow-blur', themeConfig.global.textShadowBlur || '10px');
    root.style.setProperty('--text-shadow-offset-x', themeConfig.global.textShadowOffsetX || '0px');
    root.style.setProperty('--text-shadow-offset-y', themeConfig.global.textShadowOffsetY || '4px');

    // KTV 模式颜色
    root.style.setProperty('--ktv-scan-color', themeConfig.ktv.scanColor);
    root.style.setProperty('--ktv-base-color', themeConfig.ktv.baseColor);

    // SVG 曲线模式颜色
    root.style.setProperty('--svg-text-color', themeConfig.svgCurve.textColor);
    root.style.setProperty('--svg-glow-color', themeConfig.svgCurve.glowColor);

    // 漫画模式颜色
    root.style.setProperty('--comic-text-color', themeConfig.comic.textColor);
    root.style.setProperty('--comic-shadow-color', themeConfig.comic.shadowColor);

    // 星空模式颜色
    root.style.setProperty('--starry-text-color', themeConfig.starry.textColor);
    root.style.setProperty('--starry-star-color', themeConfig.starry.starColor);

    // 粒子模式颜色
    if (themeConfig.particles) {
        root.style.setProperty('--particles-primary-color', themeConfig.particles.primaryColor);
        root.style.setProperty('--particles-glow-color', themeConfig.particles.glowColor);
    }

    // 霓虹灯模式颜色
    if (themeConfig.neon) {
        root.style.setProperty('--neon-color', themeConfig.neon.neonColor);
    }

    if (themeConfig.title) {
        root.style.setProperty('--title-text-color', themeConfig.title.textColor || 'var(--global-text-color)');
        root.style.setProperty('--title-spot-glow', themeConfig.title.spotlightGlow || 'rgba(126, 203, 255, 0.55)');
    }

    //（已移除）烟花模式配置：不再导出 globals

    // 注入 SVG 渐变定义
    injectSvgDefs();
}

function injectSvgDefs() {
    const container = document.getElementById('svg-defs-container');
    if (!container) return;

    const gradConfig = themeConfig.svgCurve.gradient;
    const stopsHtml = gradConfig.stops.map(stop => {
        let animateHtml = '';
        if (stop.animate) {
            animateHtml = `<animate attributeName="stop-color" 
                values="${stop.animate.values}" 
                dur="${stop.animate.dur}" 
                repeatCount="indefinite" 
                ${stop.animate.begin ? `begin="${stop.animate.begin}"` : ''} />`;
        }
        return `<stop offset="${stop.offset}" stop-color="${stop.color}">${animateHtml}</stop>`;
    }).join('');

    container.innerHTML = `
    <svg style="position: absolute; width: 0; height: 0; overflow: hidden;" aria-hidden="true">
        <defs>
            <linearGradient id="${gradConfig.id}" x1="0%" y1="0%" x2="100%" y2="0%">
                ${stopsHtml}
            </linearGradient>
        </defs>
    </svg>`;
}

// 初始化自检：页面加载后显示底部绿色渐变，证明页面是活的
window.addEventListener('load', () => {
    applyTheme(); // 应用主题

    // 初始状态：绿色渐变（就绪）
    gradientEl.className = 'gradient-ready';

    // 8秒后如果没有收到指令，显示红色渐变（警告）
    setTimeout(() => {
        if (gradientEl.classList.contains('gradient-ready')) {
            gradientEl.className = 'gradient-error';
        }
    }, 8000);
});

channel.onmessage = (event) => {
    const { type, payload } = event.data;

    if (type === 'UPDATE_LYRIC') {
        // 收到指令，隐藏渐变状态条
        gradientEl.className = '';
        hideSongTitle();

        renderLyric(payload.text, payload.duration, payload.mode, payload.translation || '');
    } else if (type === 'CLEAR') {
        lineEl.style.opacity = '0';
        lineEl.className = 'lyric-line'; // 重置类
        renderTranslation('');
        hideSongTitle();
        stopParticles({ fade: true });
        stopStarry();
    } else if (type === 'UPDATE_SONG_INFO') {
        gradientEl.className = '';
        showSongTitle(payload || {});
    } else if (type === 'PING') {
        // 收到 Ping 也说明连接成功，隐藏渐变
        gradientEl.className = '';
    } else if (type === 'UPDATE_THEME') {
        // 更新主题配置
        console.log('[main] UPDATE_THEME payload:', payload);
        updateThemeConfig(payload);
        applyTheme();
    } else if (type === 'UPDATE_FONT') {
        updateFont(payload);
    }
};

function updateFont(fontConfig) {
    // 1. 动态注入 @font-face
    // 检查是否已存在样式标签，没有则创建
    let styleEl = document.getElementById('dynamic-font-style');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'dynamic-font-style';
        document.head.appendChild(styleEl);
    }

    // 注意：display.html 位于根目录，font 位于 font/ 目录
    // 这里的路径是相对于 display.html 的
    const fontPath = `font/${fontConfig.filename}`;

    styleEl.textContent = `
        @font-face {
            font-family: '${fontConfig.family}';
            src: url('${fontPath}') format('truetype');
        }
    `;

    // 2. 应用字体到 body
    document.body.style.fontFamily = `'${fontConfig.family}', sans-serif`;
}

function updateThemeConfig(newConfig) {
    // 深度合并配置 (简单实现)
    if (newConfig.global) Object.assign(themeConfig.global, newConfig.global);
    if (newConfig.ktv) Object.assign(themeConfig.ktv, newConfig.ktv);
    if (newConfig.svgCurve) {
        if (newConfig.svgCurve.textColor) themeConfig.svgCurve.textColor = newConfig.svgCurve.textColor;
        if (newConfig.svgCurve.glowColor) themeConfig.svgCurve.glowColor = newConfig.svgCurve.glowColor;
        if (newConfig.svgCurve.gradient) themeConfig.svgCurve.gradient = newConfig.svgCurve.gradient;
    }
    if (newConfig.comic) Object.assign(themeConfig.comic, newConfig.comic);
    if (newConfig.starry) Object.assign(themeConfig.starry, newConfig.starry);
    if (newConfig.particles) Object.assign(themeConfig.particles, newConfig.particles);
    if (newConfig.neon) Object.assign(themeConfig.neon, newConfig.neon);
    if (newConfig.title) Object.assign(themeConfig.title, newConfig.title);
}

function applySongTitleVisual(titleMode) {
    if (!songTitleTextEl) return;
    songTitleTextEl.className = 'song-title-text';
    const mode = titleMode || 't0';
    if (mode === 't1') {
        songTitleTextEl.classList.add('title-mode-spotlight');
    }
}

function showSongTitle(songInfo) {
    if (!songTitleScreenEl || !songTitleTextEl || !songContentTextEl) return;

    const title = (songInfo.title || songInfo.songName || '').trim();
    const content = (songInfo.songContent || songInfo.songInfo || songInfo.description || '').trim();
    const showTitle = songInfo.showTitle !== false;
    const titleMode = songInfo.titleMode != null && songInfo.titleMode !== ''
        ? String(songInfo.titleMode)
        : 't0';

    applySongTitleVisual(showTitle && title ? titleMode : 't0');

    const labelEl = songTitleLabelEl || songTitleTextEl;
    if (showTitle && title) {
        labelEl.innerText = title;
        songTitleTextEl.style.display = '';
    } else {
        labelEl.innerText = '';
        songTitleTextEl.style.display = 'none';
    }

    songContentTextEl.innerText = content;
    songContentTextEl.style.display = content ? 'block' : 'none';

    const visible = (showTitle && title) || !!content;
    songTitleScreenEl.className = visible ? 'song-title-screen visible' : 'song-title-screen';
}

function hideSongTitle() {
    if (!songTitleScreenEl) return;
    songTitleScreenEl.className = 'song-title-screen';
    if (songTitleTextEl) {
        songTitleTextEl.className = 'song-title-text';
        songTitleTextEl.style.display = '';
    }
    const labelEl = songTitleLabelEl || songTitleTextEl;
    if (labelEl) labelEl.innerText = '';
}

function renderTranslation(translation) {
    if (!translationEl) return;

    const value = (translation || '').trim();
    translationEl.innerText = value;
    translationEl.className = value ? 'translation-line visible' : 'translation-line';
}

function renderLyric(text, duration, mode, translation = '') {
    // 1. 重置状态
    lineEl.style.opacity = ''; // 关键修复：清除 CLEAR 操作留下的内联隐藏样式
    lineEl.style.animationDuration = ''; // 清除 KTV 模式留下的整句动画时长，避免影响其他模式入场动画
    lineEl.style.animationDelay = '';
    lineEl.style.animationTimingFunction = '';
    lineEl.style.animationIterationCount = '';
    lineEl.className = 'lyric-line';
    // 强制重绘以触发动画重置
    void lineEl.offsetWidth;

    lineEl.setAttribute('data-text', text); // 关键：同步内容给伪元素使用

    const useParticles = mode === '7';
    if (!useParticles) {
        stopParticles({ immediate: true });
    }
    const useStarry = mode === '6';
    if (!useStarry) {
        stopStarry();
    }

    // 2. 根据模式分发处理
    switch (mode) {
        case '1':
            renderKTV(lineEl, text, duration);
            break;
        case '2':
            renderDirect(lineEl, text);
            break;
        case '3':
            renderFade(lineEl, text);
            break;
        case '4':
            renderSvgCurve(lineEl, text);
            break;
        case '5':
            renderComic(lineEl, text);
            break;
        case '6':
            renderStarry(lineEl, text);
            break;
        case '7':
            renderParticles(lineEl, text);
            break;
        case '8':
            renderNeon(lineEl, text, themeConfig.neon);
            break;
        default:
            // 默认使用直接显示
            renderDirect(lineEl, text);
    }

    renderTranslation(translation);
}