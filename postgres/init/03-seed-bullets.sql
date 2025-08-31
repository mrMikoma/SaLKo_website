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
      1737194400,
      'Lorem ipsum',
      'Dolore laborum ex officia aliqua proident esse officia veniam id eu aliquip qui incididunt.'
    ),
    (
      admin_user_id,
      1737280800,
      'Lorem ipsum',
      'Culpa deserunt consequat ut exercitation irure elit occaecat cillum.'
    ),
    (
      admin_user_id,
      1737367200,
      'Lorem ipsum',
      'Dolor irure cupidatat aliqua eu labore velit elit id nostrud.'
    ),
    (
      admin_user_id,
      1737453600,
      'Lorem ipsum',
      'Dolor irure cupidatat aliqua eu labore velit elit id nostrud.'
    ),
    (
      admin_user_id,
      1737194400,
      'ipsum Lorem',
      'Dolore laborum ex officia aliqua proident esse officia veniam id eu aliquip qui incididunt.'
    );
END $$;