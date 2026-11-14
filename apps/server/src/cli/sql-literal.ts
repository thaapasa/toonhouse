/** Quotes a string as an SQL literal, for statements printed for manual use. */
export function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}
