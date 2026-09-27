import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type RateLimitPolicy = {
  maxRequests: number;
  windowMs: number;
};

type RateLimitMatch = {
  bucket: string;
  policy: RateLimitPolicy;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

@Injectable()
export class PublicAuthRateLimitGuard implements CanActivate {
  private static readonly entries = new Map<string, RateLimitEntry>();

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      ip?: string;
      headers?: Record<string, string | string[] | undefined>;
      method?: string;
      originalUrl?: string;
      socket?: { remoteAddress?: string };
    }>();

    const method = request.method ?? 'GET';
    const path = request.originalUrl?.split('?')[0] ?? '';
    const match = this.resolvePolicy(method, path);

    if (!match) {
      return true;
    }

    const key = `${this.resolveClientIp(request)}:${match.bucket}`;
    const now = Date.now();
    const current = PublicAuthRateLimitGuard.entries.get(key);

    if (!current || current.resetAt <= now) {
      PublicAuthRateLimitGuard.entries.set(key, {
        count: 1,
        resetAt: now + match.policy.windowMs,
      });
      return true;
    }

    if (current.count >= match.policy.maxRequests) {
      throw new HttpException(
        'Demasiados intentos. Intenta nuevamente en unos minutos.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    current.count += 1;
    PublicAuthRateLimitGuard.entries.set(key, current);
    return true;
  }

  private resolvePolicy(method: string, path: string): RateLimitMatch | null {
    if (method === 'POST' && path.endsWith('/auth/login')) {
      return {
        bucket: 'POST:/auth/login',
        policy: { maxRequests: 10, windowMs: 5 * 60 * 1000 },
      };
    }

    if (method === 'POST' && path.endsWith('/auth/refresh')) {
      return {
        bucket: 'POST:/auth/refresh',
        policy: { maxRequests: 10, windowMs: 5 * 60 * 1000 },
      };
    }

    if (method === 'POST' && path.endsWith('/auth/logout')) {
      return {
        bucket: 'POST:/auth/logout',
        policy: { maxRequests: 20, windowMs: 5 * 60 * 1000 },
      };
    }

    if (method === 'POST' && path.endsWith('/auth/request-password-setup')) {
      return {
        bucket: 'POST:/auth/request-password-setup',
        policy: { maxRequests: 5, windowMs: 15 * 60 * 1000 },
      };
    }

    if (method === 'POST' && path.endsWith('/auth/activate-account')) {
      return {
        bucket: 'POST:/auth/activate-account',
        policy: { maxRequests: 10, windowMs: 15 * 60 * 1000 },
      };
    }

    if (method === 'POST' && path.endsWith('/auth/complete-password-setup')) {
      return {
        bucket: 'POST:/auth/complete-password-setup',
        policy: { maxRequests: 10, windowMs: 15 * 60 * 1000 },
      };
    }

    if (method === 'POST' && path.endsWith('/auth/bootstrap-admin')) {
      return {
        bucket: 'POST:/auth/bootstrap-admin',
        policy: { maxRequests: 3, windowMs: 15 * 60 * 1000 },
      };
    }

    if (method === 'POST' && path.endsWith('/registrations/self-register')) {
      return {
        bucket: 'POST:/registrations/self-register',
        policy: { maxRequests: 5, windowMs: 15 * 60 * 1000 },
      };
    }

    if (
      method === 'GET' &&
      path.endsWith('/public/tournaments/registration-options')
    ) {
      return {
        bucket: 'GET:/public/tournaments/registration-options',
        policy: { maxRequests: 30, windowMs: 15 * 60 * 1000 },
      };
    }

    if (
      method === 'GET' &&
      path.includes('/public/registrations/status/')
    ) {
      return {
        bucket: 'GET:/public/registrations/status/:lookupToken',
        policy: { maxRequests: 20, windowMs: 15 * 60 * 1000 },
      };
    }

    return null;
  }

  private resolveClientIp(request: {
    ip?: string;
    headers?: Record<string, string | string[] | undefined>;
    socket?: { remoteAddress?: string };
  }) {
    const trustProxyHeaders =
      this.configService.get<string>('TRUST_PROXY_HEADERS') === 'true';

    if (trustProxyHeaders) {
      const forwardedFor = request.headers?.['x-forwarded-for'];
      if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
        return forwardedFor.split(',')[0].trim();
      }

      if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
        return forwardedFor[0];
      }
    }

    return request.ip ?? request.socket?.remoteAddress ?? 'unknown';
  }
}
