export function renderKTV(el, text, duration) {
    el.innerText = text;
    el.classList.add('mode-ktv');
    el.style.animationDuration = `${duration}ms`;
}