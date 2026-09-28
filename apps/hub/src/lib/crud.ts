import type { AstroGlobal } from 'astro';
import { remove, upsert, type Table } from './db';

// Trata os formulários de criar/editar/apagar numa página de listagem.
export async function handleCrud(Astro: AstroGlobal, table: Table): Promise<Response | null> {
  if (Astro.request.method !== 'POST') return null;
  const form = await Astro.request.formData();
  if (form.get('_action') === 'delete') await remove(table, String(form.get('id')));
  else {
    try {
      await upsert(table, form);
    } catch (e) {
      return new Response(`Erro: ${(e as Error).message}`, { status: 400 });
    }
  }
  return Astro.redirect(Astro.url.pathname, 303);
}
