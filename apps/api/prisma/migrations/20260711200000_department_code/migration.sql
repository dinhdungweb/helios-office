ALTER TABLE "Department" ADD COLUMN "code" TEXT;

UPDATE "Department"
SET "code" = UPPER("id")
WHERE "id" ~ '^dep-[0-9]+$';

WITH max_seed_code AS (
  SELECT COALESCE(MAX((regexp_match("id", '^dep-([0-9]+)$'))[1]::INTEGER), 0) AS max_value
  FROM "Department"
  WHERE "id" ~ '^dep-[0-9]+$'
),
numbered_departments AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (ORDER BY "createdAt", "name", "id") AS row_number
  FROM "Department"
  WHERE "code" IS NULL
)
UPDATE "Department" AS department
SET "code" = 'DEP-' || LPAD((max_seed_code.max_value + numbered_departments.row_number)::TEXT, 3, '0')
FROM numbered_departments, max_seed_code
WHERE department."id" = numbered_departments."id";

ALTER TABLE "Department" ALTER COLUMN "code" SET NOT NULL;

CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code");
