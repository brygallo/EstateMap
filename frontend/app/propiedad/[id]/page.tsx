// Route segment config does not travel through a re-export: Next reads
// `revalidate` from the module that *is* the route. `/property/[id]` declares it
// and then redirects here permanently, so until this line existed the canonical
// Spanish route — the most crawled page on the site — rendered dynamically on
// every request and answered `Cache-Control: private, no-store`, which also made
// it ineligible for the CDN. Keep this value in step with the English module.
export const revalidate = 300;

export { default, generateMetadata } from '../../property/[id]/page';
