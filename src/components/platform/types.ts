// ============================================================================
// types.ts — Shared types for the Phase 4 platform console (client side).
// Mirrors the /api/platform boot payload. Dates arrive ISO strings.
// ============================================================================

export type Lang = "en" | "am" | "om";

export interface OrgUnit { id: string; code: string; tier: string; nameEn: string; nameAm: string; nameOm: string; parentId: string | null; confirmationStatus: string; sourceNote?: string | null; }
export interface Role { id: string; code: string; nameEn: string; nameAm: string; nameOm: string; tierScope: string; legalNote?: string | null; }
export interface IdType { id: string; code: string; nameEn: string; nameAm: string; nameOm: string; }
export interface StatusType { id: string; code: string; nameEn: string; nameAm: string; nameOm: string; exemptionMonths: number | null; legalBasis?: string | null; }
export interface Ground { id: string; code: string; nameEn: string; nameAm: string; nameOm: string; legalBasis: string; }
export interface CityConfig { id: string; cityCode: string; nameEn: string; nameAm: string; nameOm: string; currency: string; workWeek: string; minLeaseYears: number; maxPrepayMonths: number; canonicalLang: string; complaintDecisionDays: number; appealDays: number; bureauId?: string | null; }
export interface CityInfo { cityCode: string; nameEn: string; nameAm: string; nameOm: string; bureauCode: string; currency?: string; canonicalLang?: string; }
export interface Staff { id: string; fullName: string; roleCode: string; language: string; role: Role; orgUnit: OrgUnit; }
export interface ContractSection { id: string; orderNo: number; code: string; titleEn: string; titleAm: string; titleOm: string; contentEn?: string | null; contentAm?: string | null; contentOm?: string | null; certificationStatus: string; legalBasis?: string | null; }
export interface ModelContract { id: string; version: string; status: string; issuedBy: string; legalBasis: string; effectiveFrom: string; canonicalLang: string; sections: ContractSection[]; }
export interface Adjustment { id: string; year: number; percentage: number; status: string; publishedAt?: string | null; effectiveAt?: string | null; basisStudy?: string | null; }
export interface Publication { id: string; code: string; category: string; titleEn: string; titleAm: string; titleOm: string; contentEn?: string | null; contentAm?: string | null; contentOm?: string | null; publishedAt: string; }
export interface Party { id: string; partyCode: string; type: string; fullName: string; idNumber: string; idType: IdType; idOriginalSeen: boolean; idCopyAttached: boolean; verificationStatus: string; phone?: string | null; isDeaf: boolean; proxyName?: string | null; proxyWitness1Name?: string | null; proxyWitness2Name?: string | null; registeredAtOrgUnitId: string; }
export interface Property { id: string; propertyCode: string; woreda: OrgUnit; landlord: Party; kebele?: string | null; houseNo?: string | null; ownershipEvidence: string; evidenceRef: string; statusType: StatusType; rooms: number; areaSqm?: number | null; statusSetAt: string; exemptionEndsAt?: string | null; exemptionBasis?: string | null; vacantFrom?: string | null; }
export interface ChecklistItem { id: string; orderNo: number; code: string; requirement: string; passed?: boolean | null; note?: string | null; }
export interface Witness { id: string; orderNo: number; fullName: string; idNumber: string; }
export interface Annotation { id: string; code: string; text: string; annotatedAt: string; }
export interface BookEntry { id: string; pageNumber: number; entryNumber: number; enteredAt: string; enteredByName: string; }
export interface Payment { id: string; receiptNumber: string; amount: number; kind: string; monthsCovered?: number | null; method: string; isElectronic: boolean; cashFlag: boolean; paidAt: string; file?: RegFile; fileId?: string; }
export interface RegFile {
  id: string; fileNumber: string; woreda: OrgUnit; property: Property; landlord: Party; tenant: Party;
  monthlyRent: number; leaseStart: string; leaseEnd: string; prepaymentMonths: number;
  paymentMethod: string; paymentMethodConfirmed: boolean; interpreterUsed: boolean; interpreterName?: string | null;
  isLegacy: boolean; status: string; certificateNumber?: string | null; certifiedAt?: string | null;
  stampedAt?: string | null; registeredAt?: string | null; modelContract?: ModelContract;
  checklist: ChecklistItem[]; witnesses: Witness[]; annotations: Annotation[]; bookEntries: BookEntry[];
}
export interface Appeal { id: string; appealNumber: string; appellantName: string; filedAt: string; status: string; hearingAt?: string | null; committeeDecision?: string | null; decidedAt?: string | null; courtFiledAt?: string | null; complaint?: Complaint; complaintId?: string; }
export interface Complaint { id: string; refNumber: string; channel: string; ground: Ground; groundCode: string; complainantName?: string | null; description: string; receivedAt: string; status: string; decision?: string | null; decisionSummary?: string | null; decidedAt?: string | null; decisionDueAt?: string | null; investigationNotes?: string | null; appeals?: Appeal[]; }
export interface Deadline { id: string; code: string; subjectType: string; subjectRef: string; name: string; dueAt: string; isWorkingDays: boolean; status: string; escalated: boolean; }
export interface ControlTeam { id: string; teamCode: string; members: string; subCity: OrgUnit; }
export interface ControlVisit { id: string; visitRef: string; origin: string; visitedAt: string; identificationShown: boolean; findings?: string | null; violations?: string | null; vacancyMonths?: number | null; team: ControlTeam; property: Property; }
export interface PenaltyReferral { id: string; targetBody: string; referredAt: string; status: string; }
export interface Penalty { id: string; caseNumber: string; offenseCode: string; offense: { code: string; offenseEn: string; category: string; rangeLabelEn?: string | null; confirmationStatus: string; basisRef: string }; subjectType: string; subjectRef?: string | null; monthlyRentRef?: number | null; bandPercent?: number | null; computedAmount: number; capApplied: boolean; basisRef: string; status: string; referrals: PenaltyReferral[]; }
export interface ReplicationRow { id: string; batchRef: string; fromOrgUnitId: string; toOrgUnitId: string; hopOrder: number; recordType: string; recordRef: string; payloadSummary?: string | null; propagatedAt: string; status: string; }
export interface BackupRow { id: string; type: string; startedAt: string; completedAt?: string | null; status: string; location: string; environment: { name: string; stage: string; backupScheme: string }; }
export interface Snapshot { id: string; period: string; sourceTier: string; contractsRegistered: number; activeFiles: number; complaintsReceived: number; complaintsDecided: number; penaltiesImposed: number; orgUnit: OrgUnit; computedAt: string; }
export interface Environment { id: string; name: string; stage: string; purpose: string; backupScheme: string; rpoMinutes?: number | null; }
export interface PenaltyParam { id: string; code: string; category: string; offenseEn: string; offenseAm: string; offenseOm: string; valueType: string; valueMin?: number | null; valueMax?: number | null; rangeLabelEn?: string | null; rangeLabelAm?: string | null; basisRef: string; confirmationStatus: string; isActive: boolean; }

export interface BootPayload {
  cityCode: string; cities: CityInfo[]; cityConfig: CityConfig | null;
  orgUnits: OrgUnit[]; roles: Role[]; idTypes: IdType[]; statusTypes: StatusType[];
  grounds: Ground[]; cityConfigs: CityConfig[]; staff: Staff[]; penaltyParams: PenaltyParam[];
  activeContract: ModelContract | null; adjustments: Adjustment[]; publications: Publication[];
  environments: Environment[]; deadlines: Deadline[]; snapshots: Snapshot[];
  parties: Party[]; properties: Property[]; files: RegFile[]; payments: Payment[];
  complaints: Complaint[]; appeals: Appeal[]; penalties: Penalty[];
  teams: ControlTeam[]; visits: ControlVisit[]; replications: ReplicationRow[]; backups: BackupRow[];
  counts: Record<string, number>;
  generatedAt: string;
}
