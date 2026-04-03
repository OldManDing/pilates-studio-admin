import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from '../constants/permissions.constant';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Owner has all permissions
    if (user.role?.code === 'OWNER') {
      return true;
    }

    const userPermissions = user.role?.permissions || [];

    const hasPermission = requiredPermissions.every((permission) => {
      // Support wildcards like READ:* or MANAGE:MEMBERS
      const [action, module] = permission.split(':');
      return userPermissions.some((userPerm: string) => {
        const [userAction, userModule] = userPerm.split(':');
        return (
          (userAction === '*' || userAction === action) &&
          (userModule === '*' || userModule === module)
        );
      });
    });

    if (!hasPermission) {
      throw new ForbiddenException(
        `Required permissions: ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }
}
