import configuration from './configuration';

describe('configuration loader', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should load default configuration values when env is empty', () => {
    delete process.env['PORT'];
    delete process.env['NODE_ENV'];
    delete process.env['MONGODB_URI'];

    const config = configuration();

    expect(config.app.port).toBe(3001);
    expect(config.app.nodeEnv).toBe('development');
    expect(config.database.uri).toBe('mongodb://localhost:27017/saasdb');
    expect(config.security.jwtAccessExpiry).toBe('15m');
    expect(config.logging.level).toBe('info');
  });

  it('should parse environment variables when provided', () => {
    process.env['PORT'] = '4000';
    process.env['NODE_ENV'] = 'production';
    process.env['MONGODB_URI'] = 'mongodb+srv://cluster.mongodb.net/prod';
    process.env['CORS_ORIGINS'] = 'https://app.videoforge.ai, https://admin.videoforge.ai';
    process.env['LOG_LEVEL'] = 'debug';

    const config = configuration();

    expect(config.app.port).toBe(4000);
    expect(config.app.nodeEnv).toBe('production');
    expect(config.database.uri).toBe('mongodb+srv://cluster.mongodb.net/prod');
    expect(config.app.corsOrigins).toEqual([
      'https://app.videoforge.ai',
      'https://admin.videoforge.ai',
    ]);
    expect(config.logging.level).toBe('debug');
  });
});
