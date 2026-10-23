"use client";

import React, { useRef, useState, useTransition } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { DateTime } from "luxon";
import {
  AdminBulletin,
  createBulletin,
  updateBulletin,
  setBulletinPublished,
  deleteBulletin,
} from "@/utilities/bulletings";
import { bulletinMarkdown } from "@/components/bulletings/bulletinMarkdown";

interface BulletinTableProps {
  bulletins: AdminBulletin[];
}

// Buttons and fields as on the flight log and billing pages
const primaryButton =
  "min-h-11 px-4 rounded-lg bg-sblue text-white font-medium hover:bg-sblued transition-colors disabled:opacity-60";
const secondaryButton =
  "min-h-11 px-4 rounded-lg border border-gray-300 bg-white text-gray-800 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50";
const rowButton =
  "min-h-11 px-3 rounded-lg border border-gray-300 bg-white text-sm text-gray-800 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50";
const rowPrimaryButton =
  "min-h-11 px-3 rounded-lg bg-sblue text-sm text-white font-medium hover:bg-sblued transition-colors disabled:opacity-60";
const rowDangerButton =
  "min-h-11 px-3 rounded-lg border border-red-300 bg-white text-sm text-red-700 font-medium hover:bg-red-50 transition-colors disabled:opacity-50";
const textField =
  "w-full min-h-11 rounded-lg border border-gray-300 bg-white px-3 text-base text-gray-900 disabled:bg-gray-50";

// ─── Markdown editor with toolbar ────────────────────────────────────────────

interface MarkdownEditorProps {
  id: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
  minRows?: number;
}

