import type { Metadata } from 'next';

// The page itself is a client component and cannot declare metadata, so without
// this layout the route inherited the root one and stayed indexable. Its URLs
// carry a draft-recovery token: they are meant to be opened once from an email,
// never found in a search result.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function ContinuePublicationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
