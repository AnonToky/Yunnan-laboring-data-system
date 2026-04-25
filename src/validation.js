function validateReportInput(payload) {
  const initialEmployees = Number(payload.initialEmployees);
  const currentEmployees = Number(payload.currentEmployees);

  if (!payload.periodKey) {
    return '调查期不能为空';
  }

  const periodRuleError = validatePeriodKey(payload.periodKey);
  if (periodRuleError) {
    return periodRuleError;
  }

  if (!Number.isInteger(initialEmployees) || initialEmployees < 0) {
    return '建档期就业人数必须为非负整数';
  }
  if (!Number.isInteger(currentEmployees) || currentEmployees < 0) {
    return '调查期就业人数必须为非负整数';
  }
  if (currentEmployees < initialEmployees) {
    if (!payload.decreaseType || !payload.mainReason || !payload.mainReasonDesc) {
      return '当调查期就业人数少于建档期时，减少类型、主要原因、主要原因说明为必填';
    }
  }
  return null;
}

function validatePeriodKey(periodKey) {
  const monthlyMatch = periodKey.match(/^(\d{4})-(0[1-9]|1[0-2])$/);
  const semiMonthlyMatch = periodKey.match(/^(\d{4})-(0[1-9]|1[0-2])-(H1|H2)$/);

  if (!monthlyMatch && !semiMonthlyMatch) {
    return '调查期格式不正确。1-3月使用 YYYY-MM-H1/H2，4-12月使用 YYYY-MM';
  }

  const month = Number((monthlyMatch || semiMonthlyMatch)[2]);
  const isQ1 = month >= 1 && month <= 3;

  if (isQ1 && !semiMonthlyMatch) {
    return '1-3月必须按半月报填写调查期，例如 2026-01-H1 或 2026-01-H2';
  }

  if (!isQ1 && !monthlyMatch) {
    return '4-12月必须按整月报填写调查期，例如 2026-04';
  }

  return null;
}

module.exports = {
  validateReportInput
};
