"use client";

import { useState, useRef } from "react";
import { labelStyle, labelTextStyle } from "@/components/shared/shops/formStyles";

interface SkillsChipInputProps {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  className?: string;
}

export default function SkillsChipInput({ label, value, onChange, placeholder, className }: SkillsChipInputProps) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function add() {
    const term = input.trim();
    if (!term || value.includes(term) || value.length >= 30) return;
    onChange([...value, term]);
    setInput("");
  }

  function remove(term: string) {
    onChange(value.filter((v) => v !== term));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add();
    } else if (e.key === "Backspace" && !input && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <label className={className} style={labelStyle}>
      <span style={labelTextStyle}>{label}</span>
      <div
        style={{
          minHeight: 42,
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          alignItems: "center",
          padding: "8px 12px",
          border: "1.5px solid var(--line)",
          borderRadius: 11,
          cursor: "text",
          background: "var(--paper)",
        }}
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((term) => (
          <span
            key={term}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 12,
              fontWeight: 500,
              background: "rgba(50,122,214,.12)",
              color: "var(--blue)",
              borderRadius: 99,
              padding: "2px 8px",
            }}
          >
            {term}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); remove(term); }}
              style={{ color: "var(--blue)", lineHeight: 1, background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 13 }}
              aria-label={`Remove ${term}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={add}
          style={{
            flex: 1,
            minWidth: 120,
            fontSize: 14,
            outline: "none",
            background: "transparent",
            border: "none",
            color: "var(--ink)",
            fontFamily: "var(--body)",
          }}
          placeholder={value.length === 0 ? (placeholder ?? "Type and press Enter…") : ""}
        />
      </div>
      <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>Press Enter or comma to add · Backspace to remove last</span>
    </label>
  );
}
