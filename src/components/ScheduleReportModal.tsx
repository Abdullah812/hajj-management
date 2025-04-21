import React, { useState } from 'react';

interface ScheduleReportModalProps {
  onSchedule: (frequency: 'daily' | 'weekly' | 'monthly', recipients: string[]) => void;
  onClose: () => void;
}

export function ScheduleReportModal({ onSchedule, onClose }: ScheduleReportModalProps) {
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [recipients, setRecipients] = useState<string[]>(['']);
  const [time, setTime] = useState('09:00');
  const [days, setDays] = useState<number[]>([1]); // 1-7 for weekly, 1-31 for monthly

  const handleAddRecipient = () => {
    setRecipients([...recipients, '']);
  };

  const handleRemoveRecipient = (index: number) => {
    setRecipients(recipients.filter((_, i) => i !== index));
  };

  const handleRecipientChange = (index: number, value: string) => {
    const newRecipients = [...recipients];
    newRecipients[index] = value;
    setRecipients(newRecipients);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validRecipients = recipients.filter(email => email.trim());
    if (validRecipients.length > 0) {
      onSchedule(frequency, validRecipients);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        <div className="p-4 border-b">
          <h3 className="text-lg font-medium">جدولة التقرير</h3>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                تكرار الإرسال
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as any)}
                className="input w-full"
              >
                <option value="daily">يومياً</option>
                <option value="weekly">أسبوعياً</option>
                <option value="monthly">شهرياً</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                وقت الإرسال
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="input w-full"
              />
            </div>

            {frequency !== 'daily' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {frequency === 'weekly' ? 'أيام الإرسال' : 'تاريخ الإرسال'}
                </label>
                <div className="grid grid-cols-7 gap-2">
                  {frequency === 'weekly' ? (
                    ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map((day, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => {
                          if (days.includes(index + 1)) {
                            setDays(days.filter(d => d !== index + 1));
                          } else {
                            setDays([...days, index + 1]);
                          }
                        }}
                        className={`p-2 rounded text-sm ${
                          days.includes(index + 1)
                            ? 'bg-primary-100 text-primary-700'
                            : 'bg-gray-100'
                        }`}
                      >
                        {day}
                      </button>
                    ))
                  ) : (
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={days[0]}
                      onChange={(e) => setDays([parseInt(e.target.value)])}
                      className="input"
                    />
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                البريد الإلكتروني للمستلمين
              </label>
              {recipients.map((email, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => handleRecipientChange(index, e.target.value)}
                    className="input flex-1"
                    placeholder="example@domain.com"
                    required
                  />
                  {recipients.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveRecipient(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                    >
                      حذف
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddRecipient}
                className="text-primary-600 hover:text-primary-700 text-sm"
              >
                + إضافة مستلم
              </button>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!recipients.some(email => email.trim())}
            >
              جدولة
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 