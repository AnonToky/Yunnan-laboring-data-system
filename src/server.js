require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { validateReportInput } = require('./validation');

const app = express();
const prisma = new PrismaClient();

const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/static', express.static(path.join(__dirname, 'public')));
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'demo-session-secret',
    resave: false,
    saveUninitialized: false
  })
);

function ok(data = null, message = 'success') {
  return { code: 0, message, data };
}

function fail(message, code = 1) {
  return { code, message, data: null };
}

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json(fail('未登录'));
  }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session.user || !roles.includes(req.session.user.role)) {
      return res.status(403).json(fail('无权限'));
    }
    next();
  };
}

function normalizeReportPayload(body) {
  return {
    periodKey: body.periodKey,
    initialEmployees: Number(body.initialEmployees),
    currentEmployees: Number(body.currentEmployees),
    otherReason: body.otherReason || null,
    decreaseType: body.decreaseType || null,
    mainReason: body.mainReason || null,
    mainReasonDesc: body.mainReasonDesc || null,
    secondReason: body.secondReason || null,
    secondReasonDesc: body.secondReasonDesc || null,
    thirdReason: body.thirdReason || null,
    thirdReasonDesc: body.thirdReasonDesc || null
  };
}

app.get('/', (req, res) => {
  if (!req.session.user) {
    return res.render('login');
  }
  return res.redirect('/dashboard');
});

app.get('/dashboard', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/');
  }
  return res.render('dashboard', { user: req.session.user });
});

app.post('/api/auth/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.json(fail('用户名和密码不能为空'));
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    return res.json(fail('用户名或密码错误'));
  }

  const pass = await bcrypt.compare(password, user.passwordHash);
  if (!pass) {
    return res.json(fail('用户名或密码错误'));
  }

  req.session.user = {
    id: user.id,
    username: user.username,
    role: user.role,
    regionCode: user.regionCode,
    enterpriseId: user.enterpriseId
  };
  res.json(ok(req.session.user, '登录成功'));
}));

app.post('/api/auth/logout', requireLogin, (req, res) => {
  req.session.destroy(() => res.json(ok(null, '已退出登录')));
});

app.get('/api/me', requireLogin, asyncHandler(async (req, res) => {
  const data = { ...req.session.user };
  if (data.enterpriseId) {
    data.enterprise = await prisma.enterprise.findUnique({ where: { id: data.enterpriseId } });
  }
  res.json(ok(data));
}));

app.get('/api/dictionaries', requireLogin, asyncHandler(async (req, res) => {
  const list = await prisma.dictionary.findMany({ orderBy: [{ type: 'asc' }, { sortNo: 'asc' }] });
  res.json(ok(list));
}));

app.get('/api/periods', requireLogin, asyncHandler(async (req, res) => {
  const list = await prisma.surveyPeriod.findMany({ orderBy: { periodKey: 'desc' } });
  res.json(ok(list));
}));

app.get('/api/enterprise/profile', requireLogin, requireRole('enterprise'), asyncHandler(async (req, res) => {
  const enterprise = await prisma.enterprise.findUnique({ where: { id: req.session.user.enterpriseId } });
  res.json(ok(enterprise));
}));

app.post('/api/enterprise/profile/save', requireLogin, requireRole('enterprise'), asyncHandler(async (req, res) => {
  const id = req.session.user.enterpriseId;
  const payload = {
    orgCode: req.body.orgCode,
    name: req.body.name,
    type: req.body.type,
    industry: req.body.industry,
    business: req.body.business,
    contactPerson: req.body.contactPerson,
    address: req.body.address,
    postalCode: req.body.postalCode,
    phone: req.body.phone,
    fax: req.body.fax,
    email: req.body.email || null,
    filingStatus: 'draft'
  };

  const requiredFields = ['orgCode', 'name', 'type', 'industry', 'business', 'contactPerson', 'address', 'postalCode', 'phone', 'fax'];
  for (const field of requiredFields) {
    if (!payload[field]) {
      return res.json(fail(`字段 ${field} 不能为空`));
    }
  }

  const updated = await prisma.enterprise.update({ where: { id }, data: payload });
  res.json(ok(updated, '备案草稿已保存'));
}));

app.post('/api/enterprise/profile/submit', requireLogin, requireRole('enterprise'), asyncHandler(async (req, res) => {
  const id = req.session.user.enterpriseId;
  const enterprise = await prisma.enterprise.findUnique({ where: { id } });
  if (!enterprise.orgCode || !enterprise.name || !enterprise.type || !enterprise.industry || !enterprise.business || !enterprise.contactPerson || !enterprise.address || !enterprise.postalCode || !enterprise.phone || !enterprise.fax) {
    return res.json(fail('备案信息不完整，无法提交'));
  }
  const updated = await prisma.enterprise.update({
    where: { id },
    data: {
      filingStatus: 'pending_province',
      provinceAuditComment: null,
      provinceAuditAt: null,
      provinceAuditorId: null
    }
  });
  res.json(ok(updated, '备案已提交省级审核'));
}));

