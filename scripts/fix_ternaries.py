#!/usr/bin/env python3
"""Codemod: convert 3-line ternary statement `COND ? s.pass(..) : s.fail(..);`
in executors.ts into if/else statements (eslint no-unused-expressions cleanup)."""
import re, sys

F = "/home/z/my-project/src/lib/uat/executors.ts"
lines = open(F).readlines()
out, i, converted = [], 0, 0
while i < len(lines):
    if i + 2 < len(lines):
        l1m = re.match(r'^(\s*)\? s\.pass\((.*)\)\s*$', lines[i + 1])
        l2m = re.match(r'^(\s*): s\.fail\((.*)\);\s*$', lines[i + 2])
        cond = lines[i].rstrip("\n")
        stripped = cond.strip()
        # cond must be a standalone expression line (not a call opener, not a comment)
        if l1m and l2m and stripped and not stripped.startswith("//") and not stripped.endswith("(") and not stripped.endswith(","):
            indent = re.match(r"^(\s*)", cond).group(1)
            if indent + "? " not in cond:  # cond line is not itself a ternary branch
                out.append(f"{indent}if ({stripped}) {{\n")
                out.append(f"{indent}  s.pass({l1m.group(2)});\n")
                out.append(f"{indent}}} else {{\n")
                out.append(f"{indent}  s.fail({l2m.group(2)});\n")
                out.append(f"{indent}}}\n")
                converted += 1
                i += 3
                continue
    out.append(lines[i])
    i += 1
open(F, "w").writelines(out)
print(f"converted {converted} ternary statements")
