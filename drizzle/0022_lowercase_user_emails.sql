-- Users whose lowercased emails collide are left for a manual merge.
UPDATE "users" AS u
SET "email" = lower(trim(u."email"))
WHERE u."email" <> lower(trim(u."email"))
  AND NOT EXISTS (
    SELECT 1 FROM "users" AS other
    WHERE other."id" <> u."id" AND lower(trim(other."email")) = lower(trim(u."email"))
  );
