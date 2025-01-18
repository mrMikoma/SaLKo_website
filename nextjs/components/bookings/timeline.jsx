"use client";

import { useState } from "react";
import TrashIcon from "../icons/trash";
import XCrossIcon from "../icons/xCross";

const Timeline = ({
  fullHours,
  bookings,
  previewBooking,
  selectedPlane,
  flightTypes,
}) => {
  console.log("Rendering timeline..."); // Debug
  console.log({ bookings }); // Debug

  const [activeBooking, setActiveBooking] = useState(null); // Track the active booking for details overlay
  const [hoveredBooking, setHoveredBooking] = useState(null); // Track the hovered booking for hover details

  // Helper function to detect overlaps and assign columns
  const arrangeColumns = (bookings) => {
    const columns = [];
    bookings.forEach((booking) => {
      let placed = false;
      for (const column of columns) {
        // Check if the booking overlaps with any in the current column
        if (
          column.every(
            (b) =>
              b.endTime <= booking.startTime || b.startTime >= booking.endTime
          )
        ) {
          column.push(booking);
          placed = true;
          break;
        }
      }
      if (!placed) {
        // Create a new column for this booking
        columns.push([booking]);
      }
    });
    return columns;
  };

  // Helper function to group consecutive bookings
  const groupConsecutiveBookings = (bookings) => {
    const groups = [];
    let currentGroup = [];

    bookings.sort((a, b) => a.startTime - b.startTime); // Sort bookings by start time
    bookings.forEach((booking, index) => {
      if (currentGroup.length === 0) {
        currentGroup.push(booking); // Start a new group
      } else {
        const lastBooking = currentGroup[currentGroup.length - 1];
        // If the booking starts before the last one ends, consider it as a continuous booking
        if (booking.startTime <= lastBooking.endTime) {
          currentGroup.push(booking); // Add to the current group
        } else {
          groups.push(currentGroup); // Push the current group to groups
          currentGroup = [booking]; // Start a new group
        }
      }
      if (index === bookings.length - 1) {
        groups.push(currentGroup); // Push the last group
      }
    });

    return groups;
  };

  // Handle hover on booking to show details
  const handleMouseEnter = (booking) => {
    setHoveredBooking(booking);
  };

  const handleMouseLeave = () => {
    setHoveredBooking(null);
  };

  // Handle click to toggle details overlay
  const handleClick = (booking) => {
    if (activeBooking === booking) {
      setActiveBooking(null); // Close if clicked again
    } else {
      setActiveBooking(booking); // Open details
    }
  };

  // Handle the delete action with confirmation
  const handleDelete = (booking) => {
    const isConfirmed = window.confirm(
      "Oletko varma, että haluat poistaa tämän varauksen?"
    );
    if (isConfirmed) {
      if (onDeleteBooking) {
        onDeleteBooking(booking);
      }
      // Show confirmation message
      setConfirmationMessage(
        `Varaus "${booking.title}" poistettu onnistuneesti.`
      );
      // Clear the active booking
      setActiveBooking(null);
    }
  };

  return (
    <div className="flex flex-col w-full h-full">
      {fullHours.map((hour) => {
        const hours = new Date(hour * 1000).getHours();

        // Filter bookings for the current hour
        const bookingsPerHour = bookings.filter(
          (res) =>
            res.startTime < hour + 3600 && // Booking starts before the hour ends
            res.endTime > hour // Booking ends after the hour starts
        );

        // Arrange bookings into columns to handle overlaps
        const columns = arrangeColumns(bookingsPerHour);
        const columnWidth = 100 / columns.length; // Width of each column as a percentage

        // Check if preview booking overlaps with this hour
        const showPreview =
          previewBooking &&
          previewBooking.plane === selectedPlane &&
          previewBooking.startTime < hour + 3600 &&
          previewBooking.endTime > hour;

        // Group bookings into continuous blocks
        const groupedBookings = groupConsecutiveBookings(bookingsPerHour);

        return (
          <div
            key={hour}
            className="flex border-b text-sblack"
            style={{ height: `${100 / fullHours.length}%` }}
          >
            <span className="w-16 text-center">{`${hours}:00`}</span>
            <div className="w-full border-l border-dashed border-gray-300 relative">
              {columns.length === 0 ? (
                <div className="absolute text-center w-full top-0 left-0"></div>
              ) : (
                columns.map((column, colIndex) =>
                  column.map((res, index) => {
                    const topPercentage =
                      ((Math.max(res.startTime, hour) - hour) / 3600) * 100;
                    const heightPercentage =
                      ((Math.min(res.endTime, hour + 3600) -
                        Math.max(res.startTime, hour)) /
                        3600) *
                      100;

                    // Find the flight type by matching the booking type with flightTypes
                    const flightType = flightTypes.find(
                      (ft) => ft.value === res.type
                    );
                    const backgroundColor = flightType?.color || "gray";

                    // Check if this booking is part of a continuous group
                    const isInGroup = groupedBookings.some((group) =>
                      group.some((booking) => booking === res)
                    );

                    // Show pop-up on hover or click (but only once for the entire group)
                    return (
                      <div
                        key={index}
                        className={`absolute border shadow-sm h-full bg-${backgroundColor}-200 border-${backgroundColor}-400`}
                        style={{
                          top: `${topPercentage}%`,
                          height: `${heightPercentage}%`,
                          left: `${colIndex * columnWidth}%`, // Dynamically adjust left position for column
                          width: `${columnWidth}%`,
                        }}
                        onMouseEnter={() => handleMouseEnter(res)}
                        onMouseLeave={handleMouseLeave}
                        onClick={() => handleClick(res)} // On click show details
                      >
                        {res.title}
                        {/* Hover popup - Only show once per continuous booking */}
                        {hoveredBooking === res && (
                          <div className="absolute left-0 top-0 bg-white border border-gray-300 shadow-lg p-2 rounded">
                            <p>
                              <strong>{res.title}</strong>
                            </p>
                            <p>
                              Alkaa:{" "}
                              {new Date(
                                res.startTime * 1000
                              ).toLocaleTimeString()}
                            </p>
                            <p>
                              Loppuu:{" "}
                              {new Date(
                                res.endTime * 1000
                              ).toLocaleTimeString()}
                            </p>
                            <p>Tyyppi: {flightType?.label}</p>
                          </div>
                        )}
                        {/* Clicked popup */}
                        {activeBooking === res && (
                          <div className="absolute left-0 top-0 bg-white border border-sgrey shadow-lg p-4 rounded w-64 z-10">
                            <div className="flex flex-row items-center justify-between mb-2">
                              <h3>{res.title}</h3>
                              <button
                                onClick={() => handleDelete()}
                                className="p-2 bg-sred text-white rounded"
                              >
                                <TrashIcon size={20} />
                              </button>
                              <button
                                className="p-2 bg-white text-sred rounded"
                                onClick={() => setActiveBooking(null)}
                              >
                                <XCrossIcon size={30} />
                              </button>
                            </div>
                            <p>
                              <strong>Alkaa:</strong>{" "}
                              {new Date(res.startTime * 1000).toLocaleString()}
                            </p>
                            <p>
                              <strong>Loppuu:</strong>{" "}
                              {new Date(res.endTime * 1000).toLocaleString()}
                            </p>
                            <p>
                              <strong>Tyyppi:</strong> {flightType?.label}
                            </p>
                            <p>
                              <strong>Kone:</strong> {res.plane}
                            </p>
                            <p>{res.description}</p>
                          </div>
                        )}
                      </div>
                    );
                  })
                )
              )}
              {showPreview && (
                <div
                  className={`absolute border shadow-sm opacity-50 h-full ${
                    previewBooking.plane === selectedPlane
                      ? "bg-blue-200 border-blue-400"
                      : "bg-green-200 border-green-400"
                  }`}
                  style={{
                    left: "1rem",
                    width: "calc(100% - 2rem)",
                  }}
                >
                  {previewBooking.title}
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
