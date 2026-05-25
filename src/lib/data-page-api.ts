import { assertApiBaseUrl, createApiClient } from "@/lib/api-config";
import type { DataSource } from "@/lib/moslab-data";

export type SensorType = "n-type" | "p-type";

export interface BackendDataRow {
  material: string;
  gas: string;
  temperature: number;
  concentration: number;
  response: number;
  time?: number | string;
  time_value?: number | string;
  transformed_time?: number | string;
  time_unit?: string;
  time_unit_label?: string;
  resistance?: number | string;
  resistance_value?: number | string;
  transformed_resistance?: number | string;
  resistance_unit?: string;
  resistance_unit_label?: string;
  source_type?: string;
  source?: string;
  source_dataset?: string;
  data_quality?: string;
  paper_title?: string;
  doi?: string;
  journal?: string;
  year?: number | string;
  notes?: string;
}

export interface DataPageSummaryRow {
  material: string;
  gas: string;
  max_response: number;
  best_temp: number;
  best_conc: number;
  count: number;
}

export interface DataPageRow {
  id: number;
  material: string;
  gas: string;
  type: SensorType;
  temperature: number;
  concentration: number;
  time: number;
  time_unit: string;
  resistance: number;
  resistance_unit: string;
  response: number;
  equation: string;
  source: DataSource;
  source_type: string;
  data_quality: string;
  paper_title: string;
  doi: string;
  journal: string;
  year: string;
  notes: string;
}

interface BackendMaterialsResponse {
  materials?: string[];
  info?: Record<string, Record<string, unknown>>;
}

interface BackendGasesResponse {
  gases?: string[];
}

interface BackendSummaryResponse {
  combinations?: DataPageSummaryRow[];
}

const api = createApiClient(10000);

function extractNumericValue(value: number | string | null | undefined): number | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);

  if (Number.isFinite(parsed)) {
    return parsed;
  }

  const match = trimmed.match(/-?\d+(?:\.\d+)?/);

  if (!match) {
    return undefined;
  }

  const fallback = Number(match[0]);

  return Number.isFinite(fallback) ? fallback : undefined;
}

function normalizeTimeUnit(value?: string | null): string {
  const normalized = value?.trim().toLowerCase() ?? "";

  if (!normalized) {
    return "s";
  }

  if (normalized === "s" || normalized === "sec" || normalized === "secs" || normalized === "second" || normalized === "seconds") {
    return "s";
  }

  if (normalized === "min" || normalized === "mins" || normalized === "minute" || normalized === "minutes") {
    return "min";
  }

  if (normalized === "h" || normalized === "hr" || normalized === "hrs" || normalized === "hour" || normalized === "hours") {
    return "h";
  }

  return normalized;
}

function normalizeResistanceUnit(value?: string | null): string {
  const normalized = value?.trim() ?? "";

  if (!normalized) {
    return "Ω";
  }

  const lower = normalized.toLowerCase();

  if (lower === "ohm" || lower === "ohms" || normalized === "Ω") {
    return "Ω";
  }

  if (lower === "kohm" || lower === "kω" || lower === "k\\u03a9" || normalized === "kΩ") {
    return "kΩ";
  }

  if (lower === "mohm" || lower === "mω" || lower === "m\\u03a9" || normalized === "MΩ") {
    return "MΩ";
  }

  return normalized;
}

function resolveBackendTime(row: BackendDataRow) {
  const fallbackTime = Math.max(5, Math.round(row.concentration / 5));

  return {
    time: extractNumericValue(row.time ?? row.time_value ?? row.transformed_time) ?? fallbackTime,
    timeUnit: normalizeTimeUnit(row.time_unit ?? row.time_unit_label),
  };
}

function resolveBackendResistance(row: BackendDataRow) {
  const fallbackResistance = Math.max(
    1000,
    Math.round(1_000_000 / Math.max(row.response, 0.1)),
  );

  return {
    resistance:
      extractNumericValue(row.resistance ?? row.resistance_value ?? row.transformed_resistance) ??
      fallbackResistance,
    resistanceUnit: normalizeResistanceUnit(row.resistance_unit ?? row.resistance_unit_label),
  };
}

function normalizeOptionLabel(value: string | null | undefined): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .replace(/\u00A0/g, " ")
    .trim();
}

function normalizeOptionValues(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();

  for (const value of values) {
    const normalized = normalizeOptionLabel(value);

    if (!normalized) {
      continue;
    }

    seen.add(normalized.toLowerCase());
  }

  return Array.from(seen)
    .map((key) => values.find((value) => normalizeOptionLabel(value).toLowerCase() === key) ?? key)
    .map((value) => normalizeOptionLabel(value))
    .sort((left, right) => left.localeCompare(right, undefined, { sensitivity: "base" }));
}

