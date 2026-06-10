"use client"

import { useState, useEffect, useCallback } from "react"
import { Tag, Card, Statistic, Row, Col, Empty, Spin, Popconfirm, Alert } from "antd"
import { getMyFlightLogs, getMyFlightSummary, deleteFlightLog } from "@/utilities/flightLogs"
import type { FlightWithBilling, MemberFlightSummary, PaymentStatus } from "@/types/flightLog"
import {
  formatFlightTime,
  formatCurrency,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
  FLIGHT_LOG_TYPE_LABELS,
} from "@/types/flightLog"
import FlightLogEditModal from "./FlightLogEditModal"

interface FlightCardProps {
  flight: FlightWithBilling
  onEdit: (flight: FlightWithBilling) => void
  onDelete: (id: string) => Promise<void>
  deleting: boolean
}

function FlightCard({ flight, onEdit, onDelete, deleting }: FlightCardProps) {
  const status = flight.billableItem?.paymentStatus as PaymentStatus | undefined
  const canModify = status === "recorded"
  const billableId = flight.billableItem?.id || ""

  const route = [flight.departureIcao, flight.arrivalIcao]
    .filter(Boolean)
    .join(" → ")

  return (
    <div className="bg-white rounded-xl border border-sgrey p-4 flex flex-col gap-3">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm text-gray-500">
            {new Date(flight.date).toLocaleDateString("fi-FI", {
              weekday: "short",
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </div>
          <div className="font-bold text-sblued font-mono text-lg leading-tight">
            {flight.aircraft?.registration || "—"}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {status && (
            <Tag color={PAYMENT_STATUS_COLORS[status]} className="text-xs">
              {PAYMENT_STATUS_LABELS[status]}
            </Tag>
          )}
        </div>
      </div>

      {/* Key info */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-gray-500">Kesto</span>
          <div className="font-semibold">{formatFlightTime(flight.flightMinutes)}</div>
        </div>
        <div>
          <span className="text-gray-500">Hinta</span>
          <div className="font-semibold">
            {flight.billableItem ? formatCurrency(flight.billableItem.totalPrice) : "—"}
          </div>
        </div>
        <div>
          <span className="text-gray-500">Tyyppi</span>
          <div className="font-medium">
            {FLIGHT_LOG_TYPE_LABELS[flight.flightType] || flight.flightType}
          </div>
        </div>
        {flight.hobbsStart > 0 && (
          <div>
            <span className="text-gray-500">Hobbs</span>
            <div className="font-mono text-sm">
              {flight.hobbsStart.toFixed(1)} → {flight.hobbsEnd.toFixed(1)}
            </div>
          </div>
        )}
        {route && (
          <div className="col-span-2">
            <span className="text-gray-500">Reitti</span>
            <div className="font-mono font-medium">{route}</div>
          </div>
        )}
        {flight.landings !== undefined && (
          <div>
            <span className="text-gray-500">Laskeutumiset</span>
            <div className="font-medium">{flight.landings}</div>
          </div>
        )}
        {flight.remarks && (
          <div className="col-span-2">
            <span className="text-gray-500">Huomautukset</span>
            <div className="text-gray-700 text-xs mt-0.5">{flight.remarks}</div>
          </div>
        )}
      </div>

      {/* Actions */}
      {canModify && (
        <div className="flex gap-2 pt-1 border-t border-gray-100">
          <button
            onClick={() => onEdit(flight)}
            className="flex-1 py-2 text-sm font-medium text-sblue border border-sblue rounded-lg hover:bg-blue-50 transition-colors"
          >
            Muokkaa
          </button>
          <Popconfirm
            title="Poistetaanko kirjaus?"
            description="Tätä ei voi peruuttaa."
            onConfirm={() => onDelete(billableId)}
            okText="Poista"
            cancelText="Peruuta"
            okButtonProps={{ danger: true, loading: deleting }}
          >
            <button className="flex-1 py-2 text-sm font-medium text-red-500 border border-red-300 rounded-lg hover:bg-red-50 transition-colors">
              Poista
            </button>
          </Popconfirm>
        </div>
      )}
    </div>
  )
}

export default function FlightLogHistory() {
  const [flights, setFlights] = useState<FlightWithBilling[]>([])
  const [summary, setSummary] = useState<MemberFlightSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [editingFlight, setEditingFlight] = useState<FlightWithBilling | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [flightsData, summaryData] = await Promise.all([
        getMyFlightLogs(),
        getMyFlightSummary(),
      ])
      setFlights(flightsData)
      setSummary(summaryData)
    } catch (error) {
      console.error("Error loading flight data:", error)
      setLoadError("Lentohistorian lataus epäonnistui. Yritä uudelleen.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleDelete = async (billableId: string) => {
    setDeletingId(billableId)
    try {
      const result = await deleteFlightLog(billableId)
      if (result.status === "success") {
        await loadData()
      }
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spin size="large" />
      </div>
    )
  }

  if (loadError) {
    return (
      <Alert
        message={loadError}
        type="error"
        showIcon
        action={
          <button
            onClick={loadData}
            className="text-sm font-medium text-red-600 underline ml-2"
          >
            Yritä uudelleen
          </button>
        }
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      {summary && (
        <Card>
          <Row gutter={16}>
            <Col xs={12} sm={6}>
              <Statistic
                title="Lentoja yhteensä"
                value={summary.totalFlights}
                suffix="kpl"
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic
                title="Lentoaikaa yhteensä"
                value={formatFlightTime(summary.totalMinutes)}
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic
                title="Kustannukset yhteensä"
                value={formatCurrency(summary.totalCost)}
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic
                title="Maksamatta"
                value={formatCurrency(summary.unpaidAmount)}
                valueStyle={
                  summary.unpaidAmount > 0 ? { color: "#cf1322" } : undefined
                }
              />
            </Col>
          </Row>
        </Card>
      )}

      {/* Flight list */}
      <div>
        <h3 className="font-semibold text-gray-700 mb-3">Lentohistoria</h3>
        {flights.length === 0 ? (
          <Empty
            description="Ei kirjattuja lentoja"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {flights.map((flight) => (
              <FlightCard
                key={flight.billableItem?.id || flight.logId}
                flight={flight}
                onEdit={setEditingFlight}
                onDelete={handleDelete}
                deleting={deletingId === flight.billableItem?.id}
              />
            ))}
          </div>
        )}
      </div>

      {editingFlight && (
        <FlightLogEditModal
          flight={editingFlight}
          open={!!editingFlight}
          onClose={() => setEditingFlight(null)}
          onSaved={loadData}
        />
      )}
    </div>
  )
}
