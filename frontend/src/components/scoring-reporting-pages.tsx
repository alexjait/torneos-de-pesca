'use client';

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useAuth } from '@/components/auth-provider';
import {
  AdminTableEmptyState,
  EmptyState,
  Field,
  Notice,
} from '@/components/ui';
import {
  api,
  ApiError,
  downloadProtectedFile,
  type ExportFormat,
  type ExportRecord,
  type ExportType,
  type Participant,
  type RankingEntry,
  type RankingResponseMeta,
  type RankingScope,
  type ScoreAdjustment,
  type ScoreAdjustmentStatus,
  type Team,
  type Tournament,
  type TournamentReportType,
  type TournamentScoringConfig,
} from '@/lib/api';
import {
  exportStatusLabel,
  rankingScopeLabel,
  scoreAdjustmentStatusLabel,
  toUserMessage,
  tournamentStatusLabel,
} from '@/lib/labels';

type FeedbackState = {
  tone: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description: string;
} | null;

type ScoreFormState = {
  pointsPerValidPiece: string;
  largestCaptureBonusPoints: string;
  distinctSpeciesPoints: string;
};

type AdjustmentFormState = {
  participantId: string;
  teamId: string;
  pointsDelta: string;
  reason: string;
};

type RankingTab = 'live' | 'final';

type ReportDefinition = {
  key: TournamentReportType;
  title: string;
  description: string;
  exportType: ExportType;
  supportsScope?: boolean;
};

type ReportRow = Record<string, unknown>;

const REPORT_DEFINITIONS: ReportDefinition[] = [
  {
    key: 'registrations',
    title: 'Inscriptos',
    description: 'Listado operativo de personas inscriptas en el torneo seleccionado.',
    exportType: 'REGISTRATIONS',
  },
  {
    key: 'live-ranking',
    title: 'Ranking en vivo',
    description: 'Lectura administrativa del snapshot live vigente.',
    exportType: 'LIVE_RANKING',
    supportsScope: true,
  },
  {
    key: 'final-ranking',
    title: 'Ranking final oficial',
    description: 'Resultado congelado cuando el torneo ya cerró oficialmente.',
    exportType: 'FINAL_RANKING',
    supportsScope: true,
  },
  {
    key: 'captures-by-participant',
    title: 'Capturas por pescador',
    description: 'Detalle de capturas agrupadas por participante.',
    exportType: 'CAPTURES_BY_PARTICIPANT',
  },
  {
    key: 'captures-by-team',
    title: 'Capturas por equipo',
    description: 'Detalle de capturas agrupadas por equipo.',
    exportType: 'CAPTURES_BY_TEAM',
  },
  {
    key: 'rejected-observed',
    title: 'Capturas observadas y rechazadas',
    description: 'Seguimiento operativo de las capturas que no quedaron aprobadas.',
    exportType: 'REJECTED_OBSERVED_CAPTURES',
  },
];

function useAccessToken() {
  const { accessToken } = useAuth();
  if (!accessToken) {
    throw new Error('No hay token de acceso disponible.');
  }
  return accessToken;
}

function useFeedback() {
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  function clearFeedback() {
    setFeedback(null);
  }

  function setError(
    error: unknown,
    fallbackTitle = 'No pudimos completar la acción',
    fallbackDescription = 'Revisá los datos e intentá nuevamente.',
  ) {
    setFeedback({
      tone: 'error',
      title: fallbackTitle,
      description: toUserMessage(error, fallbackDescription),
    });
  }

  return { feedback, setFeedback, setError, clearFeedback };
}

function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions ? <div className="page-header-actions">{actions}</div> : null}
    </header>
  );
}

function Feedback({
  feedback,
  onDismiss,
}: {
  feedback: FeedbackState;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!feedback || feedback.tone === 'error') {
      return;
    }

    const timeout = window.setTimeout(onDismiss, 5000);
    return () => window.clearTimeout(timeout);
  }, [feedback, onDismiss]);

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

function TableSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="content-card">
      <div className="section-heading">
        <h3>{title}</h3>
      </div>
      {children}
    </section>
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

function formatNumber(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '0';
  }

  return new Intl.NumberFormat('es-AR', {
    maximumFractionDigits: 2,
  }).format(value);
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

function participantName(participant: Participant | undefined) {
  if (!participant) {
    return 'Participante sin nombre';
  }

  return `${participant.firstName} ${participant.lastName}`.trim();
}

function scoringFormFromConfig(config: TournamentScoringConfig | null): ScoreFormState {
  return {
    pointsPerValidPiece: String(config?.pointsPerValidPiece ?? 0),
    largestCaptureBonusPoints: String(config?.largestCaptureBonusPoints ?? 0),
    distinctSpeciesPoints: String(config?.distinctSpeciesPoints ?? 0),
  };
}

function parseNonNegativeInteger(value: string) {
  if (!/^\d+$/.test(value.trim())) {
    return null;
  }

  return Number.parseInt(value, 10);
}

function parseNegativeInteger(value: string) {
  if (!/^-?\d+$/.test(value.trim())) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return parsed < 0 ? parsed : null;
}

function rankingFallbackMessage(error: unknown, isFinal: boolean) {
  if (error instanceof ApiError && error.status === 409 && isFinal) {
    return 'Todavía no hay ranking final oficial para este torneo.';
  }

  return toUserMessage(error, 'Probá de nuevo en unos minutos.');
}

function reportFallbackMessage(error: unknown) {
  return toUserMessage(error, 'No pudimos cargar el reporte seleccionado.');
}

