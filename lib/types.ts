export type UserRole = 'admin' | 'accounting' | 'department_head'
export type DayType = 'ot130' | 'ot150' | 'ot200' | 'ot210' | 'ot270' | 'ot300' | 'ot390'

export interface Department {
  id: string
  name: string
  created_at: string
}

export interface Employee {
  id: string
  full_name: string
  employee_code: string
  department_id: string | null
  is_active: boolean
  created_at: string
  departments?: { name: string } | null
}

export interface Profile {
  id: string
  email?: string
  full_name: string | null
  role: UserRole
  department_id: string | null
  created_at: string
  departments?: { name: string } | null
}

export interface OvertimeRecord {
  id: string
  employee_id: string
  work_date: string
  hours: number
  day_type: DayType
  note: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  employees?: Employee & { departments?: Department }
}

export interface SalarySetting {
  id: string
  employee_id: string
  base_salary: number
  effective_from: string
  created_by: string | null
  created_at: string
  employees?: Employee & { departments?: Department }
}

export interface OvertimeRateRule {
  id: string
  rule_name: string
  day_type: DayType
  multiplier: number
  is_active: boolean
  updated_by: string | null
  updated_at: string
}

export const DAY_TYPE_LABELS: Record<DayType, string> = {
  ot130: 'Làm việc ban đêm (130%)',
  ot150: 'Tăng ca ngày thường ban ngày (150%)',
  ot200: 'Làm ngày chủ nhật ban ngày (200%)',
  ot210: 'Tăng ca đêm ngày thường (210%)',
  ot270: 'Làm ngày chủ nhật ban đêm (270%)',
  ot300: 'Làm ngày lễ/Tết ban ngày (300%)',
  ot390: 'Làm ngày lễ/Tết ban đêm (390%)',
}

export const DAY_TYPES: DayType[] = ['ot130', 'ot150', 'ot200', 'ot210', 'ot270', 'ot300', 'ot390']

export const DAY_TYPE_MULTIPLIERS: Record<DayType, number> = {
  ot130: 1.3,
  ot150: 1.5,
  ot200: 2.0,
  ot210: 2.1,
  ot270: 2.7,
  ot300: 3.0,
  ot390: 3.9,
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Quản trị viên',
  accounting: 'Kế toán',
  department_head: 'Trưởng phòng',
}
