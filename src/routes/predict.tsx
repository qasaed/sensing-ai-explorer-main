import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Loader2, Play, Thermometer } from "lucide-react";

import { PageHeader } from "@/components/moslab/PageHeader";
import {
  MetricCard,
  PerformanceBadge,
  ResponseEquationBadge,
  SensorTypeBadge,
} from "@/components/moslab/Badges";
import { AIInsightBox } from "@/components/moslab/AIInsightBox";
import {
  ExperimentTimeline,
  type ExperimentStage,
} from "@/components/moslab/ExperimentTimeline";
import { DynamicResponseChart } from "@/components/moslab/DynamicResponseChart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchDataConditions,
  fetchDataPageData,
  type DataPageRow,
  type DatasetConditionsResponse,
} from "@/lib/data-page-api";
import { type Goal } from "@/lib/moslab-data";
import { predictResponse, type PredictResult } from "@/lib/moslab-api";
import { formatChemicalFormula } from "@/lib/utils";

export const Route = createFileRoute("/predict")({
  head: () => ({
    meta: [
      { title: "Predict · MOSLab AI" },
      { name: "description", content: "AI prediction of MOS gas sensor response." },
    ],
  }),
  component: PredictPage,
});

function normalizeBackendTimeUnit(value?: string | null): "s" | "min" | "h" {
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

function PredictPage() {
  const [material, setMaterial] = useState("");
  const [gas, setGas] = useState("");
  const [temperature, setTemperature] = useState(300);
  const [concentration, setConcentration] = useState(50);
  const [timeUnit, setTimeUnit] = useState<"s" | "min" | "h">("s");
  const [goal, setGoal] = useState<Goal>("Best Overall Performance");
  const [stages, setStages] = useState<ExperimentStage[]>([
    { id: "a", type: "air", duration: 30 },
    { id: "b", type: "gas", gas: "CO", concentration: 20, duration: 60 },
    { id: "c", type: "gas", gas: "CO", concentration: 50, duration: 60 },
    { id: "d", type: "gas", gas: "CO", concentration: 100, duration: 60 },
    { id: "e", type: "air", duration: 60 },
  ]);
  const [liveRows, setLiveRows] = useState<DataPageRow[]>([]);
  const [availableMaterials, setAvailableMaterials] = useState<string[]>([]);
  const [availableGases, setAvailableGases] = useState<string[]>([]);
  const [conditionHint, setConditionHint] = useState<DatasetConditionsResponse | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [predictionError, setPredictionError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    fetchDataPageData()
      .then(({ rows, materials, gases }) => {
        if (!active) return;
        setLiveRows(rows);
        setAvailableMaterials(materials);
        setAvailableGases(gases);
        setDataError(null);
      })
      .catch(() => {
        if (!active) return;
        setDataError("Scientific data is temporarily unavailable.");
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (availableMaterials.length > 0 && !availableMaterials.includes(material)) {
      setMaterial(availableMaterials[0]);
    }
  }, [availableMaterials, material]);

  const dependentGases = useMemo(() => {
    if (!material) {
      return availableGases;
    }

    return Array.from(
      new Set(liveRows.filter((row) => row.material === material).map((row) => row.gas)),
    ).sort((left, right) => left.localeCompare(right, undefined, { sensitivity: "base" }));
  }, [availableGases, liveRows, material]);

  useEffect(() => {
    if (!material) {
      return;
    }

    if (dependentGases.length === 0) {
      if (gas !== "") {
        setGas("");
      }
      return;
    }

    if (!dependentGases.includes(gas)) {
      setGas(dependentGases[0]);
    }
  }, [dependentGases, gas, material]);

  const sensorType = liveRows.find((row) => row.material === material)?.type ?? "n-type";
  const backendTimeUnit = useMemo(() => normalizeBackendTimeUnit(liveRows[0]?.time_unit), [liveRows]);

  useEffect(() => {
    setTimeUnit(backendTimeUnit);
  }, [backendTimeUnit]);

  useEffect(() => {
    if (!material || !gas) {
      setConditionHint(null);
      return;
    }

    let active = true;

    fetchDataConditions(material, gas)
      .then((nextConditions) => {
        if (!active) {
          return;
        }

        setConditionHint(nextConditions);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        const matches = liveRows.filter((row) => row.material === material && row.gas === gas);

        if (matches.length === 0) {
          setConditionHint(null);
          return;
        }

        const temperatures = Array.from(new Set(matches.map((row) => `${row.temperature}°C`))).sort(
          (left, right) => Number(left.replace(/[^0-9.-]/g, "")) - Number(right.replace(/[^0-9.-]/g, "")),
        );
        const concentrations = Array.from(new Set(matches.map((row) => `${row.concentration} ppm`))).sort(
          (left, right) => Number(left.replace(/[^0-9.-]/g, "")) - Number(right.replace(/[^0-9.-]/g, "")),
        );
        const sourceTypes = Array.from(
          new Set(
            matches
              .map((row) => row.source_type ?? row.source)
              .filter((value) => value === "Experimental" || value === "Literature"),
          ),
        ).sort((left, right) => left.localeCompare(right, undefined, { sensitivity: "base" }));

        setConditionHint({
          temperatures,
          concentrations,
          humidity_conditions: [],
          source_types: sourceTypes,
          record_count: matches.length,
        });
      });

    return () => {
      active = false;
    };
  }, [gas, liveRows, material]);

  const [result, setResult] = useState<PredictResult | null>(null);

  const chartRows = useMemo(() => {
    const materialMatches = liveRows.filter((row) => row.material === material);
    const gasMatches = materialMatches.filter((row) => row.gas === gas);
    const pool = gasMatches.length > 0 ? gasMatches : materialMatches;

    return pool
      .slice()
      .sort(
        (a, b) =>
          Math.abs(a.temperature - temperature) -
          Math.abs(b.temperature - temperature),
      )
      .slice(0, 12)
      .map((row) => ({
        resistance: row.resistance,
        resistance_unit: row.resistance_unit,
        response: row.response,
        concentration: row.concentration,
        equation: row.equation,
        source: row.source_type ?? row.source,
        time_unit: row.time_unit,
      }));
  }, [liveRows, material, gas, temperature]);

  const mutation = useMutation({
    mutationFn: async () => {
      setPredictionError(null);
      setResult(null);

      return predictResponse({
        material,
        type: sensorType,
        gas,
        temperature,
        concentration,
        timeUnit,
        goal,
      });
    },
    onSuccess: setResult,
    onError: () => {
      setResult(null);
      setPredictionError("Prediction could not be completed at this time.");
    },
  });

  const resetPredictionState = () => {
    setResult(null);
    setPredictionError(null);
    mutation.reset();
  };

  const handleMaterialChange = (nextMaterial: string) => {
    resetPredictionState();
    setMaterial(nextMaterial);
  };

  const handleGasChange = (nextGas: string) => {
    resetPredictionState();
    setGas(nextGas);
  };

  const handleTemperatureChange = (nextTemperature: number) => {
    resetPredictionState();
    setTemperature(nextTemperature);
  };

  const handleConcentrationChange = (nextConcentration: number) => {
    resetPredictionState();
    setConcentration(nextConcentration);
  };

  const handleGoalChange = (nextGoal: Goal) => {
    resetPredictionState();
    setGoal(nextGoal);
  };

  const handleStagesChange = (nextStages: ExperimentStage[]) => {
    resetPredictionState();
    setStages(nextStages);
  };

  const handleTimeUnitChange = () => {
    resetPredictionState();
  };

  const tone =
    (result?.tone as "success" | "primary" | "warning" | "muted") ?? "primary";

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Predict"
        title="Sensor Response Prediction"
        description="Configure material, gas, and operating conditions, then compare a prediction against the MOSLab scientific dataset."
      />

      <div className="mx-auto flex w-full max-w-7xl justify-center">
        <div className="grid w-full gap-5 lg:grid-cols-[minmax(300px,340px)_minmax(0,1fr)] lg:items-start">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-elegant space-y-4 lg:sticky lg:top-6">
            {dataError && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
                Scientific data is temporarily unavailable. The selectors will remain on the last loaded values.
              </div>
            )}

            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Material
              </Label>
              <div className="mt-1.5">
                <SearchableSelect
                  value={material}
                  onValueChange={handleMaterialChange}
                  options={availableMaterials.map((item) => ({
                    label: formatChemicalFormula(item),
                    value: item,
                  }))}
                  placeholder={availableMaterials.length > 0 ? "Select a material" : "Loading materials…"}
                  disabled={availableMaterials.length === 0}
                />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                Semiconductor type: <SensorTypeBadge type={sensorType} />
              </div>
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Target gas
              </Label>
              <div className="mt-1.5">
                <SearchableSelect
                  value={gas}
                  onValueChange={handleGasChange}
                  options={dependentGases.map((item) => ({
                    label: formatChemicalFormula(item),
                    value: item,
                  }))}
                  placeholder={dependentGases.length > 0 ? "Select a gas" : "Loading gases…"}
                  disabled={dependentGases.length === 0}
                />
              </div>
            </div>

            {conditionHint ? (
              <div className="rounded-xl border border-border bg-card/70 p-3">
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
                    {conditionHint.record_count} records
                  </span>
                </div>
                <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {conditionHint.temperatures.length > 0 ? (
                    <div>
                      <span className="font-medium text-foreground">Temperatures:</span>{" "}
                      {conditionHint.temperatures.join(", ")}
                    </div>
                  ) : null}
                  {conditionHint.concentrations.length > 0 ? (
                    <div>
                      <span className="font-medium text-foreground">Concentrations:</span>{" "}
                      {conditionHint.concentrations.join(", ")}
                    </div>
                  ) : null}
                  {conditionHint.humidity_conditions.length > 0 ? (
                    <div>
                      <span className="font-medium text-foreground">Humidity:</span>{" "}
                      {conditionHint.humidity_conditions.join(", ")}
                    </div>
                  ) : null}
                  {conditionHint.source_types.length > 0 ? (
                    <div>
                      <span className="font-medium text-foreground">Sources:</span>{" "}
                      {conditionHint.source_types.join(", ")}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Temperature
                </Label>
                <span className="font-mono text-sm text-primary">
                  {temperature}°C
                </span>
              </div>
              <Slider
                value={[temperature]}
                min={100}
                max={500}
                step={5}
                onValueChange={(v) => handleTemperatureChange(v[0])}
                className="mt-3"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5">
                <span>100°C</span>
                <Thermometer className="size-3" />
                <span>500°C</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Concentration
                </Label>
                <div className="mt-1.5 flex items-center gap-2">
                  <Input
                    type="number"
                    value={concentration}
                    onChange={(e) => handleConcentrationChange(Number(e.target.value))}
                  />
                  <span className="text-xs text-muted-foreground">ppm</span>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Optimization goal
              </Label>
              <Select value={goal} onValueChange={(v) => handleGoalChange(v as Goal)}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Highest Sensitivity">Highest Sensitivity</SelectItem>
                  <SelectItem value="Lowest Recovery Time">Lowest Recovery Time</SelectItem>
                  <SelectItem value="Best Overall Performance">Best Overall Performance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {predictionError && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {predictionError}
              </div>
            )}

            <Button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              className="w-full bg-gradient-primary shadow-elegant"
              size="lg"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Analyzing…
                </>
              ) : (
                <>
                  <Play className="size-4" /> Run prediction
                </>
              )}
            </Button>
          </div>

          <div className="space-y-4 min-w-0">
            <ExperimentTimeline
              stages={stages}
              onChange={handleStagesChange}
              timeUnit={timeUnit}
              defaultGas={gas || availableGases[0] || ""}
              gases={availableGases}
            />

            {result ? (
              <>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-6"
                >
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricCard
                      label="Predicted response (S)"
                      value={result.response}
                      hint={`Equation: ${result.equation}`}
                    />
                    <MetricCard
                      label="Performance"
                      value={<PerformanceBadge level={result.level} tone={tone} />}
                    />
                    <MetricCard
                      label="Recommended material"
                      value={formatChemicalFormula(result.recommendedMaterial)}
                      hint={`for ${formatChemicalFormula(gas)}`}
                    />
                    <MetricCard
                      label="Recommended temperature"
                      value={`${result.recommendedTemperature}°C`}
                    />
                  </div>

                  <div className="rounded-xl border border-border bg-card p-5 flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Sensor type:</span>
                      <SensorTypeBadge type={result.sensorType} />
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Response equation:</span>
                      <ResponseEquationBadge equation={result.equation} />
                    </div>
                  </div>

                  <AIInsightBox>{result.explanation}</AIInsightBox>
                </motion.div>

                <DynamicResponseChart
                  stages={stages}
                  timeUnit={timeUnit}
                  onTimeUnitChange={handleTimeUnitChange}
                  material={material}
                  sensorType={sensorType}
                  temperature={temperature}
                  liveData={chartRows}
                  backendTimeUnit={backendTimeUnit}
                  backendResistanceUnit={chartRows[0]?.resistance_unit}
                />
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-card/60 p-6 text-sm text-muted-foreground">
                Adjust the material, gas, temperature, concentration, and timeline settings, then click
                <span className="mx-1 font-semibold text-foreground">Run prediction</span>
                to load the predicted response and resistance chart.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
