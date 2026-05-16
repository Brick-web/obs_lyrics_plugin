<<<<<<< HEAD
export function renderComic(el, text) {
    el.innerText = text;
    el.classList.add('mode-comic');
    el.setAttribute('data-text', text); // 用于伪元素生成半调网点
=======
export function renderComic(el, text) {
    el.innerText = text;
    el.classList.add('mode-comic');
    el.setAttribute('data-text', text); // 用于伪元素生成半调网点
>>>>>>> ce06bf7e3ef514af1e39fdb9769e4f30278f895d
}