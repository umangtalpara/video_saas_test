export class ProviderError extends Error {
  constructor(
    public readonly providerId: string,
    public readonly code: string,
    message: string,
    public readonly statusCode?: number,
    public readonly rawError?: unknown,
  ) {
    super(`[${providerId}] ${code}: ${message}`);
    this.name = 'ProviderError';
  }
}

export class ProviderAuthError extends ProviderError {
  constructor(providerId: string, message: string = 'Invalid API credentials') {
    super(providerId, 'UNAUTHORIZED', message, 401);
    this.name = 'ProviderAuthError';
  }
}

export class ProviderQuotaExhaustedError extends ProviderError {
  constructor(providerId: string, message: string = 'Provider quota or credits exhausted') {
    super(providerId, 'QUOTA_EXHAUSTED', message, 402);
    this.name = 'ProviderQuotaExhaustedError';
  }
}

export class ProviderRateLimitError extends ProviderError {
  constructor(providerId: string, message: string = 'Too many requests to provider') {
    super(providerId, 'RATE_LIMITED', message, 429);
    this.name = 'ProviderRateLimitError';
  }
}

export class ProviderPolicyError extends ProviderError {
  constructor(providerId: string, message: string = 'Prompt rejected by provider safety filter') {
    super(providerId, 'POLICY_VIOLATION', message, 400);
    this.name = 'ProviderPolicyError';
  }
}

export class ProviderServerError extends ProviderError {
  constructor(providerId: string, message: string = 'Provider service returned an error') {
    super(providerId, 'SERVER_ERROR', message, 502);
    this.name = 'ProviderServerError';
  }
}
