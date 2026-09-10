// check-neon.ts — quick row counts against the Neon database (PostgreSQL client).
// Usage: DATABASE_URL="postgresql://..." bun scripts/check-neon.ts
// @ts-nocheck
const pgModule = require("/home/z/my-project/node_modules/.prisma-pg");
const db = new pgModule.PrismaClient({ datasourceUrl: process.env.DATABASE_URL, log: [] });

const count = async (name: string, table: () => Promise<number>) => {
  try { console.log(name.padEnd(24), await table()); }
  catch (e) { console.log(name.padEnd(24), "ERR", (e as Error).message.slice(0, 60)); }
};

const w = async () => {
  await count("OrgUnit", () => db.orgUnit.count());
  await count("SystemUser", () => db.systemUser.count());
  await count("PlatformSetting", () => db.platformSetting.count());
  await count("PenaltyParameter", () => db.penaltyParameter.count());
  await count("LocalizationResource", () => db.localizationResource.count().catch(() => -1));
  await count("Party", () => db.party.count());
  await count("Property", () => db.property.count());
  await count("RegistryBookEntry", () => db.registryBookEntry.count().catch(() => -1));
  await count("LegacyBookEntry", () => db.legacyBookEntry.count().catch(() => -1));
  await count("GoLiveWave", () => db.goLiveWave.count().catch(() => -1));
  await count("HypercareReport", () => db.hypercareReport.count().catch(() => -1));
  await count("AuditEvent", () => db.auditEvent.count().catch(() => -1));
  await count("ClosureMinute", () => db.closureMinute.count().catch(() => -1));
  const cm = await db.closureMinute.findFirst();
  console.log("closure minute:", cm?.reference, cm?.status, cm?.g9Ref ?? "-");
  await db.$disconnect();
};
w();
