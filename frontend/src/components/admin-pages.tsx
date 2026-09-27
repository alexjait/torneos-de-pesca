'use client';

import {
  useEffect,
  useState,
  type Dispatch,
  type FormEvent,
  type ReactNode,
  type SetStateAction,
} from 'react';
import {
  api,
  ApiError,
  type Boat,
  type Official,
  type Participant,
  type Team,
  type Tournament,
} from '@/lib/api';
import { useAuth } from '@/components/auth-provider';
import { SortableTableHeader } from '@/components/sortable-table-header';
import {
  AdminDrawer,
  AdminTableEmptyState,
  AdminToolbar,
  ConfirmDialog,
  EmptyState,
  Field,
  Notice,
} from '@/components/ui';
import {
  accountStatusLabel,
  toUserMessage,
  tournamentStatusLabel,
} from '@/lib/labels';
import { nextSortState, sortRows, type SortState } from '@/lib/table-sorting';

type FeedbackState = {
  tone: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description: string;
} | null;

type CatalogFormState = Record<string, string>;

type CatalogColumn<TItem> = {
  header: string;
  render: (item: TItem) => ReactNode;
  sortValue: (item: TItem) => string | number | null | undefined;
};

type TournamentSortColumn = 'name' | 'eventDate' | 'location' | 'status';
type ParticipantSortColumn = 'person' | 'account' | 'links';
type OfficialSortColumn = 'official' | 'account' | 'assignments';

function useAccessToken() {
  const { accessToken } = useAuth();
  if (!accessToken) {
    throw new Error('No hay token de acceso disponible.');
  }
  return accessToken;
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

function formatDate(date: string | null | undefined) {
  if (!date) {
    return 'Sin fecha';
  }

  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date));
}

function toDateTimeLocal(value: string | null | undefined) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  const timezoneOffset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - timezoneOffset * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function buildMap<TItem extends { id: string }>(items: TItem[]) {
  return Object.fromEntries(items.map((item) => [item.id, item])) as Record<string, TItem>;
}

