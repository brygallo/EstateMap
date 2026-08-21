import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Building2,
  Clock,
  KeyRound,
  Layers,
  MapPin,
  RefreshCw,
  Ruler,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';

import { getMarketStats, integer, money } from '@/lib/market-stats';
import { generatePageMetadata } from '@/lib/metadata';

export const revalidate = 3600;

export const metadata = generatePageMetadata(
  'Cómo calculamos los precios',
  'Metodología de las estadísticas inmobiliarias de Geo Propiedades Ecuador: de dónde salen los datos, qué cuenta como propiedad activa, cómo se excluyen los extremos y qué limitaciones tienen las cifras.',
  '/metodologia'
);

/**
 * The page every published figure points at.
 *
 * A portal that wants to be quoted has to be checkable first: anyone repeating
 * «el m² en Guayaquil cuesta X» is putting their own credibility behind a number
 * they did not compute, and they are entitled to know what it counted, what it
 * threw away and what it cannot say. Everything here describes rules that exist
 * in the code, not intentions.
 *
 * It wears the same shell as the statistics pages it explains — hero, cards
 * riding over it, figures in `font-geo` — because a page that looks like a
 * different site is a page nobody believes belongs to the numbers.
 */
export default async function MethodologyPage() {
  const stats = await getMarketStats();
  const sample = stats?.overall.count ?? null;
  const excluded = stats?.outliers_excluded ?? null;
  const updated = stats?.overall.updated_at ? new Date(stats.overall.updated_at) : null;
  const updatedLabel = updated
    ? updated.toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  const sections = [
    {
      id: 'origen',
      icon: Layers,
      title: 'De dónde salen los datos',
      body: (
        <>
          <p>
            Todas las cifras se calculan sobre los anuncios publicados en este portal. Hay dos
            orígenes y no se mezclan sin decirlo: los que publica directamente quien vende o
            alquila, y los importados del portal Plusvalía, que hoy son la mayor parte del
            inventario.
          </p>
          <p>
            Son <strong className="font-semibold text-textPrimary">precios pedidos</strong>, los
            que fija quien publica. No son precios de operaciones cerradas: nadie en Ecuador
            publica esos datos de forma abierta, y presentarlos como tales sería falso.
          </p>
        </>
      ),
    },
    {
      id: 'activa',
      icon: Building2,
      title: 'Qué cuenta como propiedad activa',
      body: (
        <p>
          Un anuncio entra en el cálculo cuando sigue publicado, no está marcado como duplicado de
          otro y declara precio y área mayores que cero. Un anuncio retirado deja de contar el
          mismo día. Por eso el inventario que se lee aquí es el de hoy, no un histórico acumulado.
        </p>
      ),
    },
    {
      id: 'metro',
      icon: Ruler,
      title: 'Cómo se calcula el precio por metro cuadrado',
      body: (
        <p>
          Precio dividido por área, anuncio por anuncio. Se descartan de entrada los resultados por
          debajo de&nbsp;$1/m² y por encima de&nbsp;$10.000/m²: en ese rango no hay mercado, hay un
          error de captura — un área en hectáreas escrita como metros, o un precio con un cero de
          más.
        </p>
      ),
    },
    {
      id: 'extremos',
      icon: BarChart3,
      title: 'Cómo se excluyen los extremos',
      body: (
        <>
          <p>
            Sobre los valores que quedan se aplica el método del rango intercuartílico: se calcula
            el cuartil 25 y el 75, y se excluye lo que caiga a más de 1,5 veces esa distancia por
            fuera. Es un criterio fijo, no una selección manual.
          </p>
          {excluded !== null && (
            <p>
              En el cálculo nacional vigente se excluyeron{' '}
              <strong className="font-semibold text-textPrimary">
                {integer(excluded)} anuncios
              </strong>{' '}
              por ese criterio.
            </p>
          )}
        </>
      ),
    },
    {
      id: 'mediana',
      icon: TrendingUp,
      title: 'Por qué la mediana manda sobre el promedio',
      body: (
        <>
          <p>
            El promedio de un mercado que mezcla un departamento de 60&nbsp;m² con una hacienda de
            40&nbsp;hectáreas no describe a ninguno de los dos. Donde se puede, se publica la{' '}
            <strong className="font-semibold text-textPrimary">mediana</strong>: el valor que deja
            la mitad de los anuncios por debajo y la mitad por encima.
          </p>
          <p>
            Una mediana solo se publica con al menos cinco anuncios en el corte. Por debajo de eso
            el campo viene vacío y la página no muestra nada: preferimos un hueco a una cifra que
            nadie debería citar.
          </p>
        </>
      ),
    },
    {
      id: 'zonas',
      icon: MapPin,
      title: 'Cómo se determinan las zonas',
      body: (
        <>
          <p>
            La zona es el primer tramo de la dirección, el nivel geográfico más fino que tiene el
            catálogo: un barrio, una urbanización, a veces una avenida. La clave ignora mayúsculas
            y tildes, de modo que «Cumbayá», «CUMBAYA» y «Cumbaya» son un solo lugar.
          </p>
          <p>
            Se descarta lo que no es un lugar. Si el tramo describe lo que se vende en vez de dónde
            está —«Casa en Venta», «Vendo casa en Monteserrín»— no genera zona, ni página, ni
            precio promedio. Y una zona absorbe sus rincones: «Cumbayá Sector La Viña» cuenta
            dentro de Cumbayá en lugar de competir con ella.
          </p>
          <p>
            Una zona necesita al menos cinco anuncios para tener página propia, y al menos tres con
            precio y área válidos para mostrar un precio por metro cuadrado.
          </p>
        </>
      ),
    },
    {
      id: 'alquiler',
      icon: KeyRound,
      title: 'Venta y alquiler no se mezclan',
      body: (
        <p>
          Las métricas principales se calculan solo sobre venta, porque un precio total y una renta
          mensual no son comparables. A los anuncios de alquiler{' '}
          <strong className="font-semibold text-textPrimary">nunca</strong> se les calcula precio
          por metro cuadrado: dividir una renta mensual entre un área no da un $/m², da un número
          sin significado.
        </p>
      ),
    },
    {
      id: 'antiguedad',
      icon: Clock,
      title: 'Qué significa «antigüedad media del anuncio»',
      body: (
        <p>
          Es el promedio de días transcurridos desde que cada anuncio entró en esta base de datos,
          contando solo los que siguen activos.{' '}
          <strong className="font-semibold text-textPrimary">
            No mide cuánto tarda en venderse una propiedad
          </strong>
          : los anuncios que se vendieron o se retiraron ya no están en la muestra. Y la fecha es
          la del alta aquí, no la de la publicación original, así que una importación masiva
          reinicia ese reloj para miles de anuncios a la vez.
        </p>
      ),
    },
    {
      id: 'actualizacion',
      icon: RefreshCw,
      title: 'Cuándo se actualizan',
      body: (
        <>
          <p>
            Las cifras se recalculan con el inventario: cuando un anuncio se publica, se edita o se
            retira, las páginas que lo incluían se regeneran. No hay una fecha de corte mensual.
          </p>
          <p>
            Además, cada madrugada se guarda un corte del mercado —conteo, mediana, promedio y
            rango por país, ciudad, tipo y zona— para poder comparar el mercado consigo mismo más
            adelante. Esa serie empieza en agosto de 2026.
          </p>
        </>
      ),
    },
    {
      id: 'limites',
      icon: AlertTriangle,
      title: 'Qué no pueden decir estos datos',
      body: (
        <ul className="ml-5 list-disc space-y-2">
          <li>No dicen a cuánto se vendió nada. Son precios de oferta.</li>
          <li>
            No cubren el mercado completo: cubren lo que se publica en este portal y en la fuente
            que importamos.
          </li>
          <li>
            No sustituyen un avalúo. Un avalúo mira una propiedad concreta; esto mira lo que piden
            los demás.
          </li>
          <li>
            La evolución compara cohortes distintas de anuncios entre periodos, no la variación de
            precio de un mismo inmueble.
          </li>
        </ul>
      ),
    },
  ];

  const kpis = [
    sample !== null && {
      icon: Building2,
      label: 'Anuncios en el cálculo',
      value: integer(sample),
      note: 'Venta activa, con precio y área válidos',
    },
    stats && {
      icon: Ruler,
      label: stats.overall.median_price_m2 ? 'Precio mediano por m²' : 'Precio promedio por m²',
      value: `${money(stats.overall.median_price_m2 ?? stats.overall.avg_price_m2)}/m²`,
      note: stats.overall.median_price_m2
        ? `Promedio ${money(stats.overall.avg_price_m2)}/m²`
        : undefined,
    },
    excluded !== null && {
      icon: BarChart3,
      label: 'Valores extremos excluidos',
      value: integer(excluded),
      note: 'Por el método del rango intercuartílico',
    },
  ].filter(Boolean) as Array<{
    icon: typeof Ruler;
    label: string;
    value: string;
    note?: string;
  }>;

  return (
    <main className="min-h-[calc(100dvh-var(--app-header-height))] bg-background">
      <section className="border-b border-line bg-gradient-to-br from-primary via-primaryHover to-[var(--navy)] text-white">
        <div className="mx-auto max-w-7xl px-4 pb-12 pt-6 sm:px-6 sm:pb-14 sm:pt-8 lg:px-8 lg:pb-14 lg:pt-10">
          <nav aria-label="Migas de pan" className="mb-3">
            <ol className="flex flex-wrap items-center gap-1.5 text-xs text-white/70 sm:text-sm">
              <li>
                <Link href="/" className="transition-colors hover:text-white">
                  Inicio
                </Link>
              </li>
              <li className="flex items-center gap-1.5">
                <span aria-hidden className="text-white/40">/</span>
                <Link href="/estadisticas-inmobiliarias" className="transition-colors hover:text-white">
                  Estadísticas
                </Link>
              </li>
              <li className="flex items-center gap-1.5" aria-current="page">
                <span aria-hidden className="text-white/40">/</span>
                <span className="font-medium text-white">Metodología</span>
              </li>
            </ol>
          </nav>
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold ring-1 ring-white/20">
              <ShieldCheck className="h-4 w-4" /> Cómo se calculan estas cifras
            </span>
            <h1 className="mt-2 text-2xl font-black tracking-tight sm:mt-3 sm:text-3xl lg:text-4xl">
              ¿De dónde sale el precio del metro cuadrado?
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/80 sm:mt-3 sm:text-base sm:leading-7">
              Cada cifra que publicamos sale de una regla escrita en el código, no de un criterio
              que cambie según el resultado
              {updatedLabel ? `. Última actualización: ${updatedLabel}` : ''}.
            </p>
            <Link
              href="/estadisticas-inmobiliarias"
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-primary shadow-cardHover sm:mt-5"
            >
              Ver las estadísticas <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <div className="relative z-10 mx-auto -mt-6 max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        {kpis.length > 0 && (
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4">
            {kpis.map((kpi) => (
              <div
                key={kpi.label}
                className="min-w-0 rounded-card border border-line bg-white p-4 shadow-card sm:p-5"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-button bg-primaryLight text-primary sm:h-10 sm:w-10">
                  <kpi.icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
                </span>
                <p className="mt-3 text-[0.68rem] font-semibold uppercase leading-4 tracking-wide text-textSecondary sm:mt-4 sm:text-xs">
                  {kpi.label}
                </p>
                <p className="mt-1 break-words font-geo text-lg font-black text-textPrimary sm:text-xl">
                  {kpi.value}
                </p>
                {kpi.note && (
                  <p className="mt-1 text-[0.68rem] leading-4 text-textSecondary">{kpi.note}</p>
                )}
              </div>
            ))}
          </section>
        )}

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-6">
            {sections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className="scroll-mt-24 rounded-card border border-line bg-white p-5 shadow-card sm:p-7"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-button bg-primaryLight text-primary">
                    <section.icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <h2 className="text-lg font-bold leading-6 text-textPrimary sm:text-xl">
                    {section.title}
                  </h2>
                </div>
                <div className="mt-3 space-y-3 text-sm leading-6 text-textSecondary sm:text-base sm:leading-7">
                  {section.body}
                </div>
              </section>
            ))}
          </div>

          <aside className="flex flex-col gap-6 lg:sticky lg:top-24">
            <nav
              aria-labelledby="indice-metodologia"
              className="rounded-card border border-line bg-white p-5 shadow-card"
            >
              <p
                id="indice-metodologia"
                className="text-[0.68rem] font-semibold uppercase tracking-wide text-textSecondary"
              >
                En esta página
              </p>
              <ol className="mt-3 space-y-2">
                {sections.map((section) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="text-sm leading-5 text-textSecondary transition-colors hover:text-primary"
                    >
                      {section.title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>

            <section className="rounded-card border border-line bg-primaryLight p-5 shadow-card">
              <p className="text-sm font-semibold text-textPrimary">Cómo citar estos datos</p>
              <p className="mt-2 text-sm leading-6 text-textSecondary">
                Puedes usar estas cifras citando la fuente y la fecha, porque cambian con el
                inventario.
              </p>
              <blockquote className="mt-3 rounded-lg border-l-4 border-primary bg-white p-3 text-sm leading-6 text-textPrimary">
                Fuente: Geo Propiedades Ecuador
                {sample !== null ? `, sobre ${integer(sample)} anuncios en venta activos` : ''}
                {updatedLabel ? `, actualizado el ${updatedLabel}` : ''}.
              </blockquote>
              <p className="mt-3 text-sm leading-6 text-textSecondary">
                Si encuentras un dato que no cuadra, escríbenos: corregirlo nos importa más que
                sostenerlo.
              </p>
            </section>

            <section className="rounded-card border border-line bg-white p-5 shadow-card">
              <p className="text-sm font-semibold text-textPrimary">Seguir explorando</p>
              <div className="mt-3 flex flex-col gap-2">
                <Link
                  href="/estadisticas-inmobiliarias"
                  className="inline-flex min-h-11 items-center justify-between gap-2 rounded-button bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primaryHover"
                >
                  Ver las estadísticas <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <Link
                  href="/propiedades"
                  className="inline-flex min-h-11 items-center justify-between gap-2 rounded-button border border-line px-4 text-sm font-semibold text-textPrimary transition-colors hover:border-primary hover:text-primary"
                >
                  Explorar el catálogo <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
