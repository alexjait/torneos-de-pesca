'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';

export type WorkspaceNavigationGroup = {
  label?: string;
  links: Array<{ href: string; label: string }>;
};

type WorkspaceNavigationProps = {
  variant: 'admin' | 'official';
  areaLabel: string;
  title: string;
  description: string;
  navigationLabel: string;
  groups: WorkspaceNavigationGroup[];
  profile: ReactNode;
};

const focusableSelector =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function WorkspaceNavigation({
  variant,
  areaLabel,
  title,
  description,
  navigationLabel,
  groups,
  profile,
}: WorkspaceNavigationProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.querySelector<HTMLElement>(focusableSelector)?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsOpen(false);
        return;
      }

      if (event.key !== 'Tab' || !panelRef.current) {
        return;
      }

      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(focusableSelector));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (!first || !last) {
        return;
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      triggerRef.current?.focus();
    };
  }, [isOpen]);

  const close = () => setIsOpen(false);
  const content = (onNavigate?: () => void) => (
    <div className="workspace-navigation-content">
      <div className="admin-brand">
        <span>{areaLabel}</span>
        <strong>{title}</strong>
        <p className="muted">{description}</p>
      </div>

      <nav aria-label={navigationLabel} className="workspace-navigation-groups">
        {groups.map((group) => (
          <div className="workspace-navigation-group" key={group.label ?? group.links[0]?.href}>
            {group.label ? <span className="workspace-navigation-group-label">{group.label}</span> : null}
            {group.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`admin-link ${pathname === link.href ? 'active' : ''}`}
                aria-current={pathname === link.href ? 'page' : undefined}
                onClick={onNavigate}
              >
                <span>{link.label}</span>
                <span aria-hidden="true">›</span>
              </Link>
            ))}
          </div>
        ))}
      </nav>

      {profile}
    </div>
  );

  return (
    <>
      <aside className={`${variant}-sidebar workspace-sidebar`}>{content()}</aside>

      <button
        ref={triggerRef}
        type="button"
        className={`mobile-navigation-trigger mobile-navigation-trigger-${variant}`}
        aria-expanded={isOpen}
        aria-controls="mobile-workspace-navigation"
        onClick={() => setIsOpen(true)}
      >
        <span aria-hidden="true">☰</span>
        <span>{title}</span>
      </button>

      {isOpen ? (
        <div className="mobile-navigation-backdrop" role="presentation" onClick={close}>
          <aside
            id="mobile-workspace-navigation"
            ref={panelRef}
            className={`mobile-navigation-panel mobile-navigation-panel-${variant}`}
            role="dialog"
            aria-modal="true"
            aria-label={navigationLabel}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mobile-navigation-panel-header">
              <span>{areaLabel}</span>
              <button type="button" className="button button-secondary" onClick={close}>
                Cerrar menú
              </button>
            </div>
            {content(close)}
          </aside>
        </div>
      ) : null}
    </>
  );
}
