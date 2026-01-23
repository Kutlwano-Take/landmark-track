-- Fix typo in alert messages where "rrom" should be "from"
UPDATE alerts 
SET message = REPLACE(message, 'rrom', 'from') 
WHERE message LIKE '%rrom%';

-- Check if any alerts still have the typo
SELECT id, type, title, message FROM alerts WHERE message LIKE '%rrom%';
