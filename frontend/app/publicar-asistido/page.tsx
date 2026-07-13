'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Send } from 'lucide-react';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { trackEvent } from '@/lib/analytics';
import { WHATSAPP_NUMBER } from '@/lib/constants';

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

const assistedSchema = z.object({
  name: z.string().trim().min(1, 'Ingresa tu nombre'),
  phone: z.string().trim().min(1, 'Ingresa tu teléfono o WhatsApp'),
  propertyType: z.string(),
  operation: z.string(),
  city: z.string().trim().min(1, 'Ingresa la ciudad o sector'),
  price: z.string(),
  details: z.string(),
});

type AssistedValues = z.infer<typeof assistedSchema>;

export default function AssistedPublishPage() {
  const form = useForm<AssistedValues>({
    resolver: zodResolver(assistedSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      phone: '',
      propertyType: propertyTypes[0].value,
      operation: operations[0].value,
      city: '',
      price: '',
      details: '',
    },
  });

  const buildMessage = (values: AssistedValues) => {
    const lines = [
      'Hola, quiero publicar una propiedad en Geo Propiedades Ecuador.',
      '',
      `Nombre: ${values.name || 'Por completar'}`,
      `Telefono: ${values.phone || 'Por completar'}`,
      `Tipo: ${values.propertyType}`,
      `Operacion: ${values.operation}`,
      `Ciudad/sector: ${values.city || 'Por completar'}`,
      `Precio aproximado: ${values.price || 'Por completar'}`,
      `Detalles: ${values.details || 'Por completar'}`,
    ];

    return lines.join('\n');
  };

  const onSubmit = (values: AssistedValues) => {
    trackEvent('assisted_publication_whatsapp_started', {
      property_type: values.propertyType,
      operation: values.operation,
      city: values.city,
      has_price: Boolean(values.price),
      has_details: Boolean(values.details),
    });
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
      buildMessage(values)
    )}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-primaryLight/40 via-background to-secondary/10 text-textPrimary">
      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_440px] lg:px-8 lg:py-16">
        <div className="flex flex-col justify-center">
          <p className="text-sm font-bold uppercase tracking-wide text-primary">
            Publicacion asistida
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">
            Te ayudamos a publicar tu propiedad gratis
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-textSecondary sm:text-lg">
            Si no quieres llenar todo el formulario o necesitas ayuda con el mapa,
            deja los datos principales y continuamos por WhatsApp. La publicacion
            no tiene costo ni comision.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-card border border-primary/15 bg-surface p-4 shadow-card">
              <p className="text-sm font-bold">1. Envia tus datos</p>
              <p className="mt-1 text-sm text-textSecondary">Nombre, telefono, tipo de propiedad y ciudad.</p>
            </div>
            <div className="rounded-card border border-primary/15 bg-surface p-4 shadow-card">
              <p className="text-sm font-bold">2. Te contactamos</p>
              <p className="mt-1 text-sm text-textSecondary">Revisamos fotos, precio, ubicacion y medidas.</p>
            </div>
            <div className="rounded-card border border-primary/15 bg-surface p-4 shadow-card">
              <p className="text-sm font-bold">3. Queda publicada</p>
              <p className="mt-1 text-sm text-textSecondary">Aparece en el mapa con contacto directo.</p>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="rounded-button bg-secondary hover:bg-secondaryHover">
              <Link href="/registro">Prefiero crear cuenta</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-button border-line bg-surface">
              <Link href="/">Ver propiedades</Link>
            </Button>
          </div>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="rounded-modal border border-line bg-surface p-5 shadow-cardHover sm:p-6"
          >
            <div>
              <h2 className="text-xl font-bold">Datos para ayudarte</h2>
              <p className="mt-1 text-sm text-textSecondary">
                Con esto armamos el primer mensaje por WhatsApp.
              </p>
            </div>

            <div className="mt-6 space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold">Nombre *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej: Maria Perez"
                        autoComplete="name"
                        className="h-12 rounded-input"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold">Telefono o WhatsApp *</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        inputMode="tel"
                        placeholder="Ej: 099 999 9999"
                        autoComplete="tel"
                        className="h-12 rounded-input"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="propertyType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold">Tipo</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12 rounded-input">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {propertyTypes.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="operation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold">Operacion</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12 rounded-input">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {operations.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold">Ciudad o sector *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej: Macas, Quito, Cuenca"
                        className="h-12 rounded-input"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold">Precio aproximado</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej: $75.000 negociable"
                        className="h-12 rounded-input"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="details"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold">Detalles importantes</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={4}
                        placeholder="Area, fotos disponibles, referencia de ubicacion, servicios, habitaciones..."
                        className="resize-none rounded-input"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <Button
              type="submit"
              size="lg"
              className="mt-6 w-full rounded-button bg-primary py-6 text-base font-bold shadow-cardHover"
            >
              <Send className="mr-2 h-5 w-5" />
              Enviar por WhatsApp
            </Button>

            <p className="mt-3 text-center text-xs leading-5 text-textSecondary">
              No guardamos estos datos en esta pantalla; se envian directamente a WhatsApp.
            </p>
          </form>
        </Form>
      </section>
    </main>
  );
}
