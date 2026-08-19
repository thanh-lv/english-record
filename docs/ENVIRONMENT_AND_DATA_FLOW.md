# Tài Liệu Thiết Lập Môi Trường & Luồng Dữ Liệu (Environment Setup & Data Flows)

Tài liệu này cung cấp hướng dẫn toàn diện về cách thiết lập môi trường phát triển, giải thích chi tiết các biến môi trường, cấu trúc database, các tài nguyên tĩnh trong thư mục `public/` và toàn bộ **8 Luồng Dữ Liệu (Data Flows)** cốt lõi của hệ thống **English Record**.

---

## 1. Thiết Lập Môi Trường (Environment Setup)

### A. Yêu Cầu Tiên Quyết
- **Node.js**: Phiên bản `>= 18.0.0` (Khuyến nghị Node.js 20 hoặc 22 LTS).
- **Trình quản lý gói**: `npm` hoặc `pnpm`.
- **Cơ sở dữ liệu**: Dự án Supabase (PostgreSQL + Auth + Storage).
- **Lưu trữ Audio**: Cloudflare R2 (hoặc AWS S3 tương thích).

---

### B. Bảng Cấu Hình Biến Môi Trường (`.env`)

Sao chép `.env.example` thành `.env` và cấu hình các biến sau:

| Tên Biến | Bắt Buộc | Mô Tả & Mục Đích | Ví Dụ Giá Trị |
| :--- | :---: | :--- | :--- |
| `VITE_SUPABASE_URL` | **Có** | Endpoint kết nối API của dự án Supabase | `https://xxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | **Có** | Khóa công khai (Anon Key) dùng cho client-side | `eyJhbGciOiJIUzI1NiIsIn...` |
| `VITE_S3_ENDPOINT` | **Có** | Endpoint S3 API của Cloudflare R2 | `https://<account_id>.r2.cloudflarestorage.com` |
| `VITE_S3_REGION` | **Có** | Vùng lưu trữ S3 (thường là `auto` cho R2) | `auto` |
| `VITE_S3_BUCKET` | **Có** | Tên Bucket chứa các file ghi âm học sinh | `english-recordings` |
| `VITE_S3_ACCESS_KEY_ID` | **Có** | Access Key ID có quyền ghi vào S3 Bucket | `0a1b2c3d4e5f...` |
| `VITE_S3_SECRET_ACCESS_KEY` | **Có** | Secret Access Key tương ứng | `9z8y7x6w5v4u...` |
| `VITE_S3_PUBLIC_URL` | **Có** | Public Domain hoặc Custom CDN URL để phát audio | `https://audio.myenglish.com` |
| `VITE_AI_API_KEY` | Tùy chọn | API Key cho AI Image Generation (Workers / Pollinations) | `sk-...` |

---

### C. Cấu Trúc Bảng Dữ Liệu Trên Supabase

1. **`profiles`**: Thông tin người dùng (`id`, `auth_uid`, `name`, `role`, `grade`, `avatar`, `language`, `password`).
2. **`topics`**: Danh mục chủ đề luyện nói (`id`, `title`, `type`, `grades`, `order_index`, `is_active`).
3. **`questions`**: Câu hỏi thuộc chủ đề (`id`, `topic_id`, `text`, `translation`, `sample_answer`, `target`, `image_url`, `audio_url`, `order_index`).
4. **`recordings`**: Bản ghi âm của học sinh (`id`, `student_name`, `topic_id`, `topic_number`, `audio_url`, `teacher_rating`, `teacher_feedback`, `student_reaction`, `status`).
5. **`stories`**: Câu chuyện đọc tiếng Anh (`id`, `title`, `type`, `content`, `emoji`, `image_url`, `grades`, `is_active`).
6. **`vocab_sets` & `vocab_cards`**: Bộ thẻ từ vựng (`title`, `front`, `back`, `ipa`, `image_url`, `audio_url`).
7. **`shadowing_videos`**: Video luyện nói theo phụ đề YouTube (`title`, `youtube_url`, `preview_start`, `preview_end`, `record_start`, `record_end`, `grades`, `is_active`).
8. **`attendance_students`**: Danh sách học sinh điểm danh (`name`, `class_name`, `unit_price`, `phone`, `zalo_phone`, `hoc_lieu_fee`, `note`).
9. **`attendance_records`**: Lịch sử điểm danh từng buổi (`student_id`, `checkin_time`).
10. **`attendance_payments`**: Lịch sử đóng học phí (`student_id`, `month`, `year`, `is_paid`, `paid_at`).
11. **`client_error_logs`**: Lịch sử log lỗi và chẩn đoán phía client (`user_id`, `level`, `module`, `message`, `stack`, `url`, `user_agent`).

