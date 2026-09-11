#!/usr/bin/env python3
"""Apply multi-city schema changes to both prisma schemas (sqlite + postgres).

Changes:
  1. OrgUnit        + cityConfig CityConfig?            (back-relation)
  2. CityConfig     + bureauId/bureau relation          (city = one BUREAU subtree)
                    + complaintDecisionDays/appealDays  (statutory clock params)
                    + canonicalLang                     (city primary language)
  3. ModelContract  + cityCode @default("AA")           (per-city model contract)
  4. RentAdjustment + cityCode @default("AA")           (per-city annual ceiling)
                    + year unique -> @@unique([cityCode, year])
"""
import re, sys

ROOT = "/home/z/my-project/prisma/"
FILES = ["schema.prisma", "schema.postgres.prisma"]

def patch(text: str) -> str:
    # --- 1. OrgUnit back-relation -----------------------------------------
    text = text.replace(
        "  pilotSubCities     PilotConfig[]\n",
        "  pilotSubCities     PilotConfig[]\n  cityConfig         CityConfig?\n",
    )
    # --- 2a. CityConfig relation + statutory params -------------------------
    text = text.replace(
        """model CityConfig {
  id            String  @id @default(cuid())
  cityCode      String  @unique
""",
        """model CityConfig {
  id            String  @id @default(cuid())
  cityCode      String  @unique
  bureauId      String? @unique
  bureau        OrgUnit? @relation(fields: [bureauId], references: [id])
""",
    )
    text = text.replace(
        """  minLeaseYears Int     @default(2) // Proc. Art. 6
  maxPrepayMonths Int   @default(2) // Proc. Art. 12
  isActive      Boolean @default(true)
}
""",
        """  minLeaseYears Int     @default(2) // Proc. Art. 6
  maxPrepayMonths Int   @default(2) // Proc. Art. 12
  canonicalLang String  @default("am") // CR-01: city's primary legal rendering
  complaintDecisionDays Int @default(30) // Proc. Art. 22 (working days)
  appealDays    Int     @default(15) // Proc. Art. 24
  isActive      Boolean @default(true)
}
""",
    )
    # --- 3. ModelContract.cityCode ------------------------------------------
    text = text.replace(
        "model ModelContract {\n  id             String                 @id @default(cuid())\n  version        String                 @unique",
        "model ModelContract {\n  id             String                 @id @default(cuid())\n  cityCode       String                 @default(\"AA\") // owning city bureau\n  version        String                 @unique",
    )
    # --- 4. RentAdjustment per-city -----------------------------------------
    text = text.replace(
        """model RentAdjustment {
  id                  String    @id @default(cuid())
  year                Int       @unique
""",
        """model RentAdjustment {
  id                  String    @id @default(cuid())
  cityCode            String    @default("AA")
  year                Int
""",
    )
    text = text.replace(
        """  publishedByOrgUnitId String?
  createdAt           DateTime  @default(now())
}
""",
        """  publishedByOrgUnitId String?
  createdAt           DateTime  @default(now())

  @@unique([cityCode, year])
}
""",
    )
    return text

for name in FILES:
    path = ROOT + name
    with open(path, encoding="utf-8") as fh:
        src = fh.read()
    out = patch(src)
    for marker in ["cityConfig         CityConfig?", "bureauId      String? @unique",
                   'cityCode       String                 @default("AA")',
                   "@@unique([cityCode, year])"]:
        if marker not in out:
            sys.exit(f"FAILED: {name} missing marker: {marker}")
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(out)
    print(f"patched {name}")
print("OK")
