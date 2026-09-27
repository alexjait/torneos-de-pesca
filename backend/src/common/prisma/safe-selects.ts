import { Prisma } from '@prisma/client';

export const safeUserSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  accountStatus: true,
  emailVerifiedAt: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  deletedBy: true,
} satisfies Prisma.UserSelect;
