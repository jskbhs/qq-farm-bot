import { useState } from 'react';
import { useAppStore } from '@/store';

export function OfflineReminderCard() {
  const { offlineReminder, setOfflineReminder } = useAppStore();
  const [form, setForm] = useState(offlineReminder);

  const handleSave = () => {
    setOfflineReminder(form);
    alert('下线提醒设置已保存');
  };

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="space-y-4">
        <FormField label="Token">
          <input
            type="text"
            value={form.token}
            onChange={(e) => setForm({ ...form, token: e.target.value })}
            placeholder="接收端 token"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-blue-400"
          />
        </FormField>

        <FormField label="标题">
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="账号下线提醒"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-blue-400"
          />
        </FormField>

        <FormField label="离线删除账号 (秒)">
          <input
            type="number"
            value={form.offlineDeleteSeconds}
            onChange={(e) => setForm({ ...form, offlineDeleteSeconds: Number(e.target.value) })}
            placeholder="0"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-blue-400"
          />
        </FormField>

        <FormField label="内容">
          <input
            type="text"
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            placeholder="账号下线"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-blue-400"
          />
        </FormField>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => alert('测试通知已发送')}
            className="flex-1 rounded-full border border-gray-200 bg-[#F5F5F5] px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
          >
            测试通知
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-[1.5] rounded-full bg-[#4A90E2] px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-blue-200 transition-colors hover:bg-[#3A80D2]"
          >
            保存下线提醒设置
          </button>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}
