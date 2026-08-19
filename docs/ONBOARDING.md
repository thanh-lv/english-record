# Hướng Dẫn Bắt Đầu Dành Cho Thành Viên Mới (Onboarding Guide)

Chào mừng bạn tham gia phát triển dự án **English Record**! Tài liệu này sẽ hướng dẫn bạn thiết lập môi trường phát triển cục bộ, nắm bắt quy trình làm việc và tự tin đóng góp mã nguồn (pull requests).

---

## 1. Khởi Động Nhanh Trong 5 Phút (5-Minute Quickstart)

### Yêu cầu tiên quyết:
- **Node.js**: Phiên bản `>= 18.0.0` (khuyến nghị Node.js 20 hoặc 22 LTS).
- **Trình quản lý gói**: `npm` đi kèm với Node.js.
- **Trình duyệt**: Google Chrome, Microsoft Edge hoặc Safari (hỗ trợ Web Audio API và MediaRecorder).

### Các bước thực hiện:

#### Bước 1: Cài đặt thư viện phụ thuộc
```bash
npm install
```

#### Bước 2: Cấu hình biến môi trường
Sao chép file mẫu `.env.example` thành `.env`:
```bash
cp .env.example .env
```
Điền các khóa cấu hình Supabase và S3/R2 do nhóm dự án cung cấp (hoặc sử dụng Supabase local/staging).

#### Bước 3: (Tùy chọn) Nạp dữ liệu mẫu ban đầu
Nếu bạn đang kết nối tới một cơ sở dữ liệu Supabase mới tinh, bạn có thể nạp các chủ đề và câu hỏi luyện nói mẫu bằng lệnh:
```bash
node seed-topics.cjs
```

#### Bước 4: Khởi chạy môi trường phát triển (Dev Server)
```bash
npm run dev
```
Mở trình duyệt và truy cập `http://localhost:5173`. Ứng dụng sẽ tự động tải với tính năng Hot Module Replacement (HMR).

---

## 2. Các Lệnh Thao Tác Thường Dùng (NPM Scripts)

| Lệnh | Ý nghĩa & Mục đích |
| :--- | :--- |
| `npm run dev` | Khởi chạy máy chủ phát triển Vite với Hot Reload |
| `npm run build` | Biên dịch TypeScript và build bundle tối ưu cho production vào thư mục `dist/` |
| `npm run preview` | Chạy thử bản build production trên máy local |
| `npm run type-check` | Chạy trình biên dịch TypeScript (`tsc --noEmit`) để kiểm tra toàn bộ kiểu dữ liệu |
| `npm run lint` | Chạy ESLint để quét lỗi cú pháp và quy chuẩn code |
| `npm run lint:fix` | Tự động sửa các lỗi linter có thể sửa tự động |
| `npm run format` | Định dạng toàn bộ mã nguồn theo chuẩn Prettier |
| `npm run format:check` | Kiểm tra định dạng mã nguồn theo Prettier mà không sửa file (dùng trong CI) |
| `npm run test` | Chạy bộ kiểm thử tự động với Vitest |
| `npm run test:watch` | Chạy Vitest ở chế độ theo dõi file thay đổi liên tục |
| `npm run test:coverage`| Xuất báo cáo độ bao phủ mã kiểm thử (Coverage Report) |
| `npm run check-all` | **Lệnh tổng hợp quan trọng**: Chạy lần lượt `format:check`, `type-check`, `lint`, `test` và `build` |

> [!TIP]
> Trước khi tạo Pull Request hoặc commit code mới, hãy luôn chạy `npm run check-all` để đảm bảo code vượt qua 100% các bước kiểm tra tự động của CI pipeline trên GitHub Actions!

---

## 3. Hướng Dẫn Phát Triển Tính Năng Mới (Step-by-step Guides)

### A. Thêm một Dịch Vụ Mới (Service Layer)
Tất cả các hàm gọi cơ sở dữ liệu hoặc API ngoài nên được đặt trong `src/services/`:
1. Tạo file service trong `src/services/` (ví dụ: `myFeatureService.ts`).
2. Khai báo TypeScript types tương ứng trong `src/types/`.
3. Tái sử dụng client `supabase` từ `src/lib/supabase.ts` hoặc `uploadService` từ `src/services/uploadService.ts`.
4. Viết unit test cho service trong `src/services/__tests__/`.
5. Export service tại `src/services/index.ts`.

