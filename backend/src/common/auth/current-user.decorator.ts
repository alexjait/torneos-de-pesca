import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AccountStatus, UserRole } from '@prisma/client';

export type CurrentUserData = {
  sub: string;
  email: string;
  roles: UserRole[];
  accountStatus: AccountStatus;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserData | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
