'use client';

import { useRef, useState } from 'react';

interface ResumeUploaderProps {
  onUpload: (key: string) => void;
  currentKey?: string;
}

const MAX_CLIENT_SIZE = 5 * 1024 * 1024;

export default function ResumeUploader({ onUpload, currentKey }: ResumeUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedKey, setUploadedKey] = useState<string | null>(currentKey ?? null);

  function displayName(key: string): string {
    const parts = key.split('/');
    return parts[parts.length - 1] ?? key;
  }

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_CLIENT_SIZE) {
      setError('File must be under 5 MB');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const form = new FormData();
      form.append('file', file);

      const res = await fetch('/api/upload/resume', { method: 'POST', body: form });
      const json = await res.json() as { ok: boolean; data?: { key: string }; error?: string };

      if (!res.ok || !json.ok || !json.data) {
        setError(json.error ?? 'Upload failed');
        return;
      }

      setUploadedKey(json.data.key);
      onUpload(json.data.key);
    } catch {
      setError('Upload failed. Please try again.');
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-700">Resume (PDF)</p>

      {uploadedKey && (
        <p className="text-xs text-gray-500 flex items-center gap-1">
          <span className="text-green-600">&#10003;</span>
          {displayName(uploadedKey)}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
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
        {loading ? 'Uploading…' : uploadedKey ? 'Replace resume' : 'Upload resume'}
      </button>

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
