-- Flyway Repair Script
-- Run this in your MySQL database to fix the failed migration issue

-- Option 1: Check current flyway schema history
SELECT * FROM flyway_schema_history ORDER BY installed_rank;

-- Option 2: Delete the failed migration entry (if you see a failed V1 migration)
-- DELETE FROM flyway_schema_history WHERE version = '1' AND success = 0;

-- Option 3: If you want to completely reset flyway history (CAUTION: Only for development)
-- DROP TABLE IF EXISTS flyway_schema_history;

-- After running the appropriate option above, restart your Spring Boot application
