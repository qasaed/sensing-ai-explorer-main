import { assertApiBaseUrl, createApiClient } from "@/lib/api-config";
import { getEquation, type Goal, type SensorType } from "./moslab-data";

const api = createApiClient(4000);

export interface PredictInput {
  material: string;
  type: SensorType;
  gas: string;
  temperature: number;
  concentration: number;
  timeUnit: "s" | "min" | "h";
  goal: Goal;
}

export interface PredictResult {
  response: number;
  level: string;
  tone: "success" | "primary" | "warning" | "muted";
  recommendedMaterial: string;
  recommendedTemperature: number;
  sensorType: SensorType;
  equation: string;
  explanation: string;
}

interface BackendPredictionPayload {
  prediction?: {
    predicted_response?: number;
    dt_prediction?: number;
    performance_level?: string;
  };
}

function toneForLevel(level: string): PredictResult["tone"] {
  const normalized = level.toLowerCase();

  if (normalized.includes("very good") || normalized.includes("good")) {
    return "success";
  }

  if (normalized.includes("moderate")) {
    return "warning";
  }

  return "muted";
}

function buildExplanation(
  input: PredictInput,
  response: number,
  level: string,
  dtPrediction?: number,
): string {
  const dtNote =
    typeof dtPrediction === "number"
      ? ` The model also estimates a response time of ${dtPrediction.toFixed(2)} s.`
      : "";

  return `The model predicts ${input.material} exposed to ${input.gas} at ${input.temperature}°C and ${input.concentration} ppm will deliver a response of ${response.toFixed(2)} S, classified as ${level.toLowerCase()}.${dtNote} This recommendation reflects the selected operating conditions and the current dataset context.`;
}

export async function predictResponse(input: PredictInput): Promise<PredictResult> {
  assertApiBaseUrl();

  const { data } = await api.post<BackendPredictionPayload>("/predict/response", {
    material: input.material,
    gas: input.gas,
    temperature: input.temperature,
    concentration: input.concentration,
  });

  const prediction = data.prediction;

  if (
    !prediction ||
    typeof prediction.predicted_response !== "number" ||
    typeof prediction.performance_level !== "string"
  ) {
    throw new Error("The prediction payload was incomplete. Please try again.");
  }

  const response = Number(prediction.predicted_response.toFixed(2));
  const level = prediction.performance_level;

  return {
    response,
    level,
    tone: toneForLevel(level),
    recommendedMaterial: input.material,
    recommendedTemperature: input.temperature,
    sensorType: input.type,
    equation: getEquation(input.type),
    explanation: buildExplanation(input, response, level, prediction.dt_prediction),
  };
}
