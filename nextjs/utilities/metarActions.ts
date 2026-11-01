/**
 * Server Actions for METAR data
 * These functions can be called from client components
 */

"use server";

import { getRecentMETARsFromDB } from "@/utilities/metarService";
import { logger } from "@/utilities/logger";

const log = logger.child({ module: "metar" });

export interface METARObservation {
  raw: string;
  /** ISO time of the observation */
  observedAt: string;
}

export interface METARHistoryResponse {
  success: boolean;
  /** Newest first: the latest report and the 12 hours before it */
  observations: METARObservation[];
  error?: string;
}

/**
 * EFSA's latest METAR and the 12 hours before it, raw; the widget decodes
 * them (utilities/metarDecode.ts).
 */
export async function getRecentMETARs(): Promise<METARHistoryResponse> {
  try {
    const rows = await getRecentMETARsFromDB("EFSA", 12);
    if (rows.length === 0) {
      return { success: false, observations: [], error: "No METAR data available" };
    }
    return {
      success: true,
      observations: rows.map((row) => ({
        raw: row.rawMetar,
        observedAt: new Date(row.observationTime).toISOString(),
      })),
    };
  } catch (error) {
    log.error("Reading recent METARs failed", { err: error });
    return { success: false, observations: [], error: "Failed to fetch METAR data" };
  }
}
