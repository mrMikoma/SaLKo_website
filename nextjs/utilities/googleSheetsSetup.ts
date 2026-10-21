/**
 * Connecting the website to the flight log Google Sheet: reading the service
 * account key, and saying what to fix when Google refuses. The steps are in
 * docs/FLIGHT_LOG_SETUP.md.
 */

export interface ServiceAccountKey {
  type: string;
  client_email: string;
  private_key: string;
  [field: string]: unknown;
}

const BAD_KEY =
  "GOOGLE_SERVICE_ACCOUNT_KEY ei ole palvelutilin avain. Anna Google Cloudista ladattu JSON-avain sellaisenaan tai base64-muodossa.";

/**
 * GOOGLE_SERVICE_ACCOUNT_KEY holds the JSON key file as is, or base64 of it.
 * The deploy workflows pass base64: the key's quotes and newlines don't
 * survive being echoed into an env file.
 */
export function parseServiceAccountKey(raw: string): ServiceAccountKey {
  const text = raw.trim();
  const json = text.startsWith("{") ? text : Buffer.from(text, "base64").toString("utf8");
  let key: Partial<ServiceAccountKey>;
  try {
    key = JSON.parse(json);
  } catch {
    throw new Error(BAD_KEY);
  }
  if (key?.type !== "service_account" || !key.client_email || !key.private_key) {
    throw new Error(BAD_KEY);
  }
  return key as ServiceAccountKey;
}

/** The service account's email, if a usable key is configured */
export function configuredServiceAccount(): string | null {
  try {
    return parseServiceAccountKey(process.env.GOOGLE_SERVICE_ACCOUNT_KEY ?? "").client_email;
  } catch {
    return null;
  }
}

// googleapis (gaxios) errors carry the HTTP status in one of these
type GoogleError = {
  message?: string;
  status?: number;
  code?: number | string;
  response?: { status?: number };
};

/** A Google API error as what the admin should do about it, in Finnish */
export function describeSheetError(error: unknown, serviceAccount: string | null): string {
  const e = (error ?? {}) as GoogleError;
  const message = e.message ?? String(error);
  const status = Number(e.status ?? e.response?.status ?? e.code);

  if (/has not been used in project|is disabled/i.test(message)) {
    return "Google Sheets API ei ole käytössä palvelutilin Google Cloud -projektissa. Ota se käyttöön: APIs & Services → Library → Google Sheets API.";
  }
  if (status === 403 || /caller does not have permission/i.test(message)) {
    return `Palvelutilillä${serviceAccount ? ` ${serviceAccount}` : ""} ei ole pääsyä taulukkoon. Jaa taulukko tälle osoitteelle muokkaajana.`;
  }
  if (status === 404 || /Requested entity was not found/i.test(message)) {
    return "Taulukkoa ei löydy. Tarkista FLIGHT_LOG_SPREADSHEET_ID: se on taulukon osoitteessa /d/ ja /edit välissä.";
  }
  const range = message.match(/Unable to parse range: '?([^'!]+)/);
  if (range) {
    return `Taulukosta puuttuu välilehti "${range[1]}". Välilehden nimen pitää olla sama kuin aircraft_sheets.sheet_name.`;
  }
  if (/invalid_grant|DECODER|PEM|private key/i.test(message)) {
    return "Palvelutilin avain ei kelpaa. Luo palvelutilille uusi avain ja päivitä GOOGLE_SERVICE_ACCOUNT_KEY.";
  }
  return message;
}
