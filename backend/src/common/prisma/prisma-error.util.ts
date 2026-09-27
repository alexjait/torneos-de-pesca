import { Prisma } from '@prisma/client';

export function isPrismaUniqueConstraintError(
  error: unknown,
  field?: string,
) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }

  if (error.code !== 'P2002') {
    return false;
  }

  if (!field) {
    return true;
  }

  const target = error.meta?.target;
  return Array.isArray(target) && target.includes(field);
}
