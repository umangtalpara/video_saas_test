import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Provider, ProviderSchema } from './schemas/provider.schema';
import {
  ProviderModel,
  ProviderModelSchema,
} from './schemas/provider-model.schema';
import { ProvidersRepository } from './providers.repository';
import { ProvidersService } from './providers.service';
import { ProvidersController } from './providers.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Provider.name, schema: ProviderSchema },
      { name: ProviderModel.name, schema: ProviderModelSchema },
    ]),
  ],
  controllers: [ProvidersController],
  providers: [ProvidersRepository, ProvidersService],
  exports: [ProvidersService, ProvidersRepository],
})
export class ProvidersModule {}

