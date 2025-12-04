/**
 * Server Actions for METAR data
 * These functions can be called from client components
 */

"use server";

import { getLatestMETARFromDB } from "@/utilities/metarService";

export interface METARResponse {
  success: boolean;
  data?: {
    raw: string;
    temperature: string;
    windSpeed: string;
    windDirection: string;
    visibility: string;
    clouds: string;
    qnh: string;
    timestamp: string;
  };
  error?: string;
}

/**
 * Get the latest METAR data
 * This is a server action that can be called from client components
 */
export async function getLatestMETAR(): Promise<METARResponse> {
  try {
    const metar = await getLatestMETARFromDB();

    if (!metar) {
      return {
        success: false,
        error: "No METAR data available",
      };
    }

    // Format timestamp for display
    const timestamp = metar.observationTime
      ? new Date(metar.observationTime).toLocaleTimeString("fi-FI", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "UTC",
        }) + " UTC"
      : new Date(metar.fetchedAt).toLocaleTimeString("fi-FI", {
          hour: "2-digit",
          minute: "2-digit",
        });

    return {
      success: true,
      data: {
        raw: metar.rawMetar,
        temperature: metar.temperature || "N/A",
        windSpeed: metar.windSpeed || "N/A",
        windDirection: metar.windDirection || "N/A",
        visibility: metar.visibility || "N/A",
        clouds: metar.clouds || "N/A",
        qnh: metar.qnh || "N/A",
        timestamp,
      },
    };
  } catch (error) {
    console.error("Error in getLatestMETAR server action:", error);
    return {
      success: false,
      error: "Failed to fetch METAR data",
    };
  }
}
