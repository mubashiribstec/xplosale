-- Global regions for a worldwide platform
-- Inserts a "Remote / Worldwide" catch-all region and major global cities
-- Uses ON CONFLICT DO NOTHING so re-running is safe

INSERT INTO "Region" (id, name, "nameUr", slug, city, country)
VALUES
  ('remote-worldwide-xps01', 'Remote / Worldwide', 'ریموٹ / عالمی', 'remote-worldwide', 'Remote', 'REMOTE'),
  ('global-london-xps01',    'London',             'لندن',           'london',           'London',  'GB'),
  ('global-dubai-xps01',     'Dubai',              'دبئی',           'dubai',            'Dubai',   'AE'),
  ('global-toronto-xps01',   'Toronto',            'ٹورنٹو',         'toronto',          'Toronto', 'CA'),
  ('global-newyork-xps01',   'New York',           'نیو یارک',       'new-york',         'New York','US'),
  ('global-sydney-xps01',    'Sydney',             'سڈنی',           'sydney',           'Sydney',  'AU')
ON CONFLICT (slug) DO NOTHING;
