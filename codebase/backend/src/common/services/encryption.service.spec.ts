import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EncryptionService } from './encryption.service';

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncryptionService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(
              '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
            ),
          },
        },
      ],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('encrypts and decrypts a secret API key accurately', () => {
    const rawKey = 'sk-runway-live-secret-key-123456789';
    const encrypted = service.encrypt(rawKey);

    expect(encrypted.ciphertext).toBeDefined();
    expect(encrypted.iv).toHaveLength(24); // 12 bytes in hex
    expect(encrypted.authTag).toHaveLength(32); // 16 bytes in hex
    expect(encrypted.keyVersion).toBe(1);

    const decrypted = service.decrypt(encrypted);
    expect(decrypted).toBe(rawKey);
  });

  it('fails decryption if authTag is tampered with', () => {
    const encrypted = service.encrypt('super-secret');
    const tampered = {
      ...encrypted,
      authTag: '00'.repeat(16),
    };

    expect(() => service.decrypt(tampered)).toThrow();
  });

  describe('maskKey', () => {
    it('masks standard api key with sk- prefix', () => {
      const masked = service.maskKey('sk-1234567890abcdef');
      expect(masked).toBe('sk-****cdef');
    });

    it('masks non-sk keys', () => {
      const masked = service.maskKey('runway_secret_key_9999');
      expect(masked).toBe('run****9999');
    });

    it('masks short keys safely', () => {
      const masked = service.maskKey('123456');
      expect(masked).toBe('****56');
    });
  });
});

