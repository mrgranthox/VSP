const normalizeCsvValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
};

const escapeCsvCell = (value: unknown): string => {
  const normalized = normalizeCsvValue(value);

  if (/[",\n\r]/.test(normalized)) {
    return `"${normalized.replace(/"/g, "\"\"")}"`;
  }

  return normalized;
};

const buildCsv = (columns: string[], rows: Array<Record<string, unknown>>): string => {
  const lines = [columns.join(",")];

  for (const row of rows) {
    lines.push(columns.map((column) => escapeCsvCell(row[column])).join(","));
  }

  return `\uFEFF${lines.join("\n")}`;
};

export { buildCsv };
