import { redirect } from 'next/navigation';
import { BRAND } from '@/lib/brand';
import { supabaseServer } from '@/lib/supabase/server';
import LoginForm from '@/components/admin/LoginForm';

export default async function AdminLoginPage() {
  const auth = await supabaseServer();
  if (auth) {
    const {
      data: { user },
    } = await auth.auth.getUser();
    if (user) redirect('/admin/media');
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-wiki-blue">
          {BRAND.parent}
        </p>
        <h1 className="mt-1 text-2xl font-bold">Espace admin</h1>
      </div>
      <LoginForm />
    </main>
  );
}
