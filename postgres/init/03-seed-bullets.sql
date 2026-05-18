-- Query admin user id and insert test data into bullets
DO $$
DECLARE
  admin_user_id TEXT;
BEGIN
  -- Assign the admin user ID to the variable
  SELECT id INTO admin_user_id
  FROM users
  WHERE role = 'admin'
  LIMIT 1;

  -- Insert test data into bullets
  INSERT INTO
    bullets (user_id, date, title, content)
  VALUES
    (
      admin_user_id,
      1767692585,
      'Uudet verkkosivut julkaistu',
      'Savonlinnan Lentokerhon uudet verkkosivut on julkaistu! Tervetuloa tutustumaan ja antamaan palautetta.'
    ),
    (
      admin_user_id,
      1779062400,
      'Lentokoulutus käynnistyy keväällä 2026',
      E'## Koulutuskausi alkaa!\n\nOlemme avanneet ilmoittautumisen **PPL- ja LAPL-lentokoulutukseen** kevään 2026 kursseille.\n\n### Vaatimukset\n\n- Vähintään 16 vuotta täyttänyt\n- Lääkärintodistus (Luokka 2 tai LAPL-lääkärintodistus)\n- Peruskielitaito suomeksi tai englanniksi\n\n### Koulutuksen sisältö\n\n1. Teoriakoulutus (100 h)\n2. Lentosimulaattorikoulutus\n3. Käytännön lentokoulutus (**45 h** vähintään)\n\n---\n\nIlmoittaudu sähköpostitse tai soita kerhon koulutusvastaavalle.'
    ),
    (
      admin_user_id,
      1778457600,
      'Konepäivä la 16.5. — kaikki tervetuloa!',
      E'**Lauantaina 16. toukokuuta** järjestetään kerhohallin konepäivä.\n\n### Ohjelma\n\n- **09:00** Kahvit ja aamupala\n- **10:00** Koneiden tarkastukset ja huoltotyöt\n- **12:00** Yhteinen lounas (omat eväät)\n- **13:00** Vapaa lentäminen (kalusto käytettävissä)\n\n---\n\nPaikka: **Savonlinnan lentoasema, EFSA**\n\nToivomme mahdollisimman monen jäsenen osallistuvan. Lisätietoja hallitukselta.'
    ),
    (
      admin_user_id,
      1776643200,
      'Jäsenmaksut ja lentohinnat 2026',
      E'## Jäsenmaksut 2026\n\n| Jäsentyyppi | Hinta |\n|---|---|\n| Varsinainen jäsen | **120 €/vuosi** |\n| Nuorisojäsen (alle 26 v) | **60 €/vuosi** |\n| Kannatusjäsen | **40 €/vuosi** |\n\n## Lentohinnat\n\n- **OH-CON** (C172): 155 €/h\n- **OH-816** (PA-28): 140 €/h\n- **OH-829** (DA-20): 125 €/h\n\n---\n\nJäsenmaksut tulee maksaa **31.1.2026 mennessä**. Myöhästyneistä maksuista peritään 15 € lisämaksu.'
    ),
    (
      admin_user_id,
      1773964800,
      'Huom: OH-CON varauskalenteri uudistettu',
      E'Olemme uudistaneet **OH-CON:n varauskalenterin** toimintaa.\n\n### Muutokset\n\n- Varauksia voi tehdä enintään **60 päivää** etukäteen\n- Peruutus on tehtävä viimeistään **24 h** ennen varauksen alkua\n- Myöhäisestä peruutuksesta veloitetaan **50% lennon hinnasta**\n\n### Usein kysyttyä\n\n**Voinko siirtää varauksen?** Kyllä, ota yhteyttä muihin jäseniin tai hallitukseen.\n\n**Mitä jos sää estää lennon?** Sääperumisista ei peritä maksua — ilmoita mahdollisimman ajoissa.\n\n---\n\nUudet säännöt ovat voimassa **1.3.2026 alkaen**.'
    );
END $$;