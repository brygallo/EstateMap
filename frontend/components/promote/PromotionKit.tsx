'use client';

/**
 * The promotion kit screen.
 *
 * Everything here is built to be used in under a minute: the laminas are
 * already rendered, the copy is already written, and each of them is one tap
 * from leaving the page. Nothing asks a question first.
 *
 * The laminas themselves are public URLs (SOC-009) — this screen is the
 * convenience, not the boundary. It carries nothing that the listing does not
 * already show, so the ownership check below is about not offering a stranger a
 * "promote" button for someone else's listing, not about hiding anything.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Check, Copy, Download, ExternalLink, Loader2, Share2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth-context';
import { haptic } from '@/lib/haptics';
import {
  COPY_TONES,
  NETWORK_FORMATS,
  NETWORK_LABELS,
  NETWORK_STEPS,
  SOCIAL_FORMATS,
  buildCopy,
  buildHeadline,
  laminaFilename,
  laminaPath,
  shortUrl,
  type CopyTone,
  type SocialFormat,
  type SocialNetwork,
} from '@/lib/social-kit';
import {
  attemptNativeShareFiles,
  canShareFiles,
  attemptNativeShare,
} from '@/lib/share';
import type { Property } from '@/lib/types';

const NETWORKS: SocialNetwork[] = ['facebook', 'instagram', 'tiktok', 'whatsapp'];

async function fetchLamina(path: string, filename: string): Promise<File | null> {
  try {
    const response = await fetch(path);
    if (!response.ok) return null;
    const blob = await response.blob();
    return new File([blob], filename, { type: 'image/png' });
  } catch {
    return null;
  }
}

function downloadFile(file: File) {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = file.name;
  anchor.click();
  // Revoking immediately can cancel the download in some browsers; one tick is
  // enough for the navigation to have taken the blob.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * One lamina: preview, download, and — on a phone — share the file itself.
 *
 * The file is fetched as soon as the card appears rather than on click. iOS
 * drops the user gesture across an await, so a share handler that fetched
 * first would open nothing at all and report no error.
 */
