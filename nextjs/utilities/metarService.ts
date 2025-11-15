/**
 * METAR Service Utilities
 * Database operations for METAR data retrieval
 */

import connectionPool from "./db";

export interface METARData {
  id: number;
  stationCode: string;
  rawMetar: string;
  temperature: string | null;
  windSpeed: string | null;
  windDirection: string | null;
  visibility: string | null;
  clouds: string | null;
  qnh: string | null;
  observationTime: Date | null;
  fetchedAt: Date;
}

/**
 * Get the latest METAR data from the database
 */
export async function getLatestMETARFromDB(
  stationCode: string = "EFSA"
): Promise<METARData | null> {
  if (!connectionPool) {
    console.warn("Database connection pool not available");
    return null;
  }

  const query = `
    SELECT
      id,
      station_code as "stationCode",
      raw_metar as "rawMetar",
      temperature,
      wind_speed as "windSpeed",
      wind_direction as "windDirection",
      visibility,
      clouds,
      qnh,
      observation_time as "observationTime",
      fetched_at as "fetchedAt"
    FROM metar_data
    WHERE station_code = $1
    ORDER BY observation_time DESC, fetched_at DESC
    LIMIT 1;
  `;

  try {
    const result = await connectionPool.query(query, [stationCode]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    console.error("Error fetching latest METAR from database:", error);
    throw error;
  }
}
