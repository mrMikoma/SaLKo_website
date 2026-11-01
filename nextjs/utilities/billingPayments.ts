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
    for (const [registration, cells] of updates) {
      await writeBillingCells(registration, cells, ["Laskutettu", "Maksettu"]);
    }
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
