export {};
/**
 * 游戏化模块 - 跨账号排行、每日日报、成就系统
 *
 * 数据存储：
 *   data/gamification/leaderboard-{dateKey}.json   每日排行榜
 *   data/gamification/reports-{dateKey}.json       每日汇总报告
 *   data/gamification/achievements.json            成就状态(按账号)
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
const ACHIEVEMENTS_FILE = path.join(GAMIF_DIR, 'achievements.json');
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

interface AccountSummary {
    accountId: string;
    accountName: string;
    platform: string;
    operations: Record<string, number>;
    gold: number;
    exp: number;
    harvestCount: number;
    stealCount: number;
    fertilizeCount: number;
    plantCount: number;
    score: number;          // 综合得分
}

interface LeaderboardEntry extends AccountSummary {
    rank: number;
}

interface LeaderboardData {
    date: string;
    generatedAt: number;
    accounts: LeaderboardEntry[];
    byGold: LeaderboardEntry[];
    bySteal: LeaderboardEntry[];
    byHarvest: LeaderboardEntry[];
}

function summarizeAccount(accountId: string, accountName: string, platform: string, dateKey: string): AccountSummary {
    const stats = loadPersistedStats(accountId) || {};
    const ops = (stats.date === dateKey && stats.operations) ? stats.operations : {};
    const harvest = Number(ops.harvest) || 0;
    const steal = Number(ops.steal) || 0;
    const fertilize = Number(ops.fertilize) || 0;
    const plant = Number(ops.plant) || 0;
    const gold = Number(ops.gold) || 0;
    const exp = Number(ops.exp) || 0;

    // 综合得分: 收菜 * 10 + 偷菜 * 5 + 化肥 * 1 + 金币 / 100
    const score = harvest * 10 + steal * 5 + fertilize * 1 + Math.floor(gold / 100);

    return {
        accountId: String(accountId),
        accountName: accountName || `账号${accountId}`,
        platform: platform || 'qq',
        operations: ops,
        gold,
        exp,
        harvestCount: harvest,
        stealCount: steal,
        fertilizeCount: fertilize,
        plantCount: plant,
        score,
    };
}

function sortBy<T>(arr: T[], key: (t: T) => number): T[] {
    return [...arr].sort((a, b) => key(b) - key(a));
}

function withRank(sorted: AccountSummary[]): LeaderboardEntry[] {
    return sorted.map((s, i) => ({ ...s, rank: i + 1 }));
}

/**
 * 生成某天的排行榜(基于每个账号的 stats 文件)
 */
function generateLeaderboard(dateKey: string): LeaderboardData {
    ensureGamifDir();
    const accounts = store.getAccounts() || { accounts: [] };
    const summaries: AccountSummary[] = (accounts.accounts || []).map((a: any) =>
        summarizeAccount(a.id, a.name, a.platform, dateKey),
    );

    const byGold = withRank(sortBy(summaries, s => s.gold));
    const bySteal = withRank(sortBy(summaries, s => s.stealCount));
    const byHarvest = withRank(sortBy(summaries, s => s.harvestCount));
    const byScore = withRank(sortBy(summaries, s => s.score));

    const data: LeaderboardData = {
        date: dateKey,
        generatedAt: nowMs(),
        accounts: byScore,
        byGold,
        bySteal,
        byHarvest,
    };

    try {
        writeJsonFileAtomic(getLeaderboardFile(dateKey), data);
    } catch (e: any) {
        gamifLogger.warn('保存排行榜失败', { error: e.message });
    }

    return data;
}

