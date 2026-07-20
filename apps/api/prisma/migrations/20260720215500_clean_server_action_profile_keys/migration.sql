UPDATE "Employee"
SET "profileData" = (
  SELECT COALESCE(jsonb_object_agg(entry.key, entry.value), '{}'::jsonb)
  FROM jsonb_each("Employee"."profileData") AS entry(key, value)
  WHERE entry.key NOT LIKE '$ACTION\_%' ESCAPE '\'
)
WHERE "profileData" IS NOT NULL;
