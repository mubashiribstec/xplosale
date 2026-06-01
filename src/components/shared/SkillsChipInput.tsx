"use client";

import { useState, useRef } from "react";

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
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div
        className="min-h-[42px] flex flex-wrap gap-1.5 items-center px-3 py-2 border border-gray-300 rounded-lg cursor-text bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((term) => (
          <span
            key={term}
            className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 font-medium"
          >
            {term}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); remove(term); }}
              className="text-blue-400 hover:text-blue-700 leading-none"
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
          className="flex-1 min-w-[120px] text-sm outline-none bg-transparent"
          placeholder={value.length === 0 ? (placeholder ?? "Type and press Enter…") : ""}
        />
      </div>
      <p className="text-xs text-gray-400 mt-1">Press Enter or comma to add · Backspace to remove last</p>
    </div>
  );
}
