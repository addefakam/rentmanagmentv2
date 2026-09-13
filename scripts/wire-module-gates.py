#!/usr/bin/env python3
"""Wire SaaS module gates into the existing module-mapped API routes.

Strategy (backend-enforced, spec-mandated):
- GET handlers: `await requireModuleForRequest(req, "MODULE");` as the first
  statement — resolves tenant from ?city= / pinned officer city; unauth
  fleet reads fail closed (module must be enabled in EVERY active tenant).
- POST/PATCH handlers: `await requireModule(ctx.cityCode, "MODULE");`
  immediately after cityContext() — the target city is the one the scope
  wall resolved, so a disabled module is rejected even for national officers
  naming a city explicitly.
Also adds the `service:manage` capability to authz.ts.
Idempotent: skips a file when the marker import already exists.
"""
import re, pathlib

ROOT = pathlib.Path("/home/z/my-project/src/app/api")

# file -> (module, ctx-aware handlers) ; ctx-aware = insert after cityContext line
PLAN = {
    "complaints": ("COMPLAINTS", True),
    "appeals": ("COMPLAINTS", True),
    "payments": ("PAYMENTS", True),
    "registration-files": ("SERVICE_REQUESTS", True),
    "publications": ("ANNOUNCEMENTS", True),
    "analytics": ("ANALYTICS", True),
}

IMPORT_LINE = 'import { requireModuleForRequest, requireModule } from "@/lib/tenant";'

for name, (module, ctx_aware) in PLAN.items():
    path = ROOT / name / "route.ts"
    src = path.read_text()
    if "requireModuleForRequest" in src:
        print(f"skip {path} (already gated)")
        continue
    # 1. add import after the last existing @/ import line
    imports = list(re.finditer(r'^import .*from "@/lib/.*";$', src, re.M))
    last = imports[-1]
    src = src[:last.end()] + "\n" + IMPORT_LINE + src[last.end():]
    # 2. gate GET handlers: first statement inside `try {` of every GET
    def gate_get(m):
        return m.group(0) + f'\n    // SaaS module gate — disabled module = API unavailable (not just hidden).\n    await requireModuleForRequest(req, "{module}");'
    src = re.sub(r"export async function GET\(req: Request\) \{\n  try \{", gate_get, src)
    # 3. gate ctx-aware handlers: after each cityContext(...) call inside guards
    if ctx_aware:
        pattern = re.compile(r"(const ctx = await cityContext\(actor,\s*\{[^}]*\}\);)", re.S)
        def gate_ctx(m):
            return m.group(1) + f'\n        await requireModule(ctx.cityCode, "{module}"); // SaaS module gate (target tenant resolved by the scope wall)'
        src, n = pattern.subn(gate_ctx, src)
        print(f"gated {path}: GET + {n} ctx mutations")
    path.write_text(src)

# authz.ts: add service:manage capability
az = pathlib.Path("/home/z/my-project/src/lib/security/authz.ts")
src = az.read_text()
if "service:manage" not in src:
    anchor = '  "ladder:manage":'
    src = src.replace(
        anchor,
        '  // SaaS tenant service catalog — city admin manages own city, system admin fleet-wide\n'
        '  "service:manage": ["CITY_ADMIN", "SYSTEM_ADMIN"],\n' + anchor,
    )
    # and grant CITY_ADMIN (the CITY_ADMIN_GRANTS loop only pushes into existing lists)
    az.write_text(src)
    print("authz.ts: service:manage capability added")

print("done")
