import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  authTag: string;
  keyVersion: number;
}

@Injectable()
export class EncryptionService {
  private readonly key: Buffer;
  private readonly keyVersion = 1;

  constructor(private readonly configService: ConfigService) {
    const rawKey =
      this.configService.get<string>('ENCRYPTION_KEY') ||
      this.configService.get<string>('security.encryptionKey') ||
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

    if (/^[0-9a-fA-F]{64}$/.test(rawKey)) {
      this.key = Buffer.from(rawKey, 'hex');
    } else {
      this.key = crypto.createHash('sha256').update(rawKey).digest();
    }
  }

  public encrypt(plaintext: string): EncryptedPayload {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
    ciphertext += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return {
      ciphertext,
      iv: iv.toString('hex'),
      authTag,
      keyVersion: this.keyVersion,
    };
  }

  public decrypt(payload: EncryptedPayload): string {
    const iv = Buffer.from(payload.iv, 'hex');
    const authTag = Buffer.from(payload.authTag, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(authTag);
    let plaintext = decipher.update(payload.ciphertext, 'hex', 'utf8');
    plaintext += decipher.final('utf8');
    return plaintext;
  }

  public maskKey(apiKey: string): string {
    const trimmed = apiKey.trim();
    if (trimmed.length <= 8) {
      return `****${trimmed.slice(-2)}`;
    }
    const hasSkPrefix = trimmed.startsWith('sk-');
    const prefix = hasSkPrefix ? 'sk-' : trimmed.slice(0, 3);
    const suffix = trimmed.slice(-4);
    return `${prefix}****${suffix}`;
  }
}

