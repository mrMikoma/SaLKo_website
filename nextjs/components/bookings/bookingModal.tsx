"use client";

import { useEffect, useState, memo, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DateTime } from "@/utilities/clubTime";
import { Modal, Button } from "antd";
import { BookingType, BookingConflict } from "@/utilities/bookings";
import type {
  SaveBookingRequest,
  SaveBookingOutcome,
} from "@/hooks/useBookings";
import { FLIGHT_TYPE_CONFIGS } from "@/types/bookings";
import {
  bookingSchema,
  BookingFormValues,
  guestBookingSchema,
  GuestBookingFormValues,
} from "@/schemas/bookingSchema";
import { isFullDayBooking } from "@/utilities/bookingHelpers";
import BookingCalendarLinks from "@/components/bookings/BookingCalendarLinks";

interface BookingModalProps {
  mode: "create" | "update" | "view";
  booking: BookingType;
  onSave: (request: SaveBookingRequest) => Promise<SaveBookingOutcome>;
  onDelete: (deleteFollowing?: boolean) => Promise<void>;
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
    // Server answers to the last save: an error, or bookings that overlap
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [conflicts, setConflicts] = useState<BookingConflict[] | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    // A new booking that was saved: the modal then offers the calendar links
    const [saved, setSaved] = useState<{
      booking: BookingType;
      count?: number;
    } | null>(null);
    // Full-day booking state: when true, show date-only pickers and store midnight times
    const [isFullDay, setIsFullDay] = useState(() => isFullDayBooking(booking));
    const [fullDayStart, setFullDayStart] = useState(() =>
      booking.start_time
        ? DateTime.fromISO(booking.start_time).toLocal().toISODate() || ""
        : ""
    );
    const [fullDayEnd, setFullDayEnd] = useState(() => {
      if (!booking.end_time) return "";
      const end = DateTime.fromISO(booking.end_time).toLocal();
      // End is stored as midnight of the day AFTER the last booked day
      return isFullDayBooking(booking)
        ? end.minus({ days: 1 }).toISODate() || ""
        : end.toISODate() || "";
    });
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
      control,
    } = useForm<BookingFormValues | GuestBookingFormValues>({
      resolver: zodResolver(schema),
      defaultValues: defaultFormValues,
    });

    // Handler to update end_time when start_time changes
    const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setConflicts(null);
      const newStartTime = e.target.value;
      if (newStartTime) {
        const startDateTime = DateTime.fromISO(newStartTime);
        const currentEndTime = getValues("end_time");

        // Only auto-update end_time if it's before or equal to the new start_time
        // This avoids clobbering a multi-day end_time the user intentionally set
        if (!currentEndTime || DateTime.fromISO(currentEndTime) <= startDateTime) {
          const endDateTime = startDateTime.minute === 0
            ? startDateTime.plus({ hours: 1 })
            : startDateTime.plus({ hours: 1 }).startOf("hour");
          setValue("end_time", endDateTime.toFormat("yyyy-MM-dd'T'HH:mm"), {
            shouldDirty: true,
          });
        }
      }
    };

    const handleEndTimeChange = () => {
      setConflicts(null);
    };

    // When "Toistuva varaus" is enabled after picking an end on a later day,
    // take that day as the repeat end date and make the booking itself a
    // same-day slot. The repeat end date is never written into end_time, so
    // turning repeat off again leaves a normal one-day booking.
    useEffect(() => {
      if (isRepeating && !repeatEndDate) {
        const endTime = getValues("end_time");
        const startTime = getValues("start_time");
        if (endTime && startTime) {
          const endDate = DateTime.fromISO(endTime);
          const startDate = DateTime.fromISO(startTime);
          if (endDate.toISODate() !== startDate.toISODate()) {
            const endDateStr = endDate.toFormat("yyyy-MM-dd");
            if (endDateStr) setRepeatEndDate(endDateStr);
            setValue(
              "end_time",
              `${startDate.toFormat("yyyy-MM-dd")}T${endDate.toFormat("HH:mm")}`,
              { shouldDirty: true }
            );
          }
        }
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isRepeating]);

    // Full-day booking handlers
    const handleFullDayToggle = () => {
      const newIsFullDay = !isFullDay;
      setIsFullDay(newIsFullDay);

      if (newIsFullDay) {
        const currentStart = getValues("start_time");
        const startDate = currentStart
          ? DateTime.fromISO(currentStart).toISODate()
          : DateTime.now().toISODate();
        const nextDay = startDate
          ? DateTime.fromISO(startDate).plus({ days: 1 }).toISODate()
          : null;
        setFullDayStart(startDate || "");
        setFullDayEnd(startDate || "");
        setValue("start_time", `${startDate}T00:00`, { shouldDirty: true });
        if (nextDay) setValue("end_time", `${nextDay}T00:00`, { shouldDirty: true });
        // Full-day and repeating are mutually exclusive
        setIsRepeating(false);
      } else {
        // Restore to default hourly times on the same start date
        const startDate = fullDayStart || DateTime.now().toISODate();
        setValue("start_time", `${startDate}T09:00`, { shouldDirty: true });
        setValue("end_time", `${startDate}T10:00`, { shouldDirty: true });
      }
    };

    const handleFullDayStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newStart = e.target.value;
      setFullDayStart(newStart);
      if (newStart) {
        setValue("start_time", `${newStart}T00:00`, { shouldDirty: true });
        // If end date is before new start date, push it forward
        if (fullDayEnd < newStart) {
          setFullDayEnd(newStart);
          const nextDay = DateTime.fromISO(newStart).plus({ days: 1 }).toISODate();
          if (nextDay) setValue("end_time", `${nextDay}T00:00`, { shouldDirty: true });
        }
      }
    };

    const handleFullDayEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newEnd = e.target.value; // "last day" the plane is booked
      setFullDayEnd(newEnd);
      if (newEnd) {
        // Store end as midnight of the day AFTER the last booked day
        const nextDay = DateTime.fromISO(newEnd).plus({ days: 1 }).toISODate();
        if (nextDay) setValue("end_time", `${nextDay}T00:00`, { shouldDirty: true });
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

    const onSubmitHandler = async (allowOverlap = false) => {
      setSubmitError(null);
      setConflicts(null);

      if (isRepeating && !repeatEndDate) {
        setSubmitError("Valitse toiston lopetuspäivä");
        return;
      }

      setIsSubmitting(true);
      try {
        const formValues = getValues();

        // datetime-local gives club time without an offset ("2024-01-15T14:00");
        // the server stores UTC
        const startTimeISO = formValues.start_time
          ? DateTime.fromISO(formValues.start_time).toUTC().toISO()
          : booking.start_time;
        const endTimeISO = formValues.end_time
          ? DateTime.fromISO(formValues.end_time).toUTC().toISO()
          : booking.end_time;

        const updatedBooking: BookingType = {
          ...booking,
          plane: formValues.plane,
          type: formValues.type,
          title: formValues.title,
          description: formValues.description || "",
          start_time: startTimeISO || "",
          end_time: endTimeISO || "",
        };

        // Sync the updated values to parent (for display purposes)
        onChange(updatedBooking);

        const outcome = await onSave({
          booking: updatedBooking,
          repeatEndDate:
            mode === "create" && isRepeating ? repeatEndDate : undefined,
          guestContact: isGuestMode
            ? {
                contactName: (formValues as GuestBookingFormValues).contactName,
                contactEmail: (formValues as GuestBookingFormValues).contactEmail,
                contactPhone: (formValues as GuestBookingFormValues).contactPhone,
              }
            : undefined,
          allowOverlap,
        });

        if (outcome.status === "success") {
          if (mode === "create") {
            setSaved({
              booking: { ...updatedBooking, id: outcome.result.id },
              count: outcome.result.count,
            });
          } else {
            onCancel();
          }
        } else if (outcome.status === "conflict") {
          setConflicts(outcome.conflicts);
        } else {
          setSubmitError(outcome.error);
        }
      } catch (error) {
        console.error("Error saving booking:", error);
        setSubmitError(
          "Tallennus epäonnistui. Tarkista verkkoyhteys ja yritä uudelleen."
        );
      } finally {
        setIsSubmitting(false);
      }
    };

    const handleDeleteClick = () => {
      setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
      setIsSubmitting(true);
      setDeleteError(null);
      try {
        await onDelete(deleteFollowing);
        setShowDeleteConfirm(false);
      } catch (error) {
        console.error("Error deleting booking:", error);
        setDeleteError(
          error instanceof Error && error.message
            ? error.message
            : "Varauksen poisto epäonnistui"
        );
      } finally {
        setIsSubmitting(false);
      }
    };

    if (saved) {
      const start = DateTime.fromISO(saved.booking.start_time);
      const end = DateTime.fromISO(saved.booking.end_time);
      return (
        <Modal
          title={
            <div className="text-xl font-semibold text-gray-900">
              Varaus tallennettu
            </div>
          }
          open={true}
          onCancel={onCancel}
          centered
          width={640}
          className="booking-modal"
          footer={
            <div className="flex justify-end w-full pt-4 border-t border-gray-200">
              <Button
                type="primary"
                size="large"
                onClick={onCancel}
                className="w-full sm:w-auto rounded-lg font-medium"
              >
                Valmis
              </Button>
            </div>
          }
        >
          <div className="space-y-5">
            <div className="rounded-xl p-4 border border-green-200 bg-green-50">
              <p className="text-lg font-semibold text-gray-900">
                {saved.booking.plane}: {saved.booking.title}
              </p>
              <p className="text-gray-700 mt-1">
                {start.setLocale("fi").toFormat("ccc d.M.yyyy HH:mm")}
                {" – "}
                {end.hasSame(start, "day")
                  ? end.toFormat("HH:mm")
                  : end.setLocale("fi").toFormat("ccc d.M.yyyy HH:mm")}
              </p>
              {saved.count && saved.count > 1 && (
                <p className="text-sm text-gray-600 mt-1">
                  Toistuu {saved.count} päivänä
                </p>
              )}
            </div>
            <BookingCalendarLinks
              booking={saved.booking}
              isLoggedIn={isLoggedIn}
              seriesCount={saved.count}
            />
          </div>
        </Modal>
      );
    }

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
                  <Button
                    key="submit"
                    type="primary"
                    size="large"
                    className="bg-gradient-to-r from-sblue to-sblued hover:opacity-90 transition-opacity w-full sm:w-auto rounded-lg font-medium shadow-md disabled:opacity-50"
                    onClick={handleSubmit(() => onSubmitHandler(conflicts !== null))}
                    loading={isSubmitting}
                    disabled={isSubmitting || (mode === "update" && !isDirty)}
                  >
                    {conflicts
                      ? "Varaa silti"
                      : mode === "create"
                      ? "Tallenna"
                      : "Päivitä"}
                  </Button>
                </>
              )}
            </div>
          }
        >
          <form
            onSubmit={handleSubmit(() => onSubmitHandler(conflicts !== null))}
            className="space-y-5"
          >
            {/* Plane Display/Info */}
            <div className="bg-gradient-to-r from-sbluel/10 to-sblued/10 rounded-xl p-4 border border-sbluel/30">
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Lentokone
              </label>
              <p className="text-2xl font-bold text-sblued">{booking.plane}</p>
            </div>

            {/* View mode: show full-day badge */}
            {isReadOnly && isFullDayBooking(booking) && (
              <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 rounded-lg border border-orange-200">
                <span className="text-orange-600 font-semibold text-sm">Koko päivä -varaus</span>
              </div>
            )}

            {/* Start Date/Time */}
            <div>
              <label
                htmlFor={isFullDay ? "full_day_start" : "start_time"}
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                {isFullDay ? "Aloituspäivä *" : "Aloitusaika *"}
              </label>
              {isFullDay ? (
                <input
                  id="full_day_start"
                  type="date"
                  value={fullDayStart}
                  onChange={handleFullDayStartChange}
                  disabled={isReadOnly}
                  className={`w-full border rounded-lg px-4 py-3 text-base transition-all border-gray-300 focus:ring-2 focus:ring-sblue focus:border-sblue ${isReadOnly ? "bg-gray-100 cursor-not-allowed" : "bg-white hover:border-sbluel"}`}
                />
              ) : (
                <>
                  <Controller
                    name="start_time"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        id="start_time"
                        type="datetime-local"
                        step="3600"
                        value={field.value ?? ""}
                        onChange={(e) => {
                          field.onChange(e.target.value);
                          handleStartTimeChange(e);
                        }}
                        disabled={isReadOnly}
                        className={`w-full border rounded-lg px-4 py-3 text-base transition-all ${
                          errors.start_time
                            ? "border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                            : "border-gray-300 focus:ring-2 focus:ring-sblue focus:border-sblue"
                        } ${isReadOnly ? "bg-gray-100 cursor-not-allowed" : "bg-white hover:border-sbluel"}`}
                        aria-invalid={errors.start_time ? "true" : "false"}
                        aria-describedby={errors.start_time ? "start_time-error" : undefined}
                      />
                    )}
                  />
                  {errors.start_time && (
                    <p id="start_time-error" className="mt-2 text-sm text-red-600 flex items-center gap-1" role="alert">
                      <span className="text-red-500">⚠</span> {errors.start_time.message}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* End Date/Time */}
            <div>
              <label
                htmlFor={isFullDay ? "full_day_end" : "end_time"}
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                {isFullDay ? "Lopetuspäivä *" : "Lopetusaika *"}
              </label>
              {isFullDay ? (
                <>
                  <input
                    id="full_day_end"
                    type="date"
                    value={fullDayEnd}
                    min={fullDayStart}
                    onChange={handleFullDayEndChange}
                    disabled={isReadOnly}
                    className={`w-full border rounded-lg px-4 py-3 text-base transition-all border-gray-300 focus:ring-2 focus:ring-sblue focus:border-sblue ${isReadOnly ? "bg-gray-100 cursor-not-allowed" : "bg-white hover:border-sbluel"}`}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Kone on varattuna koko tämä päivä mukaan lukien.
                  </p>
                </>
              ) : (
                <>
                  <Controller
                    name="end_time"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        id="end_time"
                        type="datetime-local"
                        step="3600"
                        value={field.value ?? ""}
                        onChange={(e) => {
                          field.onChange(e.target.value);
                          handleEndTimeChange();
                        }}
                        disabled={isReadOnly}
                        className={`w-full border rounded-lg px-4 py-3 text-base transition-all ${
                          errors.end_time
                            ? "border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                            : "border-gray-300 focus:ring-2 focus:ring-sblue focus:border-sblue"
                        } ${isReadOnly ? "bg-gray-100 cursor-not-allowed" : "bg-white hover:border-sbluel"}`}
                        aria-invalid={errors.end_time ? "true" : "false"}
                        aria-describedby={errors.end_time ? "end_time-error" : undefined}
                      />
                    )}
                  />
                  {errors.end_time && (
                    <p id="end_time-error" className="mt-2 text-sm text-red-600 flex items-center gap-1" role="alert">
                      <span className="text-red-500">⚠</span> {errors.end_time.message}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Full Day Checkbox (not available in view mode or guest mode) */}
            {!isReadOnly && !isGuestMode && (
              <label className="flex items-center gap-2 cursor-pointer w-fit">
                <input
                  id="is_full_day"
                  type="checkbox"
                  checked={isFullDay}
                  onChange={handleFullDayToggle}
                  className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-2 focus:ring-orange-400 cursor-pointer"
                />
                <span className="text-sm text-gray-700 select-none">
                  Koko päivä
                </span>
              </label>
            )}

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

            {/* Repeating Bookings (members creating a booking, not full-day) */}
            {mode === "create" && !isFullDay && !isGuestMode && (
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
                      onChange={(e) => {
                        setRepeatEndDate(e.target.value);
                        setConflicts(null);
                      }}
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
                    {booking.is_guest
                      ? booking.guest_contact_name || "Vieras"
                      : booking.full_name}
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

            {mode !== "create" && isLoggedIn && booking.id >= 0 && (
              <div className="pt-5 mt-5 border-t-2 border-gray-200">
                <BookingCalendarLinks booking={booking} isLoggedIn={isLoggedIn} />
              </div>
            )}

            {conflicts && conflicts.length > 0 && (
              <div
                className="rounded-lg border border-orange-300 bg-orange-50 p-4 space-y-2"
                role="alert"
              >
                <p className="font-semibold text-orange-900">
                  {booking.plane} on jo varattu tähän aikaan
                </p>
                <ul className="text-sm text-orange-900 space-y-1">
                  {conflicts.map((conflict) => (
                    <li key={conflict.id}>
                      {DateTime.fromISO(conflict.start_time).toFormat("d.M. HH:mm")}
                      {" – "}
                      {DateTime.fromISO(conflict.end_time).toFormat("d.M. HH:mm")}
                      {": "}
                      {conflict.title}
                      {conflict.booker && ` (${conflict.booker})`}
                    </li>
                  ))}
                </ul>
                <p className="text-sm text-orange-800">
                  Voit tallentaa päällekkäisen varauksen, jos olet sopinut
                  asiasta varaajan kanssa.
                </p>
              </div>
            )}

            {submitError && (
              <div
                className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800"
                role="alert"
              >
                {submitError}
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
                    &quot;{booking.title}&quot;
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

              {deleteError && (
                <div
                  className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800"
                  role="alert"
                >
                  {deleteError}
                </div>
              )}
            </div>
          </Modal>
        )}
      </>
    );
  }
);

BookingModal.displayName = "BookingModal";

export default BookingModal;
