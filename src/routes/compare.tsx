import { createFileRoute } from "@tanstack/react-router";
import { Plus, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { PageHeader } from "@/components/moslab/PageHeader";
import {
  MetricCard,
  ResponseEquationBadge,
  SensorTypeBadge,
} from "@/components/moslab/Badges";
import {
  SourceDetailsDialog,
  type SourceDetailsRecord,
} from "@/components/moslab/SourceDetailsDialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  fetchDataConditions,
  fetchDataPageData,
  type DataPageRow,
  type DatasetConditionsResponse,
} from "@/lib/data-page-api";
import { getApiUnavailableMessage } from "@/lib/api-config";
import { formatChemicalFormula } from "@/lib/utils";

export const Route = createFileRoute("/compare")({
  head: () => ({
    meta: [
      { title: "Compare · MOSLab AI" },
      { name: "description", content: "Compare MOS materials under common temperature and concentration conditions." },
    ],
  }),
  component: ComparePage,
});

const MATERIAL_COLOR_MAP: Record<string, string> = {
  ZnO: "#8b5cf6",
  SnO2: "#ec4899",
  WO3: "#3b82f6",
  TiO2: "#0ea5e9",
  MoO3: "#f59e0b",
};

const fallbackColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--primary)",
];

interface ComparisonItem {
  material: string;
  response: number;
  temperature: number;
  color: string;
  type: DataPageRow["type"];
  equation: string;
  gas: string;
  concentration: number;
}

