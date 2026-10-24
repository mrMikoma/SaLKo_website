import { describe, expect, test } from "bun:test";
import { isBilledStatus, parseFlightSheet, SheetValues } from "@/utilities/flightSheetParser";
import { inputHash } from "@/utilities/flightInputHash";

const HEADERS = [
  "Päivämäärä", "Päällikkö", "Oppilas / SIC", "Henkilömäärä", "Lentoonlähtöpaikka",
  "Laskupaikka", "Lentoonlähtöaika", "Laskuaika", "Ilmassa oloaika",
  "Kokonais ilmassaoloaika", "Laskujen määrä", "Laskujen kokonaismäärä", "Lennon tarkoitus",
  "Tankkaus", "Öljy", "Tuntimittari", "Huomiot", "ID", "Lähde", "Tila",
];
const TAKEOFF = 6;
const AIRFRAME_TOTAL = 9;
const LANDINGS_TOTAL = 11;
const STATUS = 19;

const row = () => [
  46113, "M. Meikäläinen", "", 2, "EFSA", "EFSA", 0.78, 0.8, 0.02, 238, 1, 12061, "HAR",
  "", "", "", "", "id-1", "", "",
];
const hashOf = (values: unknown[]) =>
  inputHash(parseFlightSheet([HEADERS, [], values] as SheetValues).flights[0]);

describe("checking flights against the paper book", () => {
  test("a row's hash follows what was typed, not the running totals or Tila", () => {
    const original = hashOf(row());

    const totalsMoved = row();
    totalsMoved[AIRFRAME_TOTAL] = 300;
    totalsMoved[LANDINGS_TOTAL] = 12070;
    expect(hashOf(totalsMoved)).toBe(original);

    const statusSet = row();
    statusSet[STATUS] = "Tarkistettu";
    expect(hashOf(statusSet)).toBe(original);

    const takeoffFixed = row();
    takeoffFixed[TAKEOFF] = 0.775;
    expect(hashOf(takeoffFixed)).not.toBe(original);
  });

  test("statuses from a closed billing period are left alone", () => {
    expect(isBilledStatus("Laskutettu")).toBe(true);
    expect(isBilledStatus(" ei laskuteta ")).toBe(true);
    expect(isBilledStatus("Maksettu")).toBe(true);
    expect(isBilledStatus(null)).toBe(false);
    expect(isBilledStatus("Korjattava")).toBe(false);
    // A typo can be fixed from the review page
    expect(isBilledStatus("Tarkistetu")).toBe(false);
  });
});
