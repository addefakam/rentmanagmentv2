import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const [books, migrated, recon, reconBalanced, courses, trainees, pilot, days, awareness, legacyFiles, replications] = await Promise.all([
  p.legacyBookEntry.count(), p.migrationRecord.count(), p.reconciliationReport.count(),
  p.reconciliationReport.count({ where: { balanced: true } }),
  p.trainingCourse.count(), p.traineeRecord.count(), p.pilotConfig.count({ where: { active: true } }),
  p.pilotDayLog.count(), p.awarenessItem.count(),
  p.registrationFile.count({ where: { isLegacy: true, status: "REGISTERED" } }),
  p.replicationLog.count(),
]);
console.log({ books, migrated, recon, reconBalanced, courses, trainees, pilot, days, awareness, legacyFiles, replications });
const annotations = await p.fileAnnotation.count({ where: { code: "LEGACY_ART7" } });
const legacyClocks = await p.deadlineTrack.count({ where: { code: "LEGACY-33D", status: "MET" } });
console.log({ annotations, legacyClocks });
const exit = await p.traineeRecord.findMany({ where: { competence: "COMPETENT" }, select: { roleCode: true }, distinct: ["roleCode"] });
console.log("competent roles:", exit.map((e) => e.roleCode).sort().join(","));
await p.$disconnect();
