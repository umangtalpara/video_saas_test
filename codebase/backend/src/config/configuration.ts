export interface AppConfig {
  nodeEnv: string;
  port: number;
  apiPrefix: string;
  corsOrigins: string[];
}

export interface DatabaseConfig {
  uri: string;
  maxPoolSize: number;
  serverSelectionTimeoutMS: number;
}

export interface SecurityConfig {
  jwtSecret: string;
  jwtAccessExpiry: string;
  jwtRefreshExpiry: string;
  encryptionKey: string;
}

export interface LoggingConfig {
  level: string;
}

export interface RootConfig {
  app: AppConfig;
  database: DatabaseConfig;
  security: SecurityConfig;
  logging: LoggingConfig;
}

export default (): RootConfig => ({
  app: {
    nodeEnv: process.env['NODE_ENV'] || 'development',
    port: parseInt(process.env['PORT'] || '3001', 10),
    apiPrefix: 'api/v1',
    corsOrigins: (process.env['CORS_ORIGINS'] || 'http://localhost:3000')
      .split(',')
      .map((origin: string): string => origin.trim())
      .filter((origin: string): boolean => origin.length > 0),
  },
  database: {
    uri: process.env['MONGODB_URI'] || 'mongodb://localhost:27017/saasdb',
    maxPoolSize: 50,
    serverSelectionTimeoutMS: 5000,
  },
  security: {
    jwtSecret:
      process.env['JWT_SECRET'] ||
      'change-me-to-a-random-string-of-at-least-32-characters',
    jwtAccessExpiry: process.env['JWT_ACCESS_EXPIRY'] || '15m',
    jwtRefreshExpiry: process.env['JWT_REFRESH_EXPIRY'] || '7d',
    encryptionKey:
      process.env['ENCRYPTION_KEY'] ||
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  },
  logging: {
    level: process.env['LOG_LEVEL'] || 'info',
  },
});

