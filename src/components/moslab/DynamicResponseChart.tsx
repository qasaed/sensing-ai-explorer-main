import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useMemo } from "react";
import {
  MATERIAL_AFFINITY,
  MATERIAL_KINETICS,
  type SensorType,
} from "@/lib/moslab-data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatChemicalFormula } from "@/lib/utils";
import type { ExperimentStage } from "./ExperimentTimeline";

interface Props {
  stages: ExperimentStage[];
  timeUnit: "s" | "min" | "h";
  onTimeUnitChange?: (value: "s" | "min" | "h") => void;
  material: string;
  sensorType: SensorType;
  temperature: number;
  baseResistance?: number;
  liveData?: Array<{
    resistance?: number;
    resistance_unit?: string;
    response?: number;
    concentration?: number;
    equation?: string;
    source?: string;
    time_unit?: string;
  }>;
  backendTimeUnit?: string;
  backendResistanceUnit?: string;
}

interface ChartPoint {
  t: number;
  resistance: number;
  stage: string;
}

interface Segment {
  x1: number;
  x2: number;
  label: string;
  kind: "air" | "gas";
}

const TIME_FACTORS = {
  s: 1,
  min: 60,
  h: 3600,
} as const;

function normalizeDisplayTimeUnit(value?: string | null): "s" | "min" | "h" {
  const normalized = value?.trim().toLowerCase() ?? "";

  if (normalized === "s" || normalized === "sec" || normalized === "secs" || normalized === "second" || normalized === "seconds") {
    return "s";
  }

  if (normalized === "min" || normalized === "mins" || normalized === "minute" || normalized === "minutes") {
    return "min";
  }

  if (normalized === "h" || normalized === "hr" || normalized === "hrs" || normalized === "hour" || normalized === "hours") {
    return "h";
  }

  return "s";
}

function normalizeDisplayResistanceUnit(value?: string | null): "Ω" | "kΩ" | "MΩ" {
  const normalized = value?.trim() ?? "";

  if (!normalized) {
    return "Ω";
  }

  const lower = normalized.toLowerCase();

  if (lower === "ohm" || lower === "ohms" || normalized === "Ω") {
    return "Ω";
  }

  if (lower === "kohm" || lower === "kω" || normalized === "kΩ") {
    return "kΩ";
  }

  if (lower === "mohm" || lower === "mω" || normalized === "MΩ") {
    return "MΩ";
  }

  return "Ω";
}

function formatTime(value: number) {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
}

function formatResistance(value: number) {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
}

function inferBaselineResistance(
  liveData: Array<{ resistance?: number; response?: number; equation?: string }>,
  sensorType: SensorType,
  fallback: number,
) {
  const candidate = liveData.find((row) => {
    if (!Number.isFinite(row.response ?? NaN) || !Number.isFinite(row.resistance ?? NaN)) {
      return false;
    }

    return Boolean(row.equation);
  });

  if (!candidate) {
    return fallback;
  }

  const response = Number(candidate.response);
  const resistance = Number(candidate.resistance);

  if (!Number.isFinite(response) || !Number.isFinite(resistance) || response <= 0) {
    return fallback;
  }

  if (candidate.equation === "S = Ra / Rg") {
    return response * resistance;
  }

  if (candidate.equation === "S = Rg / Ra") {
    return resistance / response;
  }

  if (sensorType === "n-type") {
    return response * resistance;
  }

  return resistance / response;
}

