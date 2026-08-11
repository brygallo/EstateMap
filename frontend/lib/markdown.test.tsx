import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import {
  extractHeadings,
  extractImages,
  headingId,
  markdownToPlainText,
  midArticleIndex,
  parseBlocks,
  renderMarkdown,
} from './markdown';

describe('parseBlocks', () => {
  it('separates headings, paragraphs and lists', () => {
    const blocks = parseBlocks(
      ['Intro.', '', '## Un título', '', 'Un párrafo.', '', '- uno', '- dos'].join('\n')
    );

    expect(blocks.map((block) => block.kind)).toEqual([
      'paragraph',
      'heading',
      'paragraph',
      'list',
    ]);
  });

  it('joins the lines of a paragraph instead of breaking it', () => {
    const blocks = parseBlocks('Una frase\nque sigue en la línea siguiente.');

    expect(blocks).toEqual([
      { kind: 'paragraph', text: 'Una frase que sigue en la línea siguiente.' },
    ]);
  });

  it('does not mix an ordered list into an unordered one', () => {
    const blocks = parseBlocks(['- viñeta', '1. numerado'].join('\n'));

    expect(blocks).toEqual([
      { kind: 'list', ordered: false, items: ['viñeta'] },
      { kind: 'list', ordered: true, items: ['numerado'] },
    ]);
  });

  it('reads quotes and horizontal rules', () => {
    const blocks = parseBlocks(['> Una cita.', '', '---', '', 'Después.'].join('\n'));

    expect(blocks[0]).toEqual({ kind: 'quote', text: 'Una cita.' });
    expect(blocks[1]).toEqual({ kind: 'rule' });
  });

  it('survives an empty body', () => {
    expect(parseBlocks('')).toEqual([]);
  });
});

describe('headingId', () => {
  it('strips accents and punctuation', () => {
    expect(headingId('1. Define presupuesto y zona')).toBe('1-define-presupuesto-y-zona');
    expect(headingId('¿Qué es la alcabala?')).toBe('que-es-la-alcabala');
  });
});

describe('extractHeadings', () => {
  it('lists h2 and h3 with their anchors', () => {
    const headings = extractHeadings(['## Impuestos', '### Alcabala', 'texto'].join('\n'));

    expect(headings).toEqual([
      { id: 'impuestos', text: 'Impuestos', level: 2 },
      { id: 'alcabala', text: 'Alcabala', level: 3 },
    ]);
  });
});

describe('renderMarkdown', () => {
  it('renders headings with an anchor id', () => {
    const { container } = render(<div>{renderMarkdown('## Escrituras y registro')}</div>);

    const heading = container.querySelector('h2');
    expect(heading?.id).toBe('escrituras-y-registro');
    expect(heading?.textContent).toBe('Escrituras y registro');
  });

  it('renders bold, italics, code and links', () => {
    render(
      <div>
        {renderMarkdown('Texto **fuerte**, *suave*, `código` y [un enlace](/blog).')}
      </div>
    );

    expect(screen.getByText('fuerte').tagName).toBe('STRONG');
    expect(screen.getByText('suave').tagName).toBe('EM');
    expect(screen.getByText('código').tagName).toBe('CODE');
    expect(screen.getByRole('link', { name: 'un enlace' })).toHaveAttribute('href', '/blog');
  });

  it('opens external links in a new tab without passing authority', () => {
    render(<div>{renderMarkdown('Ver [el BIESS](https://biess.fin.ec).')}</div>);

    const link = screen.getByRole('link', { name: 'el BIESS' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.getAttribute('rel')).toContain('nofollow');
  });

  it('never turns editor input into live markup', () => {
    // The whole reason this renderer exists: whatever staff paste into the body
    // is text, not HTML. A <script> in a post must reach the reader as
    // characters on the page and nothing else.
    const { container } = render(
      <div>{renderMarkdown('Ojo con <script>alert(1)</script> y <b>esto</b>.')}</div>
    );

    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('b')).toBeNull();
    expect(container.textContent).toContain('<script>alert(1)</script>');
  });
});

describe('markdownToPlainText', () => {
  it('drops the markers and keeps the prose', () => {
    const plain = markdownToPlainText(
      ['## Título', '', 'Un **texto** con [enlace](/blog).', '', '- punto uno'].join('\n')
    );

    expect(plain).toBe('Título Un texto con enlace. punto uno');
  });
});

