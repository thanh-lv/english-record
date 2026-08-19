import { forwardRef } from 'react';
import { useLanguage, interpolate } from '../../../i18n/LanguageContext';

interface TuitionSlipProps {
  student: any;
  records: any[];
  month: number;
  hocLieuLabel?: string;
  hocLieuValue?: number;
  hocLieu?: string | number; // Backward compatibility
  note?: string;
  onHocLieuLabelChange?: (label: string) => void;
  onHocLieuValueChange?: (val: number) => void;
  onHocLieuChange?: (val: string) => void;
}

export const TuitionSlipTemplate = forwardRef<HTMLDivElement, TuitionSlipProps>(
  (
    {
      student,
      records,
      month,
      hocLieuLabel,
      hocLieuValue,
      hocLieu,
      note,
      onHocLieuLabelChange,
      onHocLieuValueChange,
      onHocLieuChange,
    },
    ref
  ) => {
    const { t } = useLanguage();
    const tAtt = t.attendance;
    const dates = records.map(r => {
      const dt = new Date(r.checkin_time);
      const day = String(dt.getDate()).padStart(2, '0');
      const monthStr = String(dt.getMonth() + 1).padStart(2, '0');
      return `${day}/${monthStr}`;
    });

    const displayLabel = hocLieuLabel || tAtt.hocLieuSlip || '📚 Học liệu';
    const displayValue =
      hocLieuValue !== undefined
        ? Number(hocLieuValue)
        : typeof hocLieu === 'number'
          ? hocLieu
          : parseInt(String(hocLieu || '').replace(/\D/g, ''), 10) || 0;

    const baseTuition = (student.total_sessions || 0) * (student.unit_price || 0);
    const grandTotal = baseTuition + displayValue;

    return (
      <div
        ref={ref}
        style={{
          fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
          backgroundColor: '#ffffff',
          width: '500px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header Block */}
        <div
          style={{
            background: 'linear-gradient(135deg, #4fb8af 0%, #38a89d 100%)',
            paddingTop: 36,
            paddingBottom: 28,
            paddingLeft: 24,
            paddingRight: 24,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
          }}
        >
          <div
            style={{
              width: 180,
              height: 6,
              backgroundColor: 'rgba(255,255,255,0.5)',
              borderRadius: 4,
              marginBottom: 16,
            }}
          />
          <h1
            style={{
              fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
              fontSize: 32,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              margin: '0 0 6px 0',
            }}
          >
            {tAtt.tuitionSlipTitle}
          </h1>
          <p
            style={{
              fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
              fontSize: 18,
              fontWeight: 400,
              opacity: 0.9,
              margin: 0,
            }}
          >
            {tAtt.monthName.replace('{m}', month.toString())}
          </p>
        </div>

        {/* Info Rows */}
        <div style={{ padding: '28px 32px 12px 32px' }}>
          {/* Học sinh */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid #e8f0ef',
              paddingBottom: 14,
              marginBottom: 14,
            }}
          >
            <span
              style={{
                fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
                fontSize: 17,
                fontWeight: 500,
                color: '#64748b',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {tAtt.studentNameSlip}
            </span>
            <span
              style={{
                fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
                fontSize: 20,
                fontWeight: 700,
                color: '#1e293b',
              }}
            >
              {student.name}
            </span>
          </div>

          {/* Học phí / buổi */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid #e8f0ef',
              paddingBottom: 14,
              marginBottom: 14,
            }}
          >
            <span
              style={{
                fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
                fontSize: 17,
                fontWeight: 500,
                color: '#64748b',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {tAtt.unitPriceSlip}
            </span>
            <span
              style={{
                fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
                fontSize: 17,
                fontWeight: 600,
                color: '#1e293b',
              }}
            >
              {interpolate(tAtt.currencyVnd || '{amount} đ', {
                amount: student.unit_price.toLocaleString(),
              })}
            </span>
          </div>

          {/* Số buổi học */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid #e8f0ef',
              paddingBottom: 14,
              marginBottom: 14,
            }}
          >
            <span
              style={{
                fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
                fontSize: 17,
                fontWeight: 500,
                color: '#64748b',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {tAtt.sessionsSlip}
            </span>
            <span
              style={{
                fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
                fontSize: 17,
                fontWeight: 600,
                color: '#1e293b',
              }}
            >
              {student.total_sessions}
            </span>
          </div>

          {/* Học liệu */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid #e8f0ef',
              paddingBottom: 14,
              marginBottom: 4,
            }}
          >
            {/* Left Label */}
            <span
              style={{
                fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
                fontSize: 17,
                fontWeight: 500,
                color: '#64748b',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {onHocLieuLabelChange ? (
                <input
                  type="text"
                  value={displayLabel}
                  placeholder={tAtt.materialNamePlaceholder || 'Tên học liệu...'}
                  onChange={e => onHocLieuLabelChange(e.target.value)}
                  style={{
                    width: '160px',
                    padding: '2px 6px',
                    border: '1.5px dashed #4fb8af',
                    borderRadius: '4px',
                    fontSize: '16px',
                    fontWeight: 600,
                    color: '#334155',
                    outline: 'none',
                    backgroundColor: '#f8fafc',
                  }}
                />
              ) : (
                displayLabel
              )}
            </span>

            {/* Right Value (Numeric Fee) */}
            <span
              style={{
                fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
                fontSize: 17,
                fontWeight: 600,
                color: '#1e293b',
                textAlign: 'right',
              }}
            >
              {onHocLieuValueChange ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <input
                    type="text"
                    value={displayValue > 0 ? displayValue.toLocaleString() : ''}
                    placeholder="0"
                    onChange={e => {
                      const raw = parseInt(e.target.value.replace(/\D/g, ''), 10) || 0;
                      onHocLieuValueChange(raw);
                    }}
                    style={{
                      width: '110px',
                      textAlign: 'right',
                      padding: '3px 8px',
                      border: '1.5px solid #4fb8af',
                      borderRadius: '6px',
                      fontSize: '16px',
                      fontWeight: 700,
                      color: '#138e83',
                      outline: 'none',
                      backgroundColor: '#f4faf9',
                    }}
                  />
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#138e83' }}>
                    {tAtt.currencySymbol || 'đ'}
                  </span>
                </span>
              ) : (
                interpolate(tAtt.currencyVnd || '{amount} đ', {
                  amount: displayValue.toLocaleString(),
                })
              )}
            </span>
          </div>
        </div>

        {/* Total Box */}
        <div style={{ padding: '8px 32px 0 32px' }}>
          <div
            style={{
              backgroundColor: '#f4faf9',
              border: '1.5px solid #9fdcd7',
              borderRadius: 12,
              padding: '20px 24px',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(79,184,175,0.1)',
            }}
          >
            <p
              style={{
                fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: '#64748b',
                marginBottom: 6,
                margin: 0,
              }}
            >
              {tAtt.totalTuitionSlip}
            </p>
            <p
              style={{
                fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
                fontSize: 42,
                fontWeight: 700,
                color: '#138e83',
                letterSpacing: '-0.02em',
                margin: 0,
                marginTop: 4,
              }}
            >
              {interpolate(tAtt.currencyVnd || '{amount} đ', {
                amount: grandTotal.toLocaleString(),
              })}
            </p>
          </div>
        </div>

        {/* Dates Block */}
        <div style={{ padding: '20px 24px 0 24px' }}>
          <p
            style={{
              fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
              textAlign: 'center',
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: '#94a3b8',
              margin: '0 0 10px 0',
            }}
          >
            {tAtt.attendanceDates}
          </p>
          {/* Dùng text-align center + inline-block thay flex+gap để html2canvas render đúng */}
          <div
            style={{
              textAlign: 'center',
              width: '100%',
              lineHeight: '32px',
            }}
          >
            {dates.map((date, idx) => (
              <span
                key={idx}
                style={{
                  display: 'inline-block',
                  height: 24,
                  padding: '0 10px',
                  border: '1px solid #9fdcd7',
                  borderRadius: 8,
                  fontSize: 16,
                  fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
                  fontWeight: 500,
                  color: '#138e83',
                  lineHeight: '24px',
                  margin: '4px 3px',
                  verticalAlign: 'middle',
                }}
              >
                {date}
              </span>
            ))}
            {dates.length === 0 && (
              <span
                style={{
                  fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
                  color: '#94a3b8',
                  fontStyle: 'italic',
                }}
              >
                ...
              </span>
            )}
          </div>
        </div>

        {/* Note Footer */}
        <div style={{ padding: '20px 32px 36px 32px' }}>
          {note ? (
            <div
              style={{
                borderTop: '1px solid #e8f0ef',
                paddingTop: 16,
                marginBottom: 16,
              }}
            >
              <p
                style={{
                  fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
                  fontSize: 16,
                  fontWeight: 500,
                  color: '#475569',
                  lineHeight: 1.6,
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                }}
              >
                <span style={{ fontWeight: 700, color: '#1e293b' }}>{tAtt.noteLabel}</span>
                {note}
              </p>
            </div>
          ) : null}
          <p
            style={{
              fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
              fontSize: 16,
              fontWeight: 500,
              color: '#64748b',
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            {tAtt.defaultNote}
          </p>
        </div>
      </div>
    );
  }
);
