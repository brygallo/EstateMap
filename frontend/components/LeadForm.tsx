'use client';

import { useState } from 'react';
import { toast } from 'react-toastify';

interface LeadFormProps {
  propertyId: number;
  source?: string;
}

/**
 * Formulario de contacto por propiedad. Envía un lead (nombre, teléfono,
 * mensaje) al backend de forma pública para que la inmobiliaria mida interés.
 */
export default function LeadForm({ propertyId, source = 'property_modal' }: LeadFormProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast.error('Nombre y teléfono son obligatorios');
      return;
    }

    setSubmitting(true);
    try {
      const { apiFetch } = await import('@/lib/api');
      const res = await apiFetch('/leads/', {
        method: 'POST',
        skipAuth: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property: propertyId,
          name: name.trim(),
          phone: phone.trim(),
          message: message.trim(),
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
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="bg-successBg border border-success/30 p-3 rounded-card text-center">
        <svg className="h-6 w-6 mx-auto mb-1 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <p className="text-sm font-semibold text-textPrimary">¡Mensaje enviado!</p>
        <p className="text-xs text-textSecondary">El anunciante te contactará pronto.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-background border border-line p-3 rounded-card space-y-2">
      <h3 className="text-sm font-semibold text-textPrimary flex items-center gap-1">
        <svg className="h-3.5 w-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        ¿Te interesa? Déjanos tus datos
      </h3>

      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Tu nombre *"
        className="field"
        required
      />
      <input
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Tu teléfono *"
        className="field"
        required
      />
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Mensaje (opcional)"
        rows={2}
        className="field resize-none"
      />
      <button
        type="submit"
        disabled={submitting}
        className="btn btn-sm btn-primary w-full disabled:opacity-50"
      >
        {submitting ? 'Enviando...' : 'Enviar mensaje'}
      </button>
    </form>
  );
}
