// plan_lib.js — shared helpers, palette, cover recipe R1 (design-system compliant)
const {
  Paragraph, TextRun, Table, TableRow, TableCell, Footer, Header,
  AlignmentType, HeadingLevel, WidthType, BorderStyle, ShadingType,
  TableLayoutType, PageNumber,
} = require("docx");

// ── GO-1 palette (Graphite Orange — proposals/plans) ──
const P = {
  bg: "1A2330", accent: "D4875A",
  cover: { titleColor: "FFFFFF", subtitleColor: "B0B8C0", metaColor: "A8B0B8", footerColor: "8A929A" },
  table: { headerBg: "D4875A", headerText: "FFFFFF", accentLine: "D4875A", innerLine: "DDD0C8", surface: "F8F0EB" },
  primary: "1A2330", body: "000000", secondary: "606060",
};

const NB = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: NB, bottom: NB, left: NB, right: NB };
const allNoBorders = { top: NB, bottom: NB, left: NB, right: NB, insideHorizontal: NB, insideVertical: NB };

const FONT = { ascii: "Times New Roman", eastAsia: "SimSun" };
const HFONT = { ascii: "Times New Roman", eastAsia: "SimHei" };

// ── text helpers ──
function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 160, line: 312 },
    children: [new TextRun({ text, bold: true, size: 32, color: P.primary, font: HFONT })],
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120, line: 312 },
    children: [new TextRun({ text, bold: true, size: 28, color: P.primary, font: HFONT })],
  });
}
function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 100, line: 312 },
    children: [new TextRun({ text, bold: true, size: 24, color: P.primary, font: HFONT })],
  });
}
// body paragraph — English: left aligned, no first-line indent, 1.3x spacing
function p(text, opts = {}) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { line: 312, after: opts.after !== undefined ? opts.after : 120 },
    children: [new TextRun({ text, size: 24, color: P.body, font: FONT })],
  });
}
// rich paragraph: segments [[text, bold], ...]
function rich(segments, opts = {}) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { line: 312, after: opts.after !== undefined ? opts.after : 120 },
    children: segments.map(s => new TextRun({
      text: s[0], bold: !!s[1], size: 24, color: P.body, font: FONT,
    })),
  });
}
function bullet(text, boldLead) {
  const runs = [];
  if (boldLead) {
    runs.push(new TextRun({ text: boldLead + " ", bold: true, size: 24, color: P.body, font: FONT }));
  }
  runs.push(new TextRun({ text, size: 24, color: P.body, font: FONT }));
  return new Paragraph({
    bullet: { level: 0 },
    alignment: AlignmentType.LEFT,
    spacing: { line: 312, after: 80 },
    children: runs,
  });
}

// ── table builder (Horizontal-Only style, GO-1 tokens) ──
let tableCounter = 0;
function caption(text) {
  tableCounter += 1;
  return new Paragraph({
    keepNext: true,
    spacing: { before: 160, after: 80, line: 312 },
    children: [new TextRun({ text: "Table " + tableCounter + ": " + text, bold: true, size: 21, color: P.primary, font: FONT })],
  });
}
function cellPara(text, opts = {}) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { line: 276 },
    children: [new TextRun({
      text: String(text), bold: !!opts.bold, size: 20,
      color: opts.color || P.body, font: FONT,
    })],
  });
}
function tbl(cfg) {
  // cfg: { caption, headers[], rows[][], widths[], zebra }
  const out = [];
  if (cfg.caption) out.push(caption(cfg.caption));
  const margins = { top: 60, bottom: 60, left: 120, right: 120 };
  const headerRow = new TableRow({
    tableHeader: true,
    cantSplit: true,
    children: cfg.headers.map((htext, i) => new TableCell({
      children: [cellPara(htext, { bold: true, color: P.table.headerText })],
      shading: { type: ShadingType.CLEAR, fill: P.table.headerBg },
      margins,
      width: { size: cfg.widths[i], type: WidthType.PERCENTAGE },
    })),
  });
  const dataRows = cfg.rows.map((r, ri) => new TableRow({
    cantSplit: true,
    children: r.map((c, ci) => new TableCell({
      children: [cellPara(c)],
      shading: cfg.zebra && ri % 2 === 0
        ? { type: ShadingType.CLEAR, fill: P.table.surface }
        : { type: ShadingType.CLEAR, fill: "FFFFFF" },
      margins,
      width: { size: cfg.widths[ci], type: WidthType.PERCENTAGE },
    })),
  }));
  out.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: P.table.accentLine },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: P.table.accentLine },
      left: NB, right: NB,
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: P.table.innerLine },
      insideVertical: NB,
    },
    rows: [headerRow, ...dataRows],
  }));
  return out;
}

