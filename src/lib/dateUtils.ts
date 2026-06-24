/**
 * Parses a date string (either YYYY-MM-DD or full ISO format) 
 * as a local date object, preventing timezone-induced day shifts.
 */
export function parseLocalDate(dateStr: string | null | undefined): Date {
  if (!dateStr) return new Date();
  
  // Extract YYYY-MM-DD from the string
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1; // 0-indexed
    const day = parseInt(match[3], 10);
    // Set to 12:00:00 local time to avoid any daylight savings or timezone shift
    return new Date(year, month, day, 12, 0, 0);
  }
  
  return new Date(dateStr);
}