function inferStageTarget(
  stage: ExperimentStage,
  liveData: Array<{ resistance?: number; response?: number; concentration?: number; equation?: string }>,
  baselineResistance: number,
  material: string,
  sensorType: SensorType,
  temperature: number,
) {
  const affinities = MATERIAL_AFFINITY[material] ?? {};
  const aff = affinities[stage.gas ?? ""] ?? 2.5;
  const cFactor = Math.log10((stage.concentration ?? 1) + 1) / Math.log10(201);
  const tFactor = Math.exp(-Math.pow((temperature - 320) / 140, 2));
  const strength = aff * tFactor * cFactor;

  const matchingRow = liveData
    .filter((row) => Number.isFinite(row.resistance ?? NaN))
    .sort((left, right) => {
      const leftDelta = Math.abs((left.concentration ?? 0) - (stage.concentration ?? 0));
      const rightDelta = Math.abs((right.concentration ?? 0) - (stage.concentration ?? 0));
      return leftDelta - rightDelta;
    })[0];

  if (matchingRow?.resistance !== undefined && Number.isFinite(matchingRow.resistance)) {
    return Number(matchingRow.resistance);
  }

  if (stage.type === "air") {
    return baselineResistance;
  }

  if (sensorType === "n-type") {
    return baselineResistance / (1 + strength);
  }

  return baselineResistance * (1 + strength);
}

