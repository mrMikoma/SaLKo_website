import { describe, expect, test } from "bun:test";
import { decodeMetar, describeWeather, flightCategory, formatVisibility } from "@/utilities/metarDecode";
import { runwayWind, windComponents } from "@/utilities/runwayWind";

// Finnish number formatting groups digits with a no-break space
const plain = <T,>(value: T): T => JSON.parse(JSON.stringify(value).replace(/\u00a0/g, " "));

// Real reports from aviationweather.gov, 30 Oct – 1 Nov 2026, unless marked made up
describe("decodeMetar on EFSA's automatic reports", () => {
  test("an ordinary report: wind, visibility, one layer, temperatures, QNH", () => {
    const m = decodeMetar("METAR EFSA 011920Z AUTO 23008KT 9999 OVC035 07/04 Q1027");
    expect(m.station).toBe("EFSA");
    expect(m.timeCode).toBe("011920Z");
    expect(m.auto).toBe(true);
    expect(m.wind).toEqual({ calm: false, variable: false, direction: 230, speedKt: 8, gustKt: null, varyingFrom: null, varyingTo: null });
    expect(m.visibility).toEqual({ metres: 10000, tenOrMore: true, minimum: null });
    expect(m.clouds).toEqual([{ cover: "OVC", heightFt: 3500, type: null, code: "OVC035" }]);
    expect(m.ceilingFt).toBe(3500);
    expect([m.temperatureC, m.dewPointC, m.qnhHpa]).toEqual([7, 4, 1027]);
    expect(m.category).toBe("VFR");
    expect(m.other).toEqual([]);
  });

  test("showers, a varying direction and a CB the station could not place", () => {
    const m = decodeMetar("METAR EFSA 300420Z AUTO 17004KT 140V200 9999 -SHRA OVC005 //////CB 07/07 Q1016");
    expect([m.wind?.varyingFrom, m.wind?.varyingTo]).toEqual([140, 200]);
    expect(m.weather).toEqual([{ code: "-SHRA", text: "heikkoja sadekuuroja" }]);
    expect(m.clouds[1]).toEqual({ cover: null, heightFt: null, type: "CB", code: "//////CB" });
    expect(m.ceilingFt).toBe(500);
    expect(m.category).toBe("IFR");
    expect(m.other).toEqual([]);
  });

  test("a minimum visibility without a direction", () => {
    const m = decodeMetar("METAR EFSA 311720Z AUTO 32003KT 280V340 9999 1800 OVC034 04/04 Q1032");
    expect(m.visibility).toEqual({ metres: 10000, tenOrMore: true, minimum: { metres: 1800, direction: null } });
    expect(m.other).toEqual([]);
    // The category goes by the prevailing visibility, as aviationweather.gov's does
    expect(m.category).toBe("VFR");
  });

  test("cloud types an automatic station could not tell stay unknown, not CB", () => {
    const m = decodeMetar("METAR EKCH 011750Z AUTO 21006KT 9999 BKN017/// OVC046/// 10/07 Q1030 TEMPO BKN014");
    expect(m.clouds.map((c) => [c.cover, c.heightFt, c.type])).toEqual([
      ["BKN", 1700, null],
      ["OVC", 4600, null],
    ]);
    expect(m.category).toBe("MVFR");
  });
});

