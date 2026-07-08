'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { CheckCircle2, Loader2, Mail, Send } from 'lucide-react';

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

interface LeadFormProps {
  propertyId: number;
  source?: string;
  showTitle?: boolean;
}

const leadSchema = z.object({
  name: z.string().trim().min(1, 'Ingresa tu nombre'),
  phone: z
    .string()
    .trim()
    .min(1, 'Ingresa tu teléfono')
    .refine((v) => v.replace(/\D/g, '').length >= 6, 'Teléfono no válido'),
  email: z.string().trim().email('Correo no válido').optional().or(z.literal('')),
  message: z.string().trim().optional(),
});

type LeadValues = z.infer<typeof leadSchema>;

/**
 * Formulario de contacto por propiedad. Envía un lead (nombre, teléfono,
 * mensaje) al backend de forma pública para que la inmobiliaria mida interés.
 */
export default function LeadForm({ propertyId, source = 'property_modal', showTitle = true }: LeadFormProps) {
  const [sent, setSent] = useState(false);

  const form = useForm<LeadValues>({
    resolver: zodResolver(leadSchema),
    mode: 'onChange',
    defaultValues: { name: '', phone: '', email: '', message: '' },
  });

  const onSubmit = async (values: LeadValues) => {
    try {
      const { apiFetch } = await import('@/lib/api');
      const res = await apiFetch('/leads/', {
        method: 'POST',
        skipAuth: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property: propertyId,
          name: values.name.trim(),
          phone: values.phone.trim(),
          email: (values.email || '').trim(),
          message: (values.message || '').trim(),
          source,
        }),
      });

      if (res.ok) {
        setSent(true);
        toast.success('¡Mensaje enviado! Te contactarán pronto.');
      } else {
        toast.error('No se pudo enviar tu mensaje. Intenta de nuevo.');
      }
    } catch {
      toast.error('Error de conexión. Intenta de nuevo.');
    }
  };

  if (sent) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25 }}
        className="rounded-card border border-success/30 bg-successBg p-4 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.05 }}
        >
          <CheckCircle2 className="mx-auto mb-1 h-7 w-7 text-success" />
        </motion.div>
        <p className="text-sm font-semibold text-textPrimary">¡Mensaje enviado!</p>
        <p className="text-xs text-textSecondary">El anunciante te contactará pronto.</p>
      </motion.div>
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-2.5 rounded-card border border-line bg-background p-3"
      >
        {showTitle && (
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-textPrimary">
            <Mail className="h-4 w-4 flex-shrink-0 text-primary" />
            <span>¿Te interesa? Déjanos tus datos</span>
          </h3>
        )}

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel className="sr-only">Tu nombre (requerido)</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  placeholder="Tu nombre *"
                  autoComplete="name"
                  aria-required="true"
                  className="h-10 rounded-input"
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel className="sr-only">Tu teléfono (requerido)</FormLabel>
              <FormControl>
                <Input
                  type="tel"
                  inputMode="tel"
                  placeholder="Tu teléfono *"
                  autoComplete="tel"
                  aria-required="true"
                  className="h-10 rounded-input"
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel className="sr-only">Tu correo (opcional)</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="Tu correo (opcional)"
                  autoComplete="email"
                  className="h-10 rounded-input"
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel className="sr-only">Mensaje (opcional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Mensaje (opcional)"
                  rows={2}
                  className="resize-none rounded-input"
                  {...field}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <Button
          type="submit"
          size="sm"
          disabled={form.formState.isSubmitting}
          className="w-full rounded-button bg-primary hover:bg-primaryHover"
        >
          {form.formState.isSubmitting ? (
            <>
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Send className="mr-1.5 h-4 w-4" />
              Enviar mensaje
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}
