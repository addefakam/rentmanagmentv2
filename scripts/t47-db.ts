import { db } from "../src/lib/db";
async function main() {
  const users = await db.systemUser.findMany({
    select: { staffCode: true, fullName: true, roleCode: true, isActive: true },
    orderBy: { staffCode: "asc" },
  });
  for (const u of users) console.log(`${u.staffCode}  ${u.roleCode.padEnd(18)} active=${u.isActive}  ${u.fullName}`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
