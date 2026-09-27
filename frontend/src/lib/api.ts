'use client';

export type AccountStatus =
  | 'PENDING_EMAIL_VERIFICATION'
  | 'ACTIVE'
  | 'DISABLED';

export type UserRole = 'ADMIN' | 'PARTICIPANT' | 'OFFICIAL';

export type SessionUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: UserRole[];
  accountStatus: AccountStatus;
};

export type SessionPayload = {
  accessToken: string;
  user: SessionUser;
};

export type Tournament = {
  id: string;
  name: string;
  eventDate: string;
  location: string;
  status: string;
  rulesSummary?: string | null;
  scoringConfig?: unknown;
  schedules?: TournamentSchedule[];
};

export type TournamentSchedule = {
  id: string;
  startAt?: string | null;
  fishingStartAt?: string | null;
  fishingEndAt?: string | null;
  validationDeadlineAt?: string | null;
};

export type SafeUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  accountStatus: AccountStatus;
};

export type Participant = {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  documentId?: string | null;
  enabledToCompete: boolean;
  user?: SafeUser | null;
  teamLinks: { id: string; teamId: string; team?: Team }[];
  boatLinks: { id: string; boatId: string }[];
};

export type Team = {
  id: string;
  name: string;
};

export type Boat = {
  id: string;
  name: string;
  registrationNumber?: string | null;
};

export type OfficialAssignment = {
  id: string;
  tournamentId: string;
  tournament: Tournament;
};

export type Official = {
  id: string;
  documentId: string;
  user: SafeUser;
  tournamentAssignments: OfficialAssignment[];
};

export type CaptureStatus =
  | 'PENDING_VALIDATION'
  | 'APPROVED'
  | 'OBSERVED'
  | 'REJECTED';

export type CaptureSyncStatus = 'ONLINE' | 'SYNCED';

export type CaptureValidationAction = 'APPROVE' | 'OBSERVE' | 'REJECT';

export type CaptureMedia = {
  id: string;
  original_name: string;
  mime_type: string;
  size: number;
  uploaded_at: string;
  download_path: string;
};

export type CaptureValidation = {
  id: string;
  action: CaptureValidationAction;
  reason?: string | null;
  validated_at: string;
  validated_by: SafeUser;
};

export type Capture = {
  id: string;
  tournament: Pick<Tournament, 'id' | 'name' | 'status'> & { schedules?: TournamentSchedule[] };
  participant: Participant;
  team?: Team | null;
  official: {
    id: string;
    documentId: string;
    user: SafeUser;
  };
  species: string;
  length: number;
  captured_at: string;
  recorded_at: string;
  device_recorded_at?: string | null;
  synced_at?: string | null;
  gps?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  } | null;
  observation?: string | null;
  status: CaptureStatus;
  sync_status: CaptureSyncStatus;
  media: CaptureMedia[];
  validations: CaptureValidation[];
  created_at: string;
  updated_at: string;
};

export type OfficialContextTournament = Pick<
  Tournament,
  'id' | 'name' | 'eventDate' | 'location' | 'status'
> & {
  schedules?: TournamentSchedule[];
  participants: Participant[];
};

export type OfficialCaptureContext = {
  tournaments: OfficialContextTournament[];
};

export type CaptureMediaPayload = {
  originalName: string;
  mimeType: string;
  dataUrl: string;
};

export type CapturePayload = {
  clientCaptureId: string;
  tournamentId: string;
  participantId: string;
  teamId?: string;
  species: string;
  length: number;
  capturedAt?: string;
  gps?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  observation?: string;
  media: CaptureMediaPayload;
};

export type SyncCapturePayload = CapturePayload & {
  capturedAt: string;
  deviceRecordedAt: string;
};

export type CaptureUpdatePayload = {
  participantId?: string;
  teamId?: string;
  species?: string;
  length?: number;
  capturedAt?: string;
  gps?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  observation?: string;
  media?: CaptureMediaPayload;
};

export type RegistrationReviewStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';

