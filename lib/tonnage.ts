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

// Function to compare tonnage ranges for LR selection
export function compareTonnageRanges(range1: string | null, range2: string | null): number {
  if (!range1 && !range2) return 0;
  if (!range1) return -1;
  if (!range2) return 1;
  
  const numeric1 = getTonnageNumericRange(range1);
  const numeric2 = getTonnageNumericRange(range2);
  
  if (!numeric1 && !numeric2) return 0;
  if (!numeric1) return -1;
  if (!numeric2) return 1;
  
  // Compare by minimum value first, then by maximum
  if (numeric1.min !== numeric2.min) {
    return numeric1.min - numeric2.min;
  }
  
  if (numeric1.max === Infinity && numeric2.max === Infinity) return 0;
  if (numeric1.max === Infinity) return 1;
  if (numeric2.max === Infinity) return -1;
  
  return numeric1.max - numeric2.max;
}

// Function to find highest tonnage candidates
export function findHighestTonnageCandidates(candidates: Array<{ 
  id: string; 
  user_id: string; 
  profiles?: { tonnage_range?: string | null } 
}>): Array<{ id: string; user_id: string; tonnage_range: string }> {
  if (candidates.length === 0) return [];
  
  // Filter candidates with tonnage data
  const candidatesWithTonnage = candidates
    .filter(candidate => candidate.profiles?.tonnage_range)
    .map(candidate => ({
      id: candidate.id,
      user_id: candidate.user_id,
      tonnage_range: candidate.profiles!.tonnage_range!
    }));
  
  if (candidatesWithTonnage.length === 0) return [];
  
  // Find the highest tonnage
  let highestTonnage = candidatesWithTonnage[0].tonnage_range;
  for (const candidate of candidatesWithTonnage) {
    if (compareTonnageRanges(candidate.tonnage_range, highestTonnage) > 0) {
      highestTonnage = candidate.tonnage_range;
    }
  }
  
  // Return all candidates with the highest tonnage
  return candidatesWithTonnage.filter(candidate => 
    compareTonnageRanges(candidate.tonnage_range, highestTonnage) === 0
  );
}