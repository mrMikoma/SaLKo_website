import { describe, expect, test } from "bun:test";
import { describeSheetError, parseServiceAccountKey } from "@/utilities/googleSheetsSetup";

// The shape of a key file from Google Cloud; not a real key
const KEY = {
  type: "service_account",
  project_id: "salko-test",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n",
  client_email: "lentopaivakirja@salko-test.iam.gserviceaccount.com",
};
const json = JSON.stringify(KEY, null, 2);

describe("the service account key", () => {
  test("is read as JSON or as base64 of it", () => {
    expect(parseServiceAccountKey(json).client_email).toBe(KEY.client_email);
    expect(parseServiceAccountKey(Buffer.from(json).toString("base64")).private_key).toBe(
      KEY.private_key
    );
    expect(parseServiceAccountKey(`  ${Buffer.from(json).toString("base64")}\n`).type).toBe(
      "service_account"
    );
  });

  test("anything else is refused with a message that says what to give", () => {
    expect(() => parseServiceAccountKey("")).toThrow(/palvelutilin avain/);
    expect(() => parseServiceAccountKey("not base64 at all")).toThrow(/palvelutilin avain/);
    // An OAuth client file is JSON too, but not a service account
    expect(() => parseServiceAccountKey('{"web":{"client_id":"x"}}')).toThrow(/palvelutilin avain/);
  });
});

describe("Google's errors", () => {
  const account = KEY.client_email;

  test("say what to fix", () => {
    expect(describeSheetError({ status: 403, message: "The caller does not have permission" }, account)).toBe(
      `Palvelutilillä ${account} ei ole pääsyä taulukkoon. Jaa taulukko tälle osoitteelle muokkaajana.`
    );
    expect(
      describeSheetError(
        { code: 403, message: "Google Sheets API has not been used in project 123 before or it is disabled." },
        account
      )
    ).toMatch(/^Google Sheets API ei ole käytössä/);
    expect(describeSheetError({ response: { status: 404 }, message: "Requested entity was not found." }, account)).toMatch(
      /FLIGHT_LOG_SPREADSHEET_ID/
    );
    expect(
      describeSheetError({ code: 400, message: "Unable to parse range: 'OH-CON Matkapäiväkirja'" }, account)
    ).toBe(
      'Taulukosta puuttuu välilehti "OH-CON Matkapäiväkirja". Välilehden nimen pitää olla sama kuin aircraft_sheets.sheet_name.'
    );
    expect(describeSheetError(new Error("invalid_grant: Invalid JWT Signature."), account)).toMatch(/uusi avain/);
  });

  test("anything else keeps Google's message", () => {
    expect(describeSheetError(new Error("socket hang up"), null)).toBe("socket hang up");
  });
});
