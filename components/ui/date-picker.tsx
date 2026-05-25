'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

const VN_MONTHS = [
  'Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6',
  'Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12',
]
const VN_DAYS_SHORT = ['CN','T2','T3','T4','T5','T6','T7']
const VN_DAYS_FULL  = ['Chủ nhật','Thứ hai','Thứ ba','Thứ tư','Thứ năm','Thứ sáu','Thứ bảy']

interface DatePickerProps {
  /** Current value as 'yyyy-MM-dd' string */
  value: string
  onChange: (v: string) => void
  /** Placeholder shown when no date selected */
  placeholder?: string
  /** Minimum selectable date (inclusive). Default: no limit */
  minDate?: Date
  /** Maximum selectable date (inclusive). Default: no limit */
  maxDate?: Date
  /** Years available in the year dropdown. Default: current year ±5 */
  yearRange?: number[]
  /** Custom class for the trigger button */
  triggerClassName?: string
  /** Show Vietnamese weekday name in trigger label (e.g. "Thứ Năm, 22/05/2026") */
  showWeekday?: boolean
  /** Size variant for trigger: 'sm' (compact) | 'md' (default) */
  size?: 'sm' | 'md'
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Chọn ngày',
  minDate,
  maxDate,
  yearRange,
  triggerClassName,
  showWeekday = false,
  size = 'md',
}: DatePickerProps) {
  const today = new Date()

  const parsed   = value ? parseISO(value) : null
  const initYear  = parsed ? parsed.getFullYear()
    : Math.min(Math.max(today.getFullYear(), yearRange?.[0] ?? 2020), yearRange?.at(-1) ?? 2030)
  const initMonth = parsed ? parsed.getMonth() : today.getMonth()

  const [open,       setOpen]       = useState(false)
  const [viewYear,   setViewYear]   = useState(initYear)
  const [viewMonth,  setViewMonth]  = useState(initMonth)

  // Sync view when popover opens with a new value
  function handleOpenChange(v: boolean) {
    if (v && parsed) { setViewYear(parsed.getFullYear()); setViewMonth(parsed.getMonth()) }
    setOpen(v)
  }

  // Resolve year list
  const years = yearRange ?? Array.from(
    { length: 11 },
    (_, i) => today.getFullYear() - 5 + i
  )

  // Build day grid (null = empty cell)
  const firstDow    = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const minY = years[0]; const maxY = years[years.length - 1]
  const canPrev = !(viewYear <= minY && viewMonth === 0)
  const canNext = !(viewYear >= maxY && viewMonth === 11)

  function prevMonth() {
    if (!canPrev) return
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (!canNext) return
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  function isDisabled(day: number) {
    const d = new Date(viewYear, viewMonth, day)
    if (minDate && d < minDate) return true
    if (maxDate && d > maxDate) return true
    return false
  }
  function isSelected(day: number) {
    return value === `${viewYear}-${String(viewMonth + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
  }
  function isToday(day: number) {
    return today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day
  }

  function selectDay(day: number) {
    if (isDisabled(day)) return
    onChange(`${viewYear}-${String(viewMonth + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`)
    setOpen(false)
  }

  // Trigger label
  let triggerLabel: string
  if (value && parsed) {
    if (showWeekday) {
      triggerLabel = `${VN_DAYS_FULL[parsed.getDay()]}, ${format(parsed, 'dd/MM/yyyy')}`
    } else {
      triggerLabel = format(parsed, 'dd/MM/yyyy')
    }
  } else {
    triggerLabel = placeholder
  }

  const isSmall = size === 'sm'

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg border font-normal transition-colors justify-start',
          isSmall
            ? 'px-2.5 py-1.5 text-xs w-[110px]'
            : 'px-3 py-2 text-sm',
          value
            ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
            : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:border-gray-300',
          triggerClassName
        )}
      >
        <CalendarIcon className={cn('shrink-0', isSmall ? 'w-3 h-3' : 'w-4 h-4 text-muted-foreground')} />
        <span className={cn(isSmall && 'truncate')}>{triggerLabel}</span>
      </PopoverTrigger>

      <PopoverContent className="w-72 p-0 shadow-lg" align="start">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b bg-gray-50 rounded-t-lg">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{placeholder}</span>
          {value && (
            <button
              onClick={() => { onChange(''); setOpen(false) }}
              className="text-gray-400 hover:text-red-500 transition-colors rounded p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Month / Year navigation */}
        <div className="flex items-center gap-1.5 px-3 py-2.5 border-b">
          <button
            onClick={prevMonth}
            disabled={!canPrev}
            className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <div className="flex flex-1 items-center gap-1.5 justify-center">
            <select
              value={viewMonth}
              onChange={e => setViewMonth(Number(e.target.value))}
              className="flex-1 text-sm font-medium text-gray-800 bg-white border border-gray-200 rounded-lg px-2 py-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              {VN_MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <select
              value={viewYear}
              onChange={e => setViewYear(Number(e.target.value))}
              className="w-20 text-sm font-medium text-gray-800 bg-white border border-gray-200 rounded-lg px-2 py-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button
            onClick={nextMonth}
            disabled={!canNext}
            className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 px-3 pt-2.5 pb-1">
          {VN_DAYS_SHORT.map(d => (
            <div key={d} className="text-center text-xs font-semibold text-gray-400 pb-1">{d}</div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 px-3 pb-3 gap-y-0.5">
          {cells.map((day, i) =>
            day === null ? (
              <div key={i} />
            ) : (
              <button
                key={i}
                disabled={isDisabled(day)}
                onClick={() => selectDay(day)}
                className={cn(
                  'h-9 w-full rounded-lg text-sm transition-colors font-normal',
                  isSelected(day)
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : isToday(day)
                    ? 'bg-blue-50 text-blue-700 font-semibold ring-1 ring-blue-300'
                    : isDisabled(day)
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                )}
              >
                {day}
              </button>
            )
          )}
        </div>

        {/* Selected date footer */}
        {value && (
          <div className="border-t px-4 py-2 bg-blue-50 rounded-b-lg text-xs text-blue-700 font-medium text-center">
            Đã chọn: {showWeekday && parsed ? `${VN_DAYS_FULL[parsed.getDay()]}, ` : ''}
            {value && parsed ? format(parsed, 'dd/MM/yyyy') : ''}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
