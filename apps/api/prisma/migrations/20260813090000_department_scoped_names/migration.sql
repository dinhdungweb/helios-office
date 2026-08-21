-- Allow separate organization branches to use the same department name.
DROP INDEX "Department_name_key";

CREATE UNIQUE INDEX "Department_parentId_name_key"
ON "Department"("parentId", "name");
