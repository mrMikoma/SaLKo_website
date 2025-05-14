"use client";
import ArrowRightIcon from "@/components/icons/arrowRight";

const DatePicker = ({ selectedDate, setSelectedDate }) => {
  return (
    <div className="flex flex-col w-full min-h-[100px] mx-auto">
      <div className="flex flex-row justify-center items-center p-4 w-full">
        <button
          type="button"
          className="p-2 transform rotate-180 w-16"
          onClick={() => {
            const prevDate = new Date(selectedDate);
            prevDate.setDate(prevDate.getDate() - 1);
            setSelectedDate(prevDate.toISOString().split("T")[0]);
          }}
        >
          <ArrowRightIcon size={30} />
        </button>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-full text-center text-white p-2 bg-sbluel border"
        />
        <button
          type="button"
          className="p-2 w-16"
          onClick={() => {
            const nextDate = new Date(selectedDate);
            nextDate.setDate(nextDate.getDate() + 1);
            setSelectedDate(nextDate.toISOString().split("T")[0]);
          }}
        >
          <ArrowRightIcon size={30} />
        </button>
      </div>
      <div className="text-center text-white text-xl mt-2" suppressHydrationWarning>
        Valittu päivä:{" "}
        <span className="text-sred">{selectedDate}</span>
      </div>
    </div>
  );
};

export default DatePicker;
