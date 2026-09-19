import { supabase } from '@/integrations/supabase/client';

export const TUTOR_DOCUMENTS_BUCKET = 'tutor-documents';

export interface TutorDocument {
  type: string;
  name: string;
  url: string;
  uploaded_at?: string;
}

export const DOCUMENT_CATEGORIES: { id: string; label: string }[] = [
  { id: 'national_id', label: 'National ID / Passport' },
  { id: 'degree', label: 'Degree Certificate' },
  { id: 'transcript', label: 'Academic Transcript' },
  { id: 'practising_certificate', label: 'Practising Certificate' },
  { id: 'cv', label: 'CV / Résumé' },
  { id: 'other', label: 'Other Document' },
];

export const documentLabel = (type: string) =>
  DOCUMENT_CATEGORIES.find((c) => c.id === type)?.label ??
  type.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());

/** Turn a stored public/absolute URL (or raw path) into a storage object path. */
export const toStoragePath = (url: string): string => {
  if (!url) return '';
  const marker = `/${TUTOR_DOCUMENTS_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return url.replace(/^\/+/, '');
  return decodeURIComponent(url.slice(idx + marker.length).split('?')[0]);
};

/** Create a short-lived link so private documents can be viewed. */
export const getDocumentLink = async (url: string): Promise<string | null> => {
  if (!supabase) return null;
  const path = toStoragePath(url);
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(TUTOR_DOCUMENTS_BUCKET)
    .createSignedUrl(path, 60 * 10);
  if (error) {
    console.error('Signed URL error:', error);
    return null;
  }
  return data?.signedUrl ?? null;
};

export const parseDocuments = (value: unknown): TutorDocument[] => {
  if (!Array.isArray(value)) return [];
  return (value as TutorDocument[]).filter(
    (d) => d && typeof d === 'object' && typeof d.url === 'string'
  );
};
