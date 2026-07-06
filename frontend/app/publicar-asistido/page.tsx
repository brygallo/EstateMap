'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

const WHATSAPP_NUMBER = '593983738151';

const propertyTypes = [
  { value: 'Terreno', label: 'Terreno' },
  { value: 'Casa', label: 'Casa' },
  { value: 'Departamento', label: 'Departamento' },
  { value: 'Local comercial', label: 'Local comercial' },
  { value: 'Otro', label: 'Otro' },
];

const operations = [
  { value: 'Venta', label: 'Venta' },
  { value: 'Alquiler', label: 'Alquiler' },
  { value: 'Venta o alquiler', label: 'Venta o alquiler' },
];

export default function AssistedPublishPage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [propertyType, setPropertyType] = useState(propertyTypes[0].value);
  const [operation, setOperation] = useState(operations[0].value);
  const [city, setCity] = useState('');
  const [price, setPrice] = useState('');
  const [details, setDetails] = useState('');

  const message = useMemo(() => {
    const lines = [
      'Hola, quiero publicar una propiedad en Geo Propiedades Ecuador.',
      '',
      `Nombre: ${name || 'Por completar'}`,
      `Telefono: ${phone || 'Por completar'}`,
      `Tipo: ${propertyType}`,
      `Operacion: ${operation}`,
      `Ciudad/sector: ${city || 'Por completar'}`,
      `Precio aproximado: ${price || 'Por completar'}`,
      `Detalles: ${details || 'Por completar'}`,
    ];

    return lines.join('\n');
  }, [city, details, name, operation, phone, price, propertyType]);

  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  const canSubmit = name.trim() && phone.trim() && city.trim();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit) return;

    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 text-gray-900">
      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_440px] lg:px-8 lg:py-16">
        <div className="flex flex-col justify-center">
          <p className="text-sm font-bold uppercase tracking-wide text-primary">
            Publicacion asistida
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">
            Te ayudamos a publicar tu propiedad gratis
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-gray-700 sm:text-lg">
            Si no quieres llenar todo el formulario o necesitas ayuda con el mapa,
            deja los datos principales y continuamos por WhatsApp. La publicacion
            no tiene costo ni comision.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-primary/15 bg-white p-4 shadow-sm">
              <p className="text-sm font-bold">1. Envia tus datos</p>
              <p className="mt-1 text-sm text-gray-600">Nombre, telefono, tipo de propiedad y ciudad.</p>
            </div>
            <div className="rounded-lg border border-primary/15 bg-white p-4 shadow-sm">
              <p className="text-sm font-bold">2. Te contactamos</p>
              <p className="mt-1 text-sm text-gray-600">Revisamos fotos, precio, ubicacion y medidas.</p>
            </div>
            <div className="rounded-lg border border-primary/15 bg-white p-4 shadow-sm">
              <p className="text-sm font-bold">3. Queda publicada</p>
              <p className="mt-1 text-sm text-gray-600">Aparece en el mapa con contacto directo.</p>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/register" className="btn btn-md btn-secondary">
              Prefiero crear cuenta
            </Link>
            <Link href="/" className="btn btn-md btn-ghost border border-line bg-white">
              Ver propiedades
            </Link>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl sm:p-6"
        >
          <div>
            <h2 className="text-xl font-bold">Datos para ayudarte</h2>
            <p className="mt-1 text-sm text-gray-600">
              Con esto armamos el primer mensaje por WhatsApp.
            </p>
          </div>

          <div className="mt-6 space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-gray-700">
                Nombre *
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-primary"
                placeholder="Ej: Maria Perez"
                required
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-semibold text-gray-700">
                Telefono o WhatsApp *
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-primary"
                placeholder="Ej: 099 999 9999"
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="propertyType" className="block text-sm font-semibold text-gray-700">
                  Tipo
                </label>
                <select
                  id="propertyType"
                  value={propertyType}
                  onChange={(event) => setPropertyType(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-primary"
                >
                  {propertyTypes.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="operation" className="block text-sm font-semibold text-gray-700">
                  Operacion
                </label>
                <select
                  id="operation"
                  value={operation}
                  onChange={(event) => setOperation(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-primary"
                >
                  {operations.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="city" className="block text-sm font-semibold text-gray-700">
                Ciudad o sector *
              </label>
              <input
                id="city"
                type="text"
                value={city}
                onChange={(event) => setCity(event.target.value)}
                className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-primary"
                placeholder="Ej: Macas, Quito, Cuenca"
                required
              />
            </div>

            <div>
              <label htmlFor="price" className="block text-sm font-semibold text-gray-700">
                Precio aproximado
              </label>
              <input
                id="price"
                type="text"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-primary"
                placeholder="Ej: $75.000 negociable"
              />
            </div>

            <div>
              <label htmlFor="details" className="block text-sm font-semibold text-gray-700">
                Detalles importantes
              </label>
              <textarea
                id="details"
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                rows={4}
                className="mt-2 w-full resize-none rounded-xl border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-primary"
                placeholder="Area, fotos disponibles, referencia de ubicacion, servicios, habitaciones..."
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="mt-6 w-full rounded-xl bg-gradient-to-r from-primary to-secondary px-5 py-4 text-base font-bold text-white shadow-lg transition hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
          >
            Enviar por WhatsApp
          </button>

          <p className="mt-3 text-center text-xs leading-5 text-gray-500">
            No guardamos estos datos en esta pantalla; se envian directamente a WhatsApp.
          </p>
        </form>
      </section>
    </main>
  );
}
