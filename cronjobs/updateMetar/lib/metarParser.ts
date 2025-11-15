/**
 * METAR Parser Utility
 * Parses raw METAR strings into structured data
 */

export interface ParsedMETAR {
  temperature: string;
  windSpeed: string;
  windDirection: string;
  visibility: string;
  clouds: string;
  qnh: string;
  observationTime: Date | null;
}

/**
 * Parse METAR string to extract weather information
 */
export const parseMETAR = (metar: string): ParsedMETAR => {
  // Extract temperature (format: 12/08 means 12°C temp, 08°C dewpoint)
  const tempMatch = metar.match(/\s(M?\d{2})\/(M?\d{2})\s/);
  let temperature = "N/A";
  if (tempMatch) {
    const temp = tempMatch[1].replace("M", "-");
    temperature = `${temp}°C`;
  }

  // Extract wind (format: 22005KT means 220° at 5 knots)
  const windMatch = metar.match(/\s(\d{3})(\d{2,3})(G\d{2,3})?(KT|MPS)\s/);
  let windSpeed = "N/A";
  let windDirection = "N/A";
  if (windMatch) {
    const direction = parseInt(windMatch[1]);
    const speed = parseInt(windMatch[2]);
    const gust = windMatch[3] ? ` (puhkaisu ${windMatch[3].substring(1)})` : "";
    const unit = windMatch[4];

    // Convert wind direction to cardinal direction
    const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    const index = Math.round(direction / 45) % 8;
    windDirection = directions[index];

    // Convert to m/s if in knots
    const speedInMs = unit === "KT" ? Math.round(speed * 0.514) : speed;
    windSpeed = `${speedInMs} m/s${gust}`;
  }

  // Handle variable or calm wind
  if (metar.includes("00000KT")) {
    windSpeed = "Tyyntä";
    windDirection = "-";
  } else if (metar.match(/VRB\d{2,3}(KT|MPS)/)) {
    windDirection = "Vaihteleva";
  }

  // Extract visibility (format: 9999 means 10km+, or specific meters)
  const visMatch = metar.match(/\s(\d{4})\s/);
  let visibility = "N/A";
  if (visMatch) {
    const vis = parseInt(visMatch[1]);
    visibility = vis >= 9999 ? "10+ km" : `${(vis / 1000).toFixed(1)} km`;
  }

  // Extract clouds (format: SCT040 means scattered clouds at 4000ft)
  const cloudMatch = metar.match(/\s(SKC|CLR|FEW|SCT|BKN|OVC)(\d{3})?\s/);
  const cloudTypes: { [key: string]: string } = {
    SKC: "Selkeä",
    CLR: "Selkeä",
    FEW: "Vähän pilviä",
    SCT: "Hajanaisia pilviä",
    BKN: "Melko pilvistä",
    OVC: "Pilvipeite",
  };
  const clouds = cloudMatch ? cloudTypes[cloudMatch[1]] || cloudMatch[1] : "N/A";

  // Extract QNH (format: Q1015 means 1015 hPa)
  const qnhMatch = metar.match(/\sQ(\d{4})\s?/);
  const qnh = qnhMatch ? `${qnhMatch[1]} hPa` : "N/A";

  // Extract observation time from METAR (format: 151350Z means 15th day, 13:50 UTC)
  let observationTime: Date | null = null;
  const timeMatch = metar.match(/\s(\d{2})(\d{2})(\d{2})Z\s/);
  if (timeMatch) {
    const day = parseInt(timeMatch[1]);
    const hour = parseInt(timeMatch[2]);
    const minute = parseInt(timeMatch[3]);

    // Create date object for current month/year
    const now = new Date();
    observationTime = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      day,
      hour,
      minute,
      0
    ));

    // Handle month boundary (if day is in future, it's from previous month)
    if (observationTime > now) {
      observationTime.setUTCMonth(observationTime.getUTCMonth() - 1);
    }
  }

  return {
    temperature,
    windSpeed,
    windDirection,
    visibility,
    clouds,
    qnh,
    observationTime,
  };
};
