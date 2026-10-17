import {describe,it,expect} from 'vitest';
import {deliveryLinePayload,deliveryLineProblem} from './delivery-lines.ts';
describe('delivery quantity records',()=>{
  it('retains provenance and German decimal quantities without commercial values',()=>{
    const [line]=deliveryLinePayload([{id:'existing-line',client_key:'local-only',description:' Fensterbank ',quantity:'2,5',unit:'m',movement_kind:'return',order_line_id:'order-line',stock_item_id:'stock-item',lot_number:' Block A ',notes:' geprüft ',unit_price:'120',tax_rate:'19',cost_unit:'70',price_version_id:'price'}]);
    expect(line).toEqual({id:'existing-line',description:'Fensterbank',quantity:'2.5',unit:'m',movement_kind:'return',order_line_id:'order-line',stock_item_id:'stock-item',lot_number:'Block A',notes:'geprüft'});
  });
  it('requires a positive concrete amount for deliveries, returns and shortages',()=>{
    for(const quantity of ['','0','-1','1.2.3','1,2,3','Infinity'])expect(deliveryLineProblem([{description:'Prüfposition',quantity,unit:'piece',movement_kind:'delivery'}])).toContain('größer als null');
    for(const movement_kind of ['delivery','return','missing'])expect(deliveryLineProblem([{description:'Prüfposition',quantity:'0,5',unit:'m2',movement_kind}])).toBe('');
    expect(deliveryLineProblem([])).toContain('mindestens eine');
  });
});
