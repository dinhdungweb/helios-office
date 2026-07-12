CREATE TABLE "PermissionDefinition" (
    "key" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "adminOnly" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PermissionDefinition_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "PermissionDefinition_category_sortOrder_key_idx" ON "PermissionDefinition"("category", "sortOrder", "key");
