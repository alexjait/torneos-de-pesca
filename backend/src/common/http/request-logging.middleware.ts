import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

type AuthenticatedRequest = Request & {
  requestId?: string;
  user?: {
    sub?: string;
    roles?: string[];
  };
};

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{1,128}$/;

function resolveRequestId(incoming: string | undefined) {
  return incoming && REQUEST_ID_PATTERN.test(incoming) ? incoming : randomUUID();
}

function normalizePath(originalUrl: string) {
  return originalUrl.split('?')[0] || '/';
}

function resolveLevel(statusCode: number) {
  if (statusCode >= 500) {
    return 'error';
  }

  if (statusCode >= 400) {
    return 'warn';
  }

  return 'info';
}

function resolveModule(path: string) {
  const normalized = path.replace(/^\/api\/v1/, '').replace(/^\/+/, '');
  return normalized.split('/')[0] || 'root';
}

export function requestLoggingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const request = req as AuthenticatedRequest;
  const startedAt = Date.now();
  const incomingRequestId = req.header('x-request-id');
  const requestId = resolveRequestId(incomingRequestId);
  const path = normalizePath(req.originalUrl || req.url);

  request.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    const level = resolveLevel(res.statusCode);
    const userId = request.user?.sub;
    const role = request.user?.roles?.[0];
    const logPayload: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      level,
      requestId,
      method: req.method,
      path,
      statusCode: res.statusCode,
      durationMs,
    };

    if (userId) {
      logPayload.userId = userId;
      logPayload.role = role ?? null;
      logPayload.module = resolveModule(path);
      logPayload.event = `${req.method} ${path}`;
    }

    const serialized = JSON.stringify(logPayload);
    if (level === 'error') {
      console.error(serialized);
      return;
    }

    if (level === 'warn') {
      console.warn(serialized);
      return;
    }

    console.log(serialized);
  });

  next();
}
