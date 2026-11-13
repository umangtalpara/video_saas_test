#!/usr/bin/env node
/**
 * scaffold-starter.js — generates the project skeleton (package.json, tsconfig, jest/playwright config,
 * env files, docker-compose) from the Discovery Q&A answers stored in .ai/memory/state.json -> stack.
 *
 *   node .ai/scripts/scaffold-starter.js                 # use state.json -> stack
 *   node .ai/scripts/scaffold-starter.js --structure monorepo --db postgres --cache redis --docker
 *   node .ai/scripts/scaffold-starter.js --root <dir>    # write somewhere else (testing)
 *   node .ai/scripts/scaffold-starter.js clean           # remove generated config files
 *
 * It does NOT write application source (src/main.ts, modules, pages) — the Backend/Frontend agents do.
 * Existing files are never overwritten (except package.json, which is regenerated) unless --force.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const colors = { reset: '\x1b[0m', green: '\x1b[32m', blue: '\x1b[34m', yellow: '\x1b[33m', red: '\x1b[31m', bold: '\x1b[1m' };
const log = (msg, color = colors.reset) => console.log(`${color}${msg}${colors.reset}`);

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name) => { const i = argv.indexOf(`--${name}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : undefined; };

const workspaceRoot = path.resolve(opt('root') || path.join(__dirname, '../..'));
const backendPath = path.join(workspaceRoot, 'codebase/backend');
const frontendPath = path.join(workspaceRoot, 'codebase/frontend');
const sharedPath = path.join(workspaceRoot, 'codebase/shared');
const force = flag('force');

// ---------- help ----------
if (flag('help') || argv[0] === 'help' || argv.includes('-h')) {
  const header = fs.readFileSync(__filename, 'utf8').split('*/')[0].replace(/^#!.*\n/, '');
  console.log(header.replace(/^\/\*\*\n?/, '').replace(/^ \* ?/gm, ''));
  process.exit(0);
}

// ---------- clean ----------
if (argv[0] === 'clean') {
  const targets = [
    'package.json', 'package-lock.json', 'docker-compose.yml',
    'codebase/backend/package.json', 'codebase/backend/tsconfig.json', 'codebase/backend/tsconfig.build.json',
    'codebase/backend/nest-cli.json', 'codebase/backend/.env', 'codebase/backend/.env.example', 'codebase/backend/test/jest-e2e.json',
    'codebase/frontend/package.json', 'codebase/frontend/tsconfig.json', 'codebase/frontend/next.config.mjs',
    'codebase/frontend/postcss.config.js', 'codebase/frontend/tailwind.config.ts', 'codebase/frontend/jest.config.js',
    'codebase/frontend/jest.setup.ts', 'codebase/frontend/playwright.config.ts', 'codebase/frontend/.env.local', 'codebase/frontend/.env.example'
  ].map((f) => path.join(workspaceRoot, f));
  targets.forEach((f) => { if (fs.existsSync(f)) { fs.unlinkSync(f); log(`Deleted: ${path.relative(workspaceRoot, f)}`, colors.green); } });
  if (fs.existsSync(sharedPath)) { fs.rmSync(sharedPath, { recursive: true, force: true }); log('Deleted: codebase/shared/', colors.green); }
  log('Clean finished (source code under src/ was NOT touched).', colors.bold + colors.green);
  process.exit(0);
}

// ---------- stack from state.json + CLI ----------
const stack = {};
const statePath = path.join(__dirname, '../memory/state.json');
if (fs.existsSync(statePath)) {
  try { Object.assign(stack, JSON.parse(fs.readFileSync(statePath, 'utf8')).stack || {}); log('Loaded stack from .ai/memory/state.json', colors.green); }
  catch (err) { log('Could not parse state.json — using defaults / CLI flags.', colors.yellow); }
}
if (opt('structure')) stack.structure = opt('structure');
if (opt('db')) stack.dbEngine = opt('db');
if (opt('cache')) stack.cacheEngine = opt('cache');
if (flag('docker')) stack.dockerSetup = true;

