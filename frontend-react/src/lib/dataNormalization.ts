/**
 * Data Normalization Utilities
 * Handles various backend response shapes (Result<T>, ListResponseDto, PascalCase vs camelCase).
 */

export const extractList = <T>(payload: unknown): T[] => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload as T[];
  if (typeof payload !== 'object') return [];
  
  // Handle results wrapped in a Result<T>.data object (though apiClient should handle this)
  const payloadRecord = payload as Record<string, unknown>;
  const data = payloadRecord.data ?? payloadRecord.Data ?? payload;
  if (Array.isArray(data)) return data as T[];
  if (typeof data !== 'object' || !data) return [];
  
  // Handle ListResponseDto (.items or .Items)
  const dataRecord = data as Record<string, unknown>;
  if (Array.isArray(dataRecord.items)) return dataRecord.items as T[];
  if (Array.isArray(dataRecord.Items)) return dataRecord.Items as T[];
  
  // Fallback for simple single-property objects if they happen
  // Search for any array property if it's likely a list response.
  for (const key of Object.keys(dataRecord)) {
    const value = dataRecord[key];
    if (Array.isArray(value)) return value as T[];
  }
  
  return [];
};

export const ensureArray = <T>(val: unknown): T[] => {
  return Array.isArray(val) ? val : [];
};
