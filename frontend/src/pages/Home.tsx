import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Header } from '@/components/Header';
import { OfflineReminderCard } from '@/components/OfflineReminderCard';
import { YybConfigCard } from '@/components/YybConfigCard';
import { YybConfigModal } from '@/components/YybConfigModal';
import { AddAccountModal } from '@/components/AddAccountModal';
import { TokenPage } from '@/components/TokenPage';

type Tab = 'settings' | 'tokens';

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('settings');
  const [yybOpen, setYybOpen] = useState(false);
  const [addAccountOpen, setAddAccountOpen] = useState(false);

  return (
    <div className="mx-auto min-h-screen max-w-md bg-[#F7F3E8] shadow-2xl">
      <Header />

      <nav className="mx-4 mb-3 flex rounded-full bg-white/60 p-1 backdrop-blur-sm">
        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`flex-1 rounded-full py-2 text-sm font-medium transition-colors ${
            activeTab === 'settings'
              ? 'bg-[#4A90E2] text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          设置
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('tokens')}
          className={`flex-1 rounded-full py-2 text-sm font-medium transition-colors ${
            activeTab === 'tokens'
              ? 'bg-[#4A90E2] text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Token / 对接
        </button>
      </nav>

      {activeTab === 'settings' ? (
        <main className="space-y-4 px-4 pb-24">
          <OfflineReminderCard />
          <YybConfigCard onClick={() => setYybOpen(true)} />

          <button
            type="button"
            onClick={() => setAddAccountOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#4A90E2] py-3 text-sm font-medium text-white shadow-md shadow-blue-200 transition-colors hover:bg-[#3A80D2]"
          >
            <Plus size={18} />
            添加账号
          </button>
        </main>
      ) : (
        <main>
          <TokenPage />
          <div className="px-4 pb-6">
            <button
              type="button"
              onClick={() => setAddAccountOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#4A90E2] py-3 text-sm font-medium text-white shadow-md shadow-blue-200 transition-colors hover:bg-[#3A80D2]"
            >
              <Plus size={18} />
              添加账号
            </button>
          </div>
        </main>
      )}

      <YybConfigModal open={yybOpen} onClose={() => setYybOpen(false)} />
      <AddAccountModal open={addAccountOpen} onClose={() => setAddAccountOpen(false)} />
    </div>
  );
}
