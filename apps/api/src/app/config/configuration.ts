import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  port: parseInt(process.env['PORT'] ?? '3000', 10),
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
  corsOrigin: process.env['CORS_ORIGIN'] ?? 'http://localhost:4200',
}));

export const databaseConfig = registerAs('database', () => ({
  url: process.env['DATABASE_URL'],
}));

export const jwtConfig = registerAs('jwt', () => ({
  secret: process.env['JWT_SECRET'] ?? 'helix-dev-secret',
  expiresIn: process.env['JWT_EXPIRES_IN'] ?? '15m',
  refreshSecret: process.env['JWT_REFRESH_SECRET'] ?? 'helix-dev-refresh-secret',
  refreshExpiresIn: process.env['JWT_REFRESH_EXPIRES_IN'] ?? '7d',
}));

export const redisConfig = registerAs('redis', () => ({
  url: process.env['REDIS_URL'] ?? 'redis://localhost:6379',
}));

export const minioConfig = registerAs('minio', () => ({
  endpoint: process.env['MINIO_ENDPOINT'] ?? 'localhost',
  port: parseInt(process.env['MINIO_PORT'] ?? '9000', 10),
  accessKey: process.env['MINIO_ACCESS_KEY'] ?? 'helix_minio',
  secretKey: process.env['MINIO_SECRET_KEY'] ?? 'helix_minio_secret',
  bucket: process.env['MINIO_BUCKET'] ?? 'helix-attachments',
  useSSL: process.env['MINIO_USE_SSL'] === 'true',
}));
