/** Make overflowing tables operable with the keyboard, without extra stops when they fit. */
export function scrollRegion(node: HTMLElement, label: string) {
  node.setAttribute('role', 'region');
  node.setAttribute('aria-label', label);
  const update = () => {
    if (node.scrollWidth > node.clientWidth + 1 || node.scrollHeight > node.clientHeight + 1) node.tabIndex = 0;
    else node.removeAttribute('tabindex');
  };
  const observer = new ResizeObserver(update);
  observer.observe(node);
  if (node.firstElementChild) observer.observe(node.firstElementChild);
  update();
  return { destroy() { observer.disconnect(); } };
}
