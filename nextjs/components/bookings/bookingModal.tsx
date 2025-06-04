"use client";

import { DateTime } from "luxon";
import { Modal, Button } from "antd";
import { BookingType } from "@/utilities/bookings";
import { FLIGHT_TYPES } from "./bookingSection";
import { useState, useEffect } from "react";

const BookingModal = ({
  mode,
  booking,
  onSave,
  onUpdate,
  onDelete,
  onCancel,
  onChange,
}: {
  mode: "create" | "update" | "view";
  booking: BookingType;
  onSave: () => void;
  onUpdate: () => void;
  onDelete: () => void;
  onCancel: () => void;
  onChange: (updatedbooking: BookingType) => void;
}) => {
  const [inputValues, setInputValues] = useState<Partial<BookingType>>({});
  const [debouncedValues, setDebouncedValues] = useState<Partial<BookingType>>(
    {}
  );

  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedValues(inputValues);
    }, 500); // Wait 500ms after the last input

    return () => clearTimeout(timerId); // Clear the previous timeout
  }, [inputValues]);

  useEffect(() => {
    if (Object.keys(debouncedValues).length > 0) {
      onChange({ ...booking, ...debouncedValues });
    }
  }, [debouncedValues]);

  const handleChange = (field: keyof BookingType, value: string) => {
    setInputValues((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Modal
      title={
        mode === "create"
          ? "Uusi varaus"
          : mode === "update"
          ? "Päivitä varaustietoja"
          : "Varaustiedot"
      }
      open={true}
      onOk={
        mode === "create" ? onSave : mode === "update" ? onUpdate : undefined
      }
      onCancel={onCancel}
      okText={
        mode === "create" ? "Save" : mode === "update" ? "Update" : undefined
      }
      cancelText="Cancel"
      footer={
        mode === "view"
          ? [
              <Button key="cancel" onClick={onCancel}>
                Sulje
              </Button>,
            ]
          : [
              <Button key="cancel" onClick={onCancel}>
                Peruuta
              </Button>,
              mode === "update" && (
                <Button key="delete" danger onClick={onDelete}>
                  Poista
                </Button>
              ),
              <Button
                key="submit"
                type="primary"
                className="bg-sblue"
                onClick={mode === "create" ? onSave : onUpdate}
              >
                {mode === "create" ? "Tallenna" : "Päivitä"}
              </Button>,
            ]
      }
    >
      <p>Lentokone: {booking.plane}</p>
      <div className="mb-4">
        <label>Aloitusaika:</label>
        <input
          type="datetime-local"
          value={
            inputValues.start_time || booking.start_time
              ? DateTime.fromISO(booking.start_time)
                  .startOf("hour")
                  .toFormat("yyyy-MM-dd'T'HH:mm")
              : ""
          }
          onChange={(e) => handleChange("start_time", e.target.value)}
          className="border p-2 w-full"
          step="3600" // 1 hour step
          disabled={mode === "view" ? true : false}
        />
      </div>
      <div className="mb-4">
        <label>Lopetusaika:</label>
        <input
          type="datetime-local"
          value={
            inputValues.end_time || booking.end_time
              ? DateTime.fromISO(booking.end_time)
                  .startOf("hour")
                  .toFormat("yyyy-MM-dd'T'HH:mm")
              : ""
          }
          onChange={(e) => handleChange("end_time", e.target.value)}
          className="border p-2 w-full"
          step="3600" // 1 hour step
          disabled={mode === "view" ? true : false}
        />
        <input
          type="hidden"
          id="timezone"
          name="timezone"
          value="Europe/Helsinki"
        />
      </div>
      <div className="mb-4">
        <label>Lennon tyyppi:</label>
        <select
          value={inputValues.type || booking.type || ""}
          onChange={(e) => handleChange("type", e.target.value)}
          className="border p-2 w-full"
          disabled={mode === "view" ? true : false}
        >
          {FLIGHT_TYPES.map((flightType) => (
            <option key={flightType.type} value={flightType.type}>
              {flightType.label}
            </option>
          ))}
        </select>
      </div>
      <div className="mb-4">
        <label>Otsikko:</label>
        <input
          type="text"
          placeholder="Enter booking title"
          value={inputValues.title || booking.title || ""}
          onChange={(e) => handleChange("title", e.target.value)}
          className="border p-2 w-full"
          disabled={mode === "view" ? true : false}
        />
      </div>
      <div className="mb-4">
        <label>Lennon kuvaus:</label>
        <input
          type="text"
          placeholder="Enter booking description"
          value={inputValues.description || booking.description || ""}
          onChange={(e) => handleChange("description", e.target.value)}
          className="border p-2 w-full mb-4"
          disabled={mode === "view" ? true : false}
        />
      </div>
    </Modal>
  );
};

export default BookingModal;
