import {
  ApiError,
  type AccountStatus,
  type ExportStatus,
  type RankingScope,
  type RegistrationChannel,
  type RegistrationNextAction,
  type RegistrationOperationalStatus,
  type ScoreAdjustmentStatus,
  type UserRole,
} from '@/lib/api';

export function accountStatusLabel(status: AccountStatus) {
  switch (status) {
    case 'PENDING_EMAIL_VERIFICATION':
      return 'Pendiente de activación';
    case 'ACTIVE':
      return 'Activa';
    case 'DISABLED':
      return 'Desactivada';
    default:
      return status;
  }
}

export function userRoleLabel(role: UserRole) {
  switch (role) {
    case 'ADMIN':
      return 'Administración';
    case 'PARTICIPANT':
      return 'Participante';
    case 'OFFICIAL':
      return 'Fiscal';
    default:
      return role;
  }
}

export function tournamentStatusLabel(status: string) {
  switch (status) {
    case 'DRAFT':
      return 'Borrador';
    case 'PUBLISHED':
      return 'Publicado';
    case 'ACTIVE':
    case 'OPEN':
      return 'Activo';
    case 'CLOSED':
      return 'Cerrado';
    default:
      return status;
  }
}

export function registrationStatusLabel(status: RegistrationOperationalStatus) {
  switch (status) {
    case 'PENDING_REVIEW':
      return 'Pendiente de revisión';
    case 'PENDING_ACCOUNT_ACTIVATION':
      return 'Pendiente de activación';
    case 'READY_TO_COMPETE':
      return 'Habilitada para competir';
    case 'REJECTED':
      return 'Rechazada';
    default:
      return status;
  }
}

export function registrationChannelLabel(channel: RegistrationChannel) {
  switch (channel) {
    case 'SELF_SERVICE':
      return 'Auto-registro';
    case 'ADMIN':
      return 'Carga administrativa';
    default:
      return channel;
  }
}

export function rankingScopeLabel(scope: RankingScope) {
  switch (scope) {
    case 'INDIVIDUAL':
      return 'Pescador';
    case 'TEAM':
      return 'Equipo';
    default:
      return scope;
  }
}

export function scoreAdjustmentStatusLabel(status: ScoreAdjustmentStatus) {
  switch (status) {
    case 'ACTIVE':
      return 'Activa';
    case 'REVOKED':
      return 'Revocada';
    default:
      return status;
  }
}

export function exportStatusLabel(status: ExportStatus) {
  switch (status) {
    case 'READY':
      return 'Lista';
    case 'FAILED':
      return 'Fallida';
    case 'PROCESSING':
      return 'En preparación';
    default:
      return status;
  }
}

export function registrationNextActionCopy(
  nextAction: RegistrationNextAction,
  status: RegistrationOperationalStatus,
) {
  if (status === 'PENDING_REVIEW') {
    return 'Ya recibimos tus datos. Cuando haya una definición, la vas a ver acá.';
  }

  switch (nextAction) {
    case 'ACTIVATE_ACCOUNT':
      return 'Para terminar, activá tu cuenta desde el email que te enviamos.';
    case 'CONTACT_ORGANIZATION':
      return 'Si necesitás más información, comunicate con la organización del torneo.';
    case 'READY_TO_COMPETE':
      return 'Quedó aprobada y habilitada para competir en este torneo.';
    default:
      return 'Te avisaremos cuando haya novedades sobre tu inscripción.';
  }
}

export function registrationStatusTitle(status: RegistrationOperationalStatus) {
  switch (status) {
    case 'PENDING_REVIEW':
      return 'Tu inscripción está en revisión';
    case 'PENDING_ACCOUNT_ACTIVATION':
      return 'Tu inscripción fue aprobada';
    case 'READY_TO_COMPETE':
      return 'Tu inscripción ya está lista';
    case 'REJECTED':
      return 'Tu inscripción no fue aprobada';
    default:
      return 'Estado de inscripción';
  }
}

export function toUserMessage(
  error: unknown,
  fallbackDescription = 'Revisá los datos e intentá nuevamente.',
) {
  if (!(error instanceof ApiError)) {
    return fallbackDescription;
  }

  const normalized = error.message.trim().toLowerCase();

  if (!normalized || normalized === 'internal server error') {
    return fallbackDescription;
  }

  if (normalized.includes('failed to fetch')) {
    return 'No pudimos conectarnos. Intentá nuevamente.';
  }

  if (
    normalized === 'unauthorized' ||
    normalized === 'forbidden' ||
    normalized.includes('no autorizado')
  ) {
    return fallbackDescription;
  }

  if (normalized.includes('solicitud pendiente') || normalized.includes('inscripcion aprobada')) {
    return 'Ya existe una inscripción para este torneo con estos datos.';
  }

  if (normalized.includes('torneo no esta habilitado')) {
    return 'Este torneo ya no acepta nuevas inscripciones.';
  }

  if (normalized.includes('inscripcion ya fue resuelta')) {
    return 'Esta inscripción ya fue resuelta desde otra sesión. Actualizá la bandeja para ver el estado actual.';
  }

  if (normalized.includes('codigo indicado')) {
    return 'Revisá el enlace o usá el código de consulta que recibiste al enviar la inscripción.';
  }

  if (error.status === 404) {
    return 'Esta sección todavía no está disponible.';
  }

  if (error.status === 409) {
    return 'La acción no se pudo completar con el estado actual.';
  }

  return error.message;
}
