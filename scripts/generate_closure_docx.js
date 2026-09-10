// generate_closure_docx.js — Project Closure Minute (Signed) assembler
// (3-section: cover / Roman TOC / Arabic body), mirroring the G9 pipeline.
const {
  Document, Packer, Paragraph, TextRun, Header, Footer, PageNumber,
  NumberFormat, SectionType, TableOfContents, PageBreak, AlignmentType,
} = require("docx");
const fs = require("fs");
const path = require("path");

const { P, FONT, HFONT, buildCoverR1 } = require("./plan_lib");
const A = require("./closure_content");
const B = require("./closure_content_b");

const OUT = "/home/z/my-project/download/Rent_Control_System_Project_Closure_Minute.docx";

const coverConfig = {
  title: "Project Closure Minute (Signed): The Gate G9 Decision Executed and the Program Closed",
  subtitle: "Residential House Rent Control and Administration System - Final Gate Record",
  englishLabel: "PROJECT CLOSURE DELIVERABLE",
  metaLines: [
    "Legal Basis: Proclamation 1320/2016 + Directive 7/2016 + Model Agreement",
    "Contents: Owner Decision Record, Signed Closure Minute CM-P8-G9-01, Lessons, BAU Transitions, Final Open Items, Post-Closure State, Project Record, Signature",
    "Decision Reference: GATE-G9-2026-09-11 (closure minute signed and frozen)",
    "Baseline: SRS v1.1 (CR-01 Trilingual: Amharic, English, Afan Oromo)",
    "Date: September 2026",
  ],
  footerLeft: "Rent Control and Administration System Project",
  footerRight: "Project Closure Minute (Signed)",
  palette: { bg: P.bg, accent: P.accent, cover: P.cover },
};

const pgSize = { width: 11906, height: 16838 };
const pgMargin = { top: 1440, bottom: 1440, left: 1701, right: 1417 };

function pageFooter() {
  return new Footer({
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "808080", font: FONT })],
    })],
  });
}
function docHeader() {
  return new Header({
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 0 },
      children: [new TextRun({
        text: "Rent Control and Administration System - Project Closure Minute (Signed) - GATE-G9-2026-09-11",
        size: 18, color: "808080", font: FONT,
      })],
    })],
  });
}

const frontMatter = [
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 480, after: 360 },
    children: [new TextRun({ text: "Table of Contents", bold: true, size: 32, color: P.primary, font: HFONT })],
  }),
  new TableOfContents("Table of Contents", {
    hyperlink: true,
    headingStyleRange: "1-3",
  }),
  new Paragraph({
    spacing: { before: 200 },
    children: [new TextRun({
      text: "Note: This Table of Contents is generated via field codes. To ensure page number accuracy after editing, please right-click the TOC and select \"Update Field.\"",
      italics: true, size: 18, color: "888888", font: FONT,
    })],
  }),
  new Paragraph({ children: [new PageBreak()] }),
];

const body = [
  ...A.chapter1(),
  ...A.chapter2(),
  ...A.chapter3(),
  ...A.chapter4(),
  ...A.chapter5(),
  ...A.chapter6(),
  ...B.chapter7(),
  ...B.chapter8(),
];

const doc = new Document({
  creator: "Rent Control and Administration System Project",
  title: "Project Closure Minute (Signed) - GATE-G9-2026-09-11",
  description: "Final gate record: the owner's Gate G9 decision executed, closure minute CM-P8-G9-01 signed and frozen, project closed.",
  styles: {
    default: {
      document: { run: { font: FONT, size: 22, color: P.primary } },
      heading1: {
        run: { font: HFONT, size: 30, bold: true, color: P.accent },
        paragraph: { spacing: { before: 360, after: 180 }, outlineLevel: 0 },
      },
      heading2: {
        run: { font: HFONT, size: 25, bold: true, color: P.primary },
        paragraph: { spacing: { before: 280, after: 140 }, outlineLevel: 1 },
      },
    },
  },
  sections: [
    {
      properties: {
        page: { size: pgSize, margin: { top: 0, bottom: 0, left: 0, right: 0 } },
      },
      children: buildCoverR1(coverConfig),
    },
    {
      properties: {
        type: SectionType.NEXT_PAGE,
        page: {
          size: pgSize, margin: pgMargin,
          pageNumbers: { start: 1, formatType: NumberFormat.UPPER_ROMAN },
        },
      },
      footers: { default: pageFooter() },
      children: frontMatter,
    },
    {
      properties: {
        type: SectionType.NEXT_PAGE,
        page: {
          size: pgSize, margin: pgMargin,
          pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL },
        },
      },
      headers: { default: docHeader() },
      footers: { default: pageFooter() },
      children: body,
    },
  ],
});

Packer.toBuffer(doc).then(buf => {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, buf);
  console.log("WROTE", OUT, buf.length, "bytes");
}).catch(err => {
  console.error("FAILED:", err);
  process.exit(1);
});
