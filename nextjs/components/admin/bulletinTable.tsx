"use client";

import React, { useRef, useState, useTransition } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Bulletin,
  createBulletin,
  updateBulletin,
  deleteBulletin,
} from "@/utilities/bulletings";

interface BulletinTableProps {
  bulletins: Bulletin[];
}

// ─── Markdown editor with toolbar ────────────────────────────────────────────

interface MarkdownEditorProps {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
  minRows?: number;
}

function MarkdownEditor({
  value,
  onChange,
  disabled,
  placeholder,
  minRows = 8,
}: MarkdownEditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(false);

  const wrap = (before: string, after: string, fallback: string) => {
    const ta = ref.current;
    if (!ta) return;
    const s = ta.selectionStart;
    const e = ta.selectionEnd;
    const sel = value.slice(s, e) || fallback;
    const next = value.slice(0, s) + before + sel + after + value.slice(e);
    onChange(next);
    setTimeout(() => {
      ta.focus();
      const cur = s + before.length + sel.length + after.length;
      ta.setSelectionRange(cur, cur);
    }, 0);
  };

  const prependLine = (prefix: string) => {
    const ta = ref.current;
    if (!ta) return;
    const s = ta.selectionStart;
    const lineStart = value.lastIndexOf("\n", s - 1) + 1;
    // Toggle: if line already starts with prefix, remove it
    if (value.slice(lineStart).startsWith(prefix)) {
      const next = value.slice(0, lineStart) + value.slice(lineStart + prefix.length);
      onChange(next);
    } else {
      const next = value.slice(0, lineStart) + prefix + value.slice(lineStart);
      onChange(next);
    }
    setTimeout(() => ta.focus(), 0);
  };

  const insertHr = () => {
    const ta = ref.current;
    if (!ta) return;
    const s = ta.selectionStart;
    const pre = value.slice(0, s);
    const needsNewline = pre.length > 0 && !pre.endsWith("\n");
    const insert = (needsNewline ? "\n" : "") + "---\n";
    onChange(pre + insert + value.slice(s));
    setTimeout(() => ta.focus(), 0);
  };

  const btnClass =
    "px-2 py-1 text-sm rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed font-mono text-gray-700 transition-colors";
  const dividerClass = "w-px h-5 bg-gray-300 mx-1";

  return (
    <div className="border border-gray-300 rounded-md overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center flex-wrap gap-0.5 bg-gray-50 px-2 py-1.5 border-b border-gray-300">
        <button
          type="button"
          title="Lihavointi"
          disabled={disabled || preview}
          onClick={() => wrap("**", "**", "lihavoitu teksti")}
          className={`${btnClass} font-bold`}
        >
          B
        </button>
        <button
          type="button"
          title="Kursivointi"
          disabled={disabled || preview}
          onClick={() => wrap("*", "*", "kursivoitu teksti")}
          className={`${btnClass} italic`}
        >
          I
        </button>

        <div className={dividerClass} />

        <button
          type="button"
          title="Otsikko (H2)"
          disabled={disabled || preview}
          onClick={() => prependLine("## ")}
          className={btnClass}
        >
          H2
        </button>
        <button
          type="button"
          title="Alaotsikko (H3)"
          disabled={disabled || preview}
          onClick={() => prependLine("### ")}
          className={btnClass}
        >
          H3
        </button>

        <div className={dividerClass} />

        <button
          type="button"
          title="Luettelomerkki"
          disabled={disabled || preview}
          onClick={() => prependLine("- ")}
          className={btnClass}
        >
          •≡
        </button>
        <button
          type="button"
          title="Numeroitu lista"
          disabled={disabled || preview}
          onClick={() => prependLine("1. ")}
          className={btnClass}
        >
          1.
        </button>

        <div className={dividerClass} />

        <button
          type="button"
          title="Vaakaviiva"
          disabled={disabled || preview}
          onClick={insertHr}
          className={btnClass}
        >
          —
        </button>
        <button
          type="button"
          title="Linkki"
          disabled={disabled || preview}
          onClick={() => wrap("[", "](https://)", "linkin teksti")}
          className={btnClass}
        >
          🔗
        </button>

        <div className="flex-1" />

        <button
          type="button"
          onClick={() => setPreview((p) => !p)}
          disabled={disabled}
          className={`px-3 py-1 text-sm rounded border transition-colors ${
            preview
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white text-gray-600 border-gray-300 hover:bg-gray-100"
          }`}
        >
          {preview ? "Muokkaa" : "Esikatselu"}
        </button>
      </div>

      {/* Editor / Preview */}
      {preview ? (
        <div className="min-h-[200px] px-3 py-2 bg-white text-gray-900 text-sm leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1 [&_strong]:font-bold [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1 [&_hr]:border-gray-300 [&_hr]:my-3 [&_a]:text-blue-600 [&_a]:underline [&_p]:mb-2 [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-gray-600">
          {value.trim() ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
          ) : (
            <span className="text-gray-400 italic">Ei sisältöä</span>
          )}
        </div>
      ) : (
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          rows={minRows}
          className="w-full px-3 py-2 text-sm text-gray-900 bg-white resize-y focus:outline-none disabled:bg-gray-50 disabled:text-gray-500 font-mono"
        />
      )}

      <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-200 text-xs text-gray-400">
        Tukee Markdown-muotoilua · **lihavoitu** · *kursiivi* · ## Otsikko · - Lista
      </div>
    </div>
  );
}

