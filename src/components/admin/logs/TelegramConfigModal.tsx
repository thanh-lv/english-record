import { useState, useEffect } from 'react';
import { Bot, Send, CheckCircle2, AlertCircle, X, ExternalLink, RefreshCw } from 'lucide-react';
import { telegramAlertService } from '../../../services/telegramAlertService';

interface TelegramConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TelegramConfigModal({ isOpen, onClose }: TelegramConfigModalProps) {
  const [chatId, setChatId] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setChatId(telegramAlertService.getChatId());
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    telegramAlertService.setCustomChatId(chatId);
    setTestResult({ success: true, message: 'Đã lưu Chat ID thành công!' });
  };

  const handleAutoDetect = async () => {
    setIsDetecting(true);
    setTestResult(null);
    try {
      const detected = await telegramAlertService.autoDetectChatId();
      if (detected) {
        setChatId(detected);
        setTestResult({
          success: true,
          message: `Đã tìm thấy Chat ID: ${detected}. Đã tự động lưu!`,
        });
      } else {
        setTestResult({
          success: false,
          message:
            'Chưa tìm thấy tin nhắn từ bạn. Hãy mở Telegram, tìm @check_english_log_bot và bấm Start rồi thử lại nhé.',
        });
      }
    } catch {
      setTestResult({
        success: false,
        message: 'Lỗi khi kiểm tra kết nối với Telegram API.',
      });
    } finally {
      setIsDetecting(false);
    }
  };

  const handleSendTest = async () => {
    if (!chatId.trim()) {
      setTestResult({
        success: false,
        message: 'Vui lòng nhập Chat ID hoặc bấm "Tự động phát hiện" trước khi gửi test.',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    try {
      // Save current input before testing
      telegramAlertService.setCustomChatId(chatId);
      const res = await telegramAlertService.sendTestAlert(chatId.trim());
      if (res.success) {
        setTestResult({
          success: true,
          message: 'Tin nhắn test đã được gửi thành công vào Telegram của bạn!',
        });
      } else {
        setTestResult({
          success: false,
          message: res.error || 'Không thể gửi tin nhắn test. Vui lòng kiểm tra lại Chat ID.',
        });
      }
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-xs">
              <Bot size={20} />
            </div>
            <div>
              <h3 className="font-black text-base">Cấu Hình Telegram Alert</h3>
              <p className="text-xs text-blue-100 font-medium">
                Cảnh báo lỗi nghiêm trọng & crash ứng dụng
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Bot info card */}
          <div className="p-3.5 bg-blue-50/80 border border-blue-200/80 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-black text-blue-900">Telegram Bot:</p>
              <p className="text-xs font-bold text-blue-700 font-mono mt-0.5">
                @check_english_log_bot
              </p>
            </div>
            <a
              href="https://t.me/check_english_log_bot"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-black flex items-center gap-1 shadow-xs transition-all"
            >
              Mở Bot <ExternalLink size={12} />
            </a>
          </div>

          {/* Guide steps */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1 text-slate-600">
            <p className="font-black text-slate-800">Các bước kích hoạt nhận thông báo:</p>
            <ol className="list-decimal list-inside space-y-0.5 text-slate-600 font-medium">
              <li>
                Mở bot <b>@check_english_log_bot</b> trên Telegram.
              </li>
              <li>
                Bấm <b>Start</b> (hoặc gửi bất kỳ tin nhắn nào).
              </li>
              <li>
                Bấm nút <b>"Tự động quét Chat ID"</b> bên dưới hoặc dán Chat ID vào ô.
              </li>
              <li>
                Bấm <b>"Gửi tin nhắn test"</b> để xác nhận nhận được tin.
              </li>
            </ol>
          </div>

          {/* Chat ID Input */}
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1.5">
              Telegram Chat ID (Cá nhân hoặc ID Group/Channel)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={chatId}
                onChange={e => setChatId(e.target.value)}
                placeholder="VD: 123456789 hoặc -100123456789"
                className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <button
                type="button"
                onClick={handleAutoDetect}
                disabled={isDetecting}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                title="Tự động lấy ID người dùng vừa chat với bot"
              >
                <RefreshCw size={13} className={isDetecting ? 'animate-spin' : ''} />
                Quét ID
              </button>
            </div>
          </div>

          {/* Feedback banner */}
          {testResult && (
            <div
              className={`p-3 rounded-xl text-xs font-bold flex items-start gap-2 border ${
                testResult.success
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-black transition-all cursor-pointer"
          >
            Lưu Cấu Hình
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSendTest}
              disabled={isTesting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <Send size={14} />
              {isTesting ? 'Đang gửi...' : 'Gửi Test Ngay'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
