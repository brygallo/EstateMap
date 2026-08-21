// Route segment config does not travel through a re-export: Next reads it from
// the module that *is* the route. `/property/[id]` declares `revalidate` and
// then redirects here permanently, so the canonical Spanish route — the most
// crawled page on the site — was rendering dynamically on every request and
// answering `Cache-Control: private, no-store`, which also kept it out of the
// CDN.
//
// `revalidate` alone is not enough. A dynamic segment with no
// `generateStaticParams` is treated as dynamically rendered and never enters the
// prerender manifest, which is what the eight working ISR routes here all do
// differently. The empty list is deliberate: prerendering 15k listings at build
// time would cost far more than it saves, so nothing is built ahead and
// `dynamicParams` lets each one render on demand and then be cached for the
// window below — the same shape `/[combo]` uses.
export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  return [];
}

export { default, generateMetadata } from '../../property/[id]/page';