function prettifyKey(key: string) {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (value) => value.toUpperCase());
}

function stringifyCellValue(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return 'Sin dato';
  }

  if (typeof value === 'number') {
    return formatNumber(value);
  }

  if (typeof value === 'boolean') {
    return value ? 'Sí' : 'No';
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return 'Sin dato';
    }

    const maybeDate = Date.parse(trimmed);
    if (!Number.isNaN(maybeDate) && /(t|\d{4}-\d{2}-\d{2})/i.test(trimmed)) {
      return formatDate(trimmed);
    }

    return trimmed;
  }

  if (Array.isArray(value)) {
    return value.map((item) => stringifyCellValue(item)).join(', ');
  }

  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, nestedValue]) => `${prettifyKey(key)}: ${stringifyCellValue(nestedValue)}`)
      .join(' | ');
  }

  return String(value);
}

function extractReportRows(payload: unknown): ReportRow[] {
  if (Array.isArray(payload)) {
    return payload.filter(
      (item): item is ReportRow => typeof item === 'object' && item !== null && !Array.isArray(item),
    );
  }

  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const candidate = payload as Record<string, unknown>;
  const collections = ['rows', 'items', 'entries', 'data'];
  for (const key of collections) {
    const value = candidate[key];
    if (Array.isArray(value)) {
      return value.filter(
        (item): item is ReportRow =>
          typeof item === 'object' && item !== null && !Array.isArray(item),
      );
    }
  }

  return [candidate];
}

