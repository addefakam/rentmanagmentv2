import { PrismaClient } from "@prisma/client";
import { g9Check, hypercareSummary, operationsSummary } from "../../src/lib/domain/operations";

const prisma = new PrismaClient();
const w = async () => {
  const waves = await prisma.goLiveWave.findMany({ orderBy: { plannedOrder: "asc" } });
  for (const x of waves) console.log(`${x.code}: ${x.status} order=${x.goLiveOrderRef ?? "-"}`);
  const hs = await hypercareSummary("WAVE-1");
  console.log(`hypercare: ${hs.daysLogged}/${hs.daysPlanned} tickets=${hs.ticketsOpened}/${hs.ticketsClosed} sev1=${hs.sev1} sev2=${hs.sev2} sev3=${hs.sev3} sev4=${hs.sev4} sla=${hs.slaPct}%`);
  const s = await operationsSummary();
  console.log("cycle:", s.annualCycle.map((c) => `${c.cycleYear}/${c.step}`).join(", "));
  console.log("referrals:", s.referrals.map((r) => `${r.reference}:${r.status}${r.recovered ? `/rec=${r.recovered}` : ""}`).join("  "));
  console.log("feeds:", s.feeds.map((f) => `${f.period}(${f.itemCount})`).join(", "));
  console.log("handover:", s.handover?.reference, s.handover?.manualVersion, s.handover?.status);
  console.log("pir:", s.pir?.reference, "findings:", s.pir?.findings.length, "dispositions:", s.pir?.findings.map((f) => f.disposition).join(","));
  console.log("minute:", s.minute?.reference, s.minute?.status, "lessons:", JSON.parse(s.minute?.lessonsJson ?? "[]").length);
  const g9 = await g9Check();
  console.log("G9 READY:", g9.ready);
  for (const c of g9.checks) console.log(`  [${c.pass ? "PASS" : "FAIL"}] ${c.criterion}`);
  const adj = await prisma.rentAdjustment.findUnique({ where: { year: 2026 } });
  console.log("adjustment 2026:", adj?.status, "pub:", adj?.publishedAt?.toISOString().slice(0, 10), "eff:", adj?.effectiveAt?.toISOString().slice(0, 10), "pct:", adj?.percentage);
  await prisma.$disconnect();
};
w();