describe("decodeMetar on other reports", () => {
  test("drizzle and rain, three layers and a TEMPO trend", () => {
    const m = decodeMetar("METAR EFHK 011550Z 20010KT 4500 -DZRA FEW008 BKN012 BKN028 07/07 Q1029 TEMPO 8000 BKN020");
    expect(m.weather).toEqual([{ code: "-DZRA", text: "heikko tihku ja sade" }]);
    expect(m.ceilingFt).toBe(1200);
    // Visibility 4500 m is under 3 statute miles, so IFR beats the MVFR ceiling
    expect(m.category).toBe("IFR");
    expect(plain(m.trend)).toEqual([{ kind: "TEMPO", code: "TEMPO 8000 BKN020", text: "ajoittain: näkyvyys 8 km, BKN 2 000 ft" }]);
  });

  test("a correction, a direction range across north, NOSIG", () => {
    const m = decodeMetar("METAR ENGM 011320Z COR 04007KT 010V070 9999 FEW006 BKN018 08/06 Q1026 NOSIG");
    expect(m.correction).toBe(true);
    expect([m.wind?.direction, m.wind?.varyingFrom, m.wind?.varyingTo]).toEqual([40, 10, 70]);
    expect(m.trend.map((t) => t.kind)).toEqual(["NOSIG"]);
    expect(m.category).toBe("MVFR");
  });

  test("a variable wind and a BECMG trend", () => {
    const m = decodeMetar("METAR ENGM 011150Z VRB01KT 9999 SCT008 OVC015 08/06 Q1025 BECMG SCT012");
    expect(m.wind).toMatchObject({ variable: true, direction: null, speedKt: 1 });
    expect(plain(m.trend[0].text)).toBe("muuttumassa: SCT 1 200 ft");
  });

  test("RVR and recent showers", () => {
    const m = decodeMetar("METAR EFRO 011750Z 18004KT 1200 R16/P2000N BR OVC002 03/03 Q1021 RESHRA");
    expect(plain(m.rvr)).toEqual([{ runway: "16", code: "R16/P2000N", text: "yli 2 000 m, ei muutosta" }]);
    expect(m.weather).toEqual([{ code: "BR", text: "utu" }]);
    expect(m.recentWeather).toEqual([{ code: "RESHRA", text: "sadekuuroja" }]);
    expect(m.category).toBe("LIFR");
  });

  test("CAVOK means 10 km and no cloud below 5000 ft: VFR", () => {
    const m = decodeMetar("METAR EFSA 151350Z 22005KT CAVOK 12/03 Q1015"); // made up
    expect(m.cavok).toBe(true);
    expect(m.visibility?.tenOrMore).toBe(true);
    expect(m.ceilingFt).toBeNull();
    expect(m.category).toBe("VFR");
  });

  test("fog: calm, vertical visibility as the ceiling, minus temperatures", () => {
    const m = decodeMetar("METAR EFSA 020520Z AUTO 00000KT 0300 FG VV001 M02/M02 Q1031"); // made up
    expect(m.wind).toMatchObject({ calm: true, direction: null, speedKt: 0 });
    expect(m.visibility?.metres).toBe(300);
    expect(m.weather[0].text).toBe("sumu");
    expect(m.ceilingFt).toBe(100);
    expect([m.temperatureC, m.dewPointC]).toEqual([-2, -2]);
    expect(m.category).toBe("LIFR");
  });

  test("winter: gusts, blowing snow, a minimum visibility and a runway state group", () => {
    const m = decodeMetar("METAR EFSA 101250Z 33012G25KT 2000 1200NE -SN BLSN BKN008 M12/M15 Q1002 R12/490395"); // made up
    expect(m.wind).toMatchObject({ direction: 330, speedKt: 12, gustKt: 25 });
    expect(m.visibility?.minimum).toEqual({ metres: 1200, direction: "NE" });
    expect(m.weather.map((w) => w.text)).toEqual(["heikko lumisade", "pöllyävä lumi"]);
    expect(m.other).toEqual(["R12/490395"]);
    expect(m.category).toBe("IFR");
  });

  test("wind in metres per second, US visibility and altimeter", () => {
    expect(decodeMetar("METAR UUEE 011930Z 24005MPS 9999 SCT020 05/02 Q1018").wind?.speedKt).toBe(10);
    const us = decodeMetar("METAR KJFK 011951Z 22012KT 1 1/2SM BR FEW250 15/06 A3012");
    expect(us.visibility?.metres).toBe(2414);
    expect(us.qnhHpa).toBe(1020);
    expect(us.other).toEqual([]);
  });

  test("a missing report, a missing wind, NCD", () => {
    expect(decodeMetar("METAR EFSA 011920Z NIL")).toMatchObject({ missing: true, category: null });
    const m = decodeMetar("METAR EFSA 011920Z AUTO /////KT 9999 NCD 07/04 Q1027");
    expect(m.wind).toBeNull();
    expect(m.noCloud).toBe("NCD");
    expect(m.category).toBe("VFR");
  });

  test("no category without visibility or any cloud information", () => {
    expect(decodeMetar("METAR EFSA 011920Z AUTO 23008KT //// OVC035 07/04 Q1027").category).toBeNull();
    expect(decodeMetar("METAR EFSA 011920Z AUTO 23008KT 9999 07/04 Q1027").category).toBeNull();
  });
});

