# Price list

The club's prices are in the database and edited on `/admin/hinnasto` (`MANAGE_PRICES`: admins, and the treasurer). Until November 2026 they were in `data/prices.json`; migration `020_price_list.sql` copied its content into the database. Unlike billing, the price list is on everywhere, in production too, since the public price page reads it.

## Where the prices show

| Page | Shows |
|---|---|
| `/kerho/hinnasto` | Everything: the date it is valid from, membership fees, the equipment fee, each aircraft's price today, intro flights, hangar spaces, other fees and the numbered notes |
| `/kerho/jasenyys` | Membership fees |
| `/kerho/hallit` | Hangar spaces |
| `/koulutus` | Course prices, "alkaen 9 000 €", found by their code (PPL, LAPL, TMG, NF, TOW, SPL, UPL); without a price, "Kysy tarjousta" |
| Invoices (`/admin/laskut/uusi`, a draft's lines) | Ready-made lines from membership fees, the equipment fee, hangar spaces, intro flights and other fees that have a price |

The pages are rendered for each request, so a saved change shows at once.

## Tables

- `price_items`: one row per price, by section (`membership`, `equipment`, `demo`, `hangar`, `other`, `training`, `note`). `price_cents` is empty for a price not set yet. `note` is a second line under the price, like a hangar space's extra fee. A `note` section row is a numbered remark under the price list, its text in `name`. Hidden rows (`active = false`) are left out of the pages and the invoice presets. Courses have a `code`, and they can be hidden but not deleted, since `/koulutus` asks for them by it.
- `aircraft_rates`: aircraft prices per hour from a date, which billing uses too (`FLIGHT_LOG.md`, "Billing"). The price page shows each active aircraft's price today. Its free-hour note comes from the billing settings' free hour, so the two can't disagree.
- `flight_log_settings.price_list_valid_from`: the date on the price page.

The reads are `getPriceList()` and `getAircraftRates()` in `utilities/priceList.ts`. When the database can't be read, `getPriceList()` answers an empty list marked `unavailable`, and the pages show `components/prices/PricesUnavailable.tsx` instead of empty tables (the editor shows an error instead of an empty list); the writes are in `utilities/priceListActions.ts`; formatting is in `utilities/priceFormat.ts`, with unit tests. `e2e/price-list.spec.ts` adds a price, edits, hides and removes it, and checks the public pages.
