function validateReportInput(payload) {
  const initialEmployees = Number(payload.initialEmployees);
  const currentEmployees = Number(payload.currentEmployees);

  if (!payload.periodKey) {
    return '调查期不能为空';
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

module.exports = {
  validateReportInput
};
