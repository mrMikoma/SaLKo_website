#!/usr/bin/env tsx

/**
 * METAR Update Cronjob
 *
 * Fetches and stores METAR weather data for Savonlinna Airport (EFSA)
 * from the NOAA Aviation Weather Center API.
 *
 * Schedule: Twice per hour at :21 and :51 (METAR updates at :20 and :50 in Finland)
 * Scheduler: Ofelia (Docker-based cron scheduler)
 *
 * Usage:
 *   npm run cronjob:update-metar
 *   tsx cronjobs/update-metar/index.ts
 *   docker run --rm -e DATABASE_CONNECTION_STRING="..." cronjob-update-metar
 */

import { updateMetarData, cleanupOldMETARData } from "./lib/metarService";
import { closeConnectionPool } from "./lib/db";

interface CronjobConfig {
  name: string;
  version: string;
  schedule: string;
  retention: {
    enabled: boolean;
    days: number;
  };
}

const config: CronjobConfig = {
  name: "update-metar",
  version: "1.0.0",
  schedule: "21,51 * * * *", // Twice per hour at :21 and :51
  retention: {
    enabled: true,
    days: 7, // Keep last 7 days of data
  },
};

async function main() {
  const startTime = Date.now();
  console.log(
    `[${new Date().toISOString()}] Starting ${config.name} v${config.version}`
  );

  try {
    // Update METAR data
    console.log("Fetching and storing METAR data...");
    await updateMetarData();

    // Run cleanup once per day (at midnight hour)
    if (config.retention.enabled) {
      const now = new Date();
      const isCleanupTime = now.getHours() === 0 && now.getMinutes() < 15;

      if (isCleanupTime) {
        console.log(
          `Running data cleanup (keep last ${config.retention.days} days)...`
        );
        await cleanupOldMETARData(config.retention.days);
      }
    }

    const duration = Date.now() - startTime;
    console.log(
      `[${new Date().toISOString()}] ${
        config.name
      } completed successfully in ${duration}ms`
    );

    // Close database connection pool
    await closeConnectionPool();
    process.exit(0);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(
      `[${new Date().toISOString()}] ${
        config.name
      } failed after ${duration}ms:`,
      error
    );

    // Close database connection pool
    await closeConnectionPool();
    process.exit(1);
  }
}

// Run main function (always run when this file is executed)
main();

export { main, config };
