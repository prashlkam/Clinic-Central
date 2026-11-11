import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Calendar, Segmented, Space, Spin, Switch, Tag, Tooltip, message } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { appointmentsApi } from '../../api/appointments.api';
import { doctorApi } from '../../api/doctor.api';
import { Appointment } from '../../types/appointment.types';

type Mode = 'month' | 'week';

// Pastel chips with dark text, readable in both the light and the dark theme.
export const STATUS_STYLE: Record<string, { bg: string; border: string; label: string }> = {
  scheduled: { bg: '#dbeafe', border: '#3b82f6', label: 'Scheduled' },
  confirmed: { bg: '#dcfce7', border: '#16a34a', label: 'Confirmed' },
  in_progress: { bg: '#ffedd5', border: '#ea580c', label: 'In progress' },
  completed: { bg: '#e2e8f0', border: '#64748b', label: 'Completed' },
  cancelled: { bg: '#fee2e2', border: '#dc2626', label: 'Cancelled' },
  no_show: { bg: '#fef3c7', border: '#d97706', label: 'No show' },
};
const INACTIVE = ['cancelled', 'no_show'];
const HOUR_PX = 56;
const MAX_MONTH_CHIPS = 3;
const GRID_LINE = '1px solid rgba(148, 163, 184, 0.35)';

interface Props {
  /** change this value to make the calendar reload (after a save or delete elsewhere) */
  refreshKey: number;
  onEdit: (appointment: Appointment) => void;
  onCreate: (when: Dayjs) => void;
}

interface Placed { appt: Appointment; start: Dayjs; top: number; height: number; col: number; cols: number }

/** Lay out one day's appointments side by side where they overlap in time. */
function placeDay(appts: Appointment[], firstHour: number): Placed[] {
  const items = appts
    .map(appt => {
      const start = dayjs(appt.appointment_date);
      const startMin = start.hour() * 60 + start.minute();
      const duration = Math.max(appt.duration_minutes || 30, 20);
      return { appt, start, startMin, endMin: startMin + duration };
    })
    .sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);

  const placed: Placed[] = [];
  let cluster: { item: typeof items[number]; col: number }[] = [];
  let columnEnds: number[] = [];
  let clusterEnd = -1;

  const flush = () => {
    for (const { item, col } of cluster) {
      placed.push({
        appt: item.appt, start: item.start, col, cols: columnEnds.length,
        top: ((item.startMin - firstHour * 60) / 60) * HOUR_PX,
        height: ((item.endMin - item.startMin) / 60) * HOUR_PX,
      });
    }
    cluster = [];
    columnEnds = [];
  };

  for (const item of items) {
    if (cluster.length && item.startMin >= clusterEnd) flush();
    let col = columnEnds.findIndex(end => end <= item.startMin);
    if (col === -1) { col = columnEnds.length; columnEnds.push(item.endMin); } else columnEnds[col] = item.endMin;
    cluster.push({ item, col });
    clusterEnd = Math.max(cluster.length === 1 ? item.endMin : clusterEnd, item.endMin);
  }
  flush();
  return placed;
}

const hourOf = (hhmm: string | undefined, fallback: number) => {
  const h = parseInt((hhmm || '').split(':')[0], 10);
  return Number.isFinite(h) ? h : fallback;
};