export type RegistrationOperationalStatus =
  | 'PENDING_REVIEW'
  | 'PENDING_ACCOUNT_ACTIVATION'
  | 'READY_TO_COMPETE'
  | 'REJECTED';

export type RegistrationChannel = 'SELF_SERVICE' | 'ADMIN';

export type RegistrationNextAction =
  | 'WAIT_REVIEW'
  | 'ACTIVATE_ACCOUNT'
  | 'CONTACT_ORGANIZATION'
  | 'READY_TO_COMPETE';

export type RegistrationApplicant = {
  firstName: string;
  lastName: string;
  documentId?: string | null;
  email?: string | null;
  phone?: string | null;
};

export type Registration = {
  id: string;
  tournament: Pick<Tournament, 'id' | 'name' | 'status'>;
  participant: Participant | null;
  channel: RegistrationChannel;
  review_status: RegistrationReviewStatus;
  operational_status: RegistrationOperationalStatus;
  applicant: RegistrationApplicant;
  accepted_rules_at: string;
  accepted_rules_snapshot?: unknown;
  review_notes?: string | null;
  reviewed_by?: SafeUser | null;
  reviewed_at?: string | null;
  rejection_reason?: string | null;
  account_status?: AccountStatus | null;
  next_action: RegistrationNextAction;
  created_at: string;
  updated_at: string;
};

export type PublicRegistrationStatus = {
  tournamentName: string;
  review_status: RegistrationReviewStatus;
  operational_status: RegistrationOperationalStatus;
  account_status?: AccountStatus | null;
  next_action: RegistrationNextAction;
  rejection_reason?: string | null;
};

export type SelfRegistrationResponse = {
  id: string;
  review_status: RegistrationReviewStatus;
  operational_status: RegistrationOperationalStatus;
  lookup_token: string;
  next_action: RegistrationNextAction;
};

export type AdminRegistrationPayload = {
  tournamentId: string;
  participantId: string;
  acceptedRules: true;
};

export type RankingScope = 'INDIVIDUAL' | 'TEAM';

export type RankingSnapshotType = 'LIVE' | 'FINAL';

export type TournamentScoringConfig = {
  tournamentId: string;
  pointsPerValidPiece: number;
  largestCaptureBonusPoints: number;
  distinctSpeciesPoints: number;
  tieBreakerStrategy: string;
  updatedAt: string;
  updatedBy?: SafeUser | null;
};

export type ScoreAdjustmentStatus = 'ACTIVE' | 'REVOKED';

export type ScoreAdjustment = {
  id: string;
  tournamentId: string;
  participantId: string;
  teamId?: string | null;
  pointsDelta: number;
  reason: string;
  status: ScoreAdjustmentStatus;
  createdAt: string;
  createdBy?: SafeUser | null;
  revokedAt?: string | null;
  revokedBy?: SafeUser | null;
};

export type RankingEntry = {
  position: number;
  competitorType: string;
  competitorId: string;
  competitorName: string;
  totalPoints: number;
  validPieces: number;
  totalLength: number;
  bestCaptureLength: number;
  distinctSpeciesCount: number;
  penaltyPoints: number;
  lastScoringCaptureAt?: string | null;
};

export type RankingResponseMeta = {
  scope: RankingScope;
  snapshotType: RankingSnapshotType;
  version: number;
  calculatedAt: string;
  isOfficial: boolean;
  isStale: boolean;
};

export type RankingResponse = {
  entries: RankingEntry[];
};

export type TournamentReportType =
  | 'registrations'
  | 'live-ranking'
  | 'final-ranking'
  | 'captures-by-participant'
  | 'captures-by-team'
  | 'rejected-observed';

export type TournamentReportResponse = Record<string, unknown> | Array<Record<string, unknown>>;

export type ExportType =
  | 'REGISTRATIONS'
  | 'LIVE_RANKING'
  | 'FINAL_RANKING'
  | 'CAPTURES_BY_PARTICIPANT'
  | 'CAPTURES_BY_TEAM'
  | 'REJECTED_OBSERVED_CAPTURES';