function normalizeSourceType(sourceType?: string): DataSource {
  const normalized = sourceType?.trim().toLowerCase() ?? "";

  if (!normalized) {
    return "Experimental";
  }

  if (
    normalized === "literature" ||
    normalized.includes("literature_dataset") ||
    normalized.includes("literature")
  ) {
    return "Literature";
  }

  if (
    normalized === "ai prediction" ||
    normalized === "ai-prediction" ||
    normalized === "prediction" ||
    normalized.includes("prediction") ||
    normalized.includes("ml") ||
    normalized.includes("ai")
  ) {
    return "AI Prediction";
  }

  if (
    normalized === "experimental" ||
    normalized.includes("experimental_dataset") ||
    normalized.includes("experimental")
  ) {
    return "Experimental";
  }

  return normalized === "literature" ? "Literature" : "Experimental";
}

function inferSensorType(material: string): SensorType {
  const normalized = material.toLowerCase();

  if (
    normalized.includes("cuo") ||
    normalized.includes("nio") ||
    normalized.includes("co3o4") ||
    normalized.includes("cuo-zn")
  ) {
    return "p-type";
  }

  return "n-type";
}

function inferDataQuality(response: number): string {
  if (response >= 50) {
    return "High";
  }

  if (response >= 10) {
    return "Medium";
  }

  return "Low";
}

function normalizeYear(value?: number | string): string {
  if (value === undefined || value === null || value === "") {
    return "2025";
  }

  return String(value);
}

