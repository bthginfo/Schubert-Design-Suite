import {describe,expect,it} from 'vitest';
import {materialForecast,liquidityForecast,capacityRows,orderCostRow} from './report-calculations';

const requirement=(id:string,order:string,on:string,amount:string)=>({id,order_id:order,product_id:'stone',product_name:'Synthetischer Stein',unit:'m2',required_on:on,quantity:amount});
const materials={from:'2026-10-01',to:'2026-10-31',asOf:'2026-10-17',reservations:[],consumption:[],supplies:[]};
const liquidity={from:'2026-10-17',to:'2026-10-31',asOf:'2026-10-17',currency:'EUR',accounts:[{id:'bank',holder:'QA'}],openings:[{bank_account_id:'bank',as_of:'2026-10-01',amount:'1000',currency:'EUR'}],payments:[],openItems:[]};

describe('one-time material coverage',()=>{
 it('combines simultaneous demand and cannot credit the same stock to both orders',()=>{
  const rows=materialForecast({...materials,requirements:[requirement('a','one','2026-10-20','8'),requirement('b','two','2026-10-20','8')],stocks:[{product_id:'stone',unit:'m2',quantity:'10',reserved_quantity:'0'}]});
  expect(rows).toHaveLength(1);expect(rows[0]).toMatchObject({required_quantity:'16',expected_stock:'10',shortage:'6',order_ids:['one','two']});
 });
 it('spends free stock and each confirmed supply lot once across later dates',()=>{
  const rows=materialForecast({...materials,requirements:[requirement('a','one','2026-10-20','7'),requirement('b','two','2026-10-25','7')],stocks:[{product_id:'stone',unit:'m2',quantity:'5',reserved_quantity:'0'}],supplies:[{id:'supply',product_id:'stone',unit:'m2',quantity:'4',delivery_date:'2026-10-19',confirmed:true}]});
  expect(rows[0]).toMatchObject({expected_stock:'5',confirmed_supply:'2',shortage:'0'});expect(rows[1]).toMatchObject({expected_stock:'0',confirmed_supply:'2',shortage:'5',cumulative_required_quantity:'14'});
 });
 it('uses an order-specific delivery before common stock needed by another order',()=>{
  const rows=materialForecast({...materials,requirements:[requirement('a','one','2026-10-20','8'),requirement('b','two','2026-10-20','6')],stocks:[{product_id:'stone',unit:'m2',quantity:'6',reserved_quantity:'0'}],supplies:[{id:'own',order_id:'one',product_id:'stone',unit:'m2',quantity:'8',delivery_date:'2026-10-19',confirmed:true}]});
  expect(rows[0]).toMatchObject({expected_stock:'6',confirmed_supply:'8',shortage:'0'});
 });
 it('does not count an unknown or late supplier promise and does not reuse consumed quantities',()=>{
  const rows=materialForecast({...materials,requirements:[requirement('a','one','2026-10-20','8')],stocks:[],consumption:[{order_id:'one',product_id:'stone',unit:'m2',consumed_quantity:'3'}],supplies:[{id:'unknown',product_id:'stone',unit:'m2',quantity:'9',delivery_date:null,confirmed:false}]});
  expect(rows[0]).toMatchObject({required_quantity:'8',outstanding_quantity:'5',consumed_quantity:'3',confirmed_supply:'0',shortage:'5'});expect(rows[0].issues).toHaveLength(1);
 });
});

describe('evidence-bound liquidity scenarios',()=>{
 it('uses actual assigned bank movements and only actual contractual future dates',()=>{
  const rows=liquidityForecast({...liquidity,payments:[{bank_account_id:'bank',booking_date:'2026-10-10',currency:'EUR',direction:'outgoing',amount:'200'}],openItems:[{id:'invoice',kind:'receivable',currency:'EUR',open_amount:'300',due_date:'2026-10-20',disputed:false}]});
  expect(rows.find(row=>row.date==='2026-10-20'&&row.scenario==='due_dates')).toMatchObject({opening_balance:'800.00',expected_inflows:'300.00',expected_balance:'1100.00'});
  expect(rows.find(row=>row.date==='2026-10-20'&&row.scenario==='no_unconfirmed_receipts')).toMatchObject({expected_inflows:'0.00',expected_balance:'800.00'});
 });
 it('keeps the balance unknown without a verified opening and never shifts overdue or credit dates',()=>{
  const rows=liquidityForecast({...liquidity,openings:[],openItems:[{id:'late',kind:'receivable',currency:'EUR',open_amount:'300',due_date:'2026-10-01'},{id:'credit',kind:'receivable',currency:'EUR',open_amount:'-500',due_date:'2026-10-22'}]});
  expect(rows.every(row=>row.expected_balance===null&&row.expected_inflows==='0.00'&&row.expected_outflows==='0.00')).toBe(true);expect(rows[0].excluded_count).toBe(2);expect(rows.some(row=>row.date==='2026-10-22')).toBe(false);
 });
 it('counts different versions of the same physical bank account only once',()=>{
  const rows=liquidityForecast({...liquidity,accounts:[{id:'new',bank_account_ids:['bank','new'],holder:'QA'}],payments:[{bank_account_id:'new',booking_date:'2026-10-11',currency:'EUR',direction:'incoming',amount:'100'}]});
  expect(rows[0].opening_balance).toBe('1100.00');
 });
 it('does not silently allocate the company bank balance to one business unit',()=>{
  expect(liquidityForecast({...liquidity,businessUnit:'stone'}).every(row=>row.opening_balance===null)).toBe(true);
 });
});

describe('remaining evidence gaps',()=>{
 it('preserves confirmed contract hours while a missing absence basis leaves availability unknown',()=>{
  expect(capacityRows([{team_name:'QA',week_start:'2026-10-19',contract_hours:'8',available_hours:null,planned_hours:'4'}])[0]).toMatchObject({contract_hours:'8.00',available_hours:null,planned_hours:'4.00'});
 });
 it('does not replace a missing confirmed contract amount by the current mutable order budget',()=>{
  expect(orderCostRow({id:'order',budget_net:'1000',confirmed_net:null,agreed_at:null,estimate_id:'estimate',uncommitted_remaining_amount:'100',planned_lines:0,planned_unknown:0,material_unknown:0,labor_unknown:0,allocation_unknown:0,committed_unknown:0}).expected_contribution).toBeNull();
 });
});
