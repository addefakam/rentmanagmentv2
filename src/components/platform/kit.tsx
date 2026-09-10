// ============================================================================
// kit.tsx — Reusable console primitives: panels, stats, labeled fields,
// data tables, legal-rule badges. Keeps module panels compact and uniform.
// ============================================================================

"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Lang } from "./types";
import { t } from "./i18n";

export function Panel({ title, subtitle, children, className }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {subtitle ? <CardDescription className="text-xs">{subtitle}</CardDescription> : null}
      </CardHeader>
      <CardContent className="p-4 pt-0">{children}</CardContent>
    </Card>
  );
}

export function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        {hint ? <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div> : null}
      </CardContent>
    </Card>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

export function TextField(p: React.InputHTMLAttributes<HTMLInputElement>) {
  return <Input className="h-8 text-sm" {...p} />;
}

export function SelectField({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; placeholder?: string;
}) {
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger className="h-8 w-full text-sm"><SelectValue placeholder={placeholder ?? "—"} /></SelectTrigger>
      <SelectContent className="max-h-72">{options.map((o) => <SelectItem key={o.value} value={o.value} className="text-sm">{o.label}</SelectItem>)}</SelectContent>
    </Select>
  );
}

export function BoolField({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 py-1.5 text-sm">
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
      <span>{label}</span>
    </label>
  );
}

export function ActionButton({ onClick, children, disabled, variant }: {
  onClick: () => void; children: React.ReactNode; disabled?: boolean; variant?: "default" | "outline" | "destructive" | "secondary" | "ghost" | "link";
}) {
  return (
    <Button size="sm" variant={variant ?? "default"} onClick={onClick} disabled={disabled} className="min-h-[32px]">
      {children}
    </Button>
  );
}

export function StatusBadge({ value }: { value: string }) {
  const tone: Record<string, string> = {
    REGISTERED: "bg-emerald-100 text-emerald-800", VERIFIED: "bg-emerald-100 text-emerald-800", EFFECTIVE: "bg-emerald-100 text-emerald-800", PAID: "bg-emerald-100 text-emerald-800", MET: "bg-emerald-100 text-emerald-800", SUCCEEDED: "bg-emerald-100 text-emerald-800", PROPAGATED: "bg-emerald-100 text-emerald-800", CLOSED: "bg-slate-200 text-slate-700", ACTIVE: "bg-emerald-100 text-emerald-800",
    CERTIFIED: "bg-amber-100 text-amber-800", STAMPED: "bg-amber-100 text-amber-800", CHECKLIST_PASSED: "bg-amber-100 text-amber-800", PUBLISHED: "bg-amber-100 text-amber-800", DECIDED: "bg-amber-100 text-amber-800", NOTIFIED: "bg-amber-100 text-amber-800", HEARD: "bg-amber-100 text-amber-800", REFERRED: "bg-amber-100 text-amber-800", PENDING: "bg-amber-100 text-amber-800", FILED: "bg-amber-100 text-amber-800", SCHEDULED: "bg-amber-100 text-amber-800",
    OVERDUE: "bg-red-100 text-red-800", REJECTED: "bg-red-100 text-red-800", REJECTED_INCOMPLETE: "bg-red-100 text-red-800", CASH: "bg-red-100 text-red-800", ESCALATED_TO_COURT: "bg-red-100 text-red-800", FAIL: "bg-red-100 text-red-800",
    INCOMPLETE: "bg-amber-100 text-amber-800", CARRIED: "bg-violet-100 text-violet-800",
    PRESENTED: "bg-sky-100 text-sky-800", INTAKE: "bg-sky-100 text-sky-800", DRAFT: "bg-sky-100 text-sky-800", COMPLETENESS_VERIFIED: "bg-sky-100 text-sky-800", UNDER_INVESTIGATION: "bg-sky-100 text-sky-800", COMPUTED: "bg-sky-100 text-sky-800",
  };
  return <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${tone[value] ?? "bg-slate-100 text-slate-700"}`}>{value.replace(/_/g, " ")}</span>;
}

export function RuleBadge({ rule }: { rule: string }) {
  return <Badge variant="outline" className="text-[10px] font-mono">{rule}</Badge>;
}

export function DataTable({ headers, rows, empty }: { headers: string[]; rows: React.ReactNode[][]; empty?: string }) {
  if (rows.length === 0) return <p className="py-3 text-sm text-muted-foreground">{empty ?? "—"}</p>;
  return (
    <ScrollArea className="max-h-96 w-full">
      <Table>
        <TableHeader><TableRow>{headers.map((h) => <TableHead key={h} className="text-xs">{h}</TableHead>)}</TableRow></TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i}>{r.map((cell, j) => <TableCell key={j} className="text-xs">{cell}</TableCell>)}</TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}

export function RuleNote({ lang }: { lang: Lang }) {
  if (lang !== "om") return null;
  return <p className="mt-2 text-[11px] italic text-muted-foreground">{t("lang.fallback", lang)}</p>;
}
