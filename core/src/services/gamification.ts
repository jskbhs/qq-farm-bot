export {};
/**
 * 游戏化模块 - 跨账号排行、每日日报
 *
 * 数据存储：
 *   data/gamification/leaderboard-{dateKey}.json   每日排行榜
 *   data/gamification/reports-{dateKey}.json       每日汇总报告
 *   data/gamification/notif-log.json               推送日志(避免重复推送)
 */

const fs = require('node:fs');
const path = require('node:path');
const { getDataFile, ensureDataDir } = require('../config/runtime-paths');
const { writeJsonFileAtomic, readJsonFile } = require('./json-db');
const { createModuleLogger } = require('./logger');
const { getTodayKey, loadPersistedStats } = require('./stats');
const store = require('../models/store');

const gamifLogger = createModuleLogger('gamification');

// ============== 工具函数 ==============

function pad2(n: number): string {
    return String(n).padStart(2, '0');
}

function getDateKey(date: Date = new Date()): string {
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function getYesterdayKey(): string {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return getDateKey(d);
}

function nowMs(): number {
    return Date.now();
}

// ============== 路径 ==============

const GAMIF_DIR = path.join(path.dirname(getDataFile('store.json')), 'gamification');
const NOTIF_LOG_FILE = path.join(GAMIF_DIR, 'notif-log.json');

function getLeaderboardFile(dateKey: string): string {
    return path.join(GAMIF_DIR, `leaderboard-${dateKey}.json`);
}

function getReportFile(dateKey: string): string {
    return path.join(GAMIF_DIR, `report-${dateKey}.json`);
}

function ensureGamifDir(): void {
    ensureDataDir();
    if (!fs.existsSync(GAMIF_DIR)) {
        fs.mkdirSync(GAMIF_DIR, { recursive: true });
    }
}

// ============== 跨账号排行 ==============

/**
 * 与 Dashboard 今日统计 (OP_META) 完全对齐的字段集合
 * 任何想新增的「今日统计」字段，需要同时改:
 *   1. web/src/views/Dashboard.vue 的 OP_META
 *   2. core/src/services/gamification.ts 的 SUMMARY_FIELDS
 *   3. web/src/views/Leaderboard.vue 的 tabs
 */
const SUMMARY_FIELDS: Array<{ key: string, label: string, icon: string, weight: number }> = [
    { key: 'harvest',      label: '收获',         icon: '🌾',   weight: 10 },  // 直接收益
    { key: 'farming',      label: '一键务农',     icon: '🧑‍🌾',  weight: 1 },
    { key: 'fertilize',    label: '施肥',         icon: '🧪',   weight: 1 },
    { key: 'plant',        label: '种植',         icon: '🌱',   weight: 1 },
    { key: 'steal',        label: '偷菜',         icon: '🏃',   weight: 5 },   // 偷菜也是直接收益
    { key: 'helpFarming',  label: '帮务农',       icon: '🧑‍🌾',  weight: 2 },
    { key: 'guardDogDrop', label: '同气连枝礼包', icon: '🎁',   weight: 20 },  // 高价值道具
    { key: 'taskClaim',    label: '任务',         icon: '✅',   weight: 1 },
    { key: 'sell',         label: '出售',         icon: '💰',   weight: 1 },
    { key: 'gold',         label: '金币',         icon: '🪙',   weight: 0 },   // 100 金币 = 1 分
    { key: 'exp',          label: '经验',         icon: '⭐',   weight: 0 },   // 10 经验 = 1 分
];

interface AccountSummary {
    accountId: string;
    accountName: string;
    platform: string;
    online: boolean;          // 账号是否在运行
    lastSavedAt: number;      // 该账号最近一次落盘时间
    score: number;            // 综合得分

    // 完整 11 个今日统计字段（与 Dashboard 今日统计对齐）
    harvest: number;
    farming: number;
    fertilize: number;
    plant: number;
    steal: number;
    helpFarming: number;
    guardDogDrop: number;
    taskClaim: number;
    sell: number;
    gold: number;
    exp: number;
}

interface LeaderboardEntry extends AccountSummary {
    rank: number;
}

interface LeaderboardData {
    date: string;
    generatedAt: number;
    accounts: LeaderboardEntry[];   // 按综合分排序
    byField: Record<string, LeaderboardEntry[]>;   // 按单个字段排序，key 与 SUMMARY_FIELDS.key 对应
    totals: {
        accounts: number;
        activeAccounts: number;
        // 同样 11 个字段
        harvest: number;
        farming: number;
        fertilize: number;
        plant: number;
        steal: number;
        helpFarming: number;
        guardDogDrop: number;
        taskClaim: number;
        sell: number;
        gold: number;
        exp: number;
    };
}

function num(v: any, fallback: number = 0): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

function summarizeAccount(
    accountId: string,
    accountName: string,
    platform: string,
    dateKey: string,
    online: boolean = false,
): AccountSummary {
    const stats = loadPersistedStats(accountId) || {};
    // 若磁盘里的数据不是今天的，则视为 0（避免昨日数据混入今日）
    const isToday = stats && stats.date === dateKey;
    const ops = isToday && stats.operations ? stats.operations : {};

    // 把所有字段都取出来（用 0 兜底）
    const fields: Record<string, number> = {};
    for (const f of SUMMARY_FIELDS) {
        fields[f.key] = num(ops[f.key]);
    }

    const lastSavedAt = num(stats.savedAt);

    // 综合得分（基于 SUMMARY_FIELDS 的权重）
    // 收菜 ×10、偷菜 ×5、帮务农 ×2、护主犬礼包 ×20、其余 ×1
    // 金币/100 折算、经验/10 折算
    let score = 0;
    for (const f of SUMMARY_FIELDS) {
        if (f.key === 'gold') {
            score += Math.floor(fields[f.key] / 100);
        }
        else if (f.key === 'exp') {
            score += Math.floor(fields[f.key] / 10);
        }
        else {
            score += fields[f.key] * f.weight;
        }
    }

    return {
        accountId: String(accountId),
        accountName: accountName || `账号${accountId}`,
        platform: platform || 'qq',
        online,
        lastSavedAt,
        score,
        harvest: fields.harvest,
        farming: fields.farming,
        fertilize: fields.fertilize,
        plant: fields.plant,
        steal: fields.steal,
        helpFarming: fields.helpFarming,
        guardDogDrop: fields.guardDogDrop,
        taskClaim: fields.taskClaim,
        sell: fields.sell,
        gold: fields.gold,
        exp: fields.exp,
    };
}

function sortBy<T>(arr: T[], key: (t: T) => number): T[] {
    return [...arr].sort((a, b) => key(b) - key(a));
}

function withRank(sorted: AccountSummary[]): LeaderboardEntry[] {
    return sorted.map((s, i) => ({ ...s, rank: i + 1 }));
}

/**
 * 收集所有账号的"在线"状态（由外部传入的 runningMap），生成排行榜
 * byField 为每个 SUMMARY_FIELDS 都生成一份按该字段排序的列表
 */
function buildLeaderboard(dateKey: string, runningMap: Record<string, boolean> = {}): LeaderboardData {
    const accounts = store.getAccounts() || { accounts: [] };
    const summaries: AccountSummary[] = (accounts.accounts || []).map((a: any) =>
        summarizeAccount(a.id, a.name, a.platform, dateKey, !!runningMap[String(a.id)]),
    );

    const byScore = withRank(sortBy(summaries, s => s.score));

    // 为每个字段都生成一份排序结果
    const byField: Record<string, LeaderboardEntry[]> = {};
    for (const f of SUMMARY_FIELDS) {
        byField[f.key] = withRank(sortBy(summaries, s => num((s as any)[f.key])));
    }

    // 汇总
    const totals: any = {
        accounts: 0,
        activeAccounts: 0,
    };
    for (const f of SUMMARY_FIELDS) {
        totals[f.key] = 0;
    }
    for (const s of summaries) {
        totals.accounts++;
        if (s.score > 0) totals.activeAccounts++;
        for (const f of SUMMARY_FIELDS) {
            totals[f.key] += num((s as any)[f.key]);
        }
    }

    return {
        date: dateKey,
        generatedAt: nowMs(),
        accounts: byScore,
        byField,
        totals,
    };
}

/**
 * 生成排行榜（始终重新计算 + 落盘）
 * 之前的实现是「文件存在就复用」，导致数据长期不更新。
 * 现在每次都重算：保证数据真实、即时反映当前账号状态。
 */
function generateLeaderboard(dateKey: string, runningMap: Record<string, boolean> = {}): LeaderboardData {
    ensureGamifDir();
    const data = buildLeaderboard(dateKey, runningMap);
    try {
        writeJsonFileAtomic(getLeaderboardFile(dateKey), data);
    } catch (e: any) {
        gamifLogger.warn('保存排行榜失败', { error: e.message });
    }
    return data;
}

/**
 * 读取排行榜（始终重新生成，不读缓存）
 * 若需要"在线状态"，可通过传入 runningMap 让分数包含 running 信息
 */
function loadLeaderboard(dateKey: string, runningMap: Record<string, boolean> = {}): LeaderboardData | null {
    try {
        return generateLeaderboard(dateKey, runningMap);
    } catch (e: any) {
        gamifLogger.warn('生成排行榜失败', { error: e.message });
        return null;
    }
}

// ============== 每日日报 ==============

interface DailyReportAccount {
    accountId: string;
    accountName: string;
    platform: string;
    harvest: number;
    farming: number;
    steal: number;
    fertilize: number;
    plant: number;
    sell: number;
    helpFarming: number;
    taskClaim: number;
    guardDogDrop: number;
    gold: number;
    exp: number;
    score: number;
    online: boolean;
}

interface DailyReport {
    date: string;
    generatedAt: number;
    totalAccounts: number;
    activeAccounts: number;
    accounts: DailyReportAccount[];
    totals: {
        harvest: number;
        farming: number;
        steal: number;
        fertilize: number;
        plant: number;
        sell: number;
        helpFarming: number;
        taskClaim: number;
        guardDogDrop: number;
        gold: number;
        exp: number;
    };
    mvpAccount: DailyReportAccount | null;
    stealKingAccount: DailyReportAccount | null;
    harvestKingAccount: DailyReportAccount | null;
}

function generateReport(dateKey: string, runningMap: Record<string, boolean> = {}): DailyReport {
    ensureGamifDir();
    const accounts = store.getAccounts() || { accounts: [] };
    const accountReports: DailyReportAccount[] = (accounts.accounts || []).map((a: any) => {
        const s = summarizeAccount(a.id, a.name, a.platform, dateKey, !!runningMap[String(a.id)]);
        return {
            accountId: s.accountId,
            accountName: s.accountName,
            platform: s.platform,
            harvest: s.harvest,
            farming: s.farming,
            steal: s.steal,
            fertilize: s.fertilize,
            plant: s.plant,
            sell: s.sell,
            helpFarming: s.helpFarming,
            taskClaim: s.taskClaim,
            guardDogDrop: s.guardDogDrop,
            gold: s.gold,
            exp: s.exp,
            score: s.score,
            online: s.online,
        };
    });

    // 汇总（用 SUMMARY_FIELDS 循环构建，避免漏字段）
    const totals: any = {};
    for (const f of SUMMARY_FIELDS) {
        totals[f.key] = 0;
    }
    for (const a of accountReports) {
        for (const f of SUMMARY_FIELDS) {
            totals[f.key] += num((a as any)[f.key]);
        }
    }

    const activeAccounts = accountReports.filter(a => a.score > 0).length;
    const sortedByScore = [...accountReports].sort((a, b) => b.score - a.score);
    const sortedBySteal = [...accountReports].sort((a, b) => b.steal - a.steal);
    const sortedByHarvest = [...accountReports].sort((a, b) => b.harvest - a.harvest);

    const report: DailyReport = {
        date: dateKey,
        generatedAt: nowMs(),
        totalAccounts: accountReports.length,
        activeAccounts,
        accounts: accountReports,
        totals,
        mvpAccount: sortedByScore[0] && sortedByScore[0].score > 0 ? sortedByScore[0] : null,
        stealKingAccount: sortedBySteal[0] && sortedBySteal[0].steal > 0 ? sortedBySteal[0] : null,
        harvestKingAccount: sortedByHarvest[0] && sortedByHarvest[0].harvest > 0 ? sortedByHarvest[0] : null,
    };

    try {
        writeJsonFileAtomic(getReportFile(dateKey), report);
    } catch (e: any) {
        gamifLogger.warn('保存日报失败', { error: e.message });
    }

    return report;
}

function loadReport(dateKey: string): DailyReport | null {
    const file = getReportFile(dateKey);
    if (!fs.existsSync(file)) {
        try {
            return generateReport(dateKey);
        } catch {
            return null;
        }
    }
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
        return null;
    }
}

