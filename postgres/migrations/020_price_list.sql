-- Migration: The price list in the database
-- Date: 2026-11-04
-- Description: The club's price list moves from nextjs/data/prices.json into
--              price_items, edited on /admin/hinnasto by admins and the
--              treasurer. /kerho/hinnasto, /kerho/jasenyys, /kerho/hallit,
--              /koulutus and the invoice presets read it. Aircraft prices stay
--              in aircraft_rates. Seeded with what prices.json had, only when
--              the table is empty; the date the list is valid from goes into
--              flight_log_settings.
-- init/01-schema.sql already has the table and the seed.

-- The club's price list (/kerho/hinnasto and the pages that quote it, and
-- the invoice presets), edited on /admin/hinnasto. Aircraft prices are in
-- aircraft_rates.
CREATE TABLE IF NOT EXISTS price_items (
  id SERIAL PRIMARY KEY,
  -- note: a numbered remark under the price list, its text in name
  section TEXT NOT NULL CHECK (section IN ('membership', 'equipment', 'demo', 'hangar', 'other', 'training', 'note')),
  -- Courses are found by their code on /koulutus (PPL, LAPL…)
  code TEXT UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price_cents INT CHECK (price_cents >= 0), -- NULL: no price yet ("kysy tarjousta")
  unit TEXT NOT NULL DEFAULT '€',
  note TEXT NOT NULL DEFAULT '', -- a second line under the price
  sort_order INT NOT NULL DEFAULT 100,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT REFERENCES users (id) ON DELETE SET NULL
);

-- What data/prices.json had, dated 18.3.2026
INSERT INTO price_items (section, code, name, description, price_cents, unit, note, sort_order)
SELECT * FROM (VALUES
  ('membership', NULL, 'Varsinainen jäsen', 'Aikuisjäsenyys', 6000, '€/vuosi', '', 10),
  ('membership', NULL, 'Nuorisojäsen', 'Alle 18-vuotiaat', 3000, '€/vuosi', '', 20),
  ('membership', NULL, 'Kannatusjäsen', 'Kannatusjäsenyys', 1000, '€/vuosi', '', 30),
  ('membership', NULL, 'Kunniajäsen', 'Yhdistyksen kutsuma kunniajäsen', 0, '€/vuosi', '', 40),
  ('equipment', 'kalustomaksu', 'Kalustomaksu', 'Vuosittainen kalustomaksu (vaaditaan alennushintoihin). Oppilaat vapautettuja kunnes ovat läpäisseet tarkastuslennon.', 35000, '€/kausi', '', 50),
  ('demo', NULL, 'Esittelylento', 'Tutustumislento lentokoneella (20 min). Laskutetaan lennon yhteydessä.', 9000, '€', '', 60),
  ('demo', NULL, 'Kustannusjakoperusteinen lennätys', 'Lennätys kustannusjakoperusteella yhdistyksen kautta (esim. polttarilennot). Minimilaskutus 30 minuuttia. Katso huomio 2*.', 24000, '€/h', '', 70),
  ('hangar', NULL, 'Moottoripyörä', 'Sisältää kannatusjäsenyyden.', 10000, '€/talvi', '', 80),
  ('hangar', NULL, 'Henkilöauto', 'Sisältää kannatusjäsenyyden.', 30000, '€/talvi', '', 90),
  ('hangar', NULL, 'Vene', 'Sisältää kannatusjäsenyyden.', 40000, '€/talvi', '', 100),
  ('hangar', NULL, 'Asunto-auto tai asuntovaunu', 'Sisältää kannatusjäsenyyden.', 40000, '€/talvi', '', 110),
  ('hangar', NULL, 'Purjekone putkessa tai purettuna', 'Sisältää kannatusjäsenyyden.', 40000, '€/vuosi', '', 120),
  ('hangar', NULL, 'Ilma-alus (kärkiväli < 7,5 m)', 'Edellyttää varsinaista jäsenyyttä.', 40000, '€/vuosi', '+ jäsenmaksu 60 €/v', 130),
  ('hangar', NULL, 'Ilma-alus (kärkiväli 7,5 - 15 m)', 'Edellyttää varsinaista jäsenyyttä.', 60000, '€/vuosi', '+ jäsenmaksu 60 €/v', 140),
  ('hangar', NULL, 'Ilma-alus (kärkiväli > 15 m)', 'Edellyttää varsinaista jäsenyyttä.', 80000, '€/vuosi', '+ jäsenmaksu 60 €/v', 150),
  ('other', NULL, 'Avain yhdistyksen tiloihin', '', 2500, '€', '', 160),
  ('other', NULL, 'Hihamerkki', '', 500, '€', '', 170),
  ('training', 'LAPL', 'LAPL-koulutus', '', 900000, '€', '', 180),
  ('training', 'PPL', 'PPL-koulutus', '', 1300000, '€', '', 190),
  ('training', 'TMG', 'TMG-koulutus', '', NULL, '€', '', 200),
  ('training', 'NF', 'Yölentokelpuutus (NF)', '', NULL, '€', '', 210),
  ('training', 'TOW', 'Hinauskelpuutus', '', NULL, '€', '', 220),
  ('training', 'SPL', 'Purjelentokoulutus (SPL)', '', 300000, '€', '', 230),
  ('training', 'UPL', 'UPL-koulutus', '', 450000, '€', '', 240),
  ('note', NULL, 'Moottorikoneilla paikallislennon minimilaskutus 30 minuuttia. Lyhyempien peräkkäisten lennätysten sekä lentopaikalta toiselle tapahtuvien matkalentojen tapauksessa tätä rajoitusta ei kuitenkaan sovelleta. Polttoaineet sisältyvät konevuokraan.', '', NULL, '', '', 250),
  ('note', NULL, 'Kustannusten jakaminen yhdistyksen kautta vastaanotetuilla tilauslennoilla (esim. polttarilennot). Lennon välittömät kustannukset jaetaan kaikkien ilma-aluksessa olevien henkilöiden kesken, ohjaaja mukaan lukien. EASA:n määrittelemät suorat kustannukset ovat: polttoainekustannukset, laskeutumismaksut, lentokenttämaksut ja lentokoneen vuokra. Kustannusten jakamisessa käytetään tuntihintaa 240 €/h, joka jaetaan kyyditettävien ja pilotin kesken. Pilotille lähetetään lasku jälkikäteen hänen kaluston käyttömaksunsa mukaisella tuntihinnalla. Lisäksi pilotilta laskutetaan lennolle kohdistuneet laskeutumis- ja lentokenttämaksut.', '', NULL, '', '', 260),
  ('note', NULL, 'Ilma-alusten hallipaikkaan sisältyy varsinainen jäsenmaksu (60 €/v). Muiden ajoneuvojen ja veneiden talvisäilytyshintoihin sisältyy kannatusjäsenyys (10 €/v). Hallivuokrat laskutetaan etukäteen vuodenvaihteen jälkeen. Vuokrakausi on lentokoneille kalenterivuosi, muulle kalustolle lokakuusta huhtikuun loppuun (7 kk).', '', NULL, '', '', 270)
) AS seed (section, code, name, description, price_cents, unit, note, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM price_items);

INSERT INTO flight_log_settings (key, value)
VALUES ('price_list_valid_from', '"2026-03-18"')
ON CONFLICT (key) DO NOTHING;

GRANT SELECT, INSERT, UPDATE, DELETE ON price_items TO :app_user;
GRANT USAGE, SELECT ON SEQUENCE price_items_id_seq TO :app_user;
