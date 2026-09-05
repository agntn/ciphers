/** Cuts a text at `max` code points with an ellipsis. */
export function clip(value: string, max: number): string {
  const points = [...value];
  return points.length > max
    ? `${points
        .slice(0, max - 1)
        .join("")
        .trimEnd()}…`
    : value;
}

/** A shell argument: single quotes unless the value is a plain word. */
export function shellArg(value: string): string {
  return /^[\w./:@-]+$/u.test(value) ? value : `'${value.replaceAll("'", `'\\''`)}'`;
}

/** Cipher option values as CLI flags: `--key LEMON --period 4`. */
export function optionFlags(options: Record<string, unknown>): string {
  return Object.entries(options)
    .filter(([, value]) => value !== undefined && value !== "" && value !== null)
    .map(([name, value]) =>
      typeof value === "boolean"
        ? value
          ? `--${name}`
          : `--no-${name}`
        : `--${name} ${shellArg(String(value))}`,
    )
    .join(" ");
}

/** Options as they would sit inside a TypeScript call: `{ key: "LEMON", period: 4 }`. */
export function optionLiteral(options: Record<string, unknown>): string {
  const entries = Object.entries(options).filter(([, value]) => value !== undefined && value !== "");
  if (entries.length === 0) {
    return "";
  }
  return `{ ${entries
    .map(([name, value]) => `${name}: ${typeof value === "string" ? JSON.stringify(value) : String(value)}`)
    .join(", ")} }`;
}
