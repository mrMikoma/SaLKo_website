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