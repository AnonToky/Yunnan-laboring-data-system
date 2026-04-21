require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  await prisma.reportAuditLog.deleteMany();
  await prisma.report.deleteMany();
  await prisma.notice.deleteMany();
  await prisma.user.deleteMany();
  await prisma.surveyPeriod.deleteMany();
  await prisma.dictionary.deleteMany();
  await prisma.enterprise.deleteMany();

  const dictionaries = [
    { type: 'enterprise_type', code: 'private', value: '民营企业', sortNo: 1 },
    { type: 'enterprise_type', code: 'state', value: '国有企业', sortNo: 2 },
    { type: 'industry', code: 'manufacture', value: '制造业', sortNo: 1 },
    { type: 'industry', code: 'service', value: '服务业', sortNo: 2 },
    { type: 'decrease_type', code: 'layoff', value: '裁员', sortNo: 1 },
    { type: 'decrease_type', code: 'attrition', value: '自然减员', sortNo: 2 },
    { type: 'decrease_reason', code: 'market', value: '市场订单减少', sortNo: 1 },
    { type: 'decrease_reason', code: 'tech', value: '技术升级替代', sortNo: 2 },
    { type: 'decrease_reason', code: 'management', value: '经营调整', sortNo: 3 }
  ];
  await prisma.dictionary.createMany({ data: dictionaries });

  await prisma.surveyPeriod.createMany({
    data: [
      {
        periodKey: '2026-03',
        startAt: new Date('2026-03-01T00:00:00Z'),
        endAt: new Date('2026-03-31T23:59:59Z'),
        submitDeadline: new Date('2026-04-15T23:59:59Z')
      },
      {
        periodKey: '2026-04',
        startAt: new Date('2026-04-01T00:00:00Z'),
        endAt: new Date('2026-04-30T23:59:59Z'),
        submitDeadline: new Date('2026-05-15T23:59:59Z')
      }
    ]
  });

  const enterprises = await prisma.$transaction([
    prisma.enterprise.create({
      data: {
        regionCode: '530100',
        orgCode: 'YN530100001',
        name: '昆明春和制造有限公司',
        type: 'private',
        industry: 'manufacture',
        business: '机械零部件生产',
        contactPerson: '张三',
        address: '昆明市盘龙区示范路1号',
        postalCode: '650000',
        phone: '0871-1111111',
        fax: '0871-1111112',
        email: 'km1@example.com',
        filingStatus: 'approved'
      }
    }),
    prisma.enterprise.create({
      data: {
        regionCode: '530300',
        orgCode: 'YN530300001',
        name: '曲靖惠民服务有限公司',
        type: 'private',
        industry: 'service',
        business: '人力服务',
        contactPerson: '李四',
        address: '曲靖市麒麟区示范路2号',
        postalCode: '655000',
        phone: '0874-2222222',
        fax: '0874-2222223',
        email: 'qj1@example.com',
        filingStatus: 'draft'
      }
    }),
    prisma.enterprise.create({
      data: {
        regionCode: '530100',
        orgCode: 'YN530100002',
        name: '昆明云工科技有限公司',
        type: 'state',
        industry: 'service',
        business: '软件外包服务',
        contactPerson: '王五',
        address: '昆明市五华区示范路3号',
        postalCode: '650000',
        phone: '0871-3333333',
        fax: '0871-3333334',
        email: 'km2@example.com',
        filingStatus: 'draft'
      }
    })
  ]);

  const passwordHash = await bcrypt.hash('123456', 10);
  await prisma.user.createMany({
    data: [
      { username: 'province_admin', passwordHash, role: 'province', regionCode: '530000' },
      { username: 'city_km', passwordHash, role: 'city', regionCode: '530100' },
      { username: 'city_qj', passwordHash, role: 'city', regionCode: '530300' },
      { username: 'ent_km_1', passwordHash, role: 'enterprise', regionCode: '530100', enterpriseId: enterprises[0].id },
      { username: 'ent_qj_1', passwordHash, role: 'enterprise', regionCode: '530300', enterpriseId: enterprises[1].id },
      { username: 'ent_km_2', passwordHash, role: 'enterprise', regionCode: '530100', enterpriseId: enterprises[2].id }
    ]
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('Seed completed. Default password for all accounts: 123456');
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
