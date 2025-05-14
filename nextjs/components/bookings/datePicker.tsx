"use client";

import ArrowRightIcon from "@/components/icons/arrowRight";
import { DateTime } from "luxon";

const DatePicker = ({
  value,
  onChange,
}: {
  value: DateTime;
  onChange: (date: DateTime | null) => void;
}) => {
  return (
    <div className="flex flex-col w-full min-h-[100px] mx-auto">
      <div className="flex flex-row justify-center items-center p-4 w-full">
        {/* Previous day button */}
        <button
          type="button"
          className="p-2 transform rotate-180 w-16"
          onClick={() => {
            const prevDate = value.minus({ days: 1 });
            onChange(prevDate);
          }}
        >
          <ArrowRightIcon size={30} />
        </button>

        {/* Date input */}
        <input
          type="date"
          value={value.toFormat("yyyy-MM-dd")}
          onChange={(e) => {
            const newDate = DateTime.fromISO(e.target.value);
            if (newDate.isValid) {
              onChange(newDate);
            }
          }}
          className="w-48 p-2 border rounded text-sred"
        />
        {/* Next day button */}
        <button
          type="button"
          className="p-2 w-16"
          onClick={() => {
            const nextDate = value.plus({ days: 1 });
            onChange(nextDate);
          }}
        >
          <ArrowRightIcon size={30} />
        </button>
      </div>
      <div className="text-center text-xl mt-2" suppressHydrationWarning>
        Valittu päivä:{" "}
        <span className="text-sred">{value.toFormat("dd.MM.yyyy")}</span>
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
