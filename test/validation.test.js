const test = require('node:test');
const assert = require('node:assert/strict');
const { validateReportInput } = require('../src/validation');

test('validateReportInput requires decrease fields when employee count decreases', () => {
  const err = validateReportInput({
    periodKey: '2026-03-H1',
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
    periodKey: '2026-03-H2',
    initialEmployees: 100,
    currentEmployees: 90,
    decreaseType: 'layoff',
    mainReason: 'market',
    mainReasonDesc: '订单减少'
  });
  assert.equal(err, null);
});

test('validateReportInput rejects monthly key in Jan-Mar', () => {
  const err = validateReportInput({
    periodKey: '2026-02',
    initialEmployees: 100,
    currentEmployees: 100
  });
  assert.equal(err, '1-3月必须按半月报填写调查期，例如 2026-01-H1 或 2026-01-H2');
});

test('validateReportInput rejects semi-monthly key in Apr-Dec', () => {
  const err = validateReportInput({
    periodKey: '2026-04-H1',
    initialEmployees: 100,
    currentEmployees: 100
  });
  assert.equal(err, '4-12月必须按整月报填写调查期，例如 2026-04');
});

test('validateReportInput accepts monthly key in Apr-Dec', () => {
  const err = validateReportInput({
    periodKey: '2026-11',
    initialEmployees: 100,
    currentEmployees: 100
  });
  assert.equal(err, null);
});
