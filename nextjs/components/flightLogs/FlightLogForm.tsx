"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Form, Input, Select, DatePicker, InputNumber, Button, Alert, Card } from "antd"
import dayjs from "dayjs"
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
import { FLIGHT_LOG_TYPE_LABELS, type FlightLogType } from "@/types/flightLog"

interface Props {
  onSuccess?: () => void
}

export default function FlightLogForm({ onSuccess }: Props) {
  const [aircraft, setAircraft] = useState<Aircraft[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [latestHobbs, setLatestHobbs] = useState<number | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FlightLogFormData>({
    resolver: zodResolver(flightLogSchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      flightType: "local",
    },
  })

  const selectedAircraft = watch("aircraftRegistration")
  const hobbsStart = watch("hobbsStart")
  const hobbsEnd = watch("hobbsEnd")

  // Load aircraft on mount
  useEffect(() => {
    async function loadAircraft() {
      const data = await getAircraft()
      setAircraft(data)
    }
    loadAircraft()
  }, [])

  // Load latest Hobbs when aircraft changes
  useEffect(() => {
    async function loadLatestHobbs() {
      if (selectedAircraft) {
        const hobbs = await getAircraftLatestHobbs(selectedAircraft)
        setLatestHobbs(hobbs)
        if (hobbs !== null) {
          setValue("hobbsStart", hobbs)
        }
      }
    }
    loadLatestHobbs()
  }, [selectedAircraft, setValue])

  // Calculate flight duration
  const flightMinutes =
    hobbsStart && hobbsEnd && hobbsEnd > hobbsStart
      ? Math.round((hobbsEnd - hobbsStart) * 60)
      : 0

  // Calculate estimated cost
  const selectedAircraftData = aircraft.find(
    (a) => a.registration === selectedAircraft
  )
  const estimatedCost = selectedAircraftData
    ? flightMinutes * selectedAircraftData.minuteRate
    : 0

  const onSubmit = async (data: FlightLogFormData) => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const result = await logFlight(data)

      if (result.status === "success") {
        setSuccess(`Lento kirjattu onnistuneesti! Tunniste: ${result.result?.logId}`)
        reset()
        onSuccess?.()
      } else {
        setError(result.error || "Lennon kirjaus epäonnistui")
      }
    } catch {
      setError("Odottamaton virhe tapahtui")
    } finally {
      setLoading(false)
    }
  }

  const flightTypeOptions = Object.entries(FLIGHT_LOG_TYPE_LABELS).map(
    ([value, label]) => ({
      value,
      label,
    })
  )

  return (
    <Card title="Kirjaa lento" className="max-w-2xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
          />
        )}

        {success && (
          <Alert
            message={success}
            type="success"
            showIcon
            closable
            onClose={() => setSuccess(null)}
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Aircraft Selection */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Lentokone <span className="text-red-500">*</span>
            </label>
            <Select
              placeholder="Valitse lentokone"
              className="w-full"
              onChange={(value) => setValue("aircraftRegistration", value)}
              options={aircraft.map((a) => ({
                value: a.registration,
                label: `${a.registration} - ${a.name}`,
              }))}
            />
            {errors.aircraftRegistration && (
              <span className="text-red-500 text-sm">
                {errors.aircraftRegistration.message}
              </span>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Päivämäärä <span className="text-red-500">*</span>
            </label>
            <DatePicker
              className="w-full"
              format="DD.MM.YYYY"
              defaultValue={dayjs()}
              onChange={(date) =>
                setValue("date", date?.format("YYYY-MM-DD") || "")
              }
              disabledDate={(current) => current && current > dayjs().endOf("day")}
            />
            {errors.date && (
              <span className="text-red-500 text-sm">{errors.date.message}</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Hobbs Start */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Hobbs aloitus <span className="text-red-500">*</span>
            </label>
            <InputNumber
              className="w-full"
              step={0.1}
              precision={1}
              min={0}
              max={99999.9}
              value={hobbsStart}
              onChange={(value) => setValue("hobbsStart", value || 0)}
              placeholder="esim. 1234.5"
            />
            {latestHobbs !== null && (
              <span className="text-gray-500 text-xs">
                Edellinen: {latestHobbs.toFixed(1)}
              </span>
            )}
            {errors.hobbsStart && (
              <span className="text-red-500 text-sm">
                {errors.hobbsStart.message}
              </span>
            )}
          </div>

          {/* Hobbs End */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Hobbs lopetus <span className="text-red-500">*</span>
            </label>
            <InputNumber
              className="w-full"
              step={0.1}
              precision={1}
              min={0}
              max={99999.9}
              value={hobbsEnd}
              onChange={(value) => setValue("hobbsEnd", value || 0)}
              placeholder="esim. 1235.2"
            />
            {errors.hobbsEnd && (
              <span className="text-red-500 text-sm">
                {errors.hobbsEnd.message}
              </span>
            )}
          </div>

          {/* Flight Type */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Lentotyyppi <span className="text-red-500">*</span>
            </label>
            <Select
              className="w-full"
              defaultValue="local"
              onChange={(value) => setValue("flightType", value as FlightLogType)}
              options={flightTypeOptions}
            />
            {errors.flightType && (
              <span className="text-red-500 text-sm">
                {errors.flightType.message}
              </span>
            )}
          </div>
        </div>

        {/* Flight Summary */}
        {flightMinutes > 0 && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Lennon yhteenveto</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-600">Kesto:</span>{" "}
                <span className="font-medium">
                  {Math.floor(flightMinutes / 60)} h {flightMinutes % 60} min
                </span>
              </div>
              <div>
                <span className="text-gray-600">Arvioitu hinta:</span>{" "}
                <span className="font-medium">
                  {estimatedCost.toFixed(2)} €
                </span>
              </div>
              {selectedAircraftData && (
                <div className="col-span-2">
                  <span className="text-gray-600">Minuuttihinta:</span>{" "}
                  <span className="font-medium">
                    {selectedAircraftData.minuteRate.toFixed(2)} €/min
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Remarks */}
        <div>
          <label className="block text-sm font-medium mb-1">Huomautukset</label>
          <Input.TextArea
            {...register("remarks")}
            rows={3}
            placeholder="Vapaaehtoisia huomautuksia lennosta..."
            maxLength={500}
          />
          {errors.remarks && (
            <span className="text-red-500 text-sm">{errors.remarks.message}</span>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            className="w-full bg-sblue hover:bg-sblued"
            size="large"
          >
            {loading ? "Kirjataan..." : "Kirjaa lento"}
          </Button>
        </div>
      </form>
    </Card>
  )
}
