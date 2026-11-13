import { envValidationSchema } from './env.validation';

describe('envValidationSchema', () => {
  it('should validate valid environment configuration', () => {
    const validConfig = {
      NODE_ENV: 'development',
      PORT: 3001,
      MONGODB_URI: 'mongodb://localhost:27017/saasdb',
      JWT_SECRET: 'super-secret-key-that-is-at-least-32-characters-long',
      JWT_ACCESS_EXPIRY: '15m',
      JWT_REFRESH_EXPIRY: '7d',
      CORS_ORIGINS: 'http://localhost:3000',
      LOG_LEVEL: 'info',
    };

    const { error, value } = envValidationSchema.validate(validConfig);
    expect(error).toBeUndefined();
    expect(value.PORT).toBe(3001);
  });

  it('should fail if JWT_SECRET is shorter than 32 characters', () => {
    const invalidConfig = {
      JWT_SECRET: 'too-short',
    };

    const { error } = envValidationSchema.validate(invalidConfig);
    expect(error).toBeDefined();
    expect(error?.message).toContain('JWT_SECRET');
  });

  it('should apply defaults for optional variables', () => {
    const minimalConfig = {
      JWT_SECRET: 'super-secret-key-that-is-at-least-32-characters-long',
    };

    const { error, value } = envValidationSchema.validate(minimalConfig);
    expect(error).toBeUndefined();
    expect(value.NODE_ENV).toBe('development');
    expect(value.PORT).toBe(3001);
    expect(value.LOG_LEVEL).toBe('info');
  });
});

