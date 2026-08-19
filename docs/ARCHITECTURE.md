# Kiến Trúc Hệ Thống - English Record (Architecture Guide)

Tài liệu này cung cấp cái nhìn toàn diện và chuyên sâu về thiết kế kiến trúc, luồng dữ liệu, mô hình xác thực, cấu trúc cơ sở dữ liệu và các tích hợp bên ngoài của nền tảng **English Record**.

---

## 1. Tổng quan Kiến trúc (High-Level Architecture)

**English Record** được xây dựng theo mô hình **Single Page Application (SPA)** hiện đại, tận dụng hệ sinh thái Serverless (Supabase, Cloudflare R2, Cloudflare Workers) giúp tối ưu hiệu năng, chi phí vận hành và khả năng mở rộng.

```mermaid
flowchart TD
    subgraph Client ["Client Layer (Browser SPA)"]
        UI["React 18 + TypeScript + TailwindCSS"]
        Router["React Router v7 (Lazy Loading)"]
        Audio["Web Audio API & AudioEncoder"]
        State["React Context (i18n) + Custom Hooks"]
    end

    subgraph Supabase ["Backend as a Service (Supabase)"]
        Auth["Supabase Auth\n(Email/Password & Anonymous)"]
        Postgres[("PostgreSQL Database\n(Topics, Vocab, Stories, Attendance)")]
        Realtime["Realtime Channels & Listeners"]
    end

    subgraph Storage ["Media Storage Layer"]
        R2["Cloudflare R2 / AWS S3\n(Audio Recordings, Images)"]
        CDN["Cloudflare CDN (Public URL)"]
    end

    subgraph AI_Layer ["AI & Serverless Services"]
        Worker["Cloudflare Worker AI Gateway"]
        Gemini["Google Gemini AI / Image Models"]
    end

    UI --> Router
    Router --> State
    State --> Audio

    State -->|CRUD & Queries| Postgres
    State -->|Session Management| Auth
    State -->|Live Updates| Realtime

    Audio -->|Upload Audio/Images| R2
    R2 --> CDN
    CDN -->|Stream Playback| UI

    State -->|Generate IPA, Stories, Images| Worker
    Worker --> Gemini
```

---

## 2. Công nghệ Cốt lõi (Tech Stack)

| Thành phần | Công nghệ / Thư viện | Vai trò |
| :--- | :--- | :--- |
| **Frontend Framework** | React 18 (TypeScript) | Xây dựng giao diện tương tác tốc độ cao, type-safe |
| **Build Tool & Server** | Vite 6 | Fast HMR, bundle tối ưu cho môi trường production |
| **Styling** | TailwindCSS 3, Lucide React | Hệ thống utility classes hiện đại, responsive, icon phong phú |
| **Routing** | React Router v7 | Điều hướng client-side, code-splitting (lazy loading) |
| **Database & Auth** | Supabase (PostgreSQL, GoTrue) | Quản lý người dùng, bảng dữ liệu quan hệ, realtime |
| **Media Storage** | Cloudflare R2 / AWS S3 SDK | Lưu trữ file ghi âm học viên, tranh minh họa từ vựng/truyện |
| **AI Integration** | Cloudflare Workers, Gemini API | Sinh câu chuyện, ảnh minh họa tự động, tạo phiên âm IPA |
| **Audio Processing** | Web Audio API, Custom WAV/WebM Encoder | Thu âm, nén âm thanh phía client, giảm tải băng thông |
| **Testing** | Vitest, Happy-DOM | Kiểm thử tự động đơn vị (Unit testing) |
| **Code Quality** | ESLint 10, Prettier, TypeScript 5.6 | Kiểm tra lỗi cú pháp, chuẩn hóa format code |

---

## 3. Mô hình Xác thực & Phân quyền (Authentication & Authorization)

Hệ thống hỗ trợ 2 vai trò người dùng chính với cơ chế xác thực riêng biệt:

```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng
    participant App as Ứng dụng Frontend
    participant SupabaseAuth as Supabase Auth
    participant DB as PostgreSQL (profiles)

    User->>App: Truy cập hệ thống
    App->>SupabaseAuth: getUser() / onAuthStateChange()
    
    alt Chưa có phiên đăng nhập
        App->>SupabaseAuth: signInAnonymously()
        App->>User: Điều hướng tới /login
    end

    alt Đăng nhập vai trò Giáo viên (Teacher)
        User->>App: Nhập Email & Mật khẩu
        App->>SupabaseAuth: signInWithPassword(email, password)
        SupabaseAuth-->>App: Trả về JWT Session
        App->>DB: Truy vấn profiles theo auth_uid
        DB-->>App: Role = 'teacher'
        App->>User: Điều hướng tới /teacher (TeacherPage)
    else Đăng nhập vai trò Học sinh (Student)
        User->>App: Chọn Profile học sinh từ danh sách
        App->>App: Lưu profile_id vào localStorage
        App->>DB: Truy vấn profiles theo ID
        DB-->>App: Role = 'student'
        App->>User: Điều hướng tới /student (StudentPage)
    end
```