describe('images', () => {
  it('reads a standalone image with its caption', () => {
    const blocks = parseBlocks('![Vista de Cumbayá](https://cdn/x.jpg "Foto: municipio de Quito")');

    expect(blocks).toEqual([
      {
        kind: 'image',
        alt: 'Vista de Cumbayá',
        src: 'https://cdn/x.jpg',
        caption: 'Foto: municipio de Quito',
      },
    ]);
  });

  it('renders it as a figure with alt text and caption', () => {
    const { container } = render(
      <div>{renderMarkdown('![Un barrio](https://cdn/x.jpg "Barrio de Quito")')}</div>
    );

    expect(container.querySelector('figure')).not.toBeNull();
    expect(screen.getByAltText('Un barrio')).toBeInTheDocument();
    expect(screen.getByText('Barrio de Quito').tagName).toBe('FIGCAPTION');
  });

  it('does not treat an inline image as a block', () => {
    const blocks = parseBlocks('Mira ![esto](https://cdn/x.jpg) dentro de una frase.');

    expect(blocks[0].kind).toBe('paragraph');
  });

  it('lists the images of a body for the Article schema', () => {
    const images = extractImages(
      ['![Uno](https://cdn/1.jpg)', '', 'Texto.', '', '![Dos](https://cdn/2.jpg)'].join('\n')
    );

    expect(images).toEqual([
      { src: 'https://cdn/1.jpg', alt: 'Uno' },
      { src: 'https://cdn/2.jpg', alt: 'Dos' },
    ]);
  });
});

describe('tables', () => {
  it('reads a table with its header row', () => {
    const blocks = parseBlocks(
      ['| Ciudad | Precio |', '| --- | --- |', '| Quito | $1.200 |', '| Cuenca | $1.050 |'].join('\n')
    );

    expect(blocks).toEqual([
      {
        kind: 'table',
        header: ['Ciudad', 'Precio'],
        rows: [
          ['Quito', '$1.200'],
          ['Cuenca', '$1.050'],
        ],
      },
    ]);
  });

  it('needs the divider row: pipes alone stay prose', () => {
    const blocks = parseBlocks('El separador | no convierte esto en tabla.');

    expect(blocks[0].kind).toBe('paragraph');
  });

  it('renders header cells as th', () => {
    render(
      <div>
        {renderMarkdown(['| Ciudad | Precio |', '| --- | --- |', '| Quito | $1.200 |'].join('\n'))}
      </div>
    );

    expect(screen.getByRole('columnheader', { name: 'Ciudad' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '$1.200' })).toBeInTheDocument();
  });
});

describe('callouts', () => {
  it('reads a fenced callout with its tone', () => {
    const blocks = parseBlocks([':::consejo', 'Pide el certificado de gravámenes.', ':::'].join('\n'));

    expect(blocks).toEqual([
      { kind: 'callout', tone: 'consejo', lines: ['Pide el certificado de gravámenes.'] },
    ]);
  });

  it('renders the tone label so the reader knows what it is', () => {
    render(<div>{renderMarkdown([':::aviso', 'Ojo con esto.', ':::'].join('\n'))}</div>);

    expect(screen.getByText('Atención')).toBeInTheDocument();
    expect(screen.getByText('Ojo con esto.')).toBeInTheDocument();
  });

  it('renders an unclosed callout instead of swallowing the text', () => {
    // An editor who forgets the closing ":::" must still see their words.
    render(<div>{renderMarkdown([':::nota', 'Texto sin cerrar.'].join('\n'))}</div>);

    expect(screen.getByText('Texto sin cerrar.')).toBeInTheDocument();
  });
});

describe('code fences', () => {
  it('keeps the contents verbatim instead of parsing them', () => {
    const blocks = parseBlocks(['```', '## no es un título', '- ni una lista', '```'].join('\n'));

    expect(blocks).toEqual([
      { kind: 'code', language: '', lines: ['## no es un título', '- ni una lista'] },
    ]);
  });

  it('keeps a fenced heading out of the table of contents', () => {
    const headings = extractHeadings(
      ['## Real', '', '```', '## Falso', '```'].join('\n')
    );

    expect(headings.map((h) => h.text)).toEqual(['Real']);
  });
});

describe('pull quotes', () => {
  it('splits a trailing attribution line from the quote', () => {
    const blocks = parseBlocks(['> El mercado se enfrió.', '> — Cámara de la Construcción'].join('\n'));

    expect(blocks).toEqual([
      {
        kind: 'quote',
        text: 'El mercado se enfrió.',
        attribution: 'Cámara de la Construcción',
      },
    ]);
  });

  it('does not invent an attribution from a one-line quote', () => {
    const blocks = parseBlocks('> — solo un guion');

    expect(blocks[0]).toEqual({ kind: 'quote', text: '— solo un guion' });
  });
});

describe('midArticleIndex', () => {
  const section = (n: number) => [`## Sección ${n}`, '', `Párrafo ${n}.`, ''];

  it('lands on a heading near the middle, not inside a section', () => {
    const body = [1, 2, 3, 4, 5, 6].flatMap(section).join('\n');

    const index = midArticleIndex(body);
    const blocks = parseBlocks(body);

    expect(blocks[index].kind).toBe('heading');
    expect(index).toBeGreaterThan(1);
    expect(index).toBeLessThan(blocks.length - 2);
  });

  it('refuses to interrupt a short post', () => {
    // A three-paragraph article with an ad in the middle is an ad with an
    // article around it.
    expect(midArticleIndex('Un párrafo.\n\nOtro párrafo.')).toBe(-1);
  });

  it('gives up rather than splitting a body with no sections', () => {
    const body = Array.from({ length: 12 }, (_, i) => `Párrafo ${i}.`).join('\n\n');

    expect(midArticleIndex(body)).toBe(-1);
  });
});
