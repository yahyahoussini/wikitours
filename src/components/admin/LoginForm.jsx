'use client';

import { useActionState } from 'react';
import { signIn } from '@/app/admin/actions';

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm font-medium">
        E-mail
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          autoFocus
          className="rounded-ctrl border border-bm-black/15 bg-white px-3 py-2.5 text-base shadow-hairline outline-none focus:border-wiki-blue"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Mot de passe
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="rounded-ctrl border border-bm-black/15 bg-white px-3 py-2.5 text-base shadow-hairline outline-none focus:border-wiki-blue"
        />
      </label>
      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-ctrl bg-wiki-blue px-6 py-3 text-sm font-semibold text-white shadow-lift transition hover:bg-wiki-blue/90 disabled:opacity-60"
      >
        {pending ? 'Connexion…' : 'Se connecter'}
      </button>
    </form>
  );
}
