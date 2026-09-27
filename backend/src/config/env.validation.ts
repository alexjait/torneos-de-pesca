type AppEnv = {
  NODE_ENV: string;
  PORT: number;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  AUTH_REFRESH_EXPIRES_IN: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  APP_BASE_URL: string;
  ALLOW_BOOTSTRAP_ADMIN: string;
  CORS_ALLOWED_ORIGINS: string[];
  TRUST_PROXY_HEADERS: string;
  MEDIA_STORAGE_DIR?: string;
};

function requireString(env: NodeJS.ProcessEnv, key: string) {
  const value = env[key];

  if (value === undefined || value.trim().length === 0) {
    throw new Error(`Falta la variable de entorno obligatoria ${key}`);
  }

  return value;
}

export function validateEnv(env: NodeJS.ProcessEnv): AppEnv {
  const nodeEnv = env.NODE_ENV?.trim() || 'development';
  const portRaw = env.PORT?.trim() || '3004';
  const port = Number(portRaw);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('PORT debe ser un entero positivo');
  }

  const databaseUrl = requireString(env, 'DATABASE_URL');
  const jwtSecret = requireString(env, 'JWT_SECRET');
  const jwtExpiresIn = env.JWT_EXPIRES_IN?.trim() || '8h';
  const authRefreshExpiresIn = requireString(env, 'AUTH_REFRESH_EXPIRES_IN');
  const appBaseUrl = requireString(env, 'APP_BASE_URL');
  const allowBootstrapAdmin = env.ALLOW_BOOTSTRAP_ADMIN?.trim() || 'false';
  const corsAllowedOriginsRaw =
    env.CORS_ALLOWED_ORIGINS?.trim() || 'http://localhost:3005';
  const trustProxyHeaders = env.TRUST_PROXY_HEADERS?.trim() || 'false';

  if (jwtSecret === 'local-dev-secret' || jwtSecret === 'change-me') {
    throw new Error(
      'JWT_SECRET no puede usar un valor inseguro por defecto. Genera uno nuevo.',
    );
  }

  if (!['true', 'false'].includes(allowBootstrapAdmin)) {
    throw new Error('ALLOW_BOOTSTRAP_ADMIN debe ser "true" o "false"');
  }

  if (!['true', 'false'].includes(trustProxyHeaders)) {
    throw new Error('TRUST_PROXY_HEADERS debe ser "true" o "false"');
  }

  const corsAllowedOrigins = corsAllowedOriginsRaw
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  if (corsAllowedOrigins.length === 0) {
    throw new Error('CORS_ALLOWED_ORIGINS debe incluir al menos un origen valido');
  }

  const resendApiKey = env.RESEND_API_KEY?.trim();
  const emailFrom = env.EMAIL_FROM?.trim();
  const mediaStorageDir = env.MEDIA_STORAGE_DIR?.trim();

  return {
    NODE_ENV: nodeEnv,
    PORT: port,
    DATABASE_URL: databaseUrl,
    JWT_SECRET: jwtSecret,
    JWT_EXPIRES_IN: jwtExpiresIn,
    AUTH_REFRESH_EXPIRES_IN: authRefreshExpiresIn,
    RESEND_API_KEY: resendApiKey || undefined,
    EMAIL_FROM: emailFrom || undefined,
    APP_BASE_URL: appBaseUrl,
    ALLOW_BOOTSTRAP_ADMIN: allowBootstrapAdmin,
    CORS_ALLOWED_ORIGINS: corsAllowedOrigins,
    TRUST_PROXY_HEADERS: trustProxyHeaders,
    MEDIA_STORAGE_DIR: mediaStorageDir || undefined,
  };
}
