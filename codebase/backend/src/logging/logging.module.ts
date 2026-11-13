import { Global, Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import { createWinstonLoggerOptions } from './winston.config';

@Global()
@Module({
  imports: [
    WinstonModule.forRootAsync({
      useFactory: () => createWinstonLoggerOptions(process.env['LOG_LEVEL'] || 'info'),
    }),
  ],
  exports: [WinstonModule],
})
export class LoggingModule {}

