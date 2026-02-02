import { redirect } from 'next/navigation';
import { get_session } from '@/lib/auth';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const is_authenticated = await get_session();

  if (!is_authenticated) {
    redirect('/login');
  }

  return <>{children}</>;
}
