import * as Io5 from 'react-icons/io5';
import type { IconType } from 'react-icons';

/**
 * Drop-in replacement for `@expo/vector-icons`'s `Ionicons`, aliased in vite.config.ts.
 * react-icons/io5 is generated from the same Ionicons v5 glyph set, so a kebab-case
 * Ionicons name ("chevron-back", "close-circle-outline") maps 1:1 onto its PascalCase
 * "Io"-prefixed export ("IoChevronBack", "IoCloseCircleOutline") — no glyph-map needed,
 * just a name transform. This avoids depending on font-file loading for icons entirely.
 */
export interface IoniconsProps {
  name: string;
  size?: number;
  color?: string;
  style?: React.CSSProperties;
}

const cache = new Map<string, IconType | null>();

function resolveIcon(name: string): IconType | null {
  if (cache.has(name)) return cache.get(name)!;
  const exportName = `Io${name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')}`;
  const Icon = (Io5 as unknown as Record<string, IconType | undefined>)[exportName] ?? null;
  if (!Icon) console.warn(`[Ionicons shim] no react-icons/io5 export "${exportName}" for name "${name}"`);
  cache.set(name, Icon);
  return Icon;
}

export function Ionicons({ name, size = 24, color = 'currentColor', style }: IoniconsProps) {
  const Icon = resolveIcon(name);
  if (!Icon) return null;
  return <Icon size={size} color={color} style={style} />;
}

/**
 * The real @expo/vector-icons ships a `glyphMap` so call sites can type icon names as
 * `keyof typeof Ionicons.glyphMap`. This shim has no fixed glyph list (any Ionicons v5
 * name resolves dynamically via react-icons/io5), so that type collapses to `string`
 * — same as this component's actual `name` prop — without narrowing every call site.
 */
Ionicons.glyphMap = {} as Record<string, number>;

