import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const UPLOAD_URL_TTL_SECONDS = 10 * 60;
const DOWNLOAD_URL_TTL_SECONDS = 5 * 60;

// S3-compatible storage (MinIO locally). Two clients: `internal` talks to S3_ENDPOINT from the
// server; `public` signs URLs with S3_PUBLIC_ENDPOINT, the address browsers can reach (they differ
// under Docker/LAN). The bucket is created on first use, so the API starts without MinIO.
@Injectable()
export class ObjectStorageService {
  private readonly logger = new Logger(ObjectStorageService.name);
  private readonly internal: S3Client;
  private readonly public: S3Client;
  readonly bucket: string;
  private bucketReady?: Promise<void>;

  constructor(config: ConfigService) {
    const endpoint = config.get<string>("S3_ENDPOINT") || "http://127.0.0.1:9000";
    const base = {
      region: config.get<string>("S3_REGION") || "us-east-1",
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.get<string>("S3_ACCESS_KEY") || "",
        secretAccessKey: config.get<string>("S3_SECRET_KEY") || ""
      }
    };

    this.bucket = config.get<string>("S3_BUCKET") || "helios-office";
    this.internal = new S3Client({ ...base, endpoint, maxAttempts: 2 });
    this.public = new S3Client({ ...base, endpoint: config.get<string>("S3_PUBLIC_ENDPOINT") || endpoint });
  }

  async presignUpload(objectKey: string, contentType: string) {
    await this.ensureBucket();
    return getSignedUrl(this.public, new PutObjectCommand({ Bucket: this.bucket, Key: objectKey, ContentType: contentType }), {
      expiresIn: UPLOAD_URL_TTL_SECONDS
    });
  }

  presignDownload(objectKey: string, fileName: string, contentType: string) {
    return getSignedUrl(
      this.public,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
        ResponseContentType: contentType,
        ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`
      }),
      { expiresIn: DOWNLOAD_URL_TTL_SECONDS }
    );
  }

  // null when the object does not exist (yet).
  async head(objectKey: string) {
    try {
      const result = await this.internal.send(new HeadObjectCommand({ Bucket: this.bucket, Key: objectKey }));
      return { size: result.ContentLength ?? 0, contentType: result.ContentType ?? "", etag: result.ETag?.replace(/"/g, "") ?? null };
    } catch (error) {
      if (error instanceof S3ServiceException && (error.$metadata.httpStatusCode === 404 || error.name === "NotFound")) {
        return null;
      }
      throw this.unavailable(error);
    }
  }

  async put(objectKey: string, body: Buffer, contentType: string) {
    await this.ensureBucket();
    try {
      const result = await this.internal.send(new PutObjectCommand({ Bucket: this.bucket, Key: objectKey, Body: body, ContentType: contentType }));
      return { etag: result.ETag?.replace(/"/g, "") ?? null };
    } catch (error) {
      throw this.unavailable(error);
    }
  }

  // Reads a whole object into memory; for server-side processing of small files (imports).
  async get(objectKey: string) {
    try {
      const result = await this.internal.send(new GetObjectCommand({ Bucket: this.bucket, Key: objectKey }));
      return Buffer.from(await result.Body!.transformToByteArray());
    } catch (error) {
      throw this.unavailable(error);
    }
  }

  async delete(objectKey: string) {
    try {
      await this.internal.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: objectKey }));
    } catch (error) {
      throw this.unavailable(error);
    }
  }

  private ensureBucket() {
    this.bucketReady ??= (async () => {
      try {
        await this.internal.send(new HeadBucketCommand({ Bucket: this.bucket }));
      } catch (error) {
        if (error instanceof S3ServiceException && error.$metadata.httpStatusCode === 404) {
          await this.internal.send(new CreateBucketCommand({ Bucket: this.bucket }));
          this.logger.log(`Created bucket "${this.bucket}"`);
          return;
        }
        throw error;
      }
    })().catch((error: unknown) => {
      this.bucketReady = undefined;
      throw this.unavailable(error);
    });

    return this.bucketReady;
  }

  private unavailable(error: unknown) {
    this.logger.warn(`Object storage error: ${(error as Error).message}`);
    return new ServiceUnavailableException("File storage is unavailable");
  }
}
