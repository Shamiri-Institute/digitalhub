BEGIN;

WITH firsts(n, val) AS (
  VALUES (0,'Amara'),(1,'Brian'),(2,'Cynthia'),(3,'David'),(4,'Esther'),
    (5,'Felix'),(6,'Grace'),(7,'Henry'),(8,'Irene'),(9,'James'),
    (10,'Kavata'),(11,'Lewis'),(12,'Maria'),(13,'Noah'),(14,'Otieno'),
    (15,'Patience'),(16,'Quentin'),(17,'Rose'),(18,'Samuel'),(19,'Tabitha'),
    (20,'Umar'),(21,'Violet'),(22,'Wycliffe'),(23,'Xenia'),(24,'Yusuf'),
    (25,'Zawadi'),(26,'Achieng'),(27,'Boniface'),(28,'Chloe'),(29,'Dennis'),
    (30,'Eunice'),(31,'Gerald')
),
lasts(n, val) AS (
  VALUES (0,'Okello'),(1,'Mwangi'),(2,'Otieno'),(3,'Wanjiru'),(4,'Kamau'),
    (5,'Achieng'),(6,'Njoroge'),(7,'Adhiambo'),(8,'Kiptoo'),(9,'Mutua'),
    (10,'Wambui'),(11,'Omondi'),(12,'Chebet'),(13,'Maina'),(14,'Auma'),
    (15,'Kibet'),(16,'Nyongo'),(17,'Were'),(18,'Cheruiyot'),(19,'Onyango'),
    (20,'Wafula'),(21,'Mumo'),(22,'Kibe'),(23,'Atieno'),(24,'Barasa'),
    (25,'Gitau'),(26,'Koech'),(27,'Owino'),(28,'Mwende'),(29,'Rotich'),
    (30,'Simiyu'),(31,'Wekesa')
)
UPDATE students s
SET student_name = f.val || ' ' || l.val || ' ' || upper(substr(md5(s.id), 9, 8))
FROM firsts f, lasts l
WHERE s.student_name IS NOT NULL
  AND f.n = (abs(('x' || substr(md5(s.id), 1, 4))::bit(16)::int) % 32)
  AND l.n = (abs(('x' || substr(md5(s.id), 5, 4))::bit(16)::int) % 32);

COMMIT;