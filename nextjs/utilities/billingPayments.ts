import "server-only";

import connectionPool from "@/utilities/db";
import {
  BillingCellUpdate,
  FlightSheetWriteError,
  writeBillingCells,
} from "@/utilities/flightSheetWriter";
import { logger } from "@/utilities/logger";

const log = logger.child({ module: "billing" });

/**
 * writeBillingCells for several aircraft tabs. Each tab is one write, but
 * the tabs are separate requests: when a later tab is refused or fails, the
 * tabs already written are put back with `undo`, so the sheet never shows a
 * period half closed or a bill half paid. The error is thrown on.
 */
export async function writeBillingCellsToTabs(
  updates: Map<string, BillingCellUpdate[]>,
  allowedFrom: string[],
  undo: Pick<BillingCellUpdate, "status" | "period">
): Promise<void> {
  const written: [string, BillingCellUpdate[]][] = [];
  try {
    for (const [registration, cells] of updates) {
      await writeBillingCells(registration, cells, allowedFrom);
      written.push([registration, cells]);
    }
  } catch (error) {
    for (const [registration, cells] of written.reverse()) {
      await writeBillingCells(
        registration,
        cells.map((cell) => ({ id: cell.id, inputHash: null, ...undo })),
        [...new Set(cells.map((cell) => cell.status))]
      ).catch((undoError) =>
        log.error("Putting a tab back after a failed billing write failed", { err: undoError, registration })
      );
    }
    throw error;
  }
}

/**
 * Marks a closed period's bill to one payer paid, or not: billing_payers,
 * the payer's invoice, and Maksettu (or back to Laskutettu) for their
 * flights in the sheet. The database is committed only after the sheet
 * write succeeded. Callers check permissions and sync afterwards.
 */
export async function writePayerPaid(
  periodId: number,
  payerKey: string,
  paid: boolean,
  userId: string
): Promise<{ error: string } | null> {
  const flights = await connectionPool.query(
    `SELECT l.flight_id, l.registration FROM billing_lines l
     JOIN sheet_flights f ON f.id = l.flight_id AND f.missing_since IS NULL
     WHERE l.period_id = $1 AND l.payer_key = $2 AND l.kind = 'flight'`,
    [periodId, payerKey]
  );
  const updates = new Map<string, BillingCellUpdate[]>();
  for (const row of flights.rows) {
    updates.set(row.registration, [
      ...(updates.get(row.registration) ?? []),
      { id: row.flight_id, inputHash: null, status: paid ? "Maksettu" : "Laskutettu" },
    ]);
  }

  const client = await connectionPool.connect();
  try {
    await client.query("BEGIN");
    const updated = await client.query(
      `UPDATE billing_payers SET paid_at = CASE WHEN $3 THEN NOW() END, paid_by = CASE WHEN $3 THEN $4 END
       WHERE period_id = $1 AND payer_key = $2`,
      [periodId, payerKey, paid, userId]
    );
    if (updated.rowCount === 0) {
      throw new FlightSheetWriteError("Maksajaa ei löytynyt jaksosta");
    }
    await client.query(
      `UPDATE invoices
       SET status = CASE WHEN $3 THEN 'paid' ELSE 'open' END,
           paid_at = CASE WHEN $3 THEN NOW() END, paid_by = CASE WHEN $3 THEN $4 END
       WHERE period_id = $1 AND payer_key = $2 AND status IN ('open', 'paid')`,
      [periodId, payerKey, paid, userId]
    );
    await writeBillingCellsToTabs(updates, ["Laskutettu", "Maksettu"], {
      status: paid ? "Laskutettu" : "Maksettu",
    });
    await client.query("COMMIT");
    return null;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    log.error("Marking a payment failed", { err: error });
    return { error: error instanceof FlightSheetWriteError ? error.message : "Tallennus epäonnistui" };
  } finally {
    client.release();
  }
}