const text = (v) => String(v === null || v === undefined ? '' : v).toLowerCase();
const cfg = {
  structure: /mono/.test(text(stack.structure)) ? 'monorepo' : 'decoupled',
  db: /postgres|pg/.test(text(stack.dbEngine)) ? 'postgres' : /mysql/.test(text(stack.dbEngine)) ? 'mysql' : 'mongodb',
  cache: /redis/.test(text(stack.cacheEngine)) ? 'redis' : 'local',
  docker: stack.dockerSetup === true || (/docker|compose|k8s/.test(text(stack.dockerSetup)) && !/manual|paas|no|false/.test(text(stack.dockerSetup))),
  mail: text(stack.mailProvider), storage: text(stack.storageProvider), logging: text(stack.loggingProvider),
  payment: text(stack.paymentProvider), realtime: text(stack.realtime),
  multiTenant: stack.multiTenant === true || /multi|tenant|true|yes/.test(text(stack.multiTenant)) && !/single|no|false/.test(text(stack.multiTenant))
};
log('Scaffolding with configuration:', colors.bold + colors.blue);
console.log(JSON.stringify(cfg, null, 2));

// ---------- helpers ----------
const ensureDir = (d) => fs.mkdirSync(d, { recursive: true });
function writeFile(file, content, { overwrite = false } = {}) {
  ensureDir(path.dirname(file));
  if (fs.existsSync(file) && !overwrite && !force) { log(`Kept existing: ${path.relative(workspaceRoot, file)}`, colors.yellow); return false; }
  fs.writeFileSync(file, content);
  log(`Wrote: ${path.relative(workspaceRoot, file)}`, colors.green);
  return true;
}
const json = (o) => JSON.stringify(o, null, 2) + '\n';
const sorted = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));

ensureDir(backendPath);
ensureDir(frontendPath);

// ---------- root ----------
if (cfg.structure === 'monorepo') {
  ensureDir(path.join(sharedPath, 'src'));
  writeFile(path.join(sharedPath, 'package.json'), json({
    name: '@factory/shared', version: '1.0.0', private: true, main: 'dist/index.js', types: 'dist/index.d.ts',
    scripts: { build: 'tsc -p tsconfig.json' }, dependencies: { zod: '^3.23.0' }, devDependencies: { typescript: '^5.6.0' }
  }), { overwrite: true });
  writeFile(path.join(sharedPath, 'tsconfig.json'), json({
    compilerOptions: { target: 'ES2022', module: 'commonjs', declaration: true, outDir: 'dist', rootDir: 'src', strict: true, esModuleInterop: true, skipLibCheck: true },
    include: ['src']
  }));
  writeFile(path.join(sharedPath, 'src/index.ts'), `export enum UserRole {\n  SUPER_ADMIN = 'super_admin',\n  ADMIN = 'admin',\n  USER = 'user',\n}\n`);
  writeFile(path.join(workspaceRoot, 'package.json'), json({
    name: 'saas-ai-factory', private: true,
    workspaces: ['codebase/backend', 'codebase/frontend', 'codebase/shared'],
    scripts: {
      'dev:backend': 'npm run start:dev --workspace=codebase/backend', 'dev:frontend': 'npm run dev --workspace=codebase/frontend',
      'build:shared': 'npm run build --workspace=codebase/shared', 'build:backend': 'npm run build --workspace=codebase/backend',
      'build:frontend': 'npm run build --workspace=codebase/frontend', 'build:all': 'npm run build:shared && npm run build:backend && npm run build:frontend',
      'test:backend': 'npm run test:unit --workspace=codebase/backend', 'test:frontend': 'npm run test --workspace=codebase/frontend',
      validate: 'node .ai/scripts/validate-project.js --tsc', 'sync:adapters': 'node .ai/scripts/sync-adapters.js'
    }
  }), { overwrite: true });
} else {
  writeFile(path.join(workspaceRoot, 'package.json'), json({
    name: 'saas-decoupled-project', private: true,
    scripts: {
      'dev:backend': 'npm --prefix codebase/backend run start:dev', 'dev:frontend': 'npm --prefix codebase/frontend run dev',
      'build:backend': 'npm --prefix codebase/backend run build', 'build:frontend': 'npm --prefix codebase/frontend run build',
      validate: 'node .ai/scripts/validate-project.js --tsc', 'sync:adapters': 'node .ai/scripts/sync-adapters.js'
    }
  }), { overwrite: true });
}

