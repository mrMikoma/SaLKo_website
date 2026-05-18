"use client"

import { useState } from "react"
import { Tabs } from "antd"
import FlightLogForm from "./FlightLogForm"
import FlightLogHistory from "./FlightLogHistory"

export default function FlightLogManager() {
  const [activeTab, setActiveTab] = useState("log")
  const [refreshKey, setRefreshKey] = useState(0)

  const handleFlightLogged = () => {
    // Trigger refresh of history when a new flight is logged
    setRefreshKey((prev) => prev + 1)
    setActiveTab("history")
  }

  const items = [
    {
      key: "log",
      label: "Kirjaa lento",
      children: <FlightLogForm onSuccess={handleFlightLogged} />,
    },
    {
      key: "history",
      label: "Lentohistoria",
      children: <FlightLogHistory key={refreshKey} />,
    },
  ]

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={items}
        size="large"
      />
    </div>
  )
}
