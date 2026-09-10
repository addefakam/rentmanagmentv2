import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const rows = await p.replicationLog.findMany({ take: 6, orderBy: { id: "asc" } });
for (const r of rows) console.log(JSON.stringify(r));
await p.$disconnect();
