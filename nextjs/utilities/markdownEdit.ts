/**
 * What the bulletin editor's toolbar and keys do to the Markdown text
 * (components/admin/bulletinTable.tsx). Each function returns one edit:
 * replace value[from, to) with insert, then select [selectStart, selectEnd).
 * The browser applies it as typing, so Ctrl+Z still undoes it.
 */

export interface TextEdit {
  from: number;
  to: number;
  insert: string;
  selectStart: number;
  selectEnd: number;
}

export type LineStyle = "bullet" | "numbered" | "h2" | "h3";

// "- ", "* ", "1. " or "1) " after any indentation
const LIST_MARKER = /^(\s*)(?:[-*+]|\d+[.)])\s+/;
const HEADING_MARKER = /^#{1,6}\s+/;

const HAS_STYLE: Record<LineStyle, RegExp> = {
  bullet: /^\s*[-*+]\s+/,
  numbered: /^\s*\d+[.)]\s+/,
  h2: /^##(?!#)\s+/,
  h3: /^###(?!#)\s+/,
};

/**
 * The whole lines a selection touches, from the start of the first to the end
 * of the last. A selection that ends at the very start of a line, as one made
 * by dragging down to the next line does, leaves that line out.
 */
export function selectedLines(value: string, start: number, end: number): { from: number; to: number } {
  const from = value.lastIndexOf("\n", start - 1) + 1;
  const last = end > start && value[end - 1] === "\n" ? end - 1 : end;
  const newline = value.indexOf("\n", last);
  return { from, to: newline === -1 ? value.length : newline };
}

/**
 * Makes every selected line a bullet, a numbered item (1., 2., 3.…) or a
 * heading, replacing another list marker or heading it has. When every line
 * already has that style, it is removed instead. Empty lines are left as they
 * are, except a lone empty line, which gets the marker to start typing after.
 */
export function toggleLineStyle(value: string, start: number, end: number, style: LineStyle): TextEdit {
  const { from, to } = selectedLines(value, start, end);
  const lines = value.slice(from, to).split("\n");
  const hasText = lines.some((line) => line.trim() !== "");
  const targets = (line: string) => !hasText || line.trim() !== "";
  const remove = hasText && lines.filter(targets).every((line) => HAS_STYLE[style].test(line));

  let number = 0;
  const next = lines.map((line) => {
    if (!targets(line)) return line;
    const indent = style === "bullet" || style === "numbered" ? (line.match(/^\s*/)?.[0] ?? "") : "";
    const bare = line.replace(LIST_MARKER, "").replace(HEADING_MARKER, "").trimStart();
    if (remove) return indent + bare;
    number += 1;
    const marker = { bullet: "- ", numbered: `${number}. `, h2: "## ", h3: "### " }[style];
    return indent + marker + bare;
  });
  const insert = next.join("\n");

  // A cursor in one line stays by the same text; a selection covers the result
  if (start === end && lines.length === 1) {
    const cursor = Math.max(from, Math.min(from + insert.length, start + insert.length - (to - from)));
    return { from, to, insert, selectStart: cursor, selectEnd: cursor };
  }
  return { from, to, insert, selectStart: from, selectEnd: from + insert.length };
}

/**
 * Bold (**) or italic (*) around the selection, or the placeholder text
 * selected for typing over. Spaces at the selection's edges stay outside the
 * markers, where Markdown needs them. A selection already wrapped, inside or
 * just outside the markers, is unwrapped.
 */
export function toggleWrap(value: string, start: number, end: number, marker: string, placeholder: string): TextEdit {
  const selected = value.slice(start, end);
  const size = marker.length;
  // "*" next to another "*" is part of a bold marker, not italic
  const isMarker = (at: number) =>
    value.slice(at, at + size) === marker &&
    (size > 1 || (value[at - 1] !== "*" && value[at + 1] !== "*"));

  if (start >= size && isMarker(start - size) && isMarker(end)) {
    return {
      from: start - size,
      to: end + size,
      insert: selected,
      selectStart: start - size,
      selectEnd: end - size,
    };
  }
  if (selected.length > 2 * size && selected.startsWith(marker) && selected.endsWith(marker)) {
    const inner = selected.slice(size, -size);
    return { from: start, to: end, insert: inner, selectStart: start, selectEnd: start + inner.length };
  }

  const leading = selected.match(/^\s*/)![0];
  const trailing = selected.trim() === "" ? "" : selected.match(/\s*$/)![0];
  const text = selected.trim() || placeholder;
  const insert = `${leading}${marker}${text}${marker}${trailing}`;
  const textStart = start + leading.length + size;
  return { from: start, to: end, insert, selectStart: textStart, selectEnd: textStart + text.length };
}

/** A link with the selection as its text; the address is selected for typing */
export function insertLink(value: string, start: number, end: number): TextEdit {
  const text = value.slice(start, end).trim() || "linkin teksti";
  const insert = `[${text}](https://)`;
  const address = start + text.length + 3;
  return { from: start, to: end, insert, selectStart: address, selectEnd: address + "https://".length };
}

/** A horizontal rule on a line of its own at the cursor */
export function insertRule(value: string, start: number): TextEdit {
  const before = value.slice(0, start);
  const insert = `${before.length > 0 && !before.endsWith("\n") ? "\n" : ""}---\n`;
  return { from: start, to: start, insert, selectStart: start + insert.length, selectEnd: start + insert.length };
}

/**
 * Enter in a list item starts the next one ("- ", or "3. " after "2. ").
 * Enter in an empty item ends the list, removing its marker. Null when the
 * cursor isn't after a list marker, so Enter works as usual.
 */
export function continueList(value: string, cursor: number): TextEdit | null {
  const lineStart = value.lastIndexOf("\n", cursor - 1) + 1;
  const newline = value.indexOf("\n", cursor);
  const lineEnd = newline === -1 ? value.length : newline;
  const match = value.slice(lineStart, cursor).match(/^(\s*)(?:([-*+])|(\d+)([.)]))(\s+)(.*)$/);
  if (!match) return null;
  const [, indent, bullet, number, delimiter, space, text] = match;

  if (text.trim() === "" && value.slice(cursor, lineEnd).trim() === "") {
    return { from: lineStart, to: lineEnd, insert: "", selectStart: lineStart, selectEnd: lineStart };
  }
  const marker = bullet ?? `${Number(number) + 1}${delimiter}`;
  const insert = `\n${indent}${marker}${space}`;
  return { from: cursor, to: cursor, insert, selectStart: cursor + insert.length, selectEnd: cursor + insert.length };
}
