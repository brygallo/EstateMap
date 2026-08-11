'use client';

import AdminRoute from '@/components/AdminRoute';
import AdminSidebar from '@/components/AdminSidebar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { apiDelete, apiFetch, apiGet, apiPatch, apiPost } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  CalendarClock, Check, Clock3, Copy, ExternalLink, FilePenLine, FolderPlus,
  ImagePlus, Loader2, Newspaper, Plus, Search, Send, Trash2,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';

type Status = 'draft' | 'scheduled' | 'published' | 'archived';

interface Category { id: number; name: string; slug: string; description: string; order: number; post_count: number }
interface Post {
  id: number; title: string; slug: string; excerpt: string; body: string; category: number | null;
  category_name: string | null; tags: string[]; city: string; faqs: Array<{ q: string; a: string }>;
  related_links: Array<{ label: string; href: string }>; cover_image_url: string | null;
  cover_image_alt: string; author_name: string; author_role: string; status: Status;
  published_at: string | null; is_featured: boolean; meta_title: string; meta_description: string;
  reading_minutes: number; created_at: string; updated_at: string;
}
interface PostPage { count: number; next: string | null; previous: string | null; results: Post[] }
interface BlogImage { id: number; image_url: string; alt: string; caption: string; credit: string; markdown: string }

const emptyPost: Omit<Post, 'id' | 'created_at' | 'updated_at' | 'reading_minutes' | 'cover_image_url' | 'category_name'> = {
  title: '', slug: '', excerpt: '', body: '', category: null, tags: [], city: '', faqs: [], related_links: [],
  cover_image_alt: '', author_name: '', author_role: '', status: 'draft', published_at: null,
  is_featured: false, meta_title: '', meta_description: '',
};

const statusLabel: Record<Status, string> = { draft: 'Borrador', scheduled: 'Programado', published: 'Publicado', archived: 'Archivado' };
const statusClass: Record<Status, string> = {
  draft: 'bg-slate-100 text-slate-700', scheduled: 'bg-amber-100 text-amber-800',
  published: 'bg-emerald-100 text-emerald-800', archived: 'bg-stone-100 text-stone-600',
};

