'use client';

import { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface DatePickerProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

const WEEK = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const pad = (n: number) => String(n).padStart(2, '0');

export default function DatePicker({ value, onChange, placeholder = 'Sélectionner…' }: DatePickerProps) {
  const safe     = typeof value === 'string' ? value : '';
  const today    = new Date();
  const initDate = safe ? new Date(safe + 'T12:00:00') : today;

  const [open,    setOpen]    = useState(false);
  const [year,    setYear]    = useState(initDate.getFullYear());
  const [month,   setMonth]   = useState(initDate.getMonth());

  const daysIn  = new Date(year, month + 1, 0).getDate();
  const startDay = new Date(year, month, 1).getDay();
  const offset   = startDay === 0 ? 6 : startDay - 1;

  const nav = (dir: 1 | -1) => {
    let m = month + dir, y = year;
    if (m < 0)  { m = 11; y--; }
    if (m > 11) { m = 0;  y++; }
    setMonth(m); setYear(y);
  };

  const select = (day: number) => {
    onChange(`${year}-${pad(month + 1)}-${pad(day)}`);
    setOpen(false);
  };

  const monthLabel = new Date(year, month).toLocaleDateString('fr-CA', { month: 'long', year: 'numeric' });
  const display    = safe
    ? new Date(safe + 'T12:00:00').toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  return (
    <div style={{ position: 'relative' }}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => {
          if (!open && safe) {
            const d = new Date(safe + 'T12:00:00');
            setYear(d.getFullYear());
            setMonth(d.getMonth());
          }
          setOpen(o => !o);
        }}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '9px 12px', borderRadius: 8, cursor: 'pointer',
          background: 'rgba(255,255,255,0.05)',
          border: `1px solid ${open ? '#a78bfa' : 'rgba(255,255,255,0.1)'}`,
          color: safe ? '#fff' : '#6b6b8e', fontSize: 13, textAlign: 'left',
          boxShadow: open ? '0 0 0 3px rgba(167,139,250,0.12)' : 'none',
          transition: 'all 0.15s',
        }}
      >
        <Calendar size={14} color={safe ? '#a78bfa' : '#5b5b7e'} style={{ flexShrink: 0 }} />
        <span style={{ flex: 1 }}>{display || placeholder}</span>
        {safe && (
          <span
            onClick={(e) => { e.stopPropagation(); onChange(''); }}
            style={{ color: '#6b6b8e', cursor: 'pointer', lineHeight: 1, fontSize: 16 }}
          >
            <X size={13} />
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 9999,
          background: '#0f0f28', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 14,
          boxShadow: '0 12px 48px rgba(0,0,0,0.5)', padding: 14, minWidth: 268,
          animation: 'fadeSlideUp 0.15s ease',
        }}>
          {/* Month nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <button type="button" onClick={() => nav(-1)} style={navBtn}><ChevronLeft size={13} /></button>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', textTransform: 'capitalize' }}>{monthLabel}</span>
            <button type="button" onClick={() => nav(1)} style={navBtn}><ChevronRight size={13} /></button>
          </div>

          {/* Weekdays */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
            {WEEK.map((d, i) => (
              <div key={i} style={{ textAlign: 'center', fontSize: 9, fontWeight: 700, color: '#5b5b7e', padding: '3px 0' }}>{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
            {Array(offset).fill(null).map((_, i) => <div key={`e${i}`} />)}
            {Array(daysIn).fill(null).map((_, i) => {
              const day   = i + 1;
              const ds    = `${year}-${pad(month + 1)}-${pad(day)}`;
              const isSel = safe === ds;
              const isTod = new Date(year, month, day).toDateString() === today.toDateString();
              return (
                <button key={day} type="button" onClick={() => select(day)} style={{
                  padding: '6px 2px', borderRadius: 7, border: 'none', cursor: 'pointer',
                  textAlign: 'center', fontSize: 12, fontWeight: isSel || isTod ? 700 : 400,
                  background: isSel ? '#a78bfa' : isTod ? 'rgba(167,139,250,0.12)' : 'transparent',
                  color: isSel ? '#fff' : isTod ? '#a78bfa' : '#c0c0e0',
                  transition: 'background 0.1s',
                }}>
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const navBtn: React.CSSProperties = {
  width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
  borderRadius: 7, border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.04)', cursor: 'pointer', color: '#8b8b9e',
};
