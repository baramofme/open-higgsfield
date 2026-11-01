/* CSV round-trip for the app's element records. The encoder is the mirror of
   the element form's own columns; the decoder rebuilds records from a header it
   reads by name, so the column order never has to match what we wrote. The id
   column is read but thrown away — a re-imported element is a brand-new record
   that must never collide with the one that produced the file. Anything the row
   does not name falls back to the same defaults the form assigns. */

import {
  ELEMENT_DEFAULTS,
  type ElementAttr,
  type ElementCategory,
  type ElementItem,
  type ElementStatus,
} from "@/generation/stores/elements";

/** The columns we write, in the order we write them. The reader ignores order,
    so this is a layout choice, not a contract. */
export const ELEMENT_CSV_HEADER = [
  "id",
  "name",
  "url",
  "projectId",
  "category",
  "version",
  "elementId",
  "description",
  "status",
  "performer",
  "attrs",
] as const;

/** RFC4180 field quoting: a cell holding a comma, a quote, or a line break is
    wrapped in double quotes, and every quote inside it is doubled. */
function csvField(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/** Serialize the records, header first. Rows are CRLF-terminated as the spec
    asks, so the file opens cleanly in the spreadsheet apps the visitor uses. */
export function encodeElementsCsv(items: ElementItem[]): string {
  const lines = [ELEMENT_CSV_HEADER.join(",")];
  for (const item of items) {
    lines.push(
      [
        csvField(item.id),
        csvField(item.name),
        csvField(item.url),
        csvField(item.projectId),
        csvField(item.category),
        csvField(item.version),
        csvField(item.elementId),
        csvField(item.description),
        csvField(item.status),
        csvField(item.performer ?? ""),
        csvField(JSON.stringify(item.attrs)),
      ].join(","),
    );
  }
  return `${lines.join("\r\n")}\r\n`;
}

/** A real RFC4180 state machine, not a split on commas. A quoted cell may hold
    commas, line breaks, and doubled quotes; a naive split would shred every one
    of them. Line breaks inside a quoted cell belong to the cell, not the row. */
export function parseCsvRecords(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let i = 0;

  const endField = () => {
    row.push(field);
    field = "";
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          quoted = false;
          i += 1;
        }
      } else {
        field += c;
        i += 1;
      }
    } else if (c === '"') {
      quoted = true;
      i += 1;
    } else if (c === ",") {
      endField();
      i += 1;
    } else if (c === "\r") {
      /* A CR only ends the row when a LF does not follow — in CRLF the LF is the
         line terminator, so the CR is skipped and the LF ends the row. */
      if (text[i + 1] === "\n") {
        i += 1;
      } else {
        endRow();
        i += 1;
      }
    } else if (c === "\n") {
      endRow();
      i += 1;
    } else {
      field += c;
      i += 1;
    }
  }
  /* Flush a final row only if it carries content — a trailing newline must not
     conjure an empty record out of nothing. */
  if (field !== "" || row.length > 0) endRow();
  return rows;
}

const CATEGORIES: ReadonlySet<string> = new Set(["auto", "character", "place", "prop"]);
const STATUSES: ReadonlySet<string> = new Set(["none", "progress", "review"]);

function parseCategory(raw: string | undefined): ElementCategory {
  return raw !== undefined && CATEGORIES.has(raw) ? (raw as ElementCategory) : ELEMENT_DEFAULTS.category;
}

function parseStatus(raw: string | undefined): ElementStatus {
  return raw !== undefined && STATUSES.has(raw) ? (raw as ElementStatus) : ELEMENT_DEFAULTS.status;
}

/** The attrs cell is one JSON array; a row whose cell will not parse (or that
    omits the column entirely) keeps the empty set the form starts with. */
function parseAttrs(raw: string | undefined): ElementAttr[] {
  if (raw === undefined || raw === "") return ELEMENT_DEFAULTS.attrs;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return ELEMENT_DEFAULTS.attrs;
    return parsed
      .filter((entry): entry is ElementAttr =>
        !!entry &&
        typeof entry === "object" &&
        typeof (entry as ElementAttr).key === "string" &&
        typeof (entry as ElementAttr).value === "string",
      )
      .map((entry) => ({ key: entry.key, value: entry.value }));
  } catch {
    return ELEMENT_DEFAULTS.attrs;
  }
}

/* Ids stay in the form's own shape; a counter suffix keeps two rows decoded in
   the same millisecond from sharing one id. */
let idCounter = 0;
function newElementId(): string {
  return `el-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}-${(idCounter++).toString(36)}`;
}

export type ElementCsvResult = {
  items: ElementItem[];
  /** Header columns we did not recognize, reported so the import can say what
      was ignored without silently guessing at them. */
  unknownColumns: string[];
};

/** Map by header name, not position — a file the visitor edited in a
    spreadsheet may shuffle or add columns. Rows before the header do not exist;
    an empty header means there is nothing to import. */
export function decodeElementsCsv(text: string): ElementCsvResult {
  const rows = parseCsvRecords(text);
  if (rows.length === 0) return { items: [], unknownColumns: [] };

  const header = rows[0].map((cell) => cell.trim());
  const known = new Set<string>(ELEMENT_CSV_HEADER);
  const unknownColumns = header.filter((name) => name !== "" && !known.has(name));

  const col: Record<string, number> = {};
  header.forEach((name, index) => {
    if (known.has(name) && col[name] === undefined) col[name] = index;
  });

  const cellAt = (row: string[], name: string): string | undefined => {
    const idx = col[name];
    if (idx === undefined) return undefined;
    return idx < row.length ? row[idx] : undefined;
  };

  const items: ElementItem[] = [];
  for (let r = 1; r < rows.length; r += 1) {
    const row = rows[r];
    /* A fully blank row (a stray blank line the spreadsheet left) is not an element. */
    if (row.length === 0 || (row.length === 1 && row[0].trim() === "")) continue;

    /* The CSV's own id is discarded on purpose — re-import means a new record. */
    const name = cellAt(row, "name");
    const url = cellAt(row, "url");
    const projectId = cellAt(row, "projectId");
    const version = cellAt(row, "version");
    const elementId = cellAt(row, "elementId");
    const description = cellAt(row, "description");
    const performerCell = cellAt(row, "performer");

    const item: ElementItem = {
      id: newElementId(),
      name: name !== undefined ? name : "",
      url: url !== undefined ? url : "",
      projectId: projectId !== undefined && projectId !== "" ? projectId : ELEMENT_DEFAULTS.projectId,
      category: parseCategory(cellAt(row, "category")),
      version: version !== undefined ? version : ELEMENT_DEFAULTS.version,
      elementId: elementId !== undefined ? elementId : ELEMENT_DEFAULTS.elementId,
      description: description !== undefined ? description : ELEMENT_DEFAULTS.description,
      status: parseStatus(cellAt(row, "status")),
      attrs: parseAttrs(cellAt(row, "attrs")),
      performer: performerCell !== undefined && performerCell !== "" ? performerCell : ELEMENT_DEFAULTS.performer,
    };
    items.push(item);
  }

  return { items, unknownColumns };
}

/** The downloads-folder name the visitor can still find in six months. */
export function elementsCsvFileName(): string {
  return `openhiggsfield-elements-${new Date().toISOString().slice(0, 10)}.csv`;
}