const AppointmentCalendar: React.FC<Props> = ({ refreshKey, onEdit, onCreate }) => {
  const [mode, setMode] = useState<Mode>(() => (localStorage.getItem('appointments-calendar-mode') === 'month' ? 'month' : 'week'));
  const [cursor, setCursor] = useState<Dayjs>(dayjs());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [workHours, setWorkHours] = useState<[number, number]>([9, 18]);
  const [now, setNow] = useState(dayjs());
  const requestId = useRef(0);

  useEffect(() => { localStorage.setItem('appointments-calendar-mode', mode); }, [mode]);

  useEffect(() => {
    doctorApi.getProfile()
      .then((p: any) => setWorkHours([hourOf(p?.working_hours_start, 9), Math.max(hourOf(p?.working_hours_end, 18), hourOf(p?.working_hours_start, 9) + 1)]))
      .catch(() => undefined);
    const timer = setInterval(() => setNow(dayjs()), 60000);
    return () => clearInterval(timer);
  }, []);

  const weekStart = cursor.startOf('week');
  // The month grid shows up to six weeks, including days of the neighbouring months.
  const rangeStart = mode === 'week' ? weekStart : cursor.startOf('month').startOf('week');
  const rangeEnd = mode === 'week' ? weekStart.add(7, 'day') : cursor.startOf('month').startOf('week').add(42, 'day');
  const rangeKey = `${rangeStart.valueOf()}-${rangeEnd.valueOf()}`;

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    try {
      const result = await appointmentsApi.list({
        startDate: rangeStart.toISOString(),
        endDate: rangeEnd.subtract(1, 'millisecond').toISOString(),
        page: 1,
        pageSize: 2000,
      });
      if (id === requestId.current) setAppointments(result.data);
    } catch (err: any) {
      if (id === requestId.current) message.error(err?.message || 'Could not load appointments');
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [rangeKey]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const visible = useMemo(
    () => appointments.filter(a => showInactive || !INACTIVE.includes(a.status)),
    [appointments, showInactive]
  );

  const byDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const a of visible) {
      const key = dayjs(a.appointment_date).format('YYYY-MM-DD');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    for (const list of map.values()) list.sort((a, b) => a.appointment_date.localeCompare(b.appointment_date));
    return map;
  }, [visible]);

  const hiddenCount = appointments.length - visible.length;

  const step = (direction: number) => setCursor(c => c.add(direction, mode));
  const title = mode === 'month'
    ? cursor.format('MMMM YYYY')
    : weekStart.month() === weekStart.add(6, 'day').month()
      ? `${weekStart.format('D')} – ${weekStart.add(6, 'day').format('D MMMM YYYY')}`
      : `${weekStart.format('D MMM')} – ${weekStart.add(6, 'day').format('D MMM YYYY')}`;

  const tooltip = (a: Appointment) => (
    <div>
      <div><strong>{a.patient_name}</strong>{a.patient_phone ? ` · ${a.patient_phone}` : ''}</div>
      <div>{dayjs(a.appointment_date).format('ddd D MMM, hh:mm A')} · {a.duration_minutes} min</div>
      {a.treatment_name && <div>{a.treatment_name}</div>}
      <div>{STATUS_STYLE[a.status]?.label || a.status}{a.token_number ? ` · Token ${a.token_number}` : ''}</div>
      {a.notes && <div style={{ opacity: 0.85 }}>{a.notes}</div>}
    </div>
  );

  const chipStyle = (a: Appointment): React.CSSProperties => {
    const s = STATUS_STYLE[a.status] || STATUS_STYLE.scheduled;
    return {
      background: s.bg, borderLeft: `3px solid ${s.border}`, color: '#0f172a', borderRadius: 4,
      cursor: 'pointer', overflow: 'hidden', fontSize: 12, lineHeight: 1.3,
      textDecoration: a.status === 'cancelled' ? 'line-through' : undefined,
      opacity: INACTIVE.includes(a.status) ? 0.7 : 1,
    };
  };

  // ---------- Month ----------
  const monthView = (
    <Calendar
      value={cursor}
      mode="month"
      headerRender={() => null}
      onSelect={(date, info) => {
        // Clicking a day opens that week, where a free slot can be picked.
        if (info.source === 'date') { setCursor(date); setMode('week'); }
      }}
      cellRender={(date, info) => {
        if (info.type !== 'date') return info.originNode;
        const list = byDay.get(date.format('YYYY-MM-DD')) || [];
        if (list.length === 0) return null;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {list.slice(0, MAX_MONTH_CHIPS).map(a => (
              <Tooltip key={a.id} title={tooltip(a)} mouseEnterDelay={0.3}>
                <div style={{ ...chipStyle(a), padding: '1px 4px', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
                  onClick={(e) => { e.stopPropagation(); onEdit(a); }}>
                  {dayjs(a.appointment_date).format('HH:mm')} {a.patient_name}
                </div>
              </Tooltip>
            ))}
            {list.length > MAX_MONTH_CHIPS && (
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>+{list.length - MAX_MONTH_CHIPS} more</div>
            )}
          </div>
        );
      }}
    />
  );

  // ---------- Week ----------
  const days = Array.from({ length: 7 }, (_, i) => weekStart.add(i, 'day'));
  const weekAppointments = days.flatMap(d => byDay.get(d.format('YYYY-MM-DD')) || []);
  // Clinic hours, widened so that no appointment in this week falls outside the grid.
  const firstHour = Math.max(0, Math.min(workHours[0], ...weekAppointments.map(a => dayjs(a.appointment_date).hour())));
  const lastHour = Math.min(24, Math.max(workHours[1], ...weekAppointments.map(a => {
    const end = dayjs(a.appointment_date).add(Math.max(a.duration_minutes || 30, 20), 'minute');
    return end.isSame(dayjs(a.appointment_date), 'day') ? end.hour() + (end.minute() > 0 ? 1 : 0) : 24;
  })));
  const hours = Array.from({ length: lastHour - firstHour }, (_, i) => firstHour + i);
  const gridHeight = hours.length * HOUR_PX;

  const weekView = (
    <div style={{ border: GRID_LINE, borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ maxHeight: 'calc(100vh - 250px)', minHeight: 360, overflowY: 'auto' }}>
      {/* Sticky inside the scroll area, so the day columns line up with the grid whatever the scrollbar width */}
      <div style={{ display: 'grid', gridTemplateColumns: '56px repeat(7, 1fr)', borderBottom: GRID_LINE, position: 'sticky', top: 0, zIndex: 3, background: 'var(--bg-card)' }}>
        <div />
        {days.map(d => {
          const isToday = d.isSame(now, 'day');
          const count = (byDay.get(d.format('YYYY-MM-DD')) || []).length;
          return (
            <div key={d.valueOf()} style={{ padding: '8px 4px', textAlign: 'center', borderLeft: GRID_LINE, background: isToday ? 'rgba(8, 145, 178, 0.12)' : undefined }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{d.format('ddd')}</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: isToday ? '#0891b2' : 'var(--text-primary)' }}>{d.format('D')}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', height: 14 }}>{count ? `${count} appt${count > 1 ? 's' : ''}` : ''}</div>
            </div>
          );
        })}
      </div>
        <div style={{ display: 'grid', gridTemplateColumns: '56px repeat(7, 1fr)', height: gridHeight }}>
          <div style={{ position: 'relative' }}>
            {hours.map((h, i) => (
              <div key={h} style={{ position: 'absolute', top: i * HOUR_PX - (i === 0 ? 0 : 8), right: 6, fontSize: 11, color: 'var(--text-secondary)' }}>
                {dayjs().hour(h).minute(0).format('h A')}
              </div>
            ))}
          </div>
          {days.map(d => {
            const placed = placeDay(byDay.get(d.format('YYYY-MM-DD')) || [], firstHour);
            const isToday = d.isSame(now, 'day');
            const nowTop = ((now.hour() * 60 + now.minute() - firstHour * 60) / 60) * HOUR_PX;
            return (
              <div key={d.valueOf()} title="Click a free slot to book an appointment"
                style={{
                  position: 'relative', borderLeft: GRID_LINE, cursor: 'copy',
                  background: `${isToday ? 'linear-gradient(rgba(8,145,178,0.06), rgba(8,145,178,0.06)), ' : ''}repeating-linear-gradient(to bottom, transparent 0, transparent ${HOUR_PX - 1}px, rgba(148,163,184,0.35) ${HOUR_PX - 1}px, rgba(148,163,184,0.35) ${HOUR_PX}px)`,
                }}
                onClick={(e) => {
                  const y = e.clientY - e.currentTarget.getBoundingClientRect().top;
                  const minutes = Math.max(0, Math.floor((y / HOUR_PX) * 2) * 30); // snap to the half hour
                  onCreate(d.hour(firstHour).minute(0).second(0).millisecond(0).add(minutes, 'minute'));
                }}>
                {placed.map(p => (
                  <Tooltip key={p.appt.id} title={tooltip(p.appt)} mouseEnterDelay={0.3}>
                    <div
                      style={{
                        ...chipStyle(p.appt), position: 'absolute', top: p.top + 1, height: Math.max(p.height - 2, 18),
                        left: `calc(${(p.col / p.cols) * 100}% + 2px)`, width: `calc(${100 / p.cols}% - 4px)`,
                        padding: '2px 5px', boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                      }}
                      onClick={(e) => { e.stopPropagation(); onEdit(p.appt); }}>
                      <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.cols >= 3 ? '' : `${p.start.format('h:mm')} `}{p.appt.patient_name}
                      </div>
                      {p.height >= 40 && p.appt.treatment_name && (
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.appt.treatment_name}</div>
                      )}
                    </div>
                  </Tooltip>
                ))}
                {isToday && nowTop >= 0 && nowTop <= gridHeight && (
                  <div style={{ position: 'absolute', top: nowTop, left: 0, right: 0, borderTop: '2px solid #dc2626', pointerEvents: 'none', zIndex: 2 }}>
                    <div style={{ position: 'absolute', left: -4, top: -5, width: 8, height: 8, borderRadius: '50%', background: '#dc2626' }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 12, flexWrap: 'wrap' }}>
        <Space>
          <Button onClick={() => setCursor(dayjs())}>Today</Button>
          <Button icon={<LeftOutlined />} onClick={() => step(-1)} aria-label="Previous" />
          <Button icon={<RightOutlined />} onClick={() => step(1)} aria-label="Next" />
          <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginLeft: 4 }}>{title}</span>
          {loading && <Spin size="small" />}
        </Space>
        <Space size="middle" wrap>
          <Space size={6}>
            <Switch size="small" checked={showInactive} onChange={setShowInactive} />
            <span style={{ color: 'var(--text-primary)' }}>Show cancelled / no-show{!showInactive && hiddenCount > 0 ? ` (${hiddenCount} hidden)` : ''}</span>
          </Space>
          <Segmented value={mode} onChange={(v) => setMode(v as Mode)} options={[{ value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }]} />
        </Space>
      </div>

      {mode === 'month' ? monthView : weekView}

      <Space wrap size={[4, 4]} style={{ marginTop: 12 }}>
        {Object.entries(STATUS_STYLE).filter(([key]) => showInactive || !INACTIVE.includes(key)).map(([key, s]) => (
          <Tag key={key} style={{ background: s.bg, borderColor: s.border, color: '#0f172a' }}>{s.label}</Tag>
        ))}
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 8 }}>
          {mode === 'week' ? 'Click a free slot to book · click an appointment to edit' : 'Click a day to open its week · click an appointment to edit'}
        </span>
      </Space>
    </div>
  );
};

export default AppointmentCalendar;
