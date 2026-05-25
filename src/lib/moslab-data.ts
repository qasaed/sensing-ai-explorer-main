// Mock data + types for MOSLab AI

export type SensorType = "n-type" | "p-type";
export type DataStatus = "Available Data" | "Literature Only" | "Future Data";
export type DataSource = "Experimental" | "Literature" | "AI Prediction";

export type ApplicationCategory =
  | "Hydrogen safety"
  | "Industrial monitoring"
  | "VOC sensing"
  | "Air quality"
  | "Breath analysis";

export interface MaterialInfo {
  symbol: string;
  name: string;
  type: SensorType;
  status: DataStatus;
  bestGas: string;
  preferredGases: string[];
  suggestedTemp: number;
  bandGap: number; // eV
  sensitivityTrend: string;
  mechanism: string;
  application: string;
  applicationCategory: ApplicationCategory;
  note: string;
}

export const MATERIALS: MaterialInfo[] = [
  {
    symbol: "ZnO",
    name: "Zinc Oxide",
    type: "n-type",
    status: "Available Data",
    bestGas: "CO",
    preferredGases: ["CO", "Ethanol", "NH₃"],
    suggestedTemp: 300,
    bandGap: 3.37,
    sensitivityTrend: "Increases with T up to ~320°C, then declines.",
    mechanism:
      "Chemisorbed O⁻/O²⁻ traps surface electrons; reducing gases react with oxygen species, releasing electrons back to the conduction band and lowering Rg.",
    application: "Carbon monoxide detection in indoor air quality monitors.",
    applicationCategory: "Air quality",
    note: "ZnO shows high response to CO at moderate temperatures with fast recovery.",
  },
  {
    symbol: "SnO₂",
    name: "Tin Dioxide",
    type: "n-type",
    status: "Available Data",
    bestGas: "H₂",
    preferredGases: ["H₂", "CO", "CH₄"],
    suggestedTemp: 350,
    bandGap: 3.6,
    sensitivityTrend: "Strong rise 250–380°C; H₂ dissociation thermally activated.",
    mechanism:
      "Dissociative H₂ adsorption on SnO₂ surface oxygen consumes O⁻ adlayer, narrowing the depletion region at grain boundaries and sharply reducing resistance.",
    application: "Hydrogen leak detection in fuel cells and industrial safety.",
    applicationCategory: "Hydrogen safety",
    note: "SnO₂ is the most studied MOS with excellent selectivity to H₂.",
  },
  {
    symbol: "WO₃",
    name: "Tungsten Trioxide",
    type: "n-type",
    status: "Available Data",
    bestGas: "Acetone",
    preferredGases: ["Acetone", "NO₂", "H₂S"],
    suggestedTemp: 320,
    bandGap: 2.7,
    sensitivityTrend: "Peaks near 300–340°C for ketone-class VOCs.",
    mechanism:
      "Acetone dehydrogenation on W⁵⁺/W⁶⁺ surface sites generates electrons that fill oxygen vacancies, producing strong conductance modulation.",
    application: "Acetone detection for non-invasive diabetes breath analysis.",
    applicationCategory: "Breath analysis",
    note: "WO₃ exhibits strong selectivity to acetone in the ppb range.",
  },
  {
    symbol: "In₂O₃",
    name: "Indium Oxide",
    type: "n-type",
    status: "Literature Only",
    bestGas: "NO₂",
    preferredGases: ["NO₂", "O₃"],
    suggestedTemp: 200,
    bandGap: 3.6,
    sensitivityTrend: "Strong NO₂ response at low T (150–220°C).",
    mechanism:
      "NO₂ acts as an electron acceptor, broadening the surface depletion layer and increasing Rg of the n-type film.",
    application: "NO₂ monitoring for environmental air pollution.",
    applicationCategory: "Air quality",
    note: "Reported in literature with strong NO₂ response at lower temperatures.",
  },
  {
    symbol: "TiO₂",
    name: "Titanium Dioxide",
    type: "n-type",
    status: "Literature Only",
    bestGas: "O₂",
    preferredGases: ["O₂", "H₂"],
    suggestedTemp: 400,
    bandGap: 3.2,
    sensitivityTrend: "Stable baseline; response grows above 350°C.",
    mechanism:
      "Oxygen vacancies act as donor states; ambient pO₂ modulates carrier concentration, giving a logarithmic response to O₂ partial pressure.",
    application: "Oxygen sensing in combustion and exhaust control.",
    applicationCategory: "Industrial monitoring",
    note: "High-temperature O₂ sensor with stable baseline.",
  },
  {
    symbol: "CuO",
    name: "Copper Oxide",
    type: "p-type",
    status: "Future Data",
    bestGas: "H₂S",
    preferredGases: ["H₂S", "NO₂"],
    suggestedTemp: 250,
    bandGap: 1.4,
    sensitivityTrend: "Sharp H₂S response near 200–260°C with sulfide formation.",
    mechanism:
      "H₂S reacts to form a metallic CuS phase, collapsing the hole-accumulation layer and producing a large p-type response (Rg/Ra ≫ 1 inverted).",
    application: "H₂S detection in petrochemical industries.",
    applicationCategory: "Industrial monitoring",
    note: "Promising p-type candidate; awaiting integration into trained dataset.",
  },
  {
    symbol: "NiO",
    name: "Nickel Oxide",
    type: "p-type",
    status: "Future Data",
    bestGas: "Ethanol",
    preferredGases: ["Ethanol", "Acetone"],
    suggestedTemp: 280,
    bandGap: 3.7,
    sensitivityTrend: "Moderate response; selectivity rises with surface doping.",
    mechanism:
      "Reducing VOCs donate electrons that recombine with surface holes in the accumulation layer, raising Rg (S = Rg/Ra for p-type).",
    application: "Alcohol breath analysis and indoor VOC tracking.",
    applicationCategory: "Breath analysis",
    note: "P-type behavior with inverted response curve (Rg/Ra).",
  },
  {
    symbol: "Co₃O₄",
    name: "Cobalt Oxide",
    type: "p-type",
    status: "Future Data",
    bestGas: "CO",
    preferredGases: ["CO", "NH₃"],
    suggestedTemp: 200,
    bandGap: 1.6,
    sensitivityTrend: "Active at low T; spinel structure favors CO oxidation.",
    mechanism:
      "Co³⁺/Co²⁺ redox cycling catalyzes CO oxidation, modulating hole density in the surface accumulation region.",
    application: "Low-temperature CO sensing.",
    applicationCategory: "Air quality",
    note: "Future addition for p-type baseline comparisons.",
  },
];

