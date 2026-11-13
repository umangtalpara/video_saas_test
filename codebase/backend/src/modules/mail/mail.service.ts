import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST', 'localhost');
    const port = this.configService.get<number>('SMTP_PORT', 1025);
    const user = this.configService.get<string>('SMTP_USER', '');
    const pass = this.configService.get<string>('SMTP_PASS', '');

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user ? { user, pass } : undefined,
    });
  }

  public async sendVerificationEmail(
    to: string,
    name: string,
    token: string,
  ): Promise<boolean> {
    const from = this.configService.get<string>(
      'MAIL_FROM',
      'no-reply@videoforge.ai',
    );
    const appUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    const verificationUrl = `${appUrl}/verify-email?token=${token}`;

    try {
      if (process.env['NODE_ENV'] === 'test') {
        this.logger.log(`[TEST] Verification email to ${to}: ${verificationUrl}`);
        return true;
      }

      await this.transporter.sendMail({
        from,
        to,
        subject: 'Verify your VideoForge AI account',
        html: `
          <h2>Welcome to VideoForge AI, ${name}!</h2>
          <p>Please click the link below to verify your email address:</p>
          <p><a href="${verificationUrl}">${verificationUrl}</a></p>
          <p>This link will expire in 24 hours.</p>
        `,
      });
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to send verification email to ${to}: ${msg}`);
      return false;
    }
  }

  public async sendPasswordResetEmail(
    to: string,
    name: string,
    token: string,
  ): Promise<boolean> {
    const from = this.configService.get<string>(
      'MAIL_FROM',
      'no-reply@videoforge.ai',
    );
    const appUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    try {
      if (process.env['NODE_ENV'] === 'test') {
        this.logger.log(`[TEST] Password reset email to ${to}: ${resetUrl}`);
        return true;
      }

      await this.transporter.sendMail({
        from,
        to,
        subject: 'Reset your VideoForge AI password',
        html: `
          <h2>Hello ${name},</h2>
          <p>You requested to reset your password. Click the link below to set a new password:</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          <p>This link will expire in 1 hour. If you did not request this, please ignore this email.</p>
        `,
      });
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to send password reset email to ${to}: ${msg}`);
      return false;
    }
  }
}
