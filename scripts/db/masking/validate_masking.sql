\set ON_ERROR_STOP on

DO $$
DECLARE
  bad_students int;
  bad_schools  int;
BEGIN
  SELECT count(*) INTO bad_students
  FROM students
  WHERE student_name IS NOT NULL
    AND student_name !~ '^(Amara|Brian|Cynthia|David|Esther|Felix|Grace|Henry|Irene|James|Kavata|Lewis|Maria|Noah|Otieno|Patience|Quentin|Rose|Samuel|Tabitha|Umar|Violet|Wycliffe|Xenia|Yusuf|Zawadi|Achieng|Boniface|Chloe|Dennis|Eunice|Gerald) ';

  SELECT count(*) INTO bad_schools
  FROM schools
  WHERE school_name !~ '^(Acacia|Baobab|Cedar|Daystar|Equator|Falcon|Greenhill|Highland|Ivory|Jacaranda|Kestrel|Lakeview|Mango|Northgate|Oakridge|Pinewood|Riverside|Summit|Tamarind|Unity|Valley|Westbrook|Yellowwood|Zenith|Hillcrest|Brookside|Garden|Meadow|Sunrise|Crystal|Maple|Cypress) ';

  IF bad_students > 0 OR bad_schools > 0 THEN
    RAISE EXCEPTION 'MASKING FAILED: % students, % schools still have real names', bad_students, bad_schools;
  END IF;

  RAISE NOTICE 'Masking validation passed: % students, % schools masked',
    (SELECT count(*) FROM students WHERE student_name IS NOT NULL),
    (SELECT count(*) FROM schools);
END $$;