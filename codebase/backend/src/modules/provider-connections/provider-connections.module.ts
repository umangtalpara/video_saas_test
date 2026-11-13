import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ProviderConnection,
  ProviderConnectionSchema,
} from './schemas/provider-connection.schema';
import { ProviderConnectionsRepository } from './provider-connections.repository';
import { ProviderConnectionsService } from './provider-connections.service';
import { ProviderConnectionsController } from './provider-connections.controller';
import { ProvidersModule } from '../providers/providers.module';
import { EncryptionService } from '../../common/services/encryption.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProviderConnection.name, schema: ProviderConnectionSchema },
    ]),
    ProvidersModule,
  ],
  controllers: [ProviderConnectionsController],
  providers: [
    ProviderConnectionsRepository,
    ProviderConnectionsService,
    EncryptionService,
  ],
  exports: [
    ProviderConnectionsService,
    ProviderConnectionsRepository,
    EncryptionService,
  ],
})
export class ProviderConnectionsModule {}

