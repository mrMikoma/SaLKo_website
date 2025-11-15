-- Insert system admin user (always created in all environments)
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
    password,
    auth_provider,
    email_verified
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
    '$2b$10$ib8HsdFrQ89RUU3Z/xWzI.jH1Uv.rQKZhB7z1M9Q7.WA5nCYCF64.',
    'credentials',
    TRUE
  )
ON CONFLICT (email) DO NOTHING;

-- Insert development test user (for testing purposes)
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
    password,
    auth_provider,
    email_verified
  )
VALUES
  (
    'user',
    'Käyttäjä',
    'SaLKo Käyttäjä',
    '0987654321',
    'Lentoasemantie 50',
    'Savonlinna',
    '57310',
    'kayttaja@savonlinnanlentokerho.fi',
    '$2b$10$9IeLVhbG1SLmEldgZXMP6eUFKo6rLWsh.FGgVZSrWjCcuXwBZDmlS',
    'credentials',
    TRUE
  )
ON CONFLICT (email) DO NOTHING;

-- Insert system guest user (for unauthenticated bookings)
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
    password,
    auth_provider,
    email_verified
  )
VALUES
  (
    'guest',
    'Vieras',
    'Järjestelmän Vieras',
    '',
    '',
    '',
    '',
    'vieras@savonlinnanlentokerho.fi',
    NULL,
    'system',
    FALSE
  )
ON CONFLICT (email) DO NOTHING;