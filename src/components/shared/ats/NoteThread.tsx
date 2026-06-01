"use client";

import { useState, useRef, useEffect } from "react";

type TeamMember = {
  id: string;
  name: string | null;
  handle: string | null;
};

type Note = {
  id: string;
  body: string;
  createdAt: string;
  author: {
    id: string;
    name: string | null;
    networkProfile: { handle: string; profilePhotoUrl: string | null } | null;
  };
};

type NoteThreadProps = {
  applicationId: string;
  team: TeamMember[];
};

export default function NoteThread({ applicationId, team }: NoteThreadProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mentions, setMentions] = useState<string[]>([]);
  const [autocomplete, setAutocomplete] = useState<TeamMember[]>([]);
  const [acWord, setAcWord] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch(`/api/ats/notes/${applicationId}`)
      .then((r) => r.json())
      .then((d: { ok: boolean; data?: Note[] }) => {
        if (d.ok && d.data) setNotes(d.data);
      })
      .finally(() => setLoading(false));
  }, [applicationId]);

  function handleBodyChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setBody(val);

    // @mention autocomplete
    const cursor = e.target.selectionStart ?? val.length;
    const before = val.slice(0, cursor);
    const match = before.match(/@(\w*)$/);
    if (match) {
      const query = match[1].toLowerCase();
      setAcWord(match[0]);
      setAutocomplete(
        team.filter(
          (m) =>
            m.handle?.toLowerCase().includes(query) ||
            m.name?.toLowerCase().includes(query)
        )
      );
    } else {
      setAcWord("");
      setAutocomplete([]);
    }
  }

  function selectMention(member: TeamMember) {
    const handle = member.handle ?? member.name ?? member.id;
    const cursor = textareaRef.current?.selectionStart ?? body.length;
    const before = body.slice(0, cursor);
    const after = body.slice(cursor);
    const replaced = before.replace(/@(\w*)$/, `@${handle} `);
    setBody(replaced + after);
    setAutocomplete([]);
    setAcWord("");
    if (!mentions.includes(member.id)) {
      setMentions((prev) => [...prev, member.id]);
    }
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);

    const res = await fetch(`/api/ats/notes/${applicationId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, mentions }),
    });

    const json = (await res.json()) as { ok: boolean; data?: Note };
    setSubmitting(false);
    if (res.ok && json.data) {
      setNotes((prev) => [...prev, json.data!]);
      setBody("");
      setMentions([]);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {loading ? (
        <p className="text-xs text-gray-400">Loading notes…</p>
      ) : notes.length === 0 ? (
        <p className="text-xs text-gray-400">No notes yet. Add one below.</p>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div key={note.id} className="flex gap-2">
              <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5">
                {(note.author.name ?? note.author.networkProfile?.handle ?? "?")[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-semibold text-gray-800">
                    {note.author.name ?? `@${note.author.networkProfile?.handle ?? "unknown"}`}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(note.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap">{note.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={(e) => void submit(e)} className="relative">
        <textarea
          ref={textareaRef}
          value={body}
          onChange={handleBodyChange}
          placeholder={`Add a note… type @ to mention a team member`}
          rows={3}
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />

        {autocomplete.length > 0 && (
          <div className="absolute bottom-full left-0 mb-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 w-52 overflow-hidden">
            {autocomplete.slice(0, 6).map((m) => (
              <button
                key={m.id}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); selectMention(m); }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center gap-2"
              >
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-semibold">
                  {(m.name ?? m.handle ?? "?")[0].toUpperCase()}
                </span>
                <span className="truncate">{m.name ?? `@${m.handle}`}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex justify-end mt-1.5">
          <button
            type="submit"
            disabled={submitting || !body.trim()}
            className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? "Posting…" : "Post note"}
          </button>
        </div>
      </form>
    </div>
  );
}
