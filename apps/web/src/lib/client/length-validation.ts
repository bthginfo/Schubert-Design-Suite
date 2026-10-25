/** Buttons outside forms must not commit a previous valid value behind an invalid draft. */
export function reportLengthValidity(root:ParentNode|null|undefined){
  if(!root)return true;
  const invalid=Array.from(root.querySelectorAll<HTMLInputElement>('input[data-length-input]'))
    .find(input=>!input.matches(':disabled')&&(input.getAttribute('aria-invalid')==='true'||!input.checkValidity()));
  if(!invalid)return true;
  for(let ancestor=invalid.parentElement;ancestor;ancestor=ancestor.parentElement)if(ancestor instanceof HTMLDetailsElement)ancestor.open=true;
  invalid.focus();invalid.reportValidity();return false;
}
