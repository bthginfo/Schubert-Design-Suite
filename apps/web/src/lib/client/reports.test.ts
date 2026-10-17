import {describe,expect,it} from 'vitest';
import {metricDrilldown,reportMonthDrilldown,reportMetricValue,reportMoney,reportNumber,reportQuantity} from './reports';

describe('controlling values keep their evidence and units',()=>{
  it('does not turn a missing cost basis into a zero cost',()=>{
    expect(reportNumber(null)).toBeNull();
    expect(reportNumber('')).toBeNull();
    expect(reportMoney(undefined,'EUR')).toBe('Noch nicht bestätigt');
    expect(reportQuantity(null,'Std.')).toBe('Noch nicht bestätigt');
    expect(reportNumber('0')).toBe(0);
    expect(reportMoney('0','EUR')).toContain('0,00');
  });
  it('keeps credit balances negative and foreign currency explicit',()=>{
    expect(reportMoney('-500.00','EUR')).toContain('-500,00');
    expect(reportMoney('1190.00','USD')).toContain('$');
    expect(reportMoney('1190.00',undefined)).toContain('Währung offen');
    expect(reportMoney('1190.00',undefined)).not.toContain('€');
  });
  it('preserves a confirmed zero in both legacy and explicit metric payloads',()=>{
    expect(reportMetricValue({ordered_net:'0',orderedNet:'90'},'ordered_net','orderedNet')).toBe('0');
    expect(reportMetricValue({ordered_net:{value:'0',currency:'EUR'}},'ordered_net')).toBe('0');
    expect(reportMetricValue({ordered_net:{currency:'EUR'}},'ordered_net')).toBeNull();
  });
  it('retains the exact selected aging group and report filters in a drilldown',()=>{
    const url=new URL(metricDrilldown('/receivables?bucket=over_60','2026-10-01','2026-10-31','stone'),'https://qa.invalid');
    expect(Object.fromEntries(url.searchParams)).toEqual({bucket:'over_60',from:'2026-10-01',to:'2026-10-31',business_unit:'stone'});
  });
  it('does not expand a partial-month source drilldown beyond the reported dates or currency',()=>{
    const url=new URL(reportMonthDrilldown('/payments?direction=in','2026-10','2026-10-06','2026-10-17','stone','USD'),'https://qa.invalid');
    expect(Object.fromEntries(url.searchParams)).toEqual({direction:'in',from:'2026-10-06',to:'2026-10-17',business_unit:'stone',currency:'USD'});
    const february=new URL(reportMonthDrilldown('/orders','2028-02','2028-01-10','2028-03-04'),'https://qa.invalid');
    expect(february.searchParams.get('from')).toBe('2028-02-01');
    expect(february.searchParams.get('to')).toBe('2028-02-29');
  });
});
