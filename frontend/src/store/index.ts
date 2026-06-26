import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Account, GeneratedToken, OfflineReminder, YybConfig } from '@/types';

interface AppState {
  offlineReminder: OfflineReminder;
  setOfflineReminder: (config: OfflineReminder) => void;

  yybConfig: YybConfig;
  setYybConfig: (config: YybConfig) => void;

  accounts: Account[];
  addAccount: (account: Account) => void;
  removeAccount: (id: string) => void;

  tokens: GeneratedToken[];
  addToken: (token: GeneratedToken) => void;
  removeToken: (id: string) => void;
}

const defaultYybConfig: YybConfig = {
  apiToken: '',
  apiUrl: 'http://211.154.25.123:28999/api/open/v1/farm/code',
  reconnectInterval: 6,
  autoReconnect: true,
  openIds: ['owNAX6tbY7nS_eag5cwPMeS4m9DI'],
};

const defaultOfflineReminder: OfflineReminder = {
  token: '',
  title: '账号下线提醒',
  offlineDeleteSeconds: 0,
  content: '账号下线',
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      offlineReminder: defaultOfflineReminder,
      setOfflineReminder: (config) => set({ offlineReminder: config }),

      yybConfig: defaultYybConfig,
      setYybConfig: (config) => set({ yybConfig: config }),

      accounts: [],
      addAccount: (account) => set((state) => ({ accounts: [...state.accounts, account] })),
      removeAccount: (id) =>
        set((state) => ({ accounts: state.accounts.filter((a) => a.id !== id) })),

      tokens: [
        {
          id: '1',
          name: '经典农场 Token',
          token: 'yyb_20eb',
        },
      ],
      addToken: (token) => set((state) => ({ tokens: [...state.tokens, token] })),
      removeToken: (id) =>
        set((state) => ({ tokens: state.tokens.filter((t) => t.id !== id) })),
    }),
    {
      name: 'qq-farm-assistant',
    }
  )
);
