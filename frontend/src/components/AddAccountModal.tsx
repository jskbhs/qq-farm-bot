import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useAppStore } from '@/store';
import type { Account, LoginMethod } from '@/types';

interface AddAccountModalProps {
  open: boolean;
  onClose: () => void;
}

const methodLabels: Record<LoginMethod, string> = {
  qq: 'QQ小程序',
  wechat: '微信小程序',
  yyb: '应用宝',
};

export function AddAccountModal({ open, onClose }: AddAccountModalProps) {
  const { addAccount } = useAppStore();
  const [remark, setRemark] = useState('');
  const [method, setMethod] = useState<LoginMethod>('yyb');
  const [openId, setOpenId] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const fetchCode = async () => {
    if (!openId.trim()) {
      alert('请输入 OpenID');
      return;
    }
    setLoading(true);
    try {
      // 模拟调用接口
      await new Promise((resolve) => setTimeout(resolve, 800));
      const mockCode = `code_${Math.random().toString(36).slice(2, 10)}`;
      setCode(mockCode);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    if (!openId.trim()) {
      alert('请输入 OpenID');
      return;
    }
    const account: Account = {
      id: Date.now().toString(),
      remark: remark.trim() || '默认账号',
      method,
      openId: openId.trim(),
      code,
    };
    addAccount(account);
    setRemark('');
    setMethod('yyb');
    setOpenId('');
    setCode('');
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="relative flex h-[92vh] w-full max-w-md flex-col rounded-t-3xl bg-white sm:h-auto sm:max-h-[90vh] sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-lg font-bold text-[#4A90E2]">添加账号</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100"
            aria-label="关闭"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <FormField label="账号备注（可选）">
            <input
              type="text"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="留空默认账号"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-blue-400"
            />
          </FormField>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">登录方式</label>
            <div className="flex flex-wrap gap-4">
              {(Object.keys(methodLabels) as LoginMethod[]).map((m) => (
                <label key={m} className="flex cursor-pointer items-center gap-2">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                      method === m
                        ? 'border-[#4A90E2] bg-[#4A90E2]'
                        : 'border-gray-300 bg-white'
                    }`}
                  >
                    {method === m && <span className="h-2 w-2 rounded-full bg-white" />}
                  </span>
                  <input
                    type="radio"
                    name="loginMethod"
                    value={m}
                    checked={method === m}
                    onChange={() => setMethod(m)}
                    className="sr-only"
                  />
                  <span className="text-sm text-gray-700">{methodLabels[m]}</span>
                </label>
              ))}
            </div>
          </div>

          <FormField label="OpenID">
            <div className="flex gap-2">
              <input
                type="text"
                value={openId}
                onChange={(e) => setOpenId(e.target.value)}
                placeholder="请输入 OpenID"
                className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-blue-400"
              />
              <button
                type="button"
                onClick={fetchCode}
                disabled={loading}
                className="whitespace-nowrap rounded-xl border border-gray-200 bg-[#F5F5F5] px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-60"
              >
                {loading ? '获取中...' : '获取 Code'}
              </button>
            </div>
            {method === 'yyb' && (
              <p className="mt-1.5 text-xs text-gray-400">
                需先在「设置 → 用户管理 → 应用宝配置」中填写 API Token 和接口地址
              </p>
            )}
          </FormField>

          <FormField label="Code（自动获取）">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="请输入登录 Code"
              rows={3}
              className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-blue-400"
            />
          </FormField>
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
            onClick={handleAdd}
            className="rounded-full bg-[#4A90E2] px-6 py-2 text-sm font-medium text-white shadow-md shadow-blue-200 transition-colors hover:bg-[#3A80D2]"
          >
            添加
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