function normalizeMaterialKey(material: string) {
  return material.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function getMaterialColor(material: string) {
  const direct = MATERIAL_COLOR_MAP[material];
  if (direct) {
    return direct;
  }

  const normalized = normalizeMaterialKey(material);
  const mapped = Object.entries(MATERIAL_COLOR_MAP).find(
    ([key]) => normalizeMaterialKey(key) === normalized,
  );

  if (mapped) {
    return mapped[1];
  }

  return fallbackColors[Math.abs(material.length) % fallbackColors.length];
}

function getInterpolatedResponse(rows: DataPageRow[], temperature: number) {
  if (rows.length === 0) {
    return null;
  }

  const sortedRows = [...rows].sort((left, right) => left.temperature - right.temperature);
  const exact = sortedRows.find((row) => row.temperature === temperature);
  if (exact) {
    return Number(exact.response.toFixed(2));
  }

  const lower = sortedRows.filter((row) => row.temperature <= temperature).at(-1);
  const upper = sortedRows.find((row) => row.temperature >= temperature);

  if (!lower || !upper) {
    return Number((lower ?? upper)?.response.toFixed(2) ?? null);
  }

  if (lower.temperature === upper.temperature) {
    return Number(lower.response.toFixed(2));
  }

  const ratio =
    (temperature - lower.temperature) / (upper.temperature - lower.temperature);

  return Number(
    (lower.response + (upper.response - lower.response) * ratio).toFixed(2),
  );
}

function buildComparisonDetail(
  row: DataPageRow | undefined,
  material: string,
  gas: string,
  temperature: number,
  concentration: number,
): SourceDetailsRecord {
  const source = row?.source_type ?? row?.source ?? "Experimental";
  const title = `${material} · ${gas}`;

  return {
    sourceType: source,
    title,
    subtitle: `Curated ${source.toLowerCase()} comparison record for ${material} at ${temperature}°C.`,
    fields: [
      { label: "Paper_Title", value: row?.paper_title ?? "Not available" },
      { label: "DOI", value: row?.doi ?? "Not available" },
      { label: "Journal", value: row?.journal ?? "Not available" },
      { label: "Year", value: row?.year ?? "Not available" },
      { label: "Source_Type", value: source },
      { label: "Data_Quality", value: row?.data_quality ?? "Not available" },
      { label: "Notes", value: row?.notes ?? "Not available" },
      { label: "Material", value: material },
      { label: "Gas", value: gas },
      { label: "Temperature", value: `${temperature}°C` },
      { label: "Concentration", value: `${concentration} ppm` },
      { label: "Response", value: row ? `${row.response}` : "Not available" },
    ],
  };
}

function ComparePage() {
  const [liveRows, setLiveRows] = useState<DataPageRow[]>([]);
  const [availableMaterials, setAvailableMaterials] = useState<string[]>([]);
  const [availableGases, setAvailableGases] = useState<string[]>([]);
  const [gas, setGas] = useState("");
  const [conditionHints, setConditionHints] = useState<Record<string, DatasetConditionsResponse | null>>({});
  const [temperatureInputs, setTemperatureInputs] = useState(["200", "250", "300"]);
  const [concentration, setConcentration] = useState(50);
  const [materialSearch, setMaterialSearch] = useState("");
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [sourceDialogOpen, setSourceDialogOpen] = useState(false);
  const [selectedSourceDetail, setSelectedSourceDetail] = useState<SourceDetailsRecord | null>(
    null,
  );
  const [dataError, setDataError] = useState<string | null>(null);

  const materialOptionsForGas = useMemo(() => {
    if (!gas) {
      return availableMaterials;
    }

    return Array.from(
      new Set(liveRows.filter((row) => row.gas === gas).map((row) => row.material)),
    ).sort((left, right) => left.localeCompare(right, undefined, { sensitivity: "base" }));
  }, [availableMaterials, gas, liveRows]);

  const gasOptionsForMaterials = useMemo(() => {
    if (selectedMaterials.length === 0) {
      return availableGases;
    }

    return Array.from(
      new Set(
        selectedMaterials.flatMap((material) =>
          liveRows.filter((row) => row.material === material).map((row) => row.gas),
        ),
      ),
    ).sort((left, right) => left.localeCompare(right, undefined, { sensitivity: "base" }));
  }, [availableGases, liveRows, selectedMaterials]);

  useEffect(() => {
    let active = true;

    async function loadData() {
      setDataError(null);

      try {
        const response = await fetchDataPageData();

        if (!active) {
          return;
        }

        setLiveRows(response.rows);
        setAvailableMaterials(response.materials);
        setAvailableGases(response.gases);
        setGas((current) => (response.gases.includes(current) ? current : response.gases[0] ?? ""));
      } catch {
        if (!active) {
          return;
        }

        setLiveRows([]);
        setAvailableMaterials([]);
        setAvailableGases([]);
        setGas("");
        setDataError(getApiUnavailableMessage());
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (gasOptionsForMaterials.length === 0) {
      if (gas !== "") {
        setGas("");
      }
      return;
    }

    if (!gasOptionsForMaterials.includes(gas)) {
      setGas(gasOptionsForMaterials[0]);
    }
  }, [gas, gasOptionsForMaterials]);

  useEffect(() => {
    if (selectedMaterials.length === 0) {
      return;
    }

    const nextSelectedMaterials = selectedMaterials.filter((material) =>
      materialOptionsForGas.includes(material),
    );

    if (nextSelectedMaterials.length !== selectedMaterials.length) {
      setSelectedMaterials(nextSelectedMaterials);
    }
  }, [materialOptionsForGas, selectedMaterials]);

  useEffect(() => {
    if (!gas || selectedMaterials.length === 0) {
      setConditionHints({});
      return;
    }

    let active = true;

    async function loadConditions() {
      const nextHints = await Promise.all(
        selectedMaterials.map(async (material) => {
          try {
            const conditions = await fetchDataConditions(material, gas);
            return [material, conditions] as const;
          } catch {
            const matches = liveRows.filter(
              (row) => row.material === material && row.gas === gas,
            );

            const temperatures = Array.from(new Set(matches.map((row) => `${row.temperature}°C`))).sort(
              (left, right) =>
                Number(left.replace(/[^0-9.-]/g, "")) -
                Number(right.replace(/[^0-9.-]/g, "")),
            );
            const concentrations = Array.from(
              new Set(matches.map((row) => `${row.concentration} ppm`)),
            ).sort(
              (left, right) =>
                Number(left.replace(/[^0-9.-]/g, "")) -
                Number(right.replace(/[^0-9.-]/g, "")),
            );

            return [
              material,
              {
                temperatures,
                concentrations,
                humidity_conditions: [],
                source_types: Array.from(
                  new Set(
                    matches
                      .map((row) => row.source_type ?? row.source)
                      .filter((value) => value === "Experimental" || value === "Literature"),
                  ),
                ).sort((left, right) =>
                  left.localeCompare(right, undefined, { sensitivity: "base" }),
                ),
                record_count: matches.length,
              },
            ] as const;
          }
        }),
      );

      if (!active) {
        return;
      }

      setConditionHints(Object.fromEntries(nextHints));
    }

    loadConditions();

    return () => {
      active = false;
    };
  }, [gas, liveRows, selectedMaterials]);

  const temperatureValues = useMemo(() => {
    const parsed = temperatureInputs
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isFinite(value) && value > 0)
      .map((value) => Math.round(value));

    return Array.from(new Set(parsed)).sort((a, b) => a - b);
  }, [temperatureInputs]);

  const addTemperature = () => {
    setTemperatureInputs((current) => [...current, ""]);
  };

  const updateTemperature = (index: number, value: string) => {
    setTemperatureInputs((current) =>
      current.map((item, currentIndex) => (currentIndex === index ? value : item)),
    );
  };

  const removeTemperature = (index: number) => {
    setTemperatureInputs((current) => {
      if (current.length === 1) {
        return current;
      }

      return current.filter((_, currentIndex) => currentIndex !== index);
    });
  };

  const toggleMaterial = (material: string) => {
    setSelectedMaterials((current) => {
      if (current.includes(material)) {
        return current.filter((item) => item !== material);
      }

      return [...current, material];
    });
  };

  const filteredMaterials = useMemo(() => {
    const term = materialSearch.trim().toLowerCase();
    const options = materialOptionsForGas;

    const filtered = term
      ? options.filter((material) => material.toLowerCase().includes(term))
      : options;

    return filtered;
  }, [materialOptionsForGas, materialSearch]);

  const materialData = useMemo(() => {
    const rowsByMaterial = new Map<string, DataPageRow[]>();

    for (const row of liveRows) {
      const key = row.material;
      const bucket = rowsByMaterial.get(key) ?? [];
      bucket.push(row);
      rowsByMaterial.set(key, bucket);
    }

    return rowsByMaterial;
  }, [liveRows]);

  const comparisonData = useMemo<ComparisonItem[]>(() => {
    if (selectedMaterials.length === 0 || temperatureValues.length === 0) {
      return [];
    }

    return selectedMaterials
      .map((material) => {
        const rows = materialData
          .get(material)
          ?.filter(
            (row) => row.gas === gas && row.concentration === concentration,
          ) ?? [];

        if (rows.length === 0) {
          return null;
        }

        const best = temperatureValues
          .map((temperature) => ({
            temperature,
            response: getInterpolatedResponse(rows, temperature),
          }))
          .filter((item): item is { temperature: number; response: number } => item.response !== null)
          .reduce(
            (current, item) =>
              item.response > current.response
                ? item
                : current,
            { temperature: temperatureValues[0], response: 0 },
          );

        const representative = rows[0];

        return {
          material,
          response: best.response,
          temperature: best.temperature,
          color: getMaterialColor(material),
          type: representative.type,
          equation: representative.equation,
          gas,
          concentration,
        };
      })
      .filter((item): item is ComparisonItem => item !== null);
  }, [concentration, gas, materialData, selectedMaterials, temperatureValues]);

  const chartData = useMemo(() => {
    if (selectedMaterials.length === 0 || temperatureValues.length === 0) {
      return [];
    }

    return temperatureValues.map((temperature) => {
      const row: Record<string, number | string | null> = { temperature };

      selectedMaterials.forEach((material) => {
        const rows = materialData
          .get(material)
          ?.filter((item) => item.gas === gas && item.concentration === concentration) ?? [];

        row[material] = getInterpolatedResponse(rows, temperature);
      });

      return row;
    });
  }, [concentration, gas, materialData, selectedMaterials, temperatureValues]);

  const best = useMemo(() => {
    if (comparisonData.length === 0) {
      return { material: "—", response: 0, temperature: "—" };
    }

    return comparisonData.reduce((current, item) =>
      item.response > current.response ? item : current,
    );
  }, [comparisonData]);

  const temperatureRange =
    temperatureValues.length > 0
      ? `${temperatureValues[0]}–${temperatureValues[temperatureValues.length - 1]}°C`
      : "No temperatures";

  const openComparisonSourceDetails = (material: string, temperature: number) => {
    const rows = materialData
      .get(material)
      ?.filter((row) => row.gas === gas && row.concentration === concentration) ?? [];

    const nearest = rows
      .map((row) => ({ row, distance: Math.abs(row.temperature - temperature) }))
      .sort((left, right) => left.distance - right.distance)[0]?.row;

    setSelectedSourceDetail(buildComparisonDetail(nearest, material, gas, temperature, concentration));
    setSourceDialogOpen(true);
  };

  const showDataPlaceholder =
    selectedMaterials.length === 0 || temperatureValues.length === 0;

  const showNoResultsPlaceholder =
    !showDataPlaceholder && comparisonData.length === 0;

  const conditionCards = selectedMaterials
    .filter((material) => conditionHints[material])
    .map((material) => ({
      material,
      conditions: conditionHints[material],
    }));

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Compare"
        title="Temperature-dependent material comparison"
        description="Compare selected MOS materials under shared gas and concentration conditions across a temperature range."
      />

      {dataError ? (
        <Alert variant="destructive">
          <AlertTitle>Backend unavailable</AlertTitle>
          <AlertDescription>{dataError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-elegant">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Gas
              </Label>
              <div className="mt-1.5">
                <SearchableSelect
                  value={gas}
                  onValueChange={setGas}
                  options={gasOptionsForMaterials.map((item) => ({
                    label: formatChemicalFormula(item),
                    value: item,
                  }))}
                  placeholder={gasOptionsForMaterials.length > 0 ? "Select a gas" : "Loading gases…"}
                  disabled={gasOptionsForMaterials.length === 0}
                />
              </div>
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Concentration (ppm)
              </Label>
              <Input
                className="mt-1.5"
                type="number"
                value={concentration}
                min={1}
                step={1}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  if (!Number.isNaN(next)) setConcentration(next);
                }}
              />
            </div>

            <div className="sm:col-span-2">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                    Temperatures (°C)
                  </Label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Add, remove, and compare operating temperatures for each material.
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {temperatureInputs.map((value, index) => (
                  <div
                    key={`temperature-${index}`}
                    className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2"
                  >
                    <Input
                      value={value}
                      placeholder="200"
                      inputMode="numeric"
                      aria-label={`Temperature ${index + 1}`}
                      className="h-9 w-20 text-center"
                      onChange={(event) => updateTemperature(index, event.target.value)}
                    />
                    <span className="text-sm text-muted-foreground">°C</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 rounded-full"
                      onClick={() => removeTemperature(index)}
                      disabled={temperatureInputs.length === 1}
                      aria-label={`Remove temperature ${index + 1}`}
                    >
                      <X className="size-3" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addTemperature}>
                  <Plus className="mr-2 size-4" />
                  Add Temperature
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Materials
            </div>
            <div className="mt-2 rounded-xl border border-border bg-background/50 p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={materialSearch}
                  onChange={(event) => setMaterialSearch(event.target.value)}
                  placeholder="Search materials"
                  className="pl-9"
                />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {selectedMaterials.length === 0 ? (
                  <span className="text-sm text-muted-foreground">No materials selected.</span>
                ) : (
                  selectedMaterials.map((material) => (
                    <Badge key={material} variant="secondary" className="gap-2">
                      {formatChemicalFormula(material)}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-5 rounded-full"
                        onClick={() => toggleMaterial(material)}
                      >
                        <X className="size-3" />
                      </Button>
                    </Badge>
                  ))
                )}
              </div>

              <div className="mt-3 max-h-52 overflow-auto space-y-2">
                {filteredMaterials.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No materials match your search.</p>
                ) : (
                  filteredMaterials.map((material) => {
                    const checked = selectedMaterials.includes(material);
                    return (
                      <label
                        key={material}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2"
                      >
                        <div>
                          <div className="font-medium">{formatChemicalFormula(material)}</div>
                          <div className="text-xs text-muted-foreground">
                            Selected from the MOSLab dataset
                          </div>
                        </div>
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleMaterial(material)}
                        />
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-elegant">
          <div className="text-xs uppercase tracking-wider text-primary font-medium">
            Research conditions
          </div>
          <div className="mt-3 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Gas</span>
              <span className="font-medium">{formatChemicalFormula(gas)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Concentration</span>
              <span className="font-medium">{concentration} ppm</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Operating temperatures</span>
              <span className="font-medium">{temperatureRange}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Comparison basis</span>
              <span className="font-medium">Response (S)</span>
            </div>
          </div>

          {conditionCards.length > 0 ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {conditionCards.map(({ material, conditions }) => (
                <div
                  key={material}
                  className="rounded-xl border border-border bg-card/70 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                        Available Dataset Conditions
                      </p>
                      <p className="mt-1 text-sm font-medium text-foreground">
                        {formatChemicalFormula(material)} · {formatChemicalFormula(gas)}
                      </p>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {conditions?.record_count ?? 0} records
                    </span>
                  </div>
                  <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                    {conditions?.temperatures.length ? (
                      <div>
                        <span className="font-medium text-foreground">Temperatures:</span>{" "}
                        {conditions.temperatures.join(", ")}
                      </div>
                    ) : null}
                    {conditions?.concentrations.length ? (
                      <div>
                        <span className="font-medium text-foreground">Concentrations:</span>{" "}
                        {conditions.concentrations.join(", ")}
                      </div>
                    ) : null}
                    {conditions?.humidity_conditions.length ? (
                      <div>
                        <span className="font-medium text-foreground">Humidity:</span>{" "}
                        {conditions.humidity_conditions.join(", ")}
                      </div>
                    ) : null}
                    {conditions?.source_types.length ? (
                      <div>
                        <span className="font-medium text-foreground">Sources:</span>{" "}
                        {conditions.source_types.join(", ")}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Materials compared" value={selectedMaterials.length} />
        <MetricCard
          label="Best predicted response"
          value={formatChemicalFormula(best.material)}
          hint={best.temperature === "—" ? "—" : `Best at ${best.temperature}°C`}
        />
        <MetricCard
          label="Fixed conditions"
          value={`${concentration} ppm`}
          hint={`${formatChemicalFormula(gas)} · ${temperatureRange}`}
        />
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-elegant">
        <div>
          <h3 className="font-display font-semibold text-base">
            Sensor response vs operating temperature
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gas: {formatChemicalFormula(gas)} · Concentration: {concentration} ppm · Shared across all selected materials.
          </p>
        </div>

        <div className="mt-5 rounded-2xl border border-border bg-muted/20 p-4">
          {showDataPlaceholder ? (
            <div className="flex h-80 items-center justify-center rounded-xl border border-dashed border-border bg-background/60 px-4 text-center text-sm text-muted-foreground">
              Select at least one material and add at least one valid temperature to plot the comparison.
            </div>
          ) : showNoResultsPlaceholder ? (
            <div className="flex h-80 items-center justify-center rounded-xl border border-dashed border-border bg-background/60 px-4 text-center text-sm text-muted-foreground">
              No matching records are available for the current gas and concentration filters.
            </div>
          ) : (
            <div className="flex h-[420px] flex-col gap-4">
              <div className="h-full min-h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 8, right: 12, bottom: 28, left: 12 }}
                    barGap={14}
                    barCategoryGap="18%"
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="temperature"
                      stroke="var(--muted-foreground)"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                      fontSize={12}
                      label={{
                        value: "Operating Temperature (°C)",
                        position: "insideBottom",
                        offset: -12,
                        fill: "var(--muted-foreground)",
                        fontSize: 11,
                      }}
                    />
                    <YAxis
                      stroke="var(--muted-foreground)"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                      fontSize={12}
                      label={{
                        value: "Response (S)",
                        angle: -90,
                        position: "insideLeft",
                        fill: "var(--muted-foreground)",
                        fontSize: 11,
                      }}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(139, 92, 246, 0.06)" }}
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(value: number | null, name) => [
                        value === null ? "No data" : Number(value).toFixed(2),
                        String(name),
                      ]}
                      labelFormatter={(label) => `${label}°C`}
                    />
                    {comparisonData.map((item) => (
                      <Bar
                        key={item.material}
                        dataKey={item.material}
                        name={formatChemicalFormula(item.material)}
                        fill={item.color}
                        radius={[6, 6, 0, 0]}
                        maxBarSize={42}
                        onClick={(payload) => {
                          const temperature = Number(payload?.payload?.temperature ?? temperatureValues[0] ?? 0);
                          openComparisonSourceDetails(item.material, temperature);
                        }}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="flex flex-wrap items-center gap-3 self-start">
                {comparisonData.map((item) => (
                  <div
                    key={item.material}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-sm"
                  >
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-medium">{formatChemicalFormula(item.material)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-elegant">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="font-display font-semibold">Comparison summary</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Material</TableHead>
              <TableHead>Sensor type</TableHead>
              <TableHead>Best response</TableHead>
              <TableHead>Best at</TableHead>
              <TableHead>Gas</TableHead>
              <TableHead>Concentration</TableHead>
              <TableHead>Response equation</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comparisonData.map((item) => (
              <TableRow
                key={item.material}
                className="cursor-pointer transition-colors hover:bg-muted/50"
                onClick={() => openComparisonSourceDetails(item.material, item.temperature)}
                role="button"
                tabIndex={0}
                aria-label={`Open source details for ${item.material} at ${item.temperature}°C`}
              >
                <TableCell className="font-medium">{formatChemicalFormula(item.material)}</TableCell>
                <TableCell>
                  <SensorTypeBadge type={item.type} />
                </TableCell>
                <TableCell className="font-mono">{item.response}</TableCell>
                <TableCell>{item.temperature}°C</TableCell>
                <TableCell>{formatChemicalFormula(item.gas)}</TableCell>
                <TableCell>{item.concentration} ppm</TableCell>
                <TableCell>
                  <ResponseEquationBadge equation={item.equation} />
                </TableCell>
              </TableRow>
            ))}
            {comparisonData.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Select at least one material and add valid temperature values to compare.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <SourceDetailsDialog
        open={sourceDialogOpen}
        onOpenChange={setSourceDialogOpen}
        detail={selectedSourceDetail}
      />
    </div>
  );
}
