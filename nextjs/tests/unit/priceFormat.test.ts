import { describe, expect, test } from "bun:test";
import { finnishDate, formatEuros, formatPrice, minutePrice, parsePriceInput } from "@/utilities/priceFormat";

// Finnish numbers group thousands with a no-break space
const plain = (text: string) => text.replace(/ /g, " ");

describe("the price list", () => {
  test("prices read the Finnish way, decimals only when there are cents", () => {
    expect(formatEuros(6000)).toBe("60");
    expect(formatEuros(1050)).toBe("10,50");
    expect(plain(formatEuros(900000))).toBe("9 000");
    expect(formatPrice({ priceCents: 6000, unit: "€/vuosi" })).toBe("60 €/vuosi");
    expect(formatPrice({ priceCents: 0, unit: "€/vuosi" })).toBe("0 €/vuosi");
    expect(formatPrice({ priceCents: null, unit: "€" })).toBe("Kysy hintaa");
    expect(formatPrice({ priceCents: null, unit: "€" }, "TBA")).toBe("TBA");
  });

  test("an aircraft's per-minute price from its hourly one", () => {
    expect(minutePrice(18600)).toBe("3,10");
    expect(minutePrice(30000)).toBe("5,00");
    expect(minutePrice(10000)).toBe("≈ 1,67");
  });

  test("prices typed in the editor", () => {
    expect(parsePriceInput("60")).toBe(6000);
    expect(parsePriceInput("12,50")).toBe(1250);
    expect(parsePriceInput("9 000 €")).toBe(900000);
    expect(parsePriceInput("")).toBeNull();
    expect(parsePriceInput("  ")).toBeNull();
    expect(parsePriceInput("abc")).toBeUndefined();
    expect(parsePriceInput("-5")).toBeUndefined();
    expect(parsePriceInput("1,234")).toBeUndefined();
  });

  test("the date it is valid from", () => {
    expect(finnishDate("2026-03-18")).toBe("18.3.2026");
  });
});