export type ExportFormat = 'CSV' | 'XLSX';

export type ExportStatus = 'READY' | 'FAILED' | 'PROCESSING';

export type ExportRecord = {
  id: string;
  tournamentId: string;
  exportType: ExportType;
  format: ExportFormat;
  status: ExportStatus;
  fileName: string;
  mimeType: string;
  sizeBytes?: number | null;
  requestedAt: string;
  generatedAt?: string | null;
  downloadUrl?: string | null;
  sourceSnapshotType?: RankingSnapshotType | null;
  sourceSnapshotVersion?: number | null;
  errorCode?: string | null;
};

type ApiEnvelope<T> = {
  data: T;
  meta?: Record<string, unknown>;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3004/api/v1';

type AuthRecovery = {
  refreshAccessToken: () => Promise<string | null>;
  onSessionInvalid: () => void;
};

let authRecovery: AuthRecovery | null = null;
let refreshInFlight: Promise<string | null> | null = null;

export function configureAuthRecovery(recovery: AuthRecovery | null) {
  authRecovery = recovery;
  if (!recovery) {
    refreshInFlight = null;
  }
}

async function recoverAccessToken() {
  if (!authRecovery) {
    return null;
  }

  if (!refreshInFlight) {
    refreshInFlight = authRecovery.refreshAccessToken().finally(() => {
      refreshInFlight = null;
    });
  }

  try {
    return await refreshInFlight;
  } catch {
    authRecovery.onSessionInvalid();
    return null;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  accessToken?: string,
  retried = false,
): Promise<ApiEnvelope<T>> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    cache: 'no-store',
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401 && accessToken && !retried) {
      const refreshedAccessToken = await recoverAccessToken();
      if (refreshedAccessToken) {
        return request<T>(path, options, refreshedAccessToken, true);
      }
      authRecovery?.onSessionInvalid();
    }
    const payload = await response.json().catch(() => null);
    const message =
      payload?.message ??
      payload?.error?.message ??
      payload?.error ??
      'No pudimos completar la operacion.';
    throw new ApiError(Array.isArray(message) ? message.join(', ') : message, response.status);
  }

  return response.json() as Promise<ApiEnvelope<T>>;
}

function body(value: unknown) {
  return JSON.stringify(value);
}

function buildQuery(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      search.set(key, value);
    }
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}

