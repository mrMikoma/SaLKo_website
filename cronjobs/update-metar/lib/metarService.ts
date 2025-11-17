/**
 * METAR Service
 * Handles fetching METAR data from Aviation Weather Center API
 * and storing it in the database
 */

import connectionPool from "./db";
import { parseMETAR } from "./metarParser";

const AVIATION_WEATHER_API = "https://aviationweather.gov/api/data/metar";
const STATION_CODE = "EFSA"; // Savonlinna Airport

/**
 * Fetch METAR data from Aviation Weather Center API
 */
export async function fetchMETARFromAPI(
  stationCode: string = STATION_CODE
): Promise<string> {
  try {
    const url = `${AVIATION_WEATHER_API}?ids=${stationCode}&format=raw`;
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        "User-Agent": "SaLKo-Website/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch METAR: ${response.statusText}`);
    }

    const metarText = await response.text();
    const trimmedMetar = metarText.trim();

    if (!trimmedMetar || trimmedMetar.includes("error")) {
      throw new Error("Invalid METAR data received");
    }

    return trimmedMetar;
  } catch (error) {
    console.error("Error fetching METAR from API:", error);
    throw error;
  }
}

/**
 * Store METAR data in the database
 */
export async function storeMETARInDB(
  rawMetar: string,
  stationCode: string = STATION_CODE
): Promise<void> {
  if (!connectionPool) {
    throw new Error("Database connection pool not available");
  }

  const parsed = parseMETAR(rawMetar);

  const query = `
    INSERT INTO metar_data (
      station_code,
      raw_metar,
      temperature,
      wind_speed,
      wind_direction,
      visibility,
      clouds,
      qnh,
      observation_time
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (station_code, observation_time)
    DO UPDATE SET
      raw_metar = EXCLUDED.raw_metar,
      temperature = EXCLUDED.temperature,
      wind_speed = EXCLUDED.wind_speed,
      wind_direction = EXCLUDED.wind_direction,
      visibility = EXCLUDED.visibility,
      clouds = EXCLUDED.clouds,
      qnh = EXCLUDED.qnh,
      fetched_at = CURRENT_TIMESTAMP
    RETURNING id;
  `;

  const values = [
    stationCode,
    rawMetar,
    parsed.temperature,
    parsed.windSpeed,
    parsed.windDirection,
    parsed.visibility,
    parsed.clouds,
    parsed.qnh,
    parsed.observationTime,
  ];

  try {
    const result = await connectionPool.query(query, values);
    console.log(`METAR stored successfully with ID: ${result.rows[0].id}`);
  } catch (error) {
    console.error("Error storing METAR in database:", error);
    throw error;
  }
}

/**
 * Fetch and store METAR data (main service function)
 * This should be called by a cron job or background service
 */
export async function updateMetarData(
  stationCode: string = STATION_CODE
): Promise<void> {
  try {
    console.log(`Fetching METAR for ${stationCode}...`);
    const rawMetar = await fetchMETARFromAPI(stationCode);

    console.log(`Storing METAR in database...`);
    await storeMETARInDB(rawMetar, stationCode);

    console.log(`METAR update completed successfully for ${stationCode}`);
  } catch (error) {
    console.error(`Failed to update METAR for ${stationCode}:`, error);
    throw error;
  }
}

/**
 * Clean up old METAR data (keep last N days)
 */
export async function cleanupOldMETARData(daysToKeep: number = 7): Promise<void> {
  if (!connectionPool) {
    throw new Error("Database connection pool not available");
  }

  const query = `
    DELETE FROM metar_data
    WHERE fetched_at < NOW() - INTERVAL '${daysToKeep} days';
  `;

  try {
    const result = await connectionPool.query(query);
    console.log(`Cleaned up ${result.rowCount} old METAR records`);
  } catch (error) {
    console.error("Error cleaning up old METAR data:", error);
    throw error;
  }
}
