import type { ComponentType } from 'react';

import type { IconName } from '../components/Icon';
import type { Row } from '../lib/db';
import type { MediaKind } from '../lib/media';

export type FieldType =
  | 'text'
  | 'textarea'
  | 'richtext'
  | 'number'
  | 'select'
  | 'multiselect'
  | 'boolean'
  | 'date'
  | 'emoji'
  | 'json'
  | 'image'
  | 'audio'
  | 'media'
  | 'star'
  | 'category'
  | 'character'
  | 'story'
  | 'language';

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  /** Stored per language: default-language text lives in the row, other languages in content_translations. */
  translatable?: boolean;
  help?: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  rows?: number;
  /** For media fields. */
  kinds?: MediaKind[];
  folder?: string;
  /** Empty input is saved as NULL (numbers, dates, optional selects). */
  nullable?: boolean;
  readOnly?: boolean;
  /** Text that is always right-to-left (e.g. Arabic script). */
  rtl?: boolean;
  /** Where the field appears in the editor. */
  group?: 'content' | 'media' | 'details';
  /** Category picker only lists categories that include this scope. */
  categoryScope?: string;
  default?: unknown;
  showWhen?: (values: Row) => boolean;
}

export interface ColumnDef {
  key: string;
  header: string;
  kind: 'title' | 'text' | 'star' | 'category' | 'status' | 'date' | 'updated' | 'number' | 'badge' | 'image' | 'audio' | 'yesno' | 'language' | 'toggle' | 'audio-meta';
  field?: string;
  width?: string;
}

export interface FilterSpec {
  key: string;
  label: string;
  column: string;
  /** 'star' and 'category' fill their options from the lookups. */
  options?: { value: string; label: string }[] | 'star' | 'category' | 'language';
}

export type PreviewKind = 'story' | 'dua' | 'game' | 'daily' | 'quiz' | 'deed' | 'reflection' | 'wisdom' | 'star' | 'character' | 'audio' | 'generic';

export interface ExtrasProps {
  /** The saved record's id (extras only render once the record exists). */
  id: string;
  values: Row;
  reload: () => void;
}

export interface ResourceDef {
  /** URL segment: /admin/<key> */
  key: string;
  table: string;
  /** Polymorphic key used in content_translations (omit when nothing is translatable). */
  translationType?: string;
  label: { singular: string; plural: string };
  icon: IconName;
  description: string;
  titleField: string;
  /** When set, a unique slug is generated from the title on create. */
  slugField?: string;
  /** Uses the draft/published/unpublished lifecycle. */
  hasStatus: boolean;
  /** For tables without status: a boolean column toggled from the list (e.g. is_enabled). */
  toggleField?: string;
  /** Show move up/down controls (display_order). */
  orderable?: boolean;
  /** No add / delete (e.g. the fixed set of 14 Stars). */
  fixedSet?: boolean;
  fields: FieldDef[];
  columns: ColumnDef[];
  filters: FilterSpec[];
  searchFields: string[];
  defaults?: Row;
  preview: PreviewKind;
  categoryScope?: string;
  defaultSort?: 'newest' | 'oldest' | 'az' | 'order';
  /** Components rendered under the form once the record exists (scenes, questions, …). */
  extras?: { key: string; title: string; component: ComponentType<ExtrasProps> }[];
  /** For audio: copy the chosen file's duration (and default the name) from the media library. */
  syncFromMedia?: { field: string; durationField?: string; nameField?: string };
}
