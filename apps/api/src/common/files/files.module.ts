import { Global, Module } from "@nestjs/common";
import { FilesController } from "./files.controller";
import { FilesService } from "./files.service";
import { ObjectStorageService } from "./object-storage.service";

// Global so feature modules can register their FileAccessPolicy and resolve file ids.
@Global()
@Module({
  controllers: [FilesController],
  providers: [FilesService, ObjectStorageService],
  exports: [FilesService, ObjectStorageService]
})
export class FilesModule {}