export function toApiUrl(path: string) {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function downloadProtectedFile(path: string, accessToken: string) {
  const response = await fetch(toApiUrl(path), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new ApiError('No pudimos descargar el archivo.', response.status);
  }

  return response.blob();
}

export async function fetchProtectedAssetUrl(path: string, accessToken: string) {
  const blob = await downloadProtectedFile(path, accessToken);
  return URL.createObjectURL(blob);
}

export const api = {
  login(email: string, password: string) {
    return request<SessionPayload>('/auth/login', {
      method: 'POST',
      body: body({ email, password }),
    });
  },
  refresh() {
    return request<SessionPayload>('/auth/refresh', { method: 'POST', body: body({}) });
  },
  logout() {
    return request<{ success: true }>('/auth/logout', { method: 'POST', body: body({}) });
  },
  me(accessToken: string) {
    return request<SessionUser>('/auth/me', {}, accessToken);
  },
  activateAccount(token: string, newPassword: string) {
    return request<{ userId: string; accountStatus: AccountStatus }>('/auth/activate-account', {
      method: 'POST',
      body: body({ token, newPassword }),
    });
  },
  requestPasswordSetup(email: string) {
    return request<{ requested: boolean }>('/auth/request-password-setup', {
      method: 'POST',
      body: body({ email }),
    });
  },
  listTournaments(accessToken: string) {
    return request<Tournament[]>('/tournaments', {}, accessToken);
  },
  listPublicTournaments() {
    return request<Tournament[]>('/public/tournaments/registration-options');
  },
  createTournament(payload: Record<string, unknown>, accessToken: string) {
    return request<Tournament>('/tournaments', {
      method: 'POST',
      body: body(payload),
    }, accessToken);
  },
  updateTournament(id: string, payload: Record<string, unknown>, accessToken: string) {
    return request<Tournament>(`/tournaments/${id}`, {
      method: 'PATCH',
      body: body(payload),
    }, accessToken);
  },
  updateTournamentSchedule(id: string, payload: Record<string, unknown>, accessToken: string) {
    return request<TournamentSchedule>(`/tournaments/${id}/schedule`, {
      method: 'PATCH',
      body: body(payload),
    }, accessToken);
  },
  getTournamentScoring(id: string, accessToken: string) {
    return request<TournamentScoringConfig>(`/tournaments/${id}/scoring`, {}, accessToken);
  },
  updateTournamentScoring(
    id: string,
    payload: Pick<
      TournamentScoringConfig,
      'pointsPerValidPiece' | 'largestCaptureBonusPoints' | 'distinctSpeciesPoints'
    >,
    accessToken: string,
  ) {
    return request<TournamentScoringConfig>(`/tournaments/${id}/scoring`, {
      method: 'PATCH',
      body: body(payload),
    }, accessToken);
  },
  listScoreAdjustments(
    tournamentId: string,
    filters: {
      status?: ScoreAdjustmentStatus;
      participantId?: string;
      teamId?: string;
    },
    accessToken: string,
  ) {
    const query = buildQuery({
      status: filters.status,
      participantId: filters.participantId,
      teamId: filters.teamId,
    });
    return request<ScoreAdjustment[]>(
      `/tournaments/${tournamentId}/score-adjustments${query}`,
      {},
      accessToken,
    );
  },
  createScoreAdjustment(
    tournamentId: string,
    payload: {
      participantId: string;
      teamId?: string;
      pointsDelta: number;
      reason: string;
    },
    accessToken: string,
  ) {
    return request<ScoreAdjustment>(`/tournaments/${tournamentId}/score-adjustments`, {
      method: 'POST',
      body: body(payload),
    }, accessToken);
  },
  revokeScoreAdjustment(
    tournamentId: string,
    adjustmentId: string,
    reason: string | undefined,
    accessToken: string,
  ) {
    return request<ScoreAdjustment>(
      `/tournaments/${tournamentId}/score-adjustments/${adjustmentId}/revoke`,
      {
        method: 'POST',
        body: body({ reason }),
      },
      accessToken,
    );
  },
  getTournamentRanking(id: string, scope: RankingScope, accessToken: string) {
    const query = buildQuery({ scope });
    return request<RankingResponse>(`/tournaments/${id}/ranking${query}`, {}, accessToken);
  },
  getTournamentFinalRanking(id: string, scope: RankingScope, accessToken: string) {
    const query = buildQuery({ scope });
    return request<RankingResponse>(`/tournaments/${id}/ranking/final${query}`, {}, accessToken);
  },
  getTournamentReport(
    tournamentId: string,
    reportType: TournamentReportType,
    scope: RankingScope | undefined,
    accessToken: string,
  ) {
    const query = buildQuery({ scope });
    return request<TournamentReportResponse>(
      `/tournaments/${tournamentId}/reports/${reportType}${query}`,
      {},
      accessToken,
    );
  },
  createTournamentExport(
    tournamentId: string,
    payload: {
      exportType: ExportType;
      format: ExportFormat;
      scope?: RankingScope;
    },
    accessToken: string,
  ) {
    return request<ExportRecord>(`/tournaments/${tournamentId}/exports`, {
      method: 'POST',
      body: body(payload),
    }, accessToken);
  },
  getExportRecord(id: string, accessToken: string) {
    return request<ExportRecord>(`/exports/${id}`, {}, accessToken);
  },
  closeTournament(id: string, accessToken: string) {
    return request<Tournament>(`/tournaments/${id}/close`, {
      method: 'POST',
      body: body({}),
    }, accessToken);
  },
  deleteTournament(id: string, accessToken: string) {
    return request<Tournament>(`/tournaments/${id}`, {
      method: 'DELETE',
    }, accessToken);
  },
  listParticipants(accessToken: string) {
    return request<Participant[]>('/participants', {}, accessToken);
  },
  createParticipant(payload: Record<string, unknown>, accessToken: string) {
    return request<Participant>('/participants', {
      method: 'POST',
      body: body(payload),
    }, accessToken);
  },
  updateParticipant(id: string, payload: Record<string, unknown>, accessToken: string) {
    return request<Participant>(`/participants/${id}`, {
      method: 'PATCH',
      body: body(payload),
    }, accessToken);
  },
  linkParticipantTeam(id: string, teamId: string, accessToken: string) {
    return request(`/participants/${id}/teams`, {
      method: 'POST',
      body: body({ teamId }),
    }, accessToken);
  },
  unlinkParticipantTeam(id: string, linkId: string, accessToken: string) {
    return request(`/participants/${id}/teams/${linkId}`, {
      method: 'DELETE',
    }, accessToken);
  },
  linkParticipantBoat(id: string, boatId: string, accessToken: string) {
    return request(`/participants/${id}/boats`, {
      method: 'POST',
      body: body({ boatId }),
    }, accessToken);
  },
  unlinkParticipantBoat(id: string, linkId: string, accessToken: string) {
    return request(`/participants/${id}/boats/${linkId}`, {
      method: 'DELETE',
    }, accessToken);
  },
  deleteParticipant(id: string, accessToken: string) {
    return request(`/participants/${id}`, {
      method: 'DELETE',
    }, accessToken);
  },
  listTeams(accessToken: string) {
    return request<Team[]>('/teams', {}, accessToken);
  },
  createTeam(payload: Record<string, unknown>, accessToken: string) {
    return request<Team>('/teams', {
      method: 'POST',
      body: body(payload),
    }, accessToken);
  },
  updateTeam(id: string, payload: Record<string, unknown>, accessToken: string) {
    return request<Team>(`/teams/${id}`, {
      method: 'PATCH',
      body: body(payload),
    }, accessToken);
  },
  deleteTeam(id: string, accessToken: string) {
    return request(`/teams/${id}`, {
      method: 'DELETE',
    }, accessToken);
  },
  listBoats(accessToken: string) {
    return request<Boat[]>('/boats', {}, accessToken);
  },
  createBoat(payload: Record<string, unknown>, accessToken: string) {
    return request<Boat>('/boats', {
      method: 'POST',
      body: body(payload),
    }, accessToken);
  },
  updateBoat(id: string, payload: Record<string, unknown>, accessToken: string) {
    return request<Boat>(`/boats/${id}`, {
      method: 'PATCH',
      body: body(payload),
    }, accessToken);
  },
  deleteBoat(id: string, accessToken: string) {
    return request(`/boats/${id}`, {
      method: 'DELETE',
    }, accessToken);
  },
  listOfficials(accessToken: string) {
    return request<Official[]>('/officials', {}, accessToken);
  },
  createOfficial(payload: Record<string, unknown>, accessToken: string) {
    return request<Official>('/officials', {
      method: 'POST',
      body: body(payload),
    }, accessToken);
  },
  updateOfficial(id: string, payload: Record<string, unknown>, accessToken: string) {
    return request<Official>(`/officials/${id}`, {
      method: 'PATCH',
      body: body(payload),
    }, accessToken);
  },
  assignOfficial(id: string, tournamentId: string, accessToken: string) {
    return request(`/officials/${id}/assignments`, {
      method: 'POST',
      body: body({ tournamentId }),
    }, accessToken);
  },
  removeOfficialAssignment(id: string, assignmentId: string, accessToken: string) {
    return request(`/officials/${id}/assignments/${assignmentId}`, {
      method: 'DELETE',
    }, accessToken);
  },
  deleteOfficial(id: string, accessToken: string) {
    return request(`/officials/${id}`, {
      method: 'DELETE',
    }, accessToken);
  },
  getOfficialCaptureContext(accessToken: string) {
    return request<OfficialCaptureContext>('/captures/context', {}, accessToken);
  },
  listCaptures(
    filters: {
      tournamentId?: string;
      status?: CaptureStatus;
    },
    accessToken: string,
  ) {
    const query = buildQuery({
      tournamentId: filters.tournamentId,
      status: filters.status,
    });
    return request<Capture[]>(`/captures${query}`, {}, accessToken);
  },
  getCapture(id: string, accessToken: string) {
    return request<Capture>(`/captures/${id}`, {}, accessToken);
  },
  createCapture(payload: CapturePayload, accessToken: string) {
    return request<Capture>('/captures', {
      method: 'POST',
      body: body(payload),
    }, accessToken);
  },
  updateCapture(id: string, payload: CaptureUpdatePayload, accessToken: string) {
    return request<Capture>(`/captures/${id}`, {
      method: 'PATCH',
      body: body(payload),
    }, accessToken);
  },
  syncCaptures(payload: { items: SyncCapturePayload[] }, accessToken: string) {
    return request<{
      items: Array<{
        client_capture_id: string;
        status: 'accepted' | 'duplicate' | 'rejected';
        capture_id?: string;
        error?: string;
      }>;
    }>('/captures/sync', {
      method: 'POST',
      body: body(payload),
    }, accessToken);
  },
  approveCapture(id: string, accessToken: string) {
    return request<Capture>(`/captures/${id}/approve`, {
      method: 'POST',
      body: body({}),
    }, accessToken);
  },
  observeCapture(id: string, reason: string, accessToken: string) {
    return request<Capture>(`/captures/${id}/observe`, {
      method: 'POST',
      body: body({ reason }),
    }, accessToken);
  },
  rejectCapture(id: string, reason: string, accessToken: string) {
    return request<Capture>(`/captures/${id}/reject`, {
      method: 'POST',
      body: body({ reason }),
    }, accessToken);
  },
  listRegistrations(
    filters: {
      tournamentId?: string;
      reviewStatus?: RegistrationReviewStatus;
      channel?: RegistrationChannel;
    },
    accessToken: string,
  ) {
    const search = new URLSearchParams();
    if (filters.tournamentId) {
      search.set('tournamentId', filters.tournamentId);
    }
    if (filters.reviewStatus) {
      search.set('reviewStatus', filters.reviewStatus);
    }
    if (filters.channel) {
      search.set('channel', filters.channel);
    }

    const query = search.toString();
    return request<Registration[]>(`/registrations${query ? `?${query}` : ''}`, {}, accessToken);
  },
  getRegistration(id: string, accessToken: string) {
    return request<Registration>(`/registrations/${id}`, {}, accessToken);
  },
  createRegistration(payload: AdminRegistrationPayload, accessToken: string) {
    return request<Registration>('/registrations', {
      method: 'POST',
      body: body(payload),
    }, accessToken);
  },
  approveRegistration(id: string, notes: string | undefined, accessToken: string) {
    return request<Registration>(`/registrations/${id}/approve`, {
      method: 'POST',
      body: body({ notes }),
    }, accessToken);
  },
  rejectRegistration(id: string, reason: string | undefined, accessToken: string) {
    return request<Registration>(`/registrations/${id}/reject`, {
      method: 'POST',
      body: body({ reason }),
    }, accessToken);
  },
  selfRegister(payload: {
    tournamentId: string;
    firstName: string;
    lastName: string;
    documentId?: string;
    email: string;
    phone?: string;
    acceptedRules: true;
  }) {
    return request<SelfRegistrationResponse>('/registrations/self-register', {
      method: 'POST',
      body: body(payload),
    });
  },
  getPublicRegistrationStatus(lookupToken: string) {
    return request<PublicRegistrationStatus>(`/public/registrations/status/${lookupToken}`);
  },
};