export default function BlogAdminPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [images, setImages] = useState<BlogImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | Status>('all');
  const [editing, setEditing] = useState<Post | null | 'new'>(null);
  const [form, setForm] = useState({ ...emptyPost });
  const [selected, setSelected] = useState<number[]>([]);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageAlt, setImageAlt] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [postResponse, categoryResponse] = await Promise.all([
        apiGet('/admin/blog/posts/?ordering=-updated_at'), apiGet('/admin/blog/categories/'),
      ]);
      if (!postResponse.ok || !categoryResponse.ok) throw new Error();
      const postData: PostPage = await postResponse.json();
      setPosts(postData.results);
      setCategories(await categoryResponse.json());
    } catch { toast.error('No se pudo cargar el escritorio editorial.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  const visiblePosts = useMemo(() => posts.filter((post) => {
    const matchesStatus = filter === 'all' || post.status === filter;
    const needle = query.trim().toLowerCase();
    return matchesStatus && (!needle || `${post.title} ${post.excerpt} ${post.category_name || ''}`.toLowerCase().includes(needle));
  }), [posts, filter, query]);

  const openEditor = async (post?: Post) => {
    setEditing(post || 'new');
    setForm(post ? {
      title: post.title, slug: post.slug, excerpt: post.excerpt, body: post.body, category: post.category,
      tags: post.tags || [], city: post.city || '', faqs: post.faqs || [], related_links: post.related_links || [],
      cover_image_alt: post.cover_image_alt || '', author_name: post.author_name || '', author_role: post.author_role || '',
      status: post.status, published_at: post.published_at, is_featured: post.is_featured,
      meta_title: post.meta_title || '', meta_description: post.meta_description || '',
    } : { ...emptyPost });
    if (post) {
      const response = await apiGet(`/admin/blog/images/?post=${post.id}`);
      if (response.ok) setImages((await response.json()).results || []);
    } else setImages([]);
  };

  const savePost = async (publish = false) => {
    if (!form.title.trim() || !form.excerpt.trim() || !form.body.trim()) {
      toast.error('Completa título, resumen y contenido.'); return;
    }
    if (form.status === 'scheduled' && !form.published_at) {
      toast.error('Selecciona la fecha de publicación.'); return;
    }
    setSaving(true);
    try {
      const payload = { ...form, slug: form.slug || undefined };
      const response = editing === 'new'
        ? await apiPost('/admin/blog/posts/', payload)
        : await apiPatch(`/admin/blog/posts/${(editing as Post).id}/`, payload);
      if (!response.ok) throw new Error();
      let saved: Post = await response.json();
      if (publish) {
        const publishResponse = await apiPost(`/admin/blog/posts/${saved.id}/publish/`);
        if (!publishResponse.ok) throw new Error();
        saved = await publishResponse.json();
      }
      toast.success(publish ? 'Artículo publicado.' : editing === 'new' ? 'Borrador creado.' : 'Cambios guardados.');
      setEditing(null); await load();
    } catch { toast.error('No se pudieron guardar los cambios.'); }
    finally { setSaving(false); }
  };

  const quickAction = async (post: Post, action: 'publish' | 'draft' | 'delete') => {
    const response = action === 'delete'
      ? await apiDelete(`/admin/blog/posts/${post.id}/`)
      : await apiPost(`/admin/blog/posts/${post.id}/${action}/`);
    if (!response.ok) { toast.error('No se pudo completar la acción.'); return; }
    toast.success(action === 'publish' ? 'Artículo publicado.' : action === 'draft' ? 'Artículo retirado.' : 'Artículo eliminado.');
    await load();
  };

  const scheduleSelection = async () => {
    const response = await apiPost('/admin/blog/posts/schedule-daily/', { ids: selected });
    if (!response.ok) { toast.error('No se pudo programar la selección.'); return; }
    const data = await response.json();
    toast.success(`${data.scheduled} artículos programados, uno por día.`); setSelected([]); await load();
  };

  const createCategory = async () => {
    if (!categoryName.trim()) return;
    const response = await apiPost('/admin/blog/categories/', { name: categoryName.trim(), order: 100 });
    if (!response.ok) { toast.error('No se pudo crear la categoría.'); return; }
    setCategoryName(''); setCategoryOpen(false); toast.success('Categoría creada.'); await load();
  };

  const uploadImage = async () => {
    if (!imageFile || !imageAlt.trim() || editing === 'new' || !editing) return;
    const data = new FormData(); data.append('image', imageFile); data.append('alt', imageAlt.trim()); data.append('post', String(editing.id));
    const response = await apiFetch('/admin/blog/images/', { method: 'POST', body: data });
    if (!response.ok) { toast.error('No se pudo subir la imagen.'); return; }
    const image: BlogImage = await response.json(); setImages((current) => [image, ...current]);
    setImageFile(null); setImageAlt(''); toast.success('Imagen lista para insertar.');
  };

  return (
    <AdminRoute>
      <div className="flex min-h-[calc(100dvh-var(--app-header-height))] bg-background">
        <AdminSidebar />
        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
            <header className="mb-7 flex flex-col gap-5 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary"><Newspaper className="h-4 w-4" /> Escritorio editorial</div>
                <h1 className="text-3xl font-bold tracking-tight text-textPrimary">Blog</h1>
                <p className="mt-1 text-sm text-textSecondary">Escribe, organiza y publica contenido desde un solo lugar.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setCategoryOpen(true)}><FolderPlus className="mr-2 h-4 w-4" />Categoría</Button>
                <Button onClick={() => openEditor()}><Plus className="mr-2 h-4 w-4" />Nuevo artículo</Button>
              </div>
            </header>

            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(['draft', 'scheduled', 'published', 'archived'] as Status[]).map((status) => (
                <button key={status} onClick={() => setFilter(status)} className={cn('rounded-card border bg-surface p-4 text-left transition hover:border-primary/40', filter === status ? 'border-primary ring-2 ring-primary/10' : 'border-line')}>
                  <span className="text-2xl font-bold text-textPrimary">{posts.filter((post) => post.status === status).length}</span>
                  <span className="mt-1 block text-xs font-medium text-textSecondary">{statusLabel[status]}</span>
                </button>
              ))}
            </div>

            <Card className="overflow-hidden rounded-card border-line shadow-card">
              <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center">
                <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textSecondary" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por título, resumen o categoría" className="pl-9" /></div>
                <Select value={filter} onValueChange={(value) => setFilter(value as 'all' | Status)}><SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos los estados</SelectItem>{Object.entries(statusLabel).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>
                {selected.length > 0 && <Button variant="outline" onClick={scheduleSelection}><CalendarClock className="mr-2 h-4 w-4" />Programar {selected.length}</Button>}
              </div>
              {loading ? <div className="flex h-56 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : visiblePosts.length === 0 ? (
                <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center"><FilePenLine className="mb-4 h-10 w-10 text-primary/50" /><h2 className="font-semibold text-textPrimary">No hay artículos aquí</h2><p className="mt-1 text-sm text-textSecondary">Crea un borrador para empezar a construir el calendario editorial.</p></div>
              ) : <div className="divide-y divide-line">{visiblePosts.map((post) => (
                <article key={post.id} className="group flex gap-3 p-4 transition hover:bg-muted/40 sm:items-center">
                  <Checkbox checked={selected.includes(post.id)} onCheckedChange={(checked) => setSelected((current) => checked ? [...current, post.id] : current.filter((id) => id !== post.id))} aria-label={`Seleccionar ${post.title}`} />
                  <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><button onClick={() => openEditor(post)} className="truncate text-left font-semibold text-textPrimary hover:text-primary">{post.title}</button><Badge className={cn('border-0', statusClass[post.status])}>{statusLabel[post.status]}</Badge>{post.is_featured && <Badge variant="outline">Destacado</Badge>}</div><div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-textSecondary"><span>{post.category_name || 'Sin categoría'}</span><span>{post.reading_minutes} min</span><span>Actualizado {new Date(post.updated_at).toLocaleDateString('es-EC')}</span>{post.published_at && <span>{new Date(post.published_at).toLocaleString('es-EC')}</span>}</div></div>
                  <div className="flex shrink-0 items-center gap-1"><Button size="sm" variant="ghost" onClick={() => openEditor(post)} title="Editar"><FilePenLine className="h-4 w-4" /></Button>{post.status !== 'published' ? <Button size="sm" variant="ghost" onClick={() => quickAction(post, 'publish')} title="Publicar"><Send className="h-4 w-4" /></Button> : <Button size="sm" variant="ghost" onClick={() => quickAction(post, 'draft')} title="Retirar"><Clock3 className="h-4 w-4" /></Button>}<Button asChild size="sm" variant="ghost"><Link href={`/blog/${post.slug}`} target="_blank" title="Ver"><ExternalLink className="h-4 w-4" /></Link></Button><Button size="sm" variant="ghost" className="text-error" onClick={() => confirm(`¿Eliminar “${post.title}”?`) && quickAction(post, 'delete')} title="Eliminar"><Trash2 className="h-4 w-4" /></Button></div>
                </article>
              ))}</div>}
            </Card>
          </div>
        </main>
      </div>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[92dvh] max-w-6xl overflow-y-auto p-0">
          <DialogHeader className="sticky top-0 z-10 flex-row items-center justify-between border-b border-line bg-background px-6 py-4"><div><DialogTitle>{editing === 'new' ? 'Nuevo artículo' : 'Editar artículo'}</DialogTitle><p className="mt-1 text-xs text-textSecondary">El contenido se guarda en Markdown seguro.</p></div></DialogHeader>
          <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-5"><Field label="Título"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Una pregunta concreta que el artículo resuelve" /></Field><Field label="Resumen"><Textarea value={form.excerpt} maxLength={400} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} rows={3} placeholder="Qué encontrará el lector, en 150–160 caracteres idealmente" /></Field><Field label="Contenido"><Textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className="min-h-[420px] font-mono text-sm leading-6" placeholder={'## Primer subtítulo\n\nEscribe aquí…'} /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Meta title"><Input value={form.meta_title} onChange={(e) => setForm({ ...form, meta_title: e.target.value })} /></Field><Field label="Meta description"><Input value={form.meta_description} onChange={(e) => setForm({ ...form, meta_description: e.target.value })} /></Field></div></div>
            <aside className="space-y-5"><section className="rounded-card border border-line p-4"><h3 className="mb-4 font-semibold">Publicación</h3><div className="space-y-4"><Field label="Estado"><Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value as Status })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(statusLabel).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></Field>{form.status === 'scheduled' && <Field label="Fecha y hora"><Input type="datetime-local" value={form.published_at ? form.published_at.slice(0, 16) : ''} onChange={(e) => setForm({ ...form, published_at: e.target.value ? new Date(e.target.value).toISOString() : null })} /></Field>}<label className="flex items-center gap-2 text-sm"><Checkbox checked={form.is_featured} onCheckedChange={(checked) => setForm({ ...form, is_featured: Boolean(checked) })} />Destacar en la portada</label></div></section>
              <section className="rounded-card border border-line p-4"><h3 className="mb-4 font-semibold">Organización</h3><div className="space-y-4"><Field label="Categoría"><Select value={form.category ? String(form.category) : 'none'} onValueChange={(value) => setForm({ ...form, category: value === 'none' ? null : Number(value) })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Sin categoría</SelectItem>{categories.map((category) => <SelectItem key={category.id} value={String(category.id)}>{category.name}</SelectItem>)}</SelectContent></Select></Field><Field label="Ciudad"><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Vacío = alcance nacional" /></Field><Field label="Etiquetas"><Input value={form.tags.join(', ')} onChange={(e) => setForm({ ...form, tags: e.target.value.split(',').map((tag) => tag.trim()).filter(Boolean) })} placeholder="Quito, Crédito, Compra" /></Field><Field label="Slug"><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="Se genera desde el título" /></Field></div></section>
              <section className="rounded-card border border-line p-4"><h3 className="mb-4 font-semibold">Firma</h3><div className="space-y-4"><Field label="Nombre público"><Input value={form.author_name} onChange={(e) => setForm({ ...form, author_name: e.target.value })} /></Field><Field label="Cargo o credencial"><Input value={form.author_role} onChange={(e) => setForm({ ...form, author_role: e.target.value })} /></Field></div></section>
              {editing !== 'new' && <section className="rounded-card border border-line p-4"><h3 className="mb-1 font-semibold">Imágenes del artículo</h3><p className="mb-4 text-xs text-textSecondary">Sube una imagen y copia el código al contenido.</p><div className="space-y-2"><Input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} /><Input value={imageAlt} onChange={(e) => setImageAlt(e.target.value)} placeholder="Describe qué se ve" /><Button type="button" variant="outline" className="w-full" disabled={!imageFile || !imageAlt} onClick={uploadImage}><ImagePlus className="mr-2 h-4 w-4" />Subir imagen</Button>{images.map((image) => <button key={image.id} onClick={() => { navigator.clipboard.writeText(image.markdown); toast.success('Código copiado.'); }} className="flex w-full items-center gap-2 rounded-md border border-line p-2 text-left hover:bg-muted"><Image unoptimized width={48} height={40} src={image.image_url} alt="" className="h-10 w-12 rounded object-cover" /><span className="min-w-0 flex-1 truncate text-xs">{image.alt}</span><Copy className="h-3.5 w-3.5" /></button>)}</div></section>}
            </aside>
          </div>
          <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-line bg-background px-6 py-4 sm:flex-row sm:justify-end"><Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button><Button variant="outline" disabled={saving} onClick={() => savePost(false)}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}Guardar cambios</Button><Button disabled={saving} onClick={() => savePost(true)}><Send className="mr-2 h-4 w-4" />Publicar ahora</Button></div>
        </DialogContent>
      </Dialog>

      <Dialog open={categoryOpen} onOpenChange={setCategoryOpen}><DialogContent><DialogHeader><DialogTitle>Nueva categoría</DialogTitle></DialogHeader><Field label="Nombre"><Input autoFocus value={categoryName} onChange={(e) => setCategoryName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && createCategory()} placeholder="Ej. Mercado inmobiliario" /></Field><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setCategoryOpen(false)}>Cancelar</Button><Button onClick={createCategory}>Crear categoría</Button></div></DialogContent></Dialog>
    </AdminRoute>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
