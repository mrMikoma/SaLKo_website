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
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900"
          disabled={isPending}
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {isPending ? "Haetaan..." : "Hae"}
      </button>
      {searchQuery && (
        <button
          type="button"
          onClick={handleClear}
          disabled={isPending}
          className="bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400 disabled:bg-gray-200 disabled:cursor-not-allowed"
        >
          Tyhjennä
        </button>
      )}
    </form>
  );
};

export default UserSearch;
