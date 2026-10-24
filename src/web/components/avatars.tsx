import { useState } from 'react';
import { cn } from 'cn';
import { BRAND_ICONS } from '../lib/brand-icons';

function luminance(hex: string): number {
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Brand icon bundled from simple-icons (no network); near-black or near-white brands use the text color. */
export function TechIcon({ name, className = 'size-4' }: { name: string; className?: string }) {
  const icon = BRAND_ICONS[name];
  if (!icon) {
    return (
      <span className={cn('inline-flex shrink-0 items-center justify-center rounded-[3px] bg-muted text-[9px] font-bold text-fg-2', className)} aria-hidden>
        {name.replace(/^\W+/, '').charAt(0).toUpperCase()}
      </span>
    );
  }
  const l = luminance(icon.hex);
  const fill = l < 0.03 || l > 0.9 ? 'currentColor' : `#${icon.hex}`;
  return (
    <svg data-brand={name} viewBox="0 0 24 24" className={cn('shrink-0', className)} aria-hidden>
      <path d={icon.path} fill={fill} />
    </svg>
  );
}

export function avatarUrl(email: string): string {
  const noreply = /^(\d+)\+[^@]+@users\.noreply\.github\.com$/i.exec(email);
  if (noreply) return `https://avatars.githubusercontent.com/u/${noreply[1]}?s=64`;
  return `https://avatars.githubusercontent.com/u/e?email=${encodeURIComponent(email)}&s=64`;
}

const COLORS = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)', 'var(--series-5)', 'var(--series-6)'];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '?') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/** Local initials by default; the GitHub photo only when the viewer opted in (it sends the e-mail to GitHub). */
export function Avatar({ name, email, remote, className = 'size-6' }: { name: string; email: string; remote: boolean; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (remote && email && !failed) {
    return (
      <img
        src={avatarUrl(email)}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={cn('shrink-0 rounded-full bg-muted ring-1 ring-border', className)}
      />
    );
  }
  let h = 0;
  for (const ch of email || name) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return (
    <span
      aria-hidden
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white', className)}
      style={{ background: COLORS[Math.abs(h) % COLORS.length] }}
    >
      {initials(name)}
    </span>
  );
}
