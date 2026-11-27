-- Put the period-lock permission with the other attendance permissions, with a readable label.
UPDATE "PermissionDefinition" SET "category" = 'Chấm công', "label" = 'Chốt / mở chốt kỳ công', "sortOrder" = 54 WHERE "key" = 'permission.attendance-period.lock';
