-- Change encoding to UTF-8
-- SET client_encoding = 'UTF8';
-- Change timezone for Helsinki
-- SET timezone = 'Europe/Helsinki';
-- Change locale to Finnish
-- SET lc_time = 'fi_FI.UTF-8';
-- SET lc_messages = 'fi_FI.UTF-8';
-- SET lc_monetary = 'fi_FI.UTF-8';
-- SET lc_numeric = 'fi_FI.UTF-8';


-- Create users table
CREATE TABLE
  users (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid (),
    role TEXT NOT NULL DEFAULT 'user', -- 'admin' or 'user'
    name TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    postal_code TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  );

-- Insert test data into users
INSERT INTO
  users (
    role,
    name,
    full_name,
    phone,
    address,
    city,
    postal_code,
    email,
    password
  )
VALUES
  (
    'admin',
    'Admin',
    'Järjestelmän Valvoja',
    '1234567890',
    'Lentoasemantie 50',
    'Savonlinna',
    '57310',
    'admin@savonlinnanlentokerho.fi',
    'Admin123!'
  ),
  (
    'user',
    'Käyttäjä',
    'SaLKo Käyttäjä',
    '0987654321',
    'Lentoasemantie 50',
    'Savonlinna',
    '57310',
    'kayttaja@savonlinnanlentokerho.fi',
    'Kayttaja123!'
  );



-- Create bullets table
CREATE TABLE
  bullets (
    id INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id TEXT NOT NULL,
    date BIGINT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users (id)
  );

-- Create bookings table
CREATE TABLE
  bookings (
    id INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id TEXT NOT NULL,
    plane TEXT NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users (id)
  );

-- Query admin user id
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

  -- Insert test data into bookings
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
    (
      'OH-CON',
      (NOW()::DATE + INTERVAL '8 hours' + INTERVAL '1 hour' * FLOOR(RANDOM() * 14)),
      (NOW()::DATE + INTERVAL '8 hours' + INTERVAL '1 hour' * FLOOR(RANDOM() * 14) + INTERVAL '1 hour'),
      admin_user_id,
      'trip',
      'Lorem ipsum',
      'Dolore laborum ex officia aliqua proident esse officia veniam id eu aliquip qui incididunt.'
    ),
    (
      'OH-PDX',
      (NOW()::DATE + INTERVAL '8 hours' + INTERVAL '1 hour' * FLOOR(RANDOM() * 14)),
      (NOW()::DATE + INTERVAL '8 hours' + INTERVAL '1 hour' * FLOOR(RANDOM() * 14) + INTERVAL '1 hour'),
      admin_user_id,
      'trip',
      'Lorem ipsum',
      'Culpa deserunt consequat ut exercitation irure elit occaecat cillum.'
    ),
    (
      'OH-CON',
      (NOW()::DATE + INTERVAL '8 hours' + INTERVAL '1 hour' * FLOOR(RANDOM() * 14)),
      (NOW()::DATE + INTERVAL '8 hours' + INTERVAL '1 hour' * FLOOR(RANDOM() * 14) + INTERVAL '1 hour'),
      admin_user_id,
      'trip',
      'Lorem ipsum',
      'Dolor irure cupidatat aliqua eu labore velit elit id nostrud.'
    ),
    (
      'OH-PDX',
      (NOW()::DATE + INTERVAL '8 hours' + INTERVAL '1 hour' * FLOOR(RANDOM() * 14)),
      (NOW()::DATE + INTERVAL '8 hours' + INTERVAL '1 hour' * FLOOR(RANDOM() * 14) + INTERVAL '1 hour'),
      admin_user_id,
      'trip',
      'Lorem ipsum',
      'Dolor irure cupidatat aliqua eu labore velit elit id nostrud.'
    ),
    (
      'OH-CON',
      (NOW()::DATE + INTERVAL '8 hours' + INTERVAL '1 hour' * FLOOR(RANDOM() * 14)),
      (NOW()::DATE + INTERVAL '8 hours' + INTERVAL '1 hour' * FLOOR(RANDOM() * 14) + INTERVAL '1 hour'),
      admin_user_id,
      'trip',
      'Lorem ipsum',
      'Dolor irure cupidatat aliqua eu labore velit elit id nostrud.'
    ),
    (
      'OH-PDX',
      (NOW()::DATE + INTERVAL '8 hours' + INTERVAL '1 hour' * FLOOR(RANDOM() * 14)),
      (NOW()::DATE + INTERVAL '8 hours' + INTERVAL '1 hour' * FLOOR(RANDOM() * 14) + INTERVAL '1 hour'),
      admin_user_id,
      'trip',
      'Lorem ipsum',
      'Dolor irure cupidatat aliqua eu labore velit elit id nostrud.'
    ),
    (
      'OH-CON',
      (NOW()::DATE + INTERVAL '8 hours' + INTERVAL '1 hour' * FLOOR(RANDOM() * 14)),
      (NOW()::DATE + INTERVAL '8 hours' + INTERVAL '1 hour' * FLOOR(RANDOM() * 14) + INTERVAL '1 hour'),
      admin_user_id,
      'trip',
      'Lorem ipsum',
      'Dolor irure cupidatat aliqua eu labore velit elit id nostrud.'
    ),
    (
      'OH-CON',
      (NOW()::DATE + INTERVAL '8 hours' + INTERVAL '1 hour' * FLOOR(RANDOM() * 14)),
      (NOW()::DATE + INTERVAL '8 hours' + INTERVAL '1 hour' * FLOOR(RANDOM() * 14) + INTERVAL '1 hour'),
      admin_user_id,
      'local',
      'ipsum Lorem',
      'Dolore laborum ex officia aliqua proident esse officia veniam id eu aliquip qui incididunt.'
    );

    -- Replace the end_time with the start_time + random interval
    -- UPDATE bookings
    -- SET end_time = start_time + INTERVAL '1 hour' * FLOOR(RANDOM() * 4)
END $$;



