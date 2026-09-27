'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  api,
  ApiError,
  fetchProtectedAssetUrl,
  type Capture,
  type CapturePayload,
  type SyncCapturePayload,
  type CaptureUpdatePayload,
  type OfficialContextTournament,
} from '@/lib/api';
import {
  deleteQueuedCapture,
  listQueuedCaptures,
  saveQueuedCapture,
  type PendingCaptureRecord,
  updateQueuedCapture,
} from '@/lib/capture-queue';
import { useAuth } from '@/components/auth-provider';
import { capturePhotoLabel } from '@/lib/capture-photo-upload';
import { AdminDrawer, EmptyState, Field, Notice } from '@/components/ui';

type CaptureFormState = {
  participantId: string;
  teamId: string;
  species: string;
  length: string;
  observation: string;
  gpsLatitude: string;
  gpsLongitude: string;
  gpsAccuracy: string;
  photoDataUrl: string | null;
  photoName: string;
  photoType: string;
};

const emptyForm: CaptureFormState = {
  participantId: '',
  teamId: '',
  species: '',
  length: '',
  observation: '',
  gpsLatitude: '',
  gpsLongitude: '',
  gpsAccuracy: '',
  photoDataUrl: null,
  photoName: '',
  photoType: '',
};

function formatDate(value?: string | null) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function captureStatusLabel(status: Capture['status']) {
  switch (status) {
    case 'PENDING_VALIDATION':
      return 'Pendiente de validación';
    case 'APPROVED':
      return 'Aprobada';
    case 'OBSERVED':
      return 'Observada';
    case 'REJECTED':
      return 'Rechazada';
    default:
      return status;
  }
}

function queueStatusLabel(status: PendingCaptureRecord['syncState']) {
  switch (status) {
    case 'PENDING_SYNC':
      return 'Pendiente de sincronización';
    case 'SYNCING':
      return 'Sincronizando';
    case 'ERROR':
      return 'Con error';
    default:
      return status;
  }
}

function validationActionLabel(action: 'APPROVE' | 'OBSERVE' | 'REJECT') {
  switch (action) {
    case 'APPROVE':
      return 'Aprobación';
    case 'OBSERVE':
      return 'Observación';
    case 'REJECT':
      return 'Rechazo';
    default:
      return action;
  }
}

function toMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    return error.message || fallback;
  }
  if (error instanceof Error) {
    return error.message || fallback;
  }
  return fallback;
}

async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function buildPayload(
  tournamentId: string,
  form: CaptureFormState,
  clientCaptureId: string,
): CapturePayload {
  return {
    clientCaptureId,
    tournamentId,
    participantId: form.participantId,
    teamId: form.teamId || undefined,
    species: form.species.trim(),
    length: Number(form.length),
    observation: form.observation.trim() || undefined,
    gps:
      form.gpsLatitude && form.gpsLongitude
        ? {
            latitude: Number(form.gpsLatitude),
            longitude: Number(form.gpsLongitude),
            accuracy: form.gpsAccuracy ? Number(form.gpsAccuracy) : undefined,
          }
        : undefined,
    media: {
      originalName: form.photoName || 'captura.jpg',
      mimeType: form.photoType || 'image/jpeg',
      dataUrl: form.photoDataUrl || '',
    },
  };
}

function buildOfflinePayload(
  tournamentId: string,
  form: CaptureFormState,
  clientCaptureId: string,
): SyncCapturePayload {
  const timestamp = new Date().toISOString();
  return {
    ...buildPayload(tournamentId, form, clientCaptureId),
    capturedAt: timestamp,
    deviceRecordedAt: timestamp,
  };
}

