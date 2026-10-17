let modalCount=0;let originalOverflow='';
export function focusTrap(node:HTMLElement){
  const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;
  if(modalCount++===0){originalOverflow=document.body.style.overflow;document.body.style.overflow='hidden';}
  const focusable=()=>Array.from(node.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')).filter(el=>el.getClientRects().length>0);
  const frame=requestAnimationFrame(()=>{const first=focusable()[0];(first||node).focus();});
  const keydown=(event:KeyboardEvent)=>{if(event.key!=='Tab')return;const items=focusable();if(!items.length){event.preventDefault();node.focus();return;}const first=items[0],last=items[items.length-1];if(event.shiftKey&&(document.activeElement===first||document.activeElement===node)){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}};
  node.addEventListener('keydown',keydown);
  return {destroy(){cancelAnimationFrame(frame);node.removeEventListener('keydown',keydown);if(--modalCount===0)document.body.style.overflow=originalOverflow;previous?.focus();}};
}