function ExportList({
  items,
  onDownload,
  downloadingId,
}: {
  items: ExportRecord[];
  onDownload: (record: ExportRecord) => void;
  downloadingId: string | null;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="Todavía no generaste exportaciones"
        description="Cuando uses Exportar CSV o Exportar XLSX, vas a ver el resultado acá."
      />
    );
  }

  return (
    <div className="export-list">
      {items.map((record) => (
        <article key={record.id} className="export-card">
          <div className="export-card-copy">
            <strong>{record.fileName || `${record.exportType}.${record.format.toLowerCase()}`}</strong>
            <span className="muted">
              {record.format} · {exportStatusLabel(record.status)} · Solicitada {formatDate(record.requestedAt)}
            </span>
            <span className="muted">
              {record.generatedAt ? `Generada ${formatDate(record.generatedAt)}` : 'Sin fecha de generación'}
            </span>
          </div>
          <div className="button-row">
            {record.status === 'READY' && record.downloadUrl ? (
              <button
                type="button"
                className="button button-secondary"
                onClick={() => onDownload(record)}
                disabled={downloadingId === record.id}
              >
                {downloadingId === record.id ? 'Descargando...' : 'Descargar'}
              </button>
            ) : (
              <span className="pill export-status-pill">{exportStatusLabel(record.status)}</span>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

function RevokeAdjustmentDialog({
  adjustment,
  participantNameLabel,
  reason,
  onReasonChange,
  onCancel,
  onConfirm,
  loading,
}: {
  adjustment: ScoreAdjustment | null;
  participantNameLabel: string;
  reason: string;
  onReasonChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  if (!adjustment) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="revoke-adjustment-title">
        <h3 id="revoke-adjustment-title">Revocar penalización</h3>
        <p className="muted">
          La penalización de {participantNameLabel} dejará de impactar en el ranking vigente.
        </p>
        <Field label="Motivo" help="Opcional. Se registra como contexto adicional de auditoría.">
          <textarea
            value={reason}
            onChange={(event) => onReasonChange(event.target.value)}
            placeholder="Ejemplo: Se corrigió la validación operativa."
          />
        </Field>
        <div className="button-row">
          <button type="button" className="button button-secondary" onClick={onCancel} disabled={loading}>
            Cancelar
          </button>
          <button type="button" className="button button-danger" onClick={onConfirm} disabled={loading}>
            {loading ? 'Procesando...' : 'Revocar penalización'}
          </button>
        </div>
      </div>
    </div>
  );
}

function RankingMetaBar({
  meta,
  emptyMessage,
}: {
  meta: RankingResponseMeta | null;
  emptyMessage?: string | null;
}) {
  if (!meta) {
    return emptyMessage ? (
      <EmptyState title="Sin ranking disponible" description={emptyMessage} />
    ) : null;
  }

  return (
    <div className="ranking-meta-grid">
      <div className="ranking-meta-card">
        <span className="muted">Última actualización</span>
        <strong>{formatDate(meta.calculatedAt)}</strong>
      </div>
      <div className="ranking-meta-card">
        <span className="muted">Versión</span>
        <strong>{meta.version}</strong>
      </div>
      <div className="ranking-meta-card">
        <span className="muted">Alcance</span>
        <strong>{rankingScopeLabel(meta.scope)}</strong>
      </div>
      <div className="ranking-meta-card">
        <span className="muted">Estado</span>
        <strong>{meta.isOfficial ? 'Ranking final oficial' : 'Ranking en vivo'}</strong>
      </div>
      {meta.isStale ? (
        <Notice
          tone="warning"
          title="Desactualizado"
          description="Mostramos el último snapshot válido mientras se recompone el cálculo."
        />
      ) : null}
    </div>
  );
}

function RankingTable({
  entries,
  emptyMessage,
}: {
  entries: RankingEntry[];
  emptyMessage: string;
}) {
  if (entries.length === 0) {
    return (
      <AdminTableEmptyState
        title="Todavía no hay posiciones"
        description={emptyMessage}
      />
    );
  }

  return (
    <>
      <div className="table-wrap desktop-only">
        <table className="data-table">
          <thead>
            <tr>
              <th>Posición</th>
              <th>{'Competidor'}</th>
              <th>Puntaje</th>
              <th>Piezas válidas</th>
              <th>Longitud total</th>
              <th>Mejor captura</th>
              <th>Especies</th>
              <th>Penalización</th>
              <th>Última captura que sumó</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={`${entry.competitorId}-${entry.position}`}>
                <td>
                  <strong>{entry.position}</strong>
                </td>
                <td>
                  <div className="stack-list compact-stack">
                    <strong>{entry.competitorName}</strong>
                    <span className="muted">{entry.competitorType}</span>
                  </div>
                </td>
                <td>{formatNumber(entry.totalPoints)}</td>
                <td>{formatNumber(entry.validPieces)}</td>
                <td>{formatNumber(entry.totalLength)}</td>
                <td>{formatNumber(entry.bestCaptureLength)}</td>
                <td>{formatNumber(entry.distinctSpeciesCount)}</td>
                <td>{formatNumber(entry.penaltyPoints)}</td>
                <td>{formatDate(entry.lastScoringCaptureAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mobile-only ranking-mobile-list">
        {entries.map((entry) => (
          <article key={`${entry.competitorId}-${entry.position}`} className="ranking-card">
            <div className="ranking-card-top">
              <span className="pill">Posición {entry.position}</span>
              <strong>{formatNumber(entry.totalPoints)} pts</strong>
            </div>
            <strong>{entry.competitorName}</strong>
            <div className="ranking-mobile-grid muted">
              <span>Mejor captura: {formatNumber(entry.bestCaptureLength)}</span>
              <span>Piezas válidas: {formatNumber(entry.validPieces)}</span>
              <span>Longitud total: {formatNumber(entry.totalLength)}</span>
              <span>Penalización: {formatNumber(entry.penaltyPoints)}</span>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

export function AdminScoringPage() {
  const accessToken = useAccessToken();
  const { feedback, setFeedback, setError, clearFeedback } = useFeedback();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [savingScoring, setSavingScoring] = useState(false);
  const [savingAdjustment, setSavingAdjustment] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokeDialog, setRevokeDialog] = useState<ScoreAdjustment | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [adjustmentStatusFilter, setAdjustmentStatusFilter] = useState<'' | ScoreAdjustmentStatus>('');
  const [scoringConfig, setScoringConfig] = useState<TournamentScoringConfig | null>(null);
  const [scoreForm, setScoreForm] = useState<ScoreFormState>(scoringFormFromConfig(null));
  const [adjustments, setAdjustments] = useState<ScoreAdjustment[]>([]);
  const [approvedParticipantIds, setApprovedParticipantIds] = useState<string[]>([]);
  const [adjustmentForm, setAdjustmentForm] = useState<AdjustmentFormState>({
    participantId: '',
    teamId: '',
    pointsDelta: '-1',
    reason: '',
  });

  const participantMap = useMemo(
    () => Object.fromEntries(participants.map((item) => [item.id, item])) as Record<string, Participant>,
    [participants],
  );
  const teamMap = useMemo(
    () => Object.fromEntries(teams.map((item) => [item.id, item])) as Record<string, Team>,
    [teams],
  );

  async function loadCatalogs() {
    setLoading(true);
    try {
      const [tournamentsResponse, participantsResponse, teamsResponse] = await Promise.all([
        api.listTournaments(accessToken),
        api.listParticipants(accessToken),
        api.listTeams(accessToken),
      ]);
      setTournaments(tournamentsResponse.data);
      setParticipants(participantsResponse.data);
      setTeams(teamsResponse.data);
      setSelectedTournamentId((current) =>
        tournamentsResponse.data.some((item) => item.id === current)
          ? current
          : tournamentsResponse.data[0]?.id ?? '',
      );
    } catch (error) {
      setError(error, 'No pudimos cargar scoring');
    } finally {
      setLoading(false);
    }
  }

  async function loadTournamentData(tournamentId: string, statusFilter = adjustmentStatusFilter) {
    if (!tournamentId) {
      setScoringConfig(null);
      setAdjustments([]);
      setApprovedParticipantIds([]);
      setScoreForm(scoringFormFromConfig(null));
      return;
    }

    setLoadingData(true);
    setApprovedParticipantIds([]);
    try {
      const [scoringResponse, adjustmentsResponse, registrationsResponse] = await Promise.all([
        api.getTournamentScoring(tournamentId, accessToken),
        api.listScoreAdjustments(
          tournamentId,
          {
            status: statusFilter || undefined,
          },
          accessToken,
        ),
        api.listRegistrations(
          {
            tournamentId,
            reviewStatus: 'APPROVED',
          },
          accessToken,
        ),
      ]);

      setScoringConfig(scoringResponse.data);
      setScoreForm(scoringFormFromConfig(scoringResponse.data));
      setAdjustments(adjustmentsResponse.data);
      setApprovedParticipantIds(
        Array.from(
          new Set(
            registrationsResponse.data
              .map((registration) => registration.participant?.id)
              .filter((participantId): participantId is string => Boolean(participantId)),
          ),
        ),
      );
    } catch (error) {
      setScoringConfig(null);
      setAdjustments([]);
      setError(error, 'No pudimos cargar la configuración');
    } finally {
      setLoadingData(false);
    }
  }

  useEffect(() => {
    loadCatalogs();
  }, [accessToken]);

  useEffect(() => {
    if (!selectedTournamentId) {
      return;
    }

    loadTournamentData(selectedTournamentId);
  }, [selectedTournamentId, adjustmentStatusFilter]);

  const tournamentParticipants = useMemo(
    () => participants.filter((participant) => approvedParticipantIds.includes(participant.id)),
    [approvedParticipantIds, participants],
  );
  const filteredParticipants = useMemo(
    () =>
      tournamentParticipants.filter((participant) =>
        normalizeText(participantName(participant)).includes(normalizeText(search)),
      ),
    [search, tournamentParticipants],
  );
  const selectedParticipant = useMemo(
    () =>
      tournamentParticipants.find((participant) => participant.id === adjustmentForm.participantId) ?? null,
    [adjustmentForm.participantId, tournamentParticipants],
  );
  const availableTeams = useMemo(() => {
    const scopedParticipants = selectedParticipant ? [selectedParticipant] : tournamentParticipants;
    const availableTeamIds = new Set(
      scopedParticipants.flatMap((participant) => participant.teamLinks.map((link) => link.teamId)),
    );

    return teams.filter((team) => availableTeamIds.has(team.id));
  }, [selectedParticipant, teams, tournamentParticipants]);

  useEffect(() => {
    setAdjustmentForm((current) => {
      const nextParticipantId = tournamentParticipants.some(
        (participant) => participant.id === current.participantId,
      )
        ? current.participantId
        : '';
      const nextTeamId = availableTeams.some((team) => team.id === current.teamId)
        ? current.teamId
        : '';

      if (nextParticipantId === current.participantId && nextTeamId === current.teamId) {
        return current;
      }

      return {
        ...current,
        participantId: nextParticipantId,
        teamId: nextTeamId,
      };
    });
  }, [availableTeams, tournamentParticipants]);

  async function handleSaveScoring(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const pointsPerValidPiece = parseNonNegativeInteger(scoreForm.pointsPerValidPiece);
    const largestCaptureBonusPoints = parseNonNegativeInteger(scoreForm.largestCaptureBonusPoints);
    const distinctSpeciesPoints = parseNonNegativeInteger(scoreForm.distinctSpeciesPoints);

    if (
      pointsPerValidPiece === null ||
      largestCaptureBonusPoints === null ||
      distinctSpeciesPoints === null
    ) {
      setFeedback({
        tone: 'error',
        title: 'Revisá la configuración',
        description: 'Todos los valores deben ser enteros iguales o mayores que 0.',
      });
      return;
    }

    setSavingScoring(true);
    try {
      const response = await api.updateTournamentScoring(
        selectedTournamentId,
        {
          pointsPerValidPiece,
          largestCaptureBonusPoints,
          distinctSpeciesPoints,
        },
        accessToken,
      );
      setScoringConfig(response.data);
      setScoreForm(scoringFormFromConfig(response.data));
      setFeedback({
        tone: 'success',
        title: 'Scoring actualizado',
        description: 'La configuración ya quedó guardada y el ranking en vivo se recalcula desde el backend.',
      });
    } catch (error) {
      setError(error, 'No pudimos guardar el scoring');
    } finally {
      setSavingScoring(false);
    }
  }

  async function handleCreateAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const pointsDelta = parseNegativeInteger(adjustmentForm.pointsDelta);
    if (!adjustmentForm.participantId || pointsDelta === null || !adjustmentForm.reason.trim()) {
      setFeedback({
        tone: 'error',
        title: 'Revisá la penalización',
        description: 'Elegí un pescador, usá un puntaje negativo y cargá un motivo.',
      });
      return;
    }

    setSavingAdjustment(true);
    try {
      await api.createScoreAdjustment(
        selectedTournamentId,
        {
          participantId: adjustmentForm.participantId,
          teamId: adjustmentForm.teamId || undefined,
          pointsDelta,
          reason: adjustmentForm.reason.trim(),
        },
        accessToken,
      );
      setAdjustmentForm((current) => ({
        ...current,
        participantId: '',
        teamId: '',
        pointsDelta: '-1',
        reason: '',
      }));
      setFeedback({
        tone: 'success',
        title: 'Penalización aplicada',
        description: 'La penalización ya quedó registrada y auditada.',
      });
      await loadTournamentData(selectedTournamentId);
    } catch (error) {
      setError(error, 'No pudimos aplicar la penalización');
    } finally {
      setSavingAdjustment(false);
    }
  }

  async function handleRevokeAdjustment() {
    if (!revokeDialog) {
      return;
    }

    setRevokingId(revokeDialog.id);
    try {
      await api.revokeScoreAdjustment(
        selectedTournamentId,
        revokeDialog.id,
        revokeReason.trim() || undefined,
        accessToken,
      );
      setFeedback({
        tone: 'success',
        title: 'Penalización revocada',
        description: 'La penalización quedó revocada y el ranking en vivo se actualizará con el backend.',
      });
      setRevokeDialog(null);
      setRevokeReason('');
      await loadTournamentData(selectedTournamentId);
    } catch (error) {
      setError(error, 'No pudimos revocar la penalización');
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <div className="section-stack">
      <PageHeader
        title="Scoring"
        description="Configurá las reglas habilitadas del torneo y administrá penalizaciones manuales auditables sin recalcular nada en el cliente."
      />
      <Feedback feedback={feedback} onDismiss={clearFeedback} />

      <section className="admin-toolbar scoring-toolbar">
        <div className="toolbar-filters scoring-toolbar-filters">
          <Field label="Torneo">
            <select
              value={selectedTournamentId}
              onChange={(event) => {
                setSelectedTournamentId(event.target.value);
                setApprovedParticipantIds([]);
                setAdjustmentForm((current) => ({
                  ...current,
                  participantId: '',
                  teamId: '',
                }));
              }}
              disabled={loading || tournaments.length === 0}
            >
              <option value="">{tournaments.length === 0 ? 'Sin torneos' : 'Seleccionar torneo'}</option>
              {tournaments.map((tournament) => (
                <option key={tournament.id} value={tournament.id}>
                  {tournament.name} - {tournamentStatusLabel(tournament.status)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Buscar pescador">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre"
            />
          </Field>
          <Field label="Estado de penalización">
            <select
              value={adjustmentStatusFilter}
              onChange={(event) =>
                setAdjustmentStatusFilter((event.target.value as '' | ScoreAdjustmentStatus) || '')
              }
            >
              <option value="">Todas</option>
              <option value="ACTIVE">Activas</option>
              <option value="REVOKED">Revocadas</option>
            </select>
          </Field>
        </div>
        <div className="admin-toolbar-meta">
          <span className="admin-results-count">
            {resultLabel(adjustments.length, 'penalización', 'penalizaciones')}
          </span>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => loadTournamentData(selectedTournamentId)}
            disabled={!selectedTournamentId || loadingData}
          >
            {loadingData ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>
      </section>

      {loading ? (
        <Notice
          tone="info"
          title="Cargando scoring"
          description="Estamos preparando torneos, pescadores y equipos para esta vista."
        />
      ) : !selectedTournamentId ? (
        <EmptyState
          title="Sin torneo seleccionado"
          description="Elegí un torneo para configurar scoring y revisar penalizaciones."
        />
      ) : (
        <>
          <section className="scoring-layout">
            <TableSection title="Configuración del torneo">
              <form className="form-stack" onSubmit={handleSaveScoring}>
                <div className="grid-3">
                  <Field
                    label="Puntos por pieza válida"
                    help="Se aplica por cada captura aprobada que sume al ranking."
                  >
                    <input
                      inputMode="numeric"
                      value={scoreForm.pointsPerValidPiece}
                      onChange={(event) =>
                        setScoreForm((current) => ({
                          ...current,
                          pointsPerValidPiece: event.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field
                    label="Bonus por pieza más grande"
                    help="Lo define exclusivamente el backend dentro del snapshot del ranking."
                  >
                    <input
                      inputMode="numeric"
                      value={scoreForm.largestCaptureBonusPoints}
                      onChange={(event) =>
                        setScoreForm((current) => ({
                          ...current,
                          largestCaptureBonusPoints: event.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field
                    label="Puntos por especies distintas"
                    help="Se suma por diversidad de especies según el cálculo oficial."
                  >
                    <input
                      inputMode="numeric"
                      value={scoreForm.distinctSpeciesPoints}
                      onChange={(event) =>
                        setScoreForm((current) => ({
                          ...current,
                          distinctSpeciesPoints: event.target.value,
                        }))
                      }
                    />
                  </Field>
                </div>

                <div className="scoring-meta-card">
                  <span className="pill">Última actualización</span>
                  <strong>{formatDate(scoringConfig?.updatedAt)}</strong>
                  <span className="muted">
                    {scoringConfig?.tieBreakerStrategy
                      ? `Desempate oficial: ${scoringConfig.tieBreakerStrategy}`
                      : 'Desempate oficial definido por backend'}
                  </span>
                </div>

                <div className="button-row">
                  <button
                    type="submit"
                    className="button button-primary"
                    disabled={savingScoring || loadingData}
                  >
                    {savingScoring ? 'Guardando...' : 'Guardar scoring'}
                  </button>
                </div>
              </form>
            </TableSection>

            <TableSection title="Nueva penalización">
              <form className="form-stack" onSubmit={handleCreateAdjustment}>
                <Field label="Pescador">
                  <select
                    value={adjustmentForm.participantId}
                    onChange={(event) =>
                      setAdjustmentForm((current) => ({
                        ...current,
                        participantId: event.target.value,
                        teamId: '',
                      }))
                    }
                  >
                    <option value="">
                      {filteredParticipants.length === 0 ? 'Sin resultados' : 'Seleccionar pescador'}
                    </option>
                    {filteredParticipants.map((participant) => (
                      <option key={participant.id} value={participant.id}>
                        {participantName(participant)}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field
                  label="Equipo"
                  help="Opcional. Usalo cuando la penalización también tenga impacto de equipo."
                >
                  <select
                    value={adjustmentForm.teamId}
                    onChange={(event) =>
                      setAdjustmentForm((current) => ({
                        ...current,
                        teamId: event.target.value,
                      }))
                    }
                  >
                    <option value="">Sin equipo</option>
                    {availableTeams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field
                  label="Puntaje"
                  help="En este MVP solo se admiten valores negativos."
                >
                  <input
                    inputMode="numeric"
                    value={adjustmentForm.pointsDelta}
                    onChange={(event) =>
                      setAdjustmentForm((current) => ({
                        ...current,
                        pointsDelta: event.target.value,
                      }))
                    }
                  />
                </Field>

                <Field label="Motivo" help="El motivo es obligatorio para dejar trazabilidad auditable.">
                  <textarea
                    value={adjustmentForm.reason}
                    onChange={(event) =>
                      setAdjustmentForm((current) => ({
                        ...current,
                        reason: event.target.value,
                      }))
                    }
                    placeholder="Ejemplo: Penalización por incumplimiento del reglamento."
                  />
                </Field>

                <div className="button-row">
                  <button
                    type="submit"
                    className="button button-primary"
                    disabled={savingAdjustment || loadingData}
                  >
                    {savingAdjustment ? 'Guardando...' : 'Aplicar penalización'}
                  </button>
                </div>
              </form>
            </TableSection>
          </section>

          <TableSection title="Penalizaciones del torneo">
            {loadingData ? (
              <Notice
                tone="info"
                title="Cargando penalizaciones"
                description="Estamos trayendo la configuración y los ajustes registrados."
              />
            ) : adjustments.length === 0 ? (
              <AdminTableEmptyState
                title="Todavía no hay penalizaciones"
                description="Cuando registres una penalización manual, va a aparecer en este listado."
              />
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Pescador</th>
                      <th>Equipo</th>
                      <th>Puntaje</th>
                      <th>Estado</th>
                      <th>Motivo</th>
                      <th>Registrada</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adjustments.map((adjustment) => (
                      <tr key={adjustment.id}>
                        <td>{participantName(participantMap[adjustment.participantId])}</td>
                        <td>{adjustment.teamId ? teamMap[adjustment.teamId]?.name ?? 'Equipo no disponible' : 'Sin equipo'}</td>
                        <td>{formatNumber(adjustment.pointsDelta)}</td>
                        <td>
                          <span className="pill">{scoreAdjustmentStatusLabel(adjustment.status)}</span>
                        </td>
                        <td>{adjustment.reason}</td>
                        <td>{formatDate(adjustment.createdAt)}</td>
                        <td>
                          {adjustment.status === 'ACTIVE' ? (
                            <button
                              type="button"
                              className="button button-secondary"
                              onClick={() => {
                                setRevokeDialog(adjustment);
                                setRevokeReason('');
                              }}
                            >
                              Revocar
                            </button>
                          ) : (
                            <span className="muted">Ya revocada</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TableSection>
        </>
      )}

      <RevokeAdjustmentDialog
        adjustment={revokeDialog}
        participantNameLabel={
          revokeDialog ? participantName(participantMap[revokeDialog.participantId]) : ''
        }
        reason={revokeReason}
        onReasonChange={setRevokeReason}
        onCancel={() => {
          setRevokeDialog(null);
          setRevokeReason('');
        }}
        onConfirm={handleRevokeAdjustment}
        loading={Boolean(revokingId)}
      />
    </div>
  );
}

export function AdminRankingPage() {
  const accessToken = useAccessToken();
  const { feedback, setError, clearFeedback } = useFeedback();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState('');
  const [scope, setScope] = useState<RankingScope>('INDIVIDUAL');
  const [tab, setTab] = useState<RankingTab>('live');
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [loadingRanking, setLoadingRanking] = useState(false);
  const [entries, setEntries] = useState<RankingEntry[]>([]);
  const [meta, setMeta] = useState<RankingResponseMeta | null>(null);
  const [emptyMessage, setEmptyMessage] = useState<string | null>(null);
  const selectedTournament = useMemo(
    () => tournaments.find((item) => item.id === selectedTournamentId) ?? null,
    [tournaments, selectedTournamentId],
  );
  const liveRankingAvailable = selectedTournament?.status !== 'CLOSED';

  async function loadTournaments() {
    setLoadingCatalog(true);
    try {
      const response = await api.listTournaments(accessToken);
      setTournaments(response.data);
      setSelectedTournamentId((current) =>
        response.data.some((item) => item.id === current) ? current : response.data[0]?.id ?? '',
      );
    } catch (error) {
      setError(error, 'No pudimos cargar los torneos');
    } finally {
      setLoadingCatalog(false);
    }
  }

  async function loadRanking() {
    if (!selectedTournamentId) {
      setEntries([]);
      setMeta(null);
      setEmptyMessage('Elegí un torneo para consultar el ranking.');
      return;
    }

    setLoadingRanking(true);
    try {
      const response =
        tab === 'live'
          ? await api.getTournamentRanking(selectedTournamentId, scope, accessToken)
          : await api.getTournamentFinalRanking(selectedTournamentId, scope, accessToken);
      setEntries(response.data.entries);
      setMeta((response.meta as RankingResponseMeta | undefined) ?? null);
      setEmptyMessage(
        tab === 'live'
          ? 'Todavía no hay capturas aprobadas o ajustes que generen posiciones.'
          : 'Todavía no hay ranking final oficial para este torneo.',
      );
    } catch (error) {
      setEntries([]);
      setMeta(null);
      setEmptyMessage(rankingFallbackMessage(error, tab === 'final'));
    } finally {
      setLoadingRanking(false);
    }
  }

  useEffect(() => {
    loadTournaments();
  }, [accessToken]);

  useEffect(() => {
    loadRanking();
  }, [selectedTournamentId, scope, tab]);

  useEffect(() => {
    if (!liveRankingAvailable && tab === 'live') {
      setTab('final');
    }
  }, [liveRankingAvailable, tab]);

  useEffect(() => {
    if (!selectedTournamentId || tab !== 'live') {
      return;
    }

    const interval = window.setInterval(() => {
      loadRanking();
    }, 30000);

    return () => window.clearInterval(interval);
  }, [selectedTournamentId, scope, tab]);

  return (
    <div className="section-stack">
      <PageHeader
        title="Ranking"
        description="Consultá el ranking en vivo y el ranking final oficial con última actualización, versión y estado del snapshot."
        actions={
          <button
            type="button"
            className="button button-secondary"
            onClick={() => loadRanking()}
            disabled={loadingRanking || !selectedTournamentId}
          >
            {loadingRanking ? 'Actualizando...' : 'Actualizar'}
          </button>
        }
      />
      <Feedback feedback={feedback} onDismiss={clearFeedback} />

      <section className="admin-toolbar ranking-toolbar">
        <div className="toolbar-filters ranking-toolbar-filters">
          <Field label="Torneo">
            <select
              value={selectedTournamentId}
              onChange={(event) => setSelectedTournamentId(event.target.value)}
              disabled={loadingCatalog || tournaments.length === 0}
            >
              <option value="">{tournaments.length === 0 ? 'Sin torneos' : 'Seleccionar torneo'}</option>
              {tournaments.map((tournament) => (
                <option key={tournament.id} value={tournament.id}>
                  {tournament.name} - {tournamentStatusLabel(tournament.status)}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Alcance">
            <select
              value={scope}
              onChange={(event) => setScope(event.target.value as RankingScope)}
            >
              <option value="INDIVIDUAL">Pescador</option>
              <option value="TEAM">Equipo</option>
            </select>
          </Field>
        </div>

        <div className="button-row">
          {liveRankingAvailable ? (
            <button
              type="button"
              className={`button ${tab === 'live' ? 'button-primary' : 'button-secondary'}`}
              onClick={() => setTab('live')}
            >
              Ranking en vivo
            </button>
          ) : null}
          <button
            type="button"
            className={`button ${tab === 'final' ? 'button-primary' : 'button-secondary'}`}
            onClick={() => setTab('final')}
          >
            Ranking final oficial
          </button>
        </div>
      </section>

      {loadingCatalog ? (
        <Notice
          tone="info"
          title="Cargando ranking"
          description="Estamos preparando el selector de torneos y la lectura del snapshot."
        />
      ) : !selectedTournamentId ? (
        <EmptyState
          title="Sin torneo seleccionado"
          description="Elegí un torneo para revisar el ranking."
        />
      ) : (
        <>
          <RankingMetaBar meta={meta} emptyMessage={emptyMessage} />

          <TableSection title={tab === 'live' ? 'Ranking en vivo' : 'Ranking final oficial'}>
            {loadingRanking ? (
              <Notice
                tone="info"
                title="Actualizando ranking"
                description="Estamos trayendo el snapshot más reciente del backend."
              />
            ) : (
              <RankingTable entries={entries} emptyMessage={emptyMessage ?? 'Sin datos para mostrar.'} />
            )}
          </TableSection>
        </>
      )}
    </div>
  );
}

export function AdminReportsPage() {
  const accessToken = useAccessToken();
  const { feedback, setFeedback, setError, clearFeedback } = useFeedback();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState('');
  const [selectedReportKey, setSelectedReportKey] = useState<TournamentReportType>('registrations');
  const [scope, setScope] = useState<RankingScope>('INDIVIDUAL');
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [reportRows, setReportRows] = useState<ReportRow[]>([]);
  const [reportColumns, setReportColumns] = useState<string[]>([]);
  const [reportInfo, setReportInfo] = useState<Record<string, unknown> | null>(null);
  const [exports, setExports] = useState<ExportRecord[]>([]);

  const selectedReport = REPORT_DEFINITIONS.find((item) => item.key === selectedReportKey) ?? REPORT_DEFINITIONS[0];

  async function loadCatalogs() {
    setLoadingCatalog(true);
    try {
      const response = await api.listTournaments(accessToken);
      setTournaments(response.data);
      setSelectedTournamentId((current) =>
        response.data.some((item) => item.id === current) ? current : response.data[0]?.id ?? '',
      );
    } catch (error) {
      setError(error, 'No pudimos cargar reportes');
    } finally {
      setLoadingCatalog(false);
    }
  }

  async function loadReport() {
    if (!selectedTournamentId) {
      setReportRows([]);
      setReportColumns([]);
      setReportInfo(null);
      return;
    }

    setLoadingReport(true);
    try {
      const response = await api.getTournamentReport(
        selectedTournamentId,
        selectedReport.key,
        selectedReport.supportsScope ? scope : undefined,
        accessToken,
      );
      const payload = response.data;
      const rows = extractReportRows(payload);
      const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
      setReportRows(rows);
      setReportColumns(columns);
      setReportInfo(!Array.isArray(payload) && payload && typeof payload === 'object' ? payload : null);
    } catch (error) {
      setReportRows([]);
      setReportColumns([]);
      setReportInfo(null);
      setError(
        error,
        'No pudimos cargar el reporte',
        reportFallbackMessage(error),
      );
    } finally {
      setLoadingReport(false);
    }
  }

  useEffect(() => {
    loadCatalogs();
  }, [accessToken]);

  useEffect(() => {
    loadReport();
  }, [selectedTournamentId, selectedReportKey, scope]);

  async function handleExport(format: ExportFormat) {
    if (!selectedTournamentId) {
      return;
    }

    setExportingFormat(format);
    try {
      const response = await api.createTournamentExport(
        selectedTournamentId,
        {
          exportType: selectedReport.exportType,
          format,
          scope: selectedReport.supportsScope ? scope : undefined,
        },
        accessToken,
      );
      const record = response.data;
      setExports((current) => [record, ...current.filter((item) => item.id !== record.id)]);

      if (record.status === 'READY') {
        setFeedback({
          tone: 'success',
          title: 'Exportación lista',
          description: `Ya podés descargar ${record.fileName || 'el archivo generado'}.`,
        });
      } else {
        setFeedback({
          tone: 'error',
          title: 'No pudimos generar la exportación',
          description: 'La solicitud quedó registrada, pero el archivo no se pudo preparar.',
        });
      }
    } catch (error) {
      setError(error, 'No pudimos generar la exportación');
    } finally {
      setExportingFormat(null);
    }
  }

  async function handleDownload(record: ExportRecord) {
    if (!record.downloadUrl) {
      return;
    }

    setDownloadingId(record.id);
    try {
      const blob = await downloadProtectedFile(record.downloadUrl, accessToken);
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = record.fileName || `exportacion-${record.id}.${record.format.toLowerCase()}`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      setError(error, 'No pudimos descargar la exportación');
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="section-stack">
      <PageHeader
        title="Reportes y exportaciones"
        description="Consultá reportes operativos del torneo y generá exportaciones CSV o XLSX con el mismo snapshot que entrega el backend."
        actions={
          <div className="button-row">
            <button
              type="button"
              className="button button-secondary"
              onClick={() => loadReport()}
              disabled={loadingReport || !selectedTournamentId}
            >
              {loadingReport ? 'Actualizando...' : 'Actualizar'}
            </button>
            <button
              type="button"
              className="button button-primary"
              onClick={() => handleExport('CSV')}
              disabled={Boolean(exportingFormat) || !selectedTournamentId}
            >
              {exportingFormat === 'CSV' ? 'Exportando...' : 'Exportar CSV'}
            </button>
            <button
              type="button"
              className="button button-secondary"
              onClick={() => handleExport('XLSX')}
              disabled={Boolean(exportingFormat) || !selectedTournamentId}
            >
              {exportingFormat === 'XLSX' ? 'Exportando...' : 'Exportar XLSX'}
            </button>
          </div>
        }
      />
      <Feedback feedback={feedback} onDismiss={clearFeedback} />

      <section className="admin-toolbar reports-toolbar">
        <div className="toolbar-filters reports-toolbar-filters">
          <Field label="Torneo">
            <select
              value={selectedTournamentId}
              onChange={(event) => setSelectedTournamentId(event.target.value)}
              disabled={loadingCatalog || tournaments.length === 0}
            >
              <option value="">{tournaments.length === 0 ? 'Sin torneos' : 'Seleccionar torneo'}</option>
              {tournaments.map((tournament) => (
                <option key={tournament.id} value={tournament.id}>
                  {tournament.name} - {tournamentStatusLabel(tournament.status)}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Reporte">
            <select
              value={selectedReportKey}
              onChange={(event) => setSelectedReportKey(event.target.value as TournamentReportType)}
            >
              {REPORT_DEFINITIONS.map((report) => (
                <option key={report.key} value={report.key}>
                  {report.title}
                </option>
              ))}
            </select>
          </Field>

          {selectedReport.supportsScope ? (
            <Field label="Alcance">
              <select value={scope} onChange={(event) => setScope(event.target.value as RankingScope)}>
                <option value="INDIVIDUAL">Pescador</option>
                <option value="TEAM">Equipo</option>
              </select>
            </Field>
          ) : null}
        </div>
        <div className="admin-toolbar-meta">
          <span className="admin-results-count">
            {resultLabel(reportRows.length, 'fila')}
          </span>
        </div>
      </section>

      <section className="cards-grid reports-summary-grid">
        <article className="content-card">
          <h3>{selectedReport.title}</h3>
          <p className="muted">{selectedReport.description}</p>
        </article>
        <article className="metric-card">
          <span>Filas visibles</span>
          <strong>{reportRows.length}</strong>
        </article>
      </section>

      <TableSection title="Vista previa del reporte">
        {loadingCatalog ? (
          <Notice
            tone="info"
            title="Cargando reportes"
            description="Estamos preparando el selector de torneos y reportes."
          />
        ) : !selectedTournamentId ? (
          <EmptyState
            title="Sin torneo seleccionado"
            description="Elegí un torneo para consultar reportes."
          />
        ) : loadingReport ? (
          <Notice
            tone="info"
            title="Cargando reporte"
            description="Estamos trayendo la vista consultable del backend."
          />
        ) : reportRows.length === 0 ? (
          <AdminTableEmptyState
            title="Todavía no hay datos para este reporte"
            description="Cuando el backend devuelva información para este torneo, va a aparecer acá."
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  {reportColumns.map((column) => (
                    <th key={column}>{prettifyKey(column)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reportRows.map((row, index) => (
                  <tr key={`row-${index}`}>
                    {reportColumns.map((column) => (
                      <td key={`${index}-${column}`}>{stringifyCellValue(row[column])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {reportInfo ? (
          <div className="report-meta-box">
            <strong>Metadata recibida</strong>
            <div className="report-meta-grid">
              {Object.entries(reportInfo)
                .filter(([, value]) => !Array.isArray(value) && typeof value !== 'object')
                .map(([key, value]) => (
                  <div key={key} className="link-summary">
                    <span className="muted">{prettifyKey(key)}</span>
                    <strong>{stringifyCellValue(value)}</strong>
                  </div>
                ))}
            </div>
          </div>
        ) : null}
      </TableSection>

      <TableSection title="Exportaciones generadas">
        <ExportList items={exports} onDownload={handleDownload} downloadingId={downloadingId} />
      </TableSection>
    </div>
  );
}
