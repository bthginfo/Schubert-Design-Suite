/** Keep the one companion instance visible inside native or fallback Studio fullscreen. */
export function fullscreenCompanion(node:HTMLElement){
  const anchor=document.createComment('companion-position');
  node.before(anchor);
  let fallbackElement:HTMLElement|null=null;
  const place=()=>{
    const target=document.fullscreenElement instanceof HTMLElement?document.fullscreenElement:fallbackElement?.isConnected?fallbackElement:null;
    if(target&&!target.contains(node))target.append(node);
    else if(!target&&anchor.parentNode)anchor.parentNode.insertBefore(node,anchor.nextSibling);
  };
  const studio=(event:Event)=>{const element=(event as CustomEvent<{element?:unknown}>).detail?.element;fallbackElement=element instanceof HTMLElement?element:null;place();};
  document.addEventListener('fullscreenchange',place);
  window.addEventListener('schubert:studio:fullscreen',studio);
  place();
  return{destroy(){
    document.removeEventListener('fullscreenchange',place);
    window.removeEventListener('schubert:studio:fullscreen',studio);
    if(anchor.parentNode)anchor.parentNode.insertBefore(node,anchor.nextSibling);
    anchor.remove();
  }};
}
