'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Notice } from '@/components/ui';
import { accountStatusLabel } from '@/lib/labels';
import { WorkspaceNavigation, type WorkspaceNavigationGroup } from '@/components/workspace-navigation';

const adminGroups: WorkspaceNavigationGroup[] = [
  {
    links: [
      { href: '/admin', label: 'Resumen' },
      { href: '/admin/torneos', label: 'Torneos' },
      { href: '/admin/inscripciones', label: 'Inscripciones' },
    ],
  },
  {
    label: 'Competencia',
    links: [
      { href: '/admin/scoring', label: 'Scoring' },
      { href: '/admin/ranking', label: 'Ranking' },
      { href: '/admin/reportes', label: 'Reportes' },
    ],
  },
  {
    label: 'Base operativa',
    links: [
      { href: '/admin/participantes', label: 'Participantes' },
      { href: '/admin/equipos', label: 'Equipos' },
      { href: '/admin/embarcaciones', label: 'Embarcaciones' },
      { href: '/admin/fiscales', label: 'Fiscales' },
    ],
  },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isReady, user, logout } = useAuth();

  useEffect(() => {
    if (!isReady) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!user.roles.includes('ADMIN')) router.replace('/login?unauthorized=1');
  }, [isReady, router, user]);

  if (!isReady) {
    return (
      <div className="public-panel app-shell">
        <div className="surface">
          <Notice tone="info" title="Cargando acceso" description="Estamos recuperando tu sesión para entrar a la administración." />
        </div>
      </div>
    );
  }

  if (!user || !user.roles.includes('ADMIN')) return null;

  return (
    <div className="admin-shell">
      <WorkspaceNavigation
        variant="admin"
        areaLabel="Zona administrativa"
        title="Torneos de Pesca"
        description="Acceso rápido a scoring, ranking, reportes y gestión operativa."
        navigationLabel="Navegación administrativa"
        groups={adminGroups}
        profile={
          <div className="admin-user-panel">
            <div className="admin-user-copy">
              <strong>{user.firstName} {user.lastName}</strong>
              <p className="muted">{user.email}</p>
            </div>
            <div className="status-row">
              <span className="pill pill-account-status">{accountStatusLabel(user.accountStatus)}</span>
              <span className="pill pill-role">Administración</span>
            </div>
            <button type="button" className="button button-secondary admin-logout" onClick={() => {
              logout();
              router.replace('/login');
            }}>
              Cerrar sesión
            </button>
          </div>
        }
      />
      <main className="admin-main">{children}</main>
    </div>
  );
}
