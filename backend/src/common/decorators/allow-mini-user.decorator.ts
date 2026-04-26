import { SetMetadata } from '@nestjs/common';

export const ALLOW_MINI_USER_KEY = 'allowMiniUser';

export const AllowMiniUser = () => SetMetadata(ALLOW_MINI_USER_KEY, true);
