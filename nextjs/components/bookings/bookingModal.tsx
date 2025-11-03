"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DateTime } from "luxon";
import { Modal, Button } from "antd";
import { BookingType } from "@/utilities/bookings";
import { FLIGHT_TYPE_CONFIGS } from "@/types/bookings";
import { bookingSchema, BookingFormValues, guestBookingSchema, GuestBookingFormValues } from "@/schemas/bookingSchema";
import { downloadICalEvent } from "@/utilities/calendarExport";

interface BookingModalProps {
  mode: "create" | "update" | "view";
  booking: BookingType;
  onSave: (booking: BookingType, repeatEndDate?: string) => void;
  onUpdate: (booking: BookingType) => void;
  onDelete: () => void;
  onCancel: () => void;
  onChange: (updatedBooking: BookingType) => void;
  isLoggedIn?: boolean;
  userRole?: string;
}

const BookingModal = ({
  mode,
  booking,
  onSave,
  onUpdate,
  onDelete,
  onCancel,
  onChange,
  isLoggedIn = false,
  userRole = "guest",
}: BookingModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isRepeating, setIsRepeating] = useState(false);
  const [repeatEndDate, setRepeatEndDate] = useState("");
  const isReadOnly = mode === "view";
  const isGuestMode = !isLoggedIn && mode === "create";

  // Use different schema and form type based on login status
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    getValues,
  } = useForm<BookingFormValues | GuestBookingFormValues>({
    resolver: zodResolver(isGuestMode ? guestBookingSchema : bookingSchema),
    defaultValues: isGuestMode
      ? {
          plane: booking.plane as any,
          type: booking.type as any,
          title: booking.title,
          description: booking.description || "",
          start_time: booking.start_time
            ? DateTime.fromISO(booking.start_time).toFormat("yyyy-MM-dd'T'HH:mm")
            : "",
          end_time: booking.end_time
            ? DateTime.fromISO(booking.end_time).toFormat("yyyy-MM-dd'T'HH:mm")
            : "",
          contactName: "",
          contactEmail: "",
          contactPhone: "",
        }
      : {
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

  // We don't need to sync form values to parent on every keystroke
  // The parent only needs the final values when saving
  // Remove the watch effect that was causing the circular update issues

  // Reset form when booking ID changes (initial load only, not on every booking state change)
  useEffect(() => {
    if (isGuestMode) {
      reset({
        plane: booking.plane as any,
        type: booking.type as any,
        title: booking.title,
        description: booking.description || "",
        start_time: booking.start_time
          ? DateTime.fromISO(booking.start_time).toFormat("yyyy-MM-dd'T'HH:mm")
          : "",
        end_time: booking.end_time
          ? DateTime.fromISO(booking.end_time).toFormat("yyyy-MM-dd'T'HH:mm")
          : "",
        contactName: "",
        contactEmail: "",
        contactPhone: "",
      });
    } else {
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
    }
    // Only reset when booking.id changes (when opening a new/different booking modal)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking.id, reset, isGuestMode]);

  const onSubmitHandler = () => {
    setIsSubmitting(true);
    try {
      // Get current form values
      const formValues = getValues();

      // Convert datetime-local strings to UTC ISO format
      // The datetime-local input gives us a string like "2024-01-15T14:00" (local time)
      // Backend expects UTC, so we interpret the input as local time and convert to UTC
      const startTimeISO = formValues.start_time
        ? DateTime.fromISO(formValues.start_time, { zone: "local" }).toUTC().toISO()
        : booking.start_time;
      const endTimeISO = formValues.end_time
        ? DateTime.fromISO(formValues.end_time, { zone: "local" }).toUTC().toISO()
        : booking.end_time;

      // Build updated booking object with form values
      const updatedBooking: BookingType = {
        ...booking,
        plane: formValues.plane,
        type: formValues.type,
        title: formValues.title,
        description: formValues.description || "",
        start_time: startTimeISO || "",
        end_time: endTimeISO || "",
        // For guest bookings, add guest contact info
        ...(isGuestMode && {
          guest_contact_name: (formValues as any).contactName,
          guest_contact_email: (formValues as any).contactEmail,
          guest_contact_phone: (formValues as any).contactPhone,
        }),
      };

      // Sync the updated values to parent (for display purposes)
      onChange(updatedBooking);

      if (mode === "create") {
        // Pass the booking data and repeat end date if repeating is enabled
        onSave(updatedBooking, isRepeating ? repeatEndDate : undefined);
      } else if (mode === "update") {
        // Pass the updated booking data directly
        onUpdate(updatedBooking);
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

  const handleExportToCalendar = () => {
    try {
      if (booking.id >= 0 && booking.start_time && booking.end_time) {
        downloadICalEvent(booking);
      }
    } catch (error) {
      console.error("Error exporting to calendar:", error);
      // You could show a toast/notification here if needed
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
                <Button
                  key="calendar"
                  onClick={handleExportToCalendar}
                  disabled={booking.id < 0 || !booking.start_time || !booking.end_time}
                >
                  Lisää kalenteriin
                </Button>,
                <Button key="cancel" onClick={onCancel}>
                  Sulje
                </Button>,
              ]
            : [
                <Button key="cancel" onClick={onCancel} disabled={isSubmitting}>
                  Peruuta
                </Button>,
                mode === "update" && booking.id >= 0 && (
                  <Button
                    key="calendar"
                    onClick={handleExportToCalendar}
                    disabled={!booking.start_time || !booking.end_time}
                  >
                    Lisää kalenteriin
                  </Button>
                ),
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

          {/* Guest Contact Information (only for non-logged-in users in create mode) */}
          {isGuestMode && (
            <div className="space-y-4 pt-3 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-900">
                Yhteystiedot *
              </h3>
              <p className="text-xs text-gray-600">
                Vierasvaraukseen tarvitaan yhteystietosi, jotta voimme tarvittaessa ottaa yhteyttä.
              </p>

              {/* Contact Name */}
              <div>
                <label
                  htmlFor="contactName"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Nimi *
                </label>
                <input
                  id="contactName"
                  type="text"
                  placeholder="Koko nimesi"
                  {...register("contactName" as any)}
                  className={`w-full border rounded p-2 ${
                    (errors as any).contactName
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:ring-blue-500"
                  }`}
                  aria-invalid={(errors as any).contactName ? "true" : "false"}
                  aria-describedby={(errors as any).contactName ? "contactName-error" : undefined}
                />
                {(errors as any).contactName && (
                  <p
                    id="contactName-error"
                    className="mt-1 text-sm text-red-600"
                    role="alert"
                  >
                    {(errors as any).contactName.message}
                  </p>
                )}
              </div>

              {/* Contact Email */}
              <div>
                <label
                  htmlFor="contactEmail"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Sähköposti *
                </label>
                <input
                  id="contactEmail"
                  type="email"
                  placeholder="esimerkki@email.com"
                  {...register("contactEmail" as any)}
                  className={`w-full border rounded p-2 ${
                    (errors as any).contactEmail
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:ring-blue-500"
                  }`}
                  aria-invalid={(errors as any).contactEmail ? "true" : "false"}
                  aria-describedby={(errors as any).contactEmail ? "contactEmail-error" : undefined}
                />
                {(errors as any).contactEmail && (
                  <p
                    id="contactEmail-error"
                    className="mt-1 text-sm text-red-600"
                    role="alert"
                  >
                    {(errors as any).contactEmail.message}
                  </p>
                )}
              </div>

              {/* Contact Phone */}
              <div>
                <label
                  htmlFor="contactPhone"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Puhelinnumero *
                </label>
                <input
                  id="contactPhone"
                  type="tel"
                  placeholder="+358 40 123 4567"
                  {...register("contactPhone" as any)}
                  className={`w-full border rounded p-2 ${
                    (errors as any).contactPhone
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:ring-blue-500"
                  }`}
                  aria-invalid={(errors as any).contactPhone ? "true" : "false"}
                  aria-describedby={(errors as any).contactPhone ? "contactPhone-error" : undefined}
                />
                {(errors as any).contactPhone && (
                  <p
                    id="contactPhone-error"
                    className="mt-1 text-sm text-red-600"
                    role="alert"
                  >
                    {(errors as any).contactPhone.message}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Repeating Bookings (only in create mode) */}
          {mode === "create" && (
            <div className="space-y-3 pt-3 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <input
                  id="is_repeating"
                  type="checkbox"
                  checked={isRepeating}
                  onChange={(e) => setIsRepeating(e.target.checked)}
                  className="w-4 h-4 text-sblue border-gray-300 rounded focus:ring-sblue"
                />
                <label
                  htmlFor="is_repeating"
                  className="text-sm font-medium text-gray-700"
                >
                  Toistuva varaus (sama aika joka päivä)
                </label>
              </div>

              {isRepeating && (
                <div>
                  <label
                    htmlFor="repeat_end_date"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Toiston lopetuspäivä *
                  </label>
                  <input
                    id="repeat_end_date"
                    type="date"
                    value={repeatEndDate}
                    onChange={(e) => setRepeatEndDate(e.target.value)}
                    min={
                      booking.start_time
                        ? DateTime.fromISO(booking.start_time)
                            .plus({ days: 1 })
                            .toFormat("yyyy-MM-dd")
                        : undefined
                    }
                    className="w-full border border-gray-300 rounded p-2 focus:ring-sblue focus:border-sblue"
                    required={isRepeating}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Varaus toistetaan samalla kellonajalla jokaiselle päivälle valitusta
                    aloituspäivästä lopetuspäivään asti.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Booker information (read-only, shown in update and view modes) */}
          {(mode === "update" || mode === "view") && booking.full_name && (
            <div className="space-y-3 pt-2 border-t border-gray-200 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Varaaja
                </label>
                <p className="text-gray-900">{booking.full_name}</p>
                {booking.is_guest && (
                  <p className="text-xs text-gray-500 mt-1">
                    (Vierasvaraus)
                  </p>
                )}
              </div>

              {/* Show guest contact info if this is a guest booking and user is admin */}
              {booking.is_guest && userRole === "admin" && (
                <>
                  {booking.guest_contact_name && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Vieraan nimi
                      </label>
                      <p className="text-gray-900">{booking.guest_contact_name}</p>
                    </div>
                  )}
                  {booking.guest_contact_email && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Vieraan sähköposti
                      </label>
                      <a
                        href={`mailto:${booking.guest_contact_email}`}
                        className="text-sblue hover:text-sblued underline"
                      >
                        {booking.guest_contact_email}
                      </a>
                    </div>
                  )}
                  {booking.guest_contact_phone && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Vieraan puhelinnumero
                      </label>
                      <a
                        href={`tel:${booking.guest_contact_phone}`}
                        className="text-sblue hover:text-sblued underline"
                      >
                        {booking.guest_contact_phone}
                      </a>
                    </div>
                  )}
                </>
              )}

              {/* Only show regular contact info to logged in users (non-guest bookings) */}
              {!booking.is_guest && isLoggedIn && (
                <>
                  {booking.email && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Sähköposti
                      </label>
                      <a
                        href={`mailto:${booking.email}`}
                        className="text-sblue hover:text-sblued underline"
                      >
                        {booking.email}
                      </a>
                    </div>
                  )}

                  {booking.phone && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Puhelinnumero
                      </label>
                      <a
                        href={`tel:${booking.phone}`}
                        className="text-sblue hover:text-sblued underline"
                      >
                        {booking.phone}
                      </a>
                    </div>
                  )}
                </>
              )}
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
