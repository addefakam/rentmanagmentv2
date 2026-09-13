import { db } from "../src/lib/db";
async function main() {
  const users = await db.systemUser.findMany({
    select: { staffCode: true, roleCode: true, isActive: true, fullName: true },
    orderBy: { staffCode: "asc" },
  });
  console.log("TOTAL:", users.length);
  for (const u of users) console.log(`${u.staffCode}  ${(u.roleCode ?? "?").padEnd(18)} active=${u.isActive}  ${u.fullName}`);
  process.exit(0);
}
main().catch((e) => { console.error("ERR:", String(e).slice(0, 400)); process.exit(1); });
