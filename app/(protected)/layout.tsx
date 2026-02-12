import { redirect } from 'next/navigation';
import { get_session } from '@/lib/auth';
import { AppHeader } from '@/components/shared/app-header';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const is_authenticated = await get_session();

  if (!is_authenticated) {
    redirect('/login');
  }

  return (
    <div className="h-screen flex flex-col">
      <AppHeader />
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}
