/** Reserve the actual remaining viewport without coupling editor geometry to app chrome. */
export function workbenchViewport(node: HTMLElement, active: boolean) {
  let enabled = active;
  let frame = 0;
  let previousWidth = 0;
  const measure = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      if (!enabled || !node.isConnected || node.classList.contains('is-fullscreen')) return;
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const bottom = window.matchMedia('(max-width:760px)').matches ? 88 : 20;
      const available = Math.max(320, viewportHeight - Math.max(0, node.getBoundingClientRect().top) - bottom);
      node.style.setProperty('--workbench-height', `${Math.round(available)}px`);
    });
  };
  const observer = new ResizeObserver(entries => {
    const width = entries[0]?.contentRect.width ?? 0;
    if (width === previousWidth) return;
    previousWidth = width;
    measure();
  });
  observer.observe(node);
  window.addEventListener('resize', measure);
  window.visualViewport?.addEventListener('resize', measure);
  document.addEventListener('fullscreenchange', measure);
  window.addEventListener('schubert:studio:fullscreen', measure);
  measure();
  return {
    update(next: boolean) { enabled = next; measure(); },
    destroy() {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', measure);
      window.visualViewport?.removeEventListener('resize', measure);
      document.removeEventListener('fullscreenchange', measure);
      window.removeEventListener('schubert:studio:fullscreen', measure);
    }
  };
}

/** A native top-layer popover remains inside the Studio and its fullscreen boundary. */
export function workbenchPopover(node: HTMLElement, anchorId: string) {
  let frame = 0;
  const place = () => {
    const anchor = document.getElementById(anchorId);
    if (!anchor || !node.matches(':popover-open')) return;
    const bounds = anchor.getBoundingClientRect();
    const width = Math.min(340, window.innerWidth - 24);
    const gap = 8;
    const roomBelow = window.innerHeight - bounds.bottom - gap - 12;
    const roomAbove = bounds.top - gap - 12;
    const below = roomBelow >= 250 || roomBelow >= roomAbove;
    node.style.width = `${width}px`;
    node.style.maxHeight = `${Math.max(120, below ? roomBelow : roomAbove)}px`;
    node.style.left = `${Math.max(12, Math.min(bounds.left, window.innerWidth - width - 12))}px`;
    node.style.top = below ? `${bounds.bottom + gap}px` : 'auto';
    node.style.bottom = below ? 'auto' : `${window.innerHeight - bounds.top + gap}px`;
  };
  const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(place); };
  const listen = (open: boolean) => {
    window[open ? 'addEventListener' : 'removeEventListener']('resize', schedule);
    document[open ? 'addEventListener' : 'removeEventListener']('scroll', schedule, true);
  };
  const toggle = (event: Event) => {
    if ((event as ToggleEvent).newState === 'open') {
      place();
      listen(true);
      node.querySelector<HTMLElement>('button:not(:disabled),input:not(:disabled),a[href]')?.focus({ preventScroll: true });
    } else {
      listen(false);
      if (node.contains(document.activeElement)) document.getElementById(anchorId)?.focus({ preventScroll: true });
    }
  };
  node.addEventListener('toggle', toggle);
  return { destroy() { cancelAnimationFrame(frame); listen(false); node.removeEventListener('toggle', toggle); } };
}
