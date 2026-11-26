let modalCount=0;let originalOverflow='';
export function focusTrap(node:HTMLElement){
  const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;
  if(modalCount++===0){originalOverflow=document.body.style.overflow;document.body.style.overflow='hidden';}
  const focusable=()=>Array.from(node.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')).filter(el=>el.getClientRects().length>0);
  // Start where the work starts: an explicit autofocus, otherwise the first field of the dialog body.
  // Touch devices keep focus on the dialog itself so the on-screen keyboard does not cover the form.
  const initial=()=>{
    const explicit=node.querySelector<HTMLElement>('[autofocus]:not([disabled])');if(explicit)return explicit;
    if(typeof matchMedia==='function'&&matchMedia('(pointer: coarse)').matches)return node.hasAttribute('tabindex')?node:null;
    const field=Array.from(node.querySelectorAll<HTMLElement>('.modal-body input:not([disabled]):not([type=hidden]):not([readonly]),.modal-body select:not([disabled]),.modal-body textarea:not([disabled]):not([readonly])')).find(el=>el.getClientRects().length>0);
    return field??null;
  };
  const frame=requestAnimationFrame(()=>{const start=initial()??focusable()[0];(start||node).focus();});
  const keydown=(event:KeyboardEvent)=>{if(event.key!=='Tab')return;const items=focusable();if(!items.length){event.preventDefault();node.focus();return;}const first=items[0],last=items[items.length-1];if(event.shiftKey&&(document.activeElement===first||document.activeElement===node)){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}};
  node.addEventListener('keydown',keydown);
  return {destroy(){cancelAnimationFrame(frame);node.removeEventListener('keydown',keydown);if(--modalCount===0)document.body.style.overflow=originalOverflow;previous?.focus();}};
}