### Các trạng thái phân quyền:
1. **Teacher (Giáo viên)**:
   - Xác thực qua email/mật khẩu tại Supabase Auth.
   - Có toàn quyền quản trị: Thêm/sửa/xóa chủ đề, câu hỏi, thẻ từ vựng, truyện đọc, quản lý tài khoản học viên, chấm điểm bài thu âm, điểm danh và tính học phí.
2. **Student (Học sinh)**:
   - Không yêu cầu tạo tài khoản phức tạp. Học sinh chọn đúng hồ sơ lớp học của mình để truy cập.
   - Học sinh luyện nói, xem flashcards, chơi game, luyện shadowing, ghi âm bài tập và nộp bài.

---

## 4. Mô hình Dữ liệu (Database Schema)

Cơ sở dữ liệu PostgreSQL được lưu trữ và quản lý trên Supabase. Dưới đây là sơ đồ liên kết giữa các bảng:

```mermaid
erDiagram
    PROFILES ||--o{ RECORDINGS : "tạo"
    PROFILES ||--o{ ATTENDANCE_RECORDS : "điểm danh"
    PROFILES ||--o{ ATTENDANCE_PAYMENTS : "đóng học phí"

    TOPICS ||--o{ QUESTIONS : "chứa"
    QUESTIONS ||--o{ RECORDINGS : "có các bản thu"

    VOCABULARY_SETS ||--o{ VOCABULARY_CARDS : "chứa"

    PROFILES {
        uuid id PK
        uuid auth_uid FK "Null nếu là học sinh"
        text name "Tên học sinh / giáo viên"
        text role "teacher | student"
        text class_name "Lớp học"
        text avatar_url "Ảnh đại diện"
        text language "vi | en"
        numeric unit_price "Học phí theo buổi"
        text phone "Số điện thoại phụ huynh"
        text zalo_phone "Số Zalo liên hệ"
    }

    TOPICS {
        uuid id PK
        text title "Tên chủ đề"
        text type "standard | bongbe"
        boolean is_active "Kích hoạt"
        integer order_index "Thứ tự hiển thị"
        jsonb grades "Danh sách khối lớp [1, 2, 3...]"
    }

    QUESTIONS {
        uuid id PK
        uuid topic_id FK
        text text "Nội dung câu hỏi tiếng Anh"
        text translation "Bản dịch tiếng Việt"
        text sample_answer "Câu trả lời mẫu"
        text target "Từ/cụm từ mục tiêu"
        text image_url "Ảnh minh họa"
        text audio_url "Audio câu hỏi mẫu"
        integer order_index "Thứ tự"
    }

    VOCABULARY_SETS {
        uuid id PK
        text title "Tên bộ từ vựng"
        text emoji "Biểu tượng đại diện"
        jsonb grades "Khối lớp áp dụng"
    }

    VOCABULARY_CARDS {
        uuid id PK
        uuid set_id FK
        text front "Từ tiếng Anh"
        text back "Nghĩa tiếng Việt"
        text ipa "Phiên âm quốc tế IPA"
        text image_url "Hình ảnh minh họa"
        integer order_index "Thứ tự thẻ"
    }

    STORIES {
        uuid id PK
        text title "Tên câu chuyện"
        text content "Nội dung câu chuyện"
        text emoji "Icon"
        text image_url "Tranh minh họa (AI/Upload)"
        jsonb grades "Khối lớp"
        boolean is_active "Trạng thái"
    }

    RECORDINGS {
        uuid id PK
        uuid student_id FK
        uuid question_id FK
        text audio_url "URL file âm thanh trên R2"
        numeric duration "Thời lượng (giây)"
        text status "submitted | reviewed"
        text teacher_feedback "Nhận xét của giáo viên"
        integer score "Điểm số đánh giá"
    }

    ATTENDANCE_RECORDS {
        uuid id PK
        uuid student_id FK
        timestamptz checkin_time "Thời điểm điểm danh"
    }

    ATTENDANCE_PAYMENTS {
        uuid id PK
        uuid student_id FK
        integer month "Tháng"
        integer year "Năm"
        boolean is_paid "Đã thanh toán"
        timestamptz paid_at "Ngày thanh toán"
    }
```