export const AVAILABLE_MATERIALS = MATERIALS.filter((m) => m.status === "Available Data");

export const GASES = ["H₂", "CO", "Acetone", "Ethanol", "NO₂", "H₂S", "NH₃", "CH₄"];

export const APPLICATIONS: ApplicationCategory[] = [
  "Hydrogen safety",
  "Industrial monitoring",
  "VOC sensing",
  "Air quality",
  "Breath analysis",
];

export type Goal = "Highest Sensitivity" | "Lowest Recovery Time" | "Best Overall Performance";

export interface DatasetRow {
  id: number;
  material: string;
  type: SensorType;
  gas: string;
  temperature: number;
  concentration: number;
  time: number;
  resistance: number;
  response: number;
  equation: string;
  source: DataSource;
}

// Per-material gas affinity (response strength) and recovery (smaller = faster recovery, larger τ).
export const MATERIAL_AFFINITY: Record<string, Record<string, number>> = {
  ZnO: { CO: 9.2, Ethanol: 6.1, "H₂": 4.0, Acetone: 3.2, "NH₃": 4.8, "NO₂": 2.5, "H₂S": 2.0, "CH₄": 1.8 },
  "SnO₂": { "H₂": 11.5, CO: 7.8, Ethanol: 5.5, Acetone: 4.6, "CH₄": 5.0, "NH₃": 3.5, "NO₂": 3.0, "H₂S": 2.8 },
  "WO₃": { Acetone: 12.4, "NO₂": 8.5, Ethanol: 4.1, "H₂": 3.0, "H₂S": 6.0, CO: 2.9, "NH₃": 2.7, "CH₄": 1.9 },
  "In₂O₃": { "NO₂": 9.0, Ethanol: 3.2, CO: 2.4, Acetone: 2.6, "H₂": 2.0, "NH₃": 2.1, "H₂S": 2.3, "CH₄": 1.5 },
  "TiO₂": { "H₂": 4.0, CO: 2.0, Ethanol: 2.4, Acetone: 1.8, "NO₂": 1.6, "NH₃": 1.7, "H₂S": 1.5, "CH₄": 1.4 },
  "CuO": { "H₂S": 11.0, "NO₂": 5.5, Ethanol: 3.0, CO: 3.4, Acetone: 2.2, "H₂": 1.8, "NH₃": 2.5, "CH₄": 1.4 },
  "NiO": { Ethanol: 6.5, Acetone: 5.2, CO: 2.8, "H₂": 2.0, "NO₂": 2.6, "NH₃": 3.0, "H₂S": 2.4, "CH₄": 1.5 },
  "Co₃O₄": { CO: 5.6, "NH₃": 3.8, Acetone: 2.4, Ethanol: 2.7, "H₂": 2.0, "NO₂": 2.0, "H₂S": 2.2, "CH₄": 1.4 },
};