### B. Bổ Sung Đa Ngôn Ngữ (i18n Support)
Dự án hỗ trợ chuyển đổi linh hoạt giữa Tiếng Việt (`vi`) và Tiếng Anh (`en`):
1. Mở file [src/i18n/vi.ts](file:///Users/thanhlv/Documents/Projects/english-record/src/i18n/vi.ts) và thêm khóa mới:
   ```typescript
   export const vi = {
     // ...
     myFeature: {
       title: "Tiêu đề tính năng",
       greeting: "Xin chào, {name}!",
     },
   };
   ```
2. Mở file [src/i18n/en.ts](file:///Users/thanhlv/Documents/Projects/english-record/src/i18n/en.ts) và thêm khóa tương ứng:
   ```typescript
   export const en = {
     // ...
     myFeature: {
       title: "Feature Title",
       greeting: "Hello, {name}!",
     },
   };
   ```
3. Sử dụng trong Component:
   ```tsx
   import { useLanguage, interpolate } from "../i18n/LanguageContext";

   export function MyComponent() {
     const { t } = useLanguage();
     return (
       <div>
         <h1>{t.myFeature.title}</h1>
         <p>{interpolate(t.myFeature.greeting, { name: "Alex" })}</p>
       </div>
     );
   }
   ```

### C. Viết Unit Test với Vitest
Các bài test đặt tại thư mục `__tests__` cạnh mã nguồn hoặc trong `src/test/`:
```typescript
import { describe, it, expect } from "vitest";
import { formatCurrency } from "../format";

describe("formatCurrency", () => {
  it("should format number to VND string correctly", () => {
    expect(formatCurrency(150000)).toBe("150.000 ₫");
  });
});
```

---

## 4. Quy Chuẩn Đóng Góp Mã Nguồn (Coding Standards)

1. **TypeScript First**:
   - Tránh dùng kiểu `any` khi có thể định nghĩa rõ ràng kiểu dữ liệu.
   - Định nghĩa interfaces/types cho tất cả Props của React Component.
2. **Component Đơn Trách Nhiệm (Single Responsibility)**:
   - Tách các modal, bảng điều khiển lớn thành các sub-components nhỏ trong thư mục component tương ứng.
   - Sử dụng Custom Hooks để quản lý logic trạng thái phức tạp (tách riêng UI khỏi Business Logic).
3. **Xử lý Lỗi An Toàn (Defensive Programming)**:
   - Luôn bọc các tác vụ bất đồng bộ (API calls, audio recording) trong khối `try...catch`.
   - Sử dụng các hàm kiểm tra hợp lệ từ [validators.ts](file:///Users/thanhlv/Documents/Projects/english-record/src/utils/validators.ts).
4. **Git Commit Message Format**:
   - `feat: thêm chức năng chấm bài thu âm bằng giọng nói`
   - `fix: khắc phục lỗi không phát được audio trên trình duyệt Safari`
   - `docs: cập nhật tài liệu kiến trúc hệ thống`
   - `refactor: tối ưu hóa custom hook useRecording`
   - `test: bổ sung unit test cho topicCompletion helper`

---

## 5. Xử Lý Sự Cố Thường Gặp (Troubleshooting & FAQs)

### Q1: Ứng dụng hiển thị màn hình loading mãi không hết khi khởi chạy?
- **Nguyên nhân**: Mạng chậm hoặc Supabase URL / Anon Key không đúng, khiến gọi `supabase.auth.getUser()` bị timeout.
- **Giải pháp**: Kiểm tra lại thông số trong file `.env`. Hệ thống đã có cơ chế an toàn tự động ngắt loading sau 5 giây để bạn vẫn có thể truy cập màn hình đăng nhập.

### Q2: Trình duyệt không thể thu âm hoặc báo lỗi Microphone?
- **Nguyên nhân**: Trình duyệt chưa được cấp quyền truy cập Microphone, hoặc bạn đang mở web qua giao thức `http://` thay vì `https://` / `localhost`.
- **Giải pháp**: Nhấp vào biểu tượng ổ khóa hoặc micro trên thanh địa chỉ của trình duyệt và chọn "Cho phép (Allow)".

### Q3: Lỗi khi tải file lên S3 / Cloudflare R2?
- **Nguyên nhân**: Cấu hình `VITE_S3_ACCESS_KEY_ID`, `VITE_S3_SECRET_ACCESS_KEY` hoặc CORS của R2 Bucket chưa cho phép truy cập từ origin `http://localhost:5173`.
- **Giải pháp**: Kiểm tra CORS policy trên Cloudflare R2 dashboard cho phép các HTTP methods `PUT`, `GET`, `HEAD` và Origins `*` hoặc `http://localhost:5173`.
