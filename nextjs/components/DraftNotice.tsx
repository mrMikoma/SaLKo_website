/**
 * Above a form that useDraft() filled in from the tab's storage: says so,
 * and lets the draft go
 */
export default function DraftNotice({ onDiscard }: { onDiscard: () => void }) {
  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-sbluel/40 bg-sbluel/10 px-4 py-3 text-sm text-gray-900"
    >
      <span>Palautettiin tallentamaton luonnos. Tallenna se, kun se on valmis.</span>
      <button
        type="button"
        onClick={onDiscard}
        className="min-h-11 px-3 rounded-lg border border-gray-300 bg-white font-medium text-gray-800 hover:bg-gray-50"
      >
        Hylkää luonnos
      </button>
    </div>
  );
}
