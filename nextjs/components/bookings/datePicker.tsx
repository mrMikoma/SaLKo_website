"use client";

import { DateTime } from "luxon";
import {
  CalendarOutlined,
  LeftOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { useDateFromUrl } from "@/hooks/useDateFromUrl";
import { ViewMode } from "./viewSelector";

interface DatePickerProps {
  viewMode?: ViewMode;
}

const DatePicker = ({ viewMode = "day" }: DatePickerProps) => {
  const { date, setDate, goToToday, isToday } = useDateFromUrl();

  // Navigation functions based on view mode
  const handlePrevious = () => {
    if (viewMode === "week") {
      setDate(date.minus({ weeks: 1 }));
    } else if (viewMode === "month") {
      setDate(date.minus({ months: 1 }));
    } else {
      setDate(date.minus({ days: 1 }));
    }
  };

  const handleNext = () => {
    if (viewMode === "week") {
      setDate(date.plus({ weeks: 1 }));
    } else if (viewMode === "month") {
      setDate(date.plus({ months: 1 }));
    } else {
      setDate(date.plus({ days: 1 }));
    }
  };

  // Get display text based on view mode
  const getDisplayText = () => {
    if (viewMode === "week") {
      const weekStart = date.startOf("week");
      const weekEnd = date.endOf("week");
      return (
        <div className="text-center">
          <div className="text-2xl font-bold text-white">
            Viikko {date.weekNumber}
          </div>
          <div className="text-sm text-white/90 mt-1">
            {weekStart.setLocale("fi").toFormat("dd.MM")} -{" "}
            {weekEnd.setLocale("fi").toFormat("dd.MM.yyyy")}
          </div>
        </div>
      );
    } else if (viewMode === "month") {
      return (
        <div className="text-center">
          <div className="text-2xl font-bold text-white capitalize">
            {date.setLocale("fi").toFormat("LLLL yyyy")}
          </div>
          <div className="text-sm text-white/90 mt-1">
            {date.daysInMonth} päivää
          </div>
        </div>
      );
    } else {
      return (
        <div className="text-center">
          <div className="text-2xl font-bold text-white capitalize">
            {date.setLocale("fi").toFormat("cccc")}
          </div>
          <div className="text-sm text-white/90 mt-1">
            {date.setLocale("fi").toFormat("d. MMMM yyyy")}
          </div>
        </div>
      );
    }
  };

  // Get aria labels based on view mode
  const getPreviousLabel = () => {
    if (viewMode === "week") return "Edellinen viikko";
    if (viewMode === "month") return "Edellinen kuukausi";
    return "Edellinen päivä";
  };

  const getNextLabel = () => {
    if (viewMode === "week") return "Seuraava viikko";
    if (viewMode === "month") return "Seuraava kuukausi";
    return "Seuraava päivä";
  };

  return (
    <div className="lg:w-1/2 mx-auto">
      <div className="bg-gradient-to-r from-sblue to-sblued rounded-xl shadow-lg p-6">
        {/* Main navigation row */}
        <div className="flex items-center justify-between gap-4">
          {/* Previous button */}
          <button
            type="button"
            onClick={handlePrevious}
            className="flex items-center justify-center w-12 h-12 rounded-full bg-swhite/20 hover:bg-swhite/30 text-swhite transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-swhite/50 backdrop-blur-sm"
            aria-label={getPreviousLabel()}
          >
            <LeftOutlined className="text-xl" />
          </button>

          {/* Date display and picker */}
          <div className="flex-1 flex items-center justify-center gap-4">
            <div className="flex-1">{getDisplayText()}</div>
            {/* Date picker input (hidden by default, shown as calendar icon) */}
            <div className="relative">
              <input
                type="date"
                value={date.toFormat("yyyy-MM-dd")}
                onChange={(e) => {
                  const newDate = DateTime.fromISO(e.target.value);
                  if (newDate.isValid) {
                    setDate(newDate);
                  }
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-12 h-12"
                aria-label="Valitse päivämäärä"
              />
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-swhite/20 hover:bg-swhite/30 text-swhite transition-all duration-200 cursor-pointer">
                <CalendarOutlined className="text-xl" />
              </div>
            </div>{" "}
          </div>

          {/* Next button */}
          <button
            type="button"
            onClick={handleNext}
            className="flex items-center justify-center w-12 h-12 rounded-full bg-swhite/20 hover:bg-swhite/30 text-swhite transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-swhite/50 backdrop-blur-sm"
            aria-label={getNextLabel()}
          >
            <RightOutlined className="text-xl" />
          </button>

          {/* Today button - hidden on mobile, shown on desktop */}
          <button
            type="button"
            onClick={goToToday}
            disabled={isToday}
            className={`hidden lg:block px-6 py-3 font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-swhite/50 shadow-md whitespace-nowrap ${
              isToday
                ? "bg-swhite/30 text-swhite/60 cursor-not-allowed"
                : "bg-swhite text-sblue hover:bg-sgrey"
            }`}
            aria-label="Siirry tähän päivään"
          >
            Tänään
          </button>
        </div>

        {/* Today button for mobile - centered below navigation */}
        <div className="lg:hidden mt-4 flex justify-center">
          <button
            type="button"
            onClick={goToToday}
            disabled={isToday}
            className={`px-6 py-2 font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-swhite/50 shadow-md ${
              isToday
                ? "bg-swhite/30 text-swhite/60 cursor-not-allowed"
                : "bg-swhite text-sblue hover:bg-sgrey"
            }`}
            aria-label="Siirry tähän päivään"
          >
            Tänään
          </button>
        </div>
      </div>
    </div>
  );
};

export default DatePicker;
