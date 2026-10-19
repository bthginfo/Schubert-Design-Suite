import {expect,type Locator,type Page} from '@playwright/test';

type Choice=string|{value?:string;label?:string;index?:number};

/** Read backing state without bypassing the visible search-and-select flow. */
export async function nativeSelect(page:Page,control:Locator):Promise<Locator>{
 await expect(control.first()).toBeAttached();
 const native=control.and(page.locator('select'));
 if(await native.count()===1)return native;
 const input=control.and(page.locator('[data-searchable-select]'));
 const id=await input.getAttribute('data-searchable-native');
 if(!id)throw new Error('The visible combobox must identify its native source.');
 return page.locator(`select[id=${JSON.stringify(id)}]`);
}

export async function visibleSelect(page:Page,control:Locator):Promise<Locator>{
 const native=await nativeSelect(page,control);
 await expect(native).toHaveAttribute('data-searchable-control',/.+/);
 const id=(await native.getAttribute('data-searchable-control'))!;
 return page.locator(`[id=${JSON.stringify(id)}]`);
}

/** Choose a real result by its visible label, with no forced hidden-select writes. */
export async function chooseSelect(page:Page,control:Locator,choice:Choice){
 const native=await nativeSelect(page,control);
 const option=await native.evaluate((select:HTMLSelectElement,wanted:Choice)=>{
  const options=Array.from(select.options);
  const index=typeof wanted==='string'?options.findIndex(option=>option.value===wanted):
   wanted.index!==undefined?wanted.index:options.findIndex(option=>wanted.value!==undefined?option.value===wanted.value:option.label===wanted.label);
  const selected=options[index];
  if(!selected)throw new Error('The requested option does not exist.');
  if(selected.disabled||selected.parentElement instanceof HTMLOptGroupElement&&selected.parentElement.disabled)throw new Error('The requested option is disabled.');
  return {value:selected.value,label:selected.label};
 },choice);
 const input=await visibleSelect(page,native);
 await expect(input).toBeVisible();await expect(input).toBeEnabled();
 await input.click();await input.fill(option.label);
 const listId=(await input.getAttribute('aria-controls'))!;
 const list=page.locator(`[id=${JSON.stringify(listId)}]`);
 const result=list.getByRole('option',{name:option.label,exact:true}).first();
 await expect(result).toBeVisible();await result.click();
 await expect(native).toHaveValue(option.value);
 await expect(input).toHaveValue(option.label);
 return option.value;
}

/** Display settings are secondary controls; open their actual editor menu. */
export async function setDisplayOption(page:Page,name:string,checked:boolean){
 // Two settings include their explanation in the wrapping label. Match the
 // visible setting name at the start while retaining that useful description.
 const checkbox=page.getByRole('checkbox',{name:new RegExp('^'+name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?:\\s|$)')});
 const menu=page.getByRole('button',{name:'Darstellung',exact:true});
 const opened=!await checkbox.isVisible();
 if(opened)await menu.click();
 await expect(checkbox).toBeVisible();await checkbox.setChecked(checked);
 if(opened&&await menu.getAttribute('aria-expanded')==='true')await menu.click();
}

/** Document tasks remain explicit destinations in the compact project menu. */
export async function studioAction(page:Page,name:string){
 const action=page.locator('#studio-project-menu').getByRole('button',{name:new RegExp('^'+name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?:\\s|$)')});
 if(!await action.isVisible())await page.getByRole('button',{name:'Projektaktionen',exact:true}).click();
 await expect(action).toBeVisible();await action.click();
}
