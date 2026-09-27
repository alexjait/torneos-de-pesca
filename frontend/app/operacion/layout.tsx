import { OfficialShell } from '@/components/official-shell';

export default function OfficialLayout({ children }: { children: React.ReactNode }) {
  return <OfficialShell>{children}</OfficialShell>;
}
