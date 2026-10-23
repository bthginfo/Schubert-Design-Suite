import {tick} from 'svelte';
import {filterChoices,nextChoice,type SearchableOption} from './select-options';

let sequence=0;
let openChoice:{close:()=>void}|null=null;
const arrows=new Set(['ArrowDown','ArrowUp','Home','End']);

/** Existing form recovery can resolve the visible, enhanced control synchronously. */
export function visibleFieldControl(node:HTMLElement|null|undefined):HTMLElement|null{
 if(!node)return null;
 if(node instanceof HTMLSelectElement){
  const control=node.dataset.searchableControl?document.getElementById(node.dataset.searchableControl):null;
  if(control instanceof HTMLInputElement){
   control.setAttribute('aria-invalid',node.getAttribute('aria-invalid')??String(!node.validity.valid));
   return control;
  }
 }
 return node;
}

/**
 * Progressive enhancement of the original single select. The native element retains
 * form ownership, constraints, Svelte's typed option __value and every business callback.
 * The action parameter is the same reactive expression as the native value binding.
 */
export type RemoteChoice={value:unknown;search:(query:string)=>void;busy?:boolean;error?:string};
export function searchableSelect(native:HTMLSelectElement,_valueHint:unknown){
 let remote=typeof _valueHint==='object'&&_valueHint!==null&&'search'in _valueHint?_valueHint as RemoteChoice:null;
 if(native.multiple||typeof HTMLElement.prototype.showPopover!=='function')return {};
 const originalId=native.id,originalHidden=native.hidden,form=native.form;
 const identity=`schubert-choice-${++sequence}`;
 if(!native.id)native.id=identity+'-native';
 const wrapper=document.createElement('div');
 const input=document.createElement('input');
 const toggle=document.createElement('button');
 const popup=document.createElement('div');
 const list=document.createElement('div');
 const status=document.createElement('p');
 const help=document.createElement('span');
 const error=document.createElement('span');
 let destroyed=false,failed=false,initialized=false,opened=false,queued=false,refreshFrame=0,positionFrame=0;
 let query='',active=-1,options:SearchableOption[]=[],filtered:SearchableOption[]=[],lastSelection='';
 let validationShown=false,unlistenOpen=()=>{};
 const controller={close:()=>close()};
 const labels=new Map<HTMLLabelElement,(event:MouseEvent)=>void>();
 const ancestors:Element[]=[];
 for(let ancestor=native.parentElement;ancestor;ancestor=ancestor.parentElement)if(ancestor instanceof HTMLFieldSetElement||ancestor instanceof HTMLDialogElement)ancestors.push(ancestor);
 const observer=new MutationObserver(()=>schedule());

 function sourceLabels():HTMLLabelElement[]{
  // In an implicit <label>, the newly inserted visible input becomes its control.
  // Retain that label as a source without reading the injected option/search text.
  const implicit=native.closest('label');
  return [...new Set([...Array.from(native.labels??[]),...(implicit?[implicit]:[])])];
 }

 function readLabel(label:HTMLLabelElement):string{
  const copy=label.cloneNode(true) as HTMLElement;
  copy.querySelectorAll('select,input,button,textarea,.searchable-select,.reference-search,.field-help,.field-error').forEach(node=>node.remove());
  return (copy.textContent??'').replace(/\s+/g,' ').trim();
 }
 function name():string{
  const explicit=native.getAttribute('aria-label');if(explicit)return explicit;
  const labelled=native.getAttribute('aria-labelledby');
  if(labelled){const text=labelled.split(/\s+/).map(id=>document.getElementById(id)?.textContent??'').join(' ').trim();if(text)return text;}
  return sourceLabels().map(readLabel).filter(Boolean).join(' ')||'Auswahl';
 }
 function selectedLabel():string{return native.selectedOptions[0]?.label??'Bitte auswählen';}
 function syncLabels(){
  const current=new Set(sourceLabels());
  for(const [label,handler]of labels)if(!current.has(label)){label.removeEventListener('click',handler);labels.delete(label);}
  for(const label of current)if(!labels.has(label)){
   const handler=(event:MouseEvent)=>{
    if(input.disabled||wrapper.contains(event.target as Node))return;
    const target=event.target instanceof Element?event.target:null;
    if(target?.closest('button,a,input,textarea,summary'))return;
    event.preventDefault();input.focus({preventScroll:true});
   };
   labels.set(label,handler);label.addEventListener('click',handler);
  }
 }
 function mirror(){
  wrapper.className=`searchable-select ${native.className}`;
  wrapper.dataset.disabled=String(native.matches(':disabled'));
  input.disabled=native.matches(':disabled');toggle.disabled=input.disabled;
  input.dataset.searchableNative=native.id;
  input.setAttribute('aria-label',name());
  list.setAttribute('aria-label',name());
  for(const attribute of ['aria-labelledby','aria-errormessage']){const value=native.getAttribute(attribute);if(value)input.setAttribute(attribute,value);else input.removeAttribute(attribute);}
  input.setAttribute('aria-required',String(native.required));
  const invalid=native.getAttribute('aria-invalid')==='true'||validationShown&&!native.validity.valid;
  input.setAttribute('aria-invalid',String(invalid));wrapper.dataset.invalid=String(invalid);
  const described=[native.getAttribute('aria-describedby'),help.id,validationShown&&!native.validity.valid?error.id:null].filter(Boolean).join(' ');
  input.setAttribute('aria-describedby',described);
  error.hidden=!validationShown||native.validity.valid;
  error.textContent=native.validity.valueMissing?'Bitte wählen Sie einen Eintrag aus der Liste.':native.validationMessage||'Bitte prüfen Sie die Auswahl.';
  input.title=native.title;
  // Local component select rules still author density and spacing. Read them only
  // on a value/options/disabled change or viewport resize, never on each frame.
  const style=getComputedStyle(native);
  for(const [property,value]of Object.entries({
   '--choice-font-size':style.fontSize,'--choice-line-height':style.lineHeight,
   '--choice-min-height':style.minHeight,'--choice-margin-top':style.marginTop,
   '--choice-padding-y':style.paddingTop,'--choice-padding-x':style.paddingLeft
  }))wrapper.style.setProperty(property,value);
  syncLabels();
 }
 function refresh(){
  if(destroyed||failed||!native.isConnected)return;
  mirror();
  options=Array.from(native.options).map((option,index)=>({index,label:option.label,group:option.parentElement instanceof HTMLOptGroupElement?option.parentElement.label:'',disabled:option.disabled||option.parentElement instanceof HTMLOptGroupElement&&option.parentElement.disabled}));
  const selection=String(native.selectedIndex)+'\u0000'+selectedLabel();
  if(selection!==lastSelection){lastSelection=selection;if(opened&&!query)input.value=selectedLabel();}
  if(!opened)input.value=selectedLabel();
  if(input.disabled||ancestors.some(ancestor=>ancestor instanceof HTMLDialogElement&&!ancestor.open))close();
  if(opened)render();
 }
 function schedule(){
  if(destroyed||failed||queued)return;queued=true;
  void tick().then(()=>{queued=false;if(destroyed||failed)return;cancelAnimationFrame(refreshFrame);refreshFrame=requestAnimationFrame(()=>{refreshFrame=0;refresh();});});
 }
 function render(){
  filtered=filterChoices(options,query);
  if(!filtered.some(option=>option.index===active&&!option.disabled))active=nextChoice(filtered,-1,'ArrowDown');
  const fragment=document.createDocumentFragment();
  let group='';
  for(const option of filtered){
   if(option.group!==group){group=option.group;if(group){const heading=document.createElement('div');heading.className='searchable-select-group';heading.textContent=group;heading.setAttribute('role','presentation');fragment.append(heading);}}
   const row=document.createElement('div');row.id=`${identity}-option-${option.index}`;row.className='searchable-select-option';row.setAttribute('role','option');row.setAttribute('aria-selected',String(option.index===native.selectedIndex));row.setAttribute('aria-disabled',String(option.disabled));row.dataset.index=String(option.index);row.dataset.active=String(option.index===active);row.textContent=option.label||'Ohne Zuordnung';fragment.append(row);
  }
  list.replaceChildren(fragment);
  if(!filtered.length){
   // This disabled informational option satisfies the listbox's owned-role contract.
   // It has no native index/value and can never be selected or committed.
   const empty=document.createElement('div');empty.className='searchable-select-empty';empty.setAttribute('role','option');empty.setAttribute('aria-disabled','true');empty.setAttribute('aria-selected','false');empty.textContent=remote?.busy?'Der freigegebene Bestand wird durchsucht …':remote?.error?'Suche fehlgeschlagen. Bitte erneut tippen.':'Kein passender Eintrag gefunden. Versuchen Sie einen anderen Suchbegriff.';list.append(empty);
  }
  input.setAttribute('aria-busy',String(!!remote?.busy));
  status.textContent=remote?.busy?'Bestand wird durchsucht …':remote?.error||`${filtered.length} ${filtered.length===1?'Eintrag':'Einträge'}${query?' gefunden':''} · Auswählen oder weitersuchen`;
  if(active>=0)input.setAttribute('aria-activedescendant',`${identity}-option-${active}`);else input.removeAttribute('aria-activedescendant');
  position();
 }
 function position(){
  if(!opened)return;
  const rect=wrapper.getBoundingClientRect(),viewport=window.visualViewport;
  const leftEdge=viewport?.offsetLeft??0,topEdge=viewport?.offsetTop??0,width=viewport?.width??innerWidth,height=viewport?.height??innerHeight;
  const desired=Math.min(Math.max(rect.width,280),width-24),below=topEdge+height-rect.bottom-12,above=rect.top-topEdge-12;
  const flip=below<Math.min(260,popup.scrollHeight)&&above>below;
  const available=Math.max(80,flip?above:below);
  popup.style.width=desired+'px';popup.style.maxHeight=Math.min(360,available)+'px';
  popup.style.left=Math.max(leftEdge+12,Math.min(rect.left,leftEdge+width-desired-12))+'px';
  popup.style.top=(flip?Math.max(topEdge+12,rect.top-Math.min(360,available,popup.scrollHeight)-6):Math.max(topEdge+12,rect.bottom+6))+'px';
 }
 function schedulePosition(){if(!positionFrame)positionFrame=requestAnimationFrame(()=>{positionFrame=0;position();});}
 function outside(event:PointerEvent){if(!wrapper.contains(event.target as Node))close();}
 function open(){
  if(destroyed||failed||input.disabled||opened)return;
  refresh();if(input.disabled)return;
  openChoice?.close();openChoice=controller;opened=true;query='';active=options.find(option=>option.index===native.selectedIndex&&!option.disabled)?.index??nextChoice(options,-1,'ArrowDown');
  input.setAttribute('aria-expanded','true');wrapper.dataset.open='true';input.value=selectedLabel();render();remote?.search('');
  try{popup.showPopover();position();}catch{opened=false;openChoice=null;fallback();return;}
  const resize=new ResizeObserver(schedulePosition);resize.observe(wrapper);
  window.addEventListener('scroll',schedulePosition,true);window.addEventListener('resize',schedulePosition);document.addEventListener('pointerdown',outside,true);document.addEventListener('fullscreenchange',close);
  window.visualViewport?.addEventListener('resize',schedulePosition);window.visualViewport?.addEventListener('scroll',schedulePosition);
  unlistenOpen=()=>{resize.disconnect();window.removeEventListener('scroll',schedulePosition,true);window.removeEventListener('resize',schedulePosition);document.removeEventListener('pointerdown',outside,true);document.removeEventListener('fullscreenchange',close);window.visualViewport?.removeEventListener('resize',schedulePosition);window.visualViewport?.removeEventListener('scroll',schedulePosition);};
 }
 function close(){
  if(!opened)return;opened=false;query='';input.value=selectedLabel();input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');wrapper.dataset.open='false';
  if(openChoice===controller)openChoice=null;
  unlistenOpen();unlistenOpen=()=>{};cancelAnimationFrame(positionFrame);positionFrame=0;
  try{if(popup.matches(':popover-open'))popup.hidePopover();}catch{/* Closing a removed native dialog is already complete. */}
 }
 function commit(index:number){
  const option=native.options[index];
  if(native.matches(':disabled')||!option||option.disabled||option.parentElement instanceof HTMLOptGroupElement&&option.parentElement.disabled)return;
  const previous=native.selectedOptions[0] as (HTMLOptionElement&{__value?:unknown})|undefined;
  const target=option as HTMLOptionElement&{__value?:unknown};
  const previousValue=previous&&('__value'in previous?previous.__value:previous.value),nextValue='__value'in target?target.__value:target.value;
  native.selectedIndex=index;validationShown=false;close();input.focus({preventScroll:true});input.select();
  if(!Object.is(previousValue,nextValue)){native.dispatchEvent(new Event('input',{bubbles:true}));native.dispatchEvent(new Event('change',{bubbles:true}));}
  schedule();
 }
 function keydown(event:KeyboardEvent){
  if(event.key==='Tab'){close();return;}
  if(event.key==='Escape'&&!opened)return;
  // Editing this control must never move canvas elements or trigger outer shortcuts.
  event.stopPropagation();
  if(event.isComposing)return;
  if(arrows.has(event.key)){
   event.preventDefault();if(!opened)open();else active=nextChoice(filtered,active,event.key as 'ArrowDown'|'ArrowUp'|'Home'|'End');
   render();document.getElementById(`${identity}-option-${active}`)?.scrollIntoView({block:'nearest'});return;
  }
  if(event.key==='Enter'){event.preventDefault();if(opened){if(active>=0&&!remote?.busy)commit(active);}else open();return;}
  if(event.key==='Escape'&&opened){event.preventDefault();close();input.select();}
 }
 function invalid(event:Event){if(!initialized)return;event.preventDefault();validationShown=true;mirror();for(let section=native.closest('details');section;section=section.parentElement?.closest('details')??null)section.open=true;input.focus();}
 function reset(){validationShown=false;close();schedule();}
 function onInput(event:Event){event.stopPropagation();const typed=input.value;if(!opened)open();input.value=typed;query=typed;active=-1;remote?.search(typed);render();}
 function onFocus(event:FocusEvent){if(!native.matches(':disabled'))native.dispatchEvent(new FocusEvent('focus',{relatedTarget:event.relatedTarget}));if(!opened)input.select();}
 function onBlur(event:FocusEvent){
  native.dispatchEvent(new FocusEvent('blur',{relatedTarget:event.relatedTarget}));
  if(event.relatedTarget instanceof Node&&wrapper.contains(event.relatedTarget))return;
  queueMicrotask(()=>{if(opened&&!wrapper.contains(document.activeElement))close();});
 }
 function onClick(){if(!opened){open();input.select();}}
 function onToggle(event:MouseEvent){event.preventDefault();input.focus({preventScroll:true});if(opened)close();else{open();input.select();}}
 function onTogglePointerDown(event:PointerEvent){if(event.isPrimary&&event.button===0)event.preventDefault();}
 function onOption(event:MouseEvent){const row=(event.target as Element).closest<HTMLElement>('[data-index]');if(row){event.preventDefault();event.stopPropagation();commit(Number(row.dataset.index));}}
 function onPointerDown(event:PointerEvent){if((event.target as Element).closest('[data-index]'))event.preventDefault();}
 function onNativeChange(){schedule();}
 function fallback(){
  close();failed=true;cancelAnimationFrame(refreshFrame);cancelAnimationFrame(positionFrame);native.hidden=originalHidden;native.removeAttribute('data-searchable-control');wrapper.remove();observer.disconnect();initialized=false;
  for(const[label,handler]of labels)label.removeEventListener('click',handler);labels.clear();
  native.removeEventListener('invalid',invalid);native.removeEventListener('change',onNativeChange);native.removeEventListener('input',onNativeChange);form?.removeEventListener('reset',reset);window.removeEventListener('resize',schedule);
 }
 try{
  wrapper.className='searchable-select';
  input.id=identity+'-input';input.type='text';input.className='searchable-select-input';input.autocomplete='off';input.spellcheck=false;input.autocapitalize='none';input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-haspopup','listbox');input.setAttribute('aria-expanded','false');input.setAttribute('aria-controls',identity+'-listbox');input.setAttribute('data-searchable-select','');
  toggle.type='button';toggle.className='searchable-select-toggle';toggle.tabIndex=-1;toggle.setAttribute('aria-hidden','true');
  toggle.innerHTML='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
  popup.className='searchable-select-popup';popup.setAttribute('popover','manual');
  list.id=identity+'-listbox';list.className='searchable-select-list';list.setAttribute('role','listbox');list.setAttribute('aria-label',name());
  status.className='searchable-select-status';status.setAttribute('aria-live','polite');status.setAttribute('aria-atomic','true');
  help.id=identity+'-help';help.className='sr-only';help.textContent='Auswahl öffnen oder tippen, um zu suchen. Pfeiltasten zum Auswählen, Enter zum Übernehmen, Escape zum Abbrechen.';
  error.id=identity+'-error';error.className='searchable-select-error';error.hidden=true;
  popup.append(list,status);wrapper.append(input,toggle,popup,help,error);native.before(wrapper);
  input.addEventListener('keydown',keydown);input.addEventListener('input',onInput);input.addEventListener('change',event=>event.stopPropagation());input.addEventListener('click',onClick);input.addEventListener('focus',onFocus);input.addEventListener('blur',onBlur);toggle.addEventListener('pointerdown',onTogglePointerDown);toggle.addEventListener('click',onToggle);popup.addEventListener('click',onOption);popup.addEventListener('pointerdown',onPointerDown);
  native.addEventListener('invalid',invalid);native.addEventListener('change',onNativeChange);native.addEventListener('input',onNativeChange);form?.addEventListener('reset',reset);window.addEventListener('resize',schedule);
  refresh();native.dataset.searchableControl=input.id;native.hidden=true;initialized=true;
  if(document.activeElement===native)input.focus({preventScroll:true});
  observer.observe(native,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['disabled','required','aria-label','aria-labelledby','aria-describedby','aria-errormessage','aria-invalid','id','class','title','selected','value','label']});
  ancestors.forEach(ancestor=>observer.observe(ancestor,{attributes:true,attributeFilter:['disabled','open']}));
  schedule();
 }catch{fallback();}
 return {
  update(_nextValueHint:unknown){remote=typeof _nextValueHint==='object'&&_nextValueHint!==null&&'search'in _nextValueHint?_nextValueHint as RemoteChoice:null;if(initialized)schedule();},
  destroy(){destroyed=true;close();cancelAnimationFrame(refreshFrame);cancelAnimationFrame(positionFrame);observer.disconnect();for(const[label,handler]of labels)label.removeEventListener('click',handler);labels.clear();native.removeEventListener('invalid',invalid);native.removeEventListener('change',onNativeChange);native.removeEventListener('input',onNativeChange);form?.removeEventListener('reset',reset);window.removeEventListener('resize',schedule);native.hidden=originalHidden;native.removeAttribute('data-searchable-control');if(!originalId)native.removeAttribute('id');wrapper.remove();}
 };
}
