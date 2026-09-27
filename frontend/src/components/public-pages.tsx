'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Notice, Field } from '@/components/ui';
import { api, ApiError } from '@/lib/api';

function PublicShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="public-shell app-shell">
      <section className="public-hero">
        <div>
          <span className="hero-kicker">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>

        <div className="hero-grid">
          <div className="hero-card">
            <strong>Acceso seguro</strong>
            <span>Cada cuenta se activa por correo antes de ingresar.</span>
          </div>
          <div className="hero-card">
            <strong>Todo en un solo lugar</strong>
            <span>Cargá inscripciones, coordiná a los fiscales y llevá el torneo completo desde un solo lugar.</span>
          </div>
          <div className="hero-card">
            <strong>Guía paso a paso</strong>
            <span>Cada paso te guía con avisos simples para que nunca te quedes trabado.</span>
          </div>
        </div>
      </section>

      <section className="public-panel">{children}</section>
    </div>
  );
}

export function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { login, isReady, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [requestEmail, setRequestEmail] = useState('');
  const [uiState, setUiState] = useState<'idle' | 'loading' | 'success' | 'error' | 'pending'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady || !user) {
      return;
    }

    if (user.roles.includes('ADMIN')) {
      router.replace('/admin');
      return;
    }

    if (user.roles.includes('OFFICIAL')) {
      router.replace('/operacion');
    }
  }, [isReady, router, user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUiState('loading');
    setMessage(null);

    try {
      const session = await login(email, password);

      if (session.user.roles.includes('OFFICIAL')) {
        setUiState('success');
        router.replace('/operacion');
        return;
      }

      if (!session.user.roles.includes('ADMIN')) {
        setUiState('error');
        setMessage('Tu cuenta ingresó correctamente, pero esta web todavía no incluye ese perfil.');
        return;
      }

      setUiState('success');
      router.replace('/admin');
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError.message.includes('no esta activa') || apiError.message.includes('no está activa')) {
        setUiState('pending');
        setMessage('Tu cuenta todavía no está activada. Revisá tu correo o pedí un nuevo enlace.');
        setRequestEmail(email);
        return;
      }

      setUiState('error');
      setMessage(apiError.message || 'No pudimos iniciar sesión. Revisá tus datos.');
    }
  }

  async function handleRequestPasswordSetup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUiState('loading');
    setMessage(null);

    try {
      await api.requestPasswordSetup(requestEmail);
      setUiState('success');
      setMessage('Si la cuenta existe, enviamos un nuevo enlace para activar el acceso.');
    } catch (error) {
      setUiState('error');
      setMessage((error as ApiError).message);
    }
  }

  return (
    <PublicShell
      eyebrow="Acceso"
      title="Entrá y seguí con la organización del torneo."
      description="Organizá el torneo desde un solo lugar: cargá inscripciones, coordiná a los fiscales y llevá los resultados."
    >
      <div className="surface section-stack">
        <div>
          <h2>Iniciar sesión</h2>
          <p>
            Ingresá con tu correo y tu contraseña. Si tu cuenta todavía no está activa, desde acá
            mismo podés pedir un nuevo enlace.
          </p>
        </div>

        {params.get('unauthorized') ? (
          <Notice
            tone="warning"
            title="Perfil todavía no disponible"
            description="Esta web hoy cubre la administración. El acceso operativo para fiscales llegará más adelante."
          />
        ) : null}

        {message ? (
          <Notice
            tone={
              uiState === 'error'
                ? 'error'
                : uiState === 'pending'
                  ? 'warning'
                  : uiState === 'success'
                    ? 'success'
                    : 'info'
            }
            title={
              uiState === 'pending'
                ? 'Cuenta pendiente de activación'
                : uiState === 'success'
                  ? 'Listo'
                  : uiState === 'error'
                    ? 'No pudimos ingresar'
                    : 'Información'
            }
            description={message}
          />
        ) : null}

        <form className="form-stack" onSubmit={handleSubmit}>
          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="organizacion@torneo.com"
              autoComplete="email"
              required
            />
          </Field>

          <Field label="Contraseña">
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="********"
              autoComplete="current-password"
              required
            />
          </Field>

          <div className="button-row">
            <button type="submit" className="button button-primary" disabled={uiState === 'loading'}>
              {uiState === 'loading' ? 'Ingresando...' : 'Ingresar'}
            </button>
          </div>
        </form>

        <div className="content-card">
          <h3>¿La cuenta sigue pendiente?</h3>
          <p className="muted">
            Si ya te dieron de alta, podés pedir un nuevo enlace desde esta misma pantalla.
          </p>
          <form className="form-stack" onSubmit={handleRequestPasswordSetup}>
            <Field label="Email de la cuenta">
              <input
                type="email"
                value={requestEmail}
                onChange={(event) => setRequestEmail(event.target.value)}
                placeholder="tu-email@dominio.com"
                autoComplete="email"
                required
              />
            </Field>
            <div className="button-row">
              <button type="submit" className="button button-secondary" disabled={uiState === 'loading'}>
                Reenviar enlace de activación
              </button>
            </div>
          </form>
        </div>
      </div>
    </PublicShell>
  );
}

