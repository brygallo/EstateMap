import Link from 'next/link';
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
 */
export default async function MethodologyPage() {
  const stats = await getMarketStats();
  const sample = stats?.overall.count ?? null;
  const excluded = stats?.outliers_excluded ?? null;
  const updated = stats?.overall.updated_at ? new Date(stats.overall.updated_at) : null;

  const sections = [
    {
      id: 'origen',
      title: 'De dónde salen los datos',
      body: (
        <>
          <p>
            Todas las cifras se calculan sobre los anuncios publicados en este
            portal. Hay dos orígenes y no se mezclan sin decirlo: los anuncios
            que publica directamente quien vende o alquila, y los anuncios
            importados del portal Plusvalía, que hoy son la mayor parte del
            inventario.
          </p>
          <p>
            Son <strong>precios pedidos</strong>, los que fija quien publica. No
            son precios de operaciones cerradas: nadie en Ecuador publica esos
            datos de forma abierta, y presentarlos como tales sería falso.
          </p>
        </>
      ),
    },
    {
      id: 'activa',
      title: 'Qué cuenta como propiedad activa',
      body: (
        <p>
          Un anuncio entra en el cálculo cuando sigue publicado, no está marcado
          como duplicado de otro y declara precio y área mayores que cero. Un
          anuncio retirado deja de contar el mismo día. Por eso el inventario que
          se lee aquí es el de hoy, no un histórico acumulado.
        </p>
      ),
    },
    {
      id: 'metro',
      title: 'Cómo se calcula el precio por metro cuadrado',
      body: (
        <p>
          Precio dividido por área, anuncio por anuncio. Se descartan de entrada
          los resultados por debajo de&nbsp;$1/m² y por encima de&nbsp;$10.000/m²:
          en ese rango no hay mercado, hay un error de captura — un área en
          hectáreas escrita como metros, o un precio con un cero de más.
        </p>
      ),
    },
    {
      id: 'extremos',
      title: 'Cómo se excluyen los extremos',
      body: (
        <>
          <p>
            Sobre los valores que quedan se aplica el método del rango
            intercuartílico: se calcula el cuartil 25 y el 75, y se excluye lo
            que caiga a más de 1,5 veces esa distancia por fuera. Es un criterio
            fijo, no una selección manual.
          </p>
          {excluded !== null && (
            <p>
              En el cálculo nacional vigente se excluyeron{' '}
              <strong>{integer(excluded)} anuncios</strong> por ese criterio.
            </p>
          )}
        </>
      ),
    },
    {
      id: 'mediana',
      title: 'Por qué la mediana manda sobre el promedio',
      body: (
        <>
          <p>
            El promedio de un mercado que mezcla un departamento de 60&nbsp;m² con
            una hacienda de 40&nbsp;hectáreas no describe a ninguno de los dos.
            Donde se puede, se publica la <strong>mediana</strong>: el valor que
            deja la mitad de los anuncios por debajo y la mitad por encima.
          </p>
          <p>
            Una mediana solo se publica con al menos cinco anuncios en el corte.
            Por debajo de eso el campo viene vacío y la página no muestra nada:
            preferimos un hueco a una cifra que nadie debería citar.
          </p>
        </>
      ),
    },
    {
      id: 'zonas',
      title: 'Cómo se determinan las zonas',
      body: (
        <>
          <p>
            La zona es el primer tramo de la dirección, que es el nivel
            geográfico más fino que tiene el catálogo: un barrio, una
            urbanización, a veces una avenida. La clave ignora mayúsculas y
            tildes, de modo que «Cumbayá», «CUMBAYA» y «Cumbaya» son un solo
            lugar.
          </p>
          <p>
            Se descarta lo que no es un lugar. Si el tramo describe lo que se
            vende en vez de dónde está —«Casa en Venta», «Terreno de Venta en
            Tumbaco»— no genera zona, ni página, ni precio promedio. Y una zona
            absorbe sus rincones: «Cumbayá Sector La Viña» cuenta dentro de
            Cumbayá en lugar de competir con ella.
          </p>
          <p>
            Una zona necesita al menos cinco anuncios para tener página propia, y
            al menos tres con precio y área válidos para mostrar un precio por
            metro cuadrado.
          </p>
        </>
      ),
    },
    {
      id: 'alquiler',
      title: 'Venta y alquiler no se mezclan',
      body: (
        <p>
          Las métricas principales se calculan solo sobre venta, porque un precio
          total y una renta mensual no son comparables. A los anuncios de
          alquiler <strong>nunca</strong> se les calcula precio por metro
          cuadrado: dividir una renta mensual entre un área no da un $/m², da un
          número sin significado.
        </p>
      ),
    },
    {
      id: 'antiguedad',
      title: 'Qué significa «antigüedad media del anuncio»',
      body: (
        <p>
          Es el promedio de días transcurridos desde que cada anuncio entró en
          esta base de datos, contando solo los que siguen activos.{' '}
          <strong>No mide cuánto tarda en venderse una propiedad</strong>: los
          anuncios que se vendieron o se retiraron ya no están en la muestra. Y
          la fecha es la del alta aquí, no la de la publicación original, así que
          una importación masiva reinicia ese reloj para miles de anuncios a la
          vez.
        </p>
      ),
    },
    {
      id: 'actualizacion',
      title: 'Cuándo se actualizan',
      body: (
        <>
          <p>
            Las cifras se recalculan con el inventario: cuando un anuncio se
            publica, se edita o se retira, las páginas que lo incluían se
            regeneran. No hay una fecha de corte mensual.
          </p>
          <p>
            Además, cada madrugada se guarda un corte del mercado —conteo,
            mediana, promedio y rango por país, ciudad, tipo y zona— para poder
            comparar el mercado consigo mismo más adelante. Esa serie empieza en
            agosto de 2026.
          </p>
        </>
      ),
    },
    {
      id: 'limites',
      title: 'Qué no pueden decir estos datos',
      body: (
        <ul className="ml-5 list-disc space-y-2">
          <li>
            No dicen a cuánto se vendió nada. Son precios de oferta.
          </li>
          <li>
            No cubren el mercado completo: cubren lo que se publica en este
            portal y en la fuente que importamos.
          </li>
          <li>
            No sustituyen un avalúo. Un avalúo mira una propiedad concreta; esto
            mira lo que piden los demás.
          </li>
          <li>
            La evolución compara cohortes distintas de anuncios entre periodos,
            no la variación de precio de un mismo inmueble.
          </li>
        </ul>
      ),
    },
  ];

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:py-14">
      <nav aria-label="Ruta" className="text-sm text-textSecondary">
        <Link href="/" className="hover:text-primary">
          Inicio
        </Link>
        <span className="mx-2">/</span>
        <Link href="/estadisticas-inmobiliarias" className="hover:text-primary">
          Estadísticas
        </Link>
        <span className="mx-2">/</span>
        <span className="text-textPrimary">Metodología</span>
      </nav>

      <h1 className="mt-4 text-3xl font-bold leading-tight text-textPrimary sm:text-4xl">
        Cómo calculamos los precios
      </h1>
      <p className="mt-4 text-lg leading-7 text-textSecondary">
        Cada cifra que publicamos sale de una regla escrita en el código, no de
        un criterio que cambie según el resultado. Esta página describe esas
        reglas para que cualquiera pueda decidir si nuestras cifras le sirven.
      </p>

      {sample !== null && (
        <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-3">
          <div className="bg-white p-4">
            <dt className="text-xs uppercase tracking-wide text-textSecondary">
              Anuncios en el cálculo
            </dt>
            <dd className="mt-1 font-geo text-2xl font-bold tabular-nums text-textPrimary">
              {integer(sample)}
            </dd>
          </div>
          <div className="bg-white p-4">
            <dt className="text-xs uppercase tracking-wide text-textSecondary">
              Precio por m² promedio
            </dt>
            <dd className="mt-1 font-geo text-2xl font-bold tabular-nums text-textPrimary">
              {money(stats!.overall.avg_price_m2)}
            </dd>
          </div>
          <div className="bg-white p-4">
            <dt className="text-xs uppercase tracking-wide text-textSecondary">
              Última actualización
            </dt>
            <dd className="mt-1 text-sm font-semibold text-textPrimary">
              {updated
                ? updated.toLocaleDateString('es-EC', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })
                : 'Con cada cambio del inventario'}
            </dd>
          </div>
        </dl>
      )}

      <div className="mt-10 space-y-10">
        {sections.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-24">
            <h2 className="text-xl font-bold text-textPrimary">{section.title}</h2>
            <div className="mt-3 space-y-3 leading-7 text-textSecondary">{section.body}</div>
          </section>
        ))}
      </div>

      <section className="mt-12 rounded-card border border-line bg-surface p-5">
        <h2 className="text-lg font-semibold text-textPrimary">Cómo citar estos datos</h2>
        <p className="mt-2 leading-7 text-textSecondary">
          Puedes usar estas cifras citando la fuente y la fecha, porque cambian
          con el inventario. Por ejemplo:
        </p>
        <blockquote className="mt-3 border-l-4 border-primary bg-white p-4 text-sm leading-6 text-textPrimary">
          Fuente: Geo Propiedades Ecuador
          {sample !== null ? `, sobre ${integer(sample)} anuncios en venta activos` : ''}
          {updated
            ? `, actualizado el ${updated.toLocaleDateString('es-EC', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}`
            : ''}
          .
        </blockquote>
        <p className="mt-3 text-sm leading-6 text-textSecondary">
          Si encuentras un dato que no cuadra, escríbenos: corregirlo nos importa
          más que sostenerlo.
        </p>
      </section>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/estadisticas-inmobiliarias"
          className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primaryHover"
        >
          Ver las estadísticas
        </Link>
        <Link
          href="/propiedades"
          className="inline-flex items-center rounded-lg border border-line px-4 py-2 text-sm font-semibold text-textPrimary transition-colors hover:border-primary hover:text-primary"
        >
          Explorar el catálogo
        </Link>
      </div>
    </main>
  );
}
