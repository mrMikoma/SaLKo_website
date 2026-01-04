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
      1767526494,
      'Uudet verkkosivut julkaistu',
      'Savonlinnan Lentokerhon uudet verkkosivut on julkaistu! Tervetuloa tutustumaan ja antamaan palautetta.'
    );
END $$;