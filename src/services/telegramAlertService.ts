import { parseErrorStack } from '../utils/stackParser';

const DEFAULT_BOT_TOKEN = '8849248903:AAFWqYjaRkEx7Ej1QdsgkWgOXk4urX_qxS8';
const STORAGE_CHAT_ID_KEY = 'english_record_telegram_chat_id';
const THROTTLE_MS = 60000; // Debounce identical error for 60s
const MAX_ALERTS_PER_MINUTE = 5;

export interface TelegramAlertPayload {
  module: string;
  message: string;
  stack?: string;
  url?: string;
  userId?: string;
  userName?: string;
  userRole?: string;
  userAgent?: string;
  extraData?: any;
}

class TelegramAlertService {
  private lastSentMap: Map<string, number> = new Map();
  private alertTimestamps: number[] = [];
  private cachedChatId: string | null = null;

  public getBotToken(): string {
    return (
      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TELEGRAM_BOT_TOKEN) ||
      DEFAULT_BOT_TOKEN
    );
  }

  public getChatId(): string {
    if (this.cachedChatId !== null) return this.cachedChatId;

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem(STORAGE_CHAT_ID_KEY);
        if (stored && stored.trim()) {
          this.cachedChatId = stored.trim();
          return this.cachedChatId;
        }
      }
    } catch {
      // Ignore localStorage access errors
    }

    const envChatId =
      typeof import.meta !== 'undefined' ? import.meta.env?.VITE_TELEGRAM_CHAT_ID : '';
    if (envChatId && String(envChatId).trim()) {
      this.cachedChatId = String(envChatId).trim();
      return this.cachedChatId;
    }

    return '';
  }

  public setCustomChatId(chatId: string): void {
    const cleanId = chatId.trim();
    this.cachedChatId = cleanId;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        if (cleanId) {
          localStorage.setItem(STORAGE_CHAT_ID_KEY, cleanId);
        } else {
          localStorage.removeItem(STORAGE_CHAT_ID_KEY);
        }
      }
    } catch {
      // Ignore
    }
  }

  /**
   * Tự động quét getUpdates từ Bot để tìm chat_id gần nhất nếu user đã chat /start với bot
   */
  public async autoDetectChatId(): Promise<string | null> {
    try {
      const token = this.getBotToken();
      const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
      if (!res.ok) return null;
      const data = await res.json();
      if (data.ok && Array.isArray(data.result) && data.result.length > 0) {
        // Lấy update gần nhất có chat.id
        for (let i = data.result.length - 1; i >= 0; i--) {
          const update = data.result[i];
          const chatId =
            update.message?.chat?.id ||
            update.edited_message?.chat?.id ||
            update.channel_post?.chat?.id ||
            update.my_chat_member?.chat?.id;
          if (chatId) {
            const strId = String(chatId);
            this.setCustomChatId(strId);
            return strId;
          }
        }
      }
    } catch {
      // Ignore network errors
    }
    return null;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private isThrottled(key: string): boolean {
    const now = Date.now();
    const lastSent = this.lastSentMap.get(key) || 0;
    if (now - lastSent < THROTTLE_MS) {
      return true;
    }

    // Kiểm tra giới hạn số lượng tin nhắn / phút
    this.alertTimestamps = this.alertTimestamps.filter(ts => now - ts < 60000);
    if (this.alertTimestamps.length >= MAX_ALERTS_PER_MINUTE) {
      return true;
    }

    this.lastSentMap.set(key, now);
    this.alertTimestamps.push(now);
    return false;
  }

  public async sendMessage(htmlMessage: string, targetChatId?: string): Promise<boolean> {
    try {
      let chatId = targetChatId || this.getChatId();
      if (!chatId) {
        // Thử auto detect nếu chưa có chat_id
        const detected = await this.autoDetectChatId();
        if (detected) chatId = detected;
      }

      if (!chatId) {
        return false;
      }

      const token = this.getBotToken();
      const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: htmlMessage,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      });

      return response.ok;
    } catch (err) {
      if (typeof process === 'undefined' || process.env?.NODE_ENV !== 'test') {
        console.warn('TelegramAlertService: Failed to dispatch alert', err);
      }
      return false;
    }
  }

  public async sendCriticalAlert(payload: TelegramAlertPayload): Promise<boolean> {
    const throttleKey = `${payload.module}:${payload.message}`;
    if (this.isThrottled(throttleKey)) {
      return false;
    }

    const nowStr = new Date().toLocaleString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour12: false,
    });

    const parsedLoc = parseErrorStack(payload.stack);

    const userInfo = payload.userName
      ? `<b>👤 Người dùng:</b> ${this.escapeHtml(payload.userName)} (${this.escapeHtml(payload.userRole || 'User')} - <code>${this.escapeHtml(payload.userId || 'N/A')}</code>)`
      : '<b>👤 Người dùng:</b> Khách / Chưa đăng nhập';

    let html = `🚨 <b>[ENGLISH RECORD - CRITICAL ERROR ALERT]</b>\n\n`;

    // File & Line Number
    if (parsedLoc.filePath || parsedLoc.rawLocation) {
      html += `📁 <b>Vị trí tệp (File & Dòng):</b>\n👉 <code>${this.escapeHtml(parsedLoc.filePath || parsedLoc.rawLocation || '')}${parsedLoc.lineNumber ? `:${parsedLoc.lineNumber}:${parsedLoc.columnNumber || 1}` : ''}</code>\n`;
    }
    if (parsedLoc.functionName) {
      html += `⚙️ <b>Hàm/Component:</b> <code>${this.escapeHtml(parsedLoc.functionName)}</code>\n`;
    }

    html += `\n🔴 <b>Module:</b> <code>${this.escapeHtml(payload.module)}</code>\n`;
    html += `💬 <b>Thông báo lỗi:</b> <b>${this.escapeHtml(payload.message)}</b>\n`;
    html += `${userInfo}\n`;
    if (payload.url) {
      html += `📍 <b>Trang URL:</b> <code>${this.escapeHtml(payload.url)}</code>\n`;
    }
    html += `⏰ <b>Thời gian:</b> ${nowStr} (GMT+7)\n`;

    // Component stack if React error
    if (payload.extraData?.componentStack) {
      const compStack = String(payload.extraData.componentStack).trim();
      const shortCompStack = compStack.length > 300 ? compStack.slice(0, 300) + '...' : compStack;
      html += `\n🧩 <b>Component Stack:</b>\n<pre>${this.escapeHtml(shortCompStack)}</pre>\n`;
    }

    // Clean Stack Trace
    if (parsedLoc.cleanStack && parsedLoc.cleanStack.length > 0) {
      const formattedStack = parsedLoc.cleanStack.join('\n');
      const truncated =
        formattedStack.length > 800 ? formattedStack.slice(0, 800) + '...' : formattedStack;
      html += `\n📄 <b>Stack Trace rút gọn:</b>\n<pre>${this.escapeHtml(truncated)}</pre>`;
    } else if (payload.stack) {
      const truncatedStack =
        payload.stack.length > 800 ? payload.stack.slice(0, 800) + '...' : payload.stack;
      html += `\n📄 <b>Stack Trace:</b>\n<pre>${this.escapeHtml(truncatedStack)}</pre>`;
    }

    return this.sendMessage(html);
  }

  public async sendTestAlert(targetChatId?: string): Promise<{ success: boolean; error?: string }> {
    try {
      let chatId = targetChatId || this.getChatId();
      if (!chatId) {
        const detected = await this.autoDetectChatId();
        if (detected) chatId = detected;
      }

      if (!chatId) {
        return {
          success: false,
          error:
            'Chưa có Chat ID. Vui lòng mở Telegram, chat /start với bot @check_english_log_bot hoặc nhập Chat ID thủ công.',
        };
      }

      const nowStr = new Date().toLocaleString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour12: false,
      });

      const message = `🎉 <b>[ENGLISH RECORD - TEST ALERT]</b>\n\n✅ Kết nối Telegram Bot thành công!\nHệ thống sẵn sàng gửi cảnh báo lỗi nghiêm trọng / crash tự động.\n⏰ Thời gian: ${nowStr}`;

      const token = this.getBotToken();
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML',
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        return {
          success: false,
          error: errData.description || `HTTP ${res.status}: Không thể gửi tin nhắn Telegram`,
        };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Lỗi kết nối mạng đến Telegram API' };
    }
  }
}

export const telegramAlertService = new TelegramAlertService();
