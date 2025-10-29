"use client";

import { DateTime } from "luxon";
import ArrowRightIcon from "@/components/icons/arrowRight";
import { useDateFromUrl } from "@/hooks/useDateFromUrl";

const DatePicker = () => {
  const { date, setDate, previousDay, nextDay, goToToday, isToday } = useDateFromUrl();

  return (
    <div className="flex flex-col w-full min-h-[100px] mx-auto">
      <div className="flex flex-row justify-center items-center p-4 w-full gap-2">
        {/* Previous day button */}
        <button
          type="button"
          className="p-2 transform rotate-180 w-16 hover:opacity-70 transition-opacity focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          onClick={previousDay}
          aria-label="Edellinen päivä"
        >
          <ArrowRightIcon size={30} />
        </button>

        {/* Date input */}
        <input
          type="date"
          value={date.toFormat("yyyy-MM-dd")}
          onChange={(e) => {
            const newDate = DateTime.fromISO(e.target.value);
            if (newDate.isValid) {
              setDate(newDate);
            }
          }}
          className="w-48 p-2 border rounded text-sred font-semibold text-center text-lg"
          aria-label="Valitse päivämäärä"
        />

        {/* Next day button */}
        <button
          type="button"
          className="p-2 w-16 hover:opacity-70 transition-opacity focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          onClick={nextDay}
          aria-label="Seuraava päivä"
        >
          <ArrowRightIcon size={30} />
        </button>

        {/* Today button */}
        {!isToday && (
          <button
            type="button"
            className="px-4 py-2 bg-sblue text-white rounded hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-blue-500"
            onClick={goToToday}
            aria-label="Siirry tähän päivään"
          >
            Tänään
          </button>
        )}
      </div>

      <div className="text-center text-xl mt-2" suppressHydrationWarning>
        <span className="font-semibold">Valittu päivä: </span>
        <span>{date.setLocale("fi").toFormat("cccc")} </span>
        <span>{date.setLocale("fi").toFormat("DDD")}</span>
      </div>
    </div>
  );
};

export default DatePicker;