export function DynamicResponseChart({
  stages,
  timeUnit,
  onTimeUnitChange,
  material,
  sensorType,
  temperature,
  baseResistance = 5_000_000,
  liveData = [],
  backendTimeUnit,
  backendResistanceUnit,
}: Props) {
  const resolvedTimeUnit = normalizeDisplayTimeUnit(backendTimeUnit ?? timeUnit);
  const resolvedResistanceUnit = normalizeDisplayResistanceUnit(backendResistanceUnit);

  const canGenerateCurve = liveData.some(
    (row) =>
      Number.isFinite(row.resistance ?? NaN) ||
      (Number.isFinite(row.response ?? NaN) && Boolean(row.equation)),
  );

  const chartData = useMemo<ChartPoint[]>(() => {
    if (!canGenerateCurve || stages.length === 0) {
      return [];
    }

    const kin = MATERIAL_KINETICS[material] ?? { tauResp: 5, tauRec: 6 };
    const baselineResistance = inferBaselineResistance(liveData, sensorType, baseResistance);

    const points: ChartPoint[] = [];
    let currentTime = 0;
    let currentResistance = baselineResistance;

    for (const stage of stages) {
      const durationSeconds = Number(stage.duration) * TIME_FACTORS[resolvedTimeUnit];
      const targetResistance = inferStageTarget(
        stage,
        liveData,
        material,
        sensorType,
        temperature,
      );

      const stageLabel =
        stage.type === "air"
          ? "Air"
          : `${formatChemicalFormula(stage.gas ?? "Gas")} · ${stage.concentration ?? 0} ppm`;

      const tau = stage.type === "air" ? kin.tauRec : kin.tauResp;
      const samples = Math.max(3, Math.min(140, Math.round(durationSeconds / 5)));

      for (let index = 0; index < samples; index += 1) {
        const localTime = (index / Math.max(samples - 1, 1)) * durationSeconds;
        const k = 1 - Math.exp(-localTime / Math.max(tau, 0.1));
        const resistance = currentResistance + (targetResistance - currentResistance) * k;

        points.push({
          t: currentTime + localTime,
          resistance,
          stage: stageLabel,
        });
      }

      currentTime += durationSeconds;
      currentResistance = targetResistance;
    }

    return points;
  }, [baseResistance, canGenerateCurve, liveData, material, resolvedTimeUnit, sensorType, stages, temperature]);

  const segments = useMemo<Segment[]>(() => {
    if (chartData.length === 0) {
      return [];
    }

    return stages.map((stage, index) => {
      const start = stages
        .slice(0, index)
        .reduce((acc, current) => acc + Number(current.duration) * TIME_FACTORS[resolvedTimeUnit], 0);
      const end = start + Number(stage.duration) * TIME_FACTORS[resolvedTimeUnit];

      return {
        x1: start / TIME_FACTORS[resolvedTimeUnit],
        x2: end / TIME_FACTORS[resolvedTimeUnit],
        label:
          stage.type === "air"
            ? index === 0
              ? "Air baseline"
              : "Air recovery"
            : `${stage.gas ?? "Gas"} · ${stage.concentration ?? 0} ppm`,
        kind: stage.type,
      };
    });
  }, [chartData.length, resolvedTimeUnit, stages]);

  const displayTimeScale = TIME_FACTORS[resolvedTimeUnit];

  const chartDisplayData = useMemo(
    () =>
      chartData.map((point) => ({
        ...point,
        t: point.t / displayTimeScale,
      })),
    [chartData, displayTimeScale],
  );

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-elegant">
      <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
        <div>
          <h3 className="font-display font-semibold text-base">Dynamic Resistance vs Time</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {material} · {sensorType} · {temperature}°C
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-sm bg-muted-foreground/30" /> Air baseline / recovery
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-sm bg-primary/50" /> Gas exposure
          </span>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-2.5 py-1.5">
          <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Resistance
          </span>
          <Select value={resolvedResistanceUnit} onValueChange={() => undefined} disabled>
            <SelectTrigger className="h-8 min-w-[84px] text-sm border-0 bg-transparent p-0 shadow-none focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Ω">Ω</SelectItem>
              <SelectItem value="kΩ">kΩ</SelectItem>
              <SelectItem value="MΩ">MΩ</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-2.5 py-1.5">
          <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Time
          </span>
          <Select value={resolvedTimeUnit} onValueChange={() => undefined} disabled>
            <SelectTrigger className="h-8 min-w-[92px] text-sm border-0 bg-transparent p-0 shadow-none focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="s">seconds</SelectItem>
              <SelectItem value="min">minutes</SelectItem>
              <SelectItem value="h">hours</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="h-96 w-full">
        {chartDisplayData.length === 0 ? (
          <div className="h-full grid place-items-center text-sm text-muted-foreground border border-dashed border-border rounded-xl px-4 text-center">
            Resistance curve cannot be generated from available data.
          </div>
        ) : (
          <ResponsiveContainer>
            <LineChart data={chartDisplayData} margin={{ top: 24, right: 24, bottom: 32, left: 64 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="t"
                stroke="var(--muted-foreground)"
                fontSize={11}
                tickFormatter={(value) => formatTime(Number(value))}
                label={{
                  value: `Time (${resolvedTimeUnit === "s" ? "seconds" : resolvedTimeUnit === "min" ? "minutes" : "hours"})`,
                  position: "insideBottom",
                  offset: -16,
                  fill: "var(--muted-foreground)",
                  fontSize: 11,
                }}
              />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={11}
                tickFormatter={(value) => formatResistance(Number(value))}
                label={{
                  value: `Resistance (${resolvedResistanceUnit})`,
                  angle: -90,
                  position: "insideLeft",
                  offset: -8,
                  fill: "var(--muted-foreground)",
                  fontSize: 11,
                }}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value: number) => [`${formatResistance(Number(value))} ${resolvedResistanceUnit}`, "Resistance"]}
                labelFormatter={(label) => `${formatTime(Number(label))} ${resolvedTimeUnit === "s" ? "s" : resolvedTimeUnit === "min" ? "min" : "h"}`}
              />

              {segments.map((segment, index) => (
                <ReferenceArea
                  key={`${segment.label}-${index}`}
                  x1={segment.x1}
                  x2={segment.x2}
                  fill={segment.kind === "air" ? "var(--muted)" : "var(--primary)"}
                  fillOpacity={segment.kind === "air" ? 0.05 : 0.08}
                  label={{
                    value: segment.label,
                    position: "insideTop",
                    fontSize: 10,
                    fill: segment.kind === "air" ? "var(--muted-foreground)" : "var(--primary)",
                  }}
                />
              ))}

              <Line
                type="monotone"
                dataKey="resistance"
                stroke="var(--primary)"
                strokeWidth={2}
                dot={false}
                animationDuration={500}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
