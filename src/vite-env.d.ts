/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly VITE_S3_ENDPOINT: string;
  readonly VITE_S3_REGION: string;
  readonly VITE_S3_ACCESS_KEY_ID: string;
  readonly VITE_S3_SECRET_ACCESS_KEY: string;
  readonly VITE_S3_BUCKET_NAME: string;
  readonly VITE_R2_PUBLIC_URL?: string;
  readonly VITE_GEMINI_API_KEY: string;
  readonly VITE_TELEGRAM_BOT_TOKEN?: string;
  readonly VITE_TELEGRAM_CHAT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