// ---------- backend dependencies (NestJS 11 compatible — verified against npm peer ranges) ----------
const deps = {
  '@nestjs/common': '^11.0.0', '@nestjs/core': '^11.0.0', '@nestjs/platform-express': '^11.0.0',
  '@nestjs/config': '^4.0.0', '@nestjs/swagger': '^11.0.0', '@nestjs/jwt': '^11.0.0', '@nestjs/passport': '^11.0.0',
  '@nestjs/throttler': '^6.0.0', '@nestjs/terminus': '^11.0.0', '@nestjs/cache-manager': '^3.0.0', 'cache-manager': '^6.0.0',
  'reflect-metadata': '^0.2.2', rxjs: '^7.8.1', 'class-validator': '^0.14.1', 'class-transformer': '^0.5.1',
  passport: '^0.7.0', 'passport-jwt': '^4.0.1', bcrypt: '^5.1.1', helmet: '^8.0.0', joi: '^17.13.0', uuid: '^9.0.1', winston: '^3.14.0', 'nest-winston': '^1.9.7'
};
const devDeps = {
  '@nestjs/cli': '^11.0.0', '@nestjs/schematics': '^11.0.0', '@nestjs/testing': '^11.0.0', typescript: '^5.6.0', 'ts-node': '^10.9.2',
  jest: '^29.7.0', 'ts-jest': '^29.2.0', supertest: '^7.0.0', '@types/node': '^22.0.0', '@types/express': '^5.0.0', '@types/jest': '^29.5.12',
  '@types/supertest': '^6.0.2', '@types/bcrypt': '^5.0.2', '@types/passport-jwt': '^4.0.1', '@types/uuid': '^9.0.8'
};
const env = {
  NODE_ENV: 'development', PORT: '3001', DB_ENGINE: cfg.db === 'mongodb' ? 'mongodb' : 'sql',
  JWT_SECRET: 'change-me-to-a-random-string-of-at-least-32-characters', JWT_ACCESS_EXPIRY: '15m', JWT_REFRESH_EXPIRY: '7d',
  CORS_ORIGINS: 'http://localhost:3000'
};