app.get('/api/province/filings', requireLogin, requireRole('province'), asyncHandler(async (req, res) => {
  const list = await prisma.enterprise.findMany({
    where: { filingStatus: { in: ['pending_province', 'approved', 'rejected'] } },
    orderBy: { updatedAt: 'desc' }
  });
  res.json(ok(list));
}));

app.post('/api/province/filings/:id/review', requireLogin, requireRole('province'), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { action, comment } = req.body;
  if (!['approve', 'reject'].includes(action)) {
    return res.json(fail('操作不支持'));
  }
  if (action === 'reject' && !comment) {
    return res.json(fail('退回必须填写原因'));
  }
  const data = {
    filingStatus: action === 'approve' ? 'approved' : 'rejected',
    provinceAuditComment: comment || null,
    provinceAuditAt: new Date(),
    provinceAuditorId: req.session.user.id
  };
  const updated = await prisma.enterprise.update({ where: { id }, data });
  res.json(ok(updated, '备案审核完成'));
}));

app.get('/api/enterprise/reports', requireLogin, requireRole('enterprise'), asyncHandler(async (req, res) => {
  const periodKey = req.query.periodKey;
  const list = await prisma.report.findMany({
    where: {
      enterpriseId: req.session.user.enterpriseId,
      ...(periodKey ? { periodKey } : {})
    },
    orderBy: { periodKey: 'desc' }
  });
  res.json(ok(list));
}));

app.post('/api/enterprise/reports/save', requireLogin, requireRole('enterprise'), asyncHandler(async (req, res) => {
  const enterpriseId = req.session.user.enterpriseId;
  const enterprise = await prisma.enterprise.findUnique({ where: { id: enterpriseId } });
  if (enterprise.filingStatus !== 'approved') {
    return res.json(fail('备案审核通过后方可填报'));
  }

  const validationError = validateReportInput(req.body);
  if (validationError) {
    return res.json(fail(validationError));
  }

  const payload = normalizeReportPayload(req.body);
  const exists = await prisma.report.findUnique({
    where: {
      enterpriseId_periodKey: {
        enterpriseId,
        periodKey: payload.periodKey
      }
    }
  });

  let report;
  if (exists) {
    if (!['draft', 'city_rejected', 'province_rejected'].includes(exists.status)) {
      return res.json(fail('当前状态不允许修改'));
    }
    report = await prisma.report.update({
      where: { id: exists.id },
      data: {
        ...payload,
        status: 'draft'
      }
    });
  } else {
    report = await prisma.report.create({
      data: {
        ...payload,
        enterpriseId,
        status: 'draft'
      }
    });
  }
  res.json(ok(report, '填报草稿已保存'));
}));

app.post('/api/enterprise/reports/submit', requireLogin, requireRole('enterprise'), asyncHandler(async (req, res) => {
  const { periodKey } = req.body;
  if (!periodKey) {
    return res.json(fail('调查期不能为空'));
  }
  const report = await prisma.report.findUnique({
    where: {
      enterpriseId_periodKey: {
        enterpriseId: req.session.user.enterpriseId,
        periodKey
      }
    }
  });
  if (!report) {
    return res.json(fail('请先保存草稿'));
  }
  if (!['draft', 'city_rejected', 'province_rejected'].includes(report.status)) {
    return res.json(fail('当前状态不允许提交'));
  }

  const updated = await prisma.report.update({
    where: { id: report.id },
    data: {
      status: 'pending_city',
      submitTime: new Date(),
      cityAuditComment: null,
      cityAuditAt: null,
      cityAuditorId: null,
      provinceAuditComment: null,
      provinceAuditAt: null,
      provinceAuditorId: null,
      reportedAt: null
    }
  });
  res.json(ok(updated, '已提交市级审核'));
}));

app.get('/api/city/reports', requireLogin, requireRole('city'), asyncHandler(async (req, res) => {
  const { enterpriseName, periodKey } = req.query;
  const list = await prisma.report.findMany({
    where: {
      status: 'pending_city',
      enterprise: {
        regionCode: req.session.user.regionCode,
        ...(enterpriseName ? { name: { contains: enterpriseName } } : {})
      },
      ...(periodKey ? { periodKey } : {})
    },
    include: { enterprise: true },
    orderBy: { updatedAt: 'desc' }
  });
  res.json(ok(list));
}));

app.post('/api/city/reports/:id/review', requireLogin, requireRole('city'), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { action, comment } = req.body;
  if (!['approve', 'reject'].includes(action)) {
    return res.json(fail('操作不支持'));
  }
  if (action === 'reject' && !comment) {
    return res.json(fail('退回必须填写原因'));
  }

  const report = await prisma.report.findUnique({ where: { id }, include: { enterprise: true } });
  if (!report || report.enterprise.regionCode !== req.session.user.regionCode) {
    return res.status(404).json(fail('数据不存在'));
  }
  if (report.status !== 'pending_city') {
    return res.json(fail('当前状态不允许审核'));
  }

  const updated = await prisma.report.update({
    where: { id },
    data: {
      status: action === 'approve' ? 'pending_province' : 'city_rejected',
      cityAuditComment: comment || null,
      cityAuditAt: new Date(),
      cityAuditorId: req.session.user.id
    }
  });

  await prisma.reportAuditLog.create({
    data: {
      reportId: id,
      level: 'city',
      action,
      comment: comment || null,
      auditorId: req.session.user.id
    }
  });

  res.json(ok(updated, '市级审核完成'));
}));

