import * as XLSX from 'xlsx'
import { formatDate, formatCurrency } from './utils/format'
import { DAY_TYPE_LABELS } from './types'
import type { DayType } from './types'

// Flat record shape returned by /api/overtime
interface FlatOvertimeRecord {
  id?: string
  work_date: string
  hours: number
  day_type: string
  note?: string | null
  employee_code?: string
  full_name?: string
  dept_name?: string
}

export function exportOvertimeToExcel(
  records: FlatOvertimeRecord[],
  monthYear: string,
  filename?: string
) {
  const rows = records.map((r, idx) => ({
    'STT': idx + 1,
    'Ngày': formatDate(r.work_date),
    'Mã NV': r.employee_code ?? '',
    'Họ và tên': r.full_name ?? '',
    'Phòng ban': r.dept_name ?? '',
    'Số giờ tăng ca': r.hours,
    'Loại ngày': DAY_TYPE_LABELS[r.day_type as DayType] ?? r.day_type,
    'Ghi chú': r.note ?? '',
  }))

  // Department summary
  const deptMap: Record<string, { dept: string; hours: number; count: number }> = {}
  records.forEach(r => {
    const dept = r.dept_name ?? 'Không xác định'
    if (!deptMap[dept]) deptMap[dept] = { dept, hours: 0, count: 0 }
    deptMap[dept].hours += r.hours
    deptMap[dept].count++
  })
  const totalHours = records.reduce((sum, r) => sum + r.hours, 0)

  const wb = XLSX.utils.book_new()

  // Sheet 1: Detail
  const ws1 = XLSX.utils.json_to_sheet(rows)
  ws1['!cols'] = [
    { wch: 5 }, { wch: 12 }, { wch: 10 }, { wch: 22 },
    { wch: 20 }, { wch: 14 }, { wch: 16 }, { wch: 30 },
  ]

  // Add title rows
  XLSX.utils.sheet_add_aoa(ws1, [
    [`BẢNG TĂNG CA ${monthYear.toUpperCase()}`],
    [`Công ty: HY TECH`],
    [],
  ], { origin: 'A1' })

  XLSX.utils.sheet_add_json(ws1, rows, { origin: 'A4' })

  // Total row
  const totalRow = rows.length + 5
  XLSX.utils.sheet_add_aoa(ws1, [
    ['', '', '', '', 'TỔNG CỘNG', totalHours, '', '']
  ], { origin: `A${totalRow}` })

  XLSX.utils.book_append_sheet(wb, ws1, `Tang ca ${monthYear.replace('/', '-')}`)

  // Sheet 2: Summary by department
  const summaryRows = Object.values(deptMap).map((d, i) => ({
    'STT': i + 1,
    'Phòng ban': d.dept,
    'Số lượt': d.count,
    'Tổng giờ tăng ca': d.hours,
  }))
  summaryRows.push({ 'STT': 0, 'Phòng ban': 'TỔNG CỘNG', 'Số lượt': records.length, 'Tổng giờ tăng ca': totalHours } as any)

  const ws2 = XLSX.utils.json_to_sheet(summaryRows)
  ws2['!cols'] = [{ wch: 5 }, { wch: 25 }, { wch: 12 }, { wch: 18 }]
  XLSX.utils.book_append_sheet(wb, ws2, 'Tong hop phong ban')

  const fname = filename ?? `tang_ca_${monthYear.replace('/', '_')}.xlsx`
  XLSX.writeFile(wb, fname)
}

export interface SalaryExportRow {
  employee_code: string
  full_name: string
  department: string
  base_salary: number
  byType: Record<DayType, { hours: number; pay: number }>
  total_pay: number
}