export function ActivationPage() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token') ?? '';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [uiState, setUiState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  async function handleActivation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      setUiState('error');
      setMessage('Falta el enlace de activación. Revisá el correo recibido.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setUiState('error');
      setMessage('Las contraseñas no coinciden. Revisalas antes de continuar.');
      return;
    }

    setUiState('loading');
    setMessage(null);

    try {
      await api.activateAccount(token, newPassword);
      setUiState('success');
      setMessage('Tu cuenta fue activada correctamente. Ya podés iniciar sesión.');
      setTimeout(() => router.push('/login'), 1500);
    } catch (error) {
      setUiState('error');
      setMessage((error as ApiError).message);
    }
  }

  async function handleRequestNewLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUiState('loading');
    setMessage(null);

    try {
      await api.requestPasswordSetup(email);
      setUiState('success');
      setMessage('Si la cuenta existe, enviamos un nuevo enlace para continuar la activación.');
    } catch (error) {
      setUiState('error');
      setMessage((error as ApiError).message);
    }
  }

  return (
    <PublicShell
      eyebrow="Activación"
      title="Activá tu cuenta y definí tu contraseña."
      description="El acceso queda habilitado cuando completás este paso desde el enlace recibido por correo."
    >
      <div className="surface section-stack">
        <div>
          <h2>Activar cuenta</h2>
          <p>
            Definí una contraseña nueva para terminar la activación. Si el enlace ya no funciona,
            podés pedir otro desde abajo.
          </p>
        </div>

        {message ? (
          <Notice
            tone={uiState === 'success' ? 'success' : uiState === 'error' ? 'error' : 'info'}
            title={uiState === 'success' ? 'Activación completada' : 'Estado del enlace'}
            description={message}
          />
        ) : null}

        <form className="form-stack" onSubmit={handleActivation}>
          <Field label="Enlace recibido" help="Este código llega cargado desde el correo de activación.">
            <input type="text" value={token} readOnly />
          </Field>

          <div className="grid-2">
            <Field label="Nueva contraseña">
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                minLength={8}
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
                required
              />
            </Field>
            <Field label="Repetir contraseña">
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={8}
                placeholder="Repetí la contraseña"
                autoComplete="new-password"
                required
              />
            </Field>
          </div>

          <div className="button-row">
            <button type="submit" className="button button-primary" disabled={uiState === 'loading'}>
              {uiState === 'loading' ? 'Activando...' : 'Activar cuenta'}
            </button>
            <button type="button" className="button button-secondary" onClick={() => router.push('/login')}>
              Volver al inicio
            </button>
          </div>
        </form>

        <div className="content-card">
          <h3>¿El enlace venció?</h3>
          <p className="muted">
            Ingresá el email de la cuenta para pedir otro enlace. La respuesta se mantiene general
            para cuidar la seguridad.
          </p>
          <form className="form-stack" onSubmit={handleRequestNewLink}>
            <Field label="Email de la cuenta">
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="cuenta@dominio.com"
                autoComplete="email"
                required
              />
            </Field>
            <div className="button-row">
              <button type="submit" className="button button-secondary" disabled={uiState === 'loading'}>
                Solicitar nuevo enlace
              </button>
            </div>
          </form>
        </div>
      </div>
    </PublicShell>
  );
}
