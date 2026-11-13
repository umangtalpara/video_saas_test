import * as winston from 'winston';

const SENSITIVE_PATTERNS: RegExp[] = [
  /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
  /sk-[a-zA-Z0-9\-_]{20,}/gi,
  /(["']?(?:password|token|secret|apiKey|authorization|accessToken|refreshToken)["']?\s*[:=]\s*["']?)([^"',\s\}]+)(["']?)/gi,
];

export function redactSensitiveData(text: string): string {
  let sanitized = text;
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(
      pattern,
      (match: string, p1?: string, _p2?: string, p3?: string): string => {
        if (p1 !== undefined && p3 !== undefined) {
          return `${p1}***REDACTED***${p3}`;
        }
        if (match.toLowerCase().startsWith('bearer ')) {
          return 'Bearer ***REDACTED***';
        }
        return '***REDACTED***';
      },
    );
  }
  return sanitized;
}

const redactFormat = winston.format((info: winston.Logform.TransformableInfo) => {
  if (typeof info.message === 'string') {
    info.message = redactSensitiveData(info.message);
  }
  const symbols = Object.getOwnPropertySymbols(info);
  for (const sym of symbols) {
    const val = (info as Record<symbol, unknown>)[sym];
    if (typeof val === 'string') {
      (info as Record<symbol, unknown>)[sym] = redactSensitiveData(val);
    }
  }
  return info;
});

export function createWinstonLoggerOptions(
  logLevel: string = 'info',
): winston.LoggerOptions {
  return {
    level: logLevel,
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      redactFormat(),
      winston.format.json(),
    ),
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp({ format: 'HH:mm:ss' }),
          redactFormat(),
          winston.format.printf((info: winston.Logform.TransformableInfo): string => {
            const level = info.level.toUpperCase();
            const timestamp = String(info['timestamp'] ?? '');
            const msg = String(info.message ?? '');
            const context = info['context'] ? ` [${String(info['context'])}]` : '';
            return `${timestamp} ${level}${context}: ${msg}`;
          }),
        ),
      }),
    ],
  };
}

