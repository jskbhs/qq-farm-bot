import { useEffect, useState } from 'react';
import { ChevronDown, Eye, EyeOff, Trash2, X } from 'lucide-react';
import { useAppStore } from '@/store';
import type { YybConfig } from '@/types';

interface YybConfigModalProps {
  open: boolean;
  onClose: () => void;
}

export function YybConfigModal({ open, onClose }: YybConfigModalProps) {
  const { yybConfig, setYybConfig } = useAppStore();
  const [form, setForm] = useState<YybConfig>(yybConfig);
  const [showToken, setShowToken] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [newOpenId, setNewOpenId] = useState('');

  useEffect(() => {
    if (open) {
      setForm(yybConfig);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open, yybConfig]);

  const handleSave = () => {
    setYybConfig(form);
    onClose();
  };

  const addOpenId = () => {
    const trimmed = newOpenId.trim();
    if (!trimmed) return;
    if (form.openIds.includes(trimmed)) {
      alert('OpenID 已存在');
      return;
    }
    setForm({ ...form, openIds: [...form.openIds, trimmed] });
    setNewOpenId('');
  };

  const removeOpenId = (id: string) => {
    setForm({ ...form, openIds: form.openIds.filter((item) => item !== id) });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="relative flex h-[92vh] w-full max-w-md flex-col rounded-t-3xl bg-white sm:h-auto sm:max-h-[90vh] sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-[#4A90E2]">应用宝配置</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              配置应用宝一键登录的 API Token 和 OpenID
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100"
            aria-label="关闭"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <button
            type="button"
            onClick={() => setShowDocs(!showDocs)}
            className="flex w-full items-center justify-between rounded-xl bg-blue-50 px-4 py-3 text-[#4A90E2] transition-colors hover:bg-blue-100"
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <span>📖</span> 应用宝对接说明
            </span>
            <ChevronDown
              size={18}
              className={`transition-transform ${showDocs ? 'rotate-180' : ''}`}
            />
          </button>

          {showDocs && (
            <div className="mt-3 rounded-xl bg-gray-50 p-3 text-xs leading-relaxed text-gray-600">
              <p>1. 在下方输入从服务端获取的 API Token。</p>
              <p>2. 填写用于获取登录 Code 的接口地址。</p>
              <p>3. 添加需要自动获取 Code 的 OpenID。</p>
              <p>4. 保存后可在添加账号时选择“应用宝”登录方式。</p>
            </div>
          )}

          <div className="mt-5 space-y-5">
            <FormField label="API Token">
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={form.apiToken}
                  onChange={(e) => setForm({ ...form, apiToken: e.target.value })}
                  placeholder="请输入 API Token"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 pr-11 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-blue-400"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  aria-label={showToken ? '隐藏' : '显示'}
                >
                  {showToken ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </FormField>

            <FormField label="接口地址">
              <input
                type="text"
                value={form.apiUrl}
                onChange={(e) => setForm({ ...form, apiUrl: e.target.value })}
                placeholder="http://..."
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-blue-400"
              />
            </FormField>

            <FormField label="运行中定时重连间隔（分钟）">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setForm({ ...form, reconnectInterval: Math.max(0, form.reconnectInterval - 1) })
                  }
                  className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-lg text-gray-600 transition-colors hover:bg-gray-50"
                >
                  −
                </button>
                <input
                  type="number"
                  value={form.reconnectInterval}
                  onChange={(e) =>
                    setForm({ ...form, reconnectInterval: Math.max(0, Number(e.target.value)) })
                  }
                  className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-center text-sm text-gray-800 outline-none focus:border-blue-400"
                />
                <button
                  type="button"
                  onClick={() => setForm({ ...form, reconnectInterval: form.reconnectInterval + 1 })}
                  className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-lg text-gray-600 transition-colors hover:bg-gray-50"
                >
                  +
                </button>
              </div>
              <p className="mt-1.5 text-xs text-gray-400">
                输入 0 则不进行定时重登；设置后到达间隔时间将自动重新获取 Code 并重登
              </p>
            </FormField>

            <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-4">
              <div>
                <p className="text-sm font-medium text-gray-800">离线后自动重连</p>
                <p className="text-xs text-gray-500">账号被踢下线或断线后自动获取新 Code 并重登</p>
              </div>
              <button
                type="button"
                onClick={() => setForm({ ...form, autoReconnect: !form.autoReconnect })}
                className={`relative h-7 w-12 rounded-full transition-colors ${
                  form.autoReconnect ? 'bg-[#5A9A4A]' : 'bg-gray-300'
                }`}
                aria-label="切换自动重连"
              >
                <span
                  className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                    form.autoReconnect ? 'left-0.5 translate-x-5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-800">OpenID 列表</p>
              <div className="space-y-2">
                {form.openIds.map((id) => (
                  <div
                    key={id}
                    className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2.5"
                  >
                    <span className="break-all pr-2 text-xs text-gray-700">{id}</span>
                    <button
                      type="button"
                      onClick={() => removeOpenId(id)}
                      className="flex-shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                      aria-label="删除"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newOpenId}
                  onChange={(e) => setNewOpenId(e.target.value)}
                  placeholder="输入新 OpenID"
                  className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-blue-400"
                  onKeyDown={(e) => e.key === 'Enter' && addOpenId()}
                />
                <button
                  type="button"
                  onClick={addOpenId}
                  className="rounded-xl border border-gray-200 bg-[#F5F5F5] px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
                >
                  添加
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-5 py-2 text-sm font-medium text-[#5A9A4A] transition-colors hover:bg-green-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-full bg-[#4A90E2] px-6 py-2 text-sm font-medium text-white shadow-md shadow-blue-200 transition-colors hover:bg-[#3A80D2]"
          >
            保存
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
