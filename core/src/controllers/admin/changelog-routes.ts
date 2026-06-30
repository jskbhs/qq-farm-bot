import type { Application, Request, Response } from 'express';
import type { AdminContext } from './context';
export {};

/**
 * 版本更新日志（changelog）管理
 *  - GET  /api/changelog        公开读取（普通用户可看）
 *  - PUT  /api/changelog        管理员写入
 *  - POST /api/changelog/reset  管理员重置为初始内容
 *
 * 数据存储在 core/data/changelog.json，结构：
 * {
 *   version: 'v20260701',
 *   updatedAt: '2026-07-01T12:00:00.000Z',
 *   updatedBy: 'admin',
 *   sections: [
 *     {
 *       version: 'v20260701',
 *       date: '2026-07-01',
 *       title: '护主犬好友 + 同气连枝礼包',
 *       groups: [
 *         { type: '新功能', icon: '✨', items: ['...', '...'] },
 *         { type: '优化与修复', icon: '🔧', items: ['...'] },
 *       ],
 *     },
 *   ],
 * }
 */

const fs = require('node:fs');
const path = require('node:path');

const { ensureDataDir } = require('../../config/runtime-paths');
const { createModuleLogger } = require('../../services/logger');
const { adminRequired } = require('./middleware');

const changelogLogger = createModuleLogger('changelog');

const CHANGELOG_FILE = 'changelog.json';

function getChangelogPath(): string {
    return path.join(ensureDataDir(), CHANGELOG_FILE);
}

/**
 * 初始内容（首次启动 / 重置时使用）
 * 这里复用了仓库根目录 CHANGELOG.md 的内容，但用结构化 JSON 表达。
 */
function getInitialChangelog(): any {
    return {
        version: 'v20260701',
        updatedAt: '2026-07-01T00:00:00.000Z',
        updatedBy: 'system',
        sections: [
            {
                version: 'v20260701',
                date: '2026-07-01',
                title: '护主犬好友 + 同气连枝礼包',
                groups: [
                    {
                        type: '新功能',
                        icon: '✨',
                        items: [
                            '🐶 **护主犬过滤**（只帮护主犬好友）— 开关位于「自动控制 → 好友帮助」区域',
                            '📦 **好友管理新增「护主犬好友」标签页** — 位置在好友列表与好友申请之间，自动登记 + 持久化',
                            '🎁 **同气连枝礼包掉落通知** — 检测到掉落时同时在「物品」与「好友」日志模块推送通知',
                            '📊 **今日统计新增** 🎁 同气连枝礼包 计数项',
                        ],
                    },
                    {
                        type: '优化与修复',
                        icon: '🔧',
                        items: [
                            '护主犬物品 ID 修正（90001/90002/90003 → **90021** 洛克王国联动限定）',
                            '移除冗余日志（只输出命中护主犬的成功日志）',
                            '批量帮忙日志合并为开/收两行汇总',
                            '帮忙路径补全护主犬过滤',
                        ],
                    },
                    {
                        type: '配置',
                        icon: '📝',
                        items: [
                            '`friend_help_only_guard_dog`（默认 `false`）',
                            '`friendGuardDogGids`（默认 `[]`）',
                            '4 个新 API（GET/POST add/remove/clear）',
                        ],
                    },
                ],
            },
            {
                version: 'v20260615',
                date: '2026-06-15',
                title: '移除日报推送',
                groups: [
                    {
                        type: '变更',
                        icon: '🗑️',
                        items: [
                            '后端删除 `pushDailyReport`、9 点自动推送、`/api/admin/report/...` 等相关代码',
                            'Dashboard 顶栏保留数据展示',
                        ],
                    },
                ],
            },
        ],
    };
}

function readChangelog(): any {
    try {
        const filePath = getChangelogPath();
        if (!fs.existsSync(filePath)) {
            const initial = getInitialChangelog();
            try {
                fs.writeFileSync(filePath, JSON.stringify(initial, null, 2), 'utf8');
                changelogLogger.info('init changelog', { filePath });
            } catch (e: any) {
                changelogLogger.warn('init changelog failed', { error: e?.message });
            }
            return initial;
        }
        const raw = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(raw);
        // 兼容性兜底
        if (!parsed || !Array.isArray(parsed.sections)) {
            return getInitialChangelog();
        }
        return parsed;
    } catch (e: any) {
        changelogLogger.warn('read changelog failed', { error: e?.message });
        return getInitialChangelog();
    }
}

function writeChangelog(data: any, updatedBy: string): { ok: boolean; error?: string; data?: any } {
    try {
        if (!data || typeof data !== 'object') {
            return { ok: false, error: '数据格式错误' };
        }
        if (!Array.isArray(data.sections)) {
            return { ok: false, error: 'sections 必须是数组' };
        }
        // 简单校验每条
        for (const s of data.sections) {
            if (!s || typeof s !== 'object') {
                return { ok: false, error: 'section 格式错误' };
            }
            if (!Array.isArray(s.groups)) {
                return { ok: false, error: 'groups 必须是数组' };
            }
            for (const g of s.groups) {
                if (!g || typeof g !== 'object') {
                    return { ok: false, error: 'group 格式错误' };
                }
                if (!Array.isArray(g.items)) {
                    return { ok: false, error: 'items 必须是数组' };
                }
            }
        }
        const out = {
            version: String(data.version || 'custom'),
            updatedAt: new Date().toISOString(),
            updatedBy: String(updatedBy || 'admin'),
            sections: data.sections,
        };
        fs.writeFileSync(getChangelogPath(), JSON.stringify(out, null, 2), 'utf8');
        changelogLogger.info('changelog updated', { by: updatedBy, version: out.version });
        return { ok: true, data: out };
    } catch (e: any) {
        return { ok: false, error: e?.message || '写入失败' };
    }
}

function mountChangelogRoutes(app: Application, ctx: AdminContext): void {
    // 公开读取
    app.get('/api/changelog', (_req: Request, res: Response) => {
        try {
            const data = readChangelog();
            res.json({ ok: true, data });
        } catch (e: any) {
            res.status(500).json({ ok: false, error: e?.message || '读取失败' });
        }
    });

    // 管理员写入
    app.put('/api/changelog', adminRequired, (req: any, res: Response) => {
        const body = req.body || {};
        const updatedBy = (req.currentUser && req.currentUser.username) || 'admin';
        const result = writeChangelog(body, updatedBy);
        if (!result.ok) {
            return res.status(400).json(result);
        }
        res.json(result);
    });

    // 管理员重置为初始内容
    app.post('/api/changelog/reset', adminRequired, (req: any, res: Response) => {
        const initial = getInitialChangelog();
        const updatedBy = (req.currentUser && req.currentUser.username) || 'admin';
        initial.updatedBy = updatedBy;
        initial.updatedAt = new Date().toISOString();
        const result = writeChangelog(initial, updatedBy);
        res.json(result);
    });
}

module.exports = {
    mountChangelogRoutes,
    readChangelog,
    writeChangelog,
};
