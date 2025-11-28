'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function HelpPage() {
  const [copied, setCopied] = useState(false);

  const shareUrl = typeof window !== 'undefined' ? window.location.origin + '/help' : 'https://geopropiedades.ec/help';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/95 via-secondary/85 to-primary text-white">
      <div className="max-w-7xl mx-auto px-4 py-12 md:py-20 space-y-16 md:space-y-24">

        {/* Hero Section */}
        <section className="text-center space-y-6 md:space-y-8 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-400/30 backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm font-semibold text-emerald-100">100% Gratis • Sin comisiones • Sin límites</span>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black leading-tight">
            Vende o Arrienda Más Rápido
            <span className="block mt-2 bg-gradient-to-r from-white via-emerald-100 to-white bg-clip-text text-transparent">
              Con el Poder de los Mapas
            </span>
          </h1>

          <p className="text-lg md:text-2xl text-white/90 leading-relaxed max-w-3xl mx-auto">
            La primera plataforma en Ecuador que te permite <strong>dibujar los límites exactos</strong> de tu propiedad
            en un mapa interactivo. Tus clientes ven todo: ubicación, medidas, fotos y precio en un solo lugar.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Link
              href="/add-property"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white text-primary text-lg font-bold hover:bg-emerald-50 transition-all shadow-2xl shadow-black/30 hover:scale-105 transform"
            >
              🚀 Publicar Mi Propiedad Gratis
            </Link>
            <Link
              href="/"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white text-lg font-bold hover:bg-white/20 transition-all"
            >
              🗺️ Ver Propiedades en el Mapa
            </Link>
          </div>

          <p className="text-sm text-white/70 italic">
            ✓ No necesitas tarjeta de crédito • ✓ Activa en menos de 2 minutos • ✓ Sin pagos ocultos
          </p>
        </section>

        {/* Problema vs Solución */}
        <section className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          <div className="bg-red-500/10 border-2 border-red-400/30 rounded-3xl p-8 backdrop-blur-sm">
            <div className="text-4xl mb-4">😤</div>
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-red-100">El Problema Tradicional</h2>
            <ul className="space-y-3 text-white/85">
              <li className="flex gap-3">
                <span className="text-red-400 font-bold">✗</span>
                <span><strong>Fotos sueltas en WhatsApp</strong> que nadie organiza ni compara</span>
              </li>
              <li className="flex gap-3">
                <span className="text-red-400 font-bold">✗</span>
                <span><strong>Descripciones confusas</strong> sin ubicación exacta ni medidas reales</span>
              </li>
              <li className="flex gap-3">
                <span className="text-red-400 font-bold">✗</span>
                <span><strong>Clientes perdidos</strong> preguntando lo mismo 10 veces</span>
              </li>
              <li className="flex gap-3">
                <span className="text-red-400 font-bold">✗</span>
                <span><strong>Pagar comisiones altas</strong> a portales que no te dan herramientas</span>
              </li>
              <li className="flex gap-3">
                <span className="text-red-400 font-bold">✗</span>
                <span><strong>Imposible mostrar terrenos grandes</strong> o con formas irregulares</span>
              </li>
            </ul>
          </div>

          <div className="bg-emerald-500/10 border-2 border-emerald-400/30 rounded-3xl p-8 backdrop-blur-sm">
            <div className="text-4xl mb-4">🎯</div>
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-emerald-100">La Solución Geo Propiedades Ecuador</h2>
            <ul className="space-y-3 text-white/85">
              <li className="flex gap-3">
                <span className="text-emerald-400 font-bold text-xl">✓</span>
                <span><strong>Todas tus propiedades en UN solo mapa</strong> que compartes con un link</span>
              </li>
              <li className="flex gap-3">
                <span className="text-emerald-400 font-bold text-xl">✓</span>
                <span><strong>Dibuja los límites exactos</strong> con polígonos - tus clientes ven cada metro</span>
              </li>
              <li className="flex gap-3">
                <span className="text-emerald-400 font-bold text-xl">✓</span>
                <span><strong>Filtros inteligentes</strong> por precio, área, tipo - el cliente encuentra solo lo que busca</span>
              </li>
              <li className="flex gap-3">
                <span className="text-emerald-400 font-bold text-xl">✓</span>
                <span><strong>100% gratis</strong> - sin comisiones, sin límites de publicaciones</span>
              </li>
              <li className="flex gap-3">
                <span className="text-emerald-400 font-bold text-xl">✓</span>
                <span><strong>Fotos optimizadas automáticamente</strong> - carga rápida en cualquier celular</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Beneficios Clave */}
        <section>
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-black mb-4">
              ¿Por Qué Elegir Geo Propiedades Ecuador?
            </h2>
            <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto">
              No es solo un portal más. Es tu arsenal completo para vender propiedades.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: '🗺️',
                title: 'Mapas que Venden',
                desc: 'Los clientes ven la zona, cercanía a servicios, vecindarios y topografía real. No más "¿dónde queda?"',
                impact: 'Cierras 3x más rápido porque el cliente ya conoce el lugar',
              },
              {
                icon: '📐',
                title: 'Medidas Exactas Visibles',
                desc: 'Dibuja el polígono del terreno y las medidas se calculan automáticamente. Todo transparente.',
                impact: 'Generas confianza desde el primer click',
              },
              {
                icon: '📸',
                title: 'Hasta 10 Fotos por Propiedad',
                desc: 'Muestra exterior, interior, vistas y detalles. Las fotos se optimizan solas para carga rápida.',
                impact: 'Más fotos = más consultas reales',
              },
              {
                icon: '🔍',
                title: 'Filtros Que Califican Clientes',
                desc: 'Tu cliente filtra por precio, área, habitaciones, tipo. Solo contactan si realmente les interesa.',
                impact: 'Menos tiempo perdido en consultas que no van a ningún lado',
              },
              {
                icon: '🔗',
                title: 'Comparte Búsquedas Personalizadas',
                desc: 'Aplica filtros, selecciona zona y comparte el link. Tu cliente abre y ve EXACTAMENTE lo que le interesa.',
                impact: 'Tus clientes te perciben como un profesional organizado',
              },
              {
                icon: '💰',
                title: '0% de Comisión',
                desc: 'No cobramos por publicar, no cobramos por vender, no cobramos nada. Nunca.',
                impact: 'Todo el dinero de la venta es tuyo',
              },
              {
                icon: '📱',
                title: 'Funciona en Cualquier Celular',
                desc: 'Tu cliente puede estar en la oficina, en la calle o en el sofá. Todo se ve perfecto.',
                impact: 'Más personas ven tus propiedades = más ventas',
              },
              {
                icon: '⚡',
                title: 'Publicación en 2 Minutos',
                desc: 'Crea cuenta, dibuja el terreno, sube fotos, publica. Así de simple.',
                impact: 'Empiezas a recibir consultas HOY mismo',
              },
              {
                icon: '🔒',
                title: 'Tus Datos Seguros',
                desc: 'Sistema con autenticación moderna, verificación por email y respaldos automáticos.',
                impact: 'Duermes tranquilo sabiendo que tu inventario está protegido',
              },
            ].map((benefit, idx) => (
              <div
                key={idx}
                className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all hover:scale-105 transform"
              >
                <div className="text-5xl mb-4">{benefit.icon}</div>
                <h3 className="text-xl font-bold mb-2">{benefit.title}</h3>
                <p className="text-white/80 text-sm leading-relaxed mb-3">{benefit.desc}</p>
                <div className="pt-3 border-t border-white/10">
                  <p className="text-xs text-emerald-300 font-semibold">
                    💡 {benefit.impact}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Para Quién Es */}
        <section className="bg-white text-slate-900 rounded-3xl p-8 md:p-12 shadow-2xl">
          <h2 className="text-3xl md:text-4xl font-black text-center mb-8">
            ¿Para Quién Es Geo Propiedades Ecuador?
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="flex gap-4 items-start">
                <div className="bg-primary/10 rounded-xl p-3 flex-shrink-0">
                  <span className="text-3xl">🏢</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Agencias Inmobiliarias</h3>
                  <p className="text-slate-600">
                    Centraliza todo tu inventario en un solo mapa. Tus agentes comparten el link y los clientes
                    exploran solos. <strong>Ahorra horas de trabajo manual.</strong>
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="bg-primary/10 rounded-xl p-3 flex-shrink-0">
                  <span className="text-3xl">👤</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Agentes Independientes</h3>
                  <p className="text-slate-600">
                    Muestra profesionalismo sin pagar portales caros. <strong>Compite con las grandes agencias</strong> usando
                    las mismas herramientas que ellos... gratis.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="bg-primary/10 rounded-xl p-3 flex-shrink-0">
                  <span className="text-3xl">🌾</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Vendedores de Terrenos y Fincas</h3>
                  <p className="text-slate-600">
                    ¡Finalmente! Una forma de <strong>mostrar los límites exactos de tu terreno</strong> sin llevar
                    al cliente hasta allá. Ahorra tiempo y gasolina.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex gap-4 items-start">
                <div className="bg-primary/10 rounded-xl p-3 flex-shrink-0">
                  <span className="text-3xl">🏗️</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Constructoras y Desarrolladores</h3>
                  <p className="text-slate-600">
                    Muestra tu proyecto completo con todos los lotes disponibles en el mapa.
                    <strong>Los clientes comparan ubicaciones</strong> y eligen el mejor lote para ellos.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="bg-primary/10 rounded-xl p-3 flex-shrink-0">
                  <span className="text-3xl">🏠</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Propietarios Directos</h3>
                  <p className="text-slate-600">
                    ¿Quieres vender sin intermediarios? Publica tú mismo y <strong>evita comisiones del 3-5%.</strong>
                    Es tan fácil como subir una foto a redes sociales.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="bg-primary/10 rounded-xl p-3 flex-shrink-0">
                  <span className="text-3xl">🔎</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Compradores Inteligentes</h3>
                  <p className="text-slate-600">
                    Explora propiedades por zona, <strong>compara precios por m²,</strong> mide distancias a tu trabajo
                    o colegio de tus hijos. Todo antes de llamar.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Cómo Funciona */}
        <section>
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-black mb-4">
              Empieza en 3 Pasos Simples
            </h2>
            <p className="text-lg md:text-xl text-white/80">
              No necesitas ser un experto. Si sabes usar Google Maps, puedes usar Geo Propiedades Ecuador.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Línea conectora en desktop */}
            <div className="hidden md:block absolute top-16 left-1/4 right-1/4 h-1 bg-white/20" style={{ zIndex: 0 }} />

            {[
              {
                step: '1',
                title: 'Regístrate Gratis',
                desc: 'Solo email y contraseña. Te enviamos un código de verificación y listo. Sin trampas, sin letra pequeña.',
                time: '30 segundos',
              },
              {
                step: '2',
                title: 'Dibuja Tu Propiedad',
                desc: 'Usa las herramientas del mapa para marcar los límites exactos. O simplemente pon un marcador si es un edificio.',
                time: '1 minuto',
              },
              {
                step: '3',
                title: 'Sube Fotos y Publica',
                desc: 'Agrega hasta 10 fotos, escribe precio, área, características y dale publicar. ¡Ya estás en el mapa!',
                time: '1 minuto',
              },
            ].map((step, idx) => (
              <div key={idx} className="relative" style={{ zIndex: 1 }}>
                <div className="bg-white text-slate-900 rounded-3xl p-8 shadow-2xl hover:scale-105 transform transition-all">
                  <div className="flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-primary to-secondary text-white text-2xl font-black mb-6 mx-auto shadow-lg">
                    {step.step}
                  </div>
                  <h3 className="text-2xl font-bold text-center mb-3">{step.title}</h3>
                  <p className="text-slate-600 text-center mb-4 leading-relaxed">{step.desc}</p>
                  <div className="text-center">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                      ⏱️ {step.time}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              href="/add-property"
              className="inline-flex items-center gap-2 px-10 py-5 rounded-2xl bg-emerald-500 text-white text-xl font-bold hover:bg-emerald-600 transition-all shadow-2xl shadow-emerald-500/40 hover:scale-105 transform"
            >
              <span>🚀</span>
              <span>Comenzar Ahora - Es Gratis</span>
            </Link>
            <p className="text-sm text-white/70 mt-4">
              Únete a cientos de agentes y propietarios que ya están vendiendo más rápido
            </p>
          </div>
        </section>

        {/* Sección de Compartir - Viral */}
        <section className="relative overflow-hidden rounded-3xl">
          <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500" />
          <div className="absolute inset-0 bg-black/10" />

          <div className="relative z-10 text-center py-12 md:py-16 px-6">
            <div className="mb-6">
              <span className="text-5xl md:text-6xl mb-4 block">🎁</span>
              <h2 className="text-3xl md:text-5xl font-black mb-4 leading-tight">
                ¿Conoces a Alguien Que Le Sirva?
              </h2>
              <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed">
                Ayuda a <strong>agentes, inmobiliarias o propietarios</strong> a vender más rápido.
                <br className="hidden sm:block" />
                Comparte Geo Propiedades Ecuador y que descubran esta herramienta gratuita.
              </p>
            </div>

            <button
              onClick={handleCopyLink}
              className={`inline-flex items-center gap-3 px-10 py-5 rounded-2xl font-black text-xl transition-all shadow-2xl hover:scale-110 transform ${
                copied
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white text-primary hover:bg-emerald-50'
              }`}
            >
              {copied ? (
                <>
                  <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  ¡Copiado! Ahora Compártelo
                </>
              ) : (
                <>
                  <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                  Copiar Link para Compartir
                </>
              )}
            </button>

            <p className="text-sm text-white/80 italic">
              ✨ Cada persona que ayudes podría ahorrar miles de dólares en comisiones
            </p>
          </div>
        </section>

        {/* Comparación */}
        <section className="bg-white text-slate-900 rounded-3xl p-8 md:p-12 shadow-2xl overflow-hidden">
          <h2 className="text-3xl md:text-4xl font-black text-center mb-8">
            Geo Propiedades Ecuador vs. Métodos Tradicionales
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="text-left p-4 font-bold text-lg">Característica</th>
                  <th className="text-center p-4 font-bold text-lg text-emerald-600">Geo Propiedades Ecuador 🚀</th>
                  <th className="text-center p-4 font-bold text-lg text-slate-400">WhatsApp 📱</th>
                  <th className="text-center p-4 font-bold text-lg text-slate-400">Portales Pagos 💸</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="hover:bg-slate-50">
                  <td className="p-4 font-semibold">Costo mensual</td>
                  <td className="p-4 text-center text-emerald-600 font-bold">$0</td>
                  <td className="p-4 text-center text-slate-600">$0</td>
                  <td className="p-4 text-center text-slate-600">$50-300</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="p-4 font-semibold">Ubicación en mapa interactivo</td>
                  <td className="p-4 text-center text-emerald-600 text-2xl">✓</td>
                  <td className="p-4 text-center text-red-500 text-2xl">✗</td>
                  <td className="p-4 text-center text-yellow-500 text-sm">Pin básico</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="p-4 font-semibold">Dibujar límites exactos del terreno</td>
                  <td className="p-4 text-center text-emerald-600 text-2xl">✓</td>
                  <td className="p-4 text-center text-red-500 text-2xl">✗</td>
                  <td className="p-4 text-center text-red-500 text-2xl">✗</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="p-4 font-semibold">Compartir búsquedas filtradas</td>
                  <td className="p-4 text-center text-emerald-600 text-2xl">✓</td>
                  <td className="p-4 text-center text-red-500 text-2xl">✗</td>
                  <td className="p-4 text-center text-red-500 text-2xl">✗</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="p-4 font-semibold">Organización de inventario</td>
                  <td className="p-4 text-center text-emerald-600 text-sm font-semibold">Todo en un mapa</td>
                  <td className="p-4 text-center text-red-500 text-sm">Caos total</td>
                  <td className="p-4 text-center text-yellow-500 text-sm">Listas básicas</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="p-4 font-semibold">Optimización de imágenes</td>
                  <td className="p-4 text-center text-emerald-600 text-sm font-semibold">Automática</td>
                  <td className="p-4 text-center text-red-500 text-sm">No aplica</td>
                  <td className="p-4 text-center text-red-500 text-sm">Tú lo haces</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="p-4 font-semibold">Límite de publicaciones</td>
                  <td className="p-4 text-center text-emerald-600 font-bold">Ilimitadas</td>
                  <td className="p-4 text-center text-slate-600">Ilimitadas</td>
                  <td className="p-4 text-center text-slate-600">5-20 según plan</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="p-4 font-semibold">Profesionalismo percibido</td>
                  <td className="p-4 text-center text-emerald-600 text-2xl">⭐⭐⭐⭐⭐</td>
                  <td className="p-4 text-center text-slate-400 text-2xl">⭐</td>
                  <td className="p-4 text-center text-slate-400 text-2xl">⭐⭐⭐</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-8 p-6 bg-emerald-50 rounded-2xl border-2 border-emerald-200">
            <p className="text-center text-lg font-bold text-emerald-900">
              💡 <strong>Resultado:</strong> Geo Propiedades Ecuador te da herramientas profesionales de $300/mes... completamente gratis.
            </p>
          </div>
        </section>

        {/* Preguntas Frecuentes */}
        <section>
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-black mb-4">
              Preguntas Frecuentes
            </h2>
            <p className="text-lg text-white/80">
              Todo lo que necesitas saber antes de empezar
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-6xl mx-auto">
            {[
              {
                q: '¿Realmente es 100% gratis?',
                a: 'Sí. No cobramos por publicar, no cobramos comisiones por ventas, no hay planes premium ocultos. Nuestro modelo es completamente gratuito para siempre.',
              },
              {
                q: '¿Cuántas propiedades puedo publicar?',
                a: 'Todas las que quieras. No hay límite. Ya sea que tengas 1 propiedad o 1,000, puedes publicarlas todas sin costo adicional.',
              },
              {
                q: '¿Necesito conocimientos técnicos?',
                a: 'Para nada. Si sabes usar Google Maps o WhatsApp, puedes usar Geo Propiedades Ecuador. La interfaz es super intuitiva y diseñada para que cualquier persona la use.',
              },
              {
                q: '¿Qué pasa con mis fotos?',
                a: 'Las optimizamos automáticamente para que carguen rápido en cualquier celular, pero manteniendo excelente calidad. Puedes subir hasta 10 fotos por propiedad.',
              },
              {
                q: '¿Puedo editar o eliminar mis propiedades?',
                a: 'Sí, tienes control total. Puedes editar datos, cambiar fotos, actualizar precio, pausar publicación (estado inactivo) o eliminar cuando quieras.',
              },
              {
                q: '¿Cómo contactan los clientes?',
                a: 'Ven tu número de teléfono en la ficha de la propiedad y te contactan directamente por WhatsApp o llamada. Sin intermediarios, sin comisiones.',
              },
              {
                q: '¿Funciona en todo Ecuador?',
                a: 'Sí, tenemos todas las provincias y ciudades de Ecuador cargadas. Puedes publicar propiedades en cualquier parte del país.',
              },
              {
                q: '¿Qué pasa si necesito ayuda?',
                a: 'Tenemos soporte por WhatsApp. Escríbenos y te ayudamos a resolver cualquier duda o problema que tengas.',
              },
              {
                q: '¿Puedo compartir solo algunas propiedades?',
                a: 'Sí! Usa los filtros del mapa (por zona, precio, tipo, etc.), y cuando compartas el link, tu cliente verá solo las propiedades que cumplan esos filtros.',
              },
              {
                q: '¿Mis datos están seguros?',
                a: 'Absolutamente. Usamos autenticación moderna con tokens seguros, verificación de email y encriptación. Tus datos están protegidos.',
              },
            ].map((faq, idx) => (
              <details
                key={idx}
                className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all group cursor-pointer"
              >
                <summary className="font-bold text-lg flex items-start justify-between gap-3 list-none">
                  <span>{faq.q}</span>
                  <span className="text-white/60 text-2xl group-open:rotate-45 transition-transform flex-shrink-0">+</span>
                </summary>
                <p className="text-white/80 mt-4 pt-4 border-t border-white/10 leading-relaxed">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA Final Poderoso */}
        <section className="relative overflow-hidden rounded-3xl">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-primary to-emerald-600" />
          <div className="absolute inset-0 bg-black/20" />

          <div className="relative z-10 text-center py-16 md:py-24 px-6">
            <h2 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
              ¿Listo Para Vender Más Rápido?
            </h2>
            <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-3xl mx-auto leading-relaxed">
              Únete a los agentes e inmobiliarias que ya están usando mapas interactivos
              para <strong>cerrar más ventas en menos tiempo.</strong>
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
              <Link
                href="/add-property"
                className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-white text-primary text-xl font-black hover:bg-emerald-50 transition-all shadow-2xl hover:scale-110 transform"
              >
                🚀 Publicar Mi Primera Propiedad
              </Link>
              <Link
                href="/"
                className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-white/10 backdrop-blur-sm border-2 border-white text-white text-xl font-black hover:bg-white/20 transition-all"
              >
                🗺️ Ver Mapa de Ejemplo
              </Link>
            </div>

            <div className="flex flex-wrap justify-center items-center gap-6 text-sm text-white/90">
              <div className="flex items-center gap-2">
                <span className="text-emerald-300 text-xl">✓</span>
                <span>Gratis para siempre</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-300 text-xl">✓</span>
                <span>Sin tarjeta de crédito</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-300 text-xl">✓</span>
                <span>Activo en 2 minutos</span>
              </div>
            </div>
          </div>
        </section>

        {/* Contacto */}
        <section className="bg-white text-slate-900 rounded-3xl p-8 md:p-12 shadow-2xl text-center">
          <h3 className="text-2xl md:text-3xl font-bold mb-4">
            ¿Tienes Preguntas? Estamos Aquí Para Ayudarte
          </h3>
          <p className="text-slate-600 mb-6 max-w-2xl mx-auto">
            Nuestro equipo está disponible para resolver tus dudas, ayudarte con la configuración
            o escuchar tus sugerencias para mejorar la plataforma.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="https://wa.me/593983738151"
              target="_blank"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-emerald-500 text-white text-lg font-bold hover:bg-emerald-600 transition-all shadow-lg"
            >
              <svg className="h-6 w-6" viewBox="0 0 32 32" fill="currentColor">
                <path d="M16 3C9.4 3 4 8.4 4 15c0 2.2.6 4.2 1.7 6.1L4 29l8-1.6c1.8 1 3.8 1.5 6 1.5 6.6 0 12-5.4 12-12S22.6 3 16 3zm0 21.4c-1.9 0-3.7-.5-5.3-1.4l-.4-.2-4.7.9.9-4.6-.3-.5C6 17.4 5.6 16.2 5.6 15 5.6 9.9 10 5.6 16 5.6S26.4 9.9 26.4 15 22 24.4 16 24.4zm5.1-7.9c-.3-.1-1.9-.9-2.2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.1-.2.1-.3.2-.6.1-.3-.1-1.3-.5-2.5-1.6-.9-.8-1.6-1.8-1.8-2.1-.2-.3 0-.4.1-.5.1-.1.3-.3.4-.4.1-.1.1-.2.2-.3.1-.1.1-.2.2-.3.1-.1.1-.2.1-.3 0-.1 0-.2 0-.3 0-.1-.7-1.8-1-2.4-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.3 0-.5.2-.2.3-.7.7-.7 1.8s.7 2.1.8 2.3c.1.2 1.4 2.2 3.4 3.1 2 .9 2 .6 2.4.6.4 0 1.2-.5 1.3-1 .1-.5.1-.9.1-1 0-.1-.1-.1-.2-.1z" />
              </svg>
              Escríbenos por WhatsApp
            </Link>
            <Link
              href="/account"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl border-2 border-slate-300 text-slate-700 text-lg font-bold hover:bg-slate-50 transition-all"
            >
              Mi Cuenta
            </Link>
          </div>
        </section>

        {/* Footer */}
        <div className="text-center text-white/60 text-sm border-t border-white/10 pt-8">
          <p className="mb-2">
            <strong className="text-white/80">Geo Propiedades Ecuador</strong> - La plataforma gratuita de propiedades geoespaciales
          </p>
          <p className="text-xs">
            Hecho con ❤️ para agentes, inmobiliarias y propietarios que quieren vender más rápido
          </p>
        </div>
      </div>
    </div>
  );
}
