import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';

describe('MailService', () => {
  let mailService: MailService;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    configService = {
      get: jest.fn((key: string, defaultVal: string) => defaultVal || 'mock-value'),
    } as unknown as jest.Mocked<ConfigService>;

    mailService = new MailService(configService);
  });

  it('should send verification email in test environment', async () => {
    process.env['NODE_ENV'] = 'test';
    const sent = await mailService.sendVerificationEmail(
      'user@example.com',
      'User Name',
      'test-token-123',
    );
    expect(sent).toBe(true);
  });

  it('should send password reset email in test environment', async () => {
    process.env['NODE_ENV'] = 'test';
    const sent = await mailService.sendPasswordResetEmail(
      'user@example.com',
      'User Name',
      'reset-token-123',
    );
    expect(sent).toBe(true);
  });
});

