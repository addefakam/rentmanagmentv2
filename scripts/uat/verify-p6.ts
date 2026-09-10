// Phase 6 verification: legal session walkthrough + defect log from the recorded UAT run.
import { readFileSync } from "fs";
import { buildLegalSession } from "../../src/lib/uat/legal-session";
import { buildDefectLog } from "../../src/lib/uat/defects";

const uat = JSON.parse(readFileSync("src/lib/uat/results.json", "utf-8"));
const session = buildLegalSession(uat);
console.log("=== LEGAL SESSION ===");
console.log("counts:", JSON.stringify(session.counts));
const byVerdict: Record<string, number> = {};
for (const r of session.walkthrough) byVerdict[r.verdict] = (byVerdict[r.verdict] ?? 0) + 1;
console.log("verdicts:", JSON.stringify(byVerdict));
const devs = session.walkthrough.filter((r) => r.verdict === "DEVIATION");
for (const d of devs) console.log("DEVIATION:", d.id, d.note);
console.log("incomplete rows:", session.walkthrough.filter((r) => r.testStatus !== "PASS").map((r) => `${r.id}:${r.testStatus}`).join(", ") || "none");
console.log("conclusion:", session.conclusion.slice(0, 120));
console.log("memorandum ref:", session.memorandum.reference, "| pending:", session.pendingConfirmations.map((p) => p.id).join("/"));

const { log, openSev12 } = buildDefectLog(uat);
console.log("=== DEFECT LOG ===");
for (const d of log) console.log(d.id, d.severity, d.status, "-", d.title.slice(0, 80));
console.log("openSev12:", openSev12);
if (devs.length > 0 || openSev12 > 0) { console.log("G6 BLOCKERS PRESENT"); process.exit(1); }
console.log("G6: NO UNRESOLVED DEVIATION / NO OPEN SEV-1/2 -> gate can close");
