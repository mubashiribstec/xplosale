"use client";

import { inputStyle } from "./formStyles";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

interface WorkingHoursEditorProps {
  value: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
}

export default function WorkingHoursEditor({ value, onChange }: WorkingHoursEditorProps) {
  function setDay(day: string, hours: string) {
    onChange({ ...value, [day]: hours });
  }

  function copyMondayToAll() {
    const monday = value["Monday"];
    if (!monday) return;
    const next: Record<string, string> = { ...value };
    for (const day of DAYS) next[day] = monday;
    onChange(next);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, fontFamily: "var(--body)" }}>
      {DAYS.map((day) => {
        const closed = value[day] === "Closed";
        return (
          <div key={day} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-soft)", width: 84, flexShrink: 0 }}>
              {day}
            </span>
            <input
              type="text"
              value={closed ? "" : (value[day] ?? "")}
              onChange={(e) => setDay(day, e.target.value)}
              placeholder="e.g. 9:00 AM – 9:00 PM"
              disabled={closed}
              maxLength={60}
              style={{ ...inputStyle, padding: "8px 12px", fontSize: 14, opacity: closed ? 0.4 : 1, flex: 1 }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--clay)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--line)")}
            />
            <label style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--ink-faint)", cursor: "pointer", flexShrink: 0 }}>
              <input
                type="checkbox"
                checked={closed}
                onChange={(e) => setDay(day, e.target.checked ? "Closed" : "")}
                style={{ accentColor: "var(--clay)" }}
              />
              Closed
            </label>
          </div>
        );
      })}
      <button
        type="button"
        onClick={copyMondayToAll}
        disabled={!value["Monday"]}
        style={{
          alignSelf: "flex-start",
          padding: "6px 14px",
          background: "transparent",
          border: "1px solid var(--line)",
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 600,
          fontFamily: "var(--body)",
          color: value["Monday"] ? "var(--ink-soft)" : "var(--ink-faint)",
          cursor: value["Monday"] ? "pointer" : "not-allowed",
          opacity: value["Monday"] ? 1 : 0.5,
        }}
      >
        Copy Monday to all days
      </button>
    </div>
  );
}
