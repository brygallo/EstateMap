/**
 * Descarga de un CSV del panel.
 *
 * No es un `<a href>` porque el endpoint exige `Authorization: Bearer`, y una
 * navegación no lleva cabeceras. Llevar el token en la querystring sería lo
 * cómodo y dejaría una credencial válida escrita en el log de acceso de nginx,
 * así que se pide con `fetch`, se arma el Blob y se descarga desde memoria.
 */

import { apiFetch } from '@/lib/api';

export type AdminDataset = 'properties' | 'users' | 'leads' | 'audit';

const FILENAMES: Record<AdminDataset, string> = {
  properties: 'propiedades',
  users: 'usuarios',
  leads: 'contactos',
  audit: 'bitacora',
};

export async function downloadAdminCsv(dataset: AdminDataset): Promise<void> {
  const response = await apiFetch(`/admin/export/${dataset}/`);
  if (!response.ok) {
    throw new Error(`La exportación respondió ${response.status}`);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  // La fecha va en el nombre porque estos archivos acaban todos en la misma
  // carpeta de Descargas y «propiedades.csv» no dice de cuándo es.
  link.download = `${FILENAMES[dataset]}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Sin esto el Blob se queda en memoria hasta que se recargue la pestaña.
  URL.revokeObjectURL(url);
}