/**
 * 渲染日报为推送文本
 */
function renderReportText(report: DailyReport): string {
    const lines: string[] = [];
    lines.push(`🌾 农场日报 (${report.date})`);
    lines.push('');
    lines.push(`📊 汇总:`);
    lines.push(`  活跃账号: ${report.activeAccounts}/${report.totalAccounts}`);
    lines.push(`  收获: ${report.totals.harvest} 次`);
    lines.push(`  一键务农: ${report.totals.farming} 次`);
    lines.push(`  偷菜: ${report.totals.steal} 次`);
    lines.push(`  施肥: ${report.totals.fertilize} 次`);
    lines.push(`  种植: ${report.totals.plant} 次`);
    lines.push(`  帮务农: ${report.totals.helpFarming} 次`);
    lines.push(`  任务: ${report.totals.taskClaim} 次`);
    lines.push(`  同气连枝礼包: ${report.totals.guardDogDrop} 个`);
    lines.push(`  出售: ${report.totals.sell} 次`);
    lines.push(`  金币: +${report.totals.gold}`);
    lines.push(`  经验: +${report.totals.exp}`);
    lines.push('');
    if (report.mvpAccount) {
        lines.push(`🏆 综合冠军: ${report.mvpAccount.accountName} (${report.mvpAccount.score} 分)`);
    }
    if (report.harvestKingAccount) {
        lines.push(`🌾 收菜之王: ${report.harvestKingAccount.accountName} (${report.harvestKingAccount.harvest} 次)`);
    }
    if (report.stealKingAccount) {
        lines.push(`🥷 偷菜之王: ${report.stealKingAccount.accountName} (${report.stealKingAccount.steal} 次)`);
    }
    return lines.join('\n');
}

