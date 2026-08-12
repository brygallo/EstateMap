'use client';

import { useRef, useState } from 'react';
import {
  Bold,
  Code2,
  Eye,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  MessageSquareQuote,
  PencilLine,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { renderMarkdown } from '@/lib/markdown';

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
};

type Tool = {
  label: string;
  icon: typeof Bold;
  before: string;
  after?: string;
  placeholder: string;
  block?: boolean;
};

const tools: Tool[] = [
  { label: 'Título', icon: Heading2, before: '## ', placeholder: 'Título de sección', block: true },
  { label: 'Subtítulo', icon: Heading3, before: '### ', placeholder: 'Subtítulo', block: true },
  { label: 'Negrita', icon: Bold, before: '**', after: '**', placeholder: 'texto importante' },
  { label: 'Cursiva', icon: Italic, before: '*', after: '*', placeholder: 'texto' },
  { label: 'Enlace', icon: Link2, before: '[', after: '](https://)', placeholder: 'texto del enlace' },
  { label: 'Lista', icon: List, before: '- ', placeholder: 'Elemento de lista', block: true },
  { label: 'Lista numerada', icon: ListOrdered, before: '1. ', placeholder: 'Primer elemento', block: true },
  { label: 'Cita', icon: MessageSquareQuote, before: '> ', placeholder: 'Texto de la cita', block: true },
  {
    label: 'Código HTML',
    icon: Code2,
    before: '```html\n',
    after: '\n```',
    placeholder: '<section>\n  Tu código HTML\n</section>',
    block: true,
  },
];

export function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mode, setMode] = useState<'write' | 'preview'>('write');

  const applyTool = (tool: Tool) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selection = value.slice(start, end) || tool.placeholder;
    const needsLeadingBreak = tool.block && start > 0 && value[start - 1] !== '\n';
    const prefix = `${needsLeadingBreak ? '\n\n' : ''}${tool.before}`;
    const insertion = `${prefix}${selection}${tool.after ?? ''}`;
    const nextValue = `${value.slice(0, start)}${insertion}${value.slice(end)}`;
    onChange(nextValue);

    requestAnimationFrame(() => {
      textarea.focus();
      const selectionStart = start + prefix.length;
      textarea.setSelectionRange(selectionStart, selectionStart + selection.length);
    });
  };

  return (
    <div className="overflow-hidden rounded-card border border-line bg-white shadow-soft focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface px-2 py-2">
        <div className="flex flex-wrap gap-1" role="toolbar" aria-label="Formato del contenido">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Button
                key={tool.label}
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 gap-1.5 px-2.5"
                onClick={() => applyTool(tool)}
                title={tool.label}
                aria-label={tool.label}
                disabled={mode === 'preview'}
              >
                <Icon className="h-4 w-4" aria-hidden />
                <span className="hidden xl:inline">{tool.label}</span>
              </Button>
            );
          })}
        </div>
        <div className="flex rounded-lg border border-line bg-white p-0.5">
          <button type="button" onClick={() => setMode('write')} className={cn('inline-flex min-h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold', mode === 'write' ? 'bg-primary text-white' : 'text-textSecondary')}><PencilLine className="h-3.5 w-3.5" aria-hidden />Escribir</button>
          <button type="button" onClick={() => setMode('preview')} className={cn('inline-flex min-h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold', mode === 'preview' ? 'bg-primary text-white' : 'text-textSecondary')}><Eye className="h-3.5 w-3.5" aria-hidden />Vista previa</button>
        </div>
      </div>

      {mode === 'write' ? (
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-[460px] resize-y rounded-none border-0 font-mono text-sm leading-6 shadow-none focus-visible:ring-0"
          placeholder={'## Primer subtítulo\n\nEscribe aquí…'}
          aria-label="Contenido del artículo"
        />
      ) : (
        <div className="min-h-[460px] bg-white px-6 pb-10 pt-1 sm:px-8">
          {value.trim() ? renderMarkdown(value) : <p className="mt-8 text-sm text-textSecondary">Escribe contenido para ver cómo quedará publicado.</p>}
        </div>
      )}

      <div className="border-t border-line bg-surface px-3 py-2 text-xs text-textSecondary">
        El botón «Código HTML» inserta un bloque visible y seguro. Las etiquetas pegadas fuera de ese bloque se muestran como texto y nunca se ejecutan.
      </div>
    </div>
  );
}
