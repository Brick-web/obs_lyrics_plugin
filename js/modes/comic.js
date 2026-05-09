export function renderComic(el, text) {
    el.innerText = text;
    el.classList.add('mode-comic');
    el.setAttribute('data-text', text); // 用于伪元素生成半调网点
}