---

## 5. Pipeline Xử lý m thanh & Lưu trữ Tệp (Audio Pipeline)

Để đảm bảo việc thu âm trên trình duyệt hoạt động ổn định và tệp gửi lên Cloudflare R2 có dung lượng nhẹ, hệ thống triển khai pipeline xử lý âm thanh tự động:

```mermaid
flowchart LR
    Mic["Microphone\n(MediaRecorder API)"] --> RawAudio["Raw Audio Blob\n(WebM / Audio Buffer)"]
    RawAudio --> Encoder["Audio Encoder\n(audioEncoder.ts)"]
    Encoder --> OptimizedBlob["Optimized Audio\n(MP3 / WAV / WebM Nén)"]
    OptimizedBlob --> Service["uploadService.ts\n(AWS SDK S3 Client)"]
    Service --> R2["Cloudflare R2 Bucket\n(S3 API compatible)"]
    R2 --> CDN["Public URL\n(pub-...r2.dev)"]
    CDN --> SupabaseRecord["Lưu audio_url vào\nBảng recordings"]
```

### Điểm đặc biệt của Audio Pipeline:
- **Kiểm soát dung lượng & MIME type**: [uploadService.ts](file:///Users/thanhlv/Documents/Projects/english-record/src/services/uploadService.ts) kiểm tra định dạng hợp lệ (JPG, PNG, WebM, MP3, WAV) và chặn tệp vượt quá dung lượng cho phép.
- **Client-Side Encoding**: Giúp nén âm thanh ngay tại máy người học trước khi upload, tiết kiệm băng thông và tăng tốc độ tải bài.

---

## 6. Tích hợp AI (AI & Cloudflare Workers Gateway)

Hệ thống tích hợp AI phục vụ trực tiếp cho quá trình soạn thảo tài liệu giảng dạy của giáo viên:

```mermaid
flowchart TD
    Teacher["Giáo viên (Teacher Portal)"] --> AIModal["AI Generator Modals"]
    
    subgraph Features ["Tính năng AI"]
        F1["Sinh câu chuyện theo chủ đề\n(Story Generation)"]
        F2["Tạo tranh minh họa câu chuyện\n(AI Image Generation)"]
        F3["Sinh phiên âm IPA cho từ vựng\n(IPA Generation)"]
        F4["Trích xuất danh sách câu hỏi\n(AI Question Parser)"]
    end

    AIModal --> Features
    Features --> Worker["Cloudflare Worker\n(free-image-generation-api)"]
    Worker --> Model["Gemini / Cloudflare AI Models"]
    Model --> Worker
    Worker --> Response["Trả kết quả Text / Image Blob / IPA"]
    Response --> Form["Tự động điền Form & Lưu Supabase"]
```

---

## 7. Cấu trúc Thư mục Mã nguồn (Source Code Directory Map)

```
english-record/
├── .github/
│   └── workflows/ci.yml       # CI Pipeline (Type check & ESLint)
├── docs/                      # Tài liệu dự án
│   ├── ARCHITECTURE.md        # Kiến trúc hệ thống chi tiết (file này)
│   └── ONBOARDING.md          # Hướng dẫn dành cho developer mới
├── public/                    # Tài nguyên tĩnh (Favicon, manifest, offline assets)
├── src/
│   ├── components/            # UI Components chia theo module
│   │   ├── common/            # Components dùng chung (AudioPlayer, YouTubePlayer, OfflineBanner...)
│   │   ├── student/           # Giao diện học sinh (exercises, flashcards, games, shadowing, stories...)
│   │   └── teacher/           # Giao diện giáo viên (attendance, topics, vocabulary, stories, students...)
│   ├── data/                  # Dữ liệu tĩnh / Seed data
│   ├── hooks/                 # Custom React Hooks dùng chung (online status, scroll lock, keyboard shortcuts)
│   ├── i18n/                  # Hệ thống đa ngôn ngữ (LanguageContext, en.ts, vi.ts)
│   ├── lib/                   # Khởi tạo SDK bên thứ 3 (supabase.ts, s3.ts)
│   ├── pages/                 # Các trang chính (LoginPage, StudentPage, TeacherPage)
│   ├── services/              # Business logic & gọi API (topicService, vocabularyService, storyService, uploadService)
│   ├── test/                  # Cấu hình setup kiểm thử Vitest
│   ├── types/                 # Định nghĩa TypeScript Types / Interfaces
│   ├── utils/                 # Hàm tiện ích (audioEncoder, validators, streak, format, prizes)
│   ├── App.tsx                # Main App Router & Root Authentication State
│   └── main.tsx               # Điểm khởi chạy React DOM
├── .env.example               # Mẫu biến môi trường
├── package.json               # Dependencies & Scripts
├── tailwind.config.js         # Cấu hình giao diện TailwindCSS
├── vite.config.ts             # Cấu hình Vite Build Tool
└── vitest.config.ts           # Cấu hình Unit Test Runner
```

---

## 8. Chiến lược Xử lý Ngoại lệ & Bảo mật (Security & Resilience)

1. **Input Validation**: Mọi dữ liệu đầu vào (tên học sinh, số điện thoại, tiêu đề chủ đề, nội dung câu hỏi) đều được kiểm tra chặt chẽ thông qua [validators.ts](file:///Users/thanhlv/Documents/Projects/english-record/src/utils/validators.ts) và Zod Schemas.
2. **Offline Detection**: Hệ thống sử dụng hook `useOnlineStatus` kết hợp component `OfflineBanner` để cảnh báo kịp thời cho học sinh khi mất kết nối mạng.
3. **Graceful Auth Timeout**: Trường hợp kết nối tới Supabase Auth bị trễ, `App.tsx` có cơ chế timeout 5 giây ngăn chặn việc ứng dụng bị treo ở màn hình loading vô hạn.

---

## 9. Quy Trình CI & Triển Khai (CI Pipeline & Render Deployment)

Hệ thống tích hợp quy trình **Continuous Integration (CI)** tự động thông qua GitHub Actions kết hợp cùng **Auto-Deploy trên Render**:

```mermaid
flowchart TD
    subgraph GitEvents ["Sự Kiện Git"]
        PR["Pull Request -> develop / main"]
        Merge["Push / Merge -> main"]
    end

    subgraph GitHubActions ["GitHub Actions CI Pipeline (.github/workflows/ci.yml)"]
        PR --> CI_Start[Kích hoạt CI Workflow]
        Merge --> CI_Start
        
        CI_Start --> Job1["1. Lint & Format Check<br/>(ESLint + Prettier)"]
        CI_Start --> Job2["2. TypeScript Type Check<br/>(tsc --noEmit)"]
        CI_Start --> Job3["3. Automated Tests & Coverage<br/>(170+ Vitest Tests)"]
        CI_Start --> Job4["4. Security Vulnerability Scan<br/>(npm audit)"]
        
        Job1 & Job2 & Job3 & Job4 --> Job5["5. Production Build Verification<br/>(Vite Build Artifacts)"]
    end

    subgraph RenderDeployment ["Triển Khai Render (render.yaml / Auto Deploy)"]
        Merge -->|Webhook Trigger| Render_Build["Render Static Site Builder<br/>(npm run build)"]
        Render_Build --> Render_Deploy["Phát hành bản build lên CDN Render"]
        Render_Deploy --> Client_Users["Người dùng truy cập ứng dụng (SPA Routing & Caching)"]
    end
```

### Chi tiết các tầng kiểm thử trong CI:
- **Lint & Format**: Kiểm tra quy chuẩn cú pháp JavaScript/TypeScript và định dạng Prettier (`format:check`).
- **Type Check**: Chạy `tsc --noEmit` xác thực toàn bộ kiểu dữ liệu mà không cần tạo file build.
- **Unit Tests & Coverage**: Chạy toàn diện bộ test cases với Vitest, đo lường độ bao phủ mã nguồn (>90%) và lưu trữ artifact 14 ngày.
- **Security Audit**: Quét các lỗ hổng bảo mật cấp cao và nghiêm trọng từ dependencies.
- **Production Build**: Biên dịch bundle thực tế, kiểm tra kích thước chunk và tính hợp lệ của mã đóng gói.

### Cơ chế Deploy trên Render:
- Ứng dụng được cấu hình qua file `render.yaml` theo dạng **Static Site**.
- **SPA Routing Rewrite**: Mọi request tới URL nhánh con được điều hướng tự động về `index.html` (`/* -> /index.html`).
- **Asset Caching**: Các file trong `/assets/` được áp dụng header `Cache-Control: public, max-age=31536000, immutable`.
- **Biến môi trường**: Được quản lý an toàn qua Render Dashboard Environment Variables.

