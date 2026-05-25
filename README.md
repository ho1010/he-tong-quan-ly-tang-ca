# Quản lý Tăng ca - HY TECH

Hệ thống quản lý tăng ca nội bộ cho công ty HY TECH, xây dựng bằng Next.js 14 + Supabase.

## Tính năng

- **Nhập tăng ca hàng ngày**: Trưởng phòng nhập giờ tăng ca cho từng nhân viên
- **Tổng hợp theo tháng**: Xem báo cáo tăng ca theo tháng/phòng ban
- **Tính lương tăng ca**: Tự động tính toán với hệ số (ngày thường 1.5x, cuối tuần 2.0x, lễ 3.0x)
- **Xuất Excel**: Xuất bảng tăng ca và bảng lương tăng ca
- **Phân quyền**: Admin / Kế toán / Trưởng phòng

## Yêu cầu

- Node.js 18+
- Tài khoản Supabase (free tier được)

## Cài đặt

### 1. Cài đặt dependencies

```bash
cd hy-tech-overtime
npm install
```

### 2. Cấu hình Supabase

1. Tạo project mới tại [supabase.com](https://supabase.com)
2. Vào **Settings > API** để lấy `Project URL` và `anon public` key
3. Tạo file `.env.local` (copy từ `.env.example`):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Tạo Database Schema

1. Vào **Supabase Dashboard > SQL Editor**
2. Chạy file `supabase/schema.sql`
3. Chạy file `supabase/seed.sql` (dữ liệu mẫu)

### 4. Tạo tài khoản test

Vào **Supabase Dashboard > Authentication > Users**, tạo 4 tài khoản:

| Email | Mật khẩu | Ghi chú |
|-------|----------|---------|
| admin@hytech.com | password123 | Admin |
| ketoan@hytech.com | password123 | Kế toán |
| tp.kythuat@hytech.com | password123 | Trưởng phòng Kỹ thuật |
| tp.sanxuat@hytech.com | password123 | Trưởng phòng Sản xuất |

Sau khi tạo, chạy SQL sau để gán quyền (thay UUID thực tế):

```sql
-- Lấy UUID của các tài khoản vừa tạo
SELECT id, email FROM auth.users;

-- Cập nhật role (thay <uuid> bằng ID thực)
UPDATE profiles SET role='admin', full_name='Quản trị viên' WHERE id='<admin-uuid>';
UPDATE profiles SET role='accounting', full_name='Kế toán viên' WHERE id='<ketoan-uuid>';
UPDATE profiles SET role='department_head', full_name='Trưởng phòng Kỹ thuật',
  department_id='d1000000-0000-0000-0000-000000000001' WHERE id='<tp-kt-uuid>';
UPDATE profiles SET role='department_head', full_name='Trưởng phòng Sản xuất',
  department_id='d1000000-0000-0000-0000-000000000002' WHERE id='<tp-sx-uuid>';
```

### 5. Chạy ứng dụng

```bash
npm run dev
```

Truy cập [http://localhost:3000](http://localhost:3000)

## Cấu trúc thư mục

```
app/
├── login/          # Trang đăng nhập
├── dashboard/      # Trưởng phòng - nhập tăng ca
│   └── tong-hop/   # Tổng hợp tháng
├── ke-toan/        # Kế toán - xem và xuất báo cáo
│   ├── chi-tiet/   # Chi tiết tăng ca
│   └── tinh-luong/ # Tính lương tăng ca
├── admin/          # Admin - quản lý hệ thống
│   ├── phong-ban/  # Quản lý phòng ban
│   ├── nhan-vien/  # Quản lý nhân viên
│   ├── tai-khoan/  # Quản lý tài khoản
│   └── luong/      # Cài đặt lương & hệ số
└── api/
    └── admin/
        └── create-user/  # API tạo tài khoản (admin only)

components/
├── layout/         # Sidebar, AppLayout, PageHeader
├── overtime/       # OvertimeEntryTable, SalaryCalculator, ...
└── admin/          # DepartmentManager, EmployeeManager, ...

lib/
├── supabase/       # Client, Server, Middleware
├── utils/          # format.ts (date, currency, calculations)
├── excel-export.ts # Xuất Excel với xlsx
└── types.ts        # TypeScript interfaces

supabase/
├── schema.sql      # DDL: tables, RLS policies, functions
└── seed.sql        # Dữ liệu mẫu (60 nhân viên, 6 phòng ban)
```

## Công thức tính lương tăng ca

```
Lương giờ = Lương cơ bản ÷ (26 ngày × 8 giờ)
Tiền tăng ca = Lương giờ × Số giờ × Hệ số
```

Hệ số mặc định:
- Ngày thường: **1.5x**
- Ngày nghỉ tuần (Thứ 7, CN): **2.0x**
- Ngày lễ: **3.0x**

## Phân quyền

| Tính năng | Admin | Kế toán | Trưởng phòng |
|-----------|-------|---------|--------------|
| Nhập tăng ca | ✅ | ❌ | ✅ (phòng mình) |
| Xem tất cả | ✅ | ✅ | ❌ (chỉ phòng mình) |
| Xuất Excel | ✅ | ✅ | ❌ |
| Tính lương | ✅ | ✅ | ❌ |
| Quản lý nhân viên | ✅ | ❌ | ❌ |
| Cài đặt lương | ✅ | ❌ | ❌ |

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **Export**: xlsx library
- **Font**: Be Vietnam Pro (Google Fonts)

## Lưu ý triển khai

- Cần bật **Row Level Security** trên Supabase (đã có trong schema.sql)
- API tạo tài khoản (`/api/admin/create-user`) cần **Service Role Key** để hoạt động đầy đủ
- Thêm `SUPABASE_SERVICE_ROLE_KEY` vào environment variables khi deploy
