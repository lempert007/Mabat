import { ArrowUpRight } from 'lucide-react';
import type { LinkBlock } from '@/types/api';

const ALLOWED_PROTOCOLS = ['http:', 'https:', 'mailto:'];

/**
 * The address to open, or null when there is none worth opening. A bare `example.com` is read
 * as a website rather than a path inside this app, and anything that is not a web or mail link,
 * such as `javascript:`, is never rendered as one.
 */
function safeHref(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withScheme);
    return ALLOWED_PROTOCOLS.includes(parsed.protocol) ? parsed.href : null;
  } catch {
    return null;
  }
}

export function LinkBlockView({ block }: { block: LinkBlock }) {
  const href = safeHref(block.url);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-strong hover:underline focus-ring rounded"
    >
      {block.label || block.url}
      <ArrowUpRight size={14} />
    </a>
  );
}
