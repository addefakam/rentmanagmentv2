# Deliverables — Residential House Rent Control and Administration System
**Proclamation No. 1320/2016 + Addis Ababa Directive No. 7/2016 + Model Rental Agreement**

Gate progress: G0–G8 approved · Go-live order executed (GATE-G8-2026-09-10, Wave 1 live) · **Gate G9 (project closure) pending — closure report delivered.**

| # | Document | Gate | Contents |
|---|----------|------|----------|
| 1 | Rent_Control_System_Implementation_Plan.docx | G0 | Hybrid Phase-Gated Incremental SDLC plan: 9 phases, 10 gates, 48-activity master checklist, risk register, owner guide |
| 2 | Rent_Control_System_SRS_v1.0.docx | G1 | SRS v1.0: 13 modules / 74 FRs / 12 NFRs / 21 use cases + full legal traceability |
| 3 | Rent_Control_System_SRS_v1.1.docx | (CR-01) | SRS updated for Afan Oromo as third language (CR-01, NFR-06) |
| 4 | Rent_Control_System_Phase3_Report.docx | G3 | Environments, CI/CD staged promotion, seeded configuration (131 org units, 118 woredas) |
| 5 | Rent_Control_System_Phase4_Report.docx | G4 | 7 sprints / 13 modules built: rule engine, 17 APIs, trilingual console |
| 6 | Rent_Control_System_Phase5_Report.docx | G5 | Integration, security (ASVS L2), 47-row legal compliance matrix, performance |
| 7 | Rent_Control_System_Phase6_Report.docx | G6 | UAT (8 scenarios / 50 steps), legal validation memorandum LVM-G6-2026-01, UAT certificate |
| 8 | Rent_Control_System_Phase7_Report.docx | G7 | Legacy migration w/ Dir. Art. 8(2) annotation, reconciliation, training, pilot, awareness materials |
| 9 | Rent_Control_System_Phase8_Report.docx | G8 | Go-live hardening (DEF-06-01 session layer, O-7 register confirmation), wave cutover checklist 10/10 GREEN, drills, hypercare schedule, operations manual |
| 10 | Rent_Control_System_Gate_G9_Closure_Report.docx | G9 | Go-live order executed (Wave 1 live), hypercare 28/28 (SEV-1: 0), first annual cycle (Proc. Art. 8), referrals + court recovery, Ministry feed, signed handover, 90-day PIR, closure minute — **project close requested** |

## Platform (live, this workspace)
- Next.js 16 console, trilingual (Amharic / English / Afan Oromo), 14 tabs incl. **P8 · Go-Live & Operations** (full Part B operations record)
- `/api/phase8` — waves, cutover checklists (Wave 1 + Wave 2 prep), drills, O-7, freeze, G8 readiness + operations: hypercare daily reports, annual cycle, referrals, Ministry feeds, handover, PIR, closure minute, **G9 check**
- `/api/session` — production authentication (DEF-06-01 closure; switch armed with the order)
- Battery: 176 tests / 0 fail across 7 suites · E2E: golden 31/31, P7 20/20, P8 34/34, **G9 28/28**
- Shipped state: Wave 1 LIVE under GATE-G8-2026-09-10 · 2026 rate set EFFECTIVE (June 1 / June 30) · 3 hash-verified Ministry feeds · OPS-MANUAL v1.1 handed over · PIR 6/6 findings dispositioned · closure minute DRAFT awaiting the owner's G9 signature
