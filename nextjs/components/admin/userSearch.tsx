"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

interface UserSearchProps {
  initialSearch: string;
}

const UserSearch = ({ initialSearch }: UserSearchProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [isPending, startTransition] = useTransition();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      if (searchQuery.trim()) {
        params.set("search", searchQuery.trim());
      } else {
        params.delete("search");
      }
      router.push(`/admin/users?${params.toString()}`);
    });
  };

  const handleClear = () => {
    setSearchQuery("");
    startTransition(() => {
      router.push("/admin/users");
    });
  };

  return (
    <form onSubmit={handleSearch} className="flex gap-2">
      <div className="flex-1">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Hae nimellä tai sähköpostilla..."
          aria-label="Hae käyttäjiä"
          className="w-full min-h-11 rounded-lg border border-gray-300 bg-white px-3 text-base text-gray-900"
          disabled={isPending}
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="min-h-11 px-5 rounded-lg bg-sblue text-white font-medium hover:bg-sblued transition-colors disabled:opacity-60"
      >
        {isPending ? "Haetaan..." : "Hae"}
      </button>
      {searchQuery && (
        <button
          type="button"
          onClick={handleClear}
          disabled={isPending}
          className="min-h-11 px-4 rounded-lg border border-gray-300 bg-white text-gray-800 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Tyhjennä
        </button>
      )}
    </form>
  );
};

export default UserSearch;