// Salary calculation export — supports all 6 OT types dynamically
export function exportSalaryToExcel(
  data: SalaryExportRow[],
  activeTypes: DayType[],
  monthYear: string,
  filename?: string
) {
  const today = new Date().toLocaleDateString('vi-VN')

  // Build dynamic rows
  const rows = data.map((d, i) => {
    const row: Record<string, any> = {
      'STT': i + 1,
      'Mã NV': d.employee_code,
      'Họ và tên': d.full_name,
      'Phòng ban': d.department,
      'Lương CB (VND)': formatCurrency(d.base_salary),
    }
    activeTypes.forEach(t => {
      const label = DAY_TYPE_LABELS[t]
      row[`Giờ ${label}`] = d.byType[t].hours
      row[`Tiền ${label} (VND)`] = formatCurrency(d.byType[t].pay)
    })
    row['Tổng tiền tăng ca (VND)'] = formatCurrency(d.total_pay)
    return row
  })

  // Total row
  const totalRow: Record<string, any> = {
    'STT': '', 'Mã NV': '', 'Họ và tên': '',
    'Phòng ban': 'TỔNG CỘNG',
    'Lương CB (VND)': '',
  }
  activeTypes.forEach(t => {
    const label = DAY_TYPE_LABELS[t]
    totalRow[`Giờ ${label}`] = data.reduce((s, d) => s + d.byType[t].hours, 0)
    totalRow[`Tiền ${label} (VND)`] = formatCurrency(data.reduce((s, d) => s + d.byType[t].pay, 0))
  })
  totalRow['Tổng tiền tăng ca (VND)'] = formatCurrency(data.reduce((s, d) => s + d.total_pay, 0))

  const wb = XLSX.utils.book_new()

  // Sheet 1: Detail
  const ws1 = XLSX.utils.aoa_to_sheet([
    [`BẢNG TÍNH LƯƠNG TĂNG CA ${monthYear.toUpperCase()}`],
    [`Công ty: HY TECH`],
    [`Ngày lập: ${today}`],
    [`Công thức: Lương giờ = Lương CB / (26 ngày × 8 giờ) × Hệ số`],
    [],
  ])

  XLSX.utils.sheet_add_json(ws1, rows, { origin: 'A6' })
  XLSX.utils.sheet_add_json(ws1, [totalRow], { origin: `A${rows.length + 7}`, skipHeader: true })

  // Dynamic col widths: STT, MaNV, HoTen, PhongBan, LuongCB, [Gio+Tien × activeTypes], Total
  const baseCols = [{ wch: 5 }, { wch: 10 }, { wch: 22 }, { wch: 18 }, { wch: 16 }]
  const typeCols = activeTypes.flatMap(() => [{ wch: 10 }, { wch: 20 }])
  ws1['!cols'] = [...baseCols, ...typeCols, { wch: 22 }]

  XLSX.utils.book_append_sheet(wb, ws1, `Bang tinh luong ${monthYear.replace('/', '-')}`)

  // Sheet 2: Department summary
  const deptMap: Record<string, { total: number; count: number }> = {}
  data.forEach(d => {
    if (!deptMap[d.department]) deptMap[d.department] = { total: 0, count: 0 }
    deptMap[d.department].total += d.total_pay
    deptMap[d.department].count++
  })

  const deptRows = Object.entries(deptMap).map(([dept, v], i) => ({
    'STT': i + 1,
    'Phòng ban': dept,
    'Số nhân viên': v.count,
    'Tổng tiền tăng ca (VND)': formatCurrency(v.total),
  }))
  const ws2 = XLSX.utils.json_to_sheet(deptRows)
  ws2['!cols'] = [{ wch: 5 }, { wch: 25 }, { wch: 14 }, { wch: 22 }]
  XLSX.utils.book_append_sheet(wb, ws2, 'Tong hop theo phong ban')

  const fname = filename ?? `luong_tang_ca_${monthYear.replace('/', '_')}.xlsx`
  XLSX.writeFile(wb, fname)
}

export interface EmployeeDetailRow {
  work_date: string
  hours: number
  day_type: DayType
  hourly_rate: number
  multiplier: number
  pay: number
}

export interface EmployeeDetailMeta {
  employee_code: string
  full_name: string
  department: string
  base_salary: number
  total_hours: number
  total_pay: number
}

export function exportEmployeeDetailToExcel(
  meta: EmployeeDetailMeta,
  rows: EmployeeDetailRow[],
  monthYear: string,
  filename?: string
) {
  const today = new Date().toLocaleDateString('vi-VN')

  const dataRows = rows.map((r, i) => ({
    'STT': i + 1,
    'Ngày': formatDate(r.work_date),
    'Loại tăng ca': DAY_TYPE_LABELS[r.day_type] ?? r.day_type,
    'Số giờ': r.hours,
    'Lương giờ (VND)': formatCurrency(Math.round(r.hourly_rate)),
    'Hệ số': r.multiplier,
    'Thành tiền (VND)': formatCurrency(r.pay),
  }))

  const wb = XLSX.utils.book_new()

  const ws = XLSX.utils.aoa_to_sheet([
    [`CHI TIẾT TĂNG CA THÁNG ${monthYear.toUpperCase()}`],
    [`Họ và tên: ${meta.full_name}  |  Mã NV: ${meta.employee_code}  |  Phòng ban: ${meta.department}`],
    [`Lương cơ bản: ${formatCurrency(meta.base_salary)}  |  Lương giờ: ${formatCurrency(Math.round(meta.base_salary / (26 * 8)))}`],
    [`Ngày lập: ${today}`],
    [],
  ])

  XLSX.utils.sheet_add_json(ws, dataRows, { origin: 'A6' })

  const totalRowIdx = dataRows.length + 7
  XLSX.utils.sheet_add_aoa(ws, [
    ['', '', 'TỔNG CỘNG', meta.total_hours, '', '', formatCurrency(meta.total_pay)]
  ], { origin: `A${totalRowIdx}` })

  ws['!cols'] = [
    { wch: 5 }, { wch: 13 }, { wch: 34 }, { wch: 10 },
    { wch: 18 }, { wch: 8 }, { wch: 20 },
  ]

  XLSX.utils.book_append_sheet(wb, ws, `CT_${meta.employee_code}_${monthYear.replace('/', '-')}`)

  const fname = filename ?? `chi_tiet_${meta.employee_code}_${monthYear.replace('/', '_')}.xlsx`
  XLSX.writeFile(wb, fname)
}
