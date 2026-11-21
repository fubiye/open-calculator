export function resolveSpan(span: number | undefined, columns: number): number {
  if (!Number.isFinite(span ?? 0) || (span ?? 0) <= 0) {
    return columns;
  }
  return Math.min(Math.max(Math.round(span as number), 1), columns);
}