function LaminaCard({
  property,
  format,
  network,
  caption,
}: {
  property: Property;
  format: SocialFormat;
  network: SocialNetwork;
  caption: string;
}) {
  const spec = SOCIAL_FORMATS[format];
  const path = laminaPath(property, format, network);
  const filename = laminaFilename(property, format);

  // The result is stored together with the path it came from, so switching
  // network or format derives "still preparing" from a mismatch instead of
  // resetting state inside the effect and forcing a second render.
  const [loaded, setLoaded] = useState<{ path: string; file: File | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchLamina(path, filename).then((prepared) => {
      if (!cancelled) setLoaded({ path, file: prepared });
    });
    return () => {
      cancelled = true;
    };
  }, [path, filename]);

  const preparing = loaded?.path !== path;
  const file = preparing ? null : (loaded?.file ?? null);

  const shareable = file !== null && canShareFiles([file]);

  const handleShare = () => {
    if (!file) return;
    haptic('impact');
    attemptNativeShareFiles({ files: [file], text: caption }).then((outcome) => {
      if (outcome === 'unsupported') downloadFile(file);
    });
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-card border border-line bg-surface shadow-card">
      {/* Fixed height so a 9:16 and a 1200x630 sit in cards of the same size;
          otherwise the grid rows step up and down with the aspect ratio. */}
      <div className="flex h-64 items-center justify-center bg-muted p-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- generated PNG, not a project asset */}
        <img
          src={path}
          alt={`Lámina ${spec.label} de la propiedad`}
          width={spec.width}
          height={spec.height}
          className="max-h-full w-auto rounded-input object-contain shadow-card"
        />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <p className="text-sm font-semibold text-textPrimary">{spec.label}</p>
          <p className="text-xs text-textSecondary">{spec.hint}</p>
        </div>
        <div className="mt-auto flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            disabled={preparing || !file}
            onClick={() => file && downloadFile(file)}
          >
            {preparing ? (
              <Loader2 className="animate-spin" aria-hidden />
            ) : (
              <Download aria-hidden />
            )}
            Descargar
          </Button>
          {shareable ? (
            <Button size="sm" className="flex-1" onClick={handleShare}>
              <Share2 aria-hidden />
              Compartir
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CopyBlock({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      haptic('success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('No se pudo copiar. Selecciona el texto y cópialo a mano.');
    }
  }, [text]);

  return (
    <div className="flex flex-col gap-3">
      <textarea
        readOnly
        value={text}
        rows={10}
        aria-label="Texto para publicar"
        className="w-full resize-none rounded-input border border-line bg-background p-3 font-mono text-xs leading-relaxed text-textSecondary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
      />
      <Button onClick={handleCopy} className="self-start">
        {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
        {copied ? 'Copiado' : 'Copiar texto'}
      </Button>
    </div>
  );
}

export default function PromotionKit({ property }: { property: Property }) {
  const { user, loading } = useAuth();
  const [network, setNetwork] = useState<SocialNetwork>('facebook');
  const [tone, setTone] = useState<CopyTone>('cercano');

  const link = shortUrl(property);
  const caption = useMemo(() => buildCopy(property, network, tone), [property, network, tone]);
  const headline = buildHeadline(property);

  const [linkCopied, setLinkCopied] = useState(false);
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setLinkCopied(true);
      haptic('success');
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      toast.error('No se pudo copiar el enlace.');
    }
  };

  const handleShareLink = () => {
    attemptNativeShare({ title: headline, text: caption, url: link });
  };

  // A courtesy gate, not a boundary — every lamina and every word of the copy
  // is derived from the public listing, and the images are open URLs by design
  // (SOC-009). What it prevents is offering a stranger a "promote" button for
  // somebody else's listing, which would mean nothing.
  const isOwner =
    user != null &&
    (String(user.id) === String(property.owner) || user.is_staff === true);

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-5xl items-center justify-center px-4 py-24">
        <Loader2 className="h-6 w-6 animate-spin text-textSecondary" aria-hidden />
        <span className="sr-only">Cargando</span>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-4 px-4 py-24 text-center">
        <h1 className="text-xl font-bold text-textPrimary">Este anuncio no es tuyo</h1>
        <p className="text-sm text-textSecondary">
          El material de promoción lo prepara quien publicó el anuncio. Puedes verlo y
          compartirlo desde su ficha.
        </p>
        <Button asChild>
          <Link href={`/propiedad/${property.id}`}>Ver el anuncio</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8">
      <header className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold text-textPrimary sm:text-3xl">
            Tu anuncio ya está publicado
          </h1>
          <p className="mt-1 text-sm text-textSecondary">
            {headline}. Aquí tienes las imágenes y el texto listos para tus redes.
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-card sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-textPrimary">Enlace corto del anuncio</p>
            <p className="truncate font-mono text-sm text-textSecondary">{link}</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleCopyLink}>
              {linkCopied ? <Check aria-hidden /> : <Copy aria-hidden />}
              {linkCopied ? 'Copiado' : 'Copiar'}
            </Button>
            <Button size="sm" variant="outline" onClick={handleShareLink}>
              <Share2 aria-hidden />
              Compartir
            </Button>
            <Button size="sm" variant="ghost" asChild>
              <Link href={`/propiedad/${property.id}`}>
                <ExternalLink aria-hidden />
                Ver anuncio
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <Tabs value={network} onValueChange={(value) => setNetwork(value as SocialNetwork)}>
        <TabsList className="w-full justify-start overflow-x-auto">
          {NETWORKS.map((item) => (
            <TabsTrigger key={item} value={item}>
              {NETWORK_LABELS[item]}
            </TabsTrigger>
          ))}
        </TabsList>

        {NETWORKS.map((item) => (
          <TabsContent key={item} value={item} className="mt-6 flex flex-col gap-8">
            <section className="flex flex-col gap-4">
              <h2 className="text-lg font-bold text-textPrimary">
                Imágenes para {NETWORK_LABELS[item]}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {NETWORK_FORMATS[item].map((format) => (
                  <LaminaCard
                    key={format}
                    property={property}
                    format={format}
                    network={item}
                    caption={caption}
                  />
                ))}
              </div>
            </section>

            <section className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-textPrimary">Texto listo para pegar</h2>
                <div className="flex gap-1.5">
                  {(Object.keys(COPY_TONES) as CopyTone[]).map((option) => (
                    <Button
                      key={option}
                      size="sm"
                      variant={tone === option ? 'default' : 'outline'}
                      onClick={() => setTone(option)}
                    >
                      {COPY_TONES[option]}
                    </Button>
                  ))}
                </div>
              </div>
              <CopyBlock text={caption} />
            </section>

            <section className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5">
              <h2 className="text-sm font-bold text-textPrimary">
                Cómo publicarlo en {NETWORK_LABELS[item]}
              </h2>
              <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm text-textSecondary">
                {NETWORK_STEPS[item].map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </section>
          </TabsContent>
        ))}
      </Tabs>

      <footer className="flex flex-wrap gap-3 border-t border-line pt-6">
        <Button variant="outline" asChild>
          <Link href="/mis-propiedades">Ir a mis propiedades</Link>
        </Button>
        <Button variant="ghost" asChild>
          <Link href="/publicar-propiedad">Publicar otra propiedad</Link>
        </Button>
      </footer>
    </div>
  );
}