export function OfficialOperationsPage() {
  const { accessToken, user } = useAuth();
  const [contextTournaments, setContextTournaments] = useState<OfficialContextTournament[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState('');
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [queuedCaptures, setQueuedCaptures] = useState<PendingCaptureRecord[]>([]);
  const [form, setForm] = useState<CaptureFormState>(emptyForm);
  const [editingCapture, setEditingCapture] = useState<Capture | null>(null);
  const [selectedCapture, setSelectedCapture] = useState<Capture | null>(null);
  const [resolutionReason, setResolutionReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [locating, setLocating] = useState(false);
  const [online, setOnline] = useState(true);
  const [notice, setNotice] = useState<{
    tone: 'success' | 'error' | 'warning' | 'info';
    title: string;
    description: string;
  } | null>(null);
  const [collapsedSections, setCollapsedSections] = useState({
    offlineQueue: true,
    pendingValidation: true,
    recentCaptures: true,
  });
  const [editingImageUrl, setEditingImageUrl] = useState<string | null>(null);
  const [detailImageUrl, setDetailImageUrl] = useState<string | null>(null);

  const selectedTournament = useMemo(
    () => contextTournaments.find((tournament) => tournament.id === selectedTournamentId) ?? null,
    [contextTournaments, selectedTournamentId],
  );

  const participantOptions = selectedTournament?.participants ?? [];
  const selectedParticipant =
    participantOptions.find((participant) => participant.id === form.participantId) ?? null;

  const pendingValidationCaptures = captures.filter(
    (capture) => capture.status === 'PENDING_VALIDATION',
  );
  const myRecentCaptures = captures
    .filter((capture) => capture.official.user.id === user?.id)
    .slice(0, 8);
  const visibleQueue = queuedCaptures.filter(
    (record) => record.tournamentId === selectedTournamentId || !selectedTournamentId,
  );
  const selectedCaptureCanResolve = selectedCapture?.status === 'PENDING_VALIDATION';

  useEffect(() => {
    setOnline(typeof navigator === 'undefined' ? true : navigator.onLine);
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    void loadInitialContext();
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken || !selectedTournamentId) {
      return;
    }

    void loadCaptures(selectedTournamentId);
  }, [accessToken, selectedTournamentId]);

  useEffect(() => {
    if (!selectedParticipant) {
      return;
    }

    const preferredTeamId = selectedParticipant.teamLinks[0]?.teamId ?? '';
    setForm((current) =>
      current.teamId
        ? current
        : {
            ...current,
            teamId: preferredTeamId,
          },
    );
  }, [selectedParticipant]);

  useEffect(() => {
    if (online && accessToken) {
      void handleSyncQueue(false);
    }
  }, [online, accessToken]);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

    async function loadEditingImage() {
      if (!accessToken || !editingCapture?.media[0]) {
        setEditingImageUrl(null);
        return;
      }

      try {
        objectUrl = await fetchProtectedAssetUrl(editingCapture.media[0].download_path, accessToken);
        if (active) {
          setEditingImageUrl(objectUrl);
        }
      } catch {
        if (active) {
          setEditingImageUrl(null);
        }
      }
    }

    void loadEditingImage();

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [accessToken, editingCapture]);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

    async function loadDetailImage() {
      if (!accessToken || !selectedCapture?.media[0]) {
        setDetailImageUrl(null);
        return;
      }

      try {
        objectUrl = await fetchProtectedAssetUrl(selectedCapture.media[0].download_path, accessToken);
        if (active) {
          setDetailImageUrl(objectUrl);
        }
      } catch {
        if (active) {
          setDetailImageUrl(null);
        }
      }
    }

    void loadDetailImage();

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [accessToken, selectedCapture]);

  async function loadInitialContext() {
    if (!accessToken) {
      return;
    }

    setLoading(true);
    try {
      const [contextResponse, queue] = await Promise.all([
        api.getOfficialCaptureContext(accessToken),
        listQueuedCaptures(),
      ]);
      const tournaments = contextResponse.data.tournaments;
      setContextTournaments(tournaments);
      setQueuedCaptures(queue);
      if (!selectedTournamentId && tournaments[0]) {
        setSelectedTournamentId(tournaments[0].id);
      }
    } catch (error) {
      setNotice({
        tone: 'error',
        title: 'No pudimos cargar la operación',
        description: toMessage(error, 'Revisá el acceso y volvé a intentar.'),
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadCaptures(tournamentId: string) {
    if (!accessToken) {
      return;
    }

    try {
      const response = await api.listCaptures({ tournamentId }, accessToken);
      setCaptures(response.data);
    } catch (error) {
      setNotice({
        tone: 'error',
        title: 'No pudimos actualizar las capturas',
        description: toMessage(error, 'Volvé a intentar en unos segundos.'),
      });
    }
  }

  async function refreshQueue() {
    const queue = await listQueuedCaptures();
    setQueuedCaptures(queue);
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingCapture(null);
  }

  async function handlePhotoSelected(file: File | null) {
    if (!file) {
      setForm((current) => ({
        ...current,
        photoDataUrl: null,
        photoName: '',
        photoType: '',
      }));
      return;
    }

    const dataUrl = await fileToDataUrl(file);
    setForm((current) => ({
      ...current,
      photoDataUrl: dataUrl,
      photoName: file.name,
      photoType: file.type || 'image/jpeg',
    }));
  }

  async function handleUseLocation() {
    if (!navigator.geolocation) {
      setNotice({
        tone: 'warning',
        title: 'GPS no disponible',
        description: 'Este navegador no permite recuperar ubicación.',
      });
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((current) => ({
          ...current,
          gpsLatitude: String(position.coords.latitude),
          gpsLongitude: String(position.coords.longitude),
          gpsAccuracy: String(Math.round(position.coords.accuracy)),
        }));
        setLocating(false);
      },
      () => {
        setNotice({
          tone: 'warning',
          title: 'No pudimos leer el GPS',
          description: 'Podés seguir sin ubicación o volver a intentarlo.',
        });
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function handleSubmitCapture(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken || !selectedTournamentId) {
      return;
    }

    if (!form.participantId || !form.species.trim() || !form.length) {
      setNotice({
        tone: 'error',
        title: 'Faltan datos',
        description: 'Completá participante, especie y longitud antes de guardar.',
      });
      return;
    }

    if (!editingCapture && !form.photoDataUrl) {
      setNotice({
        tone: 'error',
        title: 'Falta la foto',
        description: 'La foto es obligatoria para registrar la captura.',
      });
      return;
    }

    setSubmitting(true);
    setNotice(null);

    try {
      if (editingCapture) {
        const payload: CaptureUpdatePayload = {
          participantId: form.participantId,
          teamId: form.teamId || undefined,
          species: form.species.trim(),
          length: Number(form.length),
          observation: form.observation.trim() || undefined,
          gps:
            form.gpsLatitude && form.gpsLongitude
              ? {
                  latitude: Number(form.gpsLatitude),
                  longitude: Number(form.gpsLongitude),
                  accuracy: form.gpsAccuracy ? Number(form.gpsAccuracy) : undefined,
                }
              : undefined,
          media: form.photoDataUrl
            ? {
                originalName: form.photoName,
                mimeType: form.photoType,
                dataUrl: form.photoDataUrl,
              }
            : undefined,
        };

        await api.updateCapture(editingCapture.id, payload, accessToken);
        await loadCaptures(selectedTournamentId);
        resetForm();
        setNotice({
          tone: 'success',
          title: 'Captura actualizada',
          description: 'Los cambios quedaron guardados mientras sigue pendiente.',
        });
      } else {
        const payload = buildPayload(
          selectedTournamentId,
          form,
          typeof crypto !== 'undefined' ? crypto.randomUUID() : `${Date.now()}`,
        );

        if (!online) {
          const offlinePayload = buildOfflinePayload(
            selectedTournamentId,
            form,
            payload.clientCaptureId,
          );
          await saveQueuedCapture({
            ...offlinePayload,
            id: offlinePayload.clientCaptureId,
            createdAt: new Date().toISOString(),
            syncState: 'PENDING_SYNC',
            lastError: null,
          });
          await refreshQueue();
          resetForm();
          setNotice({
            tone: 'warning',
            title: 'Guardada sin conexión',
            description: 'La captura quedó pendiente de sincronización.',
          });
        } else {
          await api.createCapture(payload, accessToken);
          await loadCaptures(selectedTournamentId);
          resetForm();
          setNotice({
            tone: 'success',
            title: 'Captura registrada',
            description: 'La captura quedó registrada y pendiente de validación.',
          });
        }
      }
    } catch (error) {
      setNotice({
        tone: 'error',
        title: 'No pudimos guardar la captura',
        description: toMessage(error, 'Revisá los datos y volvé a intentar.'),
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSyncQueue(showSuccess = true) {
    if (!accessToken) {
      return;
    }

    const items = await listQueuedCaptures();
    if (items.length === 0) {
      return;
    }

    setSyncing(true);
    for (const item of items) {
      await updateQueuedCapture(item.id, { syncState: 'SYNCING', lastError: null });
    }
    await refreshQueue();

    try {
      const response = await api.syncCaptures({ items }, accessToken);
      for (const result of response.data.items) {
        if (result.status === 'accepted' || result.status === 'duplicate') {
          await deleteQueuedCapture(result.client_capture_id);
        } else {
          await updateQueuedCapture(result.client_capture_id, {
            syncState: 'ERROR',
            lastError: result.error ?? 'No pudimos sincronizar esta captura.',
          });
        }
      }

      await refreshQueue();
      if (selectedTournamentId) {
        await loadCaptures(selectedTournamentId);
      }

      if (showSuccess) {
        setNotice({
          tone: 'success',
          title: 'Sincronización actualizada',
          description: 'Revisá la cola para ver qué capturas ya quedaron en servidor.',
        });
      }
    } catch (error) {
      for (const item of items) {
        await updateQueuedCapture(item.id, {
          syncState: 'ERROR',
          lastError: toMessage(error, 'No pudimos sincronizar esta captura.'),
        });
      }
      await refreshQueue();
      if (showSuccess) {
        setNotice({
          tone: 'error',
          title: 'No pudimos sincronizar',
          description: toMessage(error, 'Intentá nuevamente cuando vuelva la conexión.'),
        });
      }
    } finally {
      setSyncing(false);
    }
  }

  function startEditingCapture(capture: Capture) {
    setEditingCapture(capture);
    setForm({
      participantId: capture.participant.id,
      teamId: capture.team?.id ?? '',
      species: capture.species,
      length: String(capture.length),
      observation: capture.observation ?? '',
      gpsLatitude: capture.gps?.latitude ? String(capture.gps.latitude) : '',
      gpsLongitude: capture.gps?.longitude ? String(capture.gps.longitude) : '',
      gpsAccuracy: capture.gps?.accuracy ? String(capture.gps.accuracy) : '',
      photoDataUrl: null,
      photoName: '',
      photoType: '',
    });
    setNotice(null);
  }

  async function handleResolveCapture(action: 'approve' | 'observe' | 'reject') {
    if (!accessToken || !selectedCapture) {
      return;
    }

    if ((action === 'observe' || action === 'reject') && !resolutionReason.trim()) {
      setNotice({
        tone: 'error',
        title: 'Falta el motivo',
        description: 'Indicá el motivo antes de observar o rechazar.',
      });
      return;
    }

    setSubmitting(true);
    try {
      if (action === 'approve') {
        await api.approveCapture(selectedCapture.id, accessToken);
      } else if (action === 'observe') {
        await api.observeCapture(selectedCapture.id, resolutionReason.trim(), accessToken);
      } else {
        await api.rejectCapture(selectedCapture.id, resolutionReason.trim(), accessToken);
      }

      if (selectedTournamentId) {
        await loadCaptures(selectedTournamentId);
      }
      setSelectedCapture(null);
      setResolutionReason('');
      setNotice({
        tone: 'success',
        title: 'Validación guardada',
        description: 'La captura salió de la bandeja pendiente.',
      });
    } catch (error) {
      setNotice({
        tone: 'error',
        title: 'No pudimos validar la captura',
        description: toMessage(error, 'Volvé a intentar en unos segundos.'),
      });
    } finally {
      setSubmitting(false);
    }
  }

  function toggleSection(section: 'offlineQueue' | 'pendingValidation' | 'recentCaptures') {
    setCollapsedSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  }

  if (loading) {
    return (
      <section className="page-section">
        <div className="page-header">
          <h1>Operación fiscal</h1>
          <p>Estamos preparando la captura y la validación para tu jornada.</p>
        </div>
      </section>
    );
  }

  return (
    <div className="section-stack official-operations-layout">
      <div className="page-header">
        <h1>Operación fiscal</h1>
      </div>

      {notice ? (
        <Notice
          tone={notice.tone}
          title={notice.title}
          description={notice.description}
          onDismiss={() => setNotice(null)}
        />
      ) : null}

      {!online ? (
        <Notice
          tone="warning"
          title="Sin conexión"
          description="Estás sin conexión. La captura se guardará en este dispositivo."
        />
      ) : null}

      <section className="surface section-stack">
        <div className="official-toolbar">
          <Field label="Torneo activo">
            <select
              value={selectedTournamentId}
              onChange={(event) => {
                setSelectedTournamentId(event.target.value);
                resetForm();
              }}
            >
              {contextTournaments.map((tournament) => (
                <option key={tournament.id} value={tournament.id}>
                  {tournament.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="button-row official-toolbar-actions">
            <button
              type="button"
              className="button button-secondary"
              onClick={() => void loadInitialContext()}
            >
              Actualizar contexto
            </button>
            <button
              type="button"
              className="button button-primary"
              onClick={() => void handleSyncQueue(true)}
              disabled={syncing || queuedCaptures.length === 0 || !online}
            >
              {syncing ? 'Sincronizando...' : 'Sincronizar pendientes'}
            </button>
          </div>
        </div>

        {selectedTournament ? (
          <div className="grid-3 official-summary-grid">
            <div className="metric-card official-metric">
              <strong>{participantOptions.length}</strong>
              <span>participantes habilitados</span>
            </div>
            <div className="metric-card official-metric">
              <strong>{pendingValidationCaptures.length}</strong>
              <span>pendientes de validación</span>
            </div>
            <div className="metric-card official-metric">
              <strong>{visibleQueue.length}</strong>
              <span>pendientes de sincronización</span>
            </div>
          </div>
        ) : (
          <EmptyState
            title="Sin torneos asignados"
            description="Todavía no hay un torneo operativo para este fiscal."
          />
        )}
      </section>

      {selectedTournament ? (
        <>
          <div className="official-task-grid">
          <section className="surface section-stack official-capture-surface">
            <div>
              <h2>{editingCapture ? 'Editar captura pendiente' : 'Nueva captura'}</h2>
              <p>
                Cargá evidencia mínima y dejá la captura lista para revisión del torneo.
              </p>
            </div>

            <form className="form-stack" onSubmit={handleSubmitCapture}>
              <div className="grid-2">
                <Field label="Participante">
                  <select
                    value={form.participantId}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        participantId: event.target.value,
                        teamId: '',
                      }))
                    }
                    required
                  >
                    <option value="">Seleccionar participante</option>
                    {participantOptions.map((participant) => (
                      <option key={participant.id} value={participant.id}>
                        {participant.firstName} {participant.lastName}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Equipo asociado">
                  <select
                    value={form.teamId}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, teamId: event.target.value }))
                    }
                  >
                    <option value="">Sin equipo</option>
                    {selectedParticipant?.teamLinks.map((link) => (
                      <option key={link.id} value={link.teamId}>
                        {link.team?.name ?? 'Equipo asociado'}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="grid-2">
                <Field label="Especie">
                  <input
                    value={form.species}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, species: event.target.value }))
                    }
                    placeholder="Ej. Dorado"
                    required
                  />
                </Field>
                <Field label="Longitud (cm)">
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={form.length}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, length: event.target.value }))
                    }
                    required
                  />
                </Field>
              </div>

              <Field label="Observaciones">
                <textarea
                  value={form.observation}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, observation: event.target.value }))
                  }
                  placeholder="Dato adicional para la validación, si hace falta."
                />
              </Field>

              <div className="grid-3">
                <Field label="Latitud">
                  <input
                    value={form.gpsLatitude}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, gpsLatitude: event.target.value }))
                    }
                    placeholder="-34.12345"
                  />
                </Field>
                <Field label="Longitud">
                  <input
                    value={form.gpsLongitude}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, gpsLongitude: event.target.value }))
                    }
                    placeholder="-58.12345"
                  />
                </Field>
                <Field label="Precisión (m)">
                  <input
                    value={form.gpsAccuracy}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, gpsAccuracy: event.target.value }))
                    }
                    placeholder="12"
                  />
                </Field>
              </div>

              <div className="button-row">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => void handleUseLocation()}
                  disabled={locating}
                >
                  {locating ? 'Buscando GPS...' : 'Usar mi ubicación'}
                </button>
              </div>

              <Field label="Foto obligatoria">
                <div className="file-upload">
                  <input
                    id="capture-photo"
                    className="file-upload-input"
                    type="file"
                    accept="image/*"
                    onChange={(event) => void handlePhotoSelected(event.target.files?.[0] ?? null)}
                  />
                  <label htmlFor="capture-photo" className="file-upload-trigger">
                    <span aria-hidden="true">＋</span>
                    <span>{form.photoName || editingCapture?.media[0] ? 'Cambiar foto' : 'Seleccionar foto'}</span>
                  </label>
                  <span className="file-upload-status" aria-live="polite">
                    {capturePhotoLabel(form.photoName, Boolean(editingCapture?.media[0]))}
                  </span>
                </div>
              </Field>

              {form.photoDataUrl ? (
                <div className="capture-photo-preview">
                  <img src={form.photoDataUrl} alt="Vista previa de la captura" />
                </div>
              ) : editingCapture?.media[0] ? (
                <div className="capture-photo-preview">
                  {editingImageUrl ? <img src={editingImageUrl} alt="Evidencia actual" /> : null}
                </div>
              ) : null}

              <div className="button-row">
                <button type="submit" className="button button-primary" disabled={submitting}>
                  {submitting
                    ? 'Guardando...'
                    : editingCapture
                      ? 'Guardar cambios'
                      : online
                        ? 'Registrar captura'
                        : 'Guardar sin conexión'}
                </button>
                {editingCapture ? (
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={resetForm}
                    disabled={submitting}
                  >
                    Cancelar edición
                  </button>
                ) : null}
              </div>
            </form>
          </section>

          <div className="official-status-stack">
          <section className="surface section-stack">
            <div>
              <h2>Cola offline</h2>
              <p>Las capturas locales quedan visibles hasta que puedan viajar al servidor.</p>
            </div>
            <button
              type="button"
              className="button button-secondary"
              onClick={() => toggleSection('offlineQueue')}
              aria-expanded={!collapsedSections.offlineQueue}
            >
              {collapsedSections.offlineQueue ? 'Mostrar' : 'Ocultar'}
            </button>

            {!collapsedSections.offlineQueue ? visibleQueue.length === 0 ? (
              <EmptyState
                title="Sin pendientes locales"
                description="No hay capturas guardadas en este dispositivo para este torneo."
              />
            ) : (
              <div className="official-list">
                {visibleQueue.map((record) => (
                  <article key={record.id} className="official-card">
                    <div className="official-card-top">
                      <div>
                        <strong>{record.species}</strong>
                        <p className="muted">
                          {record.length} cm · {formatDate(record.createdAt)}
                        </p>
                      </div>
                      <span className="pill">{queueStatusLabel(record.syncState)}</span>
                    </div>
                    {record.lastError ? <p className="muted">{record.lastError}</p> : null}
                  </article>
                ))}
              </div>
            ) : null}
          </section>

          <section className="surface section-stack">
            <div>
              <h2>Capturas pendientes de validación</h2>
              <p>Revisá evidencia y resolvé con trazabilidad desde el mismo torneo.</p>
            </div>

            <button
              type="button"
              className="button button-secondary"
              onClick={() => toggleSection('pendingValidation')}
              aria-expanded={!collapsedSections.pendingValidation}
            >
              {collapsedSections.pendingValidation ? 'Mostrar' : 'Ocultar'}
            </button>

            {!collapsedSections.pendingValidation ? pendingValidationCaptures.length === 0 ? (
              <EmptyState
                title="Sin pendientes"
                description="No hay capturas abiertas para validar en este torneo."
              />
            ) : (
              <div className="official-list">
                {pendingValidationCaptures.map((capture) => (
                  <article key={capture.id} className="official-card">
                    <div className="official-card-top">
                      <div>
                        <strong>
                          {capture.participant.firstName} {capture.participant.lastName}
                        </strong>
                        <p className="muted">
                          {capture.species} · {capture.length} cm · {formatDate(capture.captured_at)}
                        </p>
                      </div>
                      <span className="pill">{captureStatusLabel(capture.status)}</span>
                    </div>
                    <div className="button-row">
                      <button
                        type="button"
                        className="button button-secondary"
                        onClick={() => {
                          setSelectedCapture(capture);
                          setResolutionReason('');
                        }}
                      >
                        Ver detalle
                      </button>
                      {capture.official.user.id === user?.id ? (
                        <button
                          type="button"
                          className="button button-secondary"
                          onClick={() => startEditingCapture(capture)}
                        >
                          Editar
                        </button>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </section>

          <section className="surface section-stack">
            <div>
              <h2>Capturas recientes</h2>
              <p>Tu historial inmediato ayuda a revisar qué ya quedó en circuito.</p>
            </div>

            <button
              type="button"
              className="button button-secondary"
              onClick={() => toggleSection('recentCaptures')}
              aria-expanded={!collapsedSections.recentCaptures}
            >
              {collapsedSections.recentCaptures ? 'Mostrar' : 'Ocultar'}
            </button>

            {!collapsedSections.recentCaptures ? myRecentCaptures.length === 0 ? (
              <EmptyState
                title="Todavía no cargaste capturas"
                description="Las nuevas capturas van a aparecer acá apenas queden guardadas."
              />
            ) : (
              <div className="official-list">
                {myRecentCaptures.map((capture) => (
                  <article key={capture.id} className="official-card">
                    <div className="official-card-top">
                      <div>
                        <strong>{capture.species}</strong>
                        <p className="muted">
                          {capture.participant.firstName} {capture.participant.lastName} ·{' '}
                          {formatDate(capture.captured_at)}
                        </p>
                      </div>
                      <span className="pill">{captureStatusLabel(capture.status)}</span>
                    </div>
                    <div className="button-row">
                      <button
                        type="button"
                        className="button button-secondary"
                        onClick={() => {
                          setSelectedCapture(capture);
                          setResolutionReason('');
                        }}
                      >
                        Ver detalle
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </section>
          </div>
          </div>
        </>
      ) : null}

      <AdminDrawer
        open={Boolean(selectedCapture)}
        title={selectedCaptureCanResolve ? 'Validar captura' : 'Detalle de captura'}
        description={
          selectedCaptureCanResolve
            ? 'Revisa la evidencia y resolve el estado de esta captura.'
            : 'Revisa lo que ya quedo registrado para esta captura.'
        }
        onClose={() => {
          setSelectedCapture(null);
          setResolutionReason('');
        }}
        size="medium"
      >
        {selectedCapture ? (
          <div className="section-stack">
            <div className="content-card capture-detail-card">
              <strong>
                {selectedCapture.participant.firstName} {selectedCapture.participant.lastName}
              </strong>
              <span className="muted">
                {selectedCapture.species} · {selectedCapture.length} cm
              </span>
              <span className="muted">Tomada: {formatDate(selectedCapture.captured_at)}</span>
              {selectedCapture.observation ? (
                <p className="muted">{selectedCapture.observation}</p>
              ) : null}
            </div>

            {selectedCapture.validations[0] ? (
              <div className="content-card capture-detail-card">
                <div className="section-heading">
                  <h3>Última validación</h3>
                </div>
                <dl className="detail-grid">
                  <div>
                    <dt>Estado</dt>
                    <dd>{captureStatusLabel(selectedCapture.status)}</dd>
                  </div>
                  <div>
                    <dt>Acción</dt>
                    <dd>{validationActionLabel(selectedCapture.validations[0].action)}</dd>
                  </div>
                  <div>
                    <dt>Fecha</dt>
                    <dd>{formatDate(selectedCapture.validations[0].validated_at)}</dd>
                  </div>
                  <div>
                    <dt>Validó</dt>
                    <dd>
                      {selectedCapture.validations[0].validated_by.firstName}{' '}
                      {selectedCapture.validations[0].validated_by.lastName}
                    </dd>
                  </div>
                  <div className="detail-grid-span">
                    <dt>Motivo</dt>
                    <dd>{selectedCapture.validations[0].reason || 'Sin motivo cargado.'}</dd>
                  </div>
                </dl>
              </div>
            ) : null}

            {selectedCapture.media[0] ? (
              <div className="capture-photo-preview capture-photo-preview-large">
                {detailImageUrl ? <img src={detailImageUrl} alt="Evidencia de captura" /> : null}
              </div>
            ) : null}
            {selectedCaptureCanResolve ? (
              <>
                <Field label="Motivo para observar o rechazar">
                  <textarea
                    value={resolutionReason}
                    onChange={(event) => setResolutionReason(event.target.value)}
                    placeholder="Explica que se encontro para dejar trazabilidad."
                  />
                </Field>

                <div className="button-row">
                  <button
                    type="button"
                    className="button button-primary"
                    onClick={() => void handleResolveCapture('approve')}
                    disabled={submitting}
                  >
                    Aprobar captura
                  </button>
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => void handleResolveCapture('observe')}
                    disabled={submitting}
                  >
                    Observar
                  </button>
                  <button
                    type="button"
                    className="button button-danger"
                    onClick={() => void handleResolveCapture('reject')}
                    disabled={submitting}
                  >
                    Rechazar
                  </button>
                </div>
              </>
            ) : null}
          </div>
        ) : null}
      </AdminDrawer>
    </div>
  );
}
