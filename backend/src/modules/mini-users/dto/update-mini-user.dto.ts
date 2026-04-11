import { PartialType } from '@nestjs/swagger';
import { CreateMiniUserDto } from './create-mini-user.dto';

export class UpdateMiniUserDto extends PartialType(CreateMiniUserDto) {}
