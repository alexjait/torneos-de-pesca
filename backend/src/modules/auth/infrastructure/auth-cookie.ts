import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';

export const REFRESH_COOKIE_NAME = 'torneos_pesca_refresh';

export function readRefreshToken(cookieHeader: string | undefined) {
  const value = cookieHeader
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${REFRESH_COOKIE_NAME}=`))
    ?.slice(`${REFRESH_COOKIE_NAME}=`.length);
  return value || undefined;
}

function durationMs(value: string) {
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) throw new Error('AUTH_REFRESH_EXPIRES_IN invalido');
  return Number(match[1]) * ({ s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2]] ?? 0);
}

export function setRefreshCookie(response: Response, config: ConfigService, token: string) {
  response.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.get<string>('NODE_ENV') !== 'development',
    path: '/api/v1/auth',
    maxAge: durationMs(config.getOrThrow<string>('AUTH_REFRESH_EXPIRES_IN')),
  });
}

export function clearRefreshCookie(response: Response, config: ConfigService) {
  response.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.get<string>('NODE_ENV') !== 'development',
    path: '/api/v1/auth',
  });
}

export function refreshTokenFromRequest(request: Request) {
  return readRefreshToken(request.headers.cookie);
}
