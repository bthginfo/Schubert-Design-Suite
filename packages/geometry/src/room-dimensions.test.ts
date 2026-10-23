import {describe,it,expect} from 'vitest';
import {rectangularRoomAxisPoints} from './room-dimensions.js';

const origin={xMm:'100',yMm:'200',zMm:'0'};
describe('Room dimensions with an explicit survey reference',()=>{
  it('keeps 4200 × 3200 mm clear of a 200 mm wall core',()=>{
    const points=rectangularRoomAxisPoints('4200','3200','200',origin,'clear');
    expect(points).toEqual([{xMm:'0',yMm:'100',zMm:'0'},{xMm:'4400',yMm:'100',zMm:'0'},{xMm:'4400',yMm:'3500',zMm:'0'},{xMm:'0',yMm:'3500',zMm:'0'}]);
    expect(Number(points[1].xMm)-Number(points[0].xMm)-200).toBe(4200);
  });
  it('preserves explicitly chosen axis dimensions without inventing wall thickness',()=>{
    const points=rectangularRoomAxisPoints('4200','3200',null,origin,'axis');
    expect(points[0]).toEqual(origin);expect(points[2]).toEqual({xMm:'4300',yMm:'3400',zMm:'0'});
  });
  it('requires a real wall thickness for clear dimensions',()=>{
    for(const value of [null,'0','-1'])expect(()=>rectangularRoomAxisPoints('4200','3200',value,origin,'clear')).toThrow('Wandstärke');
  });
});
