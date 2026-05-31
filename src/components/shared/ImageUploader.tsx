'use client';

import { useRef, useState } from 'react';

interface ImageUploaderProps {
  purpose: 'profile_photo' | 'banner' | 'listing_image';
  listingId?: string;
  onUpload: (result: { key: string; url: string; width: number; height: number }) => void;
  label?: string;
  currentUrl?: string;
}

const MAX_CLIENT_SIZE = 10 * 1024 * 1024;

export default function ImageUploader({ purpose, listingId, onUpload, label, currentUrl }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl ?? null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_CLIENT_SIZE) {
      setError('File must be under 10 MB');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const form = new FormData();
      form.append('file', file);

      const qs = new URLSearchParams({ purpose });
      if (listingId) qs.set('listingId', listingId);

      const res = await fetch(`/api/upload/image?${qs.toString()}`, {
        method: 'POST',
        body: form,
      });
      const json = await res.json() as { ok: boolean; data?: { key: string; url: string; width: number; height: number }; error?: string };

      if (!res.ok || !json.ok || !json.data) {
        setError(json.error ?? 'Upload failed');
        return;
      }

      setPreviewUrl(json.data.url);
      onUpload(json.data);
    } catch {
      setError('Upload failed. Please try again.');
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-2">
      {label && <p className="text-sm font-medium text-gray-700">{label}</p>}

      {previewUrl && (
        <div className="relative inline-block">
          <img
            src={previewUrl}
            alt="Preview"
            className="rounded-lg object-cover border border-gray-200"
            style={{ maxWidth: purpose === 'banner' ? 240 : 96, maxHeight: purpose === 'banner' ? 80 : 96 }}
          />
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleChange}
        disabled={loading}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Uploading…' : previewUrl ? 'Change image' : 'Upload image'}
      </button>

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
