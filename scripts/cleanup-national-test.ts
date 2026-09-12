// cleanup-national-test.ts — restore the local dev database after
// verify-super-user-console.sh runs its LOCAL mutation block:
//   1. Delete the propagated verification contract version AA-9.9 (+ sections)
//      and put the federal contract 1.0 back to ACTIVE.
//   2. Remove the test regulation entries (TEST-REG-*) from the national
//      register PlatformSetting.
// Local-only tooling — never run against production.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const test = await prisma.modelContract.findUnique({
    where: { version: "AA-9.9" }, include: { sections: true },
  });
  if (test) {
    await prisma.modelContractSection.deleteMany({ where: { contractId: test.id } });
    await prisma.modelContract.delete({ where: { id: test.id } });
    console.log(`removed test contract ${test.version}`);
  }
  const base = await prisma.modelContract.findUnique({ where: { version: "1.0" } });
  if (base && base.status !== "ACTIVE") {
    await prisma.modelContract.update({ where: { id: base.id }, data: { status: "ACTIVE" } });
    console.log("restored federal contract 1.0 to ACTIVE");
  }
  const row = await prisma.platformSetting.findUnique({ where: { key: "NATIONAL_REGULATIONS" } });
  if (row) {
    const regs = JSON.parse(row.value) as Array<{ code: string }>;
    const kept = regs.filter((r) => !r.code.startsWith("TEST-REG-"));
    if (kept.length !== regs.length) {
      await prisma.platformSetting.update({
        where: { key: "NATIONAL_REGULATIONS" },
        data: { value: JSON.stringify(kept) },
      });
      console.log(`removed ${regs.length - kept.length} test regulation entr(y|ies)`);
    }
  }
  console.log("cleanup complete");
}

main().finally(() => prisma.$disconnect());