// ============== 推送日志(防重复) ==============

interface NotifLog {
    [key: string]: number; // key -> timestamp
}

function loadNotifLog(): NotifLog {
    try {
        return readJsonFile(NOTIF_LOG_FILE, () => ({})) || {};
    } catch {
        return {};
    }
}

function saveNotifLog(log: NotifLog): void {
    ensureGamifDir();
    try {
        writeJsonFileAtomic(NOTIF_LOG_FILE, log);
    } catch (e: any) {
        gamifLogger.warn('保存推送日志失败', { error: e.message });
    }
}

function hasNotified(key: string): boolean {
    const log = loadNotifLog();
    return !!log[key];
}

function markNotified(key: string): void {
    const log = loadNotifLog();
    log[key] = nowMs();
    // 保留最近 60 天的记录
    const cutoff = nowMs() - 60 * 24 * 60 * 60 * 1000;
    for (const k of Object.keys(log)) {
        if (log[k] < cutoff) delete log[k];
    }
    saveNotifLog(log);
}

// ============== 每日推送 (已移除) ==============
// 日报推送功能已移除, 仅在 Dashboard 顶栏展示, 不再自动/手动推送到外部渠道

// ============== 导出 ==============

module.exports = {
    // 排行
    generateLeaderboard,
    loadLeaderboard,
    summarizeAccount,

    // 日报(只生成, 不推送)
    generateReport,
    loadReport,
    renderReportText,

    // 工具
    getDateKey,
    getYesterdayKey,
    hasNotified,
    markNotified,
};