function loadLeaderboard(dateKey: string): LeaderboardData | null {
    const file = getLeaderboardFile(dateKey);
    if (!fs.existsSync(file)) {
        // 尝试即时生成
        try {
            return generateLeaderboard(dateKey);
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

// ============== 每日日报 ==============

interface DailyReportAccount {
    accountId: string;
    accountName: string;
    platform: string;
    harvest: number;
    steal: number;
    fertilize: number;
    plant: number;
    sell: number;
    helpFarming: number;
    taskClaim: number;
    gold: number;
    exp: number;
    score: number;
}

interface DailyReport {
    date: string;
    generatedAt: number;
    totalAccounts: number;
    activeAccounts: number;
    accounts: DailyReportAccount[];
    totals: {
        harvest: number;
        steal: number;
        fertilize: number;
        plant: number;
        sell: number;
        gold: number;
        exp: number;
    };
    mvpAccount: DailyReportAccount | null;
    stealKingAccount: DailyReportAccount | null;
    harvestKingAccount: DailyReportAccount | null;
}

function generateReport(dateKey: string): DailyReport {
    ensureGamifDir();
    const accounts = store.getAccounts() || { accounts: [] };
    const accountReports: DailyReportAccount[] = (accounts.accounts || []).map((a: any) => {
        const s = summarizeAccount(a.id, a.name, a.platform, dateKey);
        return {
            accountId: s.accountId,
            accountName: s.accountName,
            platform: s.platform,
            harvest: s.harvestCount,
            steal: s.stealCount,
            fertilize: s.fertilizeCount,
            plant: s.plantCount,
            sell: Number(s.operations.sell) || 0,
            helpFarming: Number(s.operations.helpFarming) || 0,
            taskClaim: Number(s.operations.taskClaim) || 0,
            gold: s.gold,
            exp: s.exp,
            score: s.score,
        };
    });

    const totals = accountReports.reduce(
        (acc, a) => ({
            harvest: acc.harvest + a.harvest,
            steal: acc.steal + a.steal,
            fertilize: acc.fertilize + a.fertilize,
            plant: acc.plant + a.plant,
            sell: acc.sell + a.sell,
            gold: acc.gold + a.gold,
            exp: acc.exp + a.exp,
        }),
        { harvest: 0, steal: 0, fertilize: 0, plant: 0, sell: 0, gold: 0, exp: 0 },
    );

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
    lines.push(`  收菜: ${report.totals.harvest} 次`);
    lines.push(`  偷菜: ${report.totals.steal} 次`);
    lines.push(`  化肥: ${report.totals.fertilize} 次`);
    lines.push(`  种植: ${report.totals.plant} 次`);
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

// ============== 每日推送 ==============

async function pushDailyReport(opts: { force?: boolean; sendPushooMessage?: any; log?: (tag: string, msg: string, extra?: any) => void } = {}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
    const log = opts.log || (() => {});
    const sendPush = opts.sendPushooMessage;

    const dateKey = getYesterdayKey();
    const notifKey = `daily-report:${dateKey}`;
    if (!opts.force && hasNotified(notifKey)) {
        return { ok: true, skipped: true };
    }

    try {
        const report = generateReport(dateKey);
        if (report.totalAccounts === 0) {
            return { ok: true, skipped: true };
        }

        // 优先用全局离线提醒配置
        const reminder = store.getOfflineReminder ? store.getOfflineReminder('') : null;
        const cfg = reminder && reminder.channel
            ? {
                channel: reminder.channel,
                endpoint: reminder.endpoint,
                token: reminder.token,
                title: `🌾 农场日报 (${dateKey})`,
                content: renderReportText(report),
            }
            : null;

        if (sendPush && cfg) {
            await sendPush({
                channel: cfg.channel,
                endpoint: cfg.endpoint,
                token: cfg.token,
                title: cfg.title,
                content: cfg.content,
            });
            markNotified(notifKey);
            log('系统', `已推送日报 (${dateKey})`, { module: 'gamification' });
            return { ok: true };
        }

        // 没有推送配置: 仅记录通知
        markNotified(notifKey);
        log('系统', `日报已生成 (${dateKey}),未配置推送渠道`, { module: 'gamification' });
        return { ok: true };
    } catch (e: any) {
        return { ok: false, error: e && e.message ? e.message : String(e) };
    }
}

// ============== 成就系统 ==============

interface AchievementDef {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: 'streak' | 'farming' | 'steal' | 'fertilize' | 'social' | 'special';
    check: (ctx: AchievementContext) => boolean;
    reward?: { theme?: string; title?: string };
    hidden?: boolean;
}

interface AchievementContext {
    accountId: string;
    todayStats: Record<string, number>;
    todayGold: number;
    todayExp: number;
    todayHarvest: number;
    todaySteal: number;
    todayFertilize: number;
    todayPlant: number;
    consecutiveDays: number;       // 连续登录天数
    totalHarvest: number;
    totalSteal: number;
    totalFertilize: number;
    totalGold: number;
    totalDaysActive: number;
    inviteesCount: number;
}

interface AchievementRecord {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    unlockedAt: number;
    reward?: { theme?: string; title?: string };
}

interface AccountAchievements {
    accountId: string;
    consecutiveDays: number;
    lastActiveDate: string;
    totalHarvest: number;
    totalSteal: number;
    totalFertilize: number;
    totalGold: number;
    totalExp: number;
    totalDaysActive: number;
    achievements: AchievementRecord[];
    invitedUsers: number;
    updatedAt: number;
}

interface AchievementsFile {
    accounts: Record<string, AccountAchievements>;
}

// 成就定义
const ACHIEVEMENT_DEFS: AchievementDef[] = [
    {
        id: 'first-harvest',
        name: '初次收获',
        description: '收获第一株作物',
        icon: '🌱',
        category: 'farming',
        check: ctx => ctx.totalHarvest >= 1,
    },
    {
        id: 'harvest-10',
        name: '小有所成',
        description: '累计收获 10 次作物',
        icon: '🌾',
        category: 'farming',
        check: ctx => ctx.totalHarvest >= 10,
    },
    {
        id: 'harvest-100',
        name: '农场主',
        description: '累计收获 100 次作物',
        icon: '👨‍🌾',
        category: 'farming',
        check: ctx => ctx.totalHarvest >= 100,
    },
    {
        id: 'harvest-1000',
        name: '农场大亨',
        description: '累计收获 1000 次作物',
        icon: '🏆',
        category: 'farming',
        reward: { title: '农场大亨' },
        check: ctx => ctx.totalHarvest >= 1000,
    },
    {
        id: 'steal-first',
        name: '初出茅庐',
        description: '第一次偷菜',
        icon: '🥷',
        category: 'steal',
        check: ctx => ctx.totalSteal >= 1,
    },
    {
        id: 'steal-50',
        name: '偷菜达人',
        description: '累计偷菜 50 次',
        icon: '🦊',
        category: 'steal',
        check: ctx => ctx.totalSteal >= 50,
    },
    {
        id: 'steal-500',
        name: '偷菜之王',
        description: '累计偷菜 500 次',
        icon: '👑',
        category: 'steal',
        reward: { theme: 'autumn-harvest' },
        check: ctx => ctx.totalSteal >= 500,
    },
    {
        id: 'fertilize-100',
        name: '化肥大师',
        description: '累计施肥 100 次',
        icon: '🧪',
        category: 'fertilize',
        check: ctx => ctx.totalFertilize >= 100,
    },
    {
        id: 'fertilize-1000',
        name: '化肥狂魔',
        description: '累计施肥 1000 次',
        icon: '⚗️',
        category: 'fertilize',
        check: ctx => ctx.totalFertilize >= 1000,
    },
    {
        id: 'streak-3',
        name: '初来乍到',
        description: '连续 3 天上线',
        icon: '📅',
        category: 'streak',
        check: ctx => ctx.consecutiveDays >= 3,
    },
    {
        id: 'streak-7',
        name: '周周见',
        description: '连续 7 天上线',
        icon: '🗓️',
        category: 'streak',
        check: ctx => ctx.consecutiveDays >= 7,
    },
    {
        id: 'streak-30',
        name: '连挂 30 天',
        description: '连续 30 天上线,你是真正的农场守护者',
        icon: '🌟',
        category: 'streak',
        reward: { theme: 'spring-sakura' },
        check: ctx => ctx.consecutiveDays >= 30,
    },
    {
        id: 'streak-100',
        name: '百日传奇',
        description: '连续 100 天上线',
        icon: '💎',
        category: 'streak',
        hidden: true,
        check: ctx => ctx.consecutiveDays >= 100,
    },
    {
        id: 'gold-10000',
        name: '万元户',
        description: '累计获得 10,000 金币',
        icon: '💰',
        category: 'farming',
        check: ctx => ctx.totalGold >= 10000,
    },
    {
        id: 'gold-100000',
        name: '富翁',
        description: '累计获得 100,000 金币',
        icon: '🤑',
        category: 'farming',
        reward: { theme: 'winter-snow' },
        check: ctx => ctx.totalGold >= 100000,
    },
    {
        id: 'invite-1',
        name: '社交达人',
        description: '成功邀请 1 位好友',
        icon: '🤝',
        category: 'social',
        check: ctx => ctx.inviteesCount >= 1,
    },
    {
        id: 'invite-5',
        name: '人脉王',
        description: '成功邀请 5 位好友',
        icon: '👥',
        category: 'social',
        check: ctx => ctx.inviteesCount >= 5,
    },
    {
        id: 'daily-boss',
        name: '今日劳模',
        description: '单日收获 50+ 作物',
        icon: '💪',
        category: 'farming',
        check: ctx => ctx.todayHarvest >= 50,
        hidden: true,
    },
];

function loadAchievements(): AchievementsFile {
    ensureGamifDir();
    return readJsonFile(ACHIEVEMENTS_FILE, () => ({ accounts: {} })) || { accounts: {} };
}

function saveAchievements(file: AchievementsFile): void {
    ensureGamifDir();
    try {
        writeJsonFileAtomic(ACHIEVEMENTS_FILE, file);
    } catch (e: any) {
        gamifLogger.warn('保存成就失败', { error: e.message });
    }
}

function getAccountAchievements(accountId: string): AccountAchievements {
    const file = loadAchievements();
    if (!file.accounts[accountId]) {
        file.accounts[accountId] = {
            accountId,
            consecutiveDays: 0,
            lastActiveDate: '',
            totalHarvest: 0,
            totalSteal: 0,
            totalFertilize: 0,
            totalGold: 0,
            totalExp: 0,
            totalDaysActive: 0,
            achievements: [],
            invitedUsers: 0,
            updatedAt: nowMs(),
        };
    }
    return file.accounts[accountId];
}

/**
 * 计算成就上下文
 */
function buildContext(accountId: string): AchievementContext {
    const acc = getAccountAchievements(accountId);
    const todayKey = getTodayKey();
    const today = loadPersistedStats(accountId);
    const todayOps = (today && today.date === todayKey && today.operations) ? today.operations : {};

    // 邀请数
    let inviteesCount = 0;
    try {
        const inviteRecords = JSON.parse(fs.readFileSync(getDataFile('invite-records.json'), 'utf8') || '{"records":[]}');
        if (Array.isArray(inviteRecords.records)) {
            inviteesCount = inviteRecords.records.filter((r: any) => r.inviter === accountId).length;
        }
    } catch {
        // ignore
    }

    return {
        accountId,
        todayStats: todayOps,
        todayGold: Number(todayOps.gold) || 0,
        todayExp: Number(todayOps.exp) || 0,
        todayHarvest: Number(todayOps.harvest) || 0,
        todaySteal: Number(todayOps.steal) || 0,
        todayFertilize: Number(todayOps.fertilize) || 0,
        todayPlant: Number(todayOps.plant) || 0,
        consecutiveDays: acc.consecutiveDays,
        totalHarvest: acc.totalHarvest,
        totalSteal: acc.totalSteal,
        totalFertilize: acc.totalFertilize,
        totalGold: acc.totalGold,
        totalDaysActive: acc.totalDaysActive,
        inviteesCount: acc.invitedUsers || inviteesCount,
    };
}

/**
 * 检查并解锁成就
 * 返回新解锁的成就列表
 */
function checkAndUnlock(accountId: string): AchievementRecord[] {
    const file = loadAchievements();
    const acc = file.accounts[accountId] || (file.accounts[accountId] = {
        accountId,
        consecutiveDays: 0,
        lastActiveDate: '',
        totalHarvest: 0,
        totalSteal: 0,
        totalFertilize: 0,
        totalGold: 0,
        totalExp: 0,
        totalDaysActive: 0,
        achievements: [],
        invitedUsers: 0,
        updatedAt: nowMs(),
    });

    // 更新累计数据
    const todayKey = getTodayKey();
    const today = loadPersistedStats(accountId);
    if (today && today.date === todayKey && today.operations) {
        const ops = today.operations;
        acc.totalHarvest = Math.max(acc.totalHarvest, 0) + 0; // 不能直接累加,会重复
        // 这里改成"今日增量"累加, 但 stats 已经是今日累计值, 所以读取历史需要对比
    }

    const ctx = buildContext(accountId);
    const unlockedIds = new Set(acc.achievements.map(a => a.id));
    const newUnlocks: AchievementRecord[] = [];

    for (const def of ACHIEVEMENT_DEFS) {
        if (unlockedIds.has(def.id)) continue;
        if (def.check(ctx)) {
            const rec: AchievementRecord = {
                id: def.id,
                name: def.name,
                description: def.description,
                icon: def.icon,
                category: def.category,
                unlockedAt: nowMs(),
                reward: def.reward,
            };
            acc.achievements.push(rec);
            newUnlocks.push(rec);
            gamifLogger.info(`账号 ${accountId} 解锁成就: ${def.name}`, { module: 'gamification' });
        }
    }

    if (newUnlocks.length > 0) {
        acc.updatedAt = nowMs();
        saveAchievements(file);
    }

    return newUnlocks;
}

/**
 * 每日聚合, 更新累计数据
 * (应当在每天定时任务中调用,接收昨天的数据)
 */
function rollupDaily(accountId: string, dateKey: string): void {
    const file = loadAchievements();
    const acc = file.accounts[accountId] || (file.accounts[accountId] = {
        accountId,
        consecutiveDays: 0,
        lastActiveDate: '',
        totalHarvest: 0,
        totalSteal: 0,
        totalFertilize: 0,
        totalGold: 0,
        totalExp: 0,
        totalDaysActive: 0,
        achievements: [],
        invitedUsers: 0,
        updatedAt: nowMs(),
    });

    // 读取昨天的 stats 文件
    const statsFile = path.join(path.dirname(getDataFile('store.json')), 'stats', `${accountId}.json`);
    let yestOps: Record<string, number> = {};
    try {
        if (fs.existsSync(statsFile)) {
            const data = JSON.parse(fs.readFileSync(statsFile, 'utf8'));
            if (data.date === dateKey) yestOps = data.operations || {};
        }
    } catch {
        // ignore
    }

    const harvest = Number(yestOps.harvest) || 0;
    const steal = Number(yestOps.steal) || 0;
    const fertilize = Number(yestOps.fertilize) || 0;
    const gold = Number(yestOps.gold) || 0;
    const exp = Number(yestOps.exp) || 0;

    // 更新累计(只有当天有数据才计入)
    const active = harvest > 0 || steal > 0 || fertilize > 0 || gold > 0;
    if (active) {
        acc.totalHarvest += harvest;
        acc.totalSteal += steal;
        acc.totalFertilize += fertilize;
        acc.totalGold += gold;
        acc.totalExp += exp;
        acc.totalDaysActive += 1;

        // 连续天数
        if (!acc.lastActiveDate) {
            acc.consecutiveDays = 1;
        } else {
            const last = new Date(acc.lastActiveDate);
            const cur = new Date(dateKey);
            const diffDays = Math.floor((cur.getTime() - last.getTime()) / (24 * 60 * 60 * 1000));
            if (diffDays === 1) {
                acc.consecutiveDays += 1;
            } else if (diffDays > 1) {
                acc.consecutiveDays = 1;
            }
            // diffDays === 0: 同一天不重复累计
        }
        acc.lastActiveDate = dateKey;
    } else {
        // 没有任何操作 -> 连续天数清零
        if (acc.lastActiveDate && acc.lastActiveDate !== dateKey) {
            const last = new Date(acc.lastActiveDate);
            const cur = new Date(dateKey);
            const diffDays = Math.floor((cur.getTime() - last.getTime()) / (24 * 60 * 60 * 1000));
            if (diffDays > 1) acc.consecutiveDays = 0;
        }
    }

    acc.updatedAt = nowMs();
    saveAchievements(file);

    // 检查解锁
    checkAndUnlock(accountId);
}

/**
 * 获取账号的成就列表(用户态)
 */
function getAchievementsForAccount(accountId: string): {
    achievements: AchievementRecord[];
    total: number;
    locked: number;
    consecutiveDays: number;
    totalHarvest: number;
    totalSteal: number;
    totalFertilize: number;
    totalGold: number;
    totalDaysActive: number;
} {
    const acc = getAccountAchievements(accountId);
    const total = ACHIEVEMENT_DEFS.filter(d => !d.hidden || acc.achievements.some(a => a.id === d.id)).length;
    return {
        achievements: acc.achievements,
        total,
        locked: Math.max(0, total - acc.achievements.length),
        consecutiveDays: acc.consecutiveDays,
        totalHarvest: acc.totalHarvest,
        totalSteal: acc.totalSteal,
        totalFertilize: acc.totalFertilize,
        totalGold: acc.totalGold,
        totalDaysActive: acc.totalDaysActive,
    };
}

/**
 * 获取所有成就定义(供前端展示)
 */
function listAllAchievements(): AchievementDef[] {
    return ACHIEVEMENT_DEFS.map(d => ({
        id: d.id,
        name: d.name,
        description: d.description,
        icon: d.icon,
        category: d.category,
        reward: d.reward,
        hidden: d.hidden,
        check: undefined as any, // 不暴露 check 函数
    }));
}

// ============== 导出 ==============

module.exports = {
    // 排行
    generateLeaderboard,
    loadLeaderboard,
    summarizeAccount,

    // 日报
    generateReport,
    loadReport,
    renderReportText,
    pushDailyReport,

    // 成就
    checkAndUnlock,
    rollupDaily,
    getAchievementsForAccount,
    listAllAchievements,

    // 工具
    getDateKey,
    getYesterdayKey,
    hasNotified,
    markNotified,
};
