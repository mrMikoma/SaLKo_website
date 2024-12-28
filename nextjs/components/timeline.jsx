import React from "react";

const Timeline = ({
  fullHours,
  reservations,
  previewReservation,
  selectedPlane,
}) => {
  return (
    <div className="flex flex-col w-full h-full">
      {fullHours.map((hour) => {
        const date = new Date(hour * 1000);
        const hours = date.getHours().toString().padStart(2, "0");

        // Filter all the reservations that are in this hour
        const reservationsForHour = reservations.filter(
          (res) =>
            res.plane === selectedPlane &&
            res.start < hour + 3600 &&
            res.end > hour // Check if reservation overlaps with this hour
        );
        const showPreview =
          previewReservation &&
          previewReservation.plane === selectedPlane &&
          previewReservation.start < hour + 3600 &&
          previewReservation.end > hour; // Check if preview reservation overlaps with this hour

        return (
          <div
            key={hour}
            className="flex border-b text-red-500"
            style={{ height: `${100 / fullHours.length}%` }}
          >
            <span className="w-16 text-center">{`${hours}:00`}</span>
            <div className="w-full border-l border-dashed border-gray-300 relative">
              {reservationsForHour.map((res, index) => {
                const topPercentage =
                  ((Math.max(res.start, hour) - hour) / 3600) * 100;
                const heightPercentage =
                  ((Math.min(res.end, hour + 3600) -
                    Math.max(res.start, hour)) /
                    3600) *
                  100;
                return (
                  <div
                    key={index}
                    className={`absolute border shadow-sm h-full ${
                      res.plane === "OH-CON"
                        ? "bg-blue-200 border-blue-400"
                        : "bg-green-200 border-green-400"
                    }`}
                    style={{
                      left: "1rem",
                      width: "calc(100% - 2rem)",
                    }}
                  >
                    {res.title}
                  </div>
                );
              })}
              {showPreview && (
                <div
                  className={`absolute border shadow-sm opacity-50 h-full ${
                    previewReservation.plane === "OH-CON"
                      ? "bg-blue-200 border-blue-400"
                      : "bg-green-200 border-green-400"
                  }`}
                  style={{
                    left: "1rem",
                    width: "calc(100% - 2rem)"
                  }}
                >
                  {previewReservation.title}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Timeline;
