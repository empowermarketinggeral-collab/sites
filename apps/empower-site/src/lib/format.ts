const date = new Intl.DateTimeFormat('pt-PT', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

export function formatDate(d: Date): string {
  return date.format(d);
}
