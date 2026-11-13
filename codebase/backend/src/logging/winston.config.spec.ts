import * as winston from 'winston';
import { redactSensitiveData, createWinstonLoggerOptions } from './winston.config';

describe('winston.config sensitive data redaction', () => {
  it('should redact Bearer authorization tokens', () => {
    const input = 'Authorization header: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xyz';
    const output = redactSensitiveData(input);
    expect(output).toContain('Bearer ***REDACTED***');
    expect(output).not.toContain('eyJhbGciOiJIUzI1Ni');
  });

  it('should redact sk- API keys', () => {
    const input = 'Failed to connect with key sk-ant-api03-abcdef1234567890abcdef123456';
    const output = redactSensitiveData(input);
    expect(output).toContain('***REDACTED***');
    expect(output).not.toContain('sk-ant-api03-abcdef');
  });

  it('should redact password and token fields in JSON strings', () => {
    const input = '{"email":"test@example.com","password":"SuperSecretPassword123!"}';
    const output = redactSensitiveData(input);
    expect(output).toContain('"password":"***REDACTED***"');
    expect(output).not.toContain('SuperSecretPassword123!');
  });

  it('should create valid Winston logger options and format log info', () => {
    const options = createWinstonLoggerOptions('debug');
    expect(options.level).toBe('debug');
    expect(options.transports).toBeDefined();

    const logger = winston.createLogger(options);
    expect(logger).toBeDefined();
  });
});
