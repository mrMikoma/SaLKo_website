"use client";
import React, { useState } from "react";
import Timeline from "../../components/timeline";
import AddReservationForm from "../../components/addReservationForm";

const Scheduler = () => {
  const planes = ["OH-CON", "OH-SEE"];
  const [reservations, setReservations] = useState([]);
  const [selectedPlane, setSelectedPlane] = useState(planes[0]);
  const [previewReservation, setPreviewReservation] = useState(null);

  const fullHours = [];
  for (let hour = 8; hour <= 22; hour++) {
    fullHours.push(hour * 3600);
  }
  const startTime = new Date().setHours(8, 0, 0, 0) / 1000; // 8:00 AM today in Unix time
  const endTime = new Date().setHours(22, 0, 0, 0) / 1000; // 10:00 PM today in Unix time

  const startTimeInSeconds = startTime * 3600;
  const endTimeInSeconds = endTime * 3600;

  const filteredReservations = reservations.filter(
    (res) => res.plane === selectedPlane
  );

  const handleFormChange = (reservation) => {
    setPreviewReservation({ ...reservation, plane: selectedPlane });
  };

  const handleAddReservation = (newReservation) => {
    setReservations([...reservations, newReservation]);
    setPreviewReservation(null); 
  };

  return (
    <div className="flex flex-col w-3/4 min-h-[600px] border rounded-lg shadow-md mx-auto">
      <div className="flex flex-row justify-center p-4 border-b border-r w-full">
        {planes.map(plane => (
          <button
            key={plane}
            onClick={() => setSelectedPlane(plane)}
            className={`flex-1 text-center p-2 rounded-md mr-2 mb-2 md:mb-0 ${
              selectedPlane === plane ? 'bg-blue-500 text-white' : 'bg-gray-200'
            }`}
          >
            {plane}
          </button>
        ))}
      </div>

      <div className="flex-1 relative">
        <Timeline 
          fullHours={fullHours} 
          reservations={filteredReservations} 
          previewReservation={previewReservation} 
          selectedPlane={selectedPlane}
          startTimeInSeconds={startTimeInSeconds}
          endTimeInSeconds={endTimeInSeconds}
        />
      </div>

      <div className="">
        <AddReservationForm
          plane={selectedPlane}
          fullHours={fullHours}
          onAddReservation={handleAddReservation}
          onChange={handleFormChange}
        />
      </div>
    </div>
  );
};

export default Scheduler;