describe("flight category limits", () => {
  test("visibility: over 5 SM VFR, 3–5 MVFR, 1–3 IFR, under 1 LIFR", () => {
    expect(flightCategory(9000, null, true)).toBe("VFR");
    expect(flightCategory(8000, null, true)).toBe("MVFR");
    expect(flightCategory(5000, null, true)).toBe("MVFR");
    expect(flightCategory(4800, null, true)).toBe("IFR");
    expect(flightCategory(1600, null, true)).toBe("LIFR");
  });

  test("ceiling: over 3000 ft VFR, 1000–3000 MVFR, 500–999 IFR, under 500 LIFR", () => {
    expect(flightCategory(10000, 3100, true)).toBe("VFR");
    expect(flightCategory(10000, 3000, true)).toBe("MVFR");
    expect(flightCategory(10000, 1000, true)).toBe("MVFR");
    expect(flightCategory(10000, 900, true)).toBe("IFR");
    expect(flightCategory(10000, 400, true)).toBe("LIFR");
  });
});

describe("weather text", () => {
  test.each([
    ["+TSRA", "voimakas ukkonen ja sade"],
    ["-TSRA", "ukkonen ja heikko sade"],
    ["VCTS", "ukkonen lähistöllä"],
    ["VCSH", "kuuroja lähistöllä"],
    ["SHRASN", "sade- ja lumikuuroja"],
    ["+SHSN", "voimakkaita lumikuuroja"],
    ["FZRA", "jäätävä sade"],
    ["FZFG", "jäätävä sumu"],
    ["MIFG", "matala sumu"],
    ["BCFG", "sumupaikkoja"],
    ["-RASN", "heikko räntäsade"],
    ["DRSN", "ajelehtiva lumi"],
  ])("%s is %s", (code, text) => {
    expect(describeWeather(code)).toBe(text);
  });

  test("visibility reads in km from 5 km up, in metres below", () => {
    expect(formatVisibility(10000)).toBe("10 km tai yli");
    expect(formatVisibility(6500)).toBe("6,5 km");
    expect(plain(formatVisibility(1200))).toBe("1 200 m");
  });
});

describe("runway wind on 12/30", () => {
  test("straight down runway 30 is all headwind there and all tailwind on 12", () => {
    const summary = runwayWind(decodeMetar("METAR EFSA 011920Z AUTO 30610KT 9999 NCD 07/04 Q1027").wind);
    expect(summary?.ends.map((e) => [e.runway, e.headwindKt, e.crosswindKt, e.crosswindFrom])).toEqual([
      ["30", 10, 0, null],
      ["12", -10, 0, null],
    ]);
  });

  test("230° 8 kt: mostly crosswind, a little headwind on 30, from the left", () => {
    const summary = runwayWind(decodeMetar("METAR EFSA 011920Z AUTO 23008KT 9999 OVC035 07/04 Q1027").wind);
    expect(summary?.ends[0]).toEqual({ runway: "30", headwindKt: 2, crosswindKt: 8, crosswindFrom: "left", gustHeadwindKt: null, gustCrosswindKt: null });
    expect(summary?.ends[1]).toMatchObject({ runway: "12", headwindKt: -2, crosswindKt: 8, crosswindFrom: "right" });
  });

  test("gusts get their own components", () => {
    const summary = runwayWind(decodeMetar("METAR EFSA 101250Z 33012G25KT 9999 BKN030 M12/M15 Q1002").wind);
    expect(summary?.ends[0]).toEqual({ runway: "30", headwindKt: 11, crosswindKt: 5, crosswindFrom: "right", gustHeadwindKt: 23, gustCrosswindKt: 10 });
  });

  test("a varying direction gives the worst crosswind in the range", () => {
    const summary = runwayWind(decodeMetar("METAR EFSA 300420Z AUTO 17004KT 140V200 9999 OVC005 07/07 Q1016").wind);
    expect(summary?.maxCrosswindKt).toBe(4);
    // A range across the perpendicular has the full speed as crosswind
    const across = runwayWind(decodeMetar("METAR EFSA 300420Z AUTO 20010KT 180V240 9999 OVC050 07/07 Q1016").wind);
    expect(across?.maxCrosswindKt).toBe(10);
  });

  test("calm and VRB have no runway ends to compare", () => {
    expect(runwayWind(decodeMetar("METAR EFSA 020520Z AUTO 00000KT 9999 NCD M02/M02 Q1031").wind)).toEqual({ kind: "calm", ends: [], maxCrosswindKt: null });
    expect(runwayWind(decodeMetar("METAR EFSA 020520Z AUTO VRB03KT 9999 NCD M02/M02 Q1031").wind)).toEqual({ kind: "variable", ends: [], maxCrosswindKt: 3 });
  });

  test("components: crosswind from the right is positive", () => {
    const { headwind, crosswind } = windComponents(90, 10, 0);
    expect(Math.round(headwind)).toBe(0);
    expect(Math.round(crosswind)).toBe(10);
  });
});
