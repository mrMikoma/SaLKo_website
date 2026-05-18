"use client"

import { useState, useEffect, useCallback } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Alert, Spin } from "antd"
import {
  flightLogSchema,
  type FlightLogFormData,
} from "@/schemas/flightLogSchema"
import {
  logFlight,
  getAircraft,
  getAircraftLatestHobbs,
} from "@/utilities/flightLogs"
import type { Aircraft } from "@/types/flightLog"
import {
  FLIGHT_LOG_TYPE_LABELS,
  type FlightLogType,
  formatFlightTime,
  formatCurrency,
} from "@/types/flightLog"
import airfieldsData from "@/data/airfields.json"

const FLIGHT_TYPES = Object.entries(FLIGHT_LOG_TYPE_LABELS) as [
  FlightLogType,
  string,
][]
const AIRFIELDS = airfieldsData as { code: string; name: string; home?: boolean }[]
const STEPS = ["Kone", "Hobbs", "Tiedot", "Vahvista"] as const

type Step = 1 | 2 | 3 | 4

interface HobbsStepperProps {
  value: number
  onChange: (v: number) => void
  label: string
  hint?: string
  error?: string
}

function HobbsStepper({ value, onChange, label, hint, error }: HobbsStepperProps) {
  const handleDelta = (delta: number) => {
    const next = Math.round((value + delta) * 10) / 10
    if (next >= 0 && next <= 99999.9) onChange(next)
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">
        {label} <span className="text-red-500">*</span>
      </label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => handleDelta(-0.1)}
          className="w-12 h-12 rounded-lg border-2 border-sgrey text-xl font-bold bg-white hover:bg-gray-50 active:bg-gray-100 select-none"
        >
          −
        </button>
        <input
          type="number"
          step="0.1"
          min="0"
          max="99999.9"
          value={value || ""}
          onChange={(e) => {
            const v = parseFloat(e.target.value)
            if (!isNaN(v)) onChange(Math.round(v * 10) / 10)
          }}
          className="flex-1 h-12 text-center text-lg font-mono border-2 border-sgrey rounded-lg focus:border-sblue focus:outline-none"
          inputMode="decimal"
          placeholder="0.0"
        />
        <button
          type="button"
          onClick={() => handleDelta(0.1)}
          className="w-12 h-12 rounded-lg border-2 border-sgrey text-xl font-bold bg-white hover:bg-gray-50 active:bg-gray-100 select-none"
        >
          +
        </button>
      </div>
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

interface AirfieldPickerProps {
  value?: string
  onChange: (code: string) => void
  label: string
  error?: string
}

function AirfieldPicker({ value, onChange, label, error }: AirfieldPickerProps) {
  const [custom, setCustom] = useState(
    Boolean(value && !AIRFIELDS.find((a) => a.code === value))
  )

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="flex flex-wrap gap-2">
        {AIRFIELDS.map((af) => (
          <button
            key={af.code}
            type="button"
            onClick={() => {
              onChange(af.code)
              setCustom(false)
            }}
            className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
              value === af.code && !custom
                ? "border-sblue bg-sblue text-white"
                : "border-sgrey bg-white text-gray-700 hover:border-sblue"
            }`}
          >
            {af.code}
            {af.home && (
              <span className="ml-1 text-xs opacity-75">(koti)</span>
            )}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            setCustom(true)
            onChange("")
          }}
          className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
            custom
              ? "border-sblue bg-sblue text-white"
              : "border-sgrey bg-white text-gray-700 hover:border-sblue"
          }`}
        >
          Muu...
        </button>
      </div>
      {custom && (
        <input
          type="text"
          value={value || ""}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          placeholder="esim. EFJO tai LP"
          maxLength={7}
          className="h-11 px-3 border-2 border-sgrey rounded-lg focus:border-sblue focus:outline-none uppercase tracking-widest font-mono"
        />
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

interface Props {
  onSuccess?: () => void
}

export default function FlightLogForm({ onSuccess }: Props) {
  const [step, setStep] = useState<Step>(1)
  const [aircraft, setAircraft] = useState<Aircraft[]>([])
  const [aircraftLoading, setAircraftLoading] = useState(true)
  const [hobbsLoading, setHobbsLoading] = useState(false)
  const [latestHobbs, setLatestHobbs] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    trigger,
    reset,
    formState: { errors },
  } = useForm<FlightLogFormData>({
    resolver: zodResolver(flightLogSchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      flightType: "local",
      hobbsStart: 0,
      hobbsEnd: 0,
      landings: 1,
    },
  })

  const selectedAircraft = watch("aircraftRegistration")
  const hobbsStart = watch("hobbsStart")
  const hobbsEnd = watch("hobbsEnd")

  const flightMinutes =
    hobbsEnd != null && hobbsEnd > hobbsStart
      ? Math.round((hobbsEnd - hobbsStart) * 60)
      : 0

  const selectedAircraftData = aircraft.find(
    (a) => a.registration === selectedAircraft
  )
  const estimatedCost = selectedAircraftData
    ? flightMinutes * selectedAircraftData.minuteRate
    : 0

  useEffect(() => {
    getAircraft()
      .then(setAircraft)
      .finally(() => setAircraftLoading(false))
  }, [])

  const selectAircraft = useCallback(
    async (reg: string) => {
      setValue("aircraftRegistration", reg)
      setHobbsLoading(true)
      try {
        const hobbs = await getAircraftLatestHobbs(reg)
        setLatestHobbs(hobbs)
        if (hobbs !== null) {
          setValue("hobbsStart", hobbs)
          setValue("hobbsEnd", hobbs)
        }
      } finally {
        setHobbsLoading(false)
      }
    },
    [setValue]
  )

  const nextStep = async () => {
    const fieldsByStep: Record<number, (keyof FlightLogFormData)[]> = {
      1: ["aircraftRegistration"],
      2: ["hobbsStart", "hobbsEnd"],
      3: ["date", "flightType"],
    }
    const ok = await trigger(fieldsByStep[step] || [])
    if (ok) setStep((s) => (s + 1) as Step)
  }

  const onSubmit = async (data: FlightLogFormData) => {
    setSubmitting(true)
    setSubmitError(null)
    try {
      const result = await logFlight(data)
      if (result.status === "success") {
        setSuccess(true)
        onSuccess?.()
      } else {
        setSubmitError(result.error || "Lennon kirjaus epäonnistui")
        setStep(2)
      }
    } catch {
      setSubmitError("Odottamaton virhe tapahtui")
    } finally {
      setSubmitting(false)
    }
  }

  const onSubmitValidationError = (errs: typeof errors) => {
    if (errs.aircraftRegistration) setStep(1)
    else if (errs.hobbsStart || errs.hobbsEnd) setStep(2)
    else if (errs.date || errs.flightType) setStep(3)
  }


  if (success) {
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-3xl">
          ✓
        </div>
        <h3 className="text-lg font-semibold">Lento kirjattu!</h3>
        <p className="text-gray-500">
          {formatFlightTime(flightMinutes)} · {formatCurrency(estimatedCost)}
        </p>
        <button
          onClick={() => {
            setSuccess(false)
            setStep(1)
            setLatestHobbs(null)
            reset({
              date: new Date().toISOString().split("T")[0],
              flightType: "local",
              hobbsStart: 0,
              hobbsEnd: 0,
              landings: 1,
            })
          }}
          className="mt-2 px-6 py-3 bg-sblue text-white rounded-xl hover:bg-sblued transition-colors font-medium"
        >
          Kirjaa uusi lento
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit, onSubmitValidationError)} className="flex flex-col gap-6">
      {/* Step indicator */}
      <div className="flex items-center">
        {STEPS.map((label, i) => {
          const n = (i + 1) as Step
          const done = step > n
          const active = step === n
          return (
            <div key={label} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${
                    done
                      ? "bg-sblue border-sblue text-white"
                      : active
                        ? "bg-white border-sblue text-sblue"
                        : "bg-white border-gray-300 text-gray-400"
                  }`}
                >
                  {done ? "✓" : n}
                </div>
                <span
                  className={`text-xs hidden sm:block ${active ? "text-sblue font-medium" : "text-gray-400"}`}
                >
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-1 ${done ? "bg-sblue" : "bg-gray-200"}`}
                />
              )}
            </div>
          )
        })}
      </div>

      {submitError && (
        <Alert
          message={submitError}
          type="error"
          showIcon
          closable
          onClose={() => setSubmitError(null)}
        />
      )}

      {/* Step 1: Aircraft */}
      {step === 1 && (
        <div className="flex flex-col gap-4">
          <h3 className="text-base font-semibold text-gray-700">
            Valitse lentokone
          </h3>
          {aircraftLoading ? (
            <div className="flex justify-center py-8">
              <Spin />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {aircraft.map((ac) => (
                <button
                  key={ac.registration}
                  type="button"
                  onClick={() => selectAircraft(ac.registration)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    selectedAircraft === ac.registration
                      ? "border-sblue bg-blue-50"
                      : "border-sgrey bg-white hover:border-sblue"
                  }`}
                >
                  <div className="text-xl font-bold font-mono text-sblued">
                    {ac.registration}
                  </div>
                  <div className="text-sm text-gray-500 mt-0.5">{ac.name}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {ac.minuteRate.toFixed(2)} €/min
                  </div>
                </button>
              ))}
            </div>
          )}
          {errors.aircraftRegistration && (
            <p className="text-sm text-red-500">
              {errors.aircraftRegistration.message}
            </p>
          )}
          <button
            type="button"
            onClick={nextStep}
            disabled={!selectedAircraft}
            className="w-full h-12 bg-sblue text-white font-medium rounded-xl hover:bg-sblued disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Jatka
          </button>
        </div>
      )}

      {/* Step 2: Hobbs */}
      {step === 2 && (
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-700">
              Hobbs-lukemat
            </h3>
            <span className="text-sm font-mono text-sblued bg-blue-50 px-2 py-0.5 rounded">
              {selectedAircraft}
            </span>
          </div>

          {hobbsLoading ? (
            <div className="flex justify-center py-6">
              <Spin size="small" />
            </div>
          ) : (
            <>
              <Controller
                name="hobbsStart"
                control={control}
                render={({ field }) => (
                  <HobbsStepper
                    value={field.value}
                    onChange={field.onChange}
                    label="Hobbs aloitus"
                    hint={
                      latestHobbs !== null
                        ? `Edellinen kirjaus: ${latestHobbs.toFixed(1)}`
                        : undefined
                    }
                    error={errors.hobbsStart?.message}
                  />
                )}
              />

              <Controller
                name="hobbsEnd"
                control={control}
                render={({ field }) => (
                  <HobbsStepper
                    value={field.value}
                    onChange={field.onChange}
                    label="Hobbs lopetus"
                    error={errors.hobbsEnd?.message}
                  />
                )}
              />

              {flightMinutes > 0 && (
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-sblue">
                    {formatFlightTime(flightMinutes)}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    ≈ {formatCurrency(estimatedCost)}
                  </div>
                </div>
              )}
            </>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 h-12 border-2 border-sgrey text-gray-700 font-medium rounded-xl hover:border-gray-400 transition-colors"
            >
              Takaisin
            </button>
            <button
              type="button"
              onClick={nextStep}
              className="flex-1 h-12 bg-sblue text-white font-medium rounded-xl hover:bg-sblued transition-colors"
            >
              Jatka
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Flight details */}
      {step === 3 && (
        <div className="flex flex-col gap-5">
          <h3 className="text-base font-semibold text-gray-700">
            Lennon tiedot
          </h3>

          {/* Flight type */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">
              Lentotyyppi <span className="text-red-500">*</span>
            </label>
            <Controller
              name="flightType"
              control={control}
              render={({ field }) => (
                <div className="flex flex-wrap gap-2">
                  {FLIGHT_TYPES.map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => field.onChange(value)}
                      className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                        field.value === value
                          ? "border-sblue bg-sblue text-white"
                          : "border-sgrey bg-white text-gray-700 hover:border-sblue"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            />
          </div>

          {/* Date */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Päivämäärä <span className="text-red-500">*</span>
            </label>
            <Controller
              name="date"
              control={control}
              render={({ field }) => (
                <input
                  type="date"
                  max={new Date().toISOString().split("T")[0]}
                  value={field.value}
                  onChange={field.onChange}
                  className="h-12 px-3 border-2 border-sgrey rounded-xl focus:border-sblue focus:outline-none text-base"
                />
              )}
            />
            {errors.date && (
              <p className="text-xs text-red-500">{errors.date.message}</p>
            )}
          </div>

          {/* Airports */}
          <Controller
            name="departureIcao"
            control={control}
            render={({ field }) => (
              <AirfieldPicker
                value={field.value || ""}
                onChange={field.onChange}
                label="Lähtökenttä"
                error={errors.departureIcao?.message}
              />
            )}
          />

          <Controller
            name="arrivalIcao"
            control={control}
            render={({ field }) => (
              <AirfieldPicker
                value={field.value || ""}
                onChange={field.onChange}
                label="Kohdekenttä"
                error={errors.arrivalIcao?.message}
              />
            )}
          />

          {/* Landings */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Laskeutumiset
            </label>
            <Controller
              name="landings"
              control={control}
              render={({ field }) => (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      field.onChange(Math.max(0, (field.value || 0) - 1))
                    }
                    className="w-12 h-12 rounded-lg border-2 border-sgrey text-xl font-bold bg-white hover:bg-gray-50 active:bg-gray-100"
                  >
                    −
                  </button>
                  <div className="flex-1 h-12 flex items-center justify-center text-lg font-bold border-2 border-sgrey rounded-lg bg-gray-50">
                    {field.value ?? 0}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      field.onChange(Math.min(99, (field.value || 0) + 1))
                    }
                    className="w-12 h-12 rounded-lg border-2 border-sgrey text-xl font-bold bg-white hover:bg-gray-50 active:bg-gray-100"
                  >
                    +
                  </button>
                </div>
              )}
            />
          </div>

          {/* Remarks */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Huomautukset
            </label>
            <Controller
              name="remarks"
              control={control}
              render={({ field }) => (
                <textarea
                  {...field}
                  rows={3}
                  maxLength={500}
                  placeholder="Vapaaehtoisia huomautuksia lennosta..."
                  className="px-3 py-2 border-2 border-sgrey rounded-xl focus:border-sblue focus:outline-none text-sm resize-none"
                />
              )}
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex-1 h-12 border-2 border-sgrey text-gray-700 font-medium rounded-xl hover:border-gray-400 transition-colors"
            >
              Takaisin
            </button>
            <button
              type="button"
              onClick={nextStep}
              className="flex-1 h-12 bg-sblue text-white font-medium rounded-xl hover:bg-sblued transition-colors"
            >
              Jatka
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Confirm */}
      {step === 4 && (
        <div className="flex flex-col gap-5">
          <h3 className="text-base font-semibold text-gray-700">
            Vahvista kirjaus
          </h3>

          <div className="bg-gray-50 rounded-xl divide-y divide-gray-100 border border-sgrey">
            {(
              [
                ["Lentokone", getValues("aircraftRegistration")],
                [
                  "Hobbs",
                  `${getValues("hobbsStart")?.toFixed(1)} → ${getValues("hobbsEnd")?.toFixed(1)}`,
                ],
                ["Kesto", formatFlightTime(flightMinutes)],
                ["Arvioitu hinta", formatCurrency(estimatedCost)],
                [
                  "Tyyppi",
                  FLIGHT_LOG_TYPE_LABELS[getValues("flightType")],
                ],
                ["Päivämäärä", getValues("date")],
                [
                  "Reitti",
                  [getValues("departureIcao"), getValues("arrivalIcao")]
                    .filter(Boolean)
                    .join(" → ") || "—",
                ],
                ["Laskeutumiset", String(getValues("landings") ?? "—")],
                ["Huomautukset", getValues("remarks") || "—"],
              ] as [string, string][]
            ).map(([label, value]) => (
              <div
                key={label}
                className="flex justify-between py-2.5 px-4 text-sm"
              >
                <span className="text-gray-500">{label}</span>
                <span className="font-medium text-right max-w-[60%]">
                  {value}
                </span>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="flex-1 h-12 border-2 border-sgrey text-gray-700 font-medium rounded-xl hover:border-gray-400 transition-colors"
            >
              Takaisin
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 h-12 bg-sblue text-white font-medium rounded-xl hover:bg-sblued disabled:opacity-50 transition-colors"
            >
              {submitting ? "Kirjataan..." : "Kirjaa lento"}
            </button>
          </div>
        </div>
      )}
    </form>
  )
}
