import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { Search } from "lucide-react";

import { PageHeader } from "@/components/moslab/PageHeader";
import {
  MetricCard,
  ResponseEquationBadge,
  SensorTypeBadge,
  SourceBadge,
} from "@/components/moslab/Badges";
import {
  SourceDetailsDialog,
  type SourceDetailsRecord,
} from "@/components/moslab/SourceDetailsDialog";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchDataPageData, type DataPageRow } from "@/lib/data-page-api";
import { formatChemicalFormula } from "@/lib/utils";

function getBounds(values: number[]) {
  if (values.length === 0) {
    return { min: 0, max: 1 };
  }

  return {
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

export const Route = createFileRoute("/data")({
  head: () => ({
    meta: [
      { title: "Data · MOSLab AI" },
      { name: "description", content: "Browse the MOSLab AI experimental dataset." },
    ],
  }),
  component: DataPage,
});

function DataPage() {
  const [rows, setRows] = useState<DataPageRow[]>([]);
  const [availableMaterials, setAvailableMaterials] = useState<string[]>([]);
  const [availableGases, setAvailableGases] = useState<string[]>([]);
  const [material, setMaterial] = useState("all");
  const [gas, setGas] = useState("all");
  const [sourceType, setSourceType] = useState("all");
  const [dataQuality, setDataQuality] = useState("all");
  const [q, setQ] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadData() {
      setIsLoading(true);
      setLoadError(null);

      try {
        const response = await fetchDataPageData();

        if (!active) {
          return;
        }

        setRows(response.rows);
        setAvailableMaterials(response.materials);
        setAvailableGases(response.gases);
      } catch {
        if (active) {
          setLoadError("Scientific data is temporarily unavailable.");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, []);

  const tBounds = useMemo(() => getBounds(rows.map((row) => row.temperature)), [rows]);
  const sBounds = useMemo(() => {
    const responses = rows.map((row) => row.response);

    if (responses.length === 0) {
      return { min: 0, max: 1 };
    }

    return {
      min: Math.floor(Math.min(...responses) * 10) / 10,
      max: Math.ceil(Math.max(...responses) * 10) / 10,
    };
  }, [rows]);

  const [tRange, setTRange] = useState<[number, number]>([tBounds.min, tBounds.max]);
  const [sRange, setSRange] = useState<[number, number]>([sBounds.min, sBounds.max]);

  useEffect(() => {
    if (rows.length === 0) {
      return;
    }

    setTRange([tBounds.min, tBounds.max]);
    setSRange([sBounds.min, sBounds.max]);
  }, [rows.length, tBounds.min, tBounds.max, sBounds.min, sBounds.max]);

  const dependentMaterials = useMemo(() => {
    if (gas === "all") {
      return availableMaterials;
    }

    return Array.from(
      new Set(rows.filter((row) => row.gas === gas).map((row) => row.material)),
    );
  }, [availableMaterials, gas, rows]);

  const dependentGases = useMemo(() => {
    if (material === "all") {
      return availableGases;
    }

    return Array.from(
      new Set(rows.filter((row) => row.material === material).map((row) => row.gas)),
    );
  }, [availableGases, material, rows]);

  useEffect(() => {
    if (material !== "all" && !dependentMaterials.includes(material)) {
      setMaterial("all");
    }
  }, [dependentMaterials, material]);

  useEffect(() => {
    if (gas !== "all" && !dependentGases.includes(gas)) {
      setGas("all");
    }
  }, [dependentGases, gas]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesMaterial = material === "all" || row.material === material;
      const matchesGas = gas === "all" || row.gas === gas;
      const matchesSource =
        sourceType === "all" || (row.source_type ?? row.source) === sourceType;
      const matchesQuality = dataQuality === "all" || row.data_quality === dataQuality;
      const matchesTemperature = row.temperature >= tRange[0] && row.temperature <= tRange[1];
      const matchesResponse = row.response >= sRange[0] && row.response <= sRange[1];
      const matchesQuery =
        q === "" ||
        `${row.material} ${row.gas} ${row.paper_title} ${row.notes}`
          .toLowerCase()
          .includes(q.toLowerCase());

      return (
        matchesMaterial &&
        matchesGas &&
        matchesSource &&
        matchesQuality &&
        matchesTemperature &&
        matchesResponse &&
        matchesQuery
      );
    });
  }, [rows, material, gas, sourceType, dataQuality, q, tRange, sRange]);

  const dynamicSourceTypes = useMemo(() => {
    return Array.from(new Set(rows.map((row) => row.source_type ?? row.source)));
  }, [rows]);

  const dynamicDataQualities = useMemo(() => {
    return Array.from(new Set(rows.map((row) => row.data_quality)));
  }, [rows]);

  const summary = {
    n: filteredRows.length,
    materials: new Set(filteredRows.map((row) => row.material)).size,
    gases: new Set(filteredRows.map((row) => row.gas)).size,
    avgS: filteredRows.length
      ? +(filteredRows.reduce((sum, row) => sum + row.response, 0) / filteredRows.length).toFixed(2)
      : 0,
  };

  const [sourceDialogOpen, setSourceDialogOpen] = useState(false);
  const [selectedSourceDetail, setSelectedSourceDetail] = useState<SourceDetailsRecord | null>(
    null,
  );

  const openSourceDetails = (row: DataPageRow) => {
    const sourceType = row.source_type ?? row.source ?? "Experimental";

    setSelectedSourceDetail({
      sourceType,
      title: `${row.material} · ${row.gas}`,
      subtitle: `Curated ${sourceType.toLowerCase()} record for ${row.material} exposed to ${row.gas}.`,
      fields: [
        { label: "Paper_Title", value: row.paper_title },
        { label: "DOI", value: row.doi },
        { label: "Journal", value: row.journal },
        { label: "Year", value: row.year },
        { label: "Source_Type", value: sourceType },
        { label: "Data_Quality", value: row.data_quality },
        { label: "Notes", value: row.notes },
        { label: "Material", value: row.material },
        { label: "Gas", value: row.gas },
        { label: "Temperature", value: `${row.temperature}°C` },
        { label: "Concentration", value: `${row.concentration} ppm` },
        { label: "Response", value: `${row.response}` },
      ],
    });
    setSourceDialogOpen(true);
  };

  const handleRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, row: DataPageRow) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openSourceDetails(row);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Data"
        title="Experimental Dataset"
        description="Filter, search and inspect MOS sensor measurements used to train MOSLab AI."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Records" value={isLoading ? "Loading…" : summary.n} />
        <MetricCard label="Materials" value={isLoading ? "Loading…" : summary.materials} />
        <MetricCard label="Gases" value={isLoading ? "Loading…" : summary.gases} />
        <MetricCard label="Mean response (S)" value={isLoading ? "Loading…" : summary.avgS} />
      </div>

      {loadError ? (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {loadError}
        </div>
      ) : null}

      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 flex flex-wrap gap-4 items-stretch">
        <div className="flex-1 min-w-[220px]">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Search
          </Label>
          <div className="relative mt-1.5">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Material, gas, paper, notes…"
              className="pl-9"
              disabled={isLoading}
            />
          </div>
        </div>
        <div className="w-full min-w-[180px] sm:w-40">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Material
          </Label>
          <div className="mt-1.5">
            <SearchableSelect
              value={material}
              onValueChange={setMaterial}
              options={[
                { label: "All", value: "all" },
                ...dependentMaterials.map((item) => ({
                  label: formatChemicalFormula(item),
                  value: item,
                })),
              ]}
              placeholder="All"
              disabled={isLoading}
            />
          </div>
        </div>
        <div className="w-full min-w-[180px] sm:w-40">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Target_Gas
          </Label>
          <div className="mt-1.5">
            <SearchableSelect
              value={gas}
              onValueChange={setGas}
              options={[
                { label: "All", value: "all" },
                ...dependentGases.map((item) => ({
                  label: formatChemicalFormula(item),
                  value: item,
                })),
              ]}
              placeholder="All"
              disabled={isLoading}
            />
          </div>
        </div>
        <div className="w-full min-w-[180px] sm:w-40">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Source_Type
          </Label>
          <Select value={sourceType} onValueChange={setSourceType} disabled={isLoading}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {dynamicSourceTypes.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full min-w-[180px] sm:w-40">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Data_Quality
          </Label>
          <Select value={dataQuality} onValueChange={setDataQuality} disabled={isLoading}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {dynamicDataQualities.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[220px] flex-1">
          <div className="flex items-center justify-between">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Temperature (°C)
            </Label>
            <span className="text-xs font-mono text-primary">
              {tRange[0]}–{tRange[1]}
            </span>
          </div>
          <Slider
            className="mt-3"
            min={tBounds.min}
            max={tBounds.max}
            step={1}
            value={tRange}
            onValueChange={(value) => setTRange([value[0], value[1]] as [number, number])}
            disabled={isLoading}
          />
        </div>
        <div className="min-w-[220px] flex-1">
          <div className="flex items-center justify-between">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Response (S)
            </Label>
            <span className="text-xs font-mono text-primary">
              {sRange[0].toFixed(1)}–{sRange[1].toFixed(1)}
            </span>
          </div>
          <Slider
            className="mt-3"
            min={sBounds.min}
            max={sBounds.max}
            step={0.1}
            value={sRange}
            onValueChange={(value) => setSRange([value[0], value[1]] as [number, number])}
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-elegant">
        <div className="overflow-x-auto">
          <Table className="min-w-[980px]">
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Material</TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Type</TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Gas</TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Temp (°C)</TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Conc. (ppm)</TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Time (s)</TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Resistance (Ω)</TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Response (S)</TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Equation</TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <TableRow key={`data-skeleton-${index}`}>
                    {Array.from({ length: 10 }).map((__, cellIndex) => (
                      <TableCell key={`data-skeleton-cell-${index}-${cellIndex}`} className="py-4">
                        <Skeleton className="h-4 w-full max-w-[140px]" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filteredRows.length > 0 ? (
                filteredRows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer transition-colors hover:bg-muted/50"
                    onClick={() => openSourceDetails(row)}
                    onKeyDown={(event) => handleRowKeyDown(event, row)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Open source details for ${row.material} ${row.gas} at ${row.temperature}°C`}
                  >
                    <TableCell className="font-medium">{formatChemicalFormula(row.material)}</TableCell>
                    <TableCell>
                      <SensorTypeBadge type={row.type} />
                    </TableCell>
                    <TableCell>{formatChemicalFormula(row.gas)}</TableCell>
                    <TableCell className="font-mono">{row.temperature}</TableCell>
                    <TableCell className="font-mono">{row.concentration}</TableCell>
                    <TableCell className="font-mono">{row.time}</TableCell>
                    <TableCell className="font-mono">{row.resistance.toLocaleString()}</TableCell>
                    <TableCell className="font-mono text-primary">{row.response}</TableCell>
                    <TableCell>
                      <ResponseEquationBadge equation={row.equation} />
                    </TableCell>
                    <TableCell>
                      <SourceBadge source={row.source_type ?? row.source} />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={10} className="py-12">
                    <div className="mx-auto flex max-w-lg flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-muted/30 px-5 py-8 text-center">
                      <p className="text-sm font-semibold text-foreground">No records match these filters.</p>
                      <p className="text-sm text-muted-foreground">
                        Try widening your search or adjusting the temperature and response ranges.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <SourceDetailsDialog
        open={sourceDialogOpen}
        onOpenChange={setSourceDialogOpen}
        detail={selectedSourceDetail}
      />
    </div>
  );
}
