// check-p8-state.ts — quick state verification after seeding
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
async function main() {
  const [books, migrated, awareness, waves, items, drills, o7, freeze, sessions, roster, hc] = await Promise.all([
    db.legacyBookEntry.count(), db.migrationRecord.count(), db.awarenessItem.count(),
    db.goLiveWave.findMany({ orderBy: { plannedOrder: "asc" } }),
    db.cutoverItem.groupBy({ by: ["status"], where: { waveCode: "WAVE-1" }, _count: true }),
    db.drillRun.groupBy({ by: ["kind", "result"], _count: true }),
    db.o7Confirmation.count(),
    db.configFreeze.count(),
    db.productionSession.count(),
    db.supportRosterEntry.count(),
    db.hypercarePlan.count(),
  ]);
  console.log("books", books, "| migrated", migrated, "| awareness", awareness, "| o7", o7, "| freeze", freeze, "| sessions", sessions, "| roster", roster, "| hypercare", hc);
  for (const w of waves) console.log(w.code, w.status, w.goLiveOrderRef ?? "-");
  console.log("cutover:", JSON.stringify(items));
  console.log("drills:", JSON.stringify(drills));
}
main().then(() => db.$disconnect()).catch((e) => { console.error(e); process.exit(1); });
