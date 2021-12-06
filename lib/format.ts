import { addMilliseconds } from "date-fns";
import { format } from "date-fns-tz";

export function formatTimestamp(ms: number): string {
  let d = new Date(0);
  d.setHours(0);
  d = addMilliseconds(d, ms);
  return format(d, "HH:mm:ss.SS", { timeZone: "America/New_York" });
}

export function formatOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"],
    v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
