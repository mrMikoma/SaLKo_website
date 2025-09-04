"use client";

import { DateTime } from "luxon";
import { useSearchParams } from "next/navigation";
import ArrowRightIcon from "@/components/icons/arrowRight";
import { on } from "events";

const DatePicker = ({
  onChange,
}: {
  onChange: (date: DateTime | null) => void;
}) => {
  const dateParamDate = useSearchParams().get("paiva");
  const currentDate = dateParamDate ? DateTime.fromISO(dateParamDate) : DateTime.now();
  console.log("DatePicker dateParamDate:", dateParamDate);
  return (
    <div className="flex flex-col w-full min-h-[100px] mx-auto">
      <div className="flex flex-row justify-center items-center p-4 w-full">
        {/* Previous day button */}
        <button
          type="button"
          className="p-2 transform rotate-180 w-16"
          onClick={() => {
            const prevDate = currentDate.minus({ days: 1 });
            onChange(prevDate);
          }}
        >
          <ArrowRightIcon size={30} />
        </button>

        {/* Date input */}
        <input
          type="date"
          value={currentDate.toFormat("yyyy-MM-dd")}
          onChange={(e) => {
            const newDate = DateTime.fromISO(e.target.value);
            if (newDate.isValid) {
              onChange(newDate);
            }
          }}
          className="w-48 p-2 border rounded text-sred font-semibold text-center text-lg mx-4"
        />
        {/* Next day button */}
        <button
          type="button"
          className="p-2 w-16"
          onClick={() => {
            const nextDate = currentDate.plus({ days: 1 });
            onChange(nextDate);
          }}
        >
          <ArrowRightIcon size={30} />
        </button>
      </div>
      <div className="text-center text-xl mt-2" suppressHydrationWarning>
        <span className="font-semibold">Valittu päivä: </span>
        <span>
          {currentDate.setLocale("fi").toFormat("cccc")}{" "}
        </span>
        <span>
          {currentDate.setLocale("fi").toFormat("DDD")}
        </span>
      </div>
    </div>
  );
};

export default DatePicker;

/*
const LuxonDatePicker = ({
  value,
  onChange,
}: {
  value: DateTime;
  onChange: (date: DateTime | null) => void;
}) => {
  return (
    <input
      type="date"
      value={value.toFormat("yyyy-MM-dd")}
      onChange={(e) => {
        const newDate = DateTime.fromISO(e.target.value);
        if (newDate.isValid) {
          onChange(newDate);
        }
      }}
      className="w-48 p-2 border rounded"
    />
  );
};
*/
