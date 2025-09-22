import { Suspense } from 'react';
import BookClient from './BookClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function Page() {
  return (
    <Suspense fallback={null}>
      <BookClient />
    </Suspense>
  );
}
