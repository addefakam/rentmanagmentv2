#!/usr/bin/env python3
"""postprocess_footers.py — WPS compatibility per docx skill toc.md:
1. Map each section's footerReference to its footer XML via rels.
2. Patch footer PAGE instrText: section 2 (front matter) -> PAGE \\* ROMAN \\* MERGEFORMAT
   section 3 (body) -> PAGE \\* arabic \\* MERGEFORMAT
3. Remove empty <w:pgNumType/> elements (cover section artifact).
"""
import re
import shutil
import sys
import zipfile

DOCX = sys.argv[1] if len(sys.argv) > 1 else "/home/z/my-project/download/Rent_Control_System_Implementation_Plan.docx"

with zipfile.ZipFile(DOCX, "r") as z:
    names = z.namelist()
    files = {n: z.read(n) for n in names}

doc_xml = files["word/document.xml"].decode("utf-8")
rels_xml = files["word/_rels/document.xml.rels"].decode("utf-8")

# rel id -> footer target
rel_map = dict(re.findall(r'<Relationship[^>]*Id="([^"]+)"[^>]*Target="(footer\d+\.xml)"', rels_xml))
# also handle attribute order variants
for m in re.finditer(r'<Relationship\b[^>]*>', rels_xml):
    tag = m.group(0)
    rid = re.search(r'Id="([^"]+)"', tag)
    tgt = re.search(r'Target="(footer\d+\.xml)"', tag)
    if rid and tgt:
        rel_map[rid.group(1)] = tgt.group(1)

# find sectPr blocks in order; collect their footerReference ids
sect_blocks = re.findall(r"<w:sectPr\b.*?</w:sectPr>", doc_xml, flags=re.S)
print(f"sections found: {len(sect_blocks)}")
section_footers = []
for blk in sect_blocks:
    ids = re.findall(r'<w:footerReference[^>]*r:id="([^"]+)"', blk)
    fmt = re.search(r'<w:pgNumType[^>]*w:fmt="([^"]+)"', blk)
    section_footers.append((ids, fmt.group(1) if fmt else None))
    print("  footer refs:", ids, "fmt:", fmt.group(1) if fmt else None)

def patch_footer(fname, switch):
    key = "word/" + fname
    if key not in files:
        print("  !! missing", key)
        return
    xml = files[key].decode("utf-8")
    new_xml, n = re.subn(
        r"(<w:instrText[^>]*>)\s*PAGE\s*(</w:instrText>)",
        r"\1 PAGE \\* " + switch + r" \\* MERGEFORMAT \2",
        xml,
    )
    if n:
        files[key] = new_xml.encode("utf-8")
        print(f"  patched {fname}: {n} PAGE field(s) -> \\* {switch}")
    else:
        print(f"  no bare PAGE field in {fname} (may already be patched)")

for ids, fmt in section_footers:
    for rid in ids:
        fname = rel_map.get(rid)
        if not fname:
            continue
        if fmt == "upperRoman":
            patch_footer(fname, "ROMAN")
        elif fmt == "decimal":
            patch_footer(fname, "arabic")

# strip empty pgNumType (cover artifact)
doc_xml2, n_strip = re.subn(r"<w:pgNumType/>", "", doc_xml)
if n_strip:
    print(f"stripped {n_strip} empty <w:pgNumType/>")
files["word/document.xml"] = doc_xml2.encode("utf-8")

tmp = DOCX + ".tmp"
with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as z:
    for n, data in files.items():
        z.writestr(n, data)
shutil.move(tmp, DOCX)
print("OK", DOCX)
