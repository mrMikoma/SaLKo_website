"use client"

import { useState } from "react"
import { Modal, Alert } from "antd"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  flightLogEditSchema,
  type FlightLogEditFormData,
} from "@/schemas/flightLogSchema"
import { editFlightLog } from "@/utilities/flightLogs"
import {
  FLIGHT_LOG_TYPE_LABELS,
  type FlightLogType,
  type FlightWithBilling,
} from "@/types/flightLog"
import airfieldsData from "@/data/airfields.json"

const FLIGHT_TYPES = Object.entries(FLIGHT_LOG_TYPE_LABELS) as [
  FlightLogType,
  string,
][]
const AIRFIELDS = airfieldsData as { code: string; name: string; home?: boolean }[]

interface AirfieldPickerProps {
  value?: string
  onChange: (code: string) => void
  label: string
}

function AirfieldPicker({ value, onChange, label }: AirfieldPickerProps) {
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
            className={`px-2.5 py-1.5 rounded-lg border-2 text-xs font-medium transition-colors ${
              value === af.code && !custom
                ? "border-sblue bg-sblue text-white"
                : "border-sgrey bg-white text-gray-700 hover:border-sblue"
            }`}
          >
            {af.code}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            setCustom(true)
            onChange("")
          }}
          className={`px-2.5 py-1.5 rounded-lg border-2 text-xs font-medium transition-colors ${
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
          placeholder="esim. EFJO"
          maxLength={7}
          className="h-10 px-3 border-2 border-sgrey rounded-lg focus:border-sblue focus:outline-none uppercase tracking-widest font-mono text-sm"
        />
      )}
    </div>
  )
}

interface Props {
  flight: FlightWithBilling
  open: boolean
  onClose: () => void
  onSaved: () => void
}

export default function FlightLogEditModal({
  flight,
  open,
  onClose,
  onSaved,
}: Props) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const billableId = flight.billableItem?.id || ""
  const canEdit = flight.billableItem?.paymentStatus === "recorded"

  const {
    control,
    handleSubmit,
    register,
    formState: { errors },
  } = useForm<FlightLogEditFormData>({
    resolver: zodResolver(flightLogEditSchema),
    defaultValues: {
      hobbsEnd: flight.hobbsEnd || undefined,
      flightType: flight.flightType,
      departureIcao: flight.departureIcao || "",
      arrivalIcao: flight.arrivalIcao || "",
      landings: flight.landings,
      remarks: flight.remarks || "",
    },
  })

  const onSubmit = async (data: FlightLogEditFormData) => {
    setSaving(true)
    setError(null)
    try {
      const result = await editFlightLog(billableId, data)
      if (result.status === "success") {
        onSaved()
        onClose()
      } else {
        setError(result.error || "Tallennus epäonnistui")
      }
    } catch {
      setError("Odottamaton virhe tapahtui")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title="Muokkaa lentokirjausta"
      footer={null}
      width={480}
    >
      {!canEdit ? (
        <div className="py-4 text-gray-500">
          Kirjausta ei voi muokata enää — tila on muuttunut (
          {flight.billableItem?.paymentStatus}).
        </div>
      ) : (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4 pt-2"
        >
          {error && (
            <Alert
              message={error}
              type="error"
              showIcon
              closable
              onClose={() => setError(null)}
            />
          )}

          {/* Hobbs end */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Hobbs lopetus
            </label>
            <Controller
              name="hobbsEnd"
              control={control}
              render={({ field }) => (
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="99999.9"
                  value={field.value ?? ""}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value)
                    field.onChange(isNaN(v) ? undefined : Math.round(v * 10) / 10)
                  }}
                  className="h-11 px-3 border-2 border-sgrey rounded-lg focus:border-sblue focus:outline-none font-mono text-center text-lg"
                  inputMode="decimal"
                />
              )}
            />
            <p className="text-xs text-gray-400">
              Hobbs aloitus: {flight.hobbsStart?.toFixed(1) ?? "—"}
            </p>
            {errors.hobbsEnd && (
              <p className="text-xs text-red-500">{errors.hobbsEnd.message}</p>
            )}
          </div>

          {/* Flight type */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">
              Lentotyyppi
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
                      className={`px-2.5 py-1.5 rounded-lg border-2 text-xs font-medium transition-colors ${
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

          {/* Airports */}
          <Controller
            name="departureIcao"
            control={control}
            render={({ field }) => (
              <AirfieldPicker
                value={field.value || ""}
                onChange={field.onChange}
                label="Lähtökenttä"
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
                    className="w-10 h-10 rounded-lg border-2 border-sgrey text-lg font-bold bg-white hover:bg-gray-50"
                  >
                    −
                  </button>
                  <div className="flex-1 h-10 flex items-center justify-center text-base font-bold border-2 border-sgrey rounded-lg bg-gray-50">
                    {field.value ?? 0}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      field.onChange(Math.min(99, (field.value || 0) + 1))
                    }
                    className="w-10 h-10 rounded-lg border-2 border-sgrey text-lg font-bold bg-white hover:bg-gray-50"
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
            <textarea
              {...register("remarks")}
              rows={3}
              maxLength={500}
              className="px-3 py-2 border-2 border-sgrey rounded-lg focus:border-sblue focus:outline-none text-sm resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 border-2 border-sgrey text-gray-700 font-medium rounded-xl hover:border-gray-400 transition-colors"
            >
              Peruuta
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 h-11 bg-sblue text-white font-medium rounded-xl hover:bg-sblued disabled:opacity-50 transition-colors"
            >
              {saving ? "Tallennetaan..." : "Tallenna"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
