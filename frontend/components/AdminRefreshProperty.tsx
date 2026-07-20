'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { getPublicApiUrl } from '@/lib/api-url';
import { Button } from '@/components/ui/button';

/**
 * Botón solo-admin en la ficha de una propiedad importada: re-scrapea el
 * anuncio desde su portal de origen y actualiza todo (datos e imágenes,
 * re-descargándolas). Si el aviso ya no está vigente, la marca inactiva.
 * No se renderiza para visitantes ni usuarios sin permisos de staff.
 */
export default function AdminRefreshProperty({ propertyId }: { propertyId: number }) {
  const { token, user } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (!token || !user?.is_staff) return null;

  const refresh = async () => {
    setBusy(true);
    try {
      const res = await fetch(`${getPublicApiUrl()}/admin/ingesta/refresh-property/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ property_id: propertyId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || 'No se pudo actualizar desde el portal.');
      } else if (data.result === 'gone') {
        toast.warning(data.detail || 'El anuncio ya no está vigente; se marcó inactiva.');
      } else {
        toast.success(data.detail || 'Propiedad actualizada desde el portal.');
      }
      router.refresh();
    } catch {
      toast.error('Error de conexión al actualizar la propiedad.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={refresh}
      disabled={busy}
      className="gap-2"
      title="Re-scrapear este anuncio desde el portal de origen y actualizar datos e imágenes"
    >
      <RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} strokeWidth={1.75} aria-hidden />
      {busy ? 'Actualizando…' : 'Actualizar desde el portal'}
    </Button>
  );
}
