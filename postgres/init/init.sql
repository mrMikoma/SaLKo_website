-- Create users table
CREATE TABLE
  users (
    id TEXT PRIMARY KEY,
    role TEXT NOT NULL DEFAULT 'user',
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL
  );

-- Insert test data into users
INSERT INTO
  users (id, role, name, email, password)
VALUES
  (
    'admin',
    'admin',
    'Admin',
    'admin@admin.com',
    'admin'
  ),
  ('user', 'user', 'User', 'user@user.com', 'user');

-- Create bullets table
CREATE TABLE
  bullets (
    id INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id TEXT NOT NULL,
    date BIGINT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users (id)
  );

-- Insert test data into bullets
INSERT INTO
  bullets (user_id, date, title, content)
VALUES
  (
    'admin',
    1737194400,
    'Lorem ipsum',
    'Dolore laborum ex officia aliqua proident esse officia veniam id eu aliquip qui incididunt.'
  ),
  (
    'user',
    1737280800,
    'Lorem ipsum',
    'Culpa deserunt consequat ut exercitation irure elit occaecat cillum.'
  ),
  (
    'admin',
    1737367200,
    'Lorem ipsum',
    'Dolor irure cupidatat aliqua eu labore velit elit id nostrud.'
  ),
  (
    'user',
    1737453600,
    'Lorem ipsum',
    'Dolor irure cupidatat aliqua eu labore velit elit id nostrud.'
  ),
  (
    'admin',
    1737194400,
    'ipsum Lorem',
    'Dolore laborum ex officia aliqua proident esse officia veniam id eu aliquip qui incididunt.'
  );

-- Create bookings table
CREATE TABLE
  bookings (
    id INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id TEXT NOT NULL,
    plane TEXT NOT NULL,
    start_time BIGINT NOT NULL,
    end_time BIGINT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users (id)
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
    1737194400,
    1737198000,
    'admin',
    'trip',
    'Lorem ipsum',
    'Dolore laborum ex officia aliqua proident esse officia veniam id eu aliquip qui incididunt.'
  ),
  (
    'OH-SEE',
    1737194400,
    1737198000,
    'admin',
    'trip',
    'Lorem ipsum',
    'Culpa deserunt consequat ut exercitation irure elit occaecat cillum.'
  ),
  (
    'OH-CON',
    1737280800,
    1737295200,
    'admin',
    'trip',
    'Lorem ipsum',
    'Dolor irure cupidatat aliqua eu labore velit elit id nostrud.'
  ),
  (
    'OH-SEE',
    1737280800,
    1737295200,
    'admin',
    'trip',
    'Lorem ipsum',
    'Dolor irure cupidatat aliqua eu labore velit elit id nostrud.'
  ),
  (
    'OH-CON',
    1737367200,
    1737370800,
    'admin',
    'trip',
    'Lorem ipsum',
    'Dolor irure cupidatat aliqua eu labore velit elit id nostrud.'
  ),
  (
    'OH-SEE',
    1737367200,
    1737370800,
    'admin',
    'trip',
    'Lorem ipsum',
    'Dolor irure cupidatat aliqua eu labore velit elit id nostrud.'
  ),
  (
    'OH-CON',
    1737453600,
    1737457200,
    'admin',
    'trip',
    'Lorem ipsum',
    'Dolor irure cupidatat aliqua eu labore velit elit id nostrud.'
  ),
  (
    'OH-CON',
    1737194400,
    1737198000,
    'admin',
    'local',
    'ipsum Lorem',
    'Dolore laborum ex officia aliqua proident esse officia veniam id eu aliquip qui incididunt.'
  );