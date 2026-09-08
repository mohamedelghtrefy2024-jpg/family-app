import { useEffect, useState } from "react";
import { childRepo } from "../../data/repositories/childRepo";
import { eventRepo } from "../../data/repositories/eventRepo";
import EventForm from "../components/EventForm";
import EmptyState from "../components/EmptyState";

const EVENT_TYPE_LABELS = {
  exam: "امتحان",
  trip: "رحلة مدرسية",
  family: "مناسبة عائلية",
  other: "أخرى",
};

export default function EventsPage() {
  const [children, setChildren] = useState([]);
  const [events, setEvents] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);

  async function loadEvents() {
    const all = await eventRepo.getAll();
    setEvents(all.slice().sort((a, b) => a.date.localeCompare(b.date)));
  }

  useEffect(() => {
    childRepo.getActive().then(setChildren);
    loadEvents();
  }, []);

  function nameOf(id) {
    return children.find((c) => c.id === id)?.name || "—";
  }

  async function handleSave(data) {
    setError(null);
    try {
      if (editingId) {
        await eventRepo.update(editingId, data);
      } else {
        await eventRepo.add(data);
      }
      setShowForm(false);
      setEditingId(null);
      await loadEvents();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    setError(null);
    try {
      await eventRepo.remove(id);
      await loadEvents();
    } catch (err) {
      setError(err.message);
    }
  }

  if (events === null) return null;

  const editingEvent = editingId ? events.find((e) => e.id === editingId) : null;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">📌 الأحداث</h1>
          <p className="page-subtitle">امتحانات، رحلات، مناسبات عائلية — بتظهر في التقويم والتنبيهات تلقائيًا</p>
        </div>
        {!showForm && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ حدث جديد</button>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {showForm && (
        <EventForm
          children={children}
          initial={editingEvent}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingId(null);
          }}
        />
      )}

      {events.length === 0 && !showForm && (
        <EmptyState
          title="لسه مفيش أحداث"
          hint="أضف امتحان أو رحلة أو مناسبة عشان تظهر في التقويم والتنبيهات"
          actionLabel="+ حدث جديد"
          onAction={() => setShowForm(true)}
        />
      )}

      {events.map((event) => (
        <div className="list-row" key={event.id}>
          <div>
            <div className="list-row-name">{event.title}</div>
            <div className="list-row-meta">
              {EVENT_TYPE_LABELS[event.event_type] || event.event_type} · {event.date}
              {event.end_date ? ` إلى ${event.end_date}` : ""}
              {event.start_time ? ` · ${event.start_time}` : ""}
              {event.child_id ? ` · ${nameOf(event.child_id)}` : " · الأسرة كلها"}
            </div>
          </div>
          <div className="list-row-actions">
            <button
              className="btn btn-ghost"
              onClick={() => {
                setEditingId(event.id);
                setShowForm(true);
              }}
            >
              تعديل
            </button>
            <button className="btn btn-danger" onClick={() => handleDelete(event.id)}>حذف</button>
          </div>
        </div>
      ))}
    </div>
  );
}
