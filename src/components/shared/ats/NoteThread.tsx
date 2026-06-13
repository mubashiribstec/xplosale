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
        <p className="text-xs" style={{ color: "var(--ink-faint)" }}>Loading notes…</p>
      ) : notes.length === 0 ? (
        <p className="text-xs" style={{ color: "var(--ink-faint)" }}>No notes yet. Add one below.</p>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div key={note.id} className="flex gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5"
                style={{ background: "rgba(50,122,214,.12)", color: "var(--blue)" }}
              >
                {(note.author.name ?? note.author.networkProfile?.handle ?? "?")[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-semibold" style={{ color: "var(--ink-soft)" }}>
                    {note.author.name ?? `@${note.author.networkProfile?.handle ?? "unknown"}`}
                  </span>
                  <span className="text-xs" style={{ color: "var(--ink-faint)" }}>
                    {new Date(note.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm mt-0.5 whitespace-pre-wrap" style={{ color: "var(--ink-soft)" }}>{note.body}</p>
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
          className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          style={{ borderColor: "var(--line)" }}
        />

        {autocomplete.length > 0 && (
          <div
            className="absolute bottom-full left-0 mb-1 border rounded-xl shadow-lg z-10 w-52 overflow-hidden"
            style={{ background: "var(--white)", borderColor: "var(--line)" }}
          >
            {autocomplete.slice(0, 6).map((m) => (
              <button
                key={m.id}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); selectMention(m); }}
                className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:opacity-80"
                style={{ color: "var(--ink)" }}
              >
                <span
                  className="w-5 h-5 rounded-full text-xs flex items-center justify-center font-semibold"
                  style={{ background: "rgba(50,122,214,.12)", color: "var(--blue)" }}
                >
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
            className="px-3 py-1.5 text-xs font-medium rounded-lg disabled:opacity-50 transition-colors"
            style={{ background: "var(--clay)", color: "var(--white)" }}
          >
            {submitting ? "Posting…" : "Post note"}
          </button>
        </div>
      </form>
    </div>
  );
}
