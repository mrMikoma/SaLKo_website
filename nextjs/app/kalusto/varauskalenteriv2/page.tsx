"use client";

import { useState, useMemo } from "react";
import { DateTime } from "luxon";
import { Modal, Button } from "antd";

interface Task {
  id: number;
  user: string;
  startDate: string;
  endDate: string;
  task: string;
  color: string;
}

const DEFAULT_COLOR = "#1677ff";
const DEFAULT_TASK: Task = {
  id: -1,
  user: "",
  startDate: "",
  endDate: "",
  task: "",
  color: DEFAULT_COLOR,
};

const PLANES = ["OH-CON", "OH-PDX", "OH-816", "OH-829", "OH-475", "OH-386"];
const TASKS: Task[] = [
  {
    id: 1,
    user: "OH-CON",
    startDate: "2025-05-14T01:00:00.000Z",
    endDate: "2025-05-14T04:00:00.000Z",
    task: "Extended Team Meeting",
    color: "#1677ff",
  },
  {
    id: 2,
    user: "OH-CON",
    startDate: "2025-05-14T04:00:00.000Z",
    endDate: "2025-05-14T05:00:00.000Z",
    task: "Client Follow-up",
    color: "#52c41a",
  },
  {
    id: 3,
    user: "OH-CON",
    startDate: "2025-05-14T00:00:00.000Z",
    endDate: "2025-05-14T06:00:00.000Z",
    task: "Client Follow-up",
    color: "#faad14",
  },
  {
    id: 4,
    user: "OH-386",
    startDate: "2025-05-14T00:00:00.000Z",
    endDate: "2025-05-14T04:00:00.000Z",
    task: "Extended Team Meeting",
    color: "#1677ff",
  },
];
/*
  {
    id: 2,
    user: "OH-CON",
    startDate: "2025-05-14T01:00:00.000Z",
    endDate: "2025-05-14T05:00:00.000Z",
    task: "Client Follow-up",
    color: "#52c41a",
  },
  {
    id: 3,
    user: "OH-CON",
    startDate: "2025-05-14T00:00:00.000Z",
    endDate: "2025-05-14T06:00:00.000Z",
    task: "Client Follow-up",
    color: "#faad14",
  },
  {
    id: 4,
    user: "OH-386",
    startDate: "2025-05-14T00:00:00.000Z",
    endDate: "2025-05-14T04:00:00.000Z",
    task: "Extended Team Meeting",
    color: "#1677ff",
  },
*/

const LuxonDatePicker = ({
  value,
  onChange,
}: {
  value: DateTime;
  onChange: (date: DateTime | null) => void;
}) => {
  return (
    <input
      type="date"
      value={value.toFormat("yyyy-MM-dd")}
      onChange={(e) => {
        const newDate = DateTime.fromISO(e.target.value);
        if (newDate.isValid) {
          onChange(newDate);
        }
      }}
      className="w-48 p-2 border rounded"
    />
  );
};

const TaskModal = ({
  mode,
  task,
  onSave,
  onUpdate,
  onDelete,
  onCancel,
  onChange,
}: {
  mode: "create" | "update";
  task: Task;
  onSave: () => void;
  onUpdate: () => void;
  onDelete: () => void;
  onCancel: () => void;
  onChange: (updatedTask: Task) => void;
}) => {
  const handleChange = (field: keyof Task, value: string) => {
    onChange({ ...task, [field]: value });
  };

  return (
    <Modal
      title={mode === "create" ? "Add Task" : "Update Task"}
      open={true}
      onOk={mode === "create" ? onSave : onUpdate}
      onCancel={onCancel}
      okText={mode === "create" ? "Save" : "Update"}
      cancelText="Cancel"
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Cancel
        </Button>,
        mode === "update" && (
          <Button key="delete" danger onClick={onDelete}>
            Delete
          </Button>
        ),
        <Button
          key="submit"
          type="primary"
          onClick={mode === "create" ? onSave : onUpdate}
        >
          {mode === "create" ? "Save" : "Update"}
        </Button>,
      ]}
    >
      <p>User: {task.user}</p>
      <div className="mb-4">
        <label>Start Date:</label>
        <input
          type="datetime-local"
          value={
            task.startDate
              ? DateTime.fromISO(task.startDate).toFormat("yyyy-MM-dd'T'HH:mm")
              : ""
          }
          onChange={(e) => handleChange("startDate", e.target.value)}
          className="border p-2 w-full"
        />
      </div>
      <div className="mb-4">
        <label>End Date:</label>
        <input
          type="datetime-local"
          value={
            task.endDate
              ? DateTime.fromISO(task.endDate).toFormat("yyyy-MM-dd'T'HH:mm")
              : ""
          }
          onChange={(e) => handleChange("endDate", e.target.value)}
          className="border p-2 w-full"
        />
      </div>
      <input
        type="text"
        placeholder="Enter task description"
        value={task.task}
        onChange={(e) => handleChange("task", e.target.value)}
        className="border p-2 w-full mb-4"
      />
      <div className="mb-4">{/* Add something */}</div>
    </Modal>
  );
};

