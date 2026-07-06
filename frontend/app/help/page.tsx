'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

function Icon({ path, className = 'h-5 w-5' }: { path: string; className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
}

const ICONS = {
  map: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7',
  ruler: 'M3 7l4-4m0 0l4 4M7 3v12m10 6l-4-4m0 0l-4 4m4-4V9',
  photo: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
  filter: 'M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z',
  link: 'M13.828 10.172a4 4 0 010 5.656l-3 3a4 4 0 01-5.656-5.656l1.5-1.5m6.328-2.828a4 4 0 015.656 0 4 4 0 010 5.656l-1.5 1.5',
  check: 'M5 13l4 4L19 7',
  whatsapp: '',
  building: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2M5 21H3m4-14h2m-2 4h2m-2 4h2m4-8h2m-2 4h2m-2 4h2',
  user: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
};

export default function HelpPage() {
  const [copied, setCopied] = useState(false);

  const shareUrl = typeof window !== 'undefined' ? window.location.origin + '/' : 'https://geopropiedades.ec/';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background text-textPrimary">
      <div className="max-w-5xl mx-auto px-4 py-12 md:py-16 space-y-16">

        {/* Encabezado */}
        <header className="max-w-3xl">
          <p className="text-sm font-semibold text-primary mb-3">Centro de ayuda</p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-textPrimary">
            Publica propiedades en un mapa interactivo
          </h1>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
            Geo Propiedades Ecuador permite registrar terrenos, casas, departamentos y locales
            con ubicación, fotos, precio y medidas —aproximadas o delimitadas en el mapa—.
            Es útil para propietarios, agentes e inmobiliarias que necesitan compartir su
            inventario de forma ordenada.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Link href="/add-property" className="btn btn-md btn-primary">
              Publicar una propiedad
            </Link>
            <Link href="/" className="btn btn-md btn-secondary">
              Ver el mapa
            </Link>
          </div>
        </header>

        {/* Qué ofrece */}
        <section>
          <h2 className="text-xl font-semibold mb-6">Qué ofrece la plataforma</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: ICONS.map, title: 'Ubicación en el mapa', desc: 'Cada propiedad se muestra en su ubicación real, con marcador o con el polígono del terreno.' },
              { icon: ICONS.ruler, title: 'Medidas del terreno', desc: 'Al dibujar el polígono, el área se calcula automáticamente y queda visible en la ficha.' },
              { icon: ICONS.photo, title: 'Hasta 10 fotos', desc: 'Sube varias imágenes por propiedad. Se optimizan para que carguen rápido en el celular.' },
              { icon: ICONS.filter, title: 'Filtros de búsqueda', desc: 'Filtra por tipo, estado, precio y área para acotar lo que se muestra en el mapa.' },
              { icon: ICONS.link, title: 'Enlaces para compartir', desc: 'Aplica filtros y comparte el enlace: quien lo abra verá exactamente ese resultado.' },
              { icon: ICONS.user, title: 'Contacto directo', desc: 'La ficha muestra el teléfono del anunciante para llamar o escribir por WhatsApp.' },
            ].map((f, i) => (
              <div key={i} className="card p-5">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-3">
                  <Icon path={f.icon} />
                </div>
                <h3 className="font-semibold mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Para quién sirve */}
        <section>
          <h2 className="text-xl font-semibold mb-6">Para quién sirve</h2>
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-5">
            {[
              { title: 'Propietarios directos', desc: 'Publica tu propiedad sin intermediarios y comparte el enlace con interesados.' },
              { title: 'Agentes e inmobiliarias', desc: 'Centraliza tu inventario en un mapa y compártelo con clientes en un solo enlace.' },
              { title: 'Vendedores de terrenos', desc: 'Delimita los límites del terreno en el mapa para mostrar su forma y superficie.' },
              { title: 'Compradores', desc: 'Explora por zona, compara ubicaciones y contacta al anunciante antes de visitar.' },
            ].map((a, i) => (
              <div key={i} className="flex gap-3">
                <div className="mt-0.5 text-primary flex-shrink-0">
                  <Icon path={ICONS.check} className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">{a.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{a.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Cómo publicar */}
        <section>
          <h2 className="text-xl font-semibold mb-6">Cómo publicar una propiedad</h2>
          <ol className="space-y-4">
            {[
              { n: 1, title: 'Crea una cuenta', desc: 'Regístrate con tu correo y verifica el código que te enviamos.' },
              { n: 2, title: 'Ubica la propiedad en el mapa', desc: 'Coloca un marcador o dibuja el polígono del terreno para calcular su área.' },
              { n: 3, title: 'Completa los datos y publica', desc: 'Agrega fotos, precio, tipo, medidas y contacto. Al guardar, aparece en el mapa.' },
            ].map((s) => (
              <li key={s.n} className="card p-5 flex gap-4">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-white text-sm font-semibold">
                  {s.n}
                </span>
                <div>
                  <h3 className="font-semibold">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-0.5">{s.desc}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-6">
            <Link href="/add-property" className="btn btn-md btn-primary">
              Empezar a publicar
            </Link>
          </div>
        </section>

        {/* Compartir un mapa filtrado */}
        <section className="card p-6 md:p-8">
          <div className="flex items-start gap-4">
            <div className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon path={ICONS.link} />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold">Compartir un mapa filtrado</h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-2xl">
                En el mapa, aplica los filtros que quieras (zona, tipo, precio, área). La dirección
                de la página incluye esos filtros, así que al compartir el enlace la otra persona
                verá el mismo resultado. También puedes usar el botón
                <span className="font-medium text-textPrimary"> Compartir búsqueda</span> del panel de filtros.
              </p>
              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                <Link href="/" className="btn btn-sm btn-secondary">Ir al mapa</Link>
                <button onClick={handleCopyLink} className="btn btn-sm btn-ghost border border-line">
                  {copied ? (
                    <>
                      <Icon path={ICONS.check} className="h-4 w-4" />
                      Enlace copiado
                    </>
                  ) : (
                    'Copiar enlace de la plataforma'
                  )}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Preguntas frecuentes */}
        <section>
          <h2 className="text-xl font-semibold mb-6">Preguntas frecuentes</h2>
          <Accordion type="single" collapsible className="max-w-3xl card divide-y divide-line px-5">
            {[
              { q: '¿Tiene algún costo publicar?', a: 'No cobramos por publicar propiedades ni comisiones por las ventas. El contacto entre anunciante e interesado es directo.' },
              { q: '¿Cuántas propiedades puedo publicar?', a: 'No hay un límite de publicaciones por cuenta.' },
              { q: '¿Necesito conocimientos técnicos?', a: 'No. Si has usado un mapa en línea, puedes ubicar tu propiedad y completar el formulario.' },
              { q: '¿Qué pasa con mis fotos?', a: 'Se optimizan automáticamente para cargar rápido manteniendo buena calidad. Puedes subir hasta 10 por propiedad.' },
              { q: '¿Puedo editar o eliminar una propiedad?', a: 'Sí. Desde "Mis propiedades" puedes editar los datos, cambiar fotos, marcarla como inactiva o eliminarla.' },
              { q: '¿Cómo me contactan los interesados?', a: 'La ficha muestra tu teléfono. Los interesados te llaman o te escriben por WhatsApp directamente.' },
              { q: '¿Funciona en todo Ecuador?', a: 'Sí. Puedes registrar propiedades en cualquier provincia y ciudad del país.' },
              { q: '¿Puedo compartir solo algunas propiedades?', a: 'Sí. Aplica filtros en el mapa y comparte el enlace: mostrará únicamente las propiedades que cumplan esos filtros.' },
            ].map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border-line last:border-b-0">
                <AccordionTrigger className="font-medium hover:no-underline">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        {/* Contacto */}
        <section className="card p-6 md:p-8">
          <h2 className="text-xl font-semibold">¿Necesitas ayuda?</h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-2xl">
            Si tienes dudas sobre cómo publicar o quieres reportar un problema, escríbenos y te ayudamos.
          </p>
          <div className="mt-5 flex flex-col sm:flex-row gap-3">
            <Link href="https://wa.me/593983738151" target="_blank" className="btn btn-md btn-accent">
              <svg className="h-5 w-5" viewBox="0 0 32 32" fill="currentColor">
                <path d="M16 3C9.4 3 4 8.4 4 15c0 2.2.6 4.2 1.7 6.1L4 29l8-1.6c1.8 1 3.8 1.5 6 1.5 6.6 0 12-5.4 12-12S22.6 3 16 3zm0 21.4c-1.9 0-3.7-.5-5.3-1.4l-.4-.2-4.7.9.9-4.6-.3-.5C6 17.4 5.6 16.2 5.6 15 5.6 9.9 10 5.6 16 5.6S26.4 9.9 26.4 15 22 24.4 16 24.4zm5.1-7.9c-.3-.1-1.9-.9-2.2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.1-.2.1-.3.2-.6.1-.3-.1-1.3-.5-2.5-1.6-.9-.8-1.6-1.8-1.8-2.1-.2-.3 0-.4.1-.5.1-.1.3-.3.4-.4.1-.1.1-.2.2-.3.1-.1.1-.2.2-.3.1-.1.1-.2.1-.3 0-.1 0-.2 0-.3 0-.1-.7-1.8-1-2.4-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.3 0-.5.2-.2.3-.7.7-.7 1.8s.7 2.1.8 2.3c.1.2 1.4 2.2 3.4 3.1 2 .9 2 .6 2.4.6.4 0 1.2-.5 1.3-1 .1-.5.1-.9.1-1 0-.1-.1-.1-.2-.1z" />
              </svg>
              Escríbenos por WhatsApp
            </Link>
            <Link href="/account" className="btn btn-md btn-secondary">
              Ir a mi cuenta
            </Link>
          </div>
        </section>

        <footer className="border-t border-line pt-6 text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-textPrimary">Geo Propiedades Ecuador</span> — plataforma
            para publicar y explorar propiedades en un mapa.
          </p>
        </footer>
      </div>
    </div>
  );
}
