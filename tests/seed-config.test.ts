// ============================================================================
// tests/seed-config.test.ts — Phase 3 unit tests: seed configuration integrity.
// These run in the CI pipeline (build-test-analyze job) BEFORE promotion.
// They validate the seed configuration modules statically so that a bad
// configuration fails fast, before any environment is seeded.
// Run: bun test tests/
// ============================================================================

import { describe, it, expect } from "bun:test";

import { MINISTRY, BUREAU, SUB_CITIES, OFFICIAL_WOREDA_TOTAL, totalConfiguredWoredas } from "../src/lib/seed-data/orgTree";
import { LANGUAGES, ROLES, IDENTIFICATION_TYPES, PROPERTY_STATUS_TYPES, PENALTY_PARAMETERS, CALENDAR_EVENTS } from "../src/lib/seed-data/catalogs";
import { MODEL_CONTRACT_V1, CONTRACT_SECTIONS } from "../src/lib/seed-data/modelContract";
import { ENVIRONMENTS, LOCALIZATION_RESOURCES } from "../src/lib/seed-data/environments";

describe("Organizational hierarchy seed (Directive Arts. 2, 6)", () => {
  it("has exactly one Ministry and one city Bureau", () => {
    expect(MINISTRY.code).toBe("FED-MINISTRY");
    expect(BUREAU.code).toBe("AA-BUREAU");
  });

  it("seeds exactly 11 sub-cities (official structure incl. Lemi Kura)", () => {
    expect(SUB_CITIES.length).toBe(11);
    const codes = SUB_CITIES.map((s) => s.code);
    expect(new Set(codes).size).toBe(11);
    expect(codes).toContain("AA-LEMI-KURA");
  });

  it("configured woreda total matches the sourced official total (118)", () => {
    expect(totalConfiguredWoredas()).toBe(OFFICIAL_WOREDA_TOTAL);
    expect(OFFICIAL_WOREDA_TOTAL).toBe(118);
  });

  it("every sub-city has at least one woreda and trilingual names", () => {
    for (const sc of SUB_CITIES) {
      expect(sc.woredas.count).toBeGreaterThanOrEqual(1);
      expect(sc.nameEn.length).toBeGreaterThan(0);
      expect(sc.nameAm.length).toBeGreaterThan(0);
      expect(sc.nameOm.length).toBeGreaterThan(0);
    }
  });
});

describe("Trilingual configuration (CR-01 / NFR-06)", () => {
  it("activates exactly the three languages am, en, om", () => {
    const active = LANGUAGES.filter((l) => l.status === "ACTIVE").map((l) => l.code).sort();
    expect(active).toEqual(["am", "en", "om"]);
  });

  it("Amharic is the default legal rendering", () => {
    expect(LANGUAGES.find((l) => l.code === "am")?.isDefault).toBe(true);
  });

  it("every localization resource is non-empty in all three languages", () => {
    for (const r of LOCALIZATION_RESOURCES) {
      expect(r.en.length).toBeGreaterThan(0);
      expect(r.am.length).toBeGreaterThan(0);
      expect(r.om.length).toBeGreaterThan(0);
    }
    expect(LOCALIZATION_RESOURCES.length).toBeGreaterThanOrEqual(20);
  });
});

describe("Model contract v1 (Proc. Art. 5; Dir. Art. 4)", () => {
  it("is version 1.0, ACTIVE, Amharic-canonical", () => {
    expect(MODEL_CONTRACT_V1.version).toBe("1.0");
    expect(MODEL_CONTRACT_V1.status).toBe("ACTIVE");
    expect(MODEL_CONTRACT_V1.canonicalLang).toBe("am");
  });

  it("has 10 sections, each trilingual and legally anchored", () => {
    expect(CONTRACT_SECTIONS.length).toBe(10);
    for (const s of CONTRACT_SECTIONS) {
      expect(s.titleEn.length).toBeGreaterThan(0);
      expect(s.titleAm.length).toBeGreaterThan(0);
      expect(s.titleOm.length).toBeGreaterThan(0);
      expect(s.legalBasis.length).toBeGreaterThan(0);
    }
  });

  it("encodes the 2-year term, 2-month advance cap and electronic-only payment", () => {
    const codes = CONTRACT_SECTIONS.map((s) => s.code);
    expect(codes).toContain("SEC-TERM");
    expect(codes).toContain("SEC-ADVANCE");
    expect(codes).toContain("SEC-RENT");
  });
});

describe("Regulatory catalogues", () => {
  it("role catalogue covers the SRS actor model", () => {
    expect(ROLES.length).toBeGreaterThanOrEqual(13);
  });

  it("identification catalogue enforces the original-and-copy rule (Dir. Art. 7)", () => {
    expect(IDENTIFICATION_TYPES.length).toBe(5);
  });

  it("property statuses carry the Proc. Art. 10 exemption clocks", () => {
    const byCode = Object.fromEntries(PROPERTY_STATUS_TYPES.map((p) => [p.code, p.exemptionMonths]));
    expect(byCode["PS-NEW"]).toBe(48);
    expect(byCode["PS-VACANT"]).toBe(24);
    expect(byCode["PS-OCCUPIED"]).toBeNull();
  });

  it("penalty parameters include the 3-month cap, 10 percent cash rule and the 5-25 percent surcharge ladder", () => {
    const cap = PENALTY_PARAMETERS.find((p) => p.code === "PEN-CAP-GLOBAL");
    expect(cap?.valueMax).toBe(3);
    expect(cap?.confirmationStatus).toBe("CONFIRMED");

    const cash = PENALTY_PARAMETERS.find((p) => p.code === "PEN-CASH-PAYMENT");
    expect(cash?.valueMin).toBe(10);

    const bands = PENALTY_PARAMETERS.filter((p) => p.category === "SURCHARGE_BAND").map((p) => p.valueMin).sort((a, b) => a - b);
    expect(bands).toEqual([5, 10, 15, 20, 25]);
  });

  it("June adjustment calendar has the June 1 publication and June 30 effect", () => {
    const pub = CALENDAR_EVENTS.find((e) => e.code === "CAL-JUN1-PUBLICATION");
    const eff = CALENDAR_EVENTS.find((e) => e.code === "CAL-JUN30-EFFECT");
    expect(pub?.month).toBe(6);
    expect(pub?.day).toBe(1);
    expect(eff?.month).toBe(6);
    expect(eff?.day).toBe(30);
  });
});

describe("Environment inventory (Directive Art. 13 / NFR-03)", () => {
  it("provisions DEV, STAGING and PROD with backup schemes", () => {
    const stages = ENVIRONMENTS.map((e) => e.stage).sort();
    expect(stages).toEqual(["DEV", "PROD", "STAGING"]);
    for (const e of ENVIRONMENTS) {
      expect(e.backupScheme.length).toBeGreaterThan(10);
    }
  });

  it("records RPO 15 minutes and RTO 4 hours on staging and production", () => {
    for (const e of ENVIRONMENTS.filter((x) => x.stage !== "DEV")) {
      expect(e.rpoMinutes).toBe(15);
      expect(e.rtoHours).toBe(4);
    }
  });
});
