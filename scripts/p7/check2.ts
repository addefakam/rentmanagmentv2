import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const logs = await p.replicationLog.findMany({ take: 200 });
const byType: Record<string, number> = {};
for (const l of logs) byType[l.recordType] = (byType[l.recordType] ?? 0) + 1;
console.log("total:", logs.length, "byType:", byType);
console.log("sample:", logs.slice(0, 3).map((l) => `${l.batchRef} | ${l.recordType} | ${l.recordRef} | ${l.status}`));
await p.$disconnect();
