// Tonnage range constants and utilities
export const TONNAGE_RANGES = [
  { value: "1-10", label: "1-10 ton" },
  { value: "10-100", label: "10-100 ton" },
  { value: "100-1000", label: "100-1000 ton" },
  { value: "1000+", label: "1000+ ton" },
] as const;

export type TonnageRange = typeof TONNAGE_RANGES[number]['value'];

// Utility function to get label from value
export function getTonnageLabel(value: string | null | undefined): string {
  if (!value) return "Belirtilmemiş";
  
  const range = TONNAGE_RANGES.find(r => r.value === value);
  return range?.label || value;
}

// Utility function to validate tonnage range
export function isValidTonnageRange(value: string): boolean {
  return TONNAGE_RANGES.some(r => r.value === value);
}
