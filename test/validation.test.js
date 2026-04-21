const test = require('node:test');
const assert = require('node:assert/strict');
const { validateReportInput } = require('../src/validation');

test('validateReportInput requires decrease fields when employee count decreases', () => {
  const err = validateReportInput({
    periodKey: '2026-03',
    initialEmployees: 100,
    currentEmployees: 90,
    decreaseType: '',
    mainReason: '',
    mainReasonDesc: ''
  });
  assert.ok(err);
});

test('validateReportInput accepts complete decreasing payload', () => {
  const err = validateReportInput({
    periodKey: '2026-03',
    initialEmployees: 100,
    currentEmployees: 90,
    decreaseType: 'layoff',
    mainReason: 'market',
    mainReasonDesc: '订单减少'
  });
  assert.equal(err, null);
});
