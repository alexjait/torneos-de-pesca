'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { SortableTableHeader } from '@/components/sortable-table-header';
import { AdminDrawer, EmptyState, Field, Notice } from '@/components/ui';
import {
  api,
  ApiError,
  type Participant,
  type Registration,
  type RegistrationChannel,
  type RegistrationOperationalStatus,
  type RegistrationReviewStatus,
  type Tournament,
} from '@/lib/api';
import {
  accountStatusLabel,
  registrationChannelLabel,
  registrationNextActionCopy,
  registrationStatusLabel,
  registrationStatusTitle,
  toUserMessage,
  tournamentStatusLabel,
} from '@/lib/labels';
import { nextSortState, sortRows, type SortState } from '@/lib/table-sorting';

type RegistrationFeedback = {
  tone: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description: string;
} | null;

type RegistrationSortColumn = 'applicant' | 'tournament' | 'status' | 'channel' | 'updatedAt';

type SelfRegistrationForm = {
  tournamentId: string;
  firstName: string;
  lastName: string;
  documentId: string;
  email: string;
  phone: string;
  acceptedRules: boolean;
};

type SelfRegistrationErrors = Partial<Record<keyof SelfRegistrationForm, string>> & {
  form?: string;
};

type AdminRegistrationForm = {
  tournamentId: string;
  participantId: string;
  acceptedRules: boolean;
};

type AdminRegistrationErrors = Partial<Record<keyof AdminRegistrationForm, string>> & {
  form?: string;
};

type ResolutionDialogState =
  | { mode: 'approve'; registration: Registration }
  | { mode: 'reject'; registration: Registration }
  | null;

type RegistrationDrawerState =
  | { mode: 'create' }
  | { mode: 'detail'; registrationId: string }
  | null;

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
            <strong>Inscripción simple</strong>
            <span>Completá tus datos en una sola pantalla y seguí el estado sin iniciar sesión.</span>
          </div>
          <div className="hero-card">
            <strong>Seguimiento claro</strong>
            <span>Cada solicitud muestra su estado y el próximo paso con mensajes visibles.</span>
          </div>
          <div className="hero-card">
            <strong>Revisión ordenada</strong>
            <span>La organización resuelve cada inscripción desde una bandeja única.</span>
          </div>
        </div>
      </section>

      <section className="public-panel">{children}</section>
    </div>
  );
}

function useAccessToken() {
  const { accessToken } = useAuth();
  if (!accessToken) {
    throw new Error('No hay token de acceso disponible.');
  }
  return accessToken;
}

function useAutoDismissFeedback(
  feedback: RegistrationFeedback,
  onDismiss: () => void,
  persistentTone: 'error' | 'warning' = 'error',
) {
  useEffect(() => {
    if (!feedback || feedback.tone === persistentTone || feedback.tone === 'warning') {
      return;
    }

    const timeout = window.setTimeout(onDismiss, 5000);
    return () => window.clearTimeout(timeout);
  }, [feedback, onDismiss, persistentTone]);
}

function FeedbackToast({
  feedback,
  onDismiss,
}: {
  feedback: RegistrationFeedback;
  onDismiss: () => void;
}) {
  useAutoDismissFeedback(feedback, onDismiss);

  if (!feedback) {
    return null;
  }

  return (
    <div className="feedback-stack" aria-live="polite">
      <Notice
        tone={feedback.tone}
        title={feedback.title}
        description={feedback.description}
        onDismiss={onDismiss}
        className="notice-floating"
      />
    </div>
  );
}

function formatDate(date: string | null | undefined) {
  if (!date) {
    return 'Sin fecha';
  }

  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date));
}

function formatRelativeDate(date: string | null | undefined) {
  if (!date) {
    return 'Sin fecha';
  }

  const time = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
  const diff = new Date(date).getTime() - Date.now();
  const minutes = Math.round(diff / (1000 * 60));

  if (Math.abs(minutes) < 60) {
    return time.format(minutes, 'minute');
  }

  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) {
    return time.format(hours, 'hour');
  }

  const days = Math.round(hours / 24);
  return time.format(days, 'day');
}

function normalizeText(value: string | null | undefined) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function resultLabel(count: number, singular: string, plural = `${singular}s`) {
  return count === 1 ? `1 ${singular}` : `${count} ${plural}`;
}

function publicTournamentOptions(tournaments: Tournament[]) {
  return tournaments.filter((tournament) =>
    ['PUBLISHED', 'OPEN', 'ACTIVE'].includes(tournament.status),
  );
}

function availableAdminTournaments(tournaments: Tournament[]) {
  return tournaments.filter((tournament) => tournament.status !== 'CLOSED');
}

function getStatusTone(status: RegistrationOperationalStatus) {
  switch (status) {
    case 'READY_TO_COMPETE':
      return 'success';
    case 'REJECTED':
      return 'warning';
    case 'PENDING_ACCOUNT_ACTIVATION':
      return 'success';
    default:
      return 'info';
  }
}

function getStatusHelp(status: RegistrationOperationalStatus) {
  switch (status) {
    case 'PENDING_ACCOUNT_ACTIVATION':
      return 'Revisá también correo no deseado o spam.';
    case 'REJECTED':
      return 'Si necesitás más información, comunicate con la organización del torneo.';
    default:
      return null;
  }
}

function pageErrorMessage(error: unknown, fallback: string) {
  return toUserMessage(error, fallback);
}

function initialSelfRegistrationForm(): SelfRegistrationForm {
  return {
    tournamentId: '',
    firstName: '',
    lastName: '',
    documentId: '',
    email: '',
    phone: '',
    acceptedRules: false,
  };
}

