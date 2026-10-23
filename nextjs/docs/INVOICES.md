# Invoices

The website issues and sends the club's bills (laskut) by email: flight bills from a closed billing period (`FLIGHT_LOG.md`, "Billing"), and other charges such as membership, equipment and hangar fees. Sending goes through the club's Google Workspace, from `laskutus@` (`MAIL_SETUP.md`). It sits behind `FEATURE_FLIGHT_LOG`, like the rest of billing, and needs `MANAGE_BILLING` (admins and the treasurer).

## The life of an invoice

1. **Draft (Luonnos).** Drafts are made in one of two ways:
   - **Flight bills:** "Luo laskuluonnokset" on a closed period (`/admin/laskutus/[id]`) makes one draft per payer with something to pay. It leaves out payers already marked paid, and payers who have an invoice. The lines are the period's lines as billed (`flightInvoiceLines`): flights, minimum billing, free-hour credits and corrections.
   - **Other charges:** `/admin/laskut/uusi` makes one draft per chosen member with the same lines. The lines come from the price list (`data/prices.json`, `invoicePresets`) or are typed in. Someone outside the member list, such as a hangar tenant, can be typed in as a recipient.

   A draft's recipient, title and message can be edited, and typed-in lines can be added or removed. A flight bill's period lines stay as billed. A draft can be deleted.
2. **Sent (Avoin).** "Lähetä lasku", or "Lähetä kaikki luonnokset" on the list, does the following in one transaction per invoice:
   - gives the invoice the year's next number (`20260001`, gapless; drafts have no number);
   - makes its reference number (the number plus the 7-3-1 check digit);
   - sets today's date and the due date (the payment term from the settings, 14 days by default);
   - queues the email.

   The emails go out after the transactions. An invoice without an email address is issued for printing. A sent invoice never changes. It can be sent again, to its address or another one, and every attempt is listed on its page.
3. **Paid (Maksettu)** is marked by hand on the invoice's page; "Peru maksu" reopens it. For a flight bill this also marks the period's payer paid and writes Maksettu for their flights in the sheet (`writePayerPaid` in `utilities/billingPayments.ts`). Marking the payer paid on the period page does the same to the invoice.
4. **Cancelled (Mitätöity):** an open invoice can be cancelled with a reason, which shows on it. Its number stays used. A period's payer can then get a new invoice.

An invoice past its due date shows as **Erääntynyt**.

## What the member gets

- **The email** (`utilities/invoiceEmail.ts`), as text and HTML, has:
  - the lines and the total;
  - the club's account, BIC, reference number and due date;
  - the **virtual barcode** (virtuaaliviivakoodi, version 4), which the member pastes into a bank app;
  - a link to the invoice on the site.

  Replies go to `laskutus@`.
- **`/jasenalue/laskut`** lists a member's own sent invoices. Each one opens as a printable page with the same payment details. Drafts and other members' invoices give a 404. The member's flight log page links each period's bill to its invoice.

The club's details on the invoice (name, address, business ID, IBAN, BIC) come from `data/contacts.json`, the same as the Yhteystiedot page. The payment term and an optional closing note, for example about late payment, are set on `/admin/laskutus/asetukset`.

## For the bookkeeping

- `/admin/laskut/csv` (or `?vuosi=2026`) lists the issued invoices for the accounting software: number, dates, reference, recipient, total, status and when paid.
- Invoices are kept: the Accounting Act requires six years. A member with invoices can't be hard-deleted. Anonymising a member leaves the name and address on their invoices.

## Tables

- `invoices`: one row per invoice, holding the recipient as invoiced, the number, the reference, the dates and the status, plus the period and payer for flight bills (one live invoice per period payer).
- `invoice_lines`: the lines. `source` is `flight` for a period's lines and `other` for typed-in ones.
- `email_outbox.invoice_id`: the emails that sent each invoice.

The reference number, the barcode and the price-list lines are pure functions in `utilities/invoices.ts`, with unit tests that check the banks' published example. `e2e/invoices.spec.ts` runs a membership fee from creation to paid, and `e2e/flight-billing.spec.ts` covers a period's invoice.

## Not yet

- **Payments from the bank statement:** matching the reference numbers in the bank's file to mark invoices paid.
- **Reminders** after the due date.
- **A PDF attachment** (the page prints to PDF).
- **Credit notes** for a negative balance.
- **Equipment fee:** a paid fee invoice could tick the season's equipment fee by itself; for now it's ticked on the settings page.
