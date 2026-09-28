import site from '../data/site.json';

// Um href pode ser um URL ou o nome de um link em site.json (ex.: "programa", "checklist").
export function href(value: string): string {
  return (site.links as Record<string, string>)[value] ?? value;
}

export function isExternal(url: string): boolean {
  return /^https?:\/\//.test(url);
}

export function linkAttrs(value: string) {
  const url = href(value);
  return isExternal(url) ? { href: url, target: '_blank', rel: 'noopener noreferrer' } : { href: url };
}