// ── cover: width-aware English title layout (design-system estimateTextWidth) ──
function estimateTextWidth(text, pt) {
  let w = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0);
    const isCJK = (code >= 0x4E00 && code <= 0x9FFF) || (code >= 0x3000 && code <= 0x303F) || (code >= 0xFF00 && code <= 0xFFEF);
    w += isCJK ? pt * 20 : pt * 11;
  }
  return w;
}
function splitLatinLines(title, maxWidthTwips, pt) {
  const words = title.split(" ");
  const lines = [];
  let cur = "";
  for (const word of words) {
    const probe = cur ? cur + " " + word : word;
    if (estimateTextWidth(probe, pt) <= maxWidthTwips || !cur) cur = probe;
    else { lines.push(cur); cur = word; }
  }
  if (cur) lines.push(cur);
  // no 1-word orphan on last line if avoidable
  if (lines.length > 1) {
    const last = lines[lines.length - 1];
    if (!last.includes(" ") && last.length <= 6) {
      lines[lines.length - 2] += " " + lines.pop();
    }
  }
  return lines;
}
function calcTitleLayout(title, maxWidthTwips, preferredPt = 40, minPt = 24) {
  let titlePt = preferredPt;
  let lines = splitLatinLines(title, maxWidthTwips, titlePt);
  while (titlePt > minPt && lines.length > 3) {
    titlePt -= 2;
    lines = splitLatinLines(title, maxWidthTwips, titlePt);
  }
  return { titlePt, titleLines: lines };
}
function calcCoverSpacing(params) {
  const {
    titleLineCount = 1, titlePt = 36, hasSubtitle = false,
    hasEnglishLabel = false, metaLineCount = 0,
    fixedHeight = 800, pageHeight = 16838, marginTop = 0, marginBottom = 0,
  } = params;
  const SAFETY = 1200;
  const usableHeight = pageHeight - marginTop - marginBottom - SAFETY;
  const titleHeight = titleLineCount * (titlePt * 23 + 200);
  const subtitleHeight = hasSubtitle ? (12 * 23 + 600) : 0;
  const englishLabelHeight = hasEnglishLabel ? (9 * 23 + 600) : 0;
  const metaHeight = metaLineCount * (10 * 23 + 100);
  const implicitParaHeight = 3 * 300;
  const contentHeight = titleHeight + subtitleHeight + englishLabelHeight + metaHeight + fixedHeight + implicitParaHeight;
  const remainingSpace = usableHeight - contentHeight;
  const safeRemaining = Math.max(remainingSpace, 400);
  const FOOTER_MIN = 800;
  const rawTop = Math.floor(safeRemaining * 0.45);
  const rawBottom = Math.floor(safeRemaining * 0.45);
  const bottomSpacing = Math.max(rawBottom, FOOTER_MIN);
  const topSpacing = Math.max(rawTop - Math.max(0, FOOTER_MIN - rawBottom), 400);
  const midSpacing = Math.max(safeRemaining - topSpacing - bottomSpacing, 0);
  return { topSpacing, midSpacing, bottomSpacing };
}

// ── Recipe R1: Pure Paragraph Cover (left aligned, full-page dark bg) ──
function buildCoverR1(config) {
  const PAL = config.palette;
  const padL = 1200, padR = 800;
  const availableWidth = 11906 - padL - padR - 300;
  const { titlePt, titleLines } = calcTitleLayout(config.title, availableWidth, 40, 24);
  const titleSize = titlePt * 2;
  const spacing = calcCoverSpacing({
    titleLineCount: titleLines.length, titlePt,
    hasSubtitle: !!config.subtitle, hasEnglishLabel: !!config.englishLabel,
    metaLineCount: (config.metaLines || []).length,
    fixedHeight: 400,
  });
  const accentLeft = { style: BorderStyle.SINGLE, size: 8, color: PAL.accent, space: 12 };
  const children = [];
  children.push(new Paragraph({ spacing: { before: spacing.topSpacing } }));
  if (config.englishLabel) {
    children.push(new Paragraph({
      indent: { left: padL, right: padR }, spacing: { after: 500 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: PAL.accent, space: 8 } },
      children: [new TextRun({ text: config.englishLabel.split("").join("  "), size: 18, color: PAL.accent, font: { ascii: "Calibri", eastAsia: "SimHei" }, characterSpacing: 40 })],
    }));
  }
  for (let i = 0; i < titleLines.length; i++) {
    children.push(new Paragraph({
      indent: { left: padL, right: padR },
      spacing: { after: i < titleLines.length - 1 ? 100 : 300, line: Math.ceil(titlePt * 23), lineRule: "atLeast" },
      children: [new TextRun({ text: titleLines[i], size: titleSize, bold: true, color: PAL.cover.titleColor, font: { ascii: "Arial", eastAsia: "SimHei" } })],
    }));
  }
  if (config.subtitle) {
    children.push(new Paragraph({
      indent: { left: padL, right: padR }, spacing: { after: 800, line: 340, lineRule: "atLeast" },
      children: [new TextRun({ text: config.subtitle, size: 24, color: PAL.cover.subtitleColor, font: { ascii: "Arial", eastAsia: "Microsoft YaHei" } })],
    }));
  }
  for (const line of (config.metaLines || [])) {
    children.push(new Paragraph({
      indent: { left: padL + 200, right: padR }, spacing: { after: 80 },
      border: { left: accentLeft },
      children: [new TextRun({ text: line, size: 24, color: PAL.cover.metaColor, font: { ascii: "Arial", eastAsia: "Microsoft YaHei" } })],
    }));
  }
  children.push(new Paragraph({ spacing: { before: spacing.bottomSpacing } }));
  children.push(new Paragraph({
    indent: { left: padL, right: padR },
    border: { top: { style: BorderStyle.SINGLE, size: 2, color: PAL.accent, space: 8 } },
    spacing: { before: 200 },
    children: [
      new TextRun({ text: config.footerLeft || "", size: 16, color: PAL.cover.footerColor, font: { ascii: "Arial" } }),
      new TextRun({ text: "                                        " }),
      new TextRun({ text: config.footerRight || "", size: 16, color: PAL.cover.footerColor, font: { ascii: "Arial" } }),
    ],
  }));
  return [new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: allNoBorders,
    rows: [new TableRow({
      height: { value: 16838, rule: "exact" },
      children: [new TableCell({
        shading: { type: ShadingType.CLEAR, fill: PAL.bg }, borders: noBorders,
        verticalAlign: "top",
        children,
      })],
    })],
  })];
}

module.exports = {
  P, NB, noBorders, allNoBorders, FONT, HFONT,
  h1, h2, h3, p, rich, bullet, tbl, caption,
  buildCoverR1,
};
