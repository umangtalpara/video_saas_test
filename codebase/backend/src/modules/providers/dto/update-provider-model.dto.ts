import { PartialType } from '@nestjs/swagger';
import { CreateProviderModelDto } from './create-provider-model.dto';

export class UpdateProviderModelDto extends PartialType(CreateProviderModelDto) {}

