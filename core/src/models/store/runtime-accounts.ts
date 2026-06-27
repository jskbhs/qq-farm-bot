export {};
const { ensureDataDir } = require('../../config/runtime-paths');
const { readJsonFile, writeJsonFileAtomic } = require('../../services/json-db');
const { RUNTIME_ACCOUNTS_FILE } = require('./shared-state');

interface RuntimeAccountsData {
    runningAccountIds: string[];
}

function loadRuntimeAccounts(): RuntimeAccountsData {
    try {
        ensureDataDir();
        const data = readJsonFile(RUNTIME_ACCOUNTS_FILE, () => ({ runningAccountIds: [] }));
        return normalizeRuntimeAccountsData(data);
    } catch (e: any) {
        console.warn('[runtime-accounts] load failed:', e && e.message ? e.message : e);
        return { runningAccountIds: [] };
    }
}

function saveRuntimeAccounts(data: RuntimeAccountsData): void {
    try {
        ensureDataDir();
        writeJsonFileAtomic(RUNTIME_ACCOUNTS_FILE, normalizeRuntimeAccountsData(data));
    } catch (e: any) {
        console.warn('[runtime-accounts] save failed:', e && e.message ? e.message : e);
    }
}

function normalizeRuntimeAccountsData(raw: unknown): RuntimeAccountsData {
    const data: any = raw && typeof raw === 'object' ? raw : {};
    const ids: string[] = Array.isArray(data.runningAccountIds)
        ? data.runningAccountIds.map((id: any) => String(id || '').trim()).filter(Boolean)
        : [];
    return { runningAccountIds: [...new Set(ids)] };
}

function getRunningAccountIds(): string[] {
    return [...loadRuntimeAccounts().runningAccountIds];
}

function isAccountRunning(accountId: string | number): boolean {
    const id = String(accountId || '').trim();
    if (!id) return false;
    return loadRuntimeAccounts().runningAccountIds.includes(id);
}

function markAccountRunning(accountId: string | number): void {
    try {
        const id = String(accountId || '').trim();
        if (!id) return;
        const data = loadRuntimeAccounts();
        if (!data.runningAccountIds.includes(id)) {
            data.runningAccountIds.push(id);
            saveRuntimeAccounts(data);
        }
    } catch (e: any) {
        console.warn('[runtime-accounts] markAccountRunning failed:', e && e.message ? e.message : e);
    }
}

function markAccountStopped(accountId: string | number): void {
    try {
        const id = String(accountId || '').trim();
        if (!id) return;
        const data = loadRuntimeAccounts();
        const idx = data.runningAccountIds.indexOf(id);
        if (idx >= 0) {
            data.runningAccountIds.splice(idx, 1);
            saveRuntimeAccounts(data);
        }
    } catch (e: any) {
        console.warn('[runtime-accounts] markAccountStopped failed:', e && e.message ? e.message : e);
    }
}

function clearAllRuntimeAccounts(): void {
    saveRuntimeAccounts({ runningAccountIds: [] });
}

module.exports = {
    loadRuntimeAccounts,
    saveRuntimeAccounts,
    getRunningAccountIds,
    isAccountRunning,
    markAccountRunning,
    markAccountStopped,
    clearAllRuntimeAccounts,
};
