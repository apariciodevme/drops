
-- Add wine_id foreign key to wine_pairings table
ALTER TABLE wine_pairings 
ADD COLUMN wine_id UUID REFERENCES wines(id);

-- Optional: Create an index for performance
CREATE INDEX idx_wine_pairings_wine_id ON wine_pairings(wine_id);
