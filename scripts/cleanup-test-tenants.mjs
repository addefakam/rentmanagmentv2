import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const codes = await db.cityConfig.findMany({ where: { cityCode: { startsWith: "TSV" } } });
for (const c of codes) {
  const units = await db.orgUnit.findMany({ where: { code: { startsWith: c.cityCode } } });
  const unitIds = units.map(u => u.id);
  await db.serviceDefinition.deleteMany({ where: { cityCode: c.cityCode } });
  await db.systemUser.deleteMany({ where: { orgUnitId: { in: unitIds } } });
  const contracts = await db.modelContract.findMany({ where: { cityCode: c.cityCode }, select: { id: true } });
  await db.modelContractSection.deleteMany({ where: { contractId: { in: contracts.map(x => x.id) } } });
  await db.modelContract.deleteMany({ where: { cityCode: c.cityCode } });
  await db.cityConfig.delete({ where: { cityCode: c.cityCode } });
  await db.orgUnit.deleteMany({ where: { id: { in: unitIds } } });
  console.log(`removed test tenant ${c.cityCode} (${unitIds.length} units)`);
}
if (!codes.length) console.log("no test tenants left");
await db.$disconnect();
