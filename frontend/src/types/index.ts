export type LoginMethod = 'qq' | 'wechat' | 'yyb';

export interface YybConfig {
  apiToken: string;
  apiUrl: string;
  reconnectInterval: number;
  autoReconnect: boolean;
  openIds: string[];
}

export interface OfflineReminder {
  token: string;
  title: string;
  offlineDeleteSeconds: number;
  content: string;
}

export interface Account {
  id: string;
  remark: string;
  method: LoginMethod;
  openId: string;
  code: string;
}

export interface GeneratedToken {
  id: string;
  name: string;
  token: string;
}
