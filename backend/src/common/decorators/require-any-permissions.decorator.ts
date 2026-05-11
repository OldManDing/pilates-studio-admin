import { SetMetadata } from '@nestjs/common';
import { ANY_PERMISSION_KEY } from '../constants/permissions.constant';

export const RequireAnyPermissions = (...permissions: string[]) =>
  SetMetadata(ANY_PERMISSION_KEY, permissions);
