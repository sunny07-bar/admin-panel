-- Add category_type column to menu_categories table
-- This will allow categories to be categorized as either 'food' or 'drink'

-- Step 1: Add the category_type column with a default value of 'food'
ALTER TABLE menu_categories 
ADD COLUMN IF NOT EXISTS category_type TEXT DEFAULT 'food' CHECK (category_type IN ('food', 'drink'));

-- Step 2: Update existing categories to 'food' by default (backward compatibility)
UPDATE menu_categories SET category_type = 'food' WHERE category_type IS NULL;

-- Step 3: Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_menu_categories_category_type ON menu_categories(category_type);

-- Verification queries:
-- SELECT id, name, category_type FROM menu_categories ORDER BY display_order;
-- SELECT category_type, COUNT(*) FROM menu_categories GROUP BY category_type;

