-- Add test wine to inventory
INSERT INTO wines (
    tenant_id, 
    name, 
    vintage, 
    price, 
    note, 
    grape, 
    description, 
    stock_status
)
VALUES (
    'palate', -- Adjust tenant_id if necessary (e.g., 'drops' or 'palate')
    'Jean Collet Cremant de Bourgogne',
    '2022',
    1000,
    'Bubbles and bread—the ultimate texture match.',
    'Chardonnay',
    'Dry and energetic with a fine mousse; features sharp green apple notes and a refreshing citrus finish.',
    'in_stock'
);
