-- Query admin user id and insert test bookings data
DO $$
DECLARE
  admin_user_id TEXT;
BEGIN
  -- Assign the admin user ID to the variable
  SELECT id INTO admin_user_id
  FROM users
  WHERE role = 'admin'
  LIMIT 1;

  -- Insert diverse bookings with various flight types, durations, and dates
  -- The bookings include:
  -- - Local flights (1-2 hours)
  -- - Trip flights (2-4 hours)
  -- - Training sessions (1-3 hours)
  -- - Maintenance blocks (2-8 hours)
  -- - Fire patrol flights (3-5 hours)
  -- - Multi-day trips (spanning 2-3 days)
  -- - Bookings spread across past week, today, and next two weeks

  INSERT INTO
    bookings (
      plane,
      start_time,
      end_time,
      user_id,
      type,
      title,
      description
    )
    VALUES
    -- TODAY: Various bookings for today
    -- OH-CON: Local flight morning
    (
      'OH-CON',
      NOW()::DATE + INTERVAL '8 hours',
      NOW()::DATE + INTERVAL '10 hours',
      admin_user_id,
      'local',
      'Paikallislento - Aamupäivä',
      'Lentokoulutus lähialueella, kuviot ja laskeutumisharjoitukset.'
    ),
    -- OH-386: Training session
    (
      'OH-386',
      NOW()::DATE + INTERVAL '9 hours',
      NOW()::DATE + INTERVAL '11 hours 30 minutes',
      admin_user_id,
      'training',
      'Koulutus - PPL-oppilas',
      'Solo-lennot ja navigaatioharjoitukset oppilaan kanssa.'
    ),
    -- OH-829: Maintenance check
    (
      'OH-829',
      NOW()::DATE + INTERVAL '7 hours',
      NOW()::DATE + INTERVAL '9 hours',
      admin_user_id,
      'maintenance',
      'Huolto - 50h tarkastus',
      '50 tunnin määräaikaishuolto ja öljynvaihto.'
    ),
    -- OH-816: Local flight afternoon
    (
      'OH-816',
      NOW()::DATE + INTERVAL '14 hours',
      NOW()::DATE + INTERVAL '15 hours 30 minutes',
      admin_user_id,
      'local',
      'Paikallislento - Iltapäivä',
      'Tutustumislento asiakkaalle.'
    ),
    -- OH-475: Fire patrol
    (
      'OH-475',
      NOW()::DATE + INTERVAL '11 hours',
      NOW()::DATE + INTERVAL '15 hours',
      admin_user_id,
      'fire',
      'Metsäpalontähystys',
      'Metsäpalontähystyslento alueella Mikkeli-Savonlinna.'
    ),
    -- OH-CON: Trip flight afternoon
    (
      'OH-CON',
      NOW()::DATE + INTERVAL '15 hours',
      NOW()::DATE + INTERVAL '18 hours',
      admin_user_id,
      'trip',
      'Matkalento - Helsinki',
      'Matkalento Helsingissä asioille.'
    ),

    -- YESTERDAY: Past bookings
    (
      'OH-386',
      NOW()::DATE - INTERVAL '1 day' + INTERVAL '10 hours',
      NOW()::DATE - INTERVAL '1 day' + INTERVAL '12 hours',
      admin_user_id,
      'local',
      'Paikallislento',
      'Lentokoulutus eilen aamupäivällä.'
    ),
    (
      'OH-816',
      NOW()::DATE - INTERVAL '1 day' + INTERVAL '14 hours',
      NOW()::DATE - INTERVAL '1 day' + INTERVAL '16 hours 30 minutes',
      admin_user_id,
      'training',
      'Koulutus - Laskeutumisharjoitukset',
      'Touch-and-go harjoitukset oppilaiden kanssa.'
    ),

    -- TOMORROW: Future bookings
    (
      'OH-CON',
      NOW()::DATE + INTERVAL '1 day' + INTERVAL '8 hours',
      NOW()::DATE + INTERVAL '1 day' + INTERVAL '10 hours',
      admin_user_id,
      'training',
      'Koulutus - CPL-teoria',
      'Kaupallisen lentäjän teorialento ja harjoitukset.'
    ),
    (
      'OH-829',
      NOW()::DATE + INTERVAL '1 day' + INTERVAL '11 hours',
      NOW()::DATE + INTERVAL '1 day' + INTERVAL '13 hours',
      admin_user_id,
      'local',
      'Paikallislento - Kuvauskäyttö',
      'Ilmakuvauslento paikalliselle mediayritykselle.'
    ),
    (
      'OH-816',
      NOW()::DATE + INTERVAL '1 day' + INTERVAL '15 hours',
      NOW()::DATE + INTERVAL '1 day' + INTERVAL '17 hours',
      admin_user_id,
      'trip',
      'Matkalento - Tampere',
      'Matka Tampereelle kokousmatkalla.'
    ),

    -- MULTI-DAY TRIP: 3-day journey starting in 2 days
    (
      'OH-386',
      NOW()::DATE + INTERVAL '2 days' + INTERVAL '9 hours',
      NOW()::DATE + INTERVAL '4 days' + INTERVAL '16 hours',
      admin_user_id,
      'trip',
      'Matka - Lapin kiertomatka',
      'Kolmen päivän kiertomatka Lappiin: Rovaniemi, Ivalo, Enontekiö. Yöpymiset kentillä.'
    ),

    -- DAY +3: Various bookings
    (
      'OH-CON',
      NOW()::DATE + INTERVAL '3 days' + INTERVAL '10 hours',
      NOW()::DATE + INTERVAL '3 days' + INTERVAL '12 hours 30 minutes',
      admin_user_id,
      'fire',
      'Metsäpalontähystys - Keski-Suomi',
      'Tähystyslento metsäpalojen varalta.'
    ),
    (
      'OH-829',
      NOW()::DATE + INTERVAL '3 days' + INTERVAL '14 hours',
      NOW()::DATE + INTERVAL '3 days' + INTERVAL '16 hours',
      admin_user_id,
      'local',
      'Paikallislento - Valokuvaus',
      'Maisemakuvauslento paikalliselle valokuvaajalle.'
    ),

    -- DAY +5: Weekend flights
    (
      'OH-816',
      NOW()::DATE + INTERVAL '5 days' + INTERVAL '9 hours',
      NOW()::DATE + INTERVAL '5 days' + INTERVAL '11 hours',
      admin_user_id,
      'local',
      'Viikonlopun tutustumislento',
      'Tutustumislento asiakkaalle viikonloppuna.'
    ),
    (
      'OH-475',
      NOW()::DATE + INTERVAL '5 days' + INTERVAL '13 hours',
      NOW()::DATE + INTERVAL '5 days' + INTERVAL '15 hours 30 minutes',
      admin_user_id,
      'training',
      'Koulutus - PPL loppukoe',
      'PPL-oppilaan loppukoelento.'
    ),

    -- DAY +6: More weekend bookings
    (
      'OH-CON',
      NOW()::DATE + INTERVAL '6 days' + INTERVAL '10 hours',
      NOW()::DATE + INTERVAL '6 days' + INTERVAL '12 hours',
      admin_user_id,
      'trip',
      'Matkalento - Turku',
      'Viikonlopun matkalento Turkuun.'
    ),
    (
      'OH-386',
      NOW()::DATE + INTERVAL '6 days' + INTERVAL '14 hours',
      NOW()::DATE + INTERVAL '6 days' + INTERVAL '16 hours',
      admin_user_id,
      'local',
      'Paikallislento - Sunnuntai',
      'Vapaalento sunnuntai-iltapäivänä.'
    ),

    -- MULTI-DAY TRIP: 2-day coastal tour
    (
      'OH-829',
      NOW()::DATE + INTERVAL '7 days' + INTERVAL '8 hours',
      NOW()::DATE + INTERVAL '8 days' + INTERVAL '17 hours',
      admin_user_id,
      'trip',
      'Matka - Saaristokiertue',
      'Kahden päivän kiertomatka saaristossa: Mariehamn, Turku, Hanko. Yöpyminen Maarianhaminassa.'
    ),

    -- DAY +9: Maintenance day
    (
      'OH-CON',
      NOW()::DATE + INTERVAL '9 days' + INTERVAL '8 hours',
      NOW()::DATE + INTERVAL '9 days' + INTERVAL '16 hours',
      admin_user_id,
      'maintenance',
      'Huolto - Vuosihuolto',
      'Vuosihuolto ja tarkastukset. Kone ei käytössä koko päivänä.'
    ),
    (
      'OH-816',
      NOW()::DATE + INTERVAL '9 days' + INTERVAL '10 hours',
      NOW()::DATE + INTERVAL '9 days' + INTERVAL '12 hours',
      admin_user_id,
      'training',
      'Koulutus - Navigaatio',
      'Navigaatiokoulutus ja maastoharjoitukset.'
    ),

    -- DAY +10: Various bookings
    (
      'OH-475',
      NOW()::DATE + INTERVAL '10 days' + INTERVAL '9 hours',
      NOW()::DATE + INTERVAL '10 days' + INTERVAL '13 hours',
      admin_user_id,
      'fire',
      'Metsäpalontähystys - Itä-Suomi',
      'Pitkä tähystyslento Itä-Suomen alueella.'
    ),
    (
      'OH-386',
      NOW()::DATE + INTERVAL '10 days' + INTERVAL '14 hours',
      NOW()::DATE + INTERVAL '10 days' + INTERVAL '16 hours 30 minutes',
      admin_user_id,
      'local',
      'Paikallislento - Ilta',
      'Iltapäivän paikallislento koulutuskäytössä.'
    ),

    -- DAY +11: Training intensive
    (
      'OH-816',
      NOW()::DATE + INTERVAL '11 days' + INTERVAL '8 hours',
      NOW()::DATE + INTERVAL '11 days' + INTERVAL '11 hours',
      admin_user_id,
      'training',
      'Koulutus - Aerodynamiikka',
      'Aerodynamiikan perusharjoitukset ja sakkausharjoittelut.'
    ),
    (
      'OH-CON',
      NOW()::DATE + INTERVAL '11 days' + INTERVAL '13 hours',
      NOW()::DATE + INTERVAL '11 days' + INTERVAL '15 hours 30 minutes',
      admin_user_id,
      'training',
      'Koulutus - IFR harjoittelu',
      'Instrumenttilentokoulutus ja harjoitukset.'
    ),

    -- DAY +12: Long maintenance
    (
      'OH-386',
      NOW()::DATE + INTERVAL '12 days' + INTERVAL '7 hours',
      NOW()::DATE + INTERVAL '12 days' + INTERVAL '17 hours',
      admin_user_id,
      'maintenance',
      'Huolto - 100h tarkastus',
      '100 tunnin määräaikaishuolto ja laajemmat tarkastukset.'
    ),
    (
      'OH-829',
      NOW()::DATE + INTERVAL '12 days' + INTERVAL '11 hours',
      NOW()::DATE + INTERVAL '12 days' + INTERVAL '14 hours',
      admin_user_id,
      'trip',
      'Matkalento - Jyväskylä',
      'Pikamatka Jyväskylään ja takaisin.'
    ),

    -- DAY +13: Weekend activities
    (
      'OH-475',
      NOW()::DATE + INTERVAL '13 days' + INTERVAL '10 hours',
      NOW()::DATE + INTERVAL '13 days' + INTERVAL '12 hours',
      admin_user_id,
      'local',
      'Viikonlopun ilmailu',
      'Vapaalento ja lentokoneeseen tutustuminen.'
    ),
    (
      'OH-816',
      NOW()::DATE + INTERVAL '13 days' + INTERVAL '14 hours',
      NOW()::DATE + INTERVAL '13 days' + INTERVAL '17 hours',
      admin_user_id,
      'trip',
      'Matkalento - Oulu',
      'Viikonlopun matka Ouluun.'
    ),

    -- DAY +14: Final bookings in range
    (
      'OH-CON',
      NOW()::DATE + INTERVAL '14 days' + INTERVAL '9 hours',
      NOW()::DATE + INTERVAL '14 days' + INTERVAL '11 hours 30 minutes',
      admin_user_id,
      'local',
      'Paikallislento - Kahden viikon päästä',
      'Paikallislento normaaleilla kuvioilla.'
    ),
    (
      'OH-829',
      NOW()::DATE + INTERVAL '14 days' + INTERVAL '15 hours',
      NOW()::DATE + INTERVAL '14 days' + INTERVAL '17 hours',
      admin_user_id,
      'training',
      'Koulutus - Loppukatsastus',
      'Oppilaan loppukatsastuslento ennen tutkintoa.'
    ),

    -- Additional scattered bookings for variety
    (
      'OH-475',
      NOW()::DATE + INTERVAL '4 days' + INTERVAL '10 hours',
      NOW()::DATE + INTERVAL '4 days' + INTERVAL '12 hours',
      admin_user_id,
      'other',
      'Erikoislento - Mainostus',
      'Mainostusbanderollin vetäminen tapahtuman yllä.'
    ),
    (
      'OH-CON',
      NOW()::DATE + INTERVAL '8 days' + INTERVAL '11 hours',
      NOW()::DATE + INTERVAL '8 days' + INTERVAL '13 hours 30 minutes',
      admin_user_id,
      'other',
      'Erikoislento - Ilmakuvaus',
      'Kaupallinen ilmakuvauslento dokumenttielokuvaan.'
    );
END $$;