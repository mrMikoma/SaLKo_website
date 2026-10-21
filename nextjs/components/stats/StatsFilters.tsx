"use client";

import { useRouter } from "next/navigation";

/** The year and aircraft the statistics are for; both live in the address */
const StatsFilters = ({
  years,
  year,
  aircraft,
  registration,
}: {
  years: number[];
  year: number;
  aircraft: string[];
  registration: string | null;
}) => {
  const router = useRouter();
  const go = (nextYear: number, nextRegistration: string | null) =>
    router.push(
      `/admin/tilastot?vuosi=${nextYear}${nextRegistration ? `&kone=${encodeURIComponent(nextRegistration)}` : ""}`
    );

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div>
        <label htmlFor="stats-year" className="block text-sm text-gray-700 mb-1">
          Vuosi
        </label>
        <select
          id="stats-year"
          value={year}
          onChange={(e) => go(Number(e.target.value), registration)}
          className="min-h-11 rounded-lg border border-gray-300 bg-white px-3 text-base text-gray-900"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Kone">
        {[null, ...aircraft].map((reg) => (
          <button
            key={reg ?? "all"}
            type="button"
            aria-pressed={reg === registration}
            onClick={() => go(year, reg)}
            className={`min-h-11 px-4 rounded-lg font-medium ${
              reg === registration ? "bg-sblue text-white" : "bg-white border border-gray-300 text-gray-800 hover:bg-gray-50"
            }`}
          >
            {reg ?? "Kaikki koneet"}
          </button>
        ))}
      </div>
    </div>
  );
};

export default StatsFilters;