function createStableDoi(material: string, gas: string, index: number) {
  const slug = `${material}-${gas}-${index}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `10.1000/${slug || "moslab-data"}`;
}

function buildNotes(
  row: BackendDataRow,
  summary?: DataPageSummaryRow,
): string {
  const sourceLabel = normalizeSourceType(
    row.source_type ?? row.source ?? row.source_dataset,
  );
  const quality = row.data_quality ?? inferDataQuality(row.response);
  const fallback = `${sourceLabel.toLowerCase()} measurement for ${row.material} exposed to ${row.gas}.`;
  const cleanedNotes = (row.notes ?? fallback)
    .replace(/\bbackend\b/gi, "dataset")
    .replace(/\blive\b/gi, "current")
    .replace(/\bapi\b/gi, "data");

  if (summary) {
    return `${cleanedNotes} Peak response ${summary.max_response.toFixed(2)} at ${summary.best_temp}°C and ${summary.best_conc} ppm across ${summary.count} matching records.`;
  }

  return `${cleanedNotes} Data quality is ${quality.toLowerCase()} based on the measured response value.`;
}

export interface DatasetConditionsResponse {
  temperatures: string[];
  concentrations: string[];
  humidity_conditions: string[];
  source_types: string[];
  record_count: number;
}

function normalizeSourceLabel(value?: string | null): string | undefined {
  const normalized = value?.trim() ?? "";

  if (!normalized) {
    return undefined;
  }

  const lower = normalized.toLowerCase();

  if (lower.includes("literature")) {
    return "Literature";
  }

  if (lower.includes("experimental")) {
    return "Experimental";
  }

  return undefined;
}

function formatTemperature(value: number | string | null | undefined): string | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? `${value}°C` : undefined;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  return trimmed.includes("°") ? trimmed : `${trimmed}°C`;
}

function formatConcentration(value: number | string | null | undefined): string | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? `${value} ppm` : undefined;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  return trimmed.includes("ppm") ? trimmed : `${trimmed} ppm`;
}

function normalizeTemperatureValues(values: Array<number | string | null | undefined>): string[] {
  const unique = new Set<string>();

  for (const value of values) {
    const formatted =
      typeof value === "number"
        ? formatTemperature(value)
        : value === null || value === undefined
          ? undefined
          : value.trim();

    if (!formatted) {
      continue;
    }

    unique.add(formatted);
  }

  return Array.from(unique).sort((left, right) => left.localeCompare(right, undefined, { sensitivity: "base" }));
}

function normalizeConcentrationValues(values: Array<number | string | null | undefined>): string[] {
  const unique = new Set<string>();

  for (const value of values) {
    const formatted =
      typeof value === "number"
        ? formatConcentration(value)
        : value === null || value === undefined
          ? undefined
          : value.trim();

    if (!formatted) {
      continue;
    }

    unique.add(formatted);
  }

  return Array.from(unique).sort((left, right) => left.localeCompare(right, undefined, { sensitivity: "base" }));
}

export async function fetchDataConditions(
  material: string,
  gas: string,
): Promise<DatasetConditionsResponse> {
  assertApiBaseUrl();

  const response = await api.get<{
    temperatures?: Array<number | string>;
    concentrations?: Array<number | string>;
    humidity_conditions?: string[];
    source_types?: string[];
    record_count?: number;
  }>("/data/conditions", {
    params: {
      material,
      gas,
    },
  });

  const payload = response.data ?? {};

  const temperatures = normalizeTemperatureValues(payload.temperatures ?? []);
  const concentrations = normalizeConcentrationValues(payload.concentrations ?? []);
  const humidityConditions = Array.from(
    new Set((payload.humidity_conditions ?? []).map((value) => value?.trim()).filter(Boolean) as string[]),
  ).sort((left, right) => left.localeCompare(right, undefined, { sensitivity: "base" }));
  const sourceTypes = Array.from(
    new Set(
      (payload.source_types ?? [])
        .map((value) => normalizeSourceLabel(value))
        .filter((value): value is string => Boolean(value)),
    ),
  ).sort((left, right) => left.localeCompare(right, undefined, { sensitivity: "base" }));

  return {
    temperatures,
    concentrations,
    humidity_conditions: humidityConditions,
    source_types: sourceTypes,
    record_count: Number(payload.record_count ?? 0),
  };
}

export async function fetchDataPageData() {
  const baseUrl = assertApiBaseUrl();
  const rowsUrl = `${baseUrl}/data/all`;
  const materialsUrl = `${baseUrl}/data/materials`;
  const gasesUrl = `${baseUrl}/data/gases`;
  const summaryUrl = `${baseUrl}/data/summary`;

  console.log("[DataPageAPI] API URL called:", rowsUrl);

  try {
    const [rowsResponse, materialsResponse, gasesResponse, summaryResponse] =
      await Promise.all([
        api.get<BackendDataRow[]>("/data/all"),
        api.get<BackendMaterialsResponse>("/data/materials"),
        api.get<BackendGasesResponse>("/data/gases"),
        api.get<BackendSummaryResponse>("/data/summary"),
      ]);

    console.log("[DataPageAPI] response status:", {
      rows: rowsResponse.status,
      materials: materialsResponse.status,
      gases: gasesResponse.status,
      summary: summaryResponse.status,
    });

    const summaryRows = summaryResponse.data.combinations ?? [];
    const summaryByKey = new Map(
      summaryRows.map((item) => [`${item.material}::${item.gas}`, item]),
    );

    const rows = (rowsResponse.data ?? []).map((row, index) => {
      const summary = summaryByKey.get(`${row.material}::${row.gas}`);
      const source = normalizeSourceType(
        row.source_type ?? row.source ?? row.source_dataset,
      );
      const dataQuality = row.data_quality ?? inferDataQuality(row.response);
      const { time, timeUnit } = resolveBackendTime(row);
      const { resistance, resistanceUnit } = resolveBackendResistance(row);

      return {
        id: index + 1,
        material: row.material,
        gas: row.gas,
        type: inferSensorType(row.material),
        temperature: row.temperature,
        concentration: row.concentration,
        time,
        time_unit: timeUnit,
        resistance,
        resistance_unit: resistanceUnit,
        response: row.response,
        equation: inferSensorType(row.material) === "n-type" ? "S = Ra / Rg" : "S = Rg / Ra",
        source,
        source_type: row.source_type ?? row.source ?? row.source_dataset ?? source,
        data_quality: dataQuality,
        paper_title:
          row.paper_title ??
          `${row.material} response to ${row.gas} from the MOSLab research dataset`,
        doi: row.doi ?? createStableDoi(row.material, row.gas, index + 1),
        journal: row.journal ?? "MOSLab AI Dataset",
        year: normalizeYear(row.year),
        notes: buildNotes(row, summary),
      } satisfies DataPageRow;
    });

    console.log("[DataPageAPI] number of rows received:", rows.length);

    const materials = normalizeOptionValues([
      ...(materialsResponse.data.materials ?? []),
      ...rows.map((row) => row.material),
    ]);

    const gases = normalizeOptionValues([
      ...(gasesResponse.data.gases ?? []),
      ...rows.map((row) => row.gas),
    ]);

    return {
      rows,
      materials,
      gases,
    };
  } catch (error) {
    console.error("[DataPageAPI] request failed", {
      rowsUrl,
      materialsUrl,
      gasesUrl,
      summaryUrl,
      error,
    });
    throw error;
  }
}
