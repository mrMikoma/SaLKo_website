"use client"

import { useState, useEffect } from "react"
import { Table, Tag, Card, Statistic, Row, Col, Empty, Spin } from "antd"
import type { ColumnsType } from "antd/es/table"
import { getMyFlightLogs, getMyFlightSummary } from "@/utilities/flightLogs"
import type {
  FlightWithBilling,
  MemberFlightSummary,
  PaymentStatus,
} from "@/types/flightLog"
import {
  formatFlightTime,
  formatCurrency,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
} from "@/types/flightLog"

export default function FlightLogHistory() {
  const [flights, setFlights] = useState<FlightWithBilling[]>([])
  const [summary, setSummary] = useState<MemberFlightSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const [flightsData, summaryData] = await Promise.all([
          getMyFlightLogs(),
          getMyFlightSummary(),
        ])
        setFlights(flightsData)
        setSummary(summaryData)
      } catch (error) {
        console.error("Error loading flight data:", error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const columns: ColumnsType<FlightWithBilling> = [
    {
      title: "Päivämäärä",
      dataIndex: "date",
      key: "date",
      render: (date: string) =>
        new Date(date).toLocaleDateString("fi-FI", {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
      sorter: (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      defaultSortOrder: "descend",
    },
    {
      title: "Lentokone",
      dataIndex: "aircraft",
      key: "aircraft",
      render: (aircraft: FlightWithBilling["aircraft"]) =>
        aircraft?.registration || "-",
    },
    {
      title: "Kesto",
      dataIndex: "flightMinutes",
      key: "flightMinutes",
      render: (minutes: number) => formatFlightTime(minutes),
    },
    {
      title: "Hinta",
      key: "price",
      render: (_, record) =>
        record.billableItem
          ? formatCurrency(record.billableItem.totalPrice)
          : "-",
    },
    {
      title: "Tila",
      key: "status",
      render: (_, record) => {
        if (!record.billableItem) return "-"
        const status = record.billableItem.paymentStatus as PaymentStatus
        return (
          <Tag color={PAYMENT_STATUS_COLORS[status]}>
            {PAYMENT_STATUS_LABELS[status]}
          </Tag>
        )
      },
      filters: [
        { text: "Kirjattu", value: "recorded" },
        { text: "Tarkistettu", value: "checked" },
        { text: "Laskutettu", value: "invoiced" },
        { text: "Maksettu", value: "paid" },
      ],
      onFilter: (value, record) =>
        record.billableItem?.paymentStatus === value,
    },
    {
      title: "Huomautukset",
      dataIndex: "remarks",
      key: "remarks",
      ellipsis: true,
      render: (remarks: string | undefined) => remarks || "-",
    },
  ]

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spin size="large" />
      </div>
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

      {/* Flight Log Table */}
      <Card title="Lentohistoria">
        {flights.length === 0 ? (
          <Empty
            description="Ei kirjattuja lentoja"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <Table
            columns={columns}
            dataSource={flights}
            rowKey={(record) => record.logId || record.billableItem?.id || ""}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Yhteensä ${total} lentoa`,
            }}
            scroll={{ x: 800 }}
          />
        )}
      </Card>
    </div>
  )
}
