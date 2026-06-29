import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { randomUUID } from 'crypto';

export interface UploadedFile {
  storageKey: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  url: string;
}

export interface UploadableFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private client!: Minio.Client;
  private bucket!: string;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const minio = this.config.get('minio', { infer: true });
    if (!minio) {
      throw new Error('MinIO configuration is missing');
    }

    this.bucket = minio.bucket;
    this.client = new Minio.Client({
      endPoint: minio.endpoint,
      port: minio.port,
      useSSL: minio.useSSL,
      accessKey: minio.accessKey,
      secretKey: minio.secretKey,
    });

    const exists = await this.client.bucketExists(this.bucket);
    if (!exists) {
      await this.client.makeBucket(this.bucket);
      this.logger.log(`Created MinIO bucket: ${this.bucket}`);
    }
  }

  async upload(
    file: UploadableFile,
    folder = 'attachments',
  ): Promise<UploadedFile> {
    const storageKey = `${folder}/${randomUUID()}-${file.originalname}`;
    await this.client.putObject(this.bucket, storageKey, file.buffer, file.size, {
      'Content-Type': file.mimetype,
    });

    const url = await this.getPresignedUrl(storageKey);
    return {
      storageKey,
      fileName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      url,
    };
  }

  async getPresignedUrl(storageKey: string, expirySeconds = 3600): Promise<string> {
    return this.client.presignedGetObject(this.bucket, storageKey, expirySeconds);
  }

  async delete(storageKey: string): Promise<void> {
    await this.client.removeObject(this.bucket, storageKey);
  }
}
