-- Add latitude/longitude to places for map view
ALTER TABLE places
  ADD COLUMN IF NOT EXISTS latitude  DECIMAL(10, 7),
  ADD COLUMN IF NOT EXISTS longitude DECIMAL(10, 7);
