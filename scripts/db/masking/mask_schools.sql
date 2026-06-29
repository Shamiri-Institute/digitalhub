BEGIN;

WITH prefixes(n, val) AS (
  VALUES (0,'Acacia'),(1,'Baobab'),(2,'Cedar'),(3,'Daystar'),(4,'Equator'),
    (5,'Falcon'),(6,'Greenhill'),(7,'Highland'),(8,'Ivory'),(9,'Jacaranda'),
    (10,'Kestrel'),(11,'Lakeview'),(12,'Mango'),(13,'Northgate'),(14,'Oakridge'),
    (15,'Pinewood'),(16,'Riverside'),(17,'Summit'),(18,'Tamarind'),(19,'Unity'),
    (20,'Valley'),(21,'Westbrook'),(22,'Yellowwood'),(23,'Zenith'),
    (24,'Hillcrest'),(25,'Brookside'),(26,'Garden'),(27,'Meadow'),
    (28,'Sunrise'),(29,'Crystal'),(30,'Maple'),(31,'Cypress')
),
suffixes(n, val) AS (
  VALUES (0,'Secondary School'),(1,'High School'),(2,'Academy'),(3,'School'),
    (4,'Mixed Secondary'),(5,'Girls High School'),(6,'Boys High School'),(7,'Comprehensive School')
)
UPDATE schools sc
SET school_name = p.val || ' ' || x.val || ' ' || upper(substr(md5(sc.id), 9, 8))
FROM prefixes p, suffixes x
WHERE p.n = (abs(('x' || substr(md5(sc.id), 1, 4))::bit(16)::int) % 32)
  AND x.n = (abs(('x' || substr(md5(sc.id), 5, 4))::bit(16)::int) % 8);

COMMIT;