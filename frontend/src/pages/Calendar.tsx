import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { calendarApi } from '../api';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, X } from 'lucide-react';

interface CalendarEvent {
  id: string;
  type: 'project' | 'story' | 'task';
  title: string;
  dueDate: string;
  status: string;
  priority: string;
  colorCategory: 'red' | 'orange' | 'purple' | 'green' | 'cyan';
  assigneeId?: string;
}

const CalendarPage = () => {
  const { currentWorkspace } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    if (!currentWorkspace) return;
    setLoading(true);
    calendarApi.eventsByWorkspace(currentWorkspace.id)
      .then(setEvents)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentWorkspace]);

  // Calendar Math for 7x5 or 7x6 Complete Grid
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const parseLocalDate = (dateVal: any) => {
    if (!dateVal) return null;
    if (typeof dateVal === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateVal)) {
      const parts = dateVal.split('T')[0].split('-');
      return {
        year: parseInt(parts[0], 10),
        month: parseInt(parts[1], 10) - 1,
        day: parseInt(parts[2], 10),
      };
    }
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return null;
    return {
      year: d.getFullYear(),
      month: d.getMonth(),
      day: d.getDate(),
    };
  };

  const getEventsForDay = (day: number) => {
    return events.filter(e => {
      const parsed = parseLocalDate(e.dueDate);
      if (!parsed) return false;
      return parsed.year === year && parsed.month === month && parsed.day === day;
    });
  };

  const isToday = (day: number) => {
    const now = new Date();
    return now.getFullYear() === year && now.getMonth() === month && now.getDate() === day;
  };

  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    return selectedDate.getFullYear() === year && selectedDate.getMonth() === month && selectedDate.getDate() === day;
  };

  // Compute total grid cells (35 or 42)
  const totalCellsNeeded = firstDayOfMonth + daysInMonth > 35 ? 42 : 35;
  const trailingDaysNeeded = totalCellsNeeded - (firstDayOfMonth + daysInMonth);

  if (loading) {
    return <div className="loading-state">Loading workspace calendar…</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Calendar Header Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <CalendarIcon size={22} className="text-primary" /> {currentWorkspace?.name} Calendar
          </h2>
          <p className="text-sm text-secondary">All deadlines and project milestones automatically marked</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 glass-card" style={{ padding: '0.3rem 0.6rem', borderRadius: 'var(--radius-md)' }}>
            <button className="btn btn-ghost" style={{ padding: '0.2rem' }} onClick={prevMonth}>
              <ChevronLeft size={18} />
            </button>
            <span className="font-semibold text-base px-2" style={{ minWidth: '150px', textAlign: 'center' }}>
              {monthNames[month]} {year}
            </span>
            <button className="btn btn-ghost" style={{ padding: '0.2rem' }} onClick={nextMonth}>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Grid Format Calendar */}
      <div className="glass-panel p-3" style={{ borderRadius: 'var(--radius-lg)' }}>
        {/* First Row: Days Header */}
        <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-muted mb-2 border-b pb-2" style={{ borderColor: 'var(--glass-border)' }}>
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>

        {/* Calendar Grid Cells Filled with Dates */}
        <div className="grid grid-cols-7 gap-1">
          {/* Previous Month Overflow Dates */}
          {Array.from({ length: firstDayOfMonth }).map((_, i) => {
            const prevDayNum = prevMonthDays - firstDayOfMonth + i + 1;
            return (
              <div key={`prev-${prevDayNum}`} className="calendar-grid-cell outside-month">
                <div className="calendar-day-header">
                  <span className="day-number text-muted opacity-40">{prevDayNum}</span>
                </div>
              </div>
            );
          })}

          {/* Current Month Dates */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNumber = i + 1;
            const dayEvents = getEventsForDay(dayNumber);
            const activeToday = isToday(dayNumber);
            const activeSelected = isSelected(dayNumber);

            return (
              <div
                key={`day-${dayNumber}`}
                className={`calendar-grid-cell ${activeToday ? 'cell-today' : ''} ${activeSelected ? 'cell-selected' : ''}`}
                onClick={() => setSelectedDate(new Date(year, month, dayNumber))}
              >
                <div className="calendar-day-header">
                  <span className={`day-number ${activeToday ? 'today-badge' : ''}`}>{dayNumber}</span>
                </div>
                <div className="calendar-pill-container">
                  {dayEvents.map(evt => {
                    const isDone = evt.status === 'done';

                    return (
                      <div
                        key={evt.id}
                        className={`calendar-pill pill-${evt.colorCategory} ${isDone ? 'pill-done' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent(evt);
                        }}
                        title={evt.title}
                      >
                        <span className="pill-text truncate">{evt.title}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Next Month Overflow Dates */}
          {Array.from({ length: trailingDaysNeeded }).map((_, i) => {
            const nextDayNum = i + 1;
            return (
              <div key={`next-${nextDayNum}`} className="calendar-grid-cell outside-month">
                <div className="calendar-day-header">
                  <span className="day-number text-muted opacity-40">{nextDayNum}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="modal glass-panel" onClick={e => e.stopPropagation()} style={{ width: '420px' }}>
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <span className={`calendar-pill pill-${selectedEvent.colorCategory}`} style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  {selectedEvent.type}
                </span>
              </div>
              <button className="btn btn-ghost" onClick={() => setSelectedEvent(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="flex flex-col gap-3 p-4">
              <h3 className="font-semibold text-lg">{selectedEvent.title}</h3>
              <div className="flex items-center justify-between text-sm border-t pt-2" style={{ borderColor: 'var(--glass-border)' }}>
                <span className="text-muted">Deadline:</span>
                <span className="font-medium flex items-center gap-1 text-primary">
                  <Clock size={14} /> {new Date(selectedEvent.dueDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Status:</span>
                <span className="font-medium text-capitalize">{selectedEvent.status.replace('_', ' ')}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Priority:</span>
                <span className="font-medium text-capitalize">{selectedEvent.priority}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarPage;
