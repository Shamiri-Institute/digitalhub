-- 2023-24 imports wrote free text before the form limited it to Day, Boarding and Both.
UPDATE "schools"
SET "boarding_day" = CASE
  WHEN lower(trim("boarding_day")) IN ('day', 'day school') THEN 'Day'
  WHEN lower(trim("boarding_day")) = 'boarding' THEN 'Boarding'
  WHEN lower(trim("boarding_day")) IN ('both', 'day and boarding', 'mixed') THEN 'Both'
  ELSE NULL
END
WHERE "boarding_day" IS NOT NULL AND "boarding_day" NOT IN ('Day', 'Boarding', 'Both');
