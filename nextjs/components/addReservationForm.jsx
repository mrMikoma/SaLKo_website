import React, { useState } from "react";

const AddReservationForm = ({
  plane,
  fullHours,
  onAddReservation,
  onChange,
}) => {
  const [newReservation, setNewReservation] = useState({
    start: fullHours[0],
    end: fullHours[1],
    title: "",
    description: "",
    plane,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewReservation({
      ...newReservation,
      [name]: value,
    });
    onChange({ ...newReservation, [name]: value });
  };

  const handleSubmit = () => {
    onAddReservation(newReservation);
    setNewReservation({
      start: fullHours[0],
      end: fullHours[1],
      title: "",
      description: "",
      plane,
    });
  };

  return (
    <div className="mt-4 p-4 flex flex-col lg:flex-row lg:items-start lg:justify-between shadow-lg">
      <div className="p-4 text-center lg:text-left lg:w-1/4">
        <h2 className="text-lg font-semibold">Lisää varaus</h2>
        <h3 className="text-sm text-gray-500">Kone: {plane}</h3>
      </div>
      <div className="flex flex-col lg:flex-row lg:w-3/4 lg:items-center lg:justify-stretch space-y-4 lg:space-y-0 lg:space-x-4">
        <div className="space-y-4">
          <div>
            <select
              name="start"
              value={newReservation.start}
              onChange={handleChange}
              className="border border-gray-300 rounded p-2 w-full lg:w-auto"
            >
              {fullHours.map((hour) => (
                <option key={hour} value={hour}>
                  {new Date(hour * 1000).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </option>
              ))}
            </select>
          </div>
          <div>
            <select
              name="end"
              value={newReservation.end}
              onChange={handleChange}
              className="border border-gray-300 rounded p-2 w-full lg:w-auto"
            >
              {fullHours
                .filter((hour) => hour > newReservation.start)
                .map((hour) => (
                  <option key={hour} value={hour}>
                    {new Date(hour * 1000).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </option>
                ))}
            </select>
          </div>
        </div>
        <div className="flex flex-col xl:flex-row xl:items-start xl:space-y-0 space-y-4 xl:space-x-4 space-x-0">
          <div>
            <input
              type="text"
              name="title"
              placeholder="Otsikko"
              value={newReservation.title}
              onChange={handleChange}
              className="border border-gray-300 rounded p-2 w-full lg:w-auto"
            />
          </div>
          <div>
            <textarea
              name="description"
              placeholder="Kuvaus"
              value={newReservation.description}
              onChange={handleChange}
              className="border border-gray-300 rounded p-2 w-full lg:w-auto min-h-[100px]"
            />
          </div>
        </div>
        <div>
          <button
            onClick={handleSubmit}
            className="bg-blue-500 text-white p-2 rounded w-full lg:w-auto"
          >
            Varaa
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddReservationForm;
