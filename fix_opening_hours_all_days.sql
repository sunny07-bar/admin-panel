-- ============================================================================
-- FIX OPENING HOURS - ENSURE ALL 7 DAYS EXIST
-- ============================================================================
-- This script ensures all 7 days of the week (Sunday=0 to Saturday=6) 
-- exist in the opening_hours table.
-- Missing days will be inserted with default values.
-- ============================================================================

-- Step 1: Ensure unique constraint exists on weekday (if not already present)
-- This prevents duplicate entries for the same day
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'opening_hours_weekday_unique'
    ) THEN
        ALTER TABLE opening_hours 
        ADD CONSTRAINT opening_hours_weekday_unique UNIQUE (weekday);
        RAISE NOTICE 'Added unique constraint on weekday';
    ELSE
        RAISE NOTICE 'Unique constraint on weekday already exists';
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Could not add unique constraint (may already exist or table structure different): %', SQLERRM;
END $$;

-- Step 2: Insert all 7 days if they don't exist
-- Using INSERT ... ON CONFLICT to avoid duplicates

-- Sunday (weekday = 0)
INSERT INTO opening_hours (weekday, open_time, close_time, is_closed)
VALUES (0, '16:00', '22:00', false)
ON CONFLICT (weekday) DO NOTHING;

-- Monday (weekday = 1)
INSERT INTO opening_hours (weekday, open_time, close_time, is_closed)
VALUES (1, '16:00', '23:00', false)
ON CONFLICT (weekday) DO NOTHING;

-- Tuesday (weekday = 2)
INSERT INTO opening_hours (weekday, open_time, close_time, is_closed)
VALUES (2, '16:00', '23:00', false)
ON CONFLICT (weekday) DO NOTHING;

-- Wednesday (weekday = 3)
INSERT INTO opening_hours (weekday, open_time, close_time, is_closed)
VALUES (3, '16:00', '23:00', false)
ON CONFLICT (weekday) DO NOTHING;

-- Thursday (weekday = 4)
INSERT INTO opening_hours (weekday, open_time, close_time, is_closed)
VALUES (4, '16:00', '23:00', false)
ON CONFLICT (weekday) DO NOTHING;

-- Friday (weekday = 5)
INSERT INTO opening_hours (weekday, open_time, close_time, is_closed)
VALUES (5, '16:00', '00:00', false)
ON CONFLICT (weekday) DO NOTHING;

-- Saturday (weekday = 6)
INSERT INTO opening_hours (weekday, open_time, close_time, is_closed)
VALUES (6, '16:00', '00:00', false)
ON CONFLICT (weekday) DO NOTHING;

-- ============================================================================
-- ALTERNATIVE METHOD: If ON CONFLICT doesn't work, use this approach
-- ============================================================================
-- This method checks if each day exists before inserting (works without unique constraint)

DO $$
DECLARE
    day_num INTEGER;
    day_names TEXT[] := ARRAY['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    default_open_times TEXT[] := ARRAY['16:00', '16:00', '16:00', '16:00', '16:00', '16:00', '16:00'];
    default_close_times TEXT[] := ARRAY['22:00', '23:00', '23:00', '23:00', '23:00', '00:00', '00:00'];
BEGIN
    FOR day_num IN 0..6 LOOP
        IF NOT EXISTS (SELECT 1 FROM opening_hours WHERE weekday = day_num) THEN
            INSERT INTO opening_hours (weekday, open_time, close_time, is_closed)
            VALUES (
                day_num,
                default_open_times[day_num + 1],
                default_close_times[day_num + 1],
                false
            );
            RAISE NOTICE 'Inserted % (weekday %)', day_names[day_num + 1], day_num;
        ELSE
            RAISE NOTICE '% (weekday %) already exists', day_names[day_num + 1], day_num;
        END IF;
    END LOOP;
END $$;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Run this query to verify all 7 days exist:

SELECT 
    weekday,
    CASE weekday
        WHEN 0 THEN 'Sunday'
        WHEN 1 THEN 'Monday'
        WHEN 2 THEN 'Tuesday'
        WHEN 3 THEN 'Wednesday'
        WHEN 4 THEN 'Thursday'
        WHEN 5 THEN 'Friday'
        WHEN 6 THEN 'Saturday'
    END AS day_name,
    open_time,
    close_time,
    is_closed
FROM opening_hours
ORDER BY weekday;

-- Expected result: 7 rows (one for each day, weekday 0-6)

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. Weekday values:
--    - 0 = Sunday
--    - 1 = Monday
--    - 2 = Tuesday
--    - 3 = Wednesday
--    - 4 = Thursday
--    - 5 = Friday
--    - 6 = Saturday
--
-- 2. Default times set:
--    - Sunday: 4:00 PM - 10:00 PM (16:00 - 22:00)
--    - Monday-Thursday: 4:00 PM - 11:00 PM (16:00 - 23:00)
--    - Friday-Saturday: 4:00 PM - 12:00 AM (16:00 - 00:00)
--
-- 3. If your table doesn't have a unique constraint on weekday, you may need
--    to add one first:
--    ALTER TABLE opening_hours ADD CONSTRAINT opening_hours_weekday_unique UNIQUE (weekday);
--
-- 4. You can adjust the default times above to match your restaurant's hours
--
-- ============================================================================