function initialAdminRegistrationForm(): AdminRegistrationForm {
  return {
    tournamentId: '',
    participantId: '',
    acceptedRules: false,
  };
}

function validateAdminRegistration(form: AdminRegistrationForm) {
  const errors: AdminRegistrationErrors = {};

  if (!form.tournamentId) {
    errors.tournamentId = 'Seleccioná un torneo para continuar.';
  }
  if (!form.participantId) {
    errors.participantId = 'Seleccioná un participante para continuar.';
  }
  if (!form.acceptedRules) {
    errors.acceptedRules = 'Necesitás confirmar la aceptación del reglamento para crear la inscripción.';
  }

  if (Object.keys(errors).length > 0) {
    errors.form = 'Revisá los campos marcados para continuar.';
  }

  return errors;
}

function participantDisplayName(participant: Participant) {
  return `${participant.firstName} ${participant.lastName}`.trim();
}

function participantSecondaryText(participant: Participant) {
  const parts = [
    participant.user?.email?.trim() || '',
    participant.documentId?.trim() || '',
  ].filter(Boolean);

  return parts.join(' · ') || 'Sin email ni documento';
}

function adminRegistrationErrorMessage(error: unknown) {
  const fallback = 'Probá de nuevo. Si el problema sigue, actualizá la bandeja o revisá los datos.';

  if (!(error instanceof ApiError)) {
    return fallback;
  }

  if (error.status === 409) {
    const normalized = error.message.trim().toLowerCase();
    if (
      normalized.includes('resuelta') ||
      normalized.includes('review') ||
      normalized.includes('aprob')
    ) {
      return 'Esta inscripción ya existe o fue resuelta desde otra sesión. Actualizá la bandeja para ver el estado actual.';
    }

    return 'Ya existe una inscripción para este torneo y este participante.';
  }

  return pageErrorMessage(error, fallback);
}

function validateSelfRegistration(form: SelfRegistrationForm) {
  const errors: SelfRegistrationErrors = {};

  if (!form.tournamentId) {
    errors.tournamentId = 'Elegí un torneo para continuar.';
  }
  if (!form.firstName.trim()) {
    errors.firstName = 'Ingresá tu nombre.';
  }
  if (!form.lastName.trim()) {
    errors.lastName = 'Ingresá tu apellido.';
  }
  if (!form.email.trim()) {
    errors.email = 'Ingresá tu email.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = 'Ingresá un email válido.';
  }
  if (!form.acceptedRules) {
    errors.acceptedRules = 'Necesitás aceptar el reglamento para enviar la inscripción.';
  }

  if (Object.keys(errors).length > 0) {
    errors.form = 'Revisá los campos marcados para continuar.';
  }

  return errors;
}

function publicRegistrationUrl(lookupToken: string) {
  return `${window.location.origin}/autoregistro/estado/${lookupToken}`;
}

function statusBadge(status: RegistrationOperationalStatus) {
  return (
    <span className={`pill status-pill status-pill-${status.toLowerCase()}`}>
      {registrationStatusLabel(status)}
    </span>
  );
}

function EmptyMessage({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="table-empty-state">
      <strong>{title}</strong>
      <p className="muted">{description}</p>
      {action ? <div className="button-row">{action}</div> : null}
    </div>
  );
}

function RegistrationDetailContent({
  registration,
}: {
  registration: Registration;
}) {
  return (
    <div className="detail-panel-content registrations-detail-content">
      <div className="detail-panel-summary">
        <strong>
          {registration.applicant.firstName} {registration.applicant.lastName}
        </strong>
        <span className="muted">{registration.tournament.name}</span>
        <div className="status-row">
          {statusBadge(registration.operational_status)}
          <span className="pill">{registrationChannelLabel(registration.channel)}</span>
        </div>
      </div>

      <section className="detail-section">
        <h3>Datos del postulante</h3>
        <dl className="detail-grid">
          <div>
            <dt>Nombre</dt>
            <dd>{registration.applicant.firstName}</dd>
          </div>
          <div>
            <dt>Apellido</dt>
            <dd>{registration.applicant.lastName}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{registration.applicant.email || 'Sin dato'}</dd>
          </div>
          <div>
            <dt>Celular</dt>
            <dd>{registration.applicant.phone || 'Sin dato'}</dd>
          </div>
          <div>
            <dt>Documento</dt>
            <dd>{registration.applicant.documentId || 'Sin dato'}</dd>
          </div>
        </dl>
      </section>

      <section className="detail-section">
        <h3>Datos de la solicitud</h3>
        <dl className="detail-grid">
          <div>
            <dt>Torneo</dt>
            <dd>{registration.tournament.name}</dd>
          </div>
          <div>
            <dt>Canal</dt>
            <dd>{registrationChannelLabel(registration.channel)}</dd>
          </div>
          <div>
            <dt>Enviada</dt>
            <dd>{formatDate(registration.created_at)}</dd>
          </div>
          <div>
            <dt>Reglamento aceptado</dt>
            <dd>{formatDate(registration.accepted_rules_at)}</dd>
          </div>
          <div>
            <dt>Estado</dt>
            <dd>{registrationStatusLabel(registration.operational_status)}</dd>
          </div>
          <div>
            <dt>Próximo paso</dt>
            <dd>{registrationNextActionCopy(registration.next_action, registration.operational_status)}</dd>
          </div>
        </dl>
      </section>

      <section className="detail-section">
        <h3>Participante y cuenta</h3>
        {registration.participant ? (
          <dl className="detail-grid">
            <div>
              <dt>Participante vinculado</dt>
              <dd>
                {registration.participant.firstName} {registration.participant.lastName}
              </dd>
            </div>
            <div>
              <dt>Cuenta</dt>
              <dd>
                {registration.account_status
                  ? accountStatusLabel(registration.account_status)
                  : 'Sin cuenta vinculada'}
              </dd>
            </div>
            <div>
              <dt>Habilitación</dt>
              <dd>
                {registration.participant.enabledToCompete ? 'Habilitada para competir' : 'Pendiente'}
              </dd>
            </div>
          </dl>
        ) : (
          <EmptyState
            title="Todavía sin vínculo"
            description="La vinculación a participante y cuenta aparece cuando la inscripción se aprueba."
          />
        )}
      </section>

      {registration.review_status !== 'PENDING_REVIEW' ? (
        <section className="detail-section">
          <h3>Resolución</h3>
          <dl className="detail-grid">
            <div>
              <dt>Estado final</dt>
              <dd>{registrationStatusLabel(registration.operational_status)}</dd>
            </div>
            <div>
              <dt>Resuelta el</dt>
              <dd>{formatDate(registration.reviewed_at)}</dd>
            </div>
            <div>
              <dt>Resuelta por</dt>
              <dd>
                {registration.reviewed_by
                  ? `${registration.reviewed_by.firstName} ${registration.reviewed_by.lastName}`
                  : 'Sin dato'}
              </dd>
            </div>
            {registration.rejection_reason ? (
              <div className="detail-grid-span">
                <dt>Motivo informado</dt>
                <dd>{registration.rejection_reason}</dd>
              </div>
            ) : null}
          </dl>
        </section>
      ) : null}
    </div>
  );
}

