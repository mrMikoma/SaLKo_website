"use client";

import React, { useState, useTransition } from "react";
import {
  Bulletin,
  createBulletin,
  updateBulletin,
  deleteBulletin,
} from "@/utilities/bulletings";

interface BulletinTableProps {
  bulletins: Bulletin[];
}

const BulletinTable = ({ bulletins }: BulletinTableProps) => {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // New bulletin form state
  const [newBulletin, setNewBulletin] = useState({
    title: "",
    content: "",
  });

  // Edit bulletin state
  const [editedBulletin, setEditedBulletin] = useState({
    title: "",
    content: "",
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await createBulletin(newBulletin);
      if (result.success) {
        setSuccess("Tiedote luotu onnistuneesti");
        setShowCreateForm(false);
        setNewBulletin({ title: "", content: "" });
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || "Tiedotteen luonti epäonnistui");
      }
    });
  };

  const handleEdit = (bulletin: Bulletin) => {
    setEditingId(bulletin.id);
    setEditedBulletin({
      title: bulletin.title,
      content: bulletin.content,
    });
    setError(null);
    setSuccess(null);
  };

  const handleUpdate = (id: number) => {
    startTransition(async () => {
      const result = await updateBulletin(id, editedBulletin);
      if (result.success) {
        setSuccess("Tiedote päivitetty onnistuneesti");
        setEditingId(null);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || "Tiedotteen päivitys epäonnistui");
      }
    });
  };

  const handleDelete = (id: number, title: string) => {
    if (!confirm(`Haluatko varmasti poistaa tiedotteen "${title}"?`)) {
      return;
    }

    startTransition(async () => {
      const result = await deleteBulletin(id);
      if (result.success) {
        setSuccess("Tiedote poistettu onnistuneesti");
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || "Tiedotteen poisto epäonnistui");
      }
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setError(null);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString("fi-FI", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div>
      {error && (
        <div className="mx-6 mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
          <button
            onClick={() => setError(null)}
            className="float-right font-bold"
          >
            &times;
          </button>
        </div>
      )}
      {success && (
        <div className="mx-6 mt-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {/* Create Bulletin Button and Form */}
      <div className="mx-6 mt-4">
        {!showCreateForm ? (
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                  required
                  disabled={isPending}
                  placeholder="Tiedotteen otsikko"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sisältö *
                </label>
                <textarea
                  value={newBulletin.content}
                  onChange={(e) =>
                    setNewBulletin({ ...newBulletin, content: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 min-h-[150px]"
                  required
                  disabled={isPending}
                  placeholder="Tiedotteen sisältö..."
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400"
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
                  className="bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400 disabled:bg-gray-200"
                >
                  Peruuta
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Bulletins List */}
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
                  // Edit mode
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                          disabled={isPending}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Sisältö
                        </label>
                        <textarea
                          value={editedBulletin.content}
                          onChange={(e) =>
                            setEditedBulletin({
                              ...editedBulletin,
                              content: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 min-h-[150px]"
                          disabled={isPending}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdate(bulletin.id)}
                          disabled={isPending}
                          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400"
                        >
                          {isPending ? "Tallennetaan..." : "Tallenna"}
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          disabled={isPending}
                          className="bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400 disabled:bg-gray-200"
                        >
                          Peruuta
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  // View mode
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
                      <div className="flex gap-2">
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
                    <p className="text-gray-700 whitespace-pre-wrap mt-3 border-t border-gray-100 pt-3">
                      {bulletin.content}
                    </p>
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
