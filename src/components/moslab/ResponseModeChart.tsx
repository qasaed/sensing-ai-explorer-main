import type { SensorType } from "@/lib/moslab-data";
import type { ExperimentStage } from "./ExperimentTimeline";
import { DynamicResponseChart } from "./DynamicResponseChart";

interface Props {
  stages: ExperimentStage[];
  timeUnit: "s" | "min" | "h";
  material: string;
  sensorType: SensorType;
  temperature: number;
}

export function ResponseModeChart(props: Props) {
  return <DynamicResponseChart {...props} />;
}