// ─── Main admin table ─────────────────────────────────────────────────────────

const BulletinTable = ({ bulletins }: BulletinTableProps) => {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [newBulletin, setNewBulletin] = useState({ title: "", content: "" });
  const [editedBulletin, setEditedBulletin] = useState({ title: "", content: "" });

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createBulletin(newBulletin);
      if (result.success) {
        showSuccess("Tiedote luotu onnistuneesti");
        setShowCreateForm(false);
        setNewBulletin({ title: "", content: "" });
      } else {
        setError(result.error || "Tiedotteen luonti epäonnistui");
      }
    });
  };

  const handleEdit = (bulletin: Bulletin) => {
    setEditingId(bulletin.id);
    setEditedBulletin({ title: bulletin.title, content: bulletin.content });
    setError(null);
    setSuccess(null);
  };

  const handleUpdate = (id: number) => {
    setError(null);
    startTransition(async () => {
      const result = await updateBulletin(id, editedBulletin);
      if (result.success) {
        showSuccess("Tiedote päivitetty onnistuneesti");
        setEditingId(null);
      } else {
        setError(result.error || "Tiedotteen päivitys epäonnistui");
      }
    });
  };

  const handleDelete = (id: number, title: string) => {
    if (!confirm(`Haluatko varmasti poistaa tiedotteen "${title}"?`)) return;
    startTransition(async () => {
      const result = await deleteBulletin(id);
      if (result.success) {
        showSuccess("Tiedote poistettu onnistuneesti");
      } else {
        setError(result.error || "Tiedotteen poisto epäonnistui");
      }
    });
  };

  const formatDate = (timestamp: number) =>
    new Date(timestamp * 1000).toLocaleDateString("fi-FI", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  return (
    <div>
      {error && (
        <div className="mx-6 mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex justify-between items-start">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="font-bold ml-4 flex-shrink-0">
            &times;
          </button>
        </div>
      )}
      {success && (
        <div className="mx-6 mt-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {/* Create form */}
      <div className="mx-6 mt-4">
        {!showCreateForm ? (
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            + Luo uusi tiedote
          </button>
        ) : (
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">
              Luo uusi tiedote
            </h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Otsikko *
                </label>
                <input
                  type="text"
                  value={newBulletin.title}
                  onChange={(e) =>
                    setNewBulletin({ ...newBulletin, title: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={isPending}
                  placeholder="Tiedotteen otsikko"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sisältö *
                </label>
                <MarkdownEditor
                  value={newBulletin.content}
                  onChange={(v) => setNewBulletin({ ...newBulletin, content: v })}
                  disabled={isPending}
                  placeholder="Kirjoita tiedotteen sisältö tähän..."
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                >
                  {isPending ? "Luodaan..." : "Luo tiedote"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewBulletin({ title: "", content: "" });
                  }}
                  disabled={isPending}
                  className="bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400 disabled:bg-gray-200 transition-colors"
                >
                  Peruuta
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Bulletins list */}
      <div className="mt-6">
        {bulletins.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Ei tiedotteita. Luo ensimmäinen tiedote yllä olevalla painikkeella.
          </div>
        ) : (
          <div className="space-y-4 px-6">
            {bulletins.map((bulletin) => (
              <div
                key={bulletin.id}
                className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden"
              >
                {editingId === bulletin.id ? (
                  <div className="p-4 bg-blue-50">
                    <h4 className="text-md font-semibold mb-4 text-gray-900">
                      Muokkaa tiedotetta
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Otsikko
                        </label>
                        <input
                          type="text"
                          value={editedBulletin.title}
                          onChange={(e) =>
                            setEditedBulletin({
                              ...editedBulletin,
                              title: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={isPending}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Sisältö
                        </label>
                        <MarkdownEditor
                          value={editedBulletin.content}
                          onChange={(v) =>
                            setEditedBulletin({ ...editedBulletin, content: v })
                          }
                          disabled={isPending}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdate(bulletin.id)}
                          disabled={isPending}
                          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                        >
                          {isPending ? "Tallennetaan..." : "Tallenna"}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          disabled={isPending}
                          className="bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400 disabled:bg-gray-200 transition-colors"
                        >
                          Peruuta
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {bulletin.title}
                        </h3>
                        <div className="text-sm text-gray-500 mt-1">
                          <span>{formatDate(bulletin.date)}</span>
                          {bulletin.username && (
                            <span className="ml-2">• {bulletin.username}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-3 flex-shrink-0 ml-4">
                        <button
                          onClick={() => handleEdit(bulletin)}
                          disabled={isPending}
                          className="text-blue-600 hover:text-blue-900 disabled:text-gray-400 text-sm font-medium"
                        >
                          Muokkaa
                        </button>
                        <button
                          onClick={() => handleDelete(bulletin.id, bulletin.title)}
                          disabled={isPending}
                          className="text-red-600 hover:text-red-900 disabled:text-gray-400 text-sm font-medium"
                        >
                          Poista
                        </button>
                      </div>
                    </div>
                    <div className="text-gray-700 mt-3 border-t border-gray-100 pt-3 text-sm leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1 [&_strong]:font-bold [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold [&_a]:text-blue-600 [&_a]:underline [&_p]:mb-2 [&_hr]:border-gray-300 [&_hr]:my-2">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {bulletin.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BulletinTable;
