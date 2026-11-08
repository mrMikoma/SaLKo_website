"use client";

import React, { useMemo, useRef, useState, useTransition } from "react";
import ReactMarkdown from "react-markdown";
import { DateTime } from "luxon";
import {
  AdminBulletin,
  createBulletin,
  updateBulletin,
  setBulletinPublished,
  deleteBulletin,
} from "@/utilities/bulletings";
import { bulletinMarkdown, bulletinRemarkPlugins } from "@/components/bulletings/bulletinMarkdown";
import {
  continueList,
  insertLink,
  insertRule,
  LineStyle,
  TextEdit,
  toggleLineStyle,
  toggleWrap,
} from "@/utilities/markdownEdit";
import { callAction } from "@/utilities/callAction";
import { useDraft } from "@/hooks/useDraft";
import DraftNotice from "@/components/DraftNotice";

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

function ToolButton({
  label,
  disabled,
  onClick,
  className = "",
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      // Keeps the text selected while the button is pressed
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`px-2 py-1 text-sm rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed font-mono text-gray-700 transition-colors ${className}`}
    >
      {children}
    </button>
  );
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

  // Applies an edit as if typed, so the browser's undo (Ctrl+Z) still works;
  // setting the value from React would clear its history
  const apply = (edit: TextEdit | null) => {
    const ta = ref.current;
    if (!ta || !edit) return;
    ta.focus();
    ta.setSelectionRange(edit.from, edit.to);
    let done = true;
    if (edit.insert) done = document.execCommand("insertText", false, edit.insert);
    else if (edit.from !== edit.to) done = document.execCommand("delete");
    if (!done) {
      onChange(ta.value.slice(0, edit.from) + edit.insert + ta.value.slice(edit.to));
    }
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(edit.selectStart, edit.selectEnd);
    }, 0);
  };
  const selection = (): [string, number, number] | null => {
    const ta = ref.current;
    return ta ? [ta.value, ta.selectionStart, ta.selectionEnd] : null;
  };
  const lineStyle = (style: LineStyle) => {
    const at = selection();
    if (at) apply(toggleLineStyle(...at, style));
  };
  const wrap = (marker: string, placeholderText: string) => {
    const at = selection();
    if (at) apply(toggleWrap(...at, marker, placeholderText));
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = e.currentTarget;
    const shortcut = (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey;
    if (shortcut && e.key.toLowerCase() === "b") {
      e.preventDefault();
      wrap("**", "lihavoitu teksti");
    } else if (shortcut && e.key.toLowerCase() === "i") {
      e.preventDefault();
      wrap("*", "kursivoitu teksti");
    } else if (
      e.key === "Enter" &&
      !e.shiftKey &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey &&
      !e.nativeEvent.isComposing &&
      ta.selectionStart === ta.selectionEnd
    ) {
      const edit = continueList(ta.value, ta.selectionStart);
      if (edit) {
        e.preventDefault();
        apply(edit);
      }
    }
  };

  const dividerClass = "w-px h-5 bg-gray-300 mx-1";
  const off = disabled || preview;

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center flex-wrap gap-0.5 bg-gray-50 px-2 py-1.5 border-b border-gray-300">
        <ToolButton label="Lihavointi (Ctrl+B)" disabled={off} onClick={() => wrap("**", "lihavoitu teksti")} className="font-bold">
          B
        </ToolButton>
        <ToolButton label="Kursivointi (Ctrl+I)" disabled={off} onClick={() => wrap("*", "kursivoitu teksti")} className="italic">
          I
        </ToolButton>

        <div className={dividerClass} />

        <ToolButton label="Otsikko (H2)" disabled={off} onClick={() => lineStyle("h2")}>
          H2
        </ToolButton>
        <ToolButton label="Alaotsikko (H3)" disabled={off} onClick={() => lineStyle("h3")}>
          H3
        </ToolButton>

        <div className={dividerClass} />

        <ToolButton label="Luettelo valituista riveistä" disabled={off} onClick={() => lineStyle("bullet")}>
          •≡
        </ToolButton>
        <ToolButton label="Numeroitu lista valituista riveistä" disabled={off} onClick={() => lineStyle("numbered")}>
          1.
        </ToolButton>

        <div className={dividerClass} />

        <ToolButton
          label="Vaakaviiva"
          disabled={off}
          onClick={() => {
            const at = selection();
            if (at) apply(insertRule(at[0], at[1]));
          }}
        >
          —
        </ToolButton>
        <ToolButton
          label="Linkki"
          disabled={off}
          onClick={() => {
            const at = selection();
            if (at) apply(insertLink(...at));
          }}
        >
          🔗
        </ToolButton>

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
        <div className="min-h-[200px] px-6 py-4 bg-sblued text-swhite/90 text-base leading-relaxed [overflow-wrap:anywhere]">
          {value.trim() ? (
            <ReactMarkdown remarkPlugins={bulletinRemarkPlugins} components={bulletinMarkdown}>
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
          onKeyDown={onKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          rows={minRows}
          className="w-full px-3 py-2 text-base text-gray-900 bg-white resize-y focus:outline-none disabled:bg-gray-50 disabled:text-gray-500 font-mono"
        />
      )}

      <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
        Valitse rivit ja paina •≡ tai 1., niin niistä tulee lista. Enter jatkaa listaa,
        tyhjällä rivillä lista päättyy. Rivinvaihdot näkyvät tiedotteessa sellaisinaan.
      </div>
    </div>
  );
}