function ResolutionDialog({
  state,
  busy,
  rejectionReason,
  onRejectionReasonChange,
  onClose,
  onConfirm,
}: {
  state: ResolutionDialogState;
  busy: boolean;
  rejectionReason: string;
  onRejectionReasonChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const titleRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    if (!state) {
      return;
    }

    titleRef.current?.focus();
  }, [state]);

  if (!state) {
    return null;
  }

  const isApprove = state.mode === 'approve';

  return (
    <div className="modal-backdrop" role="presentation">
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="registration-dialog-title"
      >
        <h3 id="registration-dialog-title" ref={titleRef} tabIndex={-1}>
          {isApprove ? 'Aprobar inscripción' : 'Rechazar inscripción'}
        </h3>
        <p className="muted">
          {isApprove
            ? 'La solicitud va a pasar a aprobada y, si hace falta, se va a preparar la activación de cuenta.'
            : 'Podés dejar un motivo breve para registrar el contexto interno y orientar el seguimiento del equipo.'}
        </p>
        {!isApprove ? (
          <Field label="Motivo del rechazo">
            <textarea
              value={rejectionReason}
              onChange={(event) => onRejectionReasonChange(event.target.value)}
              placeholder="Ejemplo: Falta validar un dato de contacto."
            />
          </Field>
        ) : null}
        <div className="button-row">
          <button type="button" className="button button-secondary" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button
            type="button"
            className={`button ${isApprove ? 'button-primary' : 'button-danger'}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy
              ? 'Procesando...'
              : isApprove
                ? 'Aprobar inscripción'
                : 'Rechazar inscripción'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function SelfRegistrationPage() {
  const router = useRouter();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [form, setForm] = useState<SelfRegistrationForm>(initialSelfRegistrationForm);
  const [errors, setErrors] = useState<SelfRegistrationErrors>({});
  const [success, setSuccess] = useState<{
    lookupToken: string;
    lookupUrl: string;
  } | null>(null);

  async function loadTournaments() {
    setLoading(true);
    setLoadError(null);

    try {
      const response = await api.listPublicTournaments();
      const enabledTournaments = publicTournamentOptions(response.data);
      setTournaments(enabledTournaments);
      setForm((current) => ({
        ...current,
        tournamentId:
          enabledTournaments.length === 1
            ? enabledTournaments[0].id
            : enabledTournaments.some((item) => item.id === current.tournamentId)
              ? current.tournamentId
              : '',
      }));
    } catch (error) {
      setLoadError(pageErrorMessage(error, 'Probá de nuevo en unos minutos.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTournaments();
  }, []);

  async function handleCopyLink() {
    if (!success) {
      return;
    }

    try {
      await navigator.clipboard.writeText(success.lookupUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationErrors = validateSelfRegistration(form);
    setErrors(validationErrors);
    setSubmitError(null);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setSubmitting(true);

    try {
      const response = await api.selfRegister({
        tournamentId: form.tournamentId,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        documentId: form.documentId.trim() || undefined,
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        acceptedRules: true,
      });

      setSuccess({
        lookupToken: response.data.lookup_token,
        lookupUrl: publicRegistrationUrl(response.data.lookup_token),
      });
    } catch (error) {
      setSubmitError(
        pageErrorMessage(error, 'Probá de nuevo. Si el problema sigue, comunicate con la organización.'),
      );
    } finally {
      setSubmitting(false);
    }
  }

  const oneTournament = tournaments.length === 1 ? tournaments[0] : null;
  const selectedTournament =
    tournaments.find((tournament) => tournament.id === form.tournamentId) ?? oneTournament ?? null;

  return (
    <PublicShell
      eyebrow="Auto-registro"
      title="Inscribite y seguí el estado de tu solicitud."
      description="Completá tus datos, aceptá el reglamento y guardá el código de consulta para revisar el avance."
    >
      <div className="surface section-stack public-form-surface">
        {loading ? (
          <Notice
            tone="info"
            title="Cargando inscripción"
            description="Estamos preparando los torneos disponibles y el formulario."
          />
        ) : loadError ? (
          <EmptyMessage
            title="No pudimos cargar la inscripción"
            description={loadError}
            action={
              <button type="button" className="button button-primary" onClick={loadTournaments}>
                Reintentar
              </button>
            }
          />
        ) : tournaments.length === 0 ? (
          <EmptyMessage
            title="Ahora no hay inscripciones abiertas"
            description="Cuando haya un torneo disponible, vas a poder inscribirte desde acá."
            action={
              <button type="button" className="button button-secondary" onClick={() => router.push('/login')}>
                Volver al inicio
              </button>
            }
          />
        ) : success ? (
          <div className="section-stack" aria-live="polite">
            <Notice
              tone="success"
              title="Recibimos tu inscripción"
              description="La organización la va a revisar antes de confirmarla."
            />
            <div className="content-card success-panel">
              <div className="section-stack">
                <div>
                  <h2>Código de consulta</h2>
                  <p className="muted">
                    Guardá este enlace o copiá el código. Lo vas a necesitar para seguir el estado.
                  </p>
                </div>
                <div className="lookup-code-box">
                  <strong>{success.lookupToken}</strong>
                </div>
                <div className="button-row">
                  <Link href={`/autoregistro/estado/${success.lookupToken}`} className="button button-primary">
                    Consultar estado
                  </Link>
                  <button type="button" className="button button-secondary" onClick={handleCopyLink}>
                    {copied ? 'Enlace copiado' : 'Copiar enlace'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div>
              <h2>Auto-registro</h2>
              <p>Completá los datos personales y enviá la inscripción para que la organización la revise.</p>
            </div>

            {errors.form ? (
              <Notice tone="warning" title="Revisá el formulario" description={errors.form} />
            ) : null}

            {submitError ? (
              <Notice
                tone="error"
                title="No pudimos enviar tu inscripción"
                description={submitError}
              />
            ) : null}

            <form className="form-stack" onSubmit={handleSubmit} noValidate>
              {oneTournament ? (
                <div className="content-card tournament-readonly">
                  <span className="admin-toolbar-label">Torneo</span>
                  <strong>{oneTournament.name}</strong>
                  <span className="muted">
                    {tournamentStatusLabel(oneTournament.status)} · {oneTournament.location}
                  </span>
                </div>
              ) : (
                <Field label="Torneo">
                  <select
                    value={form.tournamentId}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, tournamentId: event.target.value }))
                    }
                    aria-invalid={Boolean(errors.tournamentId)}
                  >
                    <option value="">Seleccionar torneo</option>
                    {tournaments.map((tournament) => (
                      <option key={tournament.id} value={tournament.id}>
                        {tournament.name}
                      </option>
                    ))}
                  </select>
                  {errors.tournamentId ? <span className="field-error">{errors.tournamentId}</span> : null}
                </Field>
              )}

              <div className="grid-2">
                <Field label="Nombre">
                  <input
                    value={form.firstName}
                    onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))}
                    aria-invalid={Boolean(errors.firstName)}
                  />
                  {errors.firstName ? <span className="field-error">{errors.firstName}</span> : null}
                </Field>
                <Field label="Apellido">
                  <input
                    value={form.lastName}
                    onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))}
                    aria-invalid={Boolean(errors.lastName)}
                  />
                  {errors.lastName ? <span className="field-error">{errors.lastName}</span> : null}
                </Field>
              </div>

              <div className="grid-2">
                <Field label="Documento">
                  <input
                    value={form.documentId}
                    onChange={(event) => setForm((current) => ({ ...current, documentId: event.target.value }))}
                  />
                </Field>
                <Field label="Celular">
                  <input
                    value={form.phone}
                    onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                  />
                </Field>
              </div>

              <Field label="Email">
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  aria-invalid={Boolean(errors.email)}
                />
                {errors.email ? <span className="field-error">{errors.email}</span> : null}
              </Field>

              <div className="rules-box">
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={form.acceptedRules}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, acceptedRules: event.target.checked }))
                    }
                    aria-invalid={Boolean(errors.acceptedRules)}
                  />
                  <span>
                    Acepto el reglamento del torneo.{' '}
                    <button
                      type="button"
                      className="inline-link-button"
                      onClick={() => setShowRules((current) => !current)}
                    >
                      {showRules ? 'Ocultar reglamento' : 'Leer reglamento'}
                    </button>
                  </span>
                </label>
                {showRules ? (
                  <div className="rules-summary-box">
                    <strong>Reglamento del torneo</strong>
                    <p className="muted">
                      {selectedTournament?.rulesSummary?.trim()
                        ? selectedTournament.rulesSummary
                        : 'La organizacion todavia no publico un resumen del reglamento para este torneo.'}
                    </p>
                  </div>
                ) : null}
                {errors.acceptedRules ? (
                  <span className="field-error">{errors.acceptedRules}</span>
                ) : null}
              </div>

              <div className="button-row">
                <button type="submit" className="button button-primary" disabled={submitting}>
                  {submitting ? 'Enviando inscripción...' : 'Enviar inscripción'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </PublicShell>
  );
}

export function PublicRegistrationStatusPage({
  lookupToken,
}: {
  lookupToken: string;
}) {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<Awaited<ReturnType<typeof api.getPublicRegistrationStatus>>['data'] | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  async function loadStatus() {
    setLoading(true);
    setError(null);

    try {
      const response = await api.getPublicRegistrationStatus(lookupToken);
      setStatus(response.data);
    } catch (loadFailure) {
      setStatus(null);
      setError(
        pageErrorMessage(
          loadFailure,
          'Revisá el enlace o usá el código de consulta que recibiste al enviar la inscripción.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStatus();
  }, [lookupToken]);

  return (
    <PublicShell
      eyebrow="Estado"
      title="Consultá el avance de tu inscripción."
      description="Con el enlace o el código de consulta podés revisar el estado sin iniciar sesión."
    >
      <div className="surface section-stack status-surface">
        {loading ? (
          <Notice
            tone="info"
            title="Consultando estado"
            description="Estamos verificando la inscripción."
          />
        ) : error || !status ? (
          <EmptyMessage
            title="No pudimos abrir esta consulta"
            description={error || 'Revisá el enlace o usá el código de consulta que recibiste al enviar la inscripción.'}
            action={
              <Link href="/autoregistro" className="button button-primary">
                Volver a auto-registro
              </Link>
            }
          />
        ) : (
          <div className="status-card">
            <span className="admin-toolbar-label">{status.tournamentName}</span>
            <div className="status-row">{statusBadge(status.operational_status)}</div>
            <h2>{registrationStatusTitle(status.operational_status)}</h2>
            <p>{registrationNextActionCopy(status.next_action, status.operational_status)}</p>
            {getStatusHelp(status.operational_status) ? (
              <Notice
                tone={getStatusTone(status.operational_status)}
                title="Próximo paso"
                description={getStatusHelp(status.operational_status) ?? ''}
              />
            ) : null}
            {status.rejection_reason ? (
              <div className="content-card rejection-box">
                <strong>Motivo informado por la organización</strong>
                <p className="muted">{status.rejection_reason}</p>
              </div>
            ) : null}
            <div className="button-row">
              <Link href="/autoregistro" className="button button-secondary">
                Volver a auto-registro
              </Link>
            </div>
          </div>
        )}
      </div>
    </PublicShell>
  );
}

export function AdminRegistrationsPage() {
  const accessToken = useAccessToken();
  const [feedback, setFeedback] = useState<RegistrationFeedback>(null);
  const [loading, setLoading] = useState(true);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Registration | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [sortState, setSortState] = useState<SortState<RegistrationSortColumn>>({
    column: 'updatedAt',
    direction: 'desc',
  });
  const [tournamentId, setTournamentId] = useState('');
  const [reviewStatus, setReviewStatus] = useState<RegistrationReviewStatus | ''>('PENDING_REVIEW');
  const [channel, setChannel] = useState<RegistrationChannel | ''>('');
  const [dialogState, setDialogState] = useState<ResolutionDialogState>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [drawerState, setDrawerState] = useState<RegistrationDrawerState>(null);
  const [createForm, setCreateForm] = useState<AdminRegistrationForm>(initialAdminRegistrationForm);
  const [createErrors, setCreateErrors] = useState<AdminRegistrationErrors>({});
  const [participantSearch, setParticipantSearch] = useState('');

  useAutoDismissFeedback(feedback, () => setFeedback(null));

  async function loadList(
    nextSelectedId?: string | null,
    filterOverrides?: Partial<{
      tournamentId: string;
      reviewStatus: RegistrationReviewStatus | '';
      channel: RegistrationChannel | '';
    }>,
  ) {
    const filters = {
      tournamentId,
      reviewStatus,
      channel,
      ...filterOverrides,
    };

    setLoading(true);

    try {
      const [registrationsResponse, tournamentsResponse, participantsResponse] = await Promise.all([
        api.listRegistrations(
          {
            tournamentId: filters.tournamentId || undefined,
            reviewStatus: filters.reviewStatus || undefined,
            channel: filters.channel || undefined,
          },
          accessToken,
        ),
        api.listTournaments(accessToken),
        api.listParticipants(accessToken),
      ]);

      setRegistrations(registrationsResponse.data);
      setTournaments(tournamentsResponse.data);
      setParticipants(participantsResponse.data);
      setSelectedId((current) => {
        if (nextSelectedId !== undefined) {
          return nextSelectedId;
        }
        const preferred = current ?? registrationsResponse.data[0]?.id ?? null;
        return registrationsResponse.data.some((item) => item.id === preferred)
          ? preferred
          : registrationsResponse.data[0]?.id ?? null;
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        title: 'No pudimos cargar las inscripciones',
        description: pageErrorMessage(error, 'Actualizá la bandeja o probá de nuevo en unos minutos.'),
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadList();
  }, [accessToken, tournamentId, reviewStatus, channel]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }

    setDetailLoading(true);
    api
      .getRegistration(selectedId, accessToken)
      .then((response) => setDetail(response.data))
      .catch((error) => {
        setDetail(null);
        setFeedback({
          tone: 'error',
          title: 'No pudimos cargar el detalle',
          description: pageErrorMessage(error, 'Actualizá la bandeja e intentá de nuevo.'),
        });
      })
      .finally(() => setDetailLoading(false));
  }, [accessToken, selectedId]);

  const filteredRegistrations = useMemo(
    () =>
      registrations.filter((registration) =>
        [
          `${registration.applicant.firstName} ${registration.applicant.lastName}`,
          registration.applicant.email,
          registration.tournament.name,
          registrationStatusLabel(registration.operational_status),
          registrationChannelLabel(registration.channel),
        ].some((value) => normalizeText(value).includes(normalizeText(search))),
      ),
    [registrations, search],
  );
  const sortedRegistrations = useMemo(
    () =>
      sortRows(filteredRegistrations, sortState, (registration, column) => {
        switch (column) {
          case 'applicant':
            return `${registration.applicant.firstName} ${registration.applicant.lastName}`;
          case 'tournament':
            return registration.tournament.name;
          case 'status':
            return registrationStatusLabel(registration.operational_status);
          case 'channel':
            return registrationChannelLabel(registration.channel);
          case 'updatedAt':
            return registration.updated_at;
        }
      }),
    [filteredRegistrations, sortState],
  );

  function requestSort(column: RegistrationSortColumn) {
    setSortState((current) => nextSortState(current, column));
  }

  const adminTournaments = useMemo(() => availableAdminTournaments(tournaments), [tournaments]);

  const filteredParticipants = useMemo(
    () =>
      participants.filter((participant) =>
        [
          participantDisplayName(participant),
          participant.user?.email,
          participant.documentId,
        ].some((value) => normalizeText(value).includes(normalizeText(participantSearch))),
      ),
    [participantSearch, participants],
  );

  const selectedRegistration =
    detail && filteredRegistrations.some((item) => item.id === detail.id)
      ? detail
      : filteredRegistrations.find((item) => item.id === selectedId) ?? detail;

  const selectedParticipant =
    participants.find((participant) => participant.id === createForm.participantId) ?? null;

  function resetCreateState() {
    setCreateForm({
      tournamentId: adminTournaments.length === 1 ? adminTournaments[0].id : '',
      participantId: '',
      acceptedRules: false,
    });
    setCreateErrors({});
    setParticipantSearch('');
  }

  function openCreateDrawer() {
    resetCreateState();
    setDrawerState({ mode: 'create' });
  }

  function openDetail(registrationId: string) {
    setSelectedId(registrationId);
    setDrawerState({ mode: 'detail', registrationId });
  }

  function closeDrawer() {
    setDrawerState(null);
  }

  function closeDialog() {
    setDialogState(null);
    setRejectionReason('');
  }

  async function handleCreateRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationErrors = validateAdminRegistration(createForm);
    setCreateErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setBusy(true);

    try {
      const response = await api.createRegistration(
        {
          tournamentId: createForm.tournamentId,
          participantId: createForm.participantId,
          acceptedRules: true,
        },
        accessToken,
      );
      const created = response.data;
      const nextFilters = {
        tournamentId: created.tournament.id,
        reviewStatus: '' as const,
        channel: 'ADMIN' as const,
      };

      setFeedback({
        tone: created.operational_status === 'PENDING_ACCOUNT_ACTIVATION' ? 'warning' : 'success',
        title: 'Inscripción creada',
        description:
          created.operational_status === 'PENDING_ACCOUNT_ACTIVATION'
            ? 'Inscripción creada. Falta que active su cuenta desde el email.'
            : 'Inscripción creada. Ya quedó habilitada para competir.',
      });

      setSearch('');
      setTournamentId(nextFilters.tournamentId);
      setReviewStatus(nextFilters.reviewStatus);
      setChannel(nextFilters.channel);
      setSelectedId(created.id);
      setDrawerState({ mode: 'detail', registrationId: created.id });
      await loadList(created.id, nextFilters);
    } catch (error) {
      setFeedback({
        tone: 'error',
        title: 'No pudimos crear la inscripción',
        description: adminRegistrationErrorMessage(error),
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleResolve() {
    if (!dialogState) {
      return;
    }

    setBusy(true);

    try {
      let resolved: Registration;
      if (dialogState.mode === 'approve') {
        const response = await api.approveRegistration(dialogState.registration.id, undefined, accessToken);
        resolved = response.data;
        setFeedback({
          tone: 'success',
          title: 'Inscripción aprobada',
          description:
            resolved.operational_status === 'PENDING_ACCOUNT_ACTIVATION'
              ? 'Inscripción aprobada. Falta que active su cuenta desde el email.'
              : 'Inscripción aprobada. Ya quedó habilitada para competir.',
        });
      } else {
        const response = await api.rejectRegistration(
          dialogState.registration.id,
          rejectionReason.trim() || undefined,
          accessToken,
        );
        resolved = response.data;
        setFeedback({
          tone: 'success',
          title: 'Inscripción rechazada',
          description: 'Inscripción rechazada. El estado ya quedó actualizado.',
        });
      }

      closeDialog();
      setDrawerState(null);

      const nextList = registrations.filter((item) => item.id !== resolved.id);
      const nextPendingId =
        reviewStatus === 'PENDING_REVIEW'
          ? nextList.find((item) => item.review_status === 'PENDING_REVIEW')?.id ?? null
          : resolved.id;
      await loadList(nextPendingId);
    } catch (error) {
      setFeedback({
        tone: 'error',
        title: 'No pudimos actualizar la inscripción',
        description: pageErrorMessage(error, 'Actualizá la bandeja e intentá de nuevo.'),
      });
    } finally {
      setBusy(false);
    }
  }

  const detailFooter =
    drawerState?.mode === 'detail' && selectedRegistration?.review_status === 'PENDING_REVIEW' ? (
      <div className="button-row registrations-detail-actions">
        <button
          type="button"
          className="button button-primary"
          onClick={() => setDialogState({ mode: 'approve', registration: selectedRegistration })}
          disabled={busy}
        >
          Aprobar inscripción
        </button>
        <button
          type="button"
          className="button button-danger"
          onClick={() => setDialogState({ mode: 'reject', registration: selectedRegistration })}
          disabled={busy}
        >
          Rechazar inscripción
        </button>
      </div>
    ) : drawerState?.mode === 'create' ? (
      <div className="button-row registrations-detail-actions">
        <button
          type="submit"
          form="admin-registration-form"
          className="button button-primary"
          disabled={busy || adminTournaments.length === 0 || participants.length === 0}
        >
          {busy ? 'Guardando...' : 'Crear inscripción'}
        </button>
        <button type="button" className="button button-secondary" onClick={closeDrawer} disabled={busy}>
          Cancelar
        </button>
      </div>
    ) : null;

  return (
    <div className="section-stack">
      <header className="page-header">
        <div>
          <h1>Inscripciones</h1>
          <p>Revisá solicitudes, confirmá el estado y seguí las pendientes desde un solo lugar.</p>
        </div>
        <div className="page-header-actions">
          <button type="button" className="button button-primary" onClick={openCreateDrawer}>
            Nueva inscripción
          </button>
          <button type="button" className="button button-secondary" onClick={() => loadList(selectedId)}>
            Actualizar
          </button>
        </div>
      </header>

      <FeedbackToast feedback={feedback} onDismiss={() => setFeedback(null)} />

      <section className="admin-toolbar registrations-toolbar">
        <div className="admin-toolbar-search">
          <label htmlFor="registration-search" className="admin-toolbar-label">
            Buscar
          </label>
          <input
            id="registration-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nombre o email"
          />
        </div>
        <div className="toolbar-filters">
          <Field label="Torneo">
            <select value={tournamentId} onChange={(event) => setTournamentId(event.target.value)}>
              <option value="">Todos</option>
              {tournaments.map((tournament) => (
                <option key={tournament.id} value={tournament.id}>
                  {tournament.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Estado">
            <select
              value={reviewStatus}
              onChange={(event) =>
                setReviewStatus((event.target.value as RegistrationReviewStatus | '') || '')
              }
            >
              <option value="">Todos</option>
              <option value="PENDING_REVIEW">Pendiente de revisión</option>
              <option value="APPROVED">Aprobada</option>
              <option value="REJECTED">Rechazada</option>
            </select>
          </Field>
          <Field label="Canal">
            <select value={channel} onChange={(event) => setChannel((event.target.value as RegistrationChannel | '') || '')}>
              <option value="">Todos</option>
              <option value="SELF_SERVICE">Auto-registro</option>
              <option value="ADMIN">Carga administrativa</option>
            </select>
          </Field>
        </div>
        <div className="admin-toolbar-meta">
          <span className="admin-results-count">
            {resultLabel(filteredRegistrations.length, 'inscripción', 'inscripciones')}
          </span>
        </div>
      </section>

        <section className="content-card">
          <div className="section-heading">
            <h3>Listado</h3>
          </div>

          {loading ? (
            <Notice
              tone="info"
              title="Cargando inscripciones"
              description="Estamos trayendo solicitudes, torneos y estados."
            />
          ) : registrations.length === 0 ? (
            <EmptyMessage
              title={
                reviewStatus === 'PENDING_REVIEW'
                  ? 'No hay pendientes para revisar'
                  : 'Todavía no hay inscripciones'
              }
              description={
                reviewStatus === 'PENDING_REVIEW'
                  ? 'Las nuevas solicitudes van a aparecer en esta bandeja.'
                  : 'Cuando entren solicitudes o se creen inscripciones administrativas, las vas a ver acá.'
              }
            />
          ) : filteredRegistrations.length === 0 ? (
            <EmptyMessage
              title="No encontramos resultados"
              description="No encontramos resultados para esa búsqueda o filtros."
            />
          ) : (
            <>
              <div className="table-wrap registrations-table desktop-only">
                <table className="data-table">
                  <thead>
                    <tr>
                      <SortableTableHeader column="applicant" label="Postulante" state={sortState} onSort={requestSort} />
                      <SortableTableHeader column="tournament" label="Torneo" state={sortState} onSort={requestSort} />
                      <SortableTableHeader column="status" label="Estado" state={sortState} onSort={requestSort} />
                      <SortableTableHeader column="channel" label="Canal" state={sortState} onSort={requestSort} />
                      <SortableTableHeader column="updatedAt" label="Última actualización" state={sortState} onSort={requestSort} />
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRegistrations.map((registration) => (
                      <tr
                        key={registration.id}
                        className={selectedRegistration?.id === registration.id ? 'is-selected' : ''}
                      >
                        <td>
                          <button
                            type="button"
                            className="table-row-trigger"
                            onClick={() => openDetail(registration.id)}
                          >
                            <strong>
                              {registration.applicant.firstName} {registration.applicant.lastName}
                            </strong>
                            <span className="muted">{registration.applicant.email || 'Sin email'}</span>
                          </button>
                        </td>
                        <td>{registration.tournament.name}</td>
                        <td>{statusBadge(registration.operational_status)}</td>
                        <td>{registrationChannelLabel(registration.channel)}</td>
                        <td>{formatDate(registration.updated_at)}</td>
                        <td>
                          <button
                            type="button"
                            className="button button-secondary"
                            onClick={() => openDetail(registration.id)}
                          >
                            Ver detalle
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mobile-only registrations-mobile-list">
                {sortedRegistrations.map((registration) => (
                  <article key={registration.id} className="registration-card">
                    <div className="section-stack">
                      <div>
                        <strong>
                          {registration.applicant.firstName} {registration.applicant.lastName}
                        </strong>
                        <p className="muted">{registration.tournament.name}</p>
                      </div>
                      <div className="status-row">
                        {statusBadge(registration.operational_status)}
                        <span className="pill">{registrationChannelLabel(registration.channel)}</span>
                      </div>
                      <span className="muted">{formatRelativeDate(registration.updated_at)}</span>
                      <button
                        type="button"
                        className="button button-secondary"
                        onClick={() => openDetail(registration.id)}
                      >
                        Ver detalle
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>


      <AdminDrawer
        open={Boolean(drawerState)}
        title={
          drawerState?.mode === 'create'
            ? 'Nueva inscripción'
            : selectedRegistration
              ? `${selectedRegistration.applicant.firstName} ${selectedRegistration.applicant.lastName}`
              : 'Detalle'
        }
        description={
          drawerState?.mode === 'create'
            ? 'Seleccioná un torneo, elegí un participante existente y confirmá el reglamento.'
            : selectedRegistration?.tournament.name
        }
        onClose={closeDrawer}
        footer={detailFooter}
        size="wide"
      >
        {drawerState?.mode === 'create' ? (
          <form id="admin-registration-form" className="form-stack" onSubmit={handleCreateRegistration}>
            {createErrors.form ? (
              <Notice
                tone="error"
                title="Revisá el formulario"
                description={createErrors.form}
              />
            ) : null}

            {adminTournaments.length === 0 ? (
              <EmptyState
                title="No hay torneos disponibles"
                description="Creá o publicá un torneo para poder registrar inscripciones administrativas."
              />
            ) : participants.length === 0 ? (
              <EmptyState
                title="No hay participantes disponibles"
                description="Necesitás tener al menos un participante creado antes de registrar la inscripción."
              />
            ) : (
              <>
                <Field label="Torneo">
                  <>
                    <select
                      value={createForm.tournamentId}
                      onChange={(event) => {
                        setCreateForm((current) => ({ ...current, tournamentId: event.target.value }));
                        setCreateErrors((current) => ({ ...current, tournamentId: undefined, form: undefined }));
                      }}
                      aria-invalid={Boolean(createErrors.tournamentId)}
                    >
                      <option value="">Seleccionar torneo</option>
                      {adminTournaments.map((tournament) => (
                        <option key={tournament.id} value={tournament.id}>
                          {tournament.name} - {tournamentStatusLabel(tournament.status)}
                        </option>
                      ))}
                    </select>
                    {createErrors.tournamentId ? (
                      <span className="field-error">{createErrors.tournamentId}</span>
                    ) : null}
                  </>
                </Field>

                <Field label="Buscar participante">
                  <input
                    type="search"
                    value={participantSearch}
                    onChange={(event) => setParticipantSearch(event.target.value)}
                    placeholder="Buscar por nombre, email o documento"
                  />
                </Field>

                <Field label="Participante">
                  <>
                    <select
                      value={createForm.participantId}
                      onChange={(event) => {
                        setCreateForm((current) => ({ ...current, participantId: event.target.value }));
                        setCreateErrors((current) => ({ ...current, participantId: undefined, form: undefined }));
                      }}
                      aria-invalid={Boolean(createErrors.participantId)}
                    >
                      <option value="">Seleccionar participante</option>
                      {filteredParticipants.map((participant) => (
                        <option key={participant.id} value={participant.id}>
                          {participantDisplayName(participant)} - {participantSecondaryText(participant)}
                        </option>
                      ))}
                    </select>
                    {createErrors.participantId ? (
                      <span className="field-error">{createErrors.participantId}</span>
                    ) : null}
                  </>
                </Field>

                {filteredParticipants.length === 0 ? (
                  <Notice
                    tone="info"
                    title="No encontramos participantes"
                    description="Probá con otro nombre, email o documento para continuar."
                  />
                ) : null}

                {selectedParticipant ? (
                  <div className="content-card registration-summary-card">
                    <div className="section-heading">
                      <h3>Participante seleccionado</h3>
                    </div>
                    <dl className="detail-grid">
                      <div>
                        <dt>Nombre</dt>
                        <dd>{participantDisplayName(selectedParticipant)}</dd>
                      </div>
                      <div>
                        <dt>Email</dt>
                        <dd>{selectedParticipant.user?.email || 'Sin dato'}</dd>
                      </div>
                      <div>
                        <dt>Documento</dt>
                        <dd>{selectedParticipant.documentId || 'Sin dato'}</dd>
                      </div>
                      <div>
                        <dt>Cuenta</dt>
                        <dd>
                          {selectedParticipant.user?.accountStatus
                            ? accountStatusLabel(selectedParticipant.user.accountStatus)
                            : 'Sin cuenta vinculada'}
                        </dd>
                      </div>
                    </dl>
                  </div>
                ) : null}

                <div className="field field-checkbox">
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={createForm.acceptedRules}
                      onChange={(event) => {
                        setCreateForm((current) => ({ ...current, acceptedRules: event.target.checked }));
                        setCreateErrors((current) => ({ ...current, acceptedRules: undefined, form: undefined }));
                      }}
                      aria-invalid={Boolean(createErrors.acceptedRules)}
                    />
                    <span>Confirmo la aceptación del reglamento para esta inscripción.</span>
                  </label>
                  {createErrors.acceptedRules ? (
                    <span className="field-error">{createErrors.acceptedRules}</span>
                  ) : null}
                </div>
              </>
            )}
          </form>
        ) : detailLoading && (!selectedRegistration || selectedRegistration.id !== selectedId) ? (
          <Notice
            tone="info"
            title="Cargando detalle"
            description="Estamos trayendo la información completa de la inscripción."
          />
        ) : selectedRegistration ? (
          <RegistrationDetailContent registration={selectedRegistration} />
        ) : (
          <EmptyState
            title="Sin inscripción seleccionada"
            description="Volvé al listado y elegí una solicitud."
          />
        )}
      </AdminDrawer>

      <ResolutionDialog
        state={dialogState}
        busy={busy}
        rejectionReason={rejectionReason}
        onRejectionReasonChange={setRejectionReason}
        onClose={closeDialog}
        onConfirm={handleResolve}
      />
    </div>
  );
}
