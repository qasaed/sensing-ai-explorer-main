import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const SUBSCRIPT_DIGITS: Record<string, string> = {
  0: "₀",
  1: "₁",
  2: "₂",
  3: "₃",
  4: "₄",
  5: "₅",
  6: "₆",
  7: "₇",
  8: "₈",
  9: "₉",
};

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatChemicalFormula(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return trimmed;
  }

  const hasLetter = /[A-Za-z]/.test(trimmed);
  const hasDigit = /\d/.test(trimmed);

  if (!hasLetter || !hasDigit) {
    return trimmed;
  }

  return trimmed.replace(/[0-9]/g, (digit) => SUBSCRIPT_DIGITS[digit] ?? digit);
}
