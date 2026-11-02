import { describe, expect, test } from "bun:test";
import {
  continueList,
  insertLink,
  insertRule,
  selectedLines,
  TextEdit,
  toggleLineStyle,
  toggleWrap,
} from "@/utilities/markdownEdit";

// The text after the edit, with [ ] around the new selection
const apply = (value: string, edit: TextEdit | null) => {
  if (!edit) return null;
  const next = value.slice(0, edit.from) + edit.insert + value.slice(edit.to);
  return `${next.slice(0, edit.selectStart)}[${next.slice(edit.selectStart, edit.selectEnd)}]${next.slice(edit.selectEnd)}`;
};
// Selects from the first | to the second (or just a cursor at one |)
const at = (marked: string): [string, number, number] => {
  const start = marked.indexOf("|");
  const end = marked.indexOf("|", start + 1);
  const value = marked.replace(/\|/g, "");
  return [value, start, end === -1 ? start : end - 1];
};

describe("lines in the selection", () => {
  test("whole lines, but not the line a selection ends at the start of", () => {
    const value = "eka\ntoka\nkolmas";
    expect(selectedLines(value, 1, 6)).toEqual({ from: 0, to: 8 });
    // Dragged from "eka" to the start of "kolmas"
    expect(selectedLines(value, 0, 9)).toEqual({ from: 0, to: 8 });
    expect(selectedLines(value, 10, 10)).toEqual({ from: 9, to: 15 });
  });
});

describe("lists and headings", () => {
  test("a selection of lines becomes a numbered list, empty lines left alone", () => {
    const [value, start, end] = at("Ohjelma:\n|Kahvit\nKokous\n\nSauna|\nLoppu");
    expect(apply(value, toggleLineStyle(value, start, end, "numbered"))).toBe(
      "Ohjelma:\n[1. Kahvit\n2. Kokous\n\n3. Sauna]\nLoppu"
    );
  });

  test("the same again removes the numbers; bullets replace them", () => {
    const value = "1. Kahvit\n2. Kokous";
    expect(apply(value, toggleLineStyle(value, 0, value.length, "numbered"))).toBe("[Kahvit\nKokous]");
    expect(apply(value, toggleLineStyle(value, 0, value.length, "bullet"))).toBe("[- Kahvit\n- Kokous]");
  });

  test("a mixed selection gets the style on every line, not toggled per line", () => {
    const value = "- Kahvit\nKokous";
    expect(apply(value, toggleLineStyle(value, 0, value.length, "bullet"))).toBe("[- Kahvit\n- Kokous]");
  });

  test("a cursor in a line styles that line and stays by its text", () => {
    const [value, start] = at("Eka\nTo|ka");
    expect(apply(value, toggleLineStyle(value, start, start, "bullet"))).toBe("Eka\n- To[]ka");
    const [styled, cursor] = at("Eka\n- To|ka");
    expect(apply(styled, toggleLineStyle(styled, cursor, cursor, "bullet"))).toBe("Eka\nTo[]ka");
  });

  test("an empty line gets the marker to type after", () => {
    const [value, start] = at("Eka\n|");
    expect(apply(value, toggleLineStyle(value, start, start, "numbered"))).toBe("Eka\n1. []");
  });

  test("headings replace a heading of another level, and keep no indent", () => {
    const value = "### Kokous";
    expect(apply(value, toggleLineStyle(value, 6, 6, "h2"))).toBe("## Ko[]kous");
    expect(apply("## Kokous", toggleLineStyle("## Kokous", 9, 9, "h2"))).toBe("Kokous[]");
  });

  test("indented items keep their indent", () => {
    const value = "  Ala\n  Toinen";
    expect(apply(value, toggleLineStyle(value, 0, value.length, "bullet"))).toBe("[  - Ala\n  - Toinen]");
  });
});

describe("bold, italic and links", () => {
  test("wraps the selection, with spaces left outside", () => {
    const [value, start, end] = at("Kokous |tiistaina |klo 18");
    expect(apply(value, toggleWrap(value, start, end, "**", "lihavoitu teksti"))).toBe(
      "Kokous **[tiistaina]** klo 18"
    );
  });

  test("without a selection the placeholder is selected for typing over", () => {
    expect(apply("Moi ", toggleWrap("Moi ", 4, 4, "*", "kursivoitu teksti"))).toBe("Moi *[kursivoitu teksti]*");
  });

  test("a wrapped selection is unwrapped, from inside or with the markers", () => {
    const [inside, start, end] = at("Kokous **|tiistaina|**");
    expect(apply(inside, toggleWrap(inside, start, end, "**", ""))).toBe("Kokous [tiistaina]");
    const [whole, from, to] = at("Kokous |**tiistaina**|");
    expect(apply(whole, toggleWrap(whole, from, to, "**", ""))).toBe("Kokous [tiistaina]");
  });

  test("italic inside bold is added, not taken from the bold markers", () => {
    const [value, start, end] = at("**|sana|**");
    expect(apply(value, toggleWrap(value, start, end, "*", ""))).toBe("***[sana]***");
  });

  test("a link selects its address for typing", () => {
    const [value, start, end] = at("Katso |kerhon sivut|");
    expect(apply(value, insertLink(value, start, end))).toBe("Katso [kerhon sivut]([https://])");
  });

  test("a rule goes on a line of its own", () => {
    expect(apply("Teksti", insertRule("Teksti", 6))).toBe("Teksti\n---\n[]");
  });
});

describe("Enter in a list", () => {
  test("continues the list with the next marker and number", () => {
    const [bullets, cursor] = at("- Kahvit|");
    expect(apply(bullets, continueList(bullets, cursor))).toBe("- Kahvit\n- []");
    const [numbers, at2] = at("1. Kahvit\n2. Kokous|");
    expect(apply(numbers, continueList(numbers, at2))).toBe("1. Kahvit\n2. Kokous\n3. []");
  });

  test("an empty item ends the list", () => {
    const [value, cursor] = at("- Kahvit\n- |");
    expect(apply(value, continueList(value, cursor))).toBe("- Kahvit\n[]");
  });

  test("outside a list, or before the marker, Enter works as usual", () => {
    expect(continueList("Tavallinen rivi", 15)).toBeNull();
    expect(continueList("- Kahvit", 0)).toBeNull();
  });
});
