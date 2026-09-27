import { Suspense } from 'react';
import { ActivationPage } from '@/components/public-pages';

export default function ActivationRoute() {
  return (
    <Suspense fallback={null}>
      <ActivationPage />
    </Suspense>
  );
}
