import {expect, it} from 'vitest';
import {assertPermission, rolePermissions} from '@schubert/domain';

it.each(['Office', 'Employee'])('%s can create draft plans without gaining manufacturing or financial release', role => {
  const permissions = rolePermissions[role];
  expect(() => assertPermission(permissions, 'planning')).not.toThrow();
  expect(() => assertPermission(permissions, 'documents.upload')).not.toThrow();
  for (const capability of ['planning.release', 'billing.invoice.issue', 'finance.bank.manage', 'admin']) {
    expect(() => assertPermission(permissions, capability)).toThrow();
  }
});
