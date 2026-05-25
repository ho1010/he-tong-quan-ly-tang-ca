import { format, parseISO } from 'date-fns'
import { vi } from 'date-fns/locale'

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'dd/MM/yyyy')
}

export function formatMonth(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'MM/yyyy')
}

export function formatMonthYear(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'MMMM yyyy', { locale: vi })
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('vi-VN').format(num)
}

export function getDayType(date: Date): 'ot150' | 'ot200' {
  const day = date.getDay()
  return day === 0 || day === 6 ? 'ot200' : 'ot150'
}

export function getMonthStart(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}-01`
}

export function getMonthEnd(year: number, month: number): string {
  const lastDay = new Date(year, month, 0).getDate()
  return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
}

// Calculate hourly overtime rate
// Formula: base_salary / (26 days * 8 hours) * multiplier
export function calcOvertimeHourlyRate(baseSalary: number, multiplier: number): number {
  return (baseSalary / (26 * 8)) * multiplier
}

export function calcOvertimePay(
  baseSalary: number,
  hours: number,
  multiplier: number
): number {
  return Math.round(calcOvertimeHourlyRate(baseSalary, multiplier) * hours)
}