if (cfg.db === 'mongodb') {
  deps['@nestjs/mongoose'] = '^11.0.0'; deps.mongoose = '^8.5.0';
  env.MONGODB_URI = cfg.docker ? 'mongodb://localhost:27017/saasdb?replicaSet=rs0&directConnection=true' : 'mongodb://localhost:27017/saasdb';
} else {
  deps['@prisma/client'] = '^5.22.0'; devDeps.prisma = '^5.22.0';
  env.DATABASE_URL = cfg.db === 'postgres' ? 'postgresql://postgres:postgres@localhost:5432/saasdb?schema=public' : 'mysql://root:root@localhost:3306/saasdb';
}
if (cfg.cache === 'redis') {
  deps['@nestjs/bullmq'] = '^11.0.0'; deps.bullmq = '^5.12.0'; deps['@keyv/redis'] = '^4.0.0'; deps.keyv = '^5.0.0'; deps.ioredis = '^5.4.0';
  env.REDIS_URL = 'redis://localhost:6379';
} else {
  deps['@nestjs/schedule'] = '^6.0.0'; deps['@nestjs/event-emitter'] = '^3.0.0';
}
const mailDeps = {
  resend: { resend: '^4.0.0' }, sendgrid: { '@sendgrid/mail': '^8.1.0' }, ses: { '@aws-sdk/client-ses': '^3.600.0' },
  mailgun: { 'mailgun.js': '^10.2.0', 'form-data': '^4.0.0' }, smtp: { nodemailer: '^6.9.0' }
};
const mailKey = Object.keys(mailDeps).find((k) => cfg.mail.includes(k) || (k === 'ses' && /amazon/.test(cfg.mail)));
if (mailKey) {
  Object.assign(deps, mailDeps[mailKey]);
  if (mailKey === 'smtp') { devDeps['@types/nodemailer'] = '^6.4.15'; Object.assign(env, { SMTP_HOST: 'localhost', SMTP_PORT: '1025', SMTP_USER: '', SMTP_PASS: '', MAIL_FROM: 'no-reply@example.com' }); }
  else Object.assign(env, { MAIL_API_KEY: '', MAIL_FROM: 'no-reply@example.com' });
}
if (/s3|digital|spaces/.test(cfg.storage)) {
  Object.assign(deps, { '@aws-sdk/client-s3': '^3.600.0', '@aws-sdk/s3-request-presigner': '^3.600.0' });
  Object.assign(env, { S3_BUCKET: '', S3_REGION: 'us-east-1', S3_ENDPOINT: '', S3_ACCESS_KEY_ID: '', S3_SECRET_ACCESS_KEY: '' });
} else if (/cloudinary/.test(cfg.storage)) {
  deps.cloudinary = '^2.4.0'; Object.assign(env, { CLOUDINARY_URL: '' });
} else if (/local/.test(cfg.storage)) {
  deps.multer = '^1.4.5-lts.1'; devDeps['@types/multer'] = '^1.4.11'; env.UPLOAD_DIR = './uploads';
}
if (/datadog/.test(cfg.logging)) { deps['dd-trace'] = '^5.20.0'; Object.assign(env, { DD_API_KEY: '', DD_SITE: 'datadoghq.com', DD_SERVICE: 'saas-backend', DD_ENV: 'development', DD_LOGS_ENABLED: 'false' }); }
else if (/elk|elastic/.test(cfg.logging)) { deps['winston-elasticsearch'] = '^0.19.0'; env.ELASTICSEARCH_URL = 'http://localhost:9200'; }
else if (/cloudwatch/.test(cfg.logging)) { deps['winston-cloudwatch'] = '^6.3.0'; env.AWS_REGION = 'us-east-1'; }
if (/stripe/.test(cfg.payment)) { deps.stripe = '^16.0.0'; Object.assign(env, { STRIPE_SECRET_KEY: '', STRIPE_WEBHOOK_SECRET: '' }); }
else if (/razorpay/.test(cfg.payment)) { deps.razorpay = '^2.9.0'; Object.assign(env, { RAZORPAY_KEY_ID: '', RAZORPAY_KEY_SECRET: '', RAZORPAY_WEBHOOK_SECRET: '' }); }
else if (/paypal/.test(cfg.payment)) { deps['@paypal/paypal-server-sdk'] = '^1.0.0'; Object.assign(env, { PAYPAL_CLIENT_ID: '', PAYPAL_CLIENT_SECRET: '', PAYPAL_MODE: 'sandbox' }); }
if (/websocket|socket/.test(cfg.realtime)) { Object.assign(deps, { '@nestjs/websockets': '^11.0.0', '@nestjs/platform-socket.io': '^11.0.0', 'socket.io': '^4.7.5' }); }

const envText = (o) => Object.entries(o).map(([k, v]) => `${k}=${v}`).join('\n') + '\n';

writeFile(path.join(backendPath, 'package.json'), json({
  name: 'backend', version: '1.0.0', private: true,
  scripts: {
    build: 'nest build', start: 'nest start', 'start:dev': 'nest start --watch', 'start:prod': 'node dist/main',
    typecheck: 'tsc --noEmit', test: 'npm run test:unit', 'test:unit': 'jest', 'test:cov': 'jest --coverage',
    'test:e2e': 'jest --config ./test/jest-e2e.json'
  },
  dependencies: sorted(deps), devDependencies: sorted(devDeps),
  jest: {
    moduleFileExtensions: ['js', 'json', 'ts'], rootDir: 'src', testRegex: '.*\\.spec\\.ts$', transform: { '^.+\\.(t|j)s$': 'ts-jest' },
    moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' }, collectCoverageFrom: ['**/*.(t|j)s', '!**/*.module.ts', '!**/main.ts'],
    coverageDirectory: '../coverage', testEnvironment: 'node',
    coverageThreshold: { global: { branches: 75, functions: 80, lines: 80, statements: 80 } }
  }
}), { overwrite: true });
writeFile(path.join(backendPath, 'tsconfig.json'), json({
  compilerOptions: {
    module: 'commonjs', target: 'ES2022', declaration: true, removeComments: true, emitDecoratorMetadata: true, experimentalDecorators: true,
    allowSyntheticDefaultImports: true, esModuleInterop: true, sourceMap: true, outDir: './dist', baseUrl: './', incremental: true, skipLibCheck: true,
    paths: { '@/*': ['src/*'] },
    strict: true, noImplicitAny: true, strictNullChecks: true, strictFunctionTypes: true, strictPropertyInitialization: false,
    noImplicitReturns: true, noFallthroughCasesInSwitch: true, noUncheckedIndexedAccess: true, forceConsistentCasingInFileNames: true
  }
}));
writeFile(path.join(backendPath, 'tsconfig.build.json'), json({ extends: './tsconfig.json', exclude: ['node_modules', 'test', 'dist', '**/*spec.ts'] }));
writeFile(path.join(backendPath, 'nest-cli.json'), json({ $schema: 'https://json.schemastore.org/nest-cli', collection: '@nestjs/schematics', sourceRoot: 'src', compilerOptions: { deleteOutDir: true } }));
writeFile(path.join(backendPath, 'test/jest-e2e.json'), json({
  moduleFileExtensions: ['js', 'json', 'ts'], rootDir: '.', testEnvironment: 'node', testRegex: '.e2e-spec.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' }, moduleNameMapper: { '^@/(.*)$': '<rootDir>/../src/$1' }
}));
writeFile(path.join(backendPath, '.env.example'), envText(env));
const liveEnv = { ...env, JWT_SECRET: crypto.randomBytes(48).toString('hex') };
if (writeFile(path.join(backendPath, '.env'), envText(liveEnv))) log('  (.env is git-ignored; JWT_SECRET was generated randomly)', colors.yellow);

