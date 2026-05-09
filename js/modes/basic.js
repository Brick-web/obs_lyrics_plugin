export function renderDirect(el, text) {
    el.innerText = text;
    el.classList.add('mode-direct');
}

export function renderFade(el, text) {
    el.innerText = text;
    el.classList.add('mode-fade');
}