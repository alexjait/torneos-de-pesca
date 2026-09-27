'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { Notice } from '@/components/ui';
import { useAuth } from '@/components/auth-provider';
import { accountStatusLabel } from '@/lib/labels';
import { WorkspaceNavigation, type WorkspaceNavigationGroup } from '@/components/workspace-navigation';

const officialGroups: WorkspaceNavigationGroup[] = [{ links: [{ href: '/operacion', label: 'Operación' }] }];

export function OfficialShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isReady, user, logout } = useAuth();

  useEffect(() => {
    if (!isReady) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!user.roles.includes('OFFICIAL')) router.replace('/login?unauthorized=1');
  }, [isReady, router, user]);

  if (!isReady) {
    return (
      <div className="public-panel app-shell">
        <div className="surface">
          <Notice tone="info" title="Cargando acceso" description="Estamos recuperando tu sesión para entrar a la operación." />
        </div>
      </div>
    );
  }

  if (!user || !user.roles.includes('OFFICIAL')) return null;

  return (
    <div className="official-shell">
      <WorkspaceNavigation
        variant="official"
        areaLabel="Zona operativa"
        title="Fiscal de torneo"
        description="Capturas, sincronización y validación desde el mismo frente."
        navigationLabel="Navegación operativa"
        groups={officialGroups}
        profile={
          <div className="admin-user-panel official-user-panel">
            <div className="admin-user-copy">
              <strong>{user.firstName} {user.lastName}</strong>
              <p className="muted">{user.email}</p>
            </div>
            <div className="status-row">
              <span className="pill pill-account-status">{accountStatusLabel(user.accountStatus)}</span>
              <span className="pill pill-role">Fiscal</span>
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
      <main className="admin-main official-main">{children}</main>
    </div>
  );
}
