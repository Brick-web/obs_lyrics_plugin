export function renderWave(container, text) {
    container.innerHTML = '';
    container.className = 'lyric-line mode-wave';
    container.textContent = text;
    container.setAttribute('data-text', text);
}