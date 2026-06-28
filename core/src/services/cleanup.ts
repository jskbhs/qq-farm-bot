export {};

const tokenStore = require('../models/user-store/token-store');
const store = require('../models/store');
const userStore = require('../models/user-store');
const auth = require('../models/user-store/auth');
const auditLog = require('../models/audit-log');
const ipBlacklist = require('../models/ip-blacklist');
const { createModuleLogger } = require('./logger');

const logger = createModuleLogger('cleanup');

interface CleanupResult {
    expiredTokens: number;
    invalidAccounts: { deletedCount: number; deletedIds: string[] };
    oldLogs: {
        loginLogs: number;
        auditLogs: number;
        ipBlacklist: number;
    };
}

const DEFAULT_LOG_RETENTION_DAYS = 30;

function cleanupExpiredTokens(): number {
    try {
        const count = tokenStore.cleanupExpired();
        logger.info(`清理了 ${count} 个过期 token`);
        return count;
    }
    catch (e: any) {
        logger.error('清理过期 token 失败:', e.message);
        return 0;
    }
}

function cleanupInvalidAccounts(): { deletedCount: number; deletedIds: string[] } {
    try {
        const accountsData = store.getAccounts();
        const users = userStore.getAllUsers();
        const validUsernames = new Set(users.map((u: any) => u.username));

        const deletedIds: string[] = [];
        const validAccounts = accountsData.accounts.filter((acc: any) => {
            // 无效账号：没有关联用户，或没有任何登录标识
            const hasUser = acc.username && validUsernames.has(acc.username);
            const hasIdentifier = !!(acc.uin || acc.qq || acc.openid);
            if (!hasUser || !hasIdentifier) {
                deletedIds.push(String(acc.id));
                return false;
            }
            return true;
        });

        if (deletedIds.length > 0) {
            accountsData.accounts = validAccounts;
            store.saveAccounts(accountsData);
            // 同步清理账号配置文件
            const { removeAccountConfig } = require('../models/store/account-config');
            deletedIds.forEach((id: string) => {
                try {
                    removeAccountConfig(id);
                }
                catch (e: any) {
                    logger.warn(`清理账号 ${id} 配置失败:`, e.message);
                }
            });
        }

        logger.info(`清理了 ${deletedIds.length} 个无效账号`);
        return { deletedCount: deletedIds.length, deletedIds };
    }
    catch (e: any) {
        logger.error('清理无效账号失败:', e.message);
        return { deletedCount: 0, deletedIds: [] };
    }
}

function cleanupOldLogs(daysToKeep: number = DEFAULT_LOG_RETENTION_DAYS): { loginLogs: number; auditLogs: number; ipBlacklist: number } {
    const cutoff = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;
    let loginLogsCount = 0;
    let auditLogsCount = 0;
    let ipBlacklistCount = 0;

    try {
        loginLogsCount = auth.cleanOldLogs ? auth.cleanOldLogs(cutoff) : 0;
    }
    catch (e: any) {
        logger.error('清理登录日志失败:', e.message);
    }

    try {
        auditLogsCount = auditLog.cleanOldLogs ? auditLog.cleanOldLogs(cutoff) : 0;
    }
    catch (e: any) {
        logger.error('清理审计日志失败:', e.message);
    }

    try {
        ipBlacklistCount = ipBlacklist.cleanExpired ? ipBlacklist.cleanExpired() : 0;
    }
    catch (e: any) {
        logger.error('清理过期 IP 黑名单失败:', e.message);
    }

    logger.info(`清理旧日志完成: 登录日志 ${loginLogsCount}, 审计日志 ${auditLogsCount}, IP黑名单 ${ipBlacklistCount}`);
    return { loginLogs: loginLogsCount, auditLogs: auditLogsCount, ipBlacklist: ipBlacklistCount };
}

function runCleanup(options?: { logRetentionDays?: number }): CleanupResult {
    return {
        expiredTokens: cleanupExpiredTokens(),
        invalidAccounts: cleanupInvalidAccounts(),
        oldLogs: cleanupOldLogs(options?.logRetentionDays ?? DEFAULT_LOG_RETENTION_DAYS),
    };
}

module.exports = {
    DEFAULT_LOG_RETENTION_DAYS,
    cleanupExpiredTokens,
    cleanupInvalidAccounts,
    cleanupOldLogs,
    runCleanup,
};