function MarkdownEditor({
  id,
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
    <div className="border border-gray-300 rounded-lg overflow-hidden">
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
              ? "bg-sblue text-white border-sblue"
              : "bg-white text-gray-600 border-gray-300 hover:bg-gray-100"
          }`}
        >
          {preview ? "Muokkaa" : "Esikatselu"}
        </button>
      </div>

      {/* Editor / Preview */}
      {preview ? (
        // As members will see it on the site
        <div className="min-h-[200px] px-6 py-4 bg-sblued text-swhite/90 text-base leading-relaxed">
          {value.trim() ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={bulletinMarkdown}>
              {value}
            </ReactMarkdown>
          ) : (
            <span className="text-swhite/60 italic">Ei sisältöä</span>
          )}
        </div>
      ) : (
        <textarea
          id={id}
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          rows={minRows}
          className="w-full px-3 py-2 text-base text-gray-900 bg-white resize-y focus:outline-none disabled:bg-gray-50 disabled:text-gray-500 font-mono"
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

  // Enter in the form saves a draft; publishing is a deliberate second button
  const handleCreate = (publish: boolean) => {
    setError(null);
    startTransition(async () => {
      const result = await createBulletin(newBulletin, publish);
      if (result.success) {
        showSuccess(publish ? "Tiedote julkaistu" : "Tiedote tallennettu luonnoksena");
        setShowCreateForm(false);
        setNewBulletin({ title: "", content: "" });
      } else {
        setError(result.error || "Tiedotteen luonti epäonnistui");
      }
    });
  };

  const handlePublish = (id: number, publish: boolean) => {
    setError(null);
    startTransition(async () => {
      const result = await setBulletinPublished(id, publish);
      if (result.success) {
        showSuccess(publish ? "Tiedote julkaistu" : "Tiedote palautettu luonnokseksi");
      } else {
        setError(result.error || "Julkaisun muutos epäonnistui");
      }
    });
  };

  const handleEdit = (bulletin: AdminBulletin) => {
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

  // Rendered on the server too, so the zone is explicit (the server runs in UTC)
  const formatDate = (iso: string) =>
    DateTime.fromISO(iso, { zone: "Europe/Helsinki" }).toFormat("d.M.yyyy");

  return (
    <div>
      {error && (
        <div
          role="alert"
          className="mx-4 sm:mx-6 mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-red-800 flex justify-between items-start"
        >
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            aria-label="Sulje"
            className="font-bold ml-4 flex-shrink-0"
          >
            &times;
          </button>
        </div>
      )}
      {success && (
        <div
          role="status"
          className="mx-4 sm:mx-6 mt-4 rounded-lg border border-green-300 bg-green-50 p-3 text-green-900"
        >
          {success}
        </div>
      )}

      {/* Create form */}
      <div className="mx-4 sm:mx-6 mt-4">
        {!showCreateForm ? (
          <button onClick={() => setShowCreateForm(true)} className={primaryButton}>
            + Luo uusi tiedote
          </button>
        ) : (
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">
              Luo uusi tiedote
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCreate(false);
              }}
              className="space-y-4"
            >
              <div>
                <label htmlFor="new-bulletin-title" className="block text-sm font-medium text-gray-700 mb-1">
                  Otsikko *
                </label>
                <input
                  id="new-bulletin-title"
                  type="text"
                  value={newBulletin.title}
                  onChange={(e) =>
                    setNewBulletin({ ...newBulletin, title: e.target.value })
                  }
                  className={textField}
                  required
                  disabled={isPending}
                  placeholder="Tiedotteen otsikko"
                />
              </div>
              <div>
                <label htmlFor="new-bulletin-content" className="block text-sm font-medium text-gray-700 mb-1">
                  Sisältö *
                </label>
                <MarkdownEditor
                  id="new-bulletin-content"
                  value={newBulletin.content}
                  onChange={(v) => setNewBulletin({ ...newBulletin, content: v })}
                  disabled={isPending}
                  placeholder="Kirjoita tiedotteen sisältö tähän..."
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="submit" disabled={isPending} className={secondaryButton}>
                  Tallenna luonnoksena
                </button>
                <button
                  type="button"
                  onClick={() => handleCreate(true)}
                  disabled={isPending}
                  className={primaryButton}
                >
                  Julkaise
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewBulletin({ title: "", content: "" });
                  }}
                  disabled={isPending}
                  className={secondaryButton}
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
          <div className="space-y-4 px-4 sm:px-6 pb-4 sm:pb-6">
            {bulletins.map((bulletin) => (
              <div
                key={bulletin.id}
                className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden"
              >
                {editingId === bulletin.id ? (
                  <div className="p-4 bg-gray-50">
                    <h4 className="text-md font-semibold mb-4 text-gray-900">
                      Muokkaa tiedotetta
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <label
                          htmlFor={`bulletin-${bulletin.id}-title`}
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          Otsikko
                        </label>
                        <input
                          id={`bulletin-${bulletin.id}-title`}
                          type="text"
                          value={editedBulletin.title}
                          onChange={(e) =>
                            setEditedBulletin({
                              ...editedBulletin,
                              title: e.target.value,
                            })
                          }
                          className={textField}
                          disabled={isPending}
                        />
                      </div>
                      <div>
                        <label
                          htmlFor={`bulletin-${bulletin.id}-content`}
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          Sisältö
                        </label>
                        <MarkdownEditor
                          id={`bulletin-${bulletin.id}-content`}
                          value={editedBulletin.content}
                          onChange={(v) =>
                            setEditedBulletin({ ...editedBulletin, content: v })
                          }
                          disabled={isPending}
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleUpdate(bulletin.id)}
                          disabled={isPending}
                          className={primaryButton}
                        >
                          {isPending ? "Tallennetaan..." : "Tallenna"}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          disabled={isPending}
                          className={secondaryButton}
                        >
                          Peruuta
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4">
                    {/* On a phone the actions go under the title */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 break-words">
                          {bulletin.title}
                        </h3>
                        <div className="text-sm text-gray-500 mt-1 flex flex-wrap items-center gap-2">
                          {bulletin.status === "published" ? (
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                              Julkaistu {bulletin.publishedAt && formatDate(bulletin.publishedAt)}
                            </span>
                          ) : (
                            <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-900">
                              Luonnos
                            </span>
                          )}
                          <span>Luotu {formatDate(bulletin.createdAt)}</span>
                          {bulletin.author && <span>• {bulletin.author}</span>}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 sm:justify-end sm:shrink-0">
                        <button
                          onClick={() => handlePublish(bulletin.id, bulletin.status !== "published")}
                          disabled={isPending}
                          className={bulletin.status === "published" ? rowButton : rowPrimaryButton}
                        >
                          {bulletin.status === "published" ? "Palauta luonnokseksi" : "Julkaise"}
                        </button>
                        <button
                          onClick={() => handleEdit(bulletin)}
                          disabled={isPending}
                          className={rowButton}
                        >
                          Muokkaa
                        </button>
                        <button
                          onClick={() => handleDelete(bulletin.id, bulletin.title)}
                          disabled={isPending}
                          className={rowDangerButton}
                        >
                          Poista
                        </button>
                      </div>
                    </div>
                    <div className="text-gray-700 mt-3 border-t border-gray-100 pt-3 text-sm leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1 [&_strong]:font-bold [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold [&_a]:text-sblue [&_a]:underline [&_p]:mb-2 [&_hr]:border-gray-300 [&_hr]:my-2">
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