const TaskCell = ({
  task,
  hour,
  user,
  onClick,
}: {
  task: Task;
  hour: string;
  user: string;
  onClick: () => void;
}) => {
  const hourValue = parseInt(hour.split(":")[0]);
  const span = calculateEventSpan(task, hour, hourValue);
  if (span === 0) return null;

  const heightPercentage = calculateTaskHeight(task);
  const top = calculateTaskOffset(task, hour);

  return (
    <td
      onDoubleClick={onClick}
      className="cursor-pointer border border-gray-300 relative"
      rowSpan={span}
      data-cell-key={`${user}-${hour}`}
      style={{ width: "100px", height: "50px", padding: 0 }}
    >
      <div
        className="absolute left-0 right-0 text-white px-2 py-1 overflow-hidden"
        style={{
          top: `${top}%`,
          height: `${heightPercentage}%`,
          backgroundColor: task.color,
        }}
      >
        <p className="text-sm font-medium text-ellipsis whitespace-nowrap overflow-hidden">
          {task.task}
        </p>
      </div>
    </td>
  );
};

const calculateEventSpan = (task: Task, hour: string, hourValue: number) => {
  const taskStart = DateTime.fromISO(task.startDate);
  const taskEnd = DateTime.fromISO(task.endDate);
  const cellStart = DateTime.fromISO(task.startDate).set({ hour: hourValue });
  const cellEnd = cellStart.plus({ hours: 1 });

  if (taskStart.hasSame(cellStart, "hour")) {
    const duration = taskEnd.diff(taskStart, "hours").hours;
    return Math.ceil(duration);
  }

  if (taskStart < cellEnd && taskEnd > cellStart) {
    return 0;
  }

  return 0;
};

const calculateTaskHeight = (task: Task) => {
  const taskStart = DateTime.fromISO(task.startDate);
  const taskEnd = DateTime.fromISO(task.endDate);
  const durationTask = taskEnd.diff(taskStart, "hours").hours;
  const rowSpan = Math.ceil(durationTask);
  const height = rowSpan > 0 ? (rowSpan / durationTask) * 100 : 100;
  return height;
};

const calculateTaskOffset = (task: Task, hour: string) => {
  const taskStart = DateTime.fromISO(task.startDate);
  const cellStart = DateTime.fromISO(task.startDate).set({
    hour: parseInt(hour.split(":")[0]),
  });
  let top = 0;
  let diff = cellStart.diff(taskStart, "hours").hours;
  if (diff < 0) {
    top = diff * -100;
  }
  return top;
};

