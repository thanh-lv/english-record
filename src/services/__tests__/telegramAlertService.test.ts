import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { telegramAlertService } from '../telegramAlertService';

describe('telegramAlertService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    localStorage.clear();
    telegramAlertService.setCustomChatId('');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    localStorage.clear();
  });

  it('provides the bot token from environment variable if set', () => {
    vi.stubEnv('VITE_TELEGRAM_BOT_TOKEN', 'mock-bot-token-test');
    const token = telegramAlertService.getBotToken();
    expect(token).toBe('mock-bot-token-test');
  });

  it('returns empty string if no env bot token is set', () => {
    vi.stubEnv('VITE_TELEGRAM_BOT_TOKEN', '');
    const token = telegramAlertService.getBotToken();
    expect(token).toBe('');
  });

  it('sets and gets custom chat ID via localStorage', () => {
    expect(telegramAlertService.getChatId()).toBe('');
    telegramAlertService.setCustomChatId('123456789');
    expect(telegramAlertService.getChatId()).toBe('123456789');
    expect(localStorage.getItem('english_record_telegram_chat_id')).toBe('123456789');
  });

  it('sends critical alert to Telegram API with formatted HTML message', async () => {
    vi.stubEnv('VITE_TELEGRAM_BOT_TOKEN', 'mock-bot-token-test');
    telegramAlertService.setCustomChatId('987654321');

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await telegramAlertService.sendCriticalAlert({
      module: 'ReactErrorBoundary',
      message: 'Cannot read properties of null (reading "name")',
      stack: 'TypeError: Cannot read properties of null\n  at Component.tsx:10:5',
      url: 'https://example.com/test',
      userName: 'Thanh Teacher',
      userRole: 'Teacher',
      userId: 'user-uuid-123',
    });

    expect(result).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const callArgs = fetchMock.mock.calls[0];
    expect(callArgs[0]).toContain(
      'https://api.telegram.org/botmock-bot-token-test/sendMessage'
    );

    const body = JSON.parse(callArgs[1].body);
    expect(body.chat_id).toBe('987654321');
    expect(body.parse_mode).toBe('HTML');
    expect(body.text).toContain('ENGLISH RECORD - CRITICAL ERROR ALERT');
    expect(body.text).toContain('ReactErrorBoundary');
    expect(body.text).toContain('Component.tsx:10:5');
    expect(body.text).toContain('Thanh Teacher');
    expect(body.text).toContain('https://example.com/test');
  });

  it('throttles identical critical error messages within 60s', async () => {
    telegramAlertService.setCustomChatId('987654321');

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const alertPayload = {
      module: 'WindowError',
      message: 'Uncaught TypeError: window.crash is not a function',
    };

    const first = await telegramAlertService.sendCriticalAlert(alertPayload);
    const second = await telegramAlertService.sendCriticalAlert(alertPayload);

    expect(first).toBe(true);
    expect(second).toBe(false); // Throttled!
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('auto-detects chat ID from Telegram getUpdates', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        result: [
          {
            update_id: 1001,
            message: {
              chat: { id: 555666777, first_name: 'Thanh' },
              text: '/start',
            },
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const detected = await telegramAlertService.autoDetectChatId();
    expect(detected).toBe('555666777');
    expect(telegramAlertService.getChatId()).toBe('555666777');
  });

  it('sends test alert and returns success status', async () => {
    telegramAlertService.setCustomChatId('111222333');

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const res = await telegramAlertService.sendTestAlert();
    expect(res.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
