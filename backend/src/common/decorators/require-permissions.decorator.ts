import { SetMetadata } from '@nestjs/common';
import { PERMISSION_KEY } from '../constants/permissions.constant';

export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSION_KEY, permissions);
