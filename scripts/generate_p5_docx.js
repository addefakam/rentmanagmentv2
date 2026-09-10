// generate_p5_docx.js — Phase 5 report assembler (3-section: cover / Roman TOC / Arabic body)
const {
  Document, Packer, Paragraph, TextRun, Header, Footer, PageNumber,
  NumberFormat, AlignmentType, SectionType, TableOfContents, PageBreak,
} = require("docx");
const fs = require("fs");
const path = require("path");

const { P, FONT, HFONT, buildCoverR1 } = require("./plan_lib");
const C = require("./p5_content");

const OUT = "/home/z/my-project/download/Rent_Control_System_Phase5_Report.docx";

const coverConfig = {
  title: "Phase 5 Report: Integration, Security and Compliance Testing",
  subtitle: "Residential House Rent Control and Administration System - Gate G5 Package",
  englishLabel: "PHASE 5 DELIVERABLE",
  metaLines: [
    "Legal Basis: Proclamation 1320/2016 + Directive 7/2016 + Model Agreement",
    "Contents: Test Plan, Level Reports, Security Assessment, Compliance Matrix",
    "Baseline: SRS v1.1 (CR-01 Trilingual: Amharic, English, Afan Oromo)",
    "Gate: G5 - Accept Test Evidence and Authorize UAT",
    "Date: September 2026",
  ],
  footerLeft: "Rent Control and Administration System Project",
  footerRight: "Phase 5 Report",
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
        text: "Rent Control and Administration System - Phase 5 Report: Integration, Security and Compliance Testing",
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
  ...C.chapter1(),
  ...C.chapter2(),
  ...C.chapter3(),
  ...C.chapter4(),
  ...C.chapter5(),
  ...C.chapter6(),
  ...C.chapter7(),
  ...C.chapter8(),
  ...C.chapter9(),
  ...C.chapter10(),
];

const doc = new Document({
  creator: "Rent Control and Administration System Project",
  title: "Residential House Rent Control and Administration System - Phase 5 Report",
  styles: {
    default: {
      document: {
        run: { font: { ascii: "Times New Roman", eastAsia: "SimSun" }, size: 24, color: "000000" },
        paragraph: { spacing: { line: 312 } },
      },
      heading1: {
        run: { font: { ascii: "Times New Roman", eastAsia: "SimHei" }, size: 32, bold: true, color: P.primary },
        paragraph: { spacing: { before: 360, after: 160, line: 312 } },
      },
      heading2: {
        run: { font: { ascii: "Times New Roman", eastAsia: "SimHei" }, size: 28, bold: true, color: P.primary },
        paragraph: { spacing: { before: 240, after: 120, line: 312 } },
      },
      heading3: {
        run: { font: { ascii: "Times New Roman", eastAsia: "SimHei" }, size: 24, bold: true, color: P.primary },
        paragraph: { spacing: { before: 200, after: 100, line: 312 } },
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
