"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DateTime } from "luxon";
import { Modal, Button } from "antd";
import { BookingType } from "@/utilities/bookings";
import { FLIGHT_TYPE_CONFIGS } from "@/types/bookings";
import { bookingSchema, BookingFormValues } from "@/schemas/bookingSchema";

interface BookingModalProps {
  mode: "create" | "update" | "view";
  booking: BookingType;
  onSave: () => void;
  onUpdate: () => void;
  onDelete: () => void;
  onCancel: () => void;
  onChange: (updatedBooking: BookingType) => void;
}

const BookingModal = ({
  mode,
  booking,
  onSave,
  onUpdate,
  onDelete,
  onCancel,
  onChange,
}: BookingModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const isReadOnly = mode === "view";

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    watch,
    reset,
  } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      id: booking.id,
      user_id: booking.user_id,
      plane: booking.plane as any,
      type: booking.type as any,
      title: booking.title,
      description: booking.description || "",
      full_name: booking.full_name,
      start_time: booking.start_time
        ? DateTime.fromISO(booking.start_time).toFormat("yyyy-MM-dd'T'HH:mm")
        : "",
      end_time: booking.end_time
        ? DateTime.fromISO(booking.end_time).toFormat("yyyy-MM-dd'T'HH:mm")
        : "",
    },
  });

  // Watch form values and sync with parent
  useEffect(() => {
    const subscription = watch((values) => {
      if (isDirty) {
        onChange({
          ...booking,
          ...values,
          start_time: values.start_time || booking.start_time,
          end_time: values.end_time || booking.end_time,
          type: values.type || booking.type,
          plane: values.plane || booking.plane,
          title: values.title || booking.title,
          description: values.description || booking.description || "",
        } as BookingType);
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, onChange, booking, isDirty]);

  // Reset form when booking changes
  useEffect(() => {
    reset({
      id: booking.id,
      user_id: booking.user_id,
      plane: booking.plane as any,
      type: booking.type as any,
      title: booking.title,
      description: booking.description || "",
      full_name: booking.full_name,
      start_time: booking.start_time
        ? DateTime.fromISO(booking.start_time).toFormat("yyyy-MM-dd'T'HH:mm")
        : "",
      end_time: booking.end_time
        ? DateTime.fromISO(booking.end_time).toFormat("yyyy-MM-dd'T'HH:mm")
        : "",
    });
  }, [booking, reset]);

  const onSubmitHandler = () => {
    setIsSubmitting(true);
    try {
      if (mode === "create") {
        onSave();
      } else if (mode === "update") {
        onUpdate();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    setIsSubmitting(true);
    try {
      onDelete();
      setShowDeleteConfirm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Modal
        title={
          mode === "create"
            ? "Uusi varaus"
            : mode === "update"
            ? "Päivitä varaustietoja"
            : "Varaustiedot"
        }
        open={true}
        onCancel={onCancel}
        footer={
          mode === "view"
            ? [
                <Button key="cancel" onClick={onCancel}>
                  Sulje
                </Button>,
              ]
            : [
                <Button key="cancel" onClick={onCancel} disabled={isSubmitting}>
                  Peruuta
                </Button>,
                mode === "update" && (
                  <Button
                    key="delete"
                    danger
                    onClick={handleDeleteClick}
                    disabled={isSubmitting}
                  >
                    Poista
                  </Button>
                ),
                <Button
                  key="submit"
                  type="primary"
                  className="bg-sblue"
                  onClick={handleSubmit(onSubmitHandler)}
                  loading={isSubmitting}
                  disabled={isSubmitting || (mode === "update" && !isDirty)}
                >
                  {mode === "create" ? "Tallenna" : "Päivitä"}
                </Button>,
              ]
        }
      >
        <form onSubmit={handleSubmit(onSubmitHandler)} className="space-y-4">
          {/* Plane Display/Info */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lentokone
            </label>
            <p className="text-lg font-semibold text-gray-900">{booking.plane}</p>
          </div>

          {/* Start Time */}
          <div>
            <label
              htmlFor="start_time"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Aloitusaika *
            </label>
            <input
              id="start_time"
              type="datetime-local"
              step="3600"
              {...register("start_time")}
              disabled={isReadOnly}
              className={`w-full border rounded p-2 ${
                errors.start_time
                  ? "border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:ring-blue-500"
              } ${isReadOnly ? "bg-gray-100 cursor-not-allowed" : ""}`}
              aria-invalid={errors.start_time ? "true" : "false"}
              aria-describedby={errors.start_time ? "start_time-error" : undefined}
            />
            {errors.start_time && (
              <p
                id="start_time-error"
                className="mt-1 text-sm text-red-600"
                role="alert"
              >
                {errors.start_time.message}
              </p>
            )}
          </div>

          {/* End Time */}
          <div>
            <label
              htmlFor="end_time"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Lopetusaika *
            </label>
            <input
              id="end_time"
              type="datetime-local"
              step="3600"
              {...register("end_time")}
              disabled={isReadOnly}
              className={`w-full border rounded p-2 ${
                errors.end_time
                  ? "border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:ring-blue-500"
              } ${isReadOnly ? "bg-gray-100 cursor-not-allowed" : ""}`}
              aria-invalid={errors.end_time ? "true" : "false"}
              aria-describedby={errors.end_time ? "end_time-error" : undefined}
            />
            {errors.end_time && (
              <p id="end_time-error" className="mt-1 text-sm text-red-600" role="alert">
                {errors.end_time.message}
              </p>
            )}
          </div>

          {/* Flight Type */}
          <div>
            <label
              htmlFor="type"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Lennon tyyppi *
            </label>
            <select
              id="type"
              {...register("type")}
              disabled={isReadOnly}
              className={`w-full border rounded p-2 ${
                errors.type
                  ? "border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:ring-blue-500"
              } ${isReadOnly ? "bg-gray-100 cursor-not-allowed" : ""}`}
              aria-invalid={errors.type ? "true" : "false"}
              aria-describedby={errors.type ? "type-error" : undefined}
            >
              {FLIGHT_TYPE_CONFIGS.map((flightType) => (
                <option key={flightType.type} value={flightType.type}>
                  {flightType.label}
                </option>
              ))}
            </select>
            {errors.type && (
              <p id="type-error" className="mt-1 text-sm text-red-600" role="alert">
                {errors.type.message}
              </p>
            )}
          </div>

          {/* Title */}
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Otsikko *
            </label>
            <input
              id="title"
              type="text"
              placeholder="Kirjoita varauksen otsikko"
              {...register("title")}
              disabled={isReadOnly}
              className={`w-full border rounded p-2 ${
                errors.title
                  ? "border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:ring-blue-500"
              } ${isReadOnly ? "bg-gray-100 cursor-not-allowed" : ""}`}
              aria-invalid={errors.title ? "true" : "false"}
              aria-describedby={errors.title ? "title-error" : undefined}
            />
            {errors.title && (
              <p id="title-error" className="mt-1 text-sm text-red-600" role="alert">
                {errors.title.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Lennon kuvaus
            </label>
            <textarea
              id="description"
              rows={3}
              placeholder="Kirjoita lisätietoja (valinnainen)"
              {...register("description")}
              disabled={isReadOnly}
              className={`w-full border rounded p-2 ${
                errors.description
                  ? "border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:ring-blue-500"
              } ${isReadOnly ? "bg-gray-100 cursor-not-allowed" : ""}`}
              aria-invalid={errors.description ? "true" : "false"}
              aria-describedby={errors.description ? "description-error" : undefined}
            />
            {errors.description && (
              <p
                id="description-error"
                className="mt-1 text-sm text-red-600"
                role="alert"
              >
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Full Name (read-only for update mode) */}
          {mode === "update" && booking.full_name && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Varaaja
              </label>
              <p className="text-gray-900">{booking.full_name}</p>
            </div>
          )}
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <Modal
          title="Vahvista poisto"
          open={showDeleteConfirm}
          onCancel={() => setShowDeleteConfirm(false)}
          footer={[
            <Button
              key="cancel"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isSubmitting}
            >
              Peruuta
            </Button>,
            <Button
              key="confirm"
              type="primary"
              danger
              onClick={confirmDelete}
              loading={isSubmitting}
            >
              Poista varaus
            </Button>,
          ]}
        >
          <p>Haluatko varmasti poistaa varauksen "{booking.title}"?</p>
          <p className="text-sm text-gray-600 mt-2">Tätä toimintoa ei voi peruuttaa.</p>
        </Modal>
      )}
    </>
  );
};

export default BookingModal;
