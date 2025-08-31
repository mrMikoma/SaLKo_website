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

  -- Insert 50 random bookings for the admin user
  -- The bookings will be for planes: OH-CON, OH-PDX, OH-816, OH-829, OH-475, OH-386
  -- The type will be one of the allowed types: local, trip, training, maintenance, fire, other
  -- The start_time will be a random time today or tomorrow between 6 AM and 11 PM in EEST timezone

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
      'OH-829',
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
      'OH-829',
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
    ),
    (
      'OH-829',
      (NOW()::DATE + INTERVAL '8 hours' + INTERVAL '1 hour' * FLOOR(RANDOM() * 14)),
      (NOW()::DATE + INTERVAL '8 hours' + INTERVAL '1 hour' * FLOOR(RANDOM() * 14) + INTERVAL '1 hour'),
      admin_user_id,
      'local',
      'ipsum Lorem',
      'Culpa deserunt consequat ut exercitation irure elit occaecat cillum.'
    ),
    (
      'OH-CON',
      (NOW()::DATE + INTERVAL '8 hours' + INTERVAL '1 hour' * FLOOR(RANDOM() * 14)),
      (NOW()::DATE + INTERVAL '8 hours' + INTERVAL '1 hour' * FLOOR(RANDOM() * 14) + INTERVAL '1 hour'),
      admin_user_id,
      'local',
      'ipsum Lorem',
      'Dolor irure cupidatat aliqua eu labore velit elit id nostrud.'
    ),
    (
      'OH-829',
      (NOW()::DATE + INTERVAL '8 hours' + INTERVAL '1 hour' * FLOOR(RANDOM() * 14)),
      (NOW()::DATE + INTERVAL '8 hours' + INTERVAL '1 hour' * FLOOR(RANDOM() * 14) + INTERVAL '1 hour'),
      admin_user_id,
      'local',
      'ipsum Lorem',
      'Dolor irure cupidatat aliqua eu labore velit elit id nostrud.'
    ),
    (
      'OH-816',
      (NOW()::DATE + INTERVAL '8 hours' + INTERVAL '1 hour' * FLOOR(RANDOM() * 14)),
      (NOW()::DATE + INTERVAL '8 hours' + INTERVAL '1 hour' * FLOOR(RANDOM() * 14) + INTERVAL '1 hour'),
      admin_user_id,
      'local',
      'ipsum Lorem',
      'Dolor irure cupidatat aliqua eu labore velit elit id nostrud.'
    ),
    (
      'OH-PDX',
      (NOW()::DATE + INTERVAL '8 hours' + INTERVAL '1 hour' * FLOOR(RANDOM() * 14)),
      (NOW()::DATE + INTERVAL '8 hours' + INTERVAL '1 hour' * FLOOR(RANDOM() * 14) + INTERVAL '1 hour'),
      admin_user_id,
      'local',
      'ipsum Lorem',
      'Dolor irure cupidatat aliqua eu labore velit elit id nostrud.'
    ),
    (
      'OH-816',
      (NOW()::DATE + INTERVAL '8 hours' + INTERVAL '1 hour' * FLOOR(RANDOM() * 14)),
      (NOW()::DATE + INTERVAL '8 hours' + INTERVAL '1 hour' * FLOOR(RANDOM() * 14) + INTERVAL '1 hour'),
      admin_user_id,
      'local',
      'ipsum Lorem',
      'Dolor irure cupidatat aliqua eu labore velit elit id nostrud.'
    ),
    (
      'OH-475',
      (NOW()::DATE + INTERVAL '8 hours' + INTERVAL '1 hour' * FLOOR(RANDOM() * 14)),
      (NOW()::DATE + INTERVAL '8 hours' + INTERVAL '1 hour' * FLOOR(RANDOM() * 14) + INTERVAL '1 hour'),
      admin_user_id,
      'local',
      'ipsum Lorem',
      'Dolor irure cupidatat aliqua eu labore velit elit id nostrud.'
    ),
    (
      'OH-386',
      (NOW()::DATE + INTERVAL '32 hours' + INTERVAL '1 hour' * FLOOR(RANDOM() * 14)),
      (NOW()::DATE + INTERVAL '32 hours' + INTERVAL '1 hour' * FLOOR(RANDOM() * 14) + INTERVAL '1 hour'),
      admin_user_id,
      'local',
      'ipsum Lorem',
      'Dolor irure cupidatat aliqua eu labore velit elit id nostrud.'
    ),
    (
      'OH-386',
      (NOW()::DATE + INTERVAL '32 hours' + INTERVAL '1 hour' * FLOOR(RANDOM() * 14)),
      (NOW()::DATE + INTERVAL '32 hours' + INTERVAL '1 hour' * FLOOR(RANDOM() * 14) + INTERVAL '1 hour'),
      admin_user_id,
      'local',
      'ipsum Lorem',
      'Dolor irure cupidatat aliqua eu labore velit elit id nostrud.'
    ),
    (
      'OH-386',
      (NOW()::DATE + INTERVAL '32 hours' + INTERVAL '1 hour' * FLOOR(RANDOM() * 14)),
      (NOW()::DATE + INTERVAL '32 hours' + INTERVAL '1 hour' * FLOOR(RANDOM() * 14) + INTERVAL '1 hour'),
      admin_user_id,
      'local',
      'ipsum Lorem',
      'Dolor irure cupidatat aliqua eu labore velit elit id nostrud.'
    ),
    (
      'OH-PDX',
      (NOW()::DATE + INTERVAL '32 hours' + INTERVAL '1 hour' * FLOOR(RANDOM() * 14)),
      (NOW()::DATE + INTERVAL '32 hours' + INTERVAL '1 hour' * FLOOR(RANDOM() * 14) + INTERVAL '1 hour'),
      admin_user_id,
      'local',
      'ipsum Lorem',
      'Dolor irure cupidatat aliqua eu labore velit elit id nostrud.'
    ),
    (
      'OH-CON',
      (NOW()::DATE + INTERVAL '32 hours' + INTERVAL '1 hour' * FLOOR(RANDOM() * 14)),
      (NOW()::DATE + INTERVAL '32 hours' + INTERVAL '1 hour' * FLOOR(RANDOM() * 14) + INTERVAL '1 hour'),
      admin_user_id,
      'local',
      'ipsum Lorem',
      'Dolor irure cupidatat aliqua eu labore velit elit id nostrud.'
    ),
    (
      'OH-CON',
      (NOW()::DATE + INTERVAL '32 hours' + INTERVAL '1 hour' * FLOOR(RANDOM() * 14)),
      (NOW()::DATE + INTERVAL '32 hours' + INTERVAL '1 hour' * FLOOR(RANDOM() * 14) + INTERVAL '1 hour'),
      admin_user_id,
      'local',
      'ipsum Lorem',
      'Dolor irure cupidatat aliqua eu labore velit elit id nostrud.'
    );
END $$;