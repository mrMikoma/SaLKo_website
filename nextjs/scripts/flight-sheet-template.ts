// Writes the empty flight log spreadsheet (docs/lentopaivakirja-pohja.xlsx)
// from utilities/flightSheetTemplate.ts. Run from nextjs/:
//
//   bun run flight-sheet:template                      OH-CON's tab
//   bun run flight-sheet:template "OH-PDX Matkapäiväkirja" out.xlsx
//
// Upload the file to Google Drive and open it with Google Sheets; see
// docs/FLIGHT_LOG_SETUP.md.
import { writeFileSync } from "fs";
import path from "path";
import { buildFlightSheetTemplate } from "@/utilities/flightSheetTemplate";
import { writeXlsx } from "@/utilities/xlsx";

const [tab = "OH-CON Matkapäiväkirja", output = "docs/lentopaivakirja-pohja.xlsx"] =
  process.argv.slice(2);
const file = path.resolve(process.cwd(), output);
writeFileSync(file, writeXlsx(buildFlightSheetTemplate(tab)));
console.log(`Wrote ${path.relative(process.cwd(), file)} with the tab "${tab}"`);
