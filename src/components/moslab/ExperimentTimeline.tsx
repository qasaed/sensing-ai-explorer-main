import { ArrowDown, ArrowUp, Plus, Wind, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";

export interface ExperimentStage {
  id: string;
  type: "air" | "gas";
  gas?: string;
  concentration?: number; // ppm
  duration: number; // in selected timeUnit
}

interface Props {
  stages: ExperimentStage[];
  onChange: (stages: ExperimentStage[]) => void;
  timeUnit: "s" | "min" | "h";
  defaultGas?: string;
  gases?: string[];
}

export function ExperimentTimeline({
  stages,
  onChange,
  timeUnit,
  defaultGas = "",
  gases = [],
}: Props) {
  const liveGases = gases.length > 0 ? gases : [];
  const update = (id: string, patch: Partial<ExperimentStage>) =>
    onChange(stages.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const remove = (id: string) => onChange(stages.filter((s) => s.id !== id));

  const move = (id: string, dir: -1 | 1) => {
    const i = stages.findIndex((s) => s.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= stages.length) return;
    const next = stages.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  const addAir = () =>
    onChange([
      ...stages,
      { id: crypto.randomUUID(), type: "air", duration: 30 },
    ]);
  const addGas = () =>
    onChange([
      ...stages,
      {
        id: crypto.randomUUID(),
        type: "gas",
        gas: defaultGas || liveGases[0],
        concentration: 50,
        duration: 60,
      },
    ]);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-semibold text-base">
            Experiment Timeline
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Build a sensing sequence: air baseline → gas exposure(s) → recovery.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={addAir}>
            <Wind className="size-3.5" /> Air
          </Button>
          <Button size="sm" onClick={addGas} className="bg-gradient-primary">
            <Plus className="size-3.5" /> Gas stage
          </Button>
        </div>
      </div>

      {/* Visual sequence chips */}
      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        {stages.length === 0 && (
          <span className="text-muted-foreground italic">
            No stages yet — add an Air baseline and one or more Gas stages.
          </span>
        )}
        {stages.map((s, i) => (
          <div key={s.id} className="flex items-center gap-1.5">
            <span
              className={
                s.type === "air"
                  ? "rounded-full border border-border bg-muted px-2 py-0.5 font-mono text-muted-foreground"
                  : "rounded-full border border-primary/30 bg-primary-soft px-2 py-0.5 font-mono text-primary"
              }
            >
              {s.type === "air"
                ? `Air · ${s.duration}${timeUnit}`
                : `${s.gas} ${s.concentration} ppm · ${s.duration}${timeUnit}`}
            </span>
            {i < stages.length - 1 && (
              <span className="text-muted-foreground">→</span>
            )}
          </div>
        ))}
      </div>

      {/* Editable rows */}
      <div className="space-y-2">
        {stages.map((s, i) => (
          <div
            key={s.id}
            className="grid grid-cols-12 items-end gap-2 rounded-lg border border-border bg-background/50 p-2.5"
          >
            <div className="col-span-2 text-[10px] uppercase tracking-wider text-muted-foreground">
              Stage {i + 1}
              <div className="mt-0.5 text-foreground font-medium normal-case tracking-normal text-xs">
                {s.type === "air" ? "Air" : "Gas"}
              </div>
            </div>

            {s.type === "gas" && (
              <>
                <div className="col-span-3">
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Gas
                  </label>
                  <div className="mt-1">
                    <SearchableSelect
                      value={s.gas ?? defaultGas}
                      onValueChange={(value) => update(s.id, { gas: value })}
                      options={liveGases.map((gasName) => ({
                        label: gasName,
                        value: gasName,
                      }))}
                      placeholder={liveGases[0] ?? "Select a gas"}
                    />
                  </div>
                </div>
                <div className="col-span-3">
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Concentration (ppm)
                  </label>
                  <Input
                    type="number"
                    className="h-8 mt-1"
                    value={s.concentration}
                    onChange={(e) =>
                      update(s.id, { concentration: Number(e.target.value) })
                    }
                  />
                </div>
              </>
            )}
            {s.type === "air" && <div className="col-span-6" />}

            <div className="col-span-2">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Duration ({timeUnit})
              </label>
              <Input
                type="number"
                className="h-8 mt-1"
                value={s.duration}
                onChange={(e) =>
                  update(s.id, { duration: Number(e.target.value) })
                }
              />
            </div>

            <div className="col-span-2 flex justify-end gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="size-7"
                onClick={() => move(s.id, -1)}
                disabled={i === 0}
              >
                <ArrowUp className="size-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-7"
                onClick={() => move(s.id, 1)}
                disabled={i === stages.length - 1}
              >
                <ArrowDown className="size-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-7"
                onClick={() => remove(s.id)}
              >
                <X className="size-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
