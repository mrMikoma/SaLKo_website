/**
 * The Finnish bank barcode (pankkiviivakoodi) as bars, for the printed
 * invoice. It encodes the 54 digits of the virtual barcode (virtualBarcode
 * in utilities/invoices.ts) in Code 128, character set C, as Finance
 * Finland's Bank Bar Code Guide specifies: a fixed Start Code C, the digits
 * as 27 value pairs, a modulus 103 check character and Stop.
 */

// Code 128 bar and space widths, bar first, for symbol values 0–106
// (ISO/IEC 15417). 105 is Start Code C; 106 is Stop, whose final bar of
// width 2 is added separately.
const PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
  "114131", "311141", "411131", "211412", "211214", "211232", "233111",
];

export const CODE128_PATTERNS: readonly string[] = PATTERNS;

const START_C = 105;
const STOP = 106;

/**
 * The symbol values of a bank barcode: Start Code C, the digits in pairs, the
 * check character and Stop. Null unless the input is the 54 digits of a
 * version 4 or 5 virtual barcode.
 */
export function bankBarcodeValues(digits: string): number[] | null {
  if (!/^[45]\d{53}$/.test(digits)) return null;
  const pairs = Array.from({ length: 27 }, (_, i) => Number(digits.slice(i * 2, i * 2 + 2)));
  // The start character and the first pair both weigh 1, then 2, 3… 27
  const sum = pairs.reduce((total, value, i) => total + value * (i + 1), START_C);
  return [START_C, ...pairs, sum % 103, STOP];
}

/**
 * The widths of the symbol's bars and spaces in modules, bar first: 332
 * modules in all, with no quiet zones (those are the page's margins).
 */
export function bankBarcodeWidths(digits: string): number[] | null {
  const values = bankBarcodeValues(digits);
  if (!values) return null;
  return [...values.flatMap((value) => [...PATTERNS[value]].map(Number)), 2];
}

/**
 * The bars as rectangles: x and width in modules from the symbol's left
 * edge, for an SVG whose viewBox is the symbol's width in modules.
 */
export function bankBarcodeBars(digits: string): { bars: { x: number; width: number }[]; modules: number } | null {
  const widths = bankBarcodeWidths(digits);
  if (!widths) return null;
  const bars: { x: number; width: number }[] = [];
  let x = 0;
  widths.forEach((width, i) => {
    if (i % 2 === 0) bars.push({ x, width });
    x += width;
  });
  return { bars, modules: x };
}
