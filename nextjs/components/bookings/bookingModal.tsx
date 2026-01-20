"use client";

import { useEffect, useState, memo, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DateTime } from "luxon";
import { Modal, Button } from "antd";
import { BookingType } from "@/utilities/bookings";
import { FLIGHT_TYPE_CONFIGS } from "@/types/bookings";
import {
  bookingSchema,
  BookingFormValues,
  guestBookingSchema,
  GuestBookingFormValues,
} from "@/schemas/bookingSchema";
import { downloadICalEvent } from "@/utilities/calendarExport";

interface BookingModalProps {
  mode: "create" | "update" | "view";
  booking: BookingType;
  onSave: (booking: BookingType, repeatEndDate?: string) => void;
  onUpdate: (booking: BookingType) => void;
  onDelete: (deleteFollowing?: boolean) => void | Promise<void>;
  onCancel: () => void;
  onChange: (updatedBooking: BookingType) => void;
  isLoggedIn?: boolean;
  userRole?: string | string[];
}

const BookingModal = memo(
  ({
    mode,
    booking,
    onSave,
    onUpdate,
    onDelete,
    onCancel,
    onChange,
    isLoggedIn = false,
    userRole = ["guest"],
  }: BookingModalProps) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteFollowing, setDeleteFollowing] = useState(false);
    const [isRepeating, setIsRepeating] = useState(false);
    const [repeatEndDate, setRepeatEndDate] = useState("");
    const isReadOnly = mode === "view";
    const isGuestMode = !isLoggedIn && mode === "create";
    const hasRepeatGroup = !!booking.repeat_group_id;

    // Helper to check if user has admin role
    const isAdmin = Array.isArray(userRole)
      ? userRole.includes("admin")
      : userRole === "admin";

    // OPTIMIZATION: Memoize the schema selector to avoid recreating on every render
    const schema = useMemo(
      () => (isGuestMode ? guestBookingSchema : bookingSchema),
      [isGuestMode]
    );

    // OPTIMIZATION: Memoize default values to avoid recreating object on every render
    const defaultFormValues = useMemo(() => {
      const baseValues = {
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
      };

      if (isGuestMode) {
        return {
          ...baseValues,
          contactName: "",
          contactEmail: "",
          contactPhone: "",
        };
      }

      return {
        ...baseValues,
        id: booking.id,
        user_id: booking.user_id,
        full_name: booking.full_name,
      };
    }, [
      booking.id,
      booking.plane,
      booking.type,
      booking.title,
      booking.description,
      booking.start_time,
      booking.end_time,
      booking.user_id,
      booking.full_name,
      isGuestMode,
    ]);

    // Use different schema and form type based on login status
    const {
      register,
      handleSubmit,
      formState: { errors, isDirty },
      reset,
      getValues,
      setValue,
    } = useForm<BookingFormValues | GuestBookingFormValues>({
      resolver: zodResolver(schema),
      defaultValues: defaultFormValues,
    });

    // Handler to update end_time when start_time changes
    const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newStartTime = e.target.value;
      if (newStartTime) {
        // Parse the new start time
        const startDateTime = DateTime.fromISO(newStartTime);

        // Calculate end time: if start time is on the hour, add 1 hour
        // If start time has minutes, round up to next hour
        let endDateTime: DateTime;
        if (startDateTime.minute === 0) {
          // Start time is on the hour (e.g., 08:00), end time is next hour (e.g., 09:00)
          endDateTime = startDateTime.plus({ hours: 1 });
        } else {
          // Start time has minutes (e.g., 08:30), round up to next hour (e.g., 09:00)
          endDateTime = startDateTime.plus({ hours: 1 }).startOf("hour");
        }

        setValue("end_time", endDateTime.toFormat("yyyy-MM-dd'T'HH:mm"), {
          shouldDirty: true,
        });
      }
    };

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
            ? DateTime.fromISO(booking.start_time).toFormat(
                "yyyy-MM-dd'T'HH:mm"
              )
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
            ? DateTime.fromISO(booking.start_time).toFormat(
                "yyyy-MM-dd'T'HH:mm"
              )
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
          ? DateTime.fromISO(formValues.start_time, { zone: "local" })
              .toUTC()
              .toISO()
          : booking.start_time;
        const endTimeISO = formValues.end_time
          ? DateTime.fromISO(formValues.end_time, { zone: "local" })
              .toUTC()
              .toISO()
          : booking.end_time;

        // Build updated booking object with form values
        const updatedBooking: BookingType & {
          contactName?: string;
          contactEmail?: string;
          contactPhone?: string;
        } = {
          ...booking,
          plane: formValues.plane,
          type: formValues.type,
          title: formValues.title,
          description: formValues.description || "",
          start_time: startTimeISO || "",
          end_time: endTimeISO || "",
          // For guest bookings, add contact info (without guest_ prefix for mutation)
          ...(isGuestMode && {
            contactName: (formValues as any).contactName,
            contactEmail: (formValues as any).contactEmail,
            contactPhone: (formValues as any).contactPhone,
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

    const confirmDelete = async () => {
      setIsSubmitting(true);
      try {
        await onDelete(deleteFollowing);
        setShowDeleteConfirm(false);
      } catch (error) {
        console.error("Error deleting booking:", error);
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
            <div className="text-xl font-semibold text-gray-900">
              {mode === "create"
                ? "Uusi varaus"
                : mode === "update"
                ? "Päivitä varaustietoja"
                : "Varaustiedot"}
            </div>
          }
          open={true}
          onCancel={onCancel}
          centered
          width={640}
          className="booking-modal"
          footer={
            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-2 sm:justify-end w-full pt-4 border-t border-gray-200">
              {mode === "view" ? (
                <>
                  <Button
                    key="cancel"
                    onClick={onCancel}
                    size="large"
                    className="w-full sm:w-auto rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  >
                    Sulje
                  </Button>
                  <Button
                    key="calendar"
                    onClick={handleExportToCalendar}
                    disabled={
                      booking.id < 0 || !booking.start_time || !booking.end_time
                    }
                    size="large"
                    className="w-full sm:w-auto rounded-lg font-medium bg-gradient-to-r from-sblue to-sblued text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    Lisää kalenteriin
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    key="cancel"
                    onClick={onCancel}
                    disabled={isSubmitting}
                    size="large"
                    className="w-full sm:w-auto rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  >
                    Peruuta
                  </Button>
                  {mode === "update" && (
                    <Button
                      key="delete"
                      danger
                      onClick={handleDeleteClick}
                      disabled={isSubmitting}
                      size="large"
                      className="w-full sm:w-auto rounded-lg font-medium hover:bg-red-600 transition-colors"
                    >
                      Poista
                    </Button>
                  )}
                  {mode === "update" && booking.id >= 0 && (
                    <Button
                      key="calendar"
                      onClick={handleExportToCalendar}
                      disabled={!booking.start_time || !booking.end_time}
                      size="large"
                      className="w-full sm:w-auto rounded-lg font-medium border-sblue text-sblue hover:bg-sbluel/10 transition-colors"
                    >
                      Lisää kalenteriin
                    </Button>
                  )}
                  <Button
                    key="submit"
                    type="primary"
                    size="large"
                    className="bg-gradient-to-r from-sblue to-sblued hover:opacity-90 transition-opacity w-full sm:w-auto rounded-lg font-medium shadow-md disabled:opacity-50"
                    onClick={handleSubmit(onSubmitHandler)}
                    loading={isSubmitting}
                    disabled={isSubmitting || (mode === "update" && !isDirty)}
                  >
                    {mode === "create" ? "Tallenna" : "Päivitä"}
                  </Button>
                </>
              )}
            </div>
          }
        >
          <form onSubmit={handleSubmit(onSubmitHandler)} className="space-y-5">
            {/* Plane Display/Info */}
            <div className="bg-gradient-to-r from-sbluel/10 to-sblued/10 rounded-xl p-4 border border-sbluel/30">
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Lentokone
              </label>
              <p className="text-2xl font-bold text-sblued">{booking.plane}</p>
            </div>

            {/* Start Time */}
            <div>
              <label
                htmlFor="start_time"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Aloitusaika *
              </label>
              <input
                id="start_time"
                type="datetime-local"
                step="3600"
                {...register("start_time", {
                  onChange: handleStartTimeChange,
                })}
                disabled={isReadOnly}
                className={`w-full border rounded-lg px-4 py-3 text-base transition-all ${
                  errors.start_time
                    ? "border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    : "border-gray-300 focus:ring-2 focus:ring-sblue focus:border-sblue"
                } ${
                  isReadOnly
                    ? "bg-gray-100 cursor-not-allowed"
                    : "bg-white hover:border-sbluel"
                }`}
                aria-invalid={errors.start_time ? "true" : "false"}
                aria-describedby={
                  errors.start_time ? "start_time-error" : undefined
                }
              />
              {errors.start_time && (
                <p
                  id="start_time-error"
                  className="mt-2 text-sm text-red-600 flex items-center gap-1"
                  role="alert"
                >
                  <span className="text-red-500">⚠</span>{" "}
                  {errors.start_time.message}
                </p>
              )}
            </div>

            {/* End Time */}
            <div>
              <label
                htmlFor="end_time"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Lopetusaika *
              </label>
              <input
                id="end_time"
                type="datetime-local"
                step="3600"
                {...register("end_time")}
                disabled={isReadOnly}
                className={`w-full border rounded-lg px-4 py-3 text-base transition-all ${
                  errors.end_time
                    ? "border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    : "border-gray-300 focus:ring-2 focus:ring-sblue focus:border-sblue"
                } ${
                  isReadOnly
                    ? "bg-gray-100 cursor-not-allowed"
                    : "bg-white hover:border-sbluel"
                }`}
                aria-invalid={errors.end_time ? "true" : "false"}
                aria-describedby={
                  errors.end_time ? "end_time-error" : undefined
                }
              />
              {errors.end_time && (
                <p
                  id="end_time-error"
                  className="mt-2 text-sm text-red-600 flex items-center gap-1"
                  role="alert"
                >
                  <span className="text-red-500">⚠</span>{" "}
                  {errors.end_time.message}
                </p>
              )}
            </div>

            {/* Flight Type */}
            <div>
              <label
                htmlFor="type"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Lennon tyyppi *
              </label>
              <select
                id="type"
                {...register("type")}
                disabled={isReadOnly}
                className={`w-full border rounded-lg px-4 py-3 text-base transition-all ${
                  errors.type
                    ? "border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    : "border-gray-300 focus:ring-2 focus:ring-sblue focus:border-sblue"
                } ${
                  isReadOnly
                    ? "bg-gray-100 cursor-not-allowed"
                    : "bg-white hover:border-sbluel"
                }`}
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
                <p
                  id="type-error"
                  className="mt-2 text-sm text-red-600 flex items-center gap-1"
                  role="alert"
                >
                  <span className="text-red-500">⚠</span> {errors.type.message}
                </p>
              )}
            </div>

            {/* Title */}
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Otsikko *
              </label>
              <input
                id="title"
                type="text"
                placeholder="Kirjoita varauksen otsikko"
                {...register("title")}
                disabled={isReadOnly}
                className={`w-full border rounded-lg px-4 py-3 text-base transition-all ${
                  errors.title
                    ? "border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    : "border-gray-300 focus:ring-2 focus:ring-sblue focus:border-sblue"
                } ${
                  isReadOnly
                    ? "bg-gray-100 cursor-not-allowed"
                    : "bg-white hover:border-sbluel"
                }`}
                aria-invalid={errors.title ? "true" : "false"}
                aria-describedby={errors.title ? "title-error" : undefined}
              />
              {errors.title && (
                <p
                  id="title-error"
                  className="mt-2 text-sm text-red-600 flex items-center gap-1"
                  role="alert"
                >
                  <span className="text-red-500">⚠</span> {errors.title.message}
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Lennon kuvaus
              </label>
              <textarea
                id="description"
                rows={3}
                placeholder="Kirjoita lisätietoja (valinnainen)"
                {...register("description")}
                disabled={isReadOnly}
                className={`w-full border rounded-lg px-4 py-3 text-base transition-all resize-none ${
                  errors.description
                    ? "border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    : "border-gray-300 focus:ring-2 focus:ring-sblue focus:border-sblue"
                } ${
                  isReadOnly
                    ? "bg-gray-100 cursor-not-allowed"
                    : "bg-white hover:border-sbluel"
                }`}
                aria-invalid={errors.description ? "true" : "false"}
                aria-describedby={
                  errors.description ? "description-error" : undefined
                }
              />
              {errors.description && (
                <p
                  id="description-error"
                  className="mt-2 text-sm text-red-600 flex items-center gap-1"
                  role="alert"
                >
                  <span className="text-red-500">⚠</span>{" "}
                  {errors.description.message}
                </p>
              )}
            </div>

            {/* Guest Contact Information (only for non-logged-in users in create mode) */}
            {isGuestMode && (
              <div className="space-y-4 pt-5 mt-5 border-t-2 border-gray-200">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h3 className="text-base font-semibold text-gray-900 mb-2">
                    Yhteystiedot *
                  </h3>
                  <p className="text-sm text-gray-600">
                    Vierasvaraukseen tarvitaan yhteystietosi, jotta voimme
                    tarvittaessa ottaa yhteyttä.
                  </p>
                </div>

                {/* Contact Name */}
                <div>
                  <label
                    htmlFor="contactName"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Nimi *
                  </label>
                  <input
                    id="contactName"
                    type="text"
                    placeholder="Koko nimesi"
                    {...register("contactName" as any)}
                    className={`w-full border rounded-lg px-4 py-3 text-base transition-all ${
                      (errors as any).contactName
                        ? "border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        : "border-gray-300 focus:ring-2 focus:ring-sblue focus:border-sblue bg-white hover:border-sbluel"
                    }`}
                    aria-invalid={
                      (errors as any).contactName ? "true" : "false"
                    }
                    aria-describedby={
                      (errors as any).contactName
                        ? "contactName-error"
                        : undefined
                    }
                  />
                  {(errors as any).contactName && (
                    <p
                      id="contactName-error"
                      className="mt-2 text-sm text-red-600 flex items-center gap-1"
                      role="alert"
                    >
                      <span className="text-red-500">⚠</span>{" "}
                      {(errors as any).contactName.message}
                    </p>
                  )}
                </div>

                {/* Contact Email */}
                <div>
                  <label
                    htmlFor="contactEmail"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Sähköposti *
                  </label>
                  <input
                    id="contactEmail"
                    type="email"
                    placeholder="esimerkki@email.com"
                    {...register("contactEmail" as any)}
                    className={`w-full border rounded-lg px-4 py-3 text-base transition-all ${
                      (errors as any).contactEmail
                        ? "border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        : "border-gray-300 focus:ring-2 focus:ring-sblue focus:border-sblue bg-white hover:border-sbluel"
                    }`}
                    aria-invalid={
                      (errors as any).contactEmail ? "true" : "false"
                    }
                    aria-describedby={
                      (errors as any).contactEmail
                        ? "contactEmail-error"
                        : undefined
                    }
                  />
                  {(errors as any).contactEmail && (
                    <p
                      id="contactEmail-error"
                      className="mt-2 text-sm text-red-600 flex items-center gap-1"
                      role="alert"
                    >
                      <span className="text-red-500">⚠</span>{" "}
                      {(errors as any).contactEmail.message}
                    </p>
                  )}
                </div>

                {/* Contact Phone */}
                <div>
                  <label
                    htmlFor="contactPhone"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Puhelinnumero *
                  </label>
                  <input
                    id="contactPhone"
                    type="tel"
                    placeholder="+358 40 123 4567"
                    {...register("contactPhone" as any)}
                    className={`w-full border rounded-lg px-4 py-3 text-base transition-all ${
                      (errors as any).contactPhone
                        ? "border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        : "border-gray-300 focus:ring-2 focus:ring-sblue focus:border-sblue bg-white hover:border-sbluel"
                    }`}
                    aria-invalid={
                      (errors as any).contactPhone ? "true" : "false"
                    }
                    aria-describedby={
                      (errors as any).contactPhone
                        ? "contactPhone-error"
                        : undefined
                    }
                  />
                  {(errors as any).contactPhone && (
                    <p
                      id="contactPhone-error"
                      className="mt-2 text-sm text-red-600 flex items-center gap-1"
                      role="alert"
                    >
                      <span className="text-red-500">⚠</span>{" "}
                      {(errors as any).contactPhone.message}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Repeating Bookings (only in create mode) */}
            {mode === "create" && (
              <div className="space-y-4 pt-5 mt-5 border-t-2 border-gray-200">
                <div
                  className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg border border-purple-200 hover:bg-purple-100 transition-colors cursor-pointer"
                  onClick={() => setIsRepeating(!isRepeating)}
                >
                  <input
                    id="is_repeating"
                    type="checkbox"
                    checked={isRepeating}
                    onChange={(e) => setIsRepeating(e.target.checked)}
                    className="w-5 h-5 mt-0.5 text-sblue border-gray-300 rounded focus:ring-2 focus:ring-sblue cursor-pointer"
                  />
                  <div className="flex-1">
                    <label
                      htmlFor="is_repeating"
                      className="text-base font-semibold text-gray-900 cursor-pointer block"
                    >
                      Toistuva varaus
                    </label>
                    <p className="text-sm text-gray-600 mt-1">
                      Varaa sama aika usealle päivälle kerralla
                    </p>
                  </div>
                </div>

                {isRepeating && (
                  <div className="bg-purple-50/50 p-4 rounded-lg border border-purple-200">
                    <label
                      htmlFor="repeat_end_date"
                      className="block text-sm font-semibold text-gray-700 mb-2"
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
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:ring-2 focus:ring-sblue focus:border-sblue bg-white transition-all"
                      required={isRepeating}
                    />
                    <p className="mt-3 text-sm text-gray-600 bg-white p-3 rounded border border-purple-200">
                      <span className="font-medium">Huom:</span> Varaus
                      toistetaan samalla kellonajalla jokaiselle päivälle
                      valitusta aloituspäivästä lopetuspäivään asti.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Booker information (read-only, shown in update and view modes) */}
            {(mode === "update" || mode === "view") && booking.full_name && (
              <div className="space-y-4 pt-5 mt-5 border-t-2 border-gray-200">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <label className="block text-sm font-semibold text-gray-600 mb-2">
                    Varaaja
                  </label>
                  <p className="text-lg font-semibold text-gray-900">
                    {booking.full_name}
                  </p>
                  {booking.is_guest && (
                    <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                      Vierasvaraus
                    </span>
                  )}
                </div>

                {/* Show guest contact info if this is a guest booking and user is admin */}
                {booking.is_guest && isAdmin && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {booking.guest_contact_name && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-1">
                          Vieraan nimi
                        </label>
                        <p className="text-gray-900">
                          {booking.guest_contact_name}
                        </p>
                      </div>
                    )}
                    {booking.guest_contact_email && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-1">
                          Vieraan sähköposti
                        </label>
                        <a
                          href={`mailto:${booking.guest_contact_email}`}
                          className="text-sblue hover:text-sblued underline font-medium transition-colors"
                        >
                          {booking.guest_contact_email}
                        </a>
                      </div>
                    )}
                    {booking.guest_contact_phone && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-1">
                          Vieraan puhelinnumero
                        </label>
                        <a
                          href={`tel:${booking.guest_contact_phone}`}
                          className="text-sblue hover:text-sblued underline font-medium transition-colors"
                        >
                          {booking.guest_contact_phone}
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* Only show regular contact info to logged in users (non-guest bookings) */}
                {!booking.is_guest && isLoggedIn && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {booking.email && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-1">
                          Sähköposti
                        </label>
                        <a
                          href={`mailto:${booking.email}`}
                          className="text-sblue hover:text-sblued underline font-medium transition-colors"
                        >
                          {booking.email}
                        </a>
                      </div>
                    )}

                    {booking.phone && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-1">
                          Puhelinnumero
                        </label>
                        <a
                          href={`tel:${booking.phone}`}
                          className="text-sblue hover:text-sblued underline font-medium transition-colors"
                        >
                          {booking.phone}
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </form>
        </Modal>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <Modal
            title={
              <div className="text-xl font-semibold text-red-600">
                Vahvista poisto
              </div>
            }
            open={showDeleteConfirm}
            onCancel={() => {
              setShowDeleteConfirm(false);
              setDeleteFollowing(false);
            }}
            centered
            className="delete-confirm-modal"
            footer={
              <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-2 sm:justify-end w-full pt-4 border-t border-gray-200">
                <Button
                  key="cancel"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteFollowing(false);
                  }}
                  disabled={isSubmitting}
                  size="large"
                  className="w-full sm:w-auto rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Peruuta
                </Button>
                <Button
                  key="confirm"
                  type="primary"
                  danger
                  onClick={confirmDelete}
                  loading={isSubmitting}
                  size="large"
                  className="w-full sm:w-auto rounded-lg font-medium bg-red-600 hover:bg-red-700 transition-colors shadow-md"
                >
                  {deleteFollowing && hasRepeatGroup
                    ? "Poista valitut varaukset"
                    : "Poista varaus"}
                </Button>
              </div>
            }
          >
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-gray-900 font-medium">
                  Haluatko varmasti poistaa varauksen{" "}
                  <span className="font-bold text-red-700">
                    "{booking.title}"
                  </span>
                  ?
                </p>
              </div>

              {hasRepeatGroup && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div
                    className="flex items-start gap-3 cursor-pointer"
                    onClick={() => setDeleteFollowing(!deleteFollowing)}
                  >
                    <input
                      id="delete_following"
                      type="checkbox"
                      checked={deleteFollowing}
                      onChange={(e) => setDeleteFollowing(e.target.checked)}
                      className="mt-1 w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-2 focus:ring-red-500 cursor-pointer"
                    />
                    <label
                      htmlFor="delete_following"
                      className="text-sm text-gray-700 cursor-pointer flex-1"
                    >
                      <span className="font-semibold text-gray-900 block mb-1">
                        Poista myös kaikki seuraavat toistuvat varaukset
                      </span>
                      <p className="text-xs text-gray-600">
                        Tämä varaus on osa toistuvaa varausta. Valitsemalla
                        tämän vaihtoehdon poistat myös kaikki tästä päivästä
                        eteenpäin olevat varaukset samassa sarjassa.
                      </p>
                    </label>
                  </div>
                </div>
              )}

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-gray-700 flex items-center gap-2">
                  <span className="text-yellow-600 text-lg">⚠</span>
                  <span className="font-medium">
                    Tätä toimintoa ei voi peruuttaa.
                  </span>
                </p>
              </div>
            </div>
          </Modal>
        )}
      </>
    );
  }
);

BookingModal.displayName = "BookingModal";

export default BookingModal;