// ---------- frontend (Next 14 / React 18 / Tailwind 3) ----------
writeFile(path.join(frontendPath, 'package.json'), json({
  name: 'frontend', version: '1.0.0', private: true,
  scripts: {
    dev: 'next dev -p 3000', build: 'next build', start: 'next start', typecheck: 'tsc --noEmit', lint: 'next lint',
    test: 'jest', 'test:e2e': 'playwright test'
  },
  dependencies: sorted({
    next: '^14.2.35', react: '^18.3.1', 'react-dom': '^18.3.1', zustand: '^4.5.5', '@tanstack/react-query': '^5.59.0', 'react-hook-form': '^7.53.0',
    '@hookform/resolvers': '^3.9.0', zod: '^3.23.8', 'framer-motion': '^11.11.0', 'lucide-react': '^0.460.0', axios: '^1.7.7', clsx: '^2.1.1',
    'tailwind-merge': '^2.5.4', 'class-variance-authority': '^0.7.0', 'tailwindcss-animate': '^1.0.7', 'next-themes': '^0.4.3', 'date-fns': '^3.6.0'
  }),
  devDependencies: sorted({
    typescript: '^5.6.0', '@types/node': '^22.0.0', '@types/react': '^18.3.0', '@types/react-dom': '^18.3.0', tailwindcss: '^3.4.14', postcss: '^8.4.47',
    autoprefixer: '^10.4.20', eslint: '^8.57.1', 'eslint-config-next': '^14.2.35', jest: '^29.7.0', 'jest-environment-jsdom': '^29.7.0',
    '@testing-library/react': '^16.0.1', '@testing-library/jest-dom': '^6.6.0', '@testing-library/dom': '^10.4.0', '@types/jest': '^29.5.12', '@playwright/test': '^1.48.0'
  })
}), { overwrite: true });
writeFile(path.join(frontendPath, 'tsconfig.json'), json({
  compilerOptions: {
    target: 'ES2022', lib: ['dom', 'dom.iterable', 'esnext'], allowJs: false, skipLibCheck: true, strict: true, noEmit: true, esModuleInterop: true, module: 'esnext',
    moduleResolution: 'bundler', resolveJsonModule: true, isolatedModules: true, jsx: 'preserve', incremental: true, noUncheckedIndexedAccess: true,
    plugins: [{ name: 'next' }], paths: { '@/*': ['./src/*'] }
  },
  include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'], exclude: ['node_modules', 'e2e']
}));
writeFile(path.join(frontendPath, 'next.config.mjs'), `/** @type {import('next').NextConfig} */\nconst nextConfig = {\n  reactStrictMode: true,\n};\n\nexport default nextConfig;\n`);
writeFile(path.join(frontendPath, 'postcss.config.js'), `module.exports = {\n  plugins: { tailwindcss: {}, autoprefixer: {} },\n};\n`);
writeFile(path.join(frontendPath, 'tailwind.config.ts'), `import type { Config } from 'tailwindcss';\n\nconst config: Config = {\n  darkMode: ['class'],\n  content: ['./src/**/*.{ts,tsx}'],\n  theme: { extend: {} },\n  plugins: [require('tailwindcss-animate')],\n};\n\nexport default config;\n`);
writeFile(path.join(frontendPath, 'jest.config.js'), `const nextJest = require('next/jest');\nconst createJestConfig = nextJest({ dir: './' });\n\nmodule.exports = createJestConfig({\n  testEnvironment: 'jest-environment-jsdom',\n  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],\n  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },\n  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],\n});\n`);
writeFile(path.join(frontendPath, 'jest.setup.ts'), `import '@testing-library/jest-dom';\n`);
writeFile(path.join(frontendPath, 'playwright.config.ts'), `import { defineConfig } from '@playwright/test';\n\nexport default defineConfig({\n  testDir: './e2e',\n  fullyParallel: true,\n  retries: 2,\n  workers: '50%',\n  reporter: [['html', { open: 'never' }], ['json', { outputFile: 'test-results.json' }]],\n  use: { baseURL: 'http://localhost:3000', trace: 'on-first-retry', screenshot: 'only-on-failure' },\n  projects: [\n    { name: 'chromium', use: { browserName: 'chromium' } },\n    { name: 'firefox', use: { browserName: 'firefox' } },\n    { name: 'webkit', use: { browserName: 'webkit' } },\n  ],\n});\n`);
const feEnv = 'NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1\n';
writeFile(path.join(frontendPath, '.env.example'), feEnv);
writeFile(path.join(frontendPath, '.env.local'), feEnv);

