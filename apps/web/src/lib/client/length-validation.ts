/** Buttons outside forms must not commit a previous valid value behind an invalid draft. */
export function reportLengthValidity(root:ParentNode|null|undefined,{allowEmptyForms=false}:{allowEmptyForms?:boolean}={}){
  if(!root)return true;
  const invalid=Array.from(root.querySelectorAll<HTMLInputElement>('input[data-length-input]'))
    .find(input=>{
      if(input.matches(':disabled'))return false;
      // An unsubmitted optional command form is not part of the saved plan.
      // Its native required checks still run when that specific form is submitted.
      if(allowEmptyForms&&input.form&&input.validity.valueMissing&&!input.value.trim()&&input.getAttribute('aria-invalid')!=='true')return false;
      return input.getAttribute('aria-invalid')==='true'||!input.checkValidity();
    });
  if(!invalid)return true;
  for(let ancestor=invalid.parentElement;ancestor;ancestor=ancestor.parentElement)if(ancestor instanceof HTMLDetailsElement)ancestor.open=true;
  invalid.focus();invalid.reportValidity();return false;
}
