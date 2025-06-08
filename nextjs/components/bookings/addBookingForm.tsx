"use client";
import { useState } from "react";
import { addBooking } from "@/utilities/bookings";

const AddBookingForm = ({
  userId,
  plane,
  selectedDate,
  flightTypes,
  fullHours,
  onAddBooking,
  onChange,
}) => {
  const [newBooking, setNewBooking] = useState({
    start: fullHours[0],
    end: fullHours[1],
    title: "",
    description: "",
    plane,
    type: "",
    isMultipleDays: false, // New state for multiple-day bookings
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewBooking((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  async function handleSubmit(formData) {
    const start = formData.get("start");
    const end = formData.get("end");
    const type = formData.get("type");
    const title = formData.get("title");
    const description = formData.get("description");

    // Show confirmation alert
    const confirmation = confirm(
      `Vahvistetaanko varaus?\n\nOtsikko: ${title}\nKone: ${plane}\nLennon tyyppi: ${type}\nAlkaa: ${new Date(
        start
      ).toLocaleString("fi-FI", {
        hour: "2-digit",
        minute: "2-digit",
      })}\nPäättyy: ${new Date(end).toLocaleString("fi-FI", {
        hour: "2-digit",
        minute: "2-digit",
      })}\nKuvaus: ${description}\n`
    );

    if (!confirmation) {
      return; // User canceled the action
    }

    console.log(start, end, title, description); // debug

    // Add the booking to the database
    const result = await addBooking({
      userId,
      plane,
      startTime: start,
      endTime: end,
      type,
      title,
      description,
    });

    if (result.status === "success") {
      onAddBooking({
        userId,
        start,
        end,
        type,
        title,
        description,
      });
      alert("Varaus lisätty onnistuneesti");
    } else {
      alert("Varauksen lisääminen epäonnistui");
    }
  }

  return (
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between bg-sbluel">
      <div className="p-4 text-left lg:w-1/4">
        <h2 className="text-lg font-semibold text-sblack">Lisää varaus</h2>
        <h3 className="text-md text-sgrey">Kone: {plane}</h3>
        <h3 className="text-md text-sgrey" suppressHydrationWarning>
          Päivä:{" "}
          {new Date(selectedDate).toLocaleDateString("fi-FI", {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}
        </h3>
        {/* <div className="flex items-center space-x-2">
          <label htmlFor="isMultipleDays" className="text-sblack">
            Tee useamman päivän varaus
          </label>
          <input
            type="checkbox"
            name="isMultipleDays"
            id="isMultipleDays"
            checked={newBooking.isMultipleDays}
            onChange={handleChange}
            className="h-6 w-6 text-sblued"
          />
        </div> */}
      </div>
      <div className="p-4 w-full lg:w-3/4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(new FormData(e.target as HTMLFormElement));
          }}
          className="flex flex-col space-y-4"
        >
          <div className="flex flex-row space-x-8">
            <div className="text-sblack">
              <label htmlFor="start" className="block font-medium">
                Alkaa
              </label>
              {newBooking.isMultipleDays ? (
                <input
                  type="datetime-local"
                  name="start"
                  id="start"
                  value={newBooking.start}
                  onChange={handleChange}
                  className="border border-sblued rounded p-2 w-full lg:w-auto"
                />
              ) : (
                <select
                  name="start"
                  id="start"
                  value={newBooking.start}
                  onChange={handleChange}
                  className="border border-sblued rounded p-2 w-full lg:w-auto"
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
              )}
            </div>
            <div className="text-sblack">
              <label htmlFor="end" className="block font-medium">
                Päättyy
              </label>
              {newBooking.isMultipleDays ? (
                <input
                  type="datetime-local"
                  name="end"
                  id="end"
                  value={newBooking.end}
                  onChange={handleChange}
                  className="border border-sblued rounded p-2 w-full lg:w-auto"
                />
              ) : (
                <select
                  name="end"
                  id="end"
                  value={newBooking.end}
                  onChange={handleChange}
                  className="border border-sblued rounded p-2 w-full lg:w-auto"
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
              )}
            </div>
            <div className="text-sblack">
              <label htmlFor="type" className="block font-medium">
                Lennon tyyppi
              </label>
              <select
                name="type"
                id="type"
                value={newBooking.type}
                onChange={handleChange}
                className="border border-sblued rounded p-2 w-full lg:w-auto"
              >
                {flightTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-col xl:flex-row xl:items-start xl:space-y-0 space-y-4 xl:space-x-4 space-x-0 text-sblack">
            <div className="flex flex-col w-full">
              <label htmlFor="title" className="block text-sblack font-medium">
                Otsikko
              </label>
              <input
                type="text"
                name="title"
                id="title"
                value={newBooking.title}
                onChange={handleChange}
                placeholder="Otsikko"
                className="border border-sblued rounded p-2 w-full"
              />
            </div>
          </div>
          <div className="flex text-sblack">
            <div className="flex flex-col w-full">
              <label htmlFor="description" className="block font-medium">
                Kuvaus
              </label>
              <textarea
                name="description"
                id="description"
                value={newBooking.description}
                onChange={handleChange}
                placeholder="Kuvaus"
                className="border border-sblued rounded p-2 w-full min-h-[200px]"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="bg-sred text-white p-2 rounded w-full border"
            >
              Varaa
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddBookingForm;