// ---------- docker-compose (infrastructure only) ----------
if (cfg.docker) {
  let c = 'services:\n';
  let vols = '';
  if (cfg.db === 'mongodb') {
    // Mongoose transactions need a replica set, so run a single-node one.
    c += `  mongodb:\n    image: mongo:7.0\n    container_name: saas-mongodb\n    command: ["--replSet", "rs0", "--bind_ip_all"]\n    ports:\n      - "27017:27017"\n    volumes:\n      - mongodb_data:/data/db\n    healthcheck:\n      test: ["CMD-SHELL", "mongosh --quiet --eval \\"try { rs.status().ok } catch (e) { rs.initiate({_id:'rs0',members:[{_id:0,host:'localhost:27017'}]}).ok }\\""]\n      interval: 10s\n      timeout: 10s\n      retries: 10\n\n`;
    vols += '  mongodb_data:\n';
  } else if (cfg.db === 'postgres') {
    c += `  postgres:\n    image: postgres:16\n    container_name: saas-postgres\n    environment:\n      POSTGRES_USER: postgres\n      POSTGRES_PASSWORD: postgres\n      POSTGRES_DB: saasdb\n    ports:\n      - "5432:5432"\n    volumes:\n      - postgres_data:/var/lib/postgresql/data\n    healthcheck:\n      test: ["CMD-SHELL", "pg_isready -U postgres"]\n      interval: 10s\n      retries: 5\n\n`;
    vols += '  postgres_data:\n';
  } else {
    c += `  mysql:\n    image: mysql:8.0\n    container_name: saas-mysql\n    environment:\n      MYSQL_ROOT_PASSWORD: root\n      MYSQL_DATABASE: saasdb\n    ports:\n      - "3306:3306"\n    volumes:\n      - mysql_data:/var/lib/mysql\n    healthcheck:\n      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-proot"]\n      interval: 10s\n      retries: 5\n\n`;
    vols += '  mysql_data:\n';
  }
  if (cfg.cache === 'redis') c += `  redis:\n    image: redis:7-alpine\n    container_name: saas-redis\n    ports:\n      - "6379:6379"\n    healthcheck:\n      test: ["CMD", "redis-cli", "ping"]\n      interval: 10s\n      retries: 5\n\n`;
  c += `volumes:\n${vols}`;
  writeFile(path.join(workspaceRoot, 'docker-compose.yml'), c);
  log('  App containers (backend/frontend Dockerfiles) are added during the Deployment phase — see .ai/templates/devops/docker-compose.yml.template', colors.yellow);
}

log('\nScaffolding complete. Next: cd codebase/backend && npm install; cd ../frontend && npm install; then init shadcn with "npx shadcn@2.3.0 init" (Tailwind v3).', colors.bold + colors.green);
