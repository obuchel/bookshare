"use client";

import { useLang } from "@/contexts/LangContext";

export type Contributor = {
  id: string;
  name: string;
  role: string;
  position: number;
};

const ROLES = ["author", "editor", "translator", "illustrator", "compiler"] as const;

interface Props {
  contributors: Contributor[];
  onChange: (contributors: Contributor[]) => void;
}

export default function ContributorsField({ contributors, onChange }: Props) {
  const { t } = useLang();

  const add = () => {
    onChange([
      ...contributors,
      { id: crypto.randomUUID(), name: "", role: "author", position: contributors.length + 1 },
    ]);
  };

  const update = (id: string, field: keyof Contributor, value: string | number) => {
    onChange(contributors.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const remove = (id: string) => {
    onChange(
      contributors
        .filter(c => c.id !== id)
        .map((c, i) => ({ ...c, position: i + 1 }))
    );
  };

  return (
    <div className="space-y-2">
      {contributors.map((c, idx) => (
        <div key={c.id} className="flex gap-2 items-center">
          <span className="text-xs text-muted w-4 shrink-0">{idx + 1}.</span>
          <input
            value={c.name}
            onChange={e => update(c.id, "name", e.target.value)}
            placeholder={t.addBook.contributorName}
            className="flex-1 px-3 py-2 border border-[var(--border)] rounded-xl text-sm focus:border-gold transition-colors"
          />
          <select
            value={c.role}
            onChange={e => update(c.id, "role", e.target.value)}
            className="px-3 py-2 border border-[var(--border)] rounded-xl text-sm focus:border-gold transition-colors bg-white shrink-0"
          >
            {ROLES.map(r => (
              <option key={r} value={r}>
                {t.addBook.roles[r]}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => remove(c.id)}
            className="text-rust hover:text-red-700 text-lg leading-none shrink-0 px-1"
            title="Remove"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="text-sm text-brown hover:text-ink border border-dashed border-[var(--border)] rounded-xl px-4 py-2 w-full hover:bg-cream transition-colors"
      >
        + {t.addBook.addContributor}
      </button>
    </div>
  );
}
