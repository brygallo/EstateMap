/**
 * The Markdown subset the blog is written in.
 *
 * Why a hand-rolled renderer instead of a library: the body of a post is a text
 * field that staff paste into, and the two obvious shortcuts both end badly. A
 * full Markdown pipeline accepts raw HTML by default, and `dangerouslySetInnerHTML`
 * turns an editor's paste into live markup. Here the output is React nodes built
 * from matched patterns, so nothing written in the admin can become an element
 * this file does not construct itself.
 *
 * The subset covers what a real article needs — headings, prose, lists, images
 * with captions, tables, pull quotes, callouts, code and inline emphasis.
 * Anything outside it stays literal text rather than silently disappearing,
 * which is the failure mode that makes an editor think the CMS ate their work.
 */

import Image from 'next/image';
import Link from 'next/link';
import React from 'react';

export type Heading = { id: string; text: string; level: 2 | 3 };

/** Slug for a heading anchor. Mirrors `slugify` in lib/properties.ts. */
export function headingId(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Headings of a document, for the table of contents. Only h2/h3 — an h4 is a
 * detail inside a section, and listing it makes the index longer than useful. */
export function extractHeadings(markdown: string): Heading[] {
  const headings: Heading[] = [];
  let inFence = false;
  for (const line of (markdown || '').split('\n')) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const match = /^(#{2,3})\s+(.+?)\s*$/.exec(line);
    if (!match) continue;
    const text = match[2];
    headings.push({ id: headingId(text), text, level: match[1].length as 2 | 3 });
  }
  return headings;
}

// Inline patterns, tried in order. `code` comes first so backticks win over the
// emphasis markers a snippet might contain.
const INLINE = [
  { type: 'code', re: /`([^`]+)`/ },
  { type: 'link', re: /\[([^\]]+)\]\(([^)\s]+)\)/ },
  { type: 'strong', re: /\*\*([^*]+)\*\*/ },
  { type: 'em', re: /(?<!\*)\*([^*\n]+)\*(?!\*)/ },
] as const;

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let rest = text;
  let index = 0;

  while (rest) {
    let best: { type: string; match: RegExpExecArray } | null = null;
    for (const pattern of INLINE) {
      const match = pattern.re.exec(rest);
      if (match && (!best || match.index < best.match.index)) {
        best = { type: pattern.type, match };
      }
    }

    if (!best) {
      nodes.push(rest);
      break;
    }

    const { match, type } = best;
    if (match.index > 0) nodes.push(rest.slice(0, match.index));
    const key = `${keyPrefix}-${index++}`;

    if (type === 'code') {
      nodes.push(
        <code
          key={key}
          className="rounded bg-surface px-1.5 py-0.5 font-mono text-[0.9em] text-textPrimary"
        >
          {match[1]}
        </code>
      );
    } else if (type === 'link') {
      const href = match[2];
      const isInternal = href.startsWith('/');
      nodes.push(
        isInternal ? (
          <Link key={key} href={href} className="font-medium text-primary hover:underline">
            {match[1]}
          </Link>
        ) : (
          <a
            key={key}
            href={href}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="font-medium text-primary hover:underline"
          >
            {match[1]}
          </a>
        )
      );
    } else if (type === 'strong') {
      nodes.push(
        <strong key={key} className="font-semibold text-textPrimary">
          {match[1]}
        </strong>
      );
    } else {
      nodes.push(<em key={key}>{match[1]}</em>);
    }

    rest = rest.slice(match.index + match[0].length);
  }

  return nodes;
}

export type CalloutTone = 'nota' | 'consejo' | 'aviso' | 'dato';

const CALLOUT_TONES: Record<CalloutTone, { label: string; className: string }> = {
  nota: { label: 'Nota', className: 'border-line bg-surface' },
  consejo: { label: 'Consejo', className: 'border-primary/40 bg-primary/5' },
  aviso: { label: 'Atención', className: 'border-amber-400/60 bg-amber-50' },
  dato: { label: 'El dato', className: 'border-emerald-400/60 bg-emerald-50' },
};

export type Block =
  | { kind: 'heading'; level: 2 | 3 | 4; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'quote'; text: string; attribution?: string }
  | { kind: 'callout'; tone: CalloutTone; lines: string[] }
  | { kind: 'image'; src: string; alt: string; caption?: string }
  | { kind: 'table'; header: string[]; rows: string[][] }
  | { kind: 'code'; language: string; lines: string[] }
  | { kind: 'rule' };

// A standalone image line: ![alt](src) with an optional "caption" in quotes.
const IMAGE_RE = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)$/;
const TABLE_DIVIDER_RE = /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?$/;

function splitRow(line: string): string[] {
  return line
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((cell) => cell.trim());
}

/** Split a document into blocks. Exported for the tests. */
export function parseBlocks(markdown: string): Block[] {
  const lines = (markdown || '').replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let quote: string[] = [];
  let callout: { tone: CalloutTone; lines: string[] } | null = null;
  let code: { language: string; lines: string[] } | null = null;

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ kind: 'paragraph', text: paragraph.join(' ') });
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list) {
      blocks.push({ kind: 'list', ...list });
      list = null;
    }
  };
  const flushQuote = () => {
    if (!quote.length) return;
    // A trailing "— Alguien" line becomes the attribution instead of prose.
    const last = quote[quote.length - 1];
    const attribution = /^\s*[—–-]{1,2}\s*(.+)$/.exec(last);
    if (attribution && quote.length > 1) {
      blocks.push({
        kind: 'quote',
        text: quote.slice(0, -1).join(' '),
        attribution: attribution[1].trim(),
      });
    } else {
      blocks.push({ kind: 'quote', text: quote.join(' ') });
    }
    quote = [];
  };
  const flushAll = () => {
    flushParagraph();
    flushList();
    flushQuote();
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();

    // Fenced code swallows everything verbatim until the closing fence, so a
    // snippet containing "## " or "- " is not read as Markdown.
    if (code) {
      if (/^```/.test(trimmed)) {
        blocks.push({ kind: 'code', ...code });
        code = null;
      } else {
        code.lines.push(line);
      }
      continue;
    }
    const fence = /^```\s*([A-Za-z0-9+-]*)\s*$/.exec(trimmed);
    if (fence) {
      flushAll();
      if (callout) {
        blocks.push({ kind: 'callout', ...callout });
        callout = null;
      }
      code = { language: fence[1] || '', lines: [] };
      continue;
    }

    // Callout fences: ":::consejo" … ":::"
    const calloutOpen = /^:::\s*(nota|consejo|aviso|dato)\s*$/i.exec(trimmed);
    if (calloutOpen) {
      flushAll();
      callout = { tone: calloutOpen[1].toLowerCase() as CalloutTone, lines: [] };
      continue;
    }
    if (callout) {
      if (trimmed === ':::') {
        blocks.push({ kind: 'callout', ...callout });
        callout = null;
      } else if (trimmed) {
        callout.lines.push(trimmed);
      }
      continue;
    }

    if (!trimmed) {
      flushAll();
      continue;
    }

    const image = IMAGE_RE.exec(trimmed);
    if (image) {
      flushAll();
      blocks.push({
        kind: 'image',
        alt: image[1],
        src: image[2],
        caption: image[3] || undefined,
      });
      continue;
    }

    const heading = /^(#{2,4})\s+(.+)$/.exec(trimmed);
    if (heading) {
      flushAll();
      blocks.push({
        kind: 'heading',
        level: heading[1].length as 2 | 3 | 4,
        text: heading[2].trim(),
      });
      continue;
    }

    if (/^(---|\*\*\*|___)$/.test(trimmed)) {
      flushAll();
      blocks.push({ kind: 'rule' });
      continue;
    }

    // A table needs its divider row on the next line; without it the pipes are
    // just characters in a sentence.
    if (trimmed.includes('|') && TABLE_DIVIDER_RE.test((lines[index + 1] || '').trim())) {
      flushAll();
      const header = splitRow(trimmed);
      const rows: string[][] = [];
      let cursor = index + 2;
      while (cursor < lines.length && lines[cursor].trim().includes('|')) {
        rows.push(splitRow(lines[cursor].trim()));
        cursor += 1;
      }
      blocks.push({ kind: 'table', header, rows });
      index = cursor - 1;
      continue;
    }

    const quoted = /^>\s?(.*)$/.exec(trimmed);
    if (quoted) {
      flushParagraph();
      flushList();
      quote.push(quoted[1]);
      continue;
    }

    const bullet = /^[-*+]\s+(.+)$/.exec(trimmed);
    const numbered = /^\d+[.)]\s+(.+)$/.exec(trimmed);
    if (bullet || numbered) {
      flushParagraph();
      flushQuote();
      const ordered = Boolean(numbered);
      const item = (bullet ? bullet[1] : numbered![1]).trim();
      // A change of list type starts a new list instead of mixing markers.
      if (list && list.ordered !== ordered) flushList();
      if (!list) list = { ordered, items: [] };
      list.items.push(item);
      continue;
    }

    flushList();
    flushQuote();
    paragraph.push(trimmed);
  }

  // Unclosed fences still render: an editor who forgets the closing ":::" gets
  // their text, not a blank page.
  if (code) blocks.push({ kind: 'code', ...code });
  if (callout) blocks.push({ kind: 'callout', ...callout });
  flushAll();
  return blocks;
}

function ArticleImage({ block, index }: { block: Extract<Block, { kind: 'image' }>; index: number }) {
  return (
    <figure className="mt-8">
      <Image
        src={block.src}
        alt={block.alt}
        width={1200}
        height={675}
        // Intrinsic size is a hint for the aspect ratio Next reserves; `h-auto`
        // lets the real proportions win, so a portrait photo is not squashed
        // into 16/9. Reserving the box is what keeps CLS at zero.
        className="h-auto w-full rounded-card"
        sizes="(max-width: 768px) 100vw, 768px"
        // Below the fold by definition: the cover image is the LCP candidate,
        // never one of these.
        loading={index < 2 ? 'eager' : 'lazy'}
      />
      {block.caption && (
        <figcaption className="mt-2 text-sm leading-6 text-textSecondary">
          {block.caption}
        </figcaption>
      )}
    </figure>
  );
}

/** Render a post body. Returns React nodes; never raw HTML. */
export function renderMarkdown(markdown: string): React.ReactNode[] {
  return parseBlocks(markdown).map((block, index) => {
    const key = `block-${index}`;
    switch (block.kind) {
      case 'heading': {
        const id = headingId(block.text);
        const content = renderInline(block.text, key);
        if (block.level === 2) {
          return (
            <h2
              key={key}
              id={id}
              className="mt-12 scroll-mt-24 text-2xl font-bold leading-snug text-textPrimary sm:text-[1.7rem]"
            >
              {content}
            </h2>
          );
        }
        if (block.level === 3) {
          return (
            <h3 key={key} id={id} className="mt-8 scroll-mt-24 text-xl font-semibold text-textPrimary">
              {content}
            </h3>
          );
        }
        return (
          <h4
            key={key}
            id={id}
            className="mt-6 scroll-mt-24 text-base font-semibold text-textPrimary"
          >
            {content}
          </h4>
        );
      }
      case 'paragraph':
        return (
          <p key={key} className="mt-5 text-[1.05rem] leading-8 text-textSecondary">
            {renderInline(block.text, key)}
          </p>
        );
      case 'list': {
        const items = block.items.map((item, itemIndex) => (
          <li key={`${key}-${itemIndex}`} className="pl-1 leading-8 text-textSecondary">
            {renderInline(item, `${key}-${itemIndex}`)}
          </li>
        ));
        return block.ordered ? (
          <ol key={key} className="mt-5 list-decimal space-y-2 pl-6 marker:font-semibold marker:text-primary">
            {items}
          </ol>
        ) : (
          <ul key={key} className="mt-5 list-disc space-y-2 pl-6 marker:text-primary">
            {items}
          </ul>
        );
      }
      case 'quote':
        return (
          <blockquote
            key={key}
            className="mt-8 border-l-4 border-primary/40 py-1 pl-5 text-lg italic leading-8 text-textPrimary"
          >
            {renderInline(block.text, key)}
            {block.attribution && (
              <cite className="mt-2 block text-sm not-italic text-textSecondary">
                — {block.attribution}
              </cite>
            )}
          </blockquote>
        );
      case 'callout': {
        const tone = CALLOUT_TONES[block.tone];
        return (
          <aside
            key={key}
            className={`mt-8 rounded-card border-l-4 p-5 ${tone.className}`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-textPrimary">
              {tone.label}
            </p>
            {block.lines.map((line, lineIndex) => (
              <p
                key={`${key}-${lineIndex}`}
                className="mt-2 leading-7 text-textSecondary"
              >
                {renderInline(line, `${key}-${lineIndex}`)}
              </p>
            ))}
          </aside>
        );
      }
      case 'image':
        return <ArticleImage key={key} block={block} index={index} />;
      case 'table':
        return (
          // Wide tables scroll inside their own box instead of pushing the page
          // sideways on a phone.
          <div key={key} className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-line">
                  {block.header.map((cell, cellIndex) => (
                    <th
                      key={`${key}-h-${cellIndex}`}
                      scope="col"
                      className="px-3 py-2.5 font-semibold text-textPrimary"
                    >
                      {renderInline(cell, `${key}-h-${cellIndex}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, rowIndex) => (
                  <tr key={`${key}-r-${rowIndex}`} className="border-b border-line/60">
                    {row.map((cell, cellIndex) => (
                      <td
                        key={`${key}-r-${rowIndex}-${cellIndex}`}
                        className="px-3 py-2.5 align-top leading-6 text-textSecondary"
                      >
                        {renderInline(cell, `${key}-r-${rowIndex}-${cellIndex}`)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'code':
        return (
          <pre
            key={key}
            className="mt-8 overflow-x-auto rounded-card border border-line bg-surface p-4 text-sm leading-6"
          >
            <code className="font-mono text-textPrimary">{block.lines.join('\n')}</code>
          </pre>
        );
      case 'rule':
        return <hr key={key} className="mt-10 border-line" />;
    }
  });
}

/**
 * Where an in-article slot should sit: the h2 nearest the middle of the piece.
 *
 * Splitting at a heading is what keeps an inserted block from landing between a
 * paragraph and the sentence that finishes its thought. Returns -1 when the
 * article is too short to interrupt — a three-paragraph post with an ad in the
 * middle is an ad with a post around it.
 *
 * The index refers to blocks, and `renderMarkdown` maps one node per block, so
 * it slices the rendered output directly.
 */
export function midArticleIndex(markdown: string, minBlocks = 8): number {
  const blocks = parseBlocks(markdown);
  if (blocks.length < minBlocks) return -1;

  const middle = Math.floor(blocks.length / 2);
  let best = -1;
  let bestDistance = Number.POSITIVE_INFINITY;
  blocks.forEach((block, index) => {
    // Never right at the top or the very end: both read as chrome, not as a
    // pause in the reading.
    if (block.kind !== 'heading' || block.level !== 2) return;
    if (index < 2 || index > blocks.length - 3) return;
    const distance = Math.abs(index - middle);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  });
  return best;
}

/** Every image referenced by a body, in order. Used for the Article schema. */
export function extractImages(markdown: string): { src: string; alt: string }[] {
  return parseBlocks(markdown)
    .filter((block): block is Extract<Block, { kind: 'image' }> => block.kind === 'image')
    .map((block) => ({ src: block.src, alt: block.alt }));
}

/**
 * Flatten Markdown to plain text — for meta descriptions, RSS summaries and the
 * `llms.txt` dump, where the markers would be noise.
 */
export function markdownToPlainText(markdown: string): string {
  return parseBlocks(markdown)
    .map((block) => {
      switch (block.kind) {
        case 'rule':
        case 'image':
        case 'code':
          return '';
        case 'list':
          return block.items.join(' ');
        case 'callout':
          return block.lines.join(' ');
        case 'table':
          return [block.header, ...block.rows].map((row) => row.join(' ')).join(' ');
        default:
          return block.text;
      }
    })
    .filter(Boolean)
    .join(' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)\s]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}
