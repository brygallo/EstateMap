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
import { Check, Copy, Download, ExternalLink, Layers, Loader2, RotateCcw, Share2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import GalleryViewer from '@/components/ui/GalleryViewer';
import PromotionResults from '@/components/promote/PromotionResults';
import { trackEvent } from '@/lib/analytics';
import { useAuth } from '@/lib/auth-context';
import { haptic } from '@/lib/haptics';
import {
  COPY_TONES,
  LAMINA_MIME,
  NETWORK_FORMATS,
  NETWORK_LABELS,
  NETWORK_STEPS,
  SOCIAL_FORMATS,
  buildArtworkHeadline,
  buildCopy,
  buildHeadline,
  carouselFrames,
  closureKind,
  laminaFilename,
  laminaPath,
  momentFormats,
  shortUrl,
  type ClosureKind,
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

/**
 * What the closure card is called, in the words the lamina itself uses.
 *
 * Sentence case rather than the stamp's shouting capitals: this is the name of
 * a card in a list, next to "Cuadrada 1:1" and "Vendido", not the word printed
 * across the image.
 */
const CLOSURE_MOMENT_LABELS: Record<ClosureKind, string> = {
  sold: 'Vendido',
  rented: 'Arrendado',
};

/**
 * What the kit reports about itself.
 *
 * These three names are read by the backend (`KIT_SHARE_EVENTS`) and they are
 * the only evidence that the kit was ever used: without them "nobody has
 * shared this" and "it was shared and brought nobody" are the same row of
 * zeros, and the owner cannot tell which of the two is their problem.
 *
 * Every one of them carries `property_id`, because the report is per listing.
 */
type KitEventName =
  | 'promotion_kit_shared'
  | 'promotion_kit_downloaded'
  | 'promotion_kit_copied';

type KitEventHandler = (
  name: KitEventName,
  payload?: Record<string, string | number | boolean>
) => void;

async function fetchLamina(
  path: string,
  filename: string,
  type: string
): Promise<File | null> {
  try {
    const response = await fetch(path);
    if (!response.ok) return null;
    const blob = await response.blob();
    // The type is declared rather than taken from the blob because it is what
    // the share sheet and the filename agree on: the route answers JPEG for
    // every lamina that is mostly photograph and PNG for the map.
    return new File([blob], filename, { type });
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
  artworkMessage,
  label,
  onEvent,
}: {
  property: Property;
  format: SocialFormat;
  network: SocialNetwork;
  caption: string;
  artworkMessage: string;
  /**
   * Overrides the format's own name. Only the closure lamina needs it: one
   * format draws two different stamps, so its fixed label cannot describe both.
   */
  label?: string;
  onEvent: KitEventHandler;
}) {
  const spec = SOCIAL_FORMATS[format];
  const title = label ?? spec.label;
  const type = LAMINA_MIME[format];

  // Every format but one is a single image. The carousel is as many as this
  // listing can fill, which is a fact about the listing: `carouselFrames` is
  // the same predicate the route answers 404 with, so a card is never offered
  // for a frame that would not render.
  const frames = format === 'carousel' ? carouselFrames(property) : 1;
  const paths = useMemo(
    () =>
      Array.from({ length: frames }, (_, index) =>
        laminaPath(property, format, network, artworkMessage, index + 1)
      ),
    [property, format, network, artworkMessage, frames]
  );
  const key = paths.join('|');

  // The result is stored together with the paths it came from, so switching
  // network or format derives "still preparing" from a mismatch instead of
  // resetting state inside the effect and forcing a second render.
  const [loaded, setLoaded] = useState<{ key: string; files: File[] } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      paths.map((path, index) =>
        fetchLamina(
          path,
          laminaFilename(property, format, frames > 1 ? index + 1 : undefined),
          type
        )
      )
    ).then((prepared) => {
      if (!cancelled) {
        setLoaded({ key, files: prepared.filter((file): file is File => file !== null) });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [key, paths, property, format, frames, type]);

  const preparing = loaded?.key !== key;
  const files = preparing ? [] : (loaded?.files ?? []);
  const ready = files.length > 0;

  const shareable = ready && canShareFiles(files);

  const saveAll = () => {
    // Staggered: a browser that sees three downloads inside one tick treats the
    // second and third as a popup and blocks them.
    files.forEach((file, index) => setTimeout(() => downloadFile(file), index * 350));
  };

  const handleDownload = () => {
    if (!ready) return;
    saveAll();
    onEvent('promotion_kit_downloaded', { network, format, frames });
  };

  const handleShare = () => {
    if (!ready) return;
    haptic('impact');
    attemptNativeShareFiles({ files, text: caption }).then((outcome) => {
      // `dismissed` means the sheet opened and the person backed out, which is
      // not a share and must not be counted as one.
      if (outcome === 'shared') {
        onEvent('promotion_kit_shared', { network, format, method: 'native', frames });
        return;
      }
      if (outcome === 'unsupported') {
        saveAll();
        onEvent('promotion_kit_shared', { network, format, method: 'download', frames });
      }
    });
  };

  return (
    <>
    <div className="flex flex-col overflow-hidden rounded-card border border-line bg-surface shadow-card transition-shadow hover:shadow-cardHover">
      {/* Fixed height so a 9:16 and a 1200x630 sit in cards of the same size;
          otherwise the grid rows step up and down with the aspect ratio. */}
      <button
        type="button"
        onClick={() => {
          setPreviewIndex(0);
          setPreviewOpen(true);
        }}
        className="relative flex h-64 items-center justify-center bg-muted p-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
        aria-label={`Ampliar lámina ${title}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- generated image, not a project asset */}
        <img
          src={paths[0]}
          alt={`Lámina ${title} de la propiedad`}
          width={spec.width}
          height={spec.height}
          className="max-h-full w-auto rounded-input object-contain shadow-card"
        />
        {frames > 1 ? (
          <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-navy/70 px-2.5 py-1 text-xs font-semibold text-white">
            <Layers className="size-3.5" aria-hidden />
            {frames}
          </span>
        ) : null}
      </button>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <p className="text-sm font-semibold text-textPrimary">{title}</p>
          <p className="text-xs text-textSecondary">{spec.hint}</p>
        </div>
        <div className="mt-auto flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            disabled={preparing || !ready}
            onClick={handleDownload}
          >
            {preparing ? (
              <Loader2 className="animate-spin" aria-hidden />
            ) : (
              <Download aria-hidden />
            )}
            {frames > 1 ? `Descargar las ${frames}` : 'Descargar'}
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
      {previewOpen && (
        <GalleryViewer
          images={paths.map((path) => ({ image: path }))}
          index={previewIndex}
          onIndexChange={setPreviewIndex}
          onClose={() => setPreviewOpen(false)}
          title={`Lámina ${title}`}
        />
      )}
    </>
  );
}

function CopyBlock({
  text,
  suggestedText,
  onChange,
  onReset,
  onCopied,
}: {
  text: string;
  suggestedText: string;
  onChange: (text: string) => void;
  onReset: () => void;
  onCopied: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      haptic('success');
      onCopied();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('No se pudo copiar. Selecciona el texto y cópialo a mano.');
    }
  }, [text, onCopied]);

  return (
    <div className="flex flex-col gap-3">
      <textarea
        value={text}
        onChange={(event) => onChange(event.target.value)}
        rows={10}
        aria-label="Edita el texto sugerido para publicar"
        className="w-full resize-y rounded-input border border-line bg-background p-3 text-sm leading-relaxed text-textPrimary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={handleCopy}>
          {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
          {copied ? 'Copiado' : 'Copiar texto'}
        </Button>
        {text !== suggestedText ? (
          <Button variant="outline" onClick={onReset}>
            <RotateCcw aria-hidden />
            Restaurar sugerencia
          </Button>
        ) : null}
        <span className="text-xs text-textSecondary">Puedes cambiar el texto antes de publicarlo.</span>
      </div>
    </div>
  );
}

export default function PromotionKit({ property }: { property: Property }) {
  const { user, loading } = useAuth();
  const [network, setNetwork] = useState<SocialNetwork>('facebook');
  const [tone, setTone] = useState<CopyTone>('cercano');
  const [customCopy, setCustomCopy] = useState<Record<string, string>>({});
  const suggestedArtworkMessage = useMemo(() => buildArtworkHeadline(property), [property]);
  const [artworkMessage, setArtworkMessage] = useState(suggestedArtworkMessage);

  const link = shortUrl(property);
  const suggestedCaption = useMemo(
    () => buildCopy(property, network, tone),
    [property, network, tone]
  );
  const copyKey = `${network}:${tone}`;
  const caption = customCopy[copyKey] ?? suggestedCaption;
  const headline = buildHeadline(property);

  // Asked of `social-kit` rather than derived here from `closed_reason` and
  // `previous_price`: the route answers 404 when the moment did not happen, and
  // one shared predicate is what stops this screen from ever drawing a card for
  // an image the route refuses to render.
  const moments = useMemo(() => momentFormats(property), [property]);

  // The closure format draws "VENDIDO" or "ARRENDADO" depending on
  // `closed_reason`, but its entry in SOCIAL_FORMATS carries a single fixed
  // name. Left alone, a rented listing gets a card headed "Vendido" sitting
  // directly above an image that reads ARRENDADO.
  const closure = closureKind(property);
  const momentLabels: Partial<Record<SocialFormat, string>> = closure
    ? { sold: CLOSURE_MOMENT_LABELS[closure] }
    : {};

  // Bumped by every kit action so the results panel re-reads itself: after the
  // first share the panel has something different to say, and asking someone to
  // reload the page to see it defeats the point of showing it.
  const [kitActions, setKitActions] = useState(0);

  /**
   * Report one use of the kit.
   *
   * `property_id` is always present because the whole report is per listing;
   * the backend groups by it and ignores anything without it.
   */
  const trackKitEvent = useCallback<KitEventHandler>(
    (name, payload = {}) => {
      trackEvent(name, { property_id: property.id, ...payload });
      setKitActions((value) => value + 1);
    },
    [property.id]
  );

  const [linkCopied, setLinkCopied] = useState(false);
  const copyLink = useCallback(
    async (payload: Record<string, string | number | boolean>) => {
      try {
        await navigator.clipboard.writeText(link);
        setLinkCopied(true);
        haptic('success');
        trackKitEvent('promotion_kit_copied', payload);
        setTimeout(() => setLinkCopied(false), 2000);
      } catch {
        toast.error('No se pudo copiar el enlace.');
      }
    },
    [link, trackKitEvent]
  );

  const handleCopyLink = () => {
    void copyLink({ content: 'link', source: 'link_card' });
  };

  const handleShareLink = () => {
    attemptNativeShare({ title: headline, text: caption, url: link }).then((outcome) => {
      if (outcome === 'shared') {
        trackKitEvent('promotion_kit_shared', { content: 'link', method: 'native' });
        return;
      }
      // Desktop has no share sheet, and a button that does nothing is worse
      // than a button that copies. The link on the clipboard is the same thing
      // the sheet would have handed over.
      if (outcome === 'unsupported') {
        void copyLink({ content: 'link', source: 'share_fallback' });
        toast.success('Enlace copiado. Pégalo donde quieras compartirlo.');
      }
    });
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

      {/* Right under the link and above the material: on the first visit it
          says what will happen when the anuncio is shared, and on every visit
          after that it is the reason to share it again (SOC-101). Private by
          construction — this screen is only offered to the owner, and visit
          counts are never shown in public. */}
      <PromotionResults propertyId={property.id} refreshKey={kitActions} />

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
            <section className="grid gap-4 rounded-card border border-line bg-surface p-5 shadow-card md:grid-cols-[1fr_auto] md:items-end">
              <div className="min-w-0">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-bold text-textPrimary">Mensaje dentro de la imagen</h2>
                    <p className="text-xs text-textSecondary">Personaliza el gancho; el diseño se actualiza automáticamente.</p>
                  </div>
                  <span className="shrink-0 text-xs text-textSecondary">{artworkMessage.length}/72</span>
                </div>
                <input
                  value={artworkMessage}
                  onChange={(event) => setArtworkMessage(event.target.value.slice(0, 72))}
                  maxLength={72}
                  aria-label="Mensaje comercial de la imagen"
                  className="h-11 w-full rounded-input border border-line bg-background px-3 text-sm font-semibold text-textPrimary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
                />
              </div>
              <Button
                variant="outline"
                disabled={artworkMessage === suggestedArtworkMessage}
                onClick={() => setArtworkMessage(suggestedArtworkMessage)}
              >
                <RotateCcw aria-hidden />
                Restaurar base
              </Button>
            </section>

            {/* Ahead of the standing material on purpose: a price drop or a
                closure is news, and news is the only thing that earns a second
                post about a listing somebody already shared once. Absent for
                most listings, which is why these never sit in NETWORK_FORMATS. */}
            {moments.length > 0 ? (
              <section className="flex flex-col gap-4">
                <div>
                  <h2 className="text-lg font-bold text-textPrimary">Novedades de este anuncio</h2>
                  <p className="text-sm text-textSecondary">
                    Algo cambió y da motivo para volver a publicarlo.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {moments.map((format) => (
                    <LaminaCard
                      key={format}
                      property={property}
                      format={format}
                      network={item}
                      caption={caption}
                      artworkMessage={artworkMessage}
                      label={momentLabels[format]}
                      onEvent={trackKitEvent}
                    />
                  ))}
                </div>
              </section>
            ) : null}

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
                    artworkMessage={artworkMessage}
                    onEvent={trackKitEvent}
                  />
                ))}
              </div>
            </section>

            <section className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-textPrimary">Texto sugerido para publicar</h2>
                  <p className="text-xs text-textSecondary">Úsalo como base y personalízalo con tu propia voz.</p>
                </div>
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
              <CopyBlock
                text={caption}
                suggestedText={suggestedCaption}
                onChange={(text) =>
                  setCustomCopy((current) => ({ ...current, [copyKey]: text }))
                }
                onReset={() =>
                  setCustomCopy((current) => {
                    const next = { ...current };
                    delete next[copyKey];
                    return next;
                  })
                }
                onCopied={() =>
                  trackKitEvent('promotion_kit_copied', {
                    content: 'caption',
                    network: item,
                    tone,
                  })
                }
              />
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