// ─── Main admin table ─────────────────────────────────────────────────────────

const NO_TEXT = { title: "", content: "" };
const NO_EDIT = { id: null as number | null, title: "", content: "" };

const BulletinTable = ({ bulletins }: BulletinTableProps) => {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [newBulletin, setNewBulletin] = useState({ title: "", content: "" });
  const [editedBulletin, setEditedBulletin] = useState({ title: "", content: "" });

  // What's being written survives a reload or a crash, in this tab only
  const newDraft = useDraft(
    "tiedote-uusi",
    showCreateForm ? newBulletin : NO_TEXT,
    (draft) => {
      setNewBulletin(draft);
      setShowCreateForm(true);
    },
    (draft) => !draft.title.trim() && !draft.content.trim()
  );
  const editValue = useMemo(
    () => (editingId === null ? NO_EDIT : { id: editingId, ...editedBulletin }),
    [editingId, editedBulletin]
  );
  const editDraft = useDraft(
    "tiedote-muokkaus",
    editValue,
    (draft) => {
      if (!bulletins.some((bulletin) => bulletin.id === draft.id)) return;
      setEditingId(draft.id);
      setEditedBulletin({ title: draft.title, content: draft.content });
    },
    // Nothing to keep while the text is as saved
    (draft) =>
      draft.id === null ||
      bulletins.some((b) => b.id === draft.id && b.title === draft.title && b.content === draft.content)
  );

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  };

  // Enter in the form saves a draft; publishing is a deliberate second button
  const handleCreate = (publish: boolean) => {
    setError(null);
    startTransition(async () => {
      const result = await callAction(() => createBulletin(newBulletin, publish));
      if (result.status === "success") {
        showSuccess(publish ? "Tiedote julkaistu" : "Tiedote tallennettu luonnoksena");
        newDraft.clear();
        setShowCreateForm(false);
        setNewBulletin({ title: "", content: "" });
      } else {
        setError(result.error);
      }
    });
  };

  const handlePublish = (id: number, publish: boolean) => {
    setError(null);
    startTransition(async () => {
      const result = await callAction(() => setBulletinPublished(id, publish));
      if (result.status === "success") {
        showSuccess(publish ? "Tiedote julkaistu" : "Tiedote palautettu luonnokseksi");
      } else {
        setError(result.error);
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
      const result = await callAction(() => updateBulletin(id, editedBulletin));
      if (result.status === "success") {
        showSuccess("Tiedote päivitetty onnistuneesti");
        editDraft.clear();
        setEditingId(null);
      } else {
        setError(result.error);
      }
    });
  };

  const handleDelete = (id: number, title: string) => {
    if (!confirm(`Haluatko varmasti poistaa tiedotteen "${title}"?`)) return;
    startTransition(async () => {
      const result = await callAction(() => deleteBulletin(id));
      if (result.status === "success") {
        showSuccess("Tiedote poistettu onnistuneesti");
      } else {
        setError(result.error);
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
            {newDraft.restored && (
              <div className="mb-4">
                <DraftNotice
                  onDiscard={() => {
                    newDraft.clear();
                    setNewBulletin({ title: "", content: "" });
                    setShowCreateForm(false);
                  }}
                />
              </div>
            )}
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
                    {editDraft.restored && (
                      <div className="mb-4">
                        <DraftNotice
                          onDiscard={() => {
                            editDraft.clear();
                            setEditingId(null);
                          }}
                        />
                      </div>
                    )}
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
                    <div className="text-gray-700 mt-3 border-t border-gray-100 pt-3 text-sm leading-relaxed [overflow-wrap:anywhere] [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1 [&_strong]:font-bold [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold [&_a]:text-sblue [&_a]:underline [&_p]:mb-2 [&_hr]:border-gray-300 [&_hr]:my-2">
                      <ReactMarkdown remarkPlugins={bulletinRemarkPlugins}>
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
