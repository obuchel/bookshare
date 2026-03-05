"use client";

import { useState, KeyboardEvent } from "react";
import { useLang } from "@/contexts/LangContext";

interface TagsFieldProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}

export default function TagsField({ tags, onChange }: TagsFieldProps) {
  const { t } = useLang();
  const [input, setInput] = useState("");

  const add = (raw: string) => {
    const tag = raw.trim().toLowerCase().replace(/\s+/g, "-");
    if (!tag || tags.includes(tag) || tags.length >= 10) return;
    onChange([...tags, tag]);
    setInput("");
  };

  const remove = (tag: string) => onChange(tags.filter(t => t !== tag));

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(input);
    } else if (e.key === "Backspace" && input === "" && tags.length > 0) {
      remove(tags[tags.length - 1]);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 p-3 border border-[var(--border)] rounded-xl bg-white min-h-[44px] focus-within:border-gold transition-colors">
        {tags.map(tag => (
          <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 bg-gold/15 text-brown text-xs font-medium rounded-full">
            #{tag}
            <button
              type="button"
              onClick={() => remove(tag)}
              className="text-brown/60 hover:text-brown ml-0.5 leading-none"
            >×</button>
          </span>
        ))}
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          onBlur={() => { if (input.trim()) add(input); }}
          placeholder={tags.length === 0 ? t.addBook.tagsPlaceholder : ""}
          className="flex-1 min-w-24 text-sm outline-none bg-transparent placeholder:text-muted"
        />
      </div>
      <p className="text-xs text-muted mt-1">{t.addBook.tagsHint}</p>
    </div>
  );
}
