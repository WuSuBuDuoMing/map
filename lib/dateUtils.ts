/**
 * Normalize a date string in "YYYY.MM.DD" or "YYYY.M.D" format to a
 * zero-padded "YYYY.MM.DD" string, or null if the value is invalid.
 */

/** Regex pattern matching YYYY.M.D or YYYY.MM.DD date formats */
export const DATE_PATTERN = /^\d{4}\.\d{1,2}\.\d{1,2}$/;

export const normalizeMemoryDate = (value: string): string | null => {
  const match = value.match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})$/);
  if (!match) return null;

  const [, rawYear, rawMonth, rawDay] = match;
  const year = Number(rawYear);
  const month = Number(rawMonth);
  const day = Number(rawDay);
  const date = new Date(Date.UTC(year, month - 1, day));

  const isValid =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;

  if (!isValid) return null;

  return `${rawYear}.${String(month).padStart(2, "0")}.${String(day).padStart(2, "0")}`;
};
