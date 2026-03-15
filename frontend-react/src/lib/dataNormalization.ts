/**
 * Data Normalization Utilities
 * Handles various backend response shapes (Result<T>, ListResponseDto, PascalCase vs camelCase).
 */

export const extractList = <T>(payload: any): T[] => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  
  // Handle results wrapped in a Result<T>.data object (though apiClient should handle this)
  const data = payload.data ?? payload.Data ?? payload;
  if (Array.isArray(data)) return data;
  
  // Handle ListResponseDto (.items or .Items)
  if (data?.items && Array.isArray(data.items)) return data.items;
  if (data?.Items && Array.isArray(data.Items)) return data.Items;
  
  // Fallback for simple single-property objects if they happen
  if (typeof data === 'object') {
     // Search for any array property if it's likely a list response
     for (const key in data) {
       if (Array.isArray(data[key])) return data[key];
     }
  }
  
  return [];
};

export const ensureArray = <T>(val: any): T[] => {
  return Array.isArray(val) ? val : [];
};
