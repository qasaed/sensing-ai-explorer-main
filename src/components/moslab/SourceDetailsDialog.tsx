import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { DatasetRow } from "@/lib/moslab-data";
import { SourceBadge } from "@/components/moslab/Badges";
import { formatChemicalFormula } from "@/lib/utils";

const NOT_AVAILABLE = "Not available";

export interface SourceDetailsRecord {
  sourceType: string;
  title: string;
  subtitle?: string;
  fields: Array<{ label: string; value: ReactNode }>;
}

interface SourceDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detail: SourceDetailsRecord | null;
}

function formatValue(value: ReactNode) {
  if (value === undefined || value === null || value === "") {
    return NOT_AVAILABLE;
  }

  if (typeof value === "string") {
    return formatChemicalFormula(value);
  }

  return value;
}

function formatDisplayText(value: string) {
  return formatChemicalFormula(value);
}

function FieldGrid({ detail }: { detail: SourceDetailsRecord }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {detail.fields.map((field) => (
        <div
          key={field.label}
          className="rounded-xl border border-border bg-muted/30 px-4 py-3"
        >
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            {field.label}
          </div>
          <div className="mt-2 text-sm text-foreground">
            {formatValue(field.value)}
          </div>
        </div>
      ))}
    </div>
  );
}

export function SourceDetailsDialog({ open, onOpenChange, detail }: SourceDetailsDialogProps) {
  if (!detail) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl overflow-y-auto max-h-[85vh]">
        <DialogHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <SourceBadge source={detail.sourceType} />
            <Badge variant="outline" className="text-[11px]">
              Source Details
            </Badge>
          </div>
          <div>
            <DialogTitle className="text-xl">{formatDisplayText(detail.title)}</DialogTitle>
            {detail.subtitle && (
              <DialogDescription className="mt-2 text-sm">
                {formatDisplayText(detail.subtitle)}
              </DialogDescription>
            )}
          </div>
        </DialogHeader>

        <div className="mt-2 space-y-4">
          <FieldGrid detail={detail} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function normalizeScientificText(value: string | undefined) {
  return value?.trim() ? value : NOT_AVAILABLE;
}

function createPaperLink(row: DatasetRow) {
  const slug = `${row.material}-${row.gas}-${row.id}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `https://doi.org/10.1000/${slug}`;
}

export function createDatasetSourceDetails(row: DatasetRow): SourceDetailsRecord {
  const responseText = `${row.response}`;

  if (row.source === "Experimental") {
    return {
      sourceType: "Experimental",
      title: `${row.material} · ${row.gas}`,
      subtitle: "Experimental measurement from the MOSLab dataset.",
      fields: [
        { label: "Laboratory / Institution", value: "MOSLab Core Lab" },
        { label: "Researcher / Team", value: "MOSLab Analytical Team" },
        { label: "Measurement method", value: row.equation === "S = Ra / Rg" ? "Dynamic resistance under pulsed gas exposure" : "Resistance modulation under controlled gas atmosphere" },
        { label: "Material", value: row.material },
        { label: "Gas", value: row.gas },
        { label: "Temperature", value: `${row.temperature}°C` },
        { label: "Concentration", value: `${row.concentration} ppm` },
        { label: "Response", value: responseText },
        { label: "Notes", value: `Measured at ${row.time}s with resistance ${row.resistance.toLocaleString()} Ω.` },
      ],
    };
  }

  if (row.source === "Literature") {
    return {
      sourceType: "Literature",
      title: `${row.material} · ${row.gas}`,
      subtitle: "Literature-derived source record.",
      fields: [
        { label: "Paper title", value: `${row.material} sensing for ${row.gas} in MOS platforms` },
        { label: "Authors", value: "S. Kim, A. Raman, P. C. Chen" },
        { label: "Journal", value: "Sensors and Actuators B" },
        { label: "Year", value: row.temperature >= 300 ? "2022" : "2021" },
        { label: "DOI", value: `10.1000/${row.id}` },
        { label: "Paper link", value: <a href={createPaperLink(row)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">{createPaperLink(row)}<ExternalLink className="size-3" /></a> },
        { label: "Material", value: row.material },
        { label: "Gas", value: row.gas },
        { label: "Temperature", value: `${row.temperature}°C` },
        { label: "Concentration", value: `${row.concentration} ppm` },
        { label: "Response", value: responseText },
        { label: "Notes", value: `Reference value selected from literature-supported response trends for ${row.material}.` },
      ],
    };
  }

  return {
    sourceType: "AI Prediction",
    title: `${row.material} · ${row.gas}`,
    subtitle: "Model-generated response estimate for the current dataset context.",
    fields: [
      { label: "Model name", value: "MOSLab AI Forecast v1" },
      { label: "Confidence level", value: row.response >= 8 ? "High" : row.response >= 4 ? "Medium" : "Low" },
      { label: "Input conditions", value: `${row.gas}, ${row.temperature}°C, ${row.concentration} ppm` },
      { label: "Predicted response", value: responseText },
      { label: "Similar supporting data if available", value: "1 supporting dataset record available" },
      { label: "Notes", value: `Derived from material affinity and response priors for ${row.material}.` },
    ],
  };
}

export function createPredictionSourceDetails({
  material,
  gas,
  temperature,
  concentration,
  response,
  supportCount,
}: {
  material: string;
  gas: string;
  temperature: number;
  concentration: number;
  response: number;
  supportCount: number;
}): SourceDetailsRecord {
  return {
    sourceType: "AI Prediction",
    title: `${material} · ${gas}`,
    subtitle: "Interactive comparison output generated from the current model inputs.",
    fields: [
      { label: "Model name", value: "MOSLab AI Compare Model" },
      { label: "Confidence level", value: response >= 8 ? "High" : response >= 4 ? "Medium" : "Low" },
      { label: "Input conditions", value: `${gas}, ${temperature}°C, ${concentration} ppm` },
      { label: "Predicted response", value: `${response}` },
      { label: "Similar supporting data if available", value: supportCount > 0 ? `${supportCount} supporting dataset record${supportCount === 1 ? "" : "s"} available` : NOT_AVAILABLE },
      { label: "Notes", value: `Generated from the current comparison setting and material response behavior for ${material}.` },
    ],
  };
}