// Response and recovery time constants (in normalized units) — material-specific.
export const MATERIAL_KINETICS: Record<string, { tauResp: number; tauRec: number }> = {
  ZnO: { tauResp: 5, tauRec: 4 },
  "SnO₂": { tauResp: 4, tauRec: 6 },
  "WO₃": { tauResp: 6, tauRec: 8 },
  "In₂O₃": { tauResp: 7, tauRec: 9 },
  "TiO₂": { tauResp: 8, tauRec: 10 },
  "CuO": { tauResp: 5, tauRec: 7 },
  "NiO": { tauResp: 6, tauRec: 8 },
  "Co₃O₄": { tauResp: 6, tauRec: 7 },
};

// Deterministic pseudo-random so SSR and client render identical values.
const mulberry32 = (a: number) => () => {
  a |= 0; a = (a + 0x6D2B79F5) | 0;
  let t = a;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const seededRows = (): DatasetRow[] => {
  const rand = mulberry32(42);
  const rows: DatasetRow[] = [];
  let id = 1;
  const combos: Array<{ m: string; g: string; t: SensorType }> = [
    { m: "ZnO", g: "CO", t: "n-type" },
    { m: "ZnO", g: "Ethanol", t: "n-type" },
    { m: "SnO₂", g: "H₂", t: "n-type" },
    { m: "SnO₂", g: "CO", t: "n-type" },
    { m: "WO₃", g: "Acetone", t: "n-type" },
    { m: "WO₃", g: "NO₂", t: "n-type" },
  ];
  const sources: DataSource[] = ["Experimental", "Literature", "AI Prediction"];
  for (const c of combos) {
    for (const conc of [10, 20, 50, 100, 200]) {
      const temp = 250 + Math.floor(rand() * 100);
      const baseR = 1_000_000 + rand() * 5_000_000;
      const rg = baseR / (1 + conc / 30);
      const response = baseR / rg;
      rows.push({
        id: id++,
        material: c.m,
        type: c.t,
        gas: c.g,
        temperature: temp,
        concentration: conc,
        time: 60,
        resistance: Math.round(rg),
        response: +response.toFixed(2),
        equation: c.t === "n-type" ? "S = Ra / Rg" : "S = Rg / Ra",
        source: sources[Math.floor(rand() * sources.length)],
      });
    }
  }
  return rows;
};

export const DATASET: DatasetRow[] = seededRows();

export function performanceLevel(response: number): {
  label: "Excellent" | "Good" | "Moderate" | "Low";
  tone: "success" | "primary" | "warning" | "muted";
} {
  if (response >= 8) return { label: "Excellent", tone: "success" };
  if (response >= 4) return { label: "Good", tone: "primary" };
  if (response >= 2) return { label: "Moderate", tone: "warning" };
  return { label: "Low", tone: "muted" };
}

export function getEquation(type: SensorType) {
  return type === "n-type" ? "S = Ra / Rg" : "S = Rg / Ra";
}
