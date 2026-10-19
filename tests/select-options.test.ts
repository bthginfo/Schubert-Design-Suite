import {describe,it,expect} from 'vitest';
import {choiceSearchText,filterChoices,nextChoice,type SearchableOption} from '../apps/web/src/lib/client/select-options.js';

const options:SearchableOption[]=[
 {index:0,label:'Ohne Zuordnung',group:'',disabled:false},
 {index:1,label:'Nero Assoluto · poliert',group:'Granit',disabled:false},
 {index:2,label:'Märkischer Sandstein',group:'Sandstein',disabled:true},
 {index:3,label:'Jura · gebürstet',group:'Kalkstein',disabled:false},
 {index:4,label:'Straße Süd',group:'Aufträge',disabled:false}
];
describe('Local searchable select option logic',()=>{
 it('matches German diacritics, case, sharp s, repeated whitespace and all words in label or group',()=>{
  expect(choiceSearchText('  STRAẞE  SÜD ')).toBe('strasse sud');
  expect(filterChoices(options,'granit POLIERT').map(item=>item.index)).toEqual([1]);
  expect(filterChoices(options,'markischer').map(item=>item.index)).toEqual([2]);
  expect(filterChoices(options,'geburstet kalk').map(item=>item.index)).toEqual([3]);
  expect(filterChoices(options,'STRASSE sud').map(item=>item.index)).toEqual([4]);
 });
 it('retains the truthful disabled result, the empty optional choice and original option indices',()=>{
  expect(filterChoices(options,'')).toBe(options);
  expect(filterChoices(options,'sandstein')).toEqual([options[2]]);
  expect(filterChoices(options,'nicht vorhanden')).toEqual([]);
  expect(filterChoices(options,'ohne')).toEqual([options[0]]);
 });
 it('navigates enabled results without ever selecting disabled options or leaking indices from the full list',()=>{
  expect(nextChoice(options,1,'ArrowDown')).toBe(3);
  expect(nextChoice(options,3,'ArrowUp')).toBe(1);
  expect(nextChoice(options,4,'ArrowDown')).toBe(4);
  expect(nextChoice(options,0,'ArrowUp')).toBe(0);
  expect(nextChoice(options,3,'Home')).toBe(0);
  expect(nextChoice(options,0,'End')).toBe(4);
  expect(nextChoice(filterChoices(options,'kalk'),1,'ArrowDown')).toBe(3);
  expect(nextChoice(filterChoices(options,'sand'),1,'ArrowDown')).toBe(-1);
  expect(nextChoice([],0,'Home')).toBe(-1);
 });
});
