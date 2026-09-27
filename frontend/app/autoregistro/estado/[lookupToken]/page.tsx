import { PublicRegistrationStatusPage } from '@/components/registration-pages';

export default function PublicRegistrationStatusRoute({
  params,
}: {
  params: { lookupToken: string };
}) {
  return <PublicRegistrationStatusPage lookupToken={params.lookupToken} />;
}