export default function CustomCalendar() {
  const now = DateTime.now();
  const [selectedDate, setSelectedDate] = useState<DateTime>(now);
  const [hourInterval] = useState(1);
  const [modalMode, setModalMode] = useState<"create" | "update" | null>(null);
  const [taskData, setTaskData] = useState<Task[]>(TASKS);
  const [selectedTask, setSelectedTask] = useState<Task>(DEFAULT_TASK);

  const hours = useMemo(
    () =>
      Array.from(
        { length: 24 / hourInterval },
        (_, i) => `${i * hourInterval}:00`
      ),
    [hourInterval]
  );

  const handleDateChange = (date: DateTime | null) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleCellClick = (user: string, hour: string) => {
    setSelectedTask({
      ...DEFAULT_TASK,
      id: taskData.length + 1,
      user,
      startDate:
        selectedDate.set({ hour: parseInt(hour.split(":")[0]) }).toISO() ?? "",
      endDate:
        selectedDate
          .set({ hour: parseInt(hour.split(":")[0]) })
          .plus({ hours: hourInterval })
          .toISO() ?? "",
    });
    setModalMode("create");
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setModalMode("update");
  };

  const handleSaveTask = () => {
    if (!isTaskValid(selectedTask)) return;

    setTaskData([...taskData, selectedTask]);
    resetModal();
  };

  const handleUpdateTask = () => {
    if (!isTaskValid(selectedTask)) return;

    setTaskData((prevTaskData) =>
      prevTaskData.map((task) =>
        task.id === selectedTask.id ? selectedTask : task
      )
    );
    resetModal();
  };

  const handleDeleteTask = () => {
    if (selectedTask.id < 0) return;
    setTaskData((prevTaskData) =>
      prevTaskData.filter((task) => task.id !== selectedTask.id)
    );
    resetModal();
  };

  const resetModal = () => {
    setModalMode(null);
    setSelectedTask(DEFAULT_TASK);
  };

  const isTaskValid = (task: Task) => {
    return (
      task.color &&
      task.endDate &&
      task.id >= 0 &&
      task.startDate &&
      task.task &&
      task.user
    );
  };

  const isTaskInSelectedDate = (task: Task) => {
    const taskDate = DateTime.fromISO(task.startDate);
    return taskDate.hasSame(selectedDate, "day");
  };

  return (
    <div className="p-4 text-black">
      <div className="flex gap-4 mb-4 bg-gray-100 w-fit">
        <LuxonDatePicker value={selectedDate} onChange={handleDateChange} />
      </div>

      <div className="w-full overflow-auto">
        <table className="w-full border-collapse bg-gray-50 table-fixed">
          <thead>
            <tr>
              <th className="border border-gray-300 p-2 bg-gray-100">HOURS</th>
              {PLANES.map((user) => (
                <th
                  key={user}
                  className="border border-gray-300 p-2 bg-gray-100"
                  style={{ height: "50px" }}
                >
                  {user}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {hours.map((hour) => (
              <tr key={hour}>
                <th
                  className="border border-gray-300 p-2 bg-gray-100"
                  style={{ height: "50px" }}
                >
                  {hour}
                </th>
                {PLANES.map((user) => {
                  const hourValue = parseInt(hour.split(":")[0]);
                  const tasksForCell = taskData.filter((task) => {
                    if (!isTaskInSelectedDate(task)) return false;

                    const taskStart = DateTime.fromISO(task.startDate);
                    const taskEnd = DateTime.fromISO(task.endDate);
                    return (
                      task.user === user &&
                      taskStart.hour <= hourValue &&
                      taskEnd.hour > hourValue
                    );
                  });

                  const primaryTask = tasksForCell.find(
                    (task) =>
                      DateTime.fromISO(task.startDate).hour === hourValue
                  );

                  return primaryTask ? (
                    <TaskCell
                      key={`${user}-${hour}`}
                      task={primaryTask}
                      hour={hour}
                      user={user}
                      onClick={() => handleTaskClick(primaryTask)}
                    />
                  ) : (
                    <td
                      key={`${user}-${hour}`}
                      onClick={() => handleCellClick(user, hour)}
                      className="cursor-pointer border border-gray-300 p-2"
                      data-cell-key={`${user}-${hour}`}
                      style={{ height: "50px" }}
                    >
                      <div></div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalMode && (
        <TaskModal
          mode={modalMode}
          task={selectedTask}
          onSave={handleSaveTask}
          onUpdate={handleUpdateTask}
          onDelete={handleDeleteTask}
          onCancel={resetModal}
          onChange={setSelectedTask}
        />
      )}
    </div>
  );
}