function randomTemporaryPassword() {
  return `Tmp-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
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

function compactRelationLabel(count: number, singular: string, plural = `${singular}s`) {
  if (count === 0) {
    return `Sin ${singular}`;
  }

  return resultLabel(count, singular, plural);
}

function participantLinksSummary(teamCount: number, boatCount: number) {
  const parts: string[] = [];

  if (teamCount > 0) {
    parts.push(resultLabel(teamCount, 'equipo', 'equipos'));
  }

  if (boatCount > 0) {
    parts.push(resultLabel(boatCount, 'embarcación', 'embarcaciones'));
  }

  return parts.length > 0 ? parts.join(' · ') : 'Sin vínculos';
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

function DetailPanel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <aside className="content-card detail-panel">
      <div className="section-heading">
        <h3>{title}</h3>
        <p className="muted">{description}</p>
      </div>
      <div className="detail-panel-content">{children}</div>
    </aside>
  );
}

function resetTournamentForm() {
  return {
    id: '',
    name: '',
    eventDate: '',
    location: '',
    status: 'DRAFT',
    rulesSummary: '',
    startAt: '',
    fishingStartAt: '',
    fishingEndAt: '',
    validationDeadlineAt: '',
  };
}

function resetParticipantForm() {
  return {
    id: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    documentId: '',
    enabledToCompete: false,
  };
}

function resetOfficialForm() {
  return {
    id: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    documentId: '',
  };
}

export function AdminDashboardPage() {
  const accessToken = useAccessToken();
  const { feedback, setFeedback, setError, clearFeedback } = useFeedback();
  const [loading, setLoading] = useState(true);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [boats, setBoats] = useState<Boat[]>([]);
  const [officials, setOfficials] = useState<Official[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [t, p, tm, b, o] = await Promise.all([
          api.listTournaments(accessToken),
          api.listParticipants(accessToken),
          api.listTeams(accessToken),
          api.listBoats(accessToken),
          api.listOfficials(accessToken),
        ]);
        setTournaments(t.data);
        setParticipants(p.data);
        setTeams(tm.data);
        setBoats(b.data);
        setOfficials(o.data);
      } catch (error) {
        setError(error, 'No pudimos cargar la vista general');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [accessToken]);

  const pendingAccounts = [
    ...participants.filter((participant) => participant.user?.accountStatus === 'PENDING_EMAIL_VERIFICATION'),
    ...officials.filter((official) => official.user.accountStatus === 'PENDING_EMAIL_VERIFICATION'),
  ].length;

  return (
    <div className="section-stack">
      <PageHeader
        title="Administración"
        description="Resumen general de torneos, personas y cuentas para seguir operando desde una sola vista."
        actions={
          <button
            type="button"
            className="button button-secondary"
            onClick={() =>
              setFeedback({
                tone: 'info',
                title: 'Activación de cuentas',
                description:
                  'Verificá que el enlace de activación abra esta web para que cada persona complete el acceso desde acá.',
              })
            }
          >
            Ver recordatorio
          </button>
        }
      />

      <Feedback feedback={feedback} onDismiss={clearFeedback} />

      {loading ? (
        <Notice
          tone="info"
          title="Cargando vista general"
          description="Estamos preparando el resumen con torneos, personas, embarcaciones y fiscales."
        />
      ) : null}

      <section className="cards-grid">
        <article className="metric-card">
          <span>Torneos disponibles</span>
          <strong>{tournaments.filter((item) => item.status !== 'CLOSED').length}</strong>
        </article>
        <article className="metric-card">
          <span>Participantes registrados</span>
          <strong>{participants.length}</strong>
        </article>
        <article className="metric-card">
          <span>Fiscales activos</span>
          <strong>{officials.length}</strong>
        </article>
        <article className="metric-card">
          <span>Cuentas pendientes</span>
          <strong>{pendingAccounts}</strong>
        </article>
      </section>

      <section className="cards-grid">
        <article className="content-card">
          <h3>En esta etapa</h3>
          <div className="stack-list">
            <span className="pill">Acceso por cuenta</span>
            <span className="pill">Gestión administrativa</span>
            <span className="pill">Asignación de fiscales</span>
          </div>
          <p className="muted" style={{ marginTop: 16 }}>
            Desde acá podés revisar rápidamente la base activa y detectar qué cuentas todavía falta activar.
          </p>
        </article>

        <article className="content-card">
          <h3>Vista operativa</h3>
          <div className="stack-list">
            <span className="pill">{teams.length} equipos disponibles</span>
            <span className="pill">{boats.length} embarcaciones registradas</span>
            <span className="pill">
              {officials.reduce((total, official) => total + official.tournamentAssignments.length, 0)} asignaciones de fiscales
            </span>
          </div>
        </article>
      </section>
    </div>
  );
}

export function TournamentsPage() {
  const accessToken = useAccessToken();
  const { feedback, setFeedback, setError, clearFeedback } = useFeedback();
  const [items, setItems] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ id: string; action: 'delete' | 'close' } | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [sortState, setSortState] = useState<SortState<TournamentSortColumn>>({
    column: 'eventDate',
    direction: 'desc',
  });
  const [form, setForm] = useState(resetTournamentForm());

  async function load() {
    setLoading(true);
    try {
      const response = await api.listTournaments(accessToken);
      setItems(response.data);
    } catch (error) {
      setError(error, 'No pudimos cargar los torneos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [accessToken]);

  const filteredItems = items.filter((item) =>
    [item.name, item.location, tournamentStatusLabel(item.status)].some((value) =>
      normalizeText(value).includes(normalizeText(search)),
    ),
  );
  const sortedItems = sortRows(filteredItems, sortState, (item, column) => {
    switch (column) {
      case 'name':
        return item.name;
      case 'eventDate':
        return item.eventDate;
      case 'location':
        return item.location;
      case 'status':
        return tournamentStatusLabel(item.status);
    }
  });

  function requestSort(column: TournamentSortColumn) {
    setSortState((current) => nextSortState(current, column));
  }

  function openCreateDrawer() {
    setForm(resetTournamentForm());
    setDrawerOpen(true);
  }

  function openEditDrawer(item: Tournament) {
    const schedule = item.schedules?.[0];
    setForm({
      id: item.id,
      name: item.name,
      eventDate: toDateTimeLocal(item.eventDate),
      location: item.location,
      status: item.status,
      rulesSummary: item.rulesSummary ?? '',
      startAt: toDateTimeLocal(schedule?.startAt),
      fishingStartAt: toDateTimeLocal(schedule?.fishingStartAt),
      fishingEndAt: toDateTimeLocal(schedule?.fishingEndAt),
      validationDeadlineAt: toDateTimeLocal(schedule?.validationDeadlineAt),
    });
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setForm(resetTournamentForm());
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyId(form.id || 'new');

    try {
      const payload = {
        name: form.name,
        eventDate: new Date(form.eventDate).toISOString(),
        location: form.location,
        status: form.status,
        rulesSummary: form.rulesSummary || undefined,
      };
      const schedulePayload = {
        startAt: form.startAt ? new Date(form.startAt).toISOString() : undefined,
        fishingStartAt: form.fishingStartAt
          ? new Date(form.fishingStartAt).toISOString()
          : undefined,
        fishingEndAt: form.fishingEndAt ? new Date(form.fishingEndAt).toISOString() : undefined,
        validationDeadlineAt: form.validationDeadlineAt
          ? new Date(form.validationDeadlineAt).toISOString()
          : undefined,
      };

      if (form.id) {
        await api.updateTournament(form.id, payload, accessToken);
        await api.updateTournamentSchedule(form.id, schedulePayload, accessToken);
        setFeedback({
          tone: 'success',
          title: 'Torneo actualizado',
          description: 'Los cambios ya quedaron guardados.',
        });
      } else {
        const created = await api.createTournament(payload, accessToken);
        await api.updateTournamentSchedule(created.data.id, schedulePayload, accessToken);
        setFeedback({
          tone: 'success',
          title: 'Torneo creado',
          description: 'Ya aparece en el listado para seguir configurándolo.',
        });
      }

      closeDrawer();
      await load();
    } catch (error) {
      setError(error, 'No pudimos guardar el torneo');
    } finally {
      setBusyId(null);
    }
  }

  async function handleConfirm() {
    if (!confirm) {
      return;
    }

    setBusyId(confirm.id);

    try {
      if (confirm.action === 'close') {
        await api.closeTournament(confirm.id, accessToken);
        setFeedback({
          tone: 'success',
          title: 'Torneo cerrado',
          description: 'El torneo quedó cerrado y ya no admite cambios operativos.',
        });
      } else {
        await api.deleteTournament(confirm.id, accessToken);
        setFeedback({
          tone: 'success',
          title: 'Torneo dado de baja',
          description: 'El torneo ya no aparece entre los activos.',
        });
      }

      await load();
    } catch (error) {
      setError(error, 'No pudimos completar la acción');
    } finally {
      setBusyId(null);
      setConfirm(null);
    }
  }

  return (
    <div className="section-stack">
      <PageHeader
        title="Torneos"
        description="Consultá el calendario, editá datos generales y resolvé el alta o cierre sin perder el contexto del listado."
        actions={
          <button type="button" className="button button-primary" onClick={openCreateDrawer}>
            Nuevo torneo
          </button>
        }
      />
      <Feedback feedback={feedback} onDismiss={clearFeedback} />

      <AdminToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por nombre, ubicación o estado"
        resultLabel={resultLabel(filteredItems.length, 'torneo')}
      />

      <TableSection title="Listado">
        {loading ? (
          <Notice
            tone="info"
            title="Cargando torneos"
            description="Estamos trayendo el listado para que puedas revisarlo."
          />
        ) : items.length === 0 ? (
          <AdminTableEmptyState
            title="Todavía no hay torneos cargados"
            description="Creá el primero para empezar a organizar la temporada."
            action={
              <button type="button" className="button button-primary" onClick={openCreateDrawer}>
                Nuevo torneo
              </button>
            }
          />
        ) : filteredItems.length === 0 ? (
          <AdminTableEmptyState
            title="No encontramos resultados"
            description="Probá con otro nombre, ubicación o estado."
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <SortableTableHeader column="name" label="Torneo" state={sortState} onSort={requestSort} />
                  <SortableTableHeader column="eventDate" label="Fecha" state={sortState} onSort={requestSort} />
                  <SortableTableHeader column="location" label="Ubicación" state={sortState} onSort={requestSort} />
                  <SortableTableHeader column="status" label="Estado" state={sortState} onSort={requestSort} />
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.name}</strong>
                      <div className="muted">{item.rulesSummary || 'Sin resumen cargado'}</div>
                    </td>
                    <td>{formatDate(item.eventDate)}</td>
                    <td>{item.location}</td>
                    <td>
                      <span className="pill">{tournamentStatusLabel(item.status)}</span>
                    </td>
                    <td>
                      <div className="button-row">
                        <button
                          type="button"
                          className="button button-secondary"
                          onClick={() => openEditDrawer(item)}
                        >
                          Editar
                        </button>
                        {item.status !== 'CLOSED' ? (
                          <button
                            type="button"
                            className="button button-ghost"
                            onClick={() => setConfirm({ id: item.id, action: 'close' })}
                          >
                            Cerrar torneo
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="button button-danger button-danger-subtle"
                          onClick={() => setConfirm({ id: item.id, action: 'delete' })}
                        >
                          Dar de baja
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </TableSection>

      <AdminDrawer
        open={drawerOpen}
        title={form.id ? 'Editar torneo' : 'Nuevo torneo'}
        description="Completá los datos principales y guardá para volver al listado."
        onClose={closeDrawer}
        size="wide"
        footer={
          <div className="button-row">
            <button type="submit" form="tournament-form" className="button button-primary" disabled={Boolean(busyId)}>
              {busyId === (form.id || 'new') ? 'Guardando...' : 'Guardar'}
            </button>
            <button type="button" className="button button-secondary" onClick={closeDrawer}>
              Cancelar
            </button>
          </div>
        }
      >
        <form id="tournament-form" className="form-stack" onSubmit={handleSubmit}>
          <div className="grid-2">
            <Field label="Nombre">
              <input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                required
              />
            </Field>
            <Field label="Fecha y hora">
              <input
                type="datetime-local"
                value={form.eventDate}
                onChange={(event) => setForm((current) => ({ ...current, eventDate: event.target.value }))}
                required
              />
            </Field>
          </div>

          <div className="grid-2">
            <Field label="Ubicación">
              <input
                value={form.location}
                onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
                required
              />
            </Field>
            <Field label="Estado">
              <select
                value={form.status}
                onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
              >
                <option value="DRAFT">Borrador</option>
                <option value="PUBLISHED">Publicado</option>
                <option value="ACTIVE">Activo</option>
                <option value="CLOSED">Cerrado</option>
              </select>
            </Field>
          </div>

          <Field label="Resumen">
            <textarea
              value={form.rulesSummary}
              onChange={(event) => setForm((current) => ({ ...current, rulesSummary: event.target.value }))}
              placeholder="Agregá un resumen breve para identificar este torneo."
            />
          </Field>

          <div className="section-heading">
            <h3>Ventana operativa</h3>
            <p className="muted">Definí los hitos que habilitan carga, cierre de pesca y validación.</p>
          </div>

          <div className="grid-2">
            <Field label="Inicio operativo" help="Referencia general del inicio del torneo.">
              <input
                type="datetime-local"
                value={form.startAt}
                onChange={(event) => setForm((current) => ({ ...current, startAt: event.target.value }))}
              />
            </Field>
            <Field label="Inicio de pesca" help="Desde este momento se habilita la carga de capturas.">
              <input
                type="datetime-local"
                value={form.fishingStartAt}
                onChange={(event) =>
                  setForm((current) => ({ ...current, fishingStartAt: event.target.value }))
                }
              />
            </Field>
          </div>

          <div className="grid-2">
            <Field label="Fin de pesca" help="Hasta este momento se aceptan capturas online.">
              <input
                type="datetime-local"
                value={form.fishingEndAt}
                onChange={(event) =>
                  setForm((current) => ({ ...current, fishingEndAt: event.target.value }))
                }
              />
            </Field>
            <Field
              label="Cierre de validación"
              help="Hasta este momento se permite editar, sincronizar y validar."
            >
              <input
                type="datetime-local"
                value={form.validationDeadlineAt}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    validationDeadlineAt: event.target.value,
                  }))
                }
              />
            </Field>
          </div>
        </form>
      </AdminDrawer>

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.action === 'close' ? 'Cerrar torneo' : 'Dar de baja torneo'}
        description={
          confirm?.action === 'close'
            ? 'El torneo quedará marcado como cerrado y ya no se podrá operar desde esta pantalla.'
            : 'El torneo dejará de mostrarse entre los activos, pero su historial seguirá disponible.'
        }
        confirmLabel={confirm?.action === 'close' ? 'Confirmar cierre' : 'Confirmar baja'}
        onCancel={() => setConfirm(null)}
        onConfirm={handleConfirm}
        loading={Boolean(busyId)}
      />
    </div>
  );
}

export function TeamsPage() {
  return (
    <SimpleCatalogPage
      title="Equipos"
      singular="equipo"
      plural="equipos"
      grammaticalGender="masculine"
      description="Buscá, creá y editá los equipos disponibles para vincular participantes."
      searchPlaceholder="Buscar por nombre"
      list={api.listTeams}
      create={api.createTeam}
      update={api.updateTeam}
      remove={api.deleteTeam}
      columns={[
        {
          header: 'Equipo',
          render: (item) => <strong>{String(item.name ?? 'Sin nombre')}</strong>,
          sortValue: (item) => String(item.name ?? ''),
        },
      ]}
      getSearchText={(item) => [String(item.name ?? '')]}
      emptyTitle="Todavía no hay equipos cargados"
      emptyDescription="Creá el primero para empezar a organizar los vínculos del torneo."
      createFields={(form, setForm) => (
        <Field label="Nombre del equipo">
          <input
            value={form.name ?? ''}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            required
          />
        </Field>
      )}
    />
  );
}

export function BoatsPage() {
  return (
    <SimpleCatalogPage
      title="Embarcaciones"
      singular="embarcación"
      plural="embarcaciones"
      grammaticalGender="feminine"
      description="Consultá el listado y resolvé el alta o edición de embarcaciones desde un panel lateral corto."
      searchPlaceholder="Buscar por nombre o matrícula"
      list={api.listBoats}
      create={api.createBoat}
      update={api.updateBoat}
      remove={api.deleteBoat}
      columns={[
        {
          header: 'Embarcación',
          render: (item) => (
            <div className="stack-list">
              <strong>{String(item.name ?? 'Sin nombre')}</strong>
              <span className="muted">{String(item.registrationNumber ?? 'Sin matrícula')}</span>
            </div>
          ),
          sortValue: (item) => String(item.name ?? ''),
        },
      ]}
      getSearchText={(item) => [String(item.name ?? ''), String(item.registrationNumber ?? '')]}
      emptyTitle="Todavía no hay embarcaciones registradas"
      emptyDescription="Creá embarcaciones para asignarlas después a participantes."
      createFields={(form, setForm) => (
        <>
          <Field label="Nombre">
            <input
              value={form.name ?? ''}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              required
            />
          </Field>
          <Field label="Número de matrícula">
            <input
              value={form.registrationNumber ?? ''}
              onChange={(event) =>
                setForm((current) => ({ ...current, registrationNumber: event.target.value }))
              }
            />
          </Field>
        </>
      )}
    />
  );
}

function SimpleCatalogPage<TItem extends { id: string } & Record<string, unknown>>({
  title,
  singular,
  plural,
  grammaticalGender,
  description,
  searchPlaceholder,
  list,
  create,
  update,
  remove,
  columns,
  getSearchText,
  emptyTitle,
  emptyDescription,
  createFields,
}: {
  title: string;
  singular: string;
  plural: string;
  grammaticalGender: 'masculine' | 'feminine';
  description: string;
  searchPlaceholder: string;
  list: (accessToken: string) => Promise<{ data: TItem[] }>;
  create: (payload: Record<string, unknown>, accessToken: string) => Promise<{ data: TItem }>;
  update: (id: string, payload: Record<string, unknown>, accessToken: string) => Promise<{ data: TItem }>;
  remove: (id: string, accessToken: string) => Promise<unknown>;
  columns: CatalogColumn<TItem>[];
  getSearchText: (item: TItem) => string[];
  emptyTitle: string;
  emptyDescription: string;
  createFields: (
    form: CatalogFormState,
    setForm: Dispatch<SetStateAction<CatalogFormState>>,
  ) => ReactNode;
}) {
  const accessToken = useAccessToken();
  const { feedback, setFeedback, setError, clearFeedback } = useFeedback();
  const [items, setItems] = useState<TItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [sortState, setSortState] = useState<SortState<string>>({
    column: columns[0]?.header ?? '',
    direction: 'asc',
  });
  const [form, setForm] = useState<CatalogFormState>({ id: '' });
  const capitalizedSingular = singular.charAt(0).toUpperCase() + singular.slice(1);
  const newLabel = grammaticalGender === 'feminine' ? `Nueva ${singular}` : `Nuevo ${singular}`;
  const createdLabel =
    grammaticalGender === 'feminine' ? `${capitalizedSingular} creada` : `${capitalizedSingular} creado`;
  const updatedLabel =
    grammaticalGender === 'feminine'
      ? `${capitalizedSingular} actualizada`
      : `${capitalizedSingular} actualizado`;

  async function load() {
    setLoading(true);
    try {
      const response = await list(accessToken);
      setItems(response.data);
    } catch (error) {
      setError(error, `No pudimos cargar ${title.toLowerCase()}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [accessToken]);

  const filteredItems = items.filter((item) =>
    getSearchText(item).some((value) => normalizeText(value).includes(normalizeText(search))),
  );
  const sortedItems = sortRows(filteredItems, sortState, (item, column) =>
    columns.find((candidate) => candidate.header === column)?.sortValue(item),
  );

  function requestSort(column: string) {
    setSortState((current) => nextSortState(current, column));
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setForm({ id: '' });
  }

  function openCreateDrawer() {
    setForm({ id: '' });
    setDrawerOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = form.id || 'new';
    setBusyId(id);

    try {
      const payload = { ...form };
      delete payload.id;

      Object.keys(payload).forEach((key) => {
        if (!payload[key]) {
          delete payload[key];
        }
      });

      if (form.id) {
        await update(form.id, payload, accessToken);
      } else {
        await create(payload, accessToken);
      }

      setFeedback({
        tone: 'success',
        title: form.id ? updatedLabel : createdLabel,
        description: 'Los cambios ya se reflejan en el listado.',
      });
      closeDrawer();
      await load();
    } catch (error) {
      setError(error, `No pudimos guardar ${title.toLowerCase()}`);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete() {
    if (!confirmId) {
      return;
    }

    setBusyId(confirmId);

    try {
      await remove(confirmId, accessToken);
      setFeedback({
        tone: 'success',
        title: 'Registro dado de baja',
        description: 'El registro ya no aparece entre los activos.',
      });
      await load();
    } catch (error) {
      setError(error);
    } finally {
      setBusyId(null);
      setConfirmId(null);
    }
  }

  function editItem(item: TItem) {
    const nextForm: CatalogFormState = { id: item.id };
    Object.entries(item).forEach(([key, value]) => {
      if (key !== 'id' && (typeof value === 'string' || value == null)) {
        nextForm[key] = String(value ?? '');
      }
    });
    setForm(nextForm);
    setDrawerOpen(true);
  }

  return (
    <div className="section-stack">
      <PageHeader
        title={title}
        description={description}
        actions={
          <button type="button" className="button button-primary" onClick={openCreateDrawer}>
            {newLabel}
          </button>
        }
      />
      <Feedback feedback={feedback} onDismiss={clearFeedback} />

      <AdminToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={searchPlaceholder}
        resultLabel={resultLabel(filteredItems.length, singular, plural)}
      />

      <TableSection title="Listado">
        {loading ? (
          <Notice
            tone="info"
            title={`Cargando ${title.toLowerCase()}`}
            description="Estamos actualizando el listado con la información más reciente."
          />
        ) : items.length === 0 ? (
          <AdminTableEmptyState
            title={emptyTitle}
            description={emptyDescription}
            action={
              <button type="button" className="button button-primary" onClick={openCreateDrawer}>
                {newLabel}
              </button>
            }
          />
        ) : filteredItems.length === 0 ? (
          <AdminTableEmptyState
            title="No encontramos resultados"
            description="Probá con otro nombre o limpiá la búsqueda."
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  {columns.map((column) => (
                    <SortableTableHeader
                      key={column.header}
                      column={column.header}
                      label={column.header}
                      state={sortState}
                      onSort={requestSort}
                    />
                  ))}
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((item) => (
                  <tr key={item.id}>
                    {columns.map((column) => (
                      <td key={column.header}>{column.render(item)}</td>
                    ))}
                    <td>
                      <div className="button-row">
                        <button
                          type="button"
                          className="button button-secondary"
                          onClick={() => editItem(item)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="button button-danger button-danger-subtle"
                          onClick={() => setConfirmId(item.id)}
                        >
                          Dar de baja
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </TableSection>

      <AdminDrawer
        open={drawerOpen}
        title={form.id ? `Editar ${singular}` : newLabel}
        description="Completá los datos y guardá para volver al listado."
        onClose={closeDrawer}
        size="short"
        footer={
          <div className="button-row">
            <button type="submit" form={`${singular}-form`} className="button button-primary" disabled={Boolean(busyId)}>
              {busyId === (form.id || 'new') ? 'Guardando...' : 'Guardar'}
            </button>
            <button type="button" className="button button-secondary" onClick={closeDrawer}>
              Cancelar
            </button>
          </div>
        }
      >
        <form id={`${singular}-form`} className="form-stack" onSubmit={handleSubmit}>
          {createFields(form, setForm)}
        </form>
      </AdminDrawer>

      <ConfirmDialog
        open={Boolean(confirmId)}
        title="Confirmar baja"
        description="El registro dejará de mostrarse entre los activos, pero conservará su historial."
        confirmLabel="Confirmar baja"
        onCancel={() => setConfirmId(null)}
        onConfirm={handleDelete}
        loading={Boolean(busyId)}
      />
    </div>
  );
}

export function ParticipantsPage() {
  const accessToken = useAccessToken();
  const { feedback, setFeedback, setError, clearFeedback } = useFeedback();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [boats, setBoats] = useState<Boat[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [sortState, setSortState] = useState<SortState<ParticipantSortColumn>>({
    column: 'person',
    direction: 'asc',
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState(resetParticipantForm());

  const teamsById = buildMap(teams);
  const boatsById = buildMap(boats);

  async function load() {
    setLoading(true);
    try {
      const [participantResponse, teamsResponse, boatsResponse] = await Promise.all([
        api.listParticipants(accessToken),
        api.listTeams(accessToken),
        api.listBoats(accessToken),
      ]);
      setParticipants(participantResponse.data);
      setTeams(teamsResponse.data);
      setBoats(boatsResponse.data);
      setSelectedId((current) =>
        participantResponse.data.some((item) => item.id === current)
          ? current
          : participantResponse.data[0]?.id ?? null,
      );
    } catch (error) {
      setError(error, 'No pudimos cargar los participantes');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [accessToken]);

  const filteredParticipants = participants.filter((participant) =>
    [
      `${participant.firstName} ${participant.lastName}`,
      participant.documentId,
      participant.user?.email,
    ].some((value) => normalizeText(value).includes(normalizeText(search))),
  );
  const sortedParticipants = sortRows(filteredParticipants, sortState, (participant, column) => {
    switch (column) {
      case 'person':
        return `${participant.firstName} ${participant.lastName}`;
      case 'account':
        return participant.user?.email;
      case 'links':
        return participant.teamLinks.length + participant.boatLinks.length;
    }
  });

  function requestSort(column: ParticipantSortColumn) {
    setSortState((current) => nextSortState(current, column));
  }

  const selectedParticipant =
    sortedParticipants.find((participant) => participant.id === selectedId) ?? sortedParticipants[0] ?? null;

  function closeDrawer() {
    setDrawerOpen(false);
    setForm(resetParticipantForm());
  }

  function openCreateDrawer() {
    setForm(resetParticipantForm());
    setDrawerOpen(true);
  }

  function openEditDrawer(participant: Participant) {
    setForm({
      id: participant.id,
      firstName: participant.firstName,
      lastName: participant.lastName,
      email: participant.user?.email ?? '',
      phone: participant.phone ?? '',
      documentId: participant.documentId ?? '',
      enabledToCompete: participant.enabledToCompete,
    });
    setDrawerOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = form.id || 'new';
    setBusyId(id);

    try {
      const payload = {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email || undefined,
        phone: form.phone || undefined,
        documentId: form.documentId || undefined,
        enabledToCompete: form.enabledToCompete,
      };

      if (form.id) {
        await api.updateParticipant(form.id, payload, accessToken);
        setFeedback({
          tone: 'success',
          title: 'Participante actualizado',
          description: 'Los datos ya quedaron actualizados.',
        });
      } else {
        await api.createParticipant(payload, accessToken);
        setFeedback({
          tone: 'success',
          title: 'Participante creado',
          description: form.email
            ? 'La cuenta quedó pendiente de activación y la persona ya figura en el listado.'
            : 'La ficha se creó sin cuenta asociada.',
        });
      }

      closeDrawer();
      await load();
    } catch (error) {
      setError(error, 'No pudimos guardar el participante');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete() {
    if (!confirmId) {
      return;
    }

    setBusyId(confirmId);

    try {
      await api.deleteParticipant(confirmId, accessToken);
      setFeedback({
        tone: 'success',
        title: 'Participante dado de baja',
        description: 'El participante ya no aparece entre los activos.',
      });
      await load();
    } catch (error) {
      setError(error);
    } finally {
      setBusyId(null);
      setConfirmId(null);
    }
  }

  async function handleLink(participantId: string, kind: 'team' | 'boat', linkedId: string) {
    if (!linkedId) {
      return;
    }

    setBusyId(participantId);

    try {
      if (kind === 'team') {
        await api.linkParticipantTeam(participantId, linkedId, accessToken);
      } else {
        await api.linkParticipantBoat(participantId, linkedId, accessToken);
      }

      setFeedback({
        tone: 'success',
        title: kind === 'team' ? 'Equipo vinculado' : 'Embarcación vinculada',
        description: 'El vínculo ya se refleja en la ficha del participante.',
      });
      await load();
    } catch (error) {
      setError(error);
    } finally {
      setBusyId(null);
    }
  }

  async function handleUnlink(participantId: string, kind: 'team' | 'boat', linkId: string) {
    setBusyId(linkId);

    try {
      if (kind === 'team') {
        await api.unlinkParticipantTeam(participantId, linkId, accessToken);
      } else {
        await api.unlinkParticipantBoat(participantId, linkId, accessToken);
      }

      setFeedback({
        tone: 'success',
        title: kind === 'team' ? 'Equipo quitado' : 'Embarcación quitada',
        description: 'El vínculo ya no figura en la ficha del participante.',
      });
      await load();
    } catch (error) {
      setError(error, 'No pudimos quitar el vínculo. Probá de nuevo.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="section-stack">
      <PageHeader
        title="Participantes"
        description="Consultá el padrón, editá datos y revisá equipo o embarcación sin salir del listado."
        actions={
          <button type="button" className="button button-primary" onClick={openCreateDrawer}>
            Nuevo participante
          </button>
        }
      />
      <Feedback feedback={feedback} onDismiss={clearFeedback} />

      <AdminToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por nombre, documento o email"
        resultLabel={resultLabel(filteredParticipants.length, 'participante', 'participantes')}
      />

      <section className="admin-detail-layout">
        <TableSection title="Listado">
          {loading ? (
            <Notice
              tone="info"
              title="Cargando participantes"
              description="Estamos trayendo fichas, cuentas asociadas y relaciones activas."
            />
          ) : participants.length === 0 ? (
            <AdminTableEmptyState
              title="Todavía no hay participantes"
              description="Creá la primera ficha administrativa para empezar el padrón."
              action={
                <button type="button" className="button button-primary" onClick={openCreateDrawer}>
                  Nuevo participante
                </button>
              }
            />
          ) : filteredParticipants.length === 0 ? (
            <AdminTableEmptyState
              title="No encontramos resultados"
              description="Probá con otro nombre, documento o email."
            />
          ) : (
            <>
            <div className="table-wrap participants-table">
              <table className="data-table">
                <thead>
                  <tr>
                    <SortableTableHeader column="person" label="Persona" state={sortState} onSort={requestSort} />
                    <SortableTableHeader column="account" label="Cuenta y estado" state={sortState} onSort={requestSort} />
                    <SortableTableHeader column="links" label="Vínculos" state={sortState} onSort={requestSort} />
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedParticipants.map((participant) => (
                    <tr
                      key={participant.id}
                      className={selectedParticipant?.id === participant.id ? 'is-selected' : ''}
                    >
                      <td>
                        <button
                          type="button"
                          className="table-row-trigger"
                          onClick={() => setSelectedId(participant.id)}
                        >
                          <strong>
                            {participant.firstName} {participant.lastName}
                          </strong>
                          <span className="muted">{participant.documentId || 'Sin documento'}</span>
                        </button>
                      </td>
                      <td>
                        <div className="stack-list compact-stack">
                          <span>{participant.user?.email || 'Sin cuenta asociada'}</span>
                          <div className="status-row">
                            {participant.user ? (
                              <span className="pill">{accountStatusLabel(participant.user.accountStatus)}</span>
                            ) : null}
                            <span className="pill">
                              {participant.enabledToCompete ? 'Habilitado para competir' : 'Pendiente de habilitación'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span>{participantLinksSummary(participant.teamLinks.length, participant.boatLinks.length)}</span>
                      </td>
                      <td>
                        <div className="button-row">
                          <button
                            type="button"
                            className="button button-secondary"
                            onClick={() => openEditDrawer(participant)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="button button-danger button-danger-subtle"
                            onClick={() => setConfirmId(participant.id)}
                          >
                            Dar de baja
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="participants-mobile-list">
              {sortedParticipants.map((participant) => (
                <article
                  key={participant.id}
                  className={`participant-card ${selectedParticipant?.id === participant.id ? 'is-selected' : ''}`}
                >
                  <div className="participant-card-heading">
                    <strong>
                      {participant.firstName} {participant.lastName}
                    </strong>
                    <span className="muted">{participant.documentId || 'Sin documento'}</span>
                    <span className="muted">{participant.user?.email || 'Sin cuenta asociada'}</span>
                  </div>
                  <div className="status-row">
                    {participant.user ? (
                      <span className="pill">{accountStatusLabel(participant.user.accountStatus)}</span>
                    ) : null}
                    <span className="pill">
                      {participant.enabledToCompete ? 'Habilitado para competir' : 'Pendiente de habilitación'}
                    </span>
                    <span className="pill">
                      {participantLinksSummary(participant.teamLinks.length, participant.boatLinks.length)}
                    </span>
                  </div>
                  <div className="participant-card-actions">
                    <button type="button" className="button button-secondary" onClick={() => setSelectedId(participant.id)}>
                      Ver vínculos
                    </button>
                    <button type="button" className="button button-secondary" onClick={() => openEditDrawer(participant)}>
                      Editar
                    </button>
                  </div>
                  <button
                    type="button"
                    className="participant-card-risk"
                    onClick={() => setConfirmId(participant.id)}
                  >
                    Dar de baja participante
                  </button>
                </article>
              ))}
            </div>
            </>
          )}
        </TableSection>

        <DetailPanel
          title="Vínculos del participante"
          description={
            selectedParticipant
              ? 'Revisá y actualizá el equipo y la embarcación de este participante.'
              : 'Seleccioná un participante para ver su información y sus vínculos.'
          }
        >
          {selectedParticipant ? (
            <>
              <div className="detail-panel-summary">
                <strong>
                  {selectedParticipant.firstName} {selectedParticipant.lastName}
                </strong>
                <span className="muted">
                  {selectedParticipant.user?.email || 'Sin cuenta asociada'}
                </span>
              </div>

              <Field label="Asignar equipo">
                <select
                  onChange={(event) => handleLink(selectedParticipant.id, 'team', event.target.value)}
                  defaultValue=""
                  disabled={busyId === selectedParticipant.id || teams.length === 0}
                >
                  <option value="">
                    {teams.length === 0 ? 'No hay equipos disponibles' : 'Seleccionar equipo'}
                  </option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="stack-list">
                <div className="link-summary">
                  <span className="muted">Equipo actual</span>
                  {selectedParticipant.teamLinks.length === 0 ? (
                    <strong>Sin equipo</strong>
                  ) : (
                    <div className="stack-list">
                      {selectedParticipant.teamLinks.map((link) => (
                        <div key={link.id} className="assignment-card">
                          <strong>{teamsById[link.teamId]?.name ?? 'Equipo vinculado'}</strong>
                          <button
                            type="button"
                            className="button button-ghost"
                            onClick={() => handleUnlink(selectedParticipant.id, 'team', link.id)}
                            disabled={busyId === link.id}
                          >
                            Quitar
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Field label="Asignar embarcación">
                  <select
                    onChange={(event) => handleLink(selectedParticipant.id, 'boat', event.target.value)}
                    defaultValue=""
                    disabled={busyId === selectedParticipant.id || boats.length === 0}
                  >
                    <option value="">
                      {boats.length === 0 ? 'No hay embarcaciones disponibles' : 'Seleccionar embarcación'}
                    </option>
                    {boats.map((boat) => (
                      <option key={boat.id} value={boat.id}>
                        {boat.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <div className="link-summary">
                  <span className="muted">Embarcación actual</span>
                  {selectedParticipant.boatLinks.length === 0 ? (
                    <strong>Sin embarcación</strong>
                  ) : (
                    <div className="stack-list">
                      {selectedParticipant.boatLinks.map((link) => (
                        <div key={link.id} className="assignment-card">
                          <strong>{boatsById[link.boatId]?.name ?? 'Embarcación vinculada'}</strong>
                          <button
                            type="button"
                            className="button button-ghost"
                            onClick={() => handleUnlink(selectedParticipant.id, 'boat', link.id)}
                            disabled={busyId === link.id}
                          >
                            Quitar
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <EmptyState
              title="Sin participante seleccionado"
              description="Seleccioná una fila del listado para ver el detalle."
            />
          )}
        </DetailPanel>
      </section>

      <AdminDrawer
        open={drawerOpen}
        title={form.id ? 'Editar participante' : 'Nuevo participante'}
        description="Completá la ficha y guardá para volver al listado."
        onClose={closeDrawer}
        size="medium"
        footer={
          <div className="button-row">
            <button type="submit" form="participant-form" className="button button-primary" disabled={Boolean(busyId)}>
              {busyId === (form.id || 'new') ? 'Guardando...' : 'Guardar'}
            </button>
            <button type="button" className="button button-secondary" onClick={closeDrawer}>
              Cancelar
            </button>
          </div>
        }
      >
        <form id="participant-form" className="form-stack" onSubmit={handleSubmit}>
          <div className="grid-2">
            <Field label="Nombre">
              <input
                value={form.firstName}
                onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))}
                required
              />
            </Field>
            <Field label="Apellido">
              <input
                value={form.lastName}
                onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))}
                required
              />
            </Field>
          </div>

          <div className="grid-2">
            <Field label="Email">
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="Opcional para crear cuenta"
              />
            </Field>
            <Field label="Teléfono">
              <input
                value={form.phone}
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              />
            </Field>
          </div>

          <div className="grid-2">
            <Field label="Documento">
              <input
                value={form.documentId}
                onChange={(event) => setForm((current) => ({ ...current, documentId: event.target.value }))}
              />
            </Field>
            <Field label="Habilitado para competir">
              <select
                value={form.enabledToCompete ? 'true' : 'false'}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    enabledToCompete: event.target.value === 'true',
                  }))
                }
              >
                <option value="false">No</option>
                <option value="true">Sí</option>
              </select>
            </Field>
          </div>
        </form>
      </AdminDrawer>

      <ConfirmDialog
        open={Boolean(confirmId)}
        title="Dar de baja participante"
        description="La ficha dejará de mostrarse entre las activas y, si tenía cuenta, también se bloqueará el acceso."
        confirmLabel="Confirmar baja"
        onCancel={() => setConfirmId(null)}
        onConfirm={handleDelete}
        loading={Boolean(busyId)}
      />
    </div>
  );
}

export function OfficialsPage() {
  const accessToken = useAccessToken();
  const { feedback, setFeedback, setError, clearFeedback } = useFeedback();
  const [officials, setOfficials] = useState<Official[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [sortState, setSortState] = useState<SortState<OfficialSortColumn>>({
    column: 'official',
    direction: 'asc',
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState(resetOfficialForm());

  async function load() {
    setLoading(true);
    try {
      const [officialsResponse, tournamentsResponse] = await Promise.all([
        api.listOfficials(accessToken),
        api.listTournaments(accessToken),
      ]);
      setOfficials(officialsResponse.data);
      setTournaments(tournamentsResponse.data);
      setSelectedId((current) =>
        officialsResponse.data.some((item) => item.id === current)
          ? current
          : officialsResponse.data[0]?.id ?? null,
      );
    } catch (error) {
      setError(error, 'No pudimos cargar los fiscales');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [accessToken]);

  const filteredOfficials = officials.filter((official) =>
    [
      `${official.user.firstName} ${official.user.lastName}`,
      official.documentId,
      official.user.email,
      accountStatusLabel(official.user.accountStatus),
    ].some((value) => normalizeText(value).includes(normalizeText(search))),
  );
  const sortedOfficials = sortRows(filteredOfficials, sortState, (official, column) => {
    switch (column) {
      case 'official':
        return `${official.user.firstName} ${official.user.lastName}`;
      case 'account':
        return official.user.email;
      case 'assignments':
        return official.tournamentAssignments.length;
    }
  });

  function requestSort(column: OfficialSortColumn) {
    setSortState((current) => nextSortState(current, column));
  }

  const selectedOfficial =
    sortedOfficials.find((official) => official.id === selectedId) ?? sortedOfficials[0] ?? null;

  function closeDrawer() {
    setDrawerOpen(false);
    setForm(resetOfficialForm());
  }

  function openCreateDrawer() {
    setForm(resetOfficialForm());
    setDrawerOpen(true);
  }

  function openEditDrawer(official: Official) {
    setForm({
      id: official.id,
      firstName: official.user.firstName,
      lastName: official.user.lastName,
      email: official.user.email,
      phone: official.user.phone ?? '',
      documentId: official.documentId,
    });
    setDrawerOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyId(form.id || 'new');

    try {
      const payload = {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone || undefined,
        documentId: form.documentId,
        temporaryPassword: randomTemporaryPassword(),
      };

      if (form.id) {
        await api.updateOfficial(form.id, payload, accessToken);
        setFeedback({
          tone: 'success',
          title: 'Fiscal actualizado',
          description: 'Los cambios ya quedaron guardados.',
        });
      } else {
        await api.createOfficial(payload, accessToken);
        setFeedback({
          tone: 'success',
          title: 'Fiscal creado',
          description: 'La cuenta quedó pendiente de activación y la persona recibirá un correo para completarla.',
        });
      }

      closeDrawer();
      await load();
    } catch (error) {
      setError(error, 'No pudimos guardar el fiscal');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete() {
    if (!confirmId) {
      return;
    }

    setBusyId(confirmId);

    try {
      await api.deleteOfficial(confirmId, accessToken);
      setFeedback({
        tone: 'success',
        title: 'Fiscal dado de baja',
        description: 'El fiscal ya no aparece entre los activos.',
      });
      await load();
    } catch (error) {
      setError(error);
    } finally {
      setBusyId(null);
      setConfirmId(null);
    }
  }

  async function handleAssign(officialId: string, tournamentId: string) {
    if (!tournamentId) {
      return;
    }

    setBusyId(officialId);

    try {
      await api.assignOfficial(officialId, tournamentId, accessToken);
      setFeedback({
        tone: 'success',
        title: 'Fiscal asignado',
        description: 'El fiscal ya quedó asociado al torneo seleccionado.',
      });
      await load();
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError?.message?.toLowerCase().includes('internal server error')) {
        setFeedback({
          tone: 'error',
          title: 'No pudimos asignar el fiscal',
          description: 'Ese fiscal ya estaba asignado a este torneo.',
        });
      } else {
        setError(error, 'No pudimos asignar el fiscal');
      }
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemoveAssignment(officialId: string, assignmentId: string) {
    setBusyId(assignmentId);

    try {
      await api.removeOfficialAssignment(officialId, assignmentId, accessToken);
      setFeedback({
        tone: 'success',
        title: 'Asignación quitada',
        description: 'El fiscal ya no figura asociado a ese torneo.',
      });
      await load();
    } catch (error) {
      setError(error, 'No pudimos quitar la asignación');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="section-stack">
      <PageHeader
        title="Fiscales"
        description="Consultá el listado, editá datos y administrá los torneos asignados desde el detalle."
        actions={
          <button type="button" className="button button-primary" onClick={openCreateDrawer}>
            Nuevo fiscal
          </button>
        }
      />
      <Feedback feedback={feedback} onDismiss={clearFeedback} />

      <AdminToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por nombre, documento o email"
        resultLabel={resultLabel(filteredOfficials.length, 'fiscal', 'fiscales')}
      />

      <section className="admin-detail-layout">
        <TableSection title="Listado">
          {loading ? (
            <Notice
              tone="info"
              title="Cargando fiscales"
              description="Estamos trayendo cuentas, estados y torneos asignados."
            />
          ) : officials.length === 0 ? (
            <AdminTableEmptyState
              title="Todavía no hay fiscales"
              description="Creá el primero para empezar a asignarlo a los torneos."
              action={
                <button type="button" className="button button-primary" onClick={openCreateDrawer}>
                  Nuevo fiscal
                </button>
              }
            />
          ) : filteredOfficials.length === 0 ? (
            <AdminTableEmptyState
              title="No encontramos resultados"
              description="Probá con otro nombre, documento o email."
            />
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <SortableTableHeader column="official" label="Fiscal" state={sortState} onSort={requestSort} />
                    <SortableTableHeader column="account" label="Cuenta" state={sortState} onSort={requestSort} />
                    <SortableTableHeader column="assignments" label="Asignaciones" state={sortState} onSort={requestSort} />
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedOfficials.map((official) => (
                    <tr key={official.id} className={selectedOfficial?.id === official.id ? 'is-selected' : ''}>
                      <td>
                        <button
                          type="button"
                          className="table-row-trigger"
                          onClick={() => setSelectedId(official.id)}
                        >
                          <strong>
                            {official.user.firstName} {official.user.lastName}
                          </strong>
                          <span className="muted">{official.documentId}</span>
                        </button>
                      </td>
                      <td>
                        <div className="stack-list">
                          <span>{official.user.email}</span>
                          <span className="pill">{accountStatusLabel(official.user.accountStatus)}</span>
                        </div>
                      </td>
                      <td>
                        {official.tournamentAssignments.length === 0 ? (
                          <span className="muted">Sin torneos asignados</span>
                        ) : (
                          <div className="stack-list compact-stack">
                            <span>
                              {resultLabel(
                                official.tournamentAssignments.length,
                                'torneo',
                                'torneos',
                              )}
                            </span>
                            <span className="muted">
                              {official.tournamentAssignments[0]?.tournament.name}
                              {official.tournamentAssignments.length > 1 ? ' y más' : ''}
                            </span>
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="button-row">
                          <button
                            type="button"
                            className="button button-secondary"
                            onClick={() => openEditDrawer(official)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="button button-danger button-danger-subtle"
                            onClick={() => setConfirmId(official.id)}
                          >
                            Dar de baja
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TableSection>

        <DetailPanel
          title="Asignaciones"
          description={
            selectedOfficial
              ? 'Asigná o quitá torneos para este fiscal desde el detalle.'
              : 'Seleccioná un fiscal para ver su información y sus torneos asignados.'
          }
        >
          {selectedOfficial ? (
            <>
              <div className="detail-panel-summary">
                <strong>
                  {selectedOfficial.user.firstName} {selectedOfficial.user.lastName}
                </strong>
                <span className="muted">{selectedOfficial.user.email}</span>
              </div>

              <Notice
                tone="info"
                title="Activación de cuenta"
                description="La persona recibirá un correo para activar su cuenta y definir la contraseña desde ese enlace."
              />

              <Field label="Asignar a torneo">
                <select
                  onChange={(event) => handleAssign(selectedOfficial.id, event.target.value)}
                  defaultValue=""
                  disabled={busyId === selectedOfficial.id || tournaments.length === 0}
                >
                  <option value="">
                    {tournaments.length === 0 ? 'No hay torneos disponibles' : 'Seleccionar torneo'}
                  </option>
                  {tournaments.map((tournament) => (
                    <option key={tournament.id} value={tournament.id}>
                      {tournament.name}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="stack-list">
                {selectedOfficial.tournamentAssignments.length === 0 ? (
                  <EmptyState
                    title="Sin torneos asignados"
                    description="Asigná un torneo para habilitar su operación en campo."
                  />
                ) : (
                  selectedOfficial.tournamentAssignments.map((assignment) => (
                    <div key={assignment.id} className="assignment-card">
                      <div>
                        <strong>{assignment.tournament.name}</strong>
                        <div className="muted">{tournamentStatusLabel(assignment.tournament.status)}</div>
                      </div>
                      <button
                        type="button"
                        className="button button-ghost"
                        onClick={() => handleRemoveAssignment(selectedOfficial.id, assignment.id)}
                        disabled={busyId === assignment.id}
                      >
                        Quitar
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <EmptyState
              title="Sin fiscal seleccionado"
              description="Seleccioná una fila del listado para ver el detalle."
            />
          )}
        </DetailPanel>
      </section>

      <AdminDrawer
        open={drawerOpen}
        title={form.id ? 'Editar fiscal' : 'Nuevo fiscal'}
        description="Completá la ficha y guardá para volver al listado."
        onClose={closeDrawer}
        size="medium"
        footer={
          <div className="button-row">
            <button type="submit" form="official-form" className="button button-primary" disabled={Boolean(busyId)}>
              {busyId === (form.id || 'new') ? 'Guardando...' : 'Guardar'}
            </button>
            <button type="button" className="button button-secondary" onClick={closeDrawer}>
              Cancelar
            </button>
          </div>
        }
      >
        <form id="official-form" className="form-stack" onSubmit={handleSubmit}>
          <div className="grid-2">
            <Field label="Nombre">
              <input
                value={form.firstName}
                onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))}
                required
              />
            </Field>
            <Field label="Apellido">
              <input
                value={form.lastName}
                onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))}
                required
              />
            </Field>
          </div>

          <div className="grid-2">
            <Field label="Email">
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                required
              />
            </Field>
            <Field label="Teléfono">
              <input
                value={form.phone}
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              />
            </Field>
          </div>

          <Field label="Documento">
            <input
              value={form.documentId}
              onChange={(event) => setForm((current) => ({ ...current, documentId: event.target.value }))}
              required
            />
          </Field>
        </form>
      </AdminDrawer>

      <ConfirmDialog
        open={Boolean(confirmId)}
        title="Dar de baja fiscal"
        description="El fiscal dejará de mostrarse entre los activos y también se bloqueará el acceso asociado."
        confirmLabel="Confirmar baja"
        onCancel={() => setConfirmId(null)}
        onConfirm={handleDelete}
        loading={Boolean(busyId)}
      />
    </div>
  );
}
