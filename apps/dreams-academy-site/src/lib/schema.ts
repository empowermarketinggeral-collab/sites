import site from '../data/site.json';

// Dados estruturados (schema.org) para o Google perceber que as páginas são cursos e perguntas frequentes.
const provider = { '@id': `${site.meta.url}/#organizacao` };

interface CourseInput { name: string; description: string; path: string; price?: string; instructor?: string; mode?: 'online' | 'blended' }

export function course({ name, description, path, price, instructor, mode = 'online' }: CourseInput) {
  const url = new URL(path, site.meta.url).href;
  return {
    '@type': 'Course',
    name,
    description,
    url,
    inLanguage: 'pt-PT',
    provider,
    ...(instructor && { instructor: { '@type': 'Person', name: instructor } }),
    hasCourseInstance: { '@type': 'CourseInstance', courseMode: mode },
    ...(price && {
      offers: { '@type': 'Offer', price: price.replace(/[^\d.,]/g, '').replace(',', '.'), priceCurrency: 'EUR', availability: 'https://schema.org/InStock', url, category: 'Paid' },
    }),
  };
}

export function faqPage(items: { q: string; a: string }[]) {
  return {
    '@type': 'FAQPage',
    mainEntity: items.map((i) => ({ '@type': 'Question', name: i.q, acceptedAnswer: { '@type': 'Answer', text: i.a } })),
  };
}
