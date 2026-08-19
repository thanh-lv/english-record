# 🎙️ English Record - Nền Tảng Luyện Tiếng Anh & Quản Lý Lớp Học

[![CI Workflow](https://github.com/thanhlv/english-record/actions/workflows/ci.yml/badge.svg)](https://github.com/thanhlv/english-record/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB.svg?logo=react)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF.svg?logo=vite)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC.svg?logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-3ECF8E.svg?logo=supabase)](https://supabase.com/)

**English Record** là nền tảng học và luyện phát âm tiếng Anh trực tuyến toàn diện, kết hợp quản lý lớp học dành cho Giáo viên và trải nghiệm học tập gamification dành cho Học sinh.

---

## 📚 Mục Lục

- [✨ Tính Năng Nổi Bật](#-tính-năng-nổi-bật)
  - [Cổng Học Viên (Student Portal)](#-cổng-học-viên-student-portal)
  - [Cổng Giáo Viên (Teacher Portal)](#-cổng-giáo-viên-teacher-portal)
- [🛠️ Công Nghệ Sử Dụng (Tech Stack)](#️-công-nghệ-sử-dụng-tech-stack)
- [🚀 Hướng Dẫn Cài Đặt & Chạy Cục Bộ](#-hướng-dẫn-cài-đặt--chạy-cục-bộ)
- [📜 Danh Mục Lệnh (NPM Scripts)](#-danh-mục-lệnh-npm-scripts)
- [📂 Cấu Trúc Thư Mục Dự Án](#-cấu-trúc-thư-mục-dự-án)
- [📖 Tài Liệu Chi Tiết](#-tài-liệu-chi-tiết)

---

## ✨ Tính Năng Nổi Bật

### 🎓 Cổng Học Viên (Student Portal)
- **Luyện Nói Theo Chủ Đề (Exercises & Topics)**: Hệ thống chủ đề phong phú từ đời sống đến học thuật. Học sinh có thể nghe câu hỏi mẫu, đọc câu trả lời gợi ý, ghi âm trực tiếp giọng nói của mình và nộp bài.
- **Thẻ Từ Vựng (Flashcards)**: Học từ vựng theo bộ thẻ tương tác lật mặt, kèm phiên âm IPA chuẩn, tranh minh họa và phát âm audio.
- **Luyện Nói Shadowing (Shadowing Practice)**: Luyện ngữ điệu theo video YouTube hoặc bài nói mẫu, đồng bộ phụ đề từng giây và thu âm so sánh.
- **Đọc Truyện Tiếng Anh (Stories)**: Đọc truyện ngắn có hình ảnh minh họa sinh động, hỗ trợ nghe phát âm từng đoạn văn bản.
- **Trò Chơi Tương Tác (Interactive Games)**: Các trò chơi củng cố từ vựng và phản xạ tiếng Anh (Word Match, Spelling, Memory Game...).
- **Động Lực & Đổi Thưởng (Achievements & Streaks)**: Theo dõi chuỗi ngày học liên tục (streak), thu thập huy hiệu và đổi quà thưởng theo điểm tích lũy.
- **Đa Ngôn Ngữ & Offline Ready**: Hỗ trợ chuyển đổi nhanh Tiếng Việt / Tiếng Anh cùng thanh cảnh báo khi mất kết nối mạng.

### 👩‍🏫 Cổng Giáo Viên (Teacher Portal)
- **Quản Lý Chủ Đề & Câu Hỏi (Topics Manager)**: Soạn thảo câu hỏi, phân loại theo khối lớp (`grades`), đính kèm hình ảnh và audio. Tích hợp công cụ **AI Question Parser** trích xuất tự động danh sách câu hỏi từ văn bản thô.
- **Quản Lý Từ Vựng & Sinh IPA AI (Vocabulary Manager)**: Tạo bộ thẻ từ vựng nhanh chóng, tích hợp AI tự động tra và điền phiên âm IPA chuẩn quốc tế.
- **Quản Lý & Sinh Truyện Bằng AI (Stories Manager)**: Tạo truyện đọc tự động từ gợi ý của giáo viên bằng AI, tự động sinh tranh minh họa câu chuyện.
- **Quản Lý Shadowing (Shadowing Manager)**: Thêm mới video YouTube, phân đoạn timestamps và tạo bài luyện ngữ điệu.
- **Chấm Bài & Phản Hồi Giọng Nói (Recordings & Teacher Feedback)**: Nghe trực tiếp bản ghi âm của học sinh, chấm điểm và ghi nhận xét chi tiết.
- **Điểm Danh & Tính Học Phí Tự Động (Attendance & Tuition Manager)**:
  - Điểm danh học sinh theo ngày bằng một chạm.
  - Tự động thống kê số buổi học theo tháng và tính toán tổng học phí.
  - Tạo phiếu báo học phí (Tuition Slip) định dạng ảnh sắc nét.
  - Chia sẻ trực tiếp phiếu học phí và thông báo tới phụ huynh qua Zalo.
- **Hệ Thống Thông Báo (Notifications)**: Thông báo tức thời khi có học sinh nộp bản ghi âm mới.

---

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)

| Lớp kiến trúc | Công nghệ chính |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, TailwindCSS, Lucide Icons |
| **Build & Bundle** | Vite 6, PostCSS, Autoprefixer |
| **Routing** | React Router v7 (Lazy-loaded code splitting) |
| **Database & Auth** | Supabase (PostgreSQL, Supabase Auth, Row Level Security) |
| **Media Storage** | Cloudflare R2 / AWS S3 SDK (Direct audio & image upload) |
| **AI Services** | Cloudflare Workers, Google Gemini API |
| **Audio Processing**| Web Audio API, Custom AudioEncoder (WebM / WAV / MP3) |
| **Testing** | Vitest, Happy-DOM |
| **Code Quality** | ESLint 10, Prettier, TypeScript Strict Checking |

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Cục Bộ

### 1. Yêu cầu hệ thống
- **Node.js**: Phiên bản `>= 18.0.0`
- **npm**: Đi kèm với Node.js

### 2. Cài đặt và cấu hình

```bash
# 1. Clone repository về máy
git clone https://github.com/thanhlv/english-record.git
cd english-record

# 2. Cài đặt các thư viện phụ thuộc
npm install

# 3. Tạo file biến môi trường từ file mẫu
cp .env.example .env
```

Mở file `.env` và điền các thông số Supabase và S3/R2 của bạn (xem mô tả chi tiết trong [.env.example](file:///.env.example)).

### 3. Nạp dữ liệu mẫu ban đầu (Tùy chọn)

```bash
node seed-topics.cjs
```

### 4. Khởi chạy máy chủ phát triển

```bash
npm run dev
```
Ứng dụng sẽ chạy tại địa chỉ: `http://localhost:5173`.

---

## 📜 Danh Mục Lệnh (NPM Scripts)

- `npm run dev`: Chạy dev server với HMR.
- `npm run build`: Biên dịch TypeScript và build bundle tối ưu cho production.
- `npm run preview`: Chạy thử bản build production local.
- `npm run type-check`: Kiểm tra toàn bộ kiểu dữ liệu bằng `tsc --noEmit`.
- `npm run lint`: Chạy ESLint kiểm tra quy chuẩn mã nguồn.
- `npm run lint:fix`: Tự động sửa các lỗi linter.
- `npm run format`: Định dạng mã nguồn tự động với Prettier.
- `npm run format:check`: Kiểm tra định dạng mã nguồn trong CI pipeline.
- `npm run test`: Chạy toàn bộ Unit Tests với Vitest.
- `npm run test:watch`: Chạy Vitest ở chế độ theo dõi file thay đổi.
- `npm run test:coverage`: Xuất báo cáo độ bao phủ kiểm thử (Coverage Report).
- `npm run check-all`: **Chạy kiểm tra toàn diện** (format:check + type-check + lint + test + build).

---

## 🌐 Triển Khai Lên Render (Deployment)

Dự án được tối ưu sẵn sàng triển khai dưới dạng **Static Site** trên **[Render](https://render.com/)** thông qua tệp cấu hình [render.yaml](file:///render.yaml):

1. Kết nối repository `english-record` trên tài khoản Render.
2. Chọn **New + > Blueprint** hoặc tạo **Static Site**:
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
   - **Redirects/Rewrites**: `/*` chuyển tiếp về `/index.html` (SPA Routing).
3. Thêm các biến môi trường cấu hình (Supabase, S3/R2) trong tab **Environment Variables** của Render.
4. Render sẽ tự động build và deploy mỗi khi có commit mới được merge vào nhánh `main`.

---

## 📂 Cấu Trúc Thư Mục Dự Án

```
english-record/
├── .github/workflows/         # Cấu hình GitHub Actions CI (Lint, Typecheck, Test, Build, Audit)
├── docs/                      # Tài liệu kỹ thuật chi tiết
│   ├── ARCHITECTURE.md        # Kiến trúc hệ thống, Sơ đồ Mermaid, Database Schema
│   └── ONBOARDING.md          # Hướng dẫn chi tiết cho thành viên mới
├── render.yaml                # Cấu hình tự động triển khai Static Site trên Render
├── public/                    # Tài nguyên tĩnh
├── src/
│   ├── components/            # UI Components theo từng phân hệ
│   │   ├── common/            # AudioPlayer, YouTubePlayer, OfflineBanner...
│   │   ├── student/           # Màn hình học sinh (exercises, flashcards, games, stories...)
│   │   └── teacher/           # Màn hình giáo viên (attendance, topics, vocabulary, stories...)
│   ├── hooks/                 # Custom React Hooks
│   ├── i18n/                  # Hệ thống đa ngôn ngữ (Tiếng Việt / Tiếng Anh)
│   ├── lib/                   # SDK Clients (Supabase, S3)
│   ├── pages/                 # Trang ứng dụng (LoginPage, StudentPage, TeacherPage)
│   ├── services/              # Tầng xử lý nghiệp vụ & API (Topics, Vocab, Stories, Upload)
│   ├── test/                  # Cấu hình test environment
│   ├── types/                 # Định nghĩa kiểu dữ liệu TypeScript
│   ├── utils/                 # Các tiện ích (AudioEncoder, Validators, Streak...)
│   ├── App.tsx                # App Root & Session Routing
│   └── main.tsx               # Main Entry Point
├── .env.example               # Mẫu cấu hình môi trường
└── package.json               # Cấu hình gói và dependencies
```

---

## 📖 Tài Liệu Chi Tiết

- 🏗️ **[Tài liệu Kiến Trúc Hệ Thống (docs/ARCHITECTURE.md)](file:///docs/ARCHITECTURE.md)**: Sơ đồ luồng dữ liệu, phân quyền (Auth Flow), quy trình nén và upload âm thanh, cấu trúc bảng PostgreSQL.
- 🚀 **[Hướng Dẫn Bắt Đầu Dành Cho Thành Viên Mới (docs/ONBOARDING.md)](file:///docs/ONBOARDING.md)**: Hướng dẫn nhanh 5 phút, cách thêm tính năng mới, viết test, quy chuẩn commit và xử lý sự cố thường gặp.