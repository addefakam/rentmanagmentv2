// generate_plan_docx.js — main assembler
const {
  Document, Packer, Paragraph, TextRun, Header, Footer, PageNumber,
  NumberFormat, AlignmentType, SectionType, TableOfContents, PageBreak,
} = require("docx");
const fs = require("fs");
const path = require("path");

const { P, FONT, HFONT, buildCoverR1 } = require("./plan_lib");
const A = require("./plan_content_a");
const B = require("./plan_content_b");
const C = require("./plan_content_c");
const D = require("./plan_content_d");

const OUT = "/home/z/my-project/download/Rent_Control_System_Implementation_Plan.docx";

// ── cover config ──
const coverConfig = {
  title: "Residential House Rent Control and Administration System",
  subtitle: "Master Implementation Plan and Step-by-Step Development Guide",
  englishLabel: "IMPLEMENTATION PLAN",
  metaLines: [
    "Legal Basis: Proclamation 1320/2016 + Directive 7/2016 + Model Agreement",
    "Methodology: Hybrid V-Model + Incremental Agile, Phase-Gated",
    "Scope: Federal - City Bureau - Sub-city - Woreda Tiers",
    "Version 1.0 - September 2026",
  ],
  footerLeft: "Rent Control and Administration System Project",
  footerRight: "Implementation Plan V1.0",
  palette: { bg: P.bg, accent: P.accent, cover: P.cover },
};

// ── shared page setup ──
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
        text: "Rent Control and Administration System - Implementation Plan",
        size: 18, color: "808080", font: FONT,
      })],
    })],
  });
}

// ── front matter: TOC ──
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

// ── body ──
const body = [
  ...A.chapter1(),
  ...A.chapter2(),
  ...A.chapter3(),
  ...B.chapter4(),
  ...B.chapter5(),
  ...B.chapter6(),
  ...C.chapter7(),
  ...C.chapter8(),
  ...C.chapter9(),
  ...D.chapter10(),
  ...D.chapter11(),
  ...D.chapter12(),
];

// ── document ──
const doc = new Document({
  creator: "Rent Control and Administration System Project",
  title: "Residential House Rent Control and Administration System - Implementation Plan",
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
      // Section 1: Cover — margin 0, no header/footer, no page numbers
      properties: {
        page: { size: pgSize, margin: { top: 0, bottom: 0, left: 0, right: 0 } },
      },
      children: buildCoverR1(coverConfig),
    },
    {
      // Section 2: Front matter (TOC) — Roman numerals
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
      // Section 3: Body — Arabic numerals starting at 1
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
