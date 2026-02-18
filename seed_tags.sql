-- FLAVOR TAGS
insert into tags (name, category) values 
('Rich', 'Body'),
('Light', 'Body'),
('Full-Bodied', 'Body'),
('Crisp', 'Acidity'),
('High Acid', 'Acidity'),
('Low Acid', 'Acidity'),
('Sweet', 'Sweetness'),
('Dry', 'Sweetness'),
('Tannic', 'Tannin'),
('Smooth', 'Tannin'),
('Red Meat', 'Type'),
('White Meat', 'Type'),
('Seafood', 'Type'),
('Shellfish', 'Type'),
('Spicy', 'Type'),
('Vegetarian', 'Type'),
('Cheese', 'Type'),
('Dessert', 'Type')
on conflict (name, category, tenant_id) do nothing;
