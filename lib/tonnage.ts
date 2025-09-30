// Tonnage range constants and utilities
export const TONNAGE_RANGES = [
  { value: "1-10", label: "1-10 ton" },
  { value: "10-100", label: "10-100 ton" },
  { value: "100-1000", label: "100-1000 ton" },
  { value: "1000+", label: "1000 < ton" },
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

// Function to get numeric range from tonnage string
export function getTonnageNumericRange(value: string | null | undefined): { min: number; max: number } | null {
  if (!value) return null;
  
  switch (value) {
    case "1-10":
      return { min: 1, max: 10 };
    case "10-100":
      return { min: 10, max: 100 };
    case "100-1000":
      return { min: 100, max: 1000 };
    case "1000+":
      return { min: 1000, max: Infinity };
    default:
      return null;
  }
}

// Function to calculate total tonnage range from multiple members
export function calculateTotalTonnage(members: Array<{ tonnage_range: string | null }>): {
  totalMin: number;
  totalMax: number;
  memberCount: number;
  hasUnspecified: boolean;
} {
  let totalMin = 0;
  let totalMax = 0;
  let memberCount = 0;
  let hasUnspecified = false;

  members.forEach(member => {
    if (member.tonnage_range) {
      const range = getTonnageNumericRange(member.tonnage_range);
      if (range) {
        totalMin += range.min;
        totalMax += range.max === Infinity ? range.min : range.max;
        memberCount++;
      }
    } else {
      hasUnspecified = true;
    }
  });

  return {
    totalMin,
    totalMax,
    memberCount,
    hasUnspecified
  };
}

// Function to format tonnage range for display
export function formatTonnageRange(min: number, max: number): string {
  if (max === Infinity) {
    return `${min} < ton`;
  }
  if (min === max) {
    return `${min} ton`;
  }
  return `${min}-${max} ton`;
}