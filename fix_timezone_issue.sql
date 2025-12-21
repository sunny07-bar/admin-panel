-- ============================================================================
-- FIX TIMEZONE ISSUE FOR OPENING HOURS
-- ============================================================================
-- This script fixes timezone issues with opening_hours table
-- Times should be stored as TEXT/VARCHAR (HH:mm format) not TIME type
-- to avoid timezone conversions
-- ============================================================================

-- Step 1: Check current column types
-- Run this first to see what data types are currently being used:
SELECT 
    column_name, 
    data_type, 
    udt_name
FROM information_schema.columns 
WHERE table_name = 'opening_hours' 
  AND column_name IN ('open_time', 'close_time');

-- Step 2: If columns are TIME type, we need to convert them to TEXT
-- First, backup current data (just in case)
-- Note: This assumes your times are already in HH:mm format but might be stored as TIME

-- Check current data format:
SELECT 
    weekday,
    open_time,
    close_time,
    open_time::text as open_time_text,
    close_time::text as close_time_text
FROM opening_hours
LIMIT 5;

-- Step 3: Convert TIME columns to TEXT/VARCHAR if they are TIME type
-- IMPORTANT: Only run this if the columns are actually TIME type!
-- This will preserve existing data

DO $$
BEGIN
    -- Check if open_time is TIME type and convert to TEXT
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'opening_hours' 
        AND column_name = 'open_time' 
        AND udt_name = 'time'
    ) THEN
        -- Convert TIME to TEXT preserving HH:mm format
        ALTER TABLE opening_hours 
        ALTER COLUMN open_time TYPE TEXT USING to_char(open_time, 'HH24:MI');
        
        RAISE NOTICE 'Converted open_time from TIME to TEXT';
    ELSE
        RAISE NOTICE 'open_time is already TEXT or different type';
    END IF;

    -- Check if close_time is TIME type and convert to TEXT
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'opening_hours' 
        AND column_name = 'close_time' 
        AND udt_name = 'time'
    ) THEN
        -- Convert TIME to TEXT preserving HH:mm format
        ALTER TABLE opening_hours 
        ALTER COLUMN close_time TYPE TEXT USING to_char(close_time, 'HH24:MI');
        
        RAISE NOTICE 'Converted close_time from TIME to TEXT';
    ELSE
        RAISE NOTICE 'close_time is already TEXT or different type';
    END IF;
END $$;

-- Step 4: Verify the conversion worked
SELECT 
    column_name, 
    data_type, 
    udt_name
FROM information_schema.columns 
WHERE table_name = 'opening_hours' 
  AND column_name IN ('open_time', 'close_time');

-- Step 5: Check a few sample records to verify data integrity
SELECT 
    weekday,
    open_time,
    close_time,
    pg_typeof(open_time) as open_time_type,
    pg_typeof(close_time) as close_time_type
FROM opening_hours
ORDER BY weekday
LIMIT 7;

-- ============================================================================
-- MANUAL FIX: If times are wrong in database, you can manually update them
-- ============================================================================
-- Example: If you entered 8:00 PM (20:00) but it's showing wrong, update it:
-- 
-- UPDATE opening_hours 
-- SET open_time = '20:00', close_time = '22:00'
-- WHERE weekday = 0;  -- Sunday (0-6)
--
-- Weekday reference:
-- 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday
-- 4 = Thursday, 5 = Friday, 6 = Saturday
-- ============================================================================

-- ============================================================================
-- FIX DATE ISSUE FOR SPECIAL_HOURS (if applicable)
-- ============================================================================
-- If you're having date issues with special_hours table:
-- Check the date column type:

SELECT 
    column_name, 
    data_type, 
    udt_name
FROM information_schema.columns 
WHERE table_name = 'special_hours' 
  AND column_name = 'date';

-- If date column is TIMESTAMP or TIMESTAMPTZ, convert to DATE:
-- (Only run this if the column is actually TIMESTAMP/TIMESTAMPTZ)

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'special_hours' 
        AND column_name = 'date' 
        AND (udt_name = 'timestamp' OR udt_name = 'timestamptz')
    ) THEN
        ALTER TABLE special_hours 
        ALTER COLUMN date TYPE DATE USING date::date;
        
        RAISE NOTICE 'Converted special_hours.date from TIMESTAMP to DATE';
    ELSE
        RAISE NOTICE 'special_hours.date is already DATE or different type';
    END IF;
END $$;

-- Check time_from and time_to in special_hours as well:
SELECT 
    column_name, 
    data_type, 
    udt_name
FROM information_schema.columns 
WHERE table_name = 'special_hours' 
  AND column_name IN ('time_from', 'time_to');

-- Convert special_hours time columns to TEXT if needed:
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'special_hours' 
        AND column_name = 'time_from' 
        AND udt_name = 'time'
    ) THEN
        ALTER TABLE special_hours 
        ALTER COLUMN time_from TYPE TEXT USING to_char(time_from, 'HH24:MI');
        
        RAISE NOTICE 'Converted special_hours.time_from from TIME to TEXT';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'special_hours' 
        AND column_name = 'time_to' 
        AND udt_name = 'time'
    ) THEN
        ALTER TABLE special_hours 
        ALTER COLUMN time_to TYPE TEXT USING to_char(time_to, 'HH24:MI');
        
        RAISE NOTICE 'Converted special_hours.time_to from TIME to TEXT';
    END IF;
END $$;

