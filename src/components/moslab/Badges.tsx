import { motion } from "framer-motion";
import { BookOpen, FlaskConical, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { DataSource } from "@/lib/moslab-data";

export function MetricCard({
  label,
  value,
  hint,
  icon,
  delay = 0,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="rounded-xl border border-border bg-card p-5 shadow-elegant"
    >
      <div className="flex items-start justify-between">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        {icon && <div className="text-primary">{icon}</div>}
      </div>
      <div className="mt-3 font-display text-3xl font-semibold tracking-tight">
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </motion.div>
  );
}

export function PerformanceBadge({
  level,
  tone = "primary",
}: {
  level: string;
  tone?: "success" | "primary" | "warning" | "muted";
}) {
  const toneClass = {
    success: "bg-success/10 text-success border-success/30",
    primary: "bg-primary-soft text-primary border-primary/30",
    warning: "bg-warning/15 text-warning-foreground border-warning/40",
    muted: "bg-muted text-muted-foreground border-border",
  }[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        toneClass,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {level}
    </span>
  );
}

export function SensorTypeBadge({ type }: { type: "n-type" | "p-type" }) {
  const isN = type === "n-type";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide",
        isN
          ? "border-primary/30 bg-primary-soft text-primary"
          : "border-chart-2/30 bg-chart-2/10 text-chart-2",
      )}
    >
      {type}
    </span>
  );
}

export function ResponseEquationBadge({ equation }: { equation: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-muted/70 px-2.5 py-0.5 font-mono text-[11px] font-medium text-foreground">
      {equation}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const tone = {
    "Available Data": "bg-success/10 text-success border-success/30",
    "Literature Only": "bg-chart-3/10 text-chart-3 border-chart-3/30",
    "Future Data": "bg-muted text-muted-foreground border-border",
  }[status] ?? "bg-muted text-muted-foreground border-border";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        tone,
      )}
    >
      {status}
    </span>
  );
}

function normalizeSourceVariant(source: string | DataSource | null | undefined): DataSource {
  const normalized = String(source ?? "").trim().toLowerCase();

  if (!normalized) {
    return "Experimental";
  }

  if (
    normalized === "literature" ||
    normalized.includes("literature") ||
    normalized.includes("literature_dataset")
  ) {
    return "Literature";
  }

  if (
    normalized === "ai prediction" ||
    normalized === "ai-prediction" ||
    normalized.includes("prediction") ||
    normalized.includes("ai") ||
    normalized.includes("ml")
  ) {
    return "AI Prediction";
  }

  if (
    normalized === "experimental" ||
    normalized.includes("experimental") ||
    normalized.includes("experimental_dataset")
  ) {
    return "Experimental";
  }

  return "Experimental";
}

export function SourceBadge({ source }: { source: string | DataSource | null | undefined }) {
  const label = String(source ?? "").trim() || "Experimental";
  const variant = normalizeSourceVariant(source);

  const config: Record<DataSource, { Icon: typeof FlaskConical; cls: string }> = {
    Experimental: {
      Icon: FlaskConical,
      cls: "bg-success/10 text-success border-success/30 shadow-[0_0_0_1px_rgba(34,197,94,0.12)]",
    },
    Literature: {
      Icon: BookOpen,
      cls: "bg-sky-500/10 text-sky-700 border-sky-500/30 shadow-[0_0_0_1px_rgba(14,165,233,0.12)]",
    },
    "AI Prediction": {
      Icon: Sparkles,
      cls: "bg-amber-500/10 text-amber-700 border-amber-500/30 shadow-[0_0_0_1px_rgba(245,158,11,0.12)]",
    },
  };

  const { Icon, cls } = config[variant];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide",
        cls,
      )}
    >
      <Icon className="size-3" />
      {label}
    </span>
  );
}
