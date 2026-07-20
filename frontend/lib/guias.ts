/**
 * Contenido de las guías inmobiliarias (/guias). Vive en un módulo de datos
 * para que las páginas servidor rendericen el texto completo en el HTML
 * inicial (indexable y citable por IA) y el sitemap conozca cada guía.
 *
 * Las cifras de impuestos y trámites son referenciales: cada guía lo aclara y
 * remite a la fuente oficial (municipio, notaría, BIESS o banco).
 */

export type GuideSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

export type Guide = {
  slug: string;
  title: string;
  description: string;
  /** Fecha de última revisión editorial (ISO), usada en sitemap y schema. */
  updated: string;
  intro: string;
  sections: GuideSection[];
  faqs: { q: string; a: string }[];
  related: { label: string; href: string }[];
};

export const GUIDES: Guide[] = [
  {
    slug: 'como-comprar-una-propiedad-en-ecuador',
    title: 'Cómo comprar una propiedad en Ecuador: guía paso a paso',
    description:
      'Pasos para comprar una casa, departamento o terreno en Ecuador: verificación legal, promesa de compraventa, escritura, impuestos y registro de la propiedad.',
    updated: '2026-07-20',
    intro:
      'Comprar una propiedad en Ecuador es un proceso que combina búsqueda, verificación legal, negociación y trámites notariales. Esta guía resume los pasos habituales para comprar una casa, un departamento o un terreno, y los documentos que conviene revisar antes de entregar dinero.',
    sections: [
      {
        heading: '1. Define presupuesto y zona',
        paragraphs: [
          'Antes de visitar propiedades, define cuánto puedes pagar en total: precio del inmueble más gastos de cierre (impuestos, notaría y registro, que en conjunto suelen sumar entre el 2% y el 4% del valor, según el cantón). Si vas a financiar, consigue una precalificación del banco o del BIESS para conocer tu monto máximo real.',
          'Buscar por zona en un mapa evita el error más común: enamorarse de una propiedad sin entender su entorno. Compara varios sectores, revisa accesos, servicios y qué más se vende alrededor y a qué precio.',
        ],
      },
      {
        heading: '2. Verifica la situación legal del inmueble',
        paragraphs: [
          'Es el paso que más problemas evita. Antes de negociar en serio, pide al vendedor o consigue por tu cuenta estos documentos:',
        ],
        bullets: [
          'Certificado de gravámenes del Registro de la Propiedad del cantón: confirma quién es el dueño y si el inmueble tiene hipotecas, embargos o prohibiciones de enajenar.',
          'Copia de la escritura actual, para verificar linderos, área y que quien vende sea realmente el titular.',
          'Pago del impuesto predial al día en el municipio.',
          'En terrenos: informe de regulación urbana (IRM o su equivalente cantonal) para saber qué se puede construir.',
          'En propiedades bajo propiedad horizontal: expensas al día y reglamento del condominio.',
        ],
      },
      {
        heading: '3. Promesa de compraventa',
        paragraphs: [
          'Cuando hay acuerdo de precio, lo usual es firmar una promesa de compraventa ante notario, con un anticipo (comúnmente entre el 10% y el 30%) y un plazo para firmar la escritura definitiva. La promesa protege a ambas partes: fija precio, plazos y multas si alguien se retira.',
          'Si vas a pagar con crédito hipotecario, incluye en la promesa un plazo realista para la aprobación del banco (los avalúos y aprobaciones pueden tardar varias semanas).',
        ],
      },
      {
        heading: '4. Escritura, impuestos y registro',
        paragraphs: [
          'La compraventa se cierra con la escritura pública firmada ante notario. Antes de la firma se liquidan los impuestos municipales de transferencia (alcabala y, cuando aplica, utilidad/plusvalía, que normalmente asume el vendedor) y se pagan las tarifas notariales, que siguen una tabla oficial.',
          'Firmada la escritura, hay que inscribirla en el Registro de la Propiedad del cantón. Solo con la inscripción te conviertes legalmente en el nuevo propietario. Guarda la escritura inscrita: es tu título de propiedad.',
        ],
      },
      {
        heading: '5. Después de la compra',
        paragraphs: [
          'Actualiza el catastro municipal a tu nombre, cambia la titularidad de los servicios básicos y, si compraste con crédito, recuerda que el inmueble quedará hipotecado a favor del banco hasta terminar de pagar.',
        ],
      },
    ],
    faqs: [
      {
        q: '¿Cuánto cuestan los gastos de cierre al comprar una propiedad en Ecuador?',
        a: 'Como referencia, entre el 2% y el 4% del precio: impuesto de alcabala (alrededor del 1%), inscripción en el Registro de la Propiedad y tarifas notariales según tabla oficial. Los valores exactos dependen del cantón y del precio, así que confírmalos en el municipio y la notaría.',
      },
      {
        q: '¿Qué documento confirma que el vendedor es el dueño real?',
        a: 'El certificado de gravámenes emitido por el Registro de la Propiedad del cantón donde está el inmueble. Muestra el titular actual y si existen hipotecas, embargos o prohibiciones.',
      },
      {
        q: '¿La promesa de compraventa es obligatoria?',
        a: 'No es obligatoria, pero es muy recomendable cuando hay anticipo o financiamiento de por medio: fija precio, plazos y penalidades ante notario antes de la escritura definitiva.',
      },
    ],
    related: [
      { label: 'Casas en venta en Ecuador', href: '/casas-en-venta' },
      { label: 'Terrenos en venta', href: '/terrenos-en-venta' },
      { label: 'Impuestos y gastos al comprar o vender', href: '/guias/impuestos-y-gastos-al-comprar-o-vender-una-propiedad' },
      { label: 'Crédito hipotecario en Ecuador', href: '/guias/credito-hipotecario-en-ecuador' },
    ],
  },
  {
    slug: 'credito-hipotecario-en-ecuador',
    title: 'Crédito hipotecario en Ecuador: BIESS, bancos y vivienda VIP/VIS',
    description:
      'Cómo financiar una vivienda en Ecuador: crédito del BIESS, bancos y cooperativas, vivienda de interés público (VIP) y social (VIS), requisitos y consejos.',
    updated: '2026-07-20',
    intro:
      'La mayoría de compras de vivienda en Ecuador se financian con crédito hipotecario. Las tres vías principales son el BIESS (para afiliados al IESS), los bancos y cooperativas privados, y los programas de vivienda de interés público y social (VIP/VIS) con tasas preferenciales. Esta guía resume cómo funcionan y qué mirar antes de firmar.',
    sections: [
      {
        heading: 'BIESS: el crédito de los afiliados',
        paragraphs: [
          'El BIESS otorga préstamos hipotecarios a afiliados y jubilados del IESS con requisitos de aportes mínimos (como referencia, alrededor de 36 aportaciones y estabilidad reciente). Dependiendo del avalúo y de tu capacidad de pago, puede financiar un porcentaje alto del valor de la vivienda, con plazos largos (hasta 25 años en muchos casos).',
          'El trámite es en línea: precalificación en la web del BIESS, avalúo del inmueble por un perito calificado y firma. Considera que el proceso completo suele tardar más que en la banca privada.',
        ],
      },
      {
        heading: 'Bancos y cooperativas',
        paragraphs: [
          'Los bancos y cooperativas piden típicamente una entrada del 20% al 30%, estabilidad laboral demostrable y una cuota que no supere un porcentaje de tus ingresos (habitualmente alrededor del 30-40%). A cambio, los procesos de aprobación suelen ser más rápidos que en el BIESS.',
          'Compara siempre la tasa efectiva anual, los seguros obligatorios (desgravamen e incendio) y las condiciones de precancelación: dos créditos con la misma cuota pueden tener costos totales muy distintos.',
        ],
      },
      {
        heading: 'Vivienda VIP y VIS: tasas preferenciales',
        paragraphs: [
          'Para viviendas nuevas dentro de los rangos de precio que fija el gobierno, existen créditos de interés público y social con tasas preferenciales (históricamente cercanas al 4,99%) y entradas reducidas (incluso 5% o menos). Aplican límites de precio del inmueble y condiciones como que sea primera vivienda.',
          'Si tu presupuesto entra en esos rangos, pregunta explícitamente por líneas VIP/VIS en tu banco: la diferencia en la cuota mensual frente a un crédito tradicional es grande.',
        ],
      },
      {
        heading: 'Consejos antes de firmar',
        paragraphs: [],
        bullets: [
          'Precalifícate antes de buscar: sabrás tu techo real de compra y negociarás mejor.',
          'Presupuesta los gastos de cierre (impuestos, notaría, registro y avalúo) además de la entrada.',
          'Verifica la situación legal del inmueble antes de pagar el avalúo: si tiene gravámenes, el banco lo rechazará.',
          'Revisa si la cuota incluye seguros y cuánto pesa cada uno.',
          'Las condiciones y tasas cambian: confirma los valores vigentes directamente con el BIESS o tu banco.',
        ],
      },
    ],
    faqs: [
      {
        q: '¿Cuánta entrada necesito para comprar una casa con crédito en Ecuador?',
        a: 'En la banca privada, típicamente entre el 20% y el 30% del precio. El BIESS puede financiar porcentajes mayores del avalúo según tu capacidad de pago, y los programas VIP/VIS permiten entradas reducidas en viviendas nuevas dentro de los rangos oficiales de precio.',
      },
      {
        q: '¿Qué es una vivienda VIP o VIS?',
        a: 'Son categorías de vivienda de interés público (VIP) y social (VIS) definidas por el gobierno con límites de precio. Comprar una vivienda nueva en esos rangos da acceso a créditos con tasa preferencial y entrada reducida.',
      },
      {
        q: '¿Puedo comprar con crédito un terreno o solo viviendas?',
        a: 'Existen líneas de crédito para terrenos y para construcción, pero con condiciones distintas a las de vivienda terminada (plazos menores y entradas mayores, por lo general). Consulta las líneas específicas de tu banco o del BIESS.',
      },
    ],
    related: [
      { label: 'Cómo comprar una propiedad en Ecuador', href: '/guias/como-comprar-una-propiedad-en-ecuador' },
      { label: 'Casas en venta en Ecuador', href: '/casas-en-venta' },
      { label: 'Departamentos en alquiler', href: '/departamentos-en-alquiler' },
    ],
  },
  {
    slug: 'impuestos-y-gastos-al-comprar-o-vender-una-propiedad',
    title: 'Impuestos y gastos al comprar o vender una propiedad en Ecuador',
    description:
      'Alcabala, utilidad (plusvalía), notaría y Registro de la Propiedad: qué impuestos y gastos paga el comprador y cuáles el vendedor en una compraventa en Ecuador.',
    updated: '2026-07-20',
    intro:
      'Toda compraventa de inmuebles en Ecuador genera impuestos municipales y gastos de trámite. Saber quién paga qué evita sorpresas al momento de firmar. Esta guía resume los rubros habituales; los valores exactos dependen de cada municipio y del precio de la operación, así que úsalos como referencia y confírmalos antes de cerrar.',
    sections: [
      {
        heading: 'Lo que suele pagar el comprador',
        paragraphs: [],
        bullets: [
          'Impuesto de alcabala: alrededor del 1% del valor de la transferencia (base y descuentos varían por municipio).',
          'Inscripción en el Registro de la Propiedad: tarifa según tabla del cantón, en función del precio.',
          'Tarifas notariales de la escritura: tabla oficial nacional, según la cuantía.',
          'Si compra con crédito: avalúo del perito y la inscripción de la hipoteca.',
        ],
      },
      {
        heading: 'Lo que suele pagar el vendedor',
        paragraphs: [],
        bullets: [
          'Impuesto a la utilidad (conocido como plusvalía municipal): grava la ganancia obtenida en la venta de predios urbanos, con tarifa referencial del 10% sobre la utilidad, con deducciones por mejoras y años de tenencia según la ordenanza local.',
          'Predial y expensas al día: el inmueble debe entregarse sin deudas municipales ni de condominio.',
          'Si intervino una inmobiliaria: la comisión pactada (comúnmente entre el 3% y el 5% más IVA en venta).',
        ],
      },
      {
        heading: 'Un ejemplo de referencia',
        paragraphs: [
          'En una venta de $100.000, el comprador debería presupuestar aproximadamente $1.000 de alcabala más los valores de notaría y registro (según tablas del cantón, usualmente algunos cientos de dólares cada uno). El vendedor liquidará el impuesto a la utilidad según la ganancia real y los años de tenencia.',
          'Estos rubros se liquidan antes o durante la firma de la escritura: la notaría exige los comprobantes municipales para cerrar.',
        ],
      },
      {
        heading: 'Dónde confirmar los valores exactos',
        paragraphs: [
          'La liquidación de alcabala y utilidad se hace en el municipio del cantón donde está el inmueble. Las tarifas de registro se consultan en el Registro de la Propiedad del cantón y las notariales en cualquier notaría. Pide la liquidación antes de firmar la promesa para negociar con números reales.',
        ],
      },
    ],
    faqs: [
      {
        q: '¿Quién paga la alcabala, el comprador o el vendedor?',
        a: 'Por costumbre y en la mayoría de ordenanzas, la alcabala la paga el comprador, y el impuesto a la utilidad (plusvalía) el vendedor. Las partes pueden pactar algo distinto en la promesa de compraventa.',
      },
      {
        q: '¿Cuánto es la plusvalía municipal en Ecuador?',
        a: 'La tarifa referencial es el 10% sobre la utilidad de la venta de predios urbanos, con deducciones por mejoras y por cada año de tenencia según la ordenanza de cada municipio. La liquidación exacta la emite el municipio del cantón.',
      },
      {
        q: '¿Se puede firmar la escritura con impuestos pendientes?',
        a: 'No: la notaría exige los comprobantes de pago de los impuestos municipales de transferencia y del predial al día para elevar la compraventa a escritura pública.',
      },
    ],
    related: [
      { label: 'Cómo comprar una propiedad en Ecuador', href: '/guias/como-comprar-una-propiedad-en-ecuador' },
      { label: 'Cómo vender tu propiedad más rápido', href: '/guias/como-vender-tu-propiedad-mas-rapido' },
      { label: 'Propiedades en Ecuador', href: '/propiedades' },
    ],
  },
  {
    slug: 'como-vender-tu-propiedad-mas-rapido',
    title: 'Cómo vender tu propiedad más rápido en Ecuador',
    description:
      'Precio correcto, fotos, ubicación exacta en el mapa y documentos listos: qué hace que una casa, departamento o terreno se venda más rápido en Ecuador.',
    updated: '2026-07-20',
    intro:
      'La diferencia entre una propiedad que se vende en semanas y una que pasa meses publicada casi siempre está en cuatro cosas: el precio, las fotos, la claridad de la ubicación y la rapidez para responder. Esta guía resume cómo trabajar cada una.',
    sections: [
      {
        heading: '1. Pon el precio con datos, no con afecto',
        paragraphs: [
          'El error más común es fijar el precio por lo que la propiedad "vale para ti". Compara lo que realmente se publica en tu sector: revisa propiedades similares por zona en el mapa y las estadísticas de precio por metro cuadrado de tu ciudad. Un precio alineado al mercado genera contactos las primeras semanas, que es cuando tu anuncio tiene más visibilidad.',
        ],
      },
      {
        heading: '2. Fotos que muestren, no que escondan',
        paragraphs: [],
        bullets: [
          'Toma las fotos de día, con luces encendidas y espacios ordenados.',
          'Empieza por la mejor foto: fachada o el ambiente más atractivo; esa será la portada.',
          'Incluye todos los ambientes, el frente y, en terrenos, tomas que muestren dimensiones y accesos.',
          'Evita fotos verticales recortadas, borrosas o con fechas/marcas de agua encima.',
        ],
      },
      {
        heading: '3. Ubicación exacta y linderos claros',
        paragraphs: [
          'Los compradores descartan anuncios que dicen solo "por el sector de…". Publicar con la ubicación exacta en el mapa —y en terrenos, con el polígono de linderos dibujado— filtra curiosos y atrae compradores que ya saben dónde está y qué hay alrededor. Es también lo que permite que tu anuncio aparezca en búsquedas por zona.',
        ],
      },
      {
        heading: '4. Ten los papeles listos antes de publicar',
        paragraphs: [
          'Muchos negocios se caen por papeles, no por precio. Antes de publicar, ten a mano la escritura, el pago predial al día y, si puedes, un certificado de gravámenes reciente. Un comprador serio (o su banco) los pedirá de inmediato, y tenerlos listos acorta semanas de trámite.',
        ],
      },
      {
        heading: '5. Responde rápido y por WhatsApp',
        paragraphs: [
          'En Ecuador el contacto inmobiliario se mueve por WhatsApp. Un anuncio con número visible y respuestas en minutos convierte mucho más que uno que responde al día siguiente. Ten respuestas listas para las preguntas de siempre: precio negociable, gastos, motivo de venta y disponibilidad para visitas.',
          'Publicar es gratis en Geo Propiedades Ecuador: tu anuncio sale en el mapa con fotos, precio, ubicación exacta y botón de WhatsApp directo, sin comisiones por la venta.',
        ],
      },
    ],
    faqs: [
      {
        q: '¿Cuánto cuesta publicar una propiedad en Geo Propiedades Ecuador?',
        a: 'Nada: publicar es 100% gratis y no se cobra comisión por la venta ni el alquiler. El contacto entre comprador y vendedor es directo, por teléfono o WhatsApp.',
      },
      {
        q: '¿Qué documentos debo tener listos para vender?',
        a: 'Escritura inscrita, impuesto predial al día y un certificado de gravámenes reciente del Registro de la Propiedad. Si la propiedad está en propiedad horizontal, también las expensas al día.',
      },
      {
        q: '¿Conviene publicar el precio o poner "a convenir"?',
        a: 'Publica el precio. Los anuncios sin precio reciben menos contactos de calidad y quedan fuera de los filtros de búsqueda por presupuesto que usan los compradores.',
      },
    ],
    related: [
      { label: 'Publicar propiedad gratis', href: '/publicar-propiedad' },
      { label: 'Estadísticas del mercado', href: '/estadisticas-inmobiliarias' },
      { label: 'Impuestos y gastos al comprar o vender', href: '/guias/impuestos-y-gastos-al-comprar-o-vender-una-propiedad' },
    ],
  },
  {
    slug: 'mejores-zonas-para-vivir-en-quito',
    title: 'Mejores zonas para vivir en Quito: guía por sectores',
    description:
      'Comparativa de sectores de Quito para vivir o invertir: norte moderno, valles de Cumbayá, Tumbaco y Los Chillos, centro histórico y sur, con perfil de cada zona.',
    updated: '2026-07-20',
    intro:
      'Quito es una ciudad larga y de sectores muy distintos entre sí: la experiencia de vivir en La Carolina no se parece a la de Cumbayá ni a la del centro histórico. Esta guía resume el perfil de las zonas más buscadas para decidir dónde comprar o arrendar según tu presupuesto y estilo de vida.',
    sections: [
      {
        heading: 'Cómo elegir zona en Quito',
        paragraphs: [
          'Antes de comparar sectores, define tres cosas: dónde pasas el día (trabajo, colegios), cuánto tráfico estás dispuesto a asumir y si prefieres departamento céntrico o casa con espacio. En Quito la distancia en kilómetros engaña: cruzar la ciudad en hora pico puede tomar más de una hora, y los valles dependen de pocas vías de acceso.',
        ],
      },
      {
        heading: 'Norte moderno: La Carolina, República del Salvador, Quito Tenis',
        paragraphs: [
          'Es el Quito corporativo y de servicios: parques (La Carolina, Metropolitano), centros comerciales, hospitales y oficinas. Predominan los departamentos, con edificios nuevos alrededor del parque La Carolina y de la avenida República del Salvador. La González Suárez y Bellavista, con vista a la ciudad, están entre los sectores de mayor precio por metro cuadrado.',
          'Quito Tenis, El Bosque y Ponceano, más al norte, mezclan casas consolidadas y edificios, con un perfil familiar y buen acceso a servicios.',
        ],
      },
      {
        heading: 'Los valles: Cumbayá, Tumbaco y Los Chillos',
        paragraphs: [
          'Los valles ofrecen mejor clima, casas con jardín y urbanizaciones cerradas. Cumbayá es el más consolidado (y el más caro): colegios reconocidos, universidades, gastronomía y la Ruta Viva como acceso. Tumbaco continúa el crecimiento con precios algo menores, y el valle de Los Chillos (San Rafael, Sangolquí) es la alternativa con mejor relación precio-espacio.',
          'El costo oculto de los valles es la movilidad: si trabajas en el norte de Quito, presupuesta el tiempo (y el peaje) de los accesos diarios.',
        ],
      },
      {
        heading: 'Centro histórico y sur',
        paragraphs: [
          'El centro histórico, patrimonio de la humanidad, combina vivienda tradicional con proyectos de rehabilitación; conviene revisar bien el estado del inmueble y la normativa patrimonial antes de comprar. El sur (Quitumbe, Solanda, Chillogallo) concentra la vivienda más accesible de la ciudad, con transporte masivo (Metro, Trolebús) y comercio de barrio consolidado.',
        ],
      },
      {
        heading: 'Precios: compara con datos del mercado',
        paragraphs: [
          'Los precios por metro cuadrado cambian por sector y por antigüedad del inmueble. Antes de ofertar, compara lo publicado en el sector que te interesa en el mapa y revisa las estadísticas de precio por metro cuadrado por ciudad para tener una referencia objetiva de negociación.',
        ],
      },
    ],
    faqs: [
      {
        q: '¿Cuáles son las zonas más caras de Quito?',
        a: 'Tradicionalmente la González Suárez, Bellavista y los alrededores del parque La Carolina en la ciudad, y Cumbayá en los valles, concentran los precios por metro cuadrado más altos.',
      },
      {
        q: '¿Qué zona de Quito conviene para familias con niños?',
        a: 'Los valles (Cumbayá, Tumbaco, Los Chillos) por espacio, clima y oferta de colegios, y en la ciudad sectores como Quito Tenis o Ponceano. La decisión suele definirse por la cercanía al colegio y al trabajo.',
      },
      {
        q: '¿Dónde buscar vivienda económica en Quito?',
        a: 'El sur de la ciudad (Quitumbe, Solanda, Chillogallo) y sectores periféricos del norte como Carcelén o Calderón ofrecen los precios más accesibles, con buena conexión de transporte público.',
      },
    ],
    related: [
      { label: 'Propiedades en Quito', href: '/propiedades/quito' },
      { label: 'Estadísticas del mercado', href: '/estadisticas-inmobiliarias' },
      { label: 'Cómo comprar una propiedad en Ecuador', href: '/guias/como-comprar-una-propiedad-en-ecuador' },
      { label: 'Crédito hipotecario en Ecuador', href: '/guias/credito-hipotecario-en-ecuador' },
    ],
  },
  {
    slug: 'mejores-zonas-para-vivir-en-cuenca',
    title: 'Mejores zonas para vivir en Cuenca: guía por sectores',
    description:
      'Sectores de Cuenca para vivir o invertir: centro histórico, El Ejido, Ordóñez Lasso, Puertas del Sol, Challuabamba y más, con el perfil de cada zona.',
    updated: '2026-07-20',
    intro:
      'Cuenca combina escala manejable, servicios y calidad de vida, y por eso atrae tanto a familias locales como a jubilados extranjeros. Los sectores tienen personalidades marcadas: esta guía resume las zonas más buscadas para comprar o arrendar.',
    sections: [
      {
        heading: 'Centro histórico y El Ejido',
        paragraphs: [
          'El centro histórico, patrimonio de la humanidad, ofrece casas coloniales y departamentos en edificios rehabilitados, a pasos de todo; revisa siempre la normativa patrimonial antes de intervenir un inmueble. Cruzando el río Tomebamba, El Ejido mezcla edificios modernos con la cercanía del centro: es de los sectores más demandados para departamentos.',
        ],
      },
      {
        heading: 'Ordóñez Lasso y la avenida de los ríos',
        paragraphs: [
          'El corredor de la avenida Ordóñez Lasso, junto al Tomebamba, concentra edificios con amenities y es popular entre residentes extranjeros por su caminabilidad y servicios. La cercanía al río y a supermercados y clínicas lo mantiene con demanda estable de compra y arriendo.',
        ],
      },
      {
        heading: 'Puertas del Sol, Misicata y Yanuncay',
        paragraphs: [
          'Al oeste y suroeste, sectores como Puertas del Sol, Misicata y los alrededores de la avenida 1 de Mayo ofrecen casas y condominios familiares con buena relación precio-espacio, cerca de centros comerciales y colegios.',
        ],
      },
      {
        heading: 'Challuabamba y las afueras en crecimiento',
        paragraphs: [
          'Challuabamba, hacia la autopista Cuenca-Azogues, es la zona de expansión: terrenos amplios, quintas y proyectos nuevos con clima algo más templado. Ricaurte y Baños completan las opciones periféricas, cada una con su centro parroquial consolidado. En estas zonas verifica siempre la disponibilidad real de servicios (agua, alcantarillado) y los accesos.',
        ],
      },
      {
        heading: 'Precios: compara antes de ofertar',
        paragraphs: [
          'Cuenca mantiene precios por metro cuadrado menores a los de Quito o Guayaquil en segmentos comparables. Revisa lo publicado por sector en el mapa y las estadísticas de precio por metro cuadrado para negociar con una referencia objetiva.',
        ],
      },
    ],
    faqs: [
      {
        q: '¿Por qué Cuenca es popular entre jubilados extranjeros?',
        a: 'Por la combinación de costo de vida moderado, servicios de salud, clima templado, escala caminable y un centro histórico patrimonial. Sectores como Ordóñez Lasso y El Ejido concentran gran parte de esa demanda.',
      },
      {
        q: '¿Qué zona de Cuenca está en crecimiento para invertir?',
        a: 'Challuabamba es la zona de expansión más visible, con terrenos y proyectos nuevos junto a la autopista Cuenca-Azogues. Como en toda zona en desarrollo, verifica servicios básicos, accesos y la plusvalía real del sector.',
      },
      {
        q: '¿Dónde arrendar cerca del centro de Cuenca?',
        a: 'El Ejido y el corredor de Ordóñez Lasso son las opciones clásicas: departamentos modernos a minutos del centro histórico, con alta oferta de arriendo.',
      },
    ],
    related: [
      { label: 'Propiedades en Cuenca', href: '/propiedades/cuenca' },
      { label: 'Estadísticas del mercado', href: '/estadisticas-inmobiliarias' },
      { label: 'Cómo comprar una propiedad en Ecuador', href: '/guias/como-comprar-una-propiedad-en-ecuador' },
    ],
  },
  {
    slug: 'arrendar-en-ecuador-contrato-derechos-y-obligaciones',
    title: 'Arrendar una vivienda en Ecuador: contrato, derechos y obligaciones',
    description:
      'Qué debe tener un contrato de arriendo en Ecuador, cuánto se paga de garantía, qué derechos protege la Ley de Inquilinato y consejos para inquilinos y arrendadores.',
    updated: '2026-07-20',
    intro:
      'El arriendo de vivienda en Ecuador está regulado por la Ley de Inquilinato, que protege tanto al inquilino como al propietario, pero solo funciona bien cuando hay contrato claro. Esta guía resume lo esencial para arrendar (o dar en arriendo) sin sorpresas.',
    sections: [
      {
        heading: 'El contrato: siempre por escrito',
        paragraphs: [
          'Aunque el arriendo verbal existe en la práctica, el contrato escrito es lo que evita conflictos: sin él, probar el canon pactado, el plazo o el estado del inmueble se vuelve un problema para ambas partes. Un buen contrato de arriendo debe incluir al menos:',
        ],
        bullets: [
          'Identificación de las partes y del inmueble (dirección exacta y qué incluye: parqueo, bodega, muebles).',
          'Canon mensual, forma y fecha de pago.',
          'Plazo del contrato y condiciones de renovación.',
          'Monto de la garantía y condiciones de devolución.',
          'Quién paga servicios básicos, alícuotas de condominio y reparaciones menores.',
          'Inventario del estado del inmueble (idealmente con fotos firmadas por ambos).',
        ],
      },
      {
        heading: 'Garantía y pagos',
        paragraphs: [
          'Lo usual en el mercado es entregar una garantía equivalente a uno o dos meses de arriendo, que se devuelve al terminar el contrato descontando daños no atribuibles al uso normal. La garantía no reemplaza al último mes de arriendo, salvo que el contrato lo pacte expresamente.',
          'Pide siempre recibo o transfiere por medios trazables: el historial de pagos es tu mejor defensa como inquilino, y la del propietario ante un impago.',
        ],
      },
      {
        heading: 'Derechos del inquilino',
        paragraphs: [],
        bullets: [
          'Recibir el inmueble en condiciones de habitabilidad y que el propietario asuma las reparaciones estructurales.',
          'Límites legales al canon y a sus incrementos: la Ley de Inquilinato fija topes en función del avalúo del inmueble y no permite subir el arriendo a discreción durante el plazo pactado.',
          'No ser desalojado sin causa legal y sin el proceso correspondiente: la terminación por decisión del propietario exige notificación con la anticipación que fija la ley.',
          'Devolución de la garantía al entregar el inmueble en el estado acordado.',
        ],
      },
      {
        heading: 'Obligaciones del inquilino y del propietario',
        paragraphs: [
          'El inquilino debe pagar puntualmente, cuidar el inmueble, asumir reparaciones locativas menores y no subarrendar ni cambiar el uso sin autorización. El propietario debe garantizar el uso pacífico del inmueble, hacer las reparaciones mayores y respetar el contrato y los plazos de notificación.',
        ],
      },
      {
        heading: 'Consejos si eres el propietario',
        paragraphs: [],
        bullets: [
          'Verifica al inquilino: referencias, capacidad de pago y, si es posible, un garante o seguro de arriendo.',
          'Firma inventario de entrega con fotos y lecturas de medidores.',
          'Publica el anuncio con precio, fotos reales y ubicación exacta: filtras curiosos y llegas a inquilinos serios más rápido.',
          'Ante mora, actúa pronto y por las vías legales: los acuerdos informales prolongados complican el desalojo.',
        ],
      },
    ],
    faqs: [
      {
        q: '¿Cuánto se paga de garantía en un arriendo en Ecuador?',
        a: 'Lo habitual en el mercado es el equivalente a uno o dos meses de arriendo. Debe constar en el contrato junto con las condiciones de devolución al entregar el inmueble.',
      },
      {
        q: '¿Pueden subirme el arriendo cuando el propietario quiera?',
        a: 'No durante el plazo pactado en el contrato. Además, la Ley de Inquilinato fija límites al canon en función del avalúo del inmueble. Cualquier ajuste debe respetar el contrato y la ley.',
      },
      {
        q: '¿Qué pasa si arriendo sin contrato escrito?',
        a: 'El arriendo sigue existiendo legalmente, pero probar las condiciones pactadas se vuelve difícil para ambas partes. Ante cualquier conflicto (garantía, plazo, desalojo), el contrato escrito y los recibos de pago son la principal evidencia.',
      },
    ],
    related: [
      { label: 'Departamentos en alquiler', href: '/departamentos-en-alquiler' },
      { label: 'Publicar propiedad gratis', href: '/publicar-propiedad' },
      { label: 'Cómo vender tu propiedad más rápido', href: '/guias/como-vender-tu-propiedad-mas-rapido' },
    ],
  },
];

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}