app.get('/api/province/reports', requireLogin, requireRole('province'), asyncHandler(async (req, res) => {
  const { periodKey, regionCode, status } = req.query;
  const list = await prisma.report.findMany({
    where: {
      ...(periodKey ? { periodKey } : {}),
      ...(status ? { status } : {}),
      enterprise: {
        ...(regionCode ? { regionCode } : {})
      }
    },
    include: { enterprise: true },
    orderBy: { updatedAt: 'desc' }
  });
  res.json(ok(list));
}));

app.post('/api/province/reports/:id/review', requireLogin, requireRole('province'), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { action, comment } = req.body;
  if (!['approve', 'reject'].includes(action)) {
    return res.json(fail('操作不支持'));
  }
  if (action === 'reject' && !comment) {
    return res.json(fail('退回必须填写原因'));
  }

  const report = await prisma.report.findUnique({ where: { id } });
  if (!report) {
    return res.status(404).json(fail('数据不存在'));
  }
  if (report.status !== 'pending_province') {
    return res.json(fail('当前状态不允许审核'));
  }

  const updated = await prisma.report.update({
    where: { id },
    data: {
      status: action === 'approve' ? 'approved' : 'province_rejected',
      provinceAuditComment: comment || null,
      provinceAuditAt: new Date(),
      provinceAuditorId: req.session.user.id
    }
  });

  await prisma.reportAuditLog.create({
    data: {
      reportId: id,
      level: 'province',
      action,
      comment: comment || null,
      auditorId: req.session.user.id
    }
  });

  res.json(ok(updated, '省级审核完成'));
}));

app.post('/api/province/reports/:id/report', requireLogin, requireRole('province'), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const report = await prisma.report.findUnique({ where: { id } });
  if (!report) {
    return res.status(404).json(fail('数据不存在'));
  }
  if (report.status !== 'approved') {
    return res.json(fail('仅审核通过数据可上报'));
  }

  const updated = await prisma.report.update({
    where: { id },
    data: {
      status: 'reported',
      reportedAt: new Date()
    }
  });

  await prisma.reportAuditLog.create({
    data: {
      reportId: id,
      level: 'province',
      action: 'report',
      comment: '模拟上报部委',
      auditorId: req.session.user.id
    }
  });

  res.json(ok(updated, '已模拟上报部委'));
}));

app.get('/api/notices', requireLogin, asyncHandler(async (req, res) => {
  const user = req.session.user;
  let where = {};

  if (user.role === 'enterprise') {
    where = {
      OR: [
        { publisherRole: 'province', regionScope: 'all' },
        { publisherRole: 'city', regionScope: user.regionCode }
      ]
    };
  } else if (user.role === 'city') {
    where = {
      OR: [
        { publisherRole: 'province', regionScope: 'all' },
        { publisherRole: 'city', regionScope: user.regionCode }
      ]
    };
  } else if (user.role === 'province') {
    where = { publisherRole: 'province' };
  }

  const list = await prisma.notice.findMany({ where, orderBy: { createdAt: 'desc' } });
  res.json(ok(list));
}));

app.post('/api/notices', requireLogin, requireRole('city', 'province'), asyncHandler(async (req, res) => {
  const { title, content, publisherUnit } = req.body;
  if (!title || !content || !publisherUnit) {
    return res.json(fail('标题、内容、发布单位不能为空'));
  }
  if (title.length > 50) {
    return res.json(fail('标题长度不能超过50'));
  }
  if (content.length > 2000) {
    return res.json(fail('内容长度不能超过2000'));
  }

  const notice = await prisma.notice.create({
    data: {
      title,
      content,
      publisherUnit,
      publisherRole: req.session.user.role,
      regionScope: req.session.user.role === 'province' ? 'all' : req.session.user.regionCode
    }
  });
  res.json(ok(notice, '通知发布成功'));
}));

app.get('/api/audit-logs/:reportId', requireLogin, asyncHandler(async (req, res) => {
  const reportId = Number(req.params.reportId);
  const report = await prisma.report.findUnique({ where: { id: reportId }, include: { enterprise: true } });
  if (!report) {
    return res.status(404).json(fail('数据不存在'));
  }

  const user = req.session.user;
  if (user.role === 'enterprise' && report.enterpriseId !== user.enterpriseId) {
    return res.status(403).json(fail('无权限'));
  }
  if (user.role === 'city' && report.enterprise.regionCode !== user.regionCode) {
    return res.status(403).json(fail('无权限'));
  }

  const logs = await prisma.reportAuditLog.findMany({ where: { reportId }, orderBy: { createdAt: 'asc' } });
  res.json(ok(logs));
}));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json(fail('服务器内部错误'));
});

app.listen(PORT, () => {
  console.log(`MVP demo running on http://localhost:${PORT}`);
});