---

### D. Cấu Trúc Tài Nguyên Thư Mục `public/`

| Tên File | Vai Trò & Mục Đích |
| :--- | :--- |
| [`public/manifest.json`](file:///Users/thanhlv/Documents/Projects/english-record/public/manifest.json) | Cấu hình PWA (Progressive Web App) cho phép cài đặt app lên màn hình chính |
| [`public/sw.js`](file:///Users/thanhlv/Documents/Projects/english-record/public/sw.js) | Service Worker xử lý Offline Caching, Cache Busting và lưu trữ tài nguyên tĩnh |
| [`public/icon.svg`](file:///Users/thanhlv/Documents/Projects/english-record/public/icon.svg) | Logo Vector của ứng dụng, hiển thị trên Favicon, Bookmark và Apple Touch Icon |
| [`public/_redirects`](file:///Users/thanhlv/Documents/Projects/english-record/public/_redirects) | Cấu hình Rewrite URL cho Cloudflare Pages / Netlify để hỗ trợ Client-Side Routing |

---

## 2. Chi Tiết Các Luồng Dữ Liệu (Core Data Flows)

---

### 🟢 Luồng 1: Xác Thực & Điều Hướng (Authentication & Authorization)

```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng (Học sinh / Giáo viên)
    participant UI as Giao diện (App.tsx / LoginPage.tsx)
    participant AuthHook as useAuth Hook
    participant SupabaseAuth as Supabase Auth & Profiles
    participant Logger as loggerService

    User->>UI: Truy cập ứng dụng
    UI->>AuthHook: Khởi tạo phiên đăng nhập
    AuthHook->>SupabaseAuth: Kiểm tra session hiện tại (getCurrentUser)
    
    alt Chưa có session
        AuthHook->>SupabaseAuth: signInAnonymously() (Tạo session ẩn danh cho học sinh)
    end

    alt Đăng nhập Học sinh (Tên + Mật khẩu học sinh)
        User->>UI: Nhập Tên học sinh + Mật khẩu
        UI->>SupabaseAuth: loginStudent(name, pass, anonUid)
        SupabaseAuth-->>UI: Trả về Profile (role: 'student')
        UI->>AuthHook: Cập nhật userProfile & chuyển hướng tới /student
        UI->>Logger: setUserContext({ id, name, role: 'student' })
    else Đăng nhập Giáo viên (Email + Mật khẩu Supabase)
        User->>UI: Nhập Email + Password
        UI->>SupabaseAuth: signInWithPassword(email, password)
        SupabaseAuth-->>UI: Trả về Profile (role: 'teacher')
        UI->>AuthHook: Cập nhật userProfile & chuyển hướng tới /teacher
        UI->>Logger: setUserContext({ id, name, role: 'teacher' })
    end
```

---

### 🟢 Luồng 2: Thu Âm, Mã Hóa & Tải Lên Đám Mây (Voice Recording & Audio Pipeline)

```mermaid
sequenceDiagram
    autonumber
    actor Student as Học sinh
    participant Modal as TopicModal / ShadowingDetail
    participant RecHook as useRecording Hook
    participant MediaRec as MediaRecorder (Web Audio API)
    participant Encoder as audioEncoder (WAV / WebM)
    participant S3 as Cloudflare R2 / S3 Storage
    participant DB as Supabase (recordings table)

    Student->>Modal: Nhấn "Bắt đầu thu âm"
    Modal->>RecHook: startRecording()
    RecHook->>MediaRec: Bắt đầu thu audio stream từ microphone
    MediaRec-->>RecHook: Phát sinh các chunk audio/webm
    Student->>Modal: Nhấn "Dừng & Gửi bài"
    Modal->>RecHook: stopRecording()
    RecHook->>Encoder: Tạo Blob audio hoàn chỉnh & chuẩn hóa bitrate
    RecHook->>S3: uploadToStorage(blob, 'recordings/filename.webm')
    S3-->>RecHook: Trả về Public Audio CDN URL
    RecHook->>DB: INSERT into recordings (student_name, topic_id, audio_url, duration)
    DB-->>Modal: Ghi nhận nộp bài thành công
    Modal->>Modal: Kích hoạt hiệu ứng chúc mừng (CompletionCelebration)
```

---

### 🟢 Luồng 3: Bộ Nhớ Đệm Client, Khử Trùng Lặp & SWR (`clientCache` & `useQuery`)

```mermaid
sequenceDiagram
    autonumber
    participant Component as React Component (useQuery)
    participant Engine as clientCache (RAM + LocalStorage)
    participant API as Supabase Service (PostgREST)

    Component->>Engine: getOrFetch('topics_all', fetchAllTopics, { ttl: 60000 })
    
    alt Dữ liệu có sẵn trong Cache và chưa hết hạn (Fresh)
        Engine-->>Component: Trả về kết quả ngay lập tức (0ms latency)
    else Có Request trùng lặp đang chạy đồng thời (In-Flight)
        Engine-->>Component: Tái sử dụng cùng một In-flight Promise (Deduplication)
    else Dữ liệu hết hạn (Stale) hoặc chưa có trong Cache
        Engine->>API: Gọi fetchAllTopics()
        API-->>Engine: Trả về dữ liệu mới nhất
        Engine->>Engine: Cập nhật RAM Cache + LocalStorage Fallback
        Engine-->>Component: Trả về dữ liệu mới nhất & re-render
    end

    alt Khi có thao tác Ghi (Tạo / Sửa / Xóa Chủ đề)
        Component->>API: topicService.createTopic(payload)
        Component->>Engine: clientCache.invalidate('topics') (Xóa toàn bộ key chứa 'topics')
    end
```

---

### 🟢 Luồng 4: Phòng Chống XSS & Khử Nhiễm Dữ Liệu Đầu Vào (Security Pipeline)

```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng nhập Form
    participant Form as Modal / Form Component
    participant Security as utils/security.ts
    participant Schema as Zod Schemas (topic, story, student...)
    participant Service as Service Layer (withServiceHandling)
    participant DB as Supabase Database

    User->>Form: Nhập chuỗi có chứa script/XSS (<script>, <img onerror>, javascript:...)
    Form->>Schema: validateWithSchema(schema, rawData)
    Schema->>Security: sanitizeInput(rawText)
    Security->>Security: Loại bỏ script tags, iframe, inline on* handlers, protocols nguy hiểm
    Security-->>Schema: Chuỗi an toàn đã được làm sạch
    Schema->>Schema: Kiểm tra độ dài (min, max), định dạng (regex, types)
    
    alt Dữ liệu không hợp lệ
        Schema-->>Form: Trả về lỗi hiển thị thân thiện cho người dùng
    else Dữ liệu hợp lệ
        Form->>Service: Gọi Service với Payload đã làm sạch
        Service->>DB: Thực thi INSERT / UPDATE an toàn
    end
```

---

### 🟢 Luồng 5: Điểm Danh, Tính Học Phí & Chia Sẻ Zalo (Attendance & Tuition)

```mermaid
sequenceDiagram
    autonumber
    actor Teacher as Giáo viên
    participant Tab as CheckinTab / SummaryTab
    participant AttService as attendanceService
    participant DB as Supabase (attendance_records / payments)
    actor Parent as Phụ huynh (Zalo)

    Teacher->>Tab: Chọn ngày trên Lịch & Tích chọn học sinh có mặt
    Tab->>AttService: saveAttendanceCheckin([{ student_id, checkin_time }])
    AttService->>DB: INSERT INTO attendance_records
    
    Note over Tab,DB: Tự động tính toán tổng số buổi và học phí trong tháng

    Teacher->>Tab: Mở SummaryTab xem thống kê & xuất phiếu học phí
    Tab->>AttService: fetchMonthlySummary(month, year)
    AttService->>DB: SELECT records + student unit_price
    DB-->>Tab: Danh sách tổng kết học phí theo từng học sinh
    Teacher->>Tab: Nhấn "Gửi Zalo"
    Tab->>Parent: Mở ứng dụng Zalo với nội dung tin nhắn mẫu đã soạn sẵn
```

---

### 🟢 Luồng 6: Luyện Nói Shadowing & Phân Đoạn Video YouTube

```mermaid
sequenceDiagram
    autonumber
    actor Student as Học sinh
    participant Page as ShadowingDetail.tsx
    participant Player as YouTube IFrame Player
    participant Rec as useRecording Hook

    Student->>Page: Chọn video luyện Shadowing
    Page->>Player: Tải video YouTube & nhảy đến `preview_start`
    Player->>Student: Phát đoạn video câu mẫu từ `preview_start` đến `preview_end`
    Student->>Rec: Bắt đầu thu âm lặp lại câu nói (Shadowing)
    Rec->>Page: Hoàn thành thu âm, tải lên S3 & lưu vào `recordings`
```

---

### 🟢 Luồng 7: Tạo Bộ Từ Vựng & Sinh Âm Thanh / Timestamps (Vocab Audio Builder)

```mermaid
sequenceDiagram
    autonumber
    actor Teacher as Giáo viên
    participant UI as VocabAudioBuilder.tsx
    participant TTS as Web SpeechSynthesis / AudioBuilder
    participant Storage as Cloudflare R2 / S3
    participant DB as Supabase (vocab_sets, vocab_cards)

    Teacher->>UI: Nhập danh sách từ vựng tiếng Anh
    Teacher->>UI: Cấu hình khoảng cách giữa các từ & số lần lặp
    UI->>TTS: Khởi tạo tiến trình sinh chuỗi âm thanh và tính mốc timestamps
    TTS-->>UI: Trả về Audio Blob + Mảng WordTimestamp[]
    UI->>Storage: Tải file audio lên S3
    Storage-->>UI: Audio URL
    UI->>DB: Lưu VocabSet & VocabCards vào database
```

---

### 🟢 Luồng 8: Ghi Log Lỗi Phía Client & Chẩn Đoán Từ Xa (Client Logging)

```mermaid
sequenceDiagram
    autonumber
    participant App as Ứng dụng React / Trình duyệt
    participant EB as ErrorBoundary / withServiceHandling
    participant Logger as loggerService
    participant Local as localStorage (Crash Buffer)
    participant DB as Supabase (client_error_logs)
    actor Admin as Giáo viên / Kỹ thuật viên

    App->>EB: Phát sinh lỗi Service hoặc Unhandled Exception
    EB->>Logger: logger.error(module, message, error, data)
    Logger->>Local: Lưu vào localStorage ('english_record_error_logs')
    
    alt Lỗi cấp độ ERROR hoặc WARN
        Logger->>Logger: Kiểm tra Throttle (chống spam trùng lặp trong 30s)
        Logger->>DB: INSERT INTO client_error_logs (user_id, module, message, stack, url, user_agent)
    end

    alt Khi cần hỗ trợ kỹ thuật
        App->>Admin: Xem danh sách lỗi thời gian thực tại Tab Logs trong Teacher Portal
    end
```

---

## 3. Quy Trình Kiểm Tra & Triển Khai (CI / Verification)

Để đảm bảo toàn bộ mã nguồn tuân thủ tiêu chuẩn chất lượng cao nhất:

```bash
# 1. Kiểm tra format code bằng Prettier
npm run format:check

# 2. Kiểm tra toàn bộ kiểu dữ liệu TypeScript
npm run type-check

# 3. Quét mã nguồn với ESLint
npm run lint

# 4. Chạy toàn bộ 45+ unit test suites
npm run test

# 5. Xuất báo cáo độ phủ mã nguồn
npm run test:coverage

# 6. Biên dịch bản build production
npm run build

# Hoặc chạy kiểm tra toàn diện một lệnh duy nhất:
npm run check-all
```
