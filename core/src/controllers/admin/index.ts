import type { AdminContext } from './context';
export {};

/**
 * Admin panel HTTP server orchestrator.
 * Thin wrapper that wires up Express, routes, Socket.IO, and shared context.
 */
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { CONFIG } = require('../../config/config');
const { getResourcePath } = require('../../config/runtime-paths');
const { createModuleLogger } = require('../../services/logger');

const { createAdminContext } = require('./context');
const { createCleanupExpiredUsers } = require('./middleware');
const { mountAuthRoutes } = require('./auth-routes');
const { mountAccountRoutes } = require('./account-routes');
const { mountFarmRoutes } = require('./farm-routes');
const { mountFriendRoutes } = require('./friend-routes');
const { mountAdminRoutes } = require('./admin-routes');
const { mountActivityRoutes } = require('./activity-routes');
const {
    setupSocketIO,
    emitRealtimeStatus: _emitStatus,
    emitRealtimeLog: _emitLog,
    emitRealtimeAccountLog: _emitAccountLog,
} = require('./socket');

const adminLogger = createModuleLogger('admin');

let ctx: AdminContext | null = null;

function startAdminServer(dataProvider: any): void {
    if (ctx) return;

    ctx = createAdminContext(dataProvider);

    const app = express();

    // 仅在明确配置了受信任代理时启用；否则保持 Express 默认行为，防止 X-Forwarded-For 被伪造
    const trustedProxy = process.env.TRUSTED_PROXY;
    if (trustedProxy) {
        app.set('trust proxy', trustedProxy === 'true' ? true : trustedProxy.split(',').map(s => s.trim()));
    }

    // 安全响应头
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", "data:", "https:"],
                connectSrc: ["'self'", "ws:", "wss:"],
            },
        },
        crossOriginEmbedderPolicy: false,
    }));

    // 请求体大小限制
    app.use(express.json({ limit: '1mb' }));
    app.use(express.urlencoded({ extended: true, limit: '1mb' }));

    // 公共接口速率限制（登录、注册、续费、领卡密）
    const publicLimiter = rateLimit({
        windowMs: 1 * 60 * 1000,
        max: 30,
        standardHeaders: true,
        legacyHeaders: false,
        handler: (_req: any, res: any) => {
            res.status(429).json({ ok: false, error: '请求过于频繁，请稍后再试' });
        },
    });
    app.use('/api/login', publicLimiter);
    app.use('/api/register', publicLimiter);
    app.use('/api/user/renew-public', publicLimiter);
    app.use('/api/card-claim/claim', publicLimiter);

    ctx.app = app;

    app.use((req: any, res: any, next: any) => {
        const allowedOrigins: string[] = CONFIG.allowedOrigins;
        const origin = req.headers.origin;

        if (origin && allowedOrigins.includes(origin)) {
            res.header('Access-Control-Allow-Origin', origin);
            res.header('Access-Control-Allow-Credentials', 'true');
        }

        res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS, PUT');
        res.header('Access-Control-Allow-Headers', 'Content-Type, x-account-id, x-admin-token, x-proxy-api-key, x-proxy-api-url, x-proxy-app-id');
        res.header('Access-Control-Max-Age', '86400');

        if (req.method === 'OPTIONS') return res.sendStatus(200);
        next();
    });

    const webDist = path.join(__dirname, '../../../../web/dist');
    if (fs.existsSync(webDist)) {
        app.use(express.static(webDist));
    } else {
        adminLogger.warn('web build not found', { webDist });
        app.get('/', (_req: any, res: any) => res.send('web build not found. Please build the web project.'));
    }
    app.use('/game-config', express.static(getResourcePath('gameConfig')));

    // Mount route modules
    mountAuthRoutes(app, ctx);
    mountFarmRoutes(app, ctx);
    mountFriendRoutes(app, ctx);
    mountAdminRoutes(app, ctx);
    mountAccountRoutes(app, ctx);
    mountActivityRoutes(app, ctx);

    // SPA fallback
    app.get('*', (req: any, res: any) => {
        if (req.path.startsWith('/api') || req.path.startsWith('/game-config')) {
             return res.status(404).json({ ok: false, error: 'Not Found' });
        }
        if (fs.existsSync(webDist)) {
            res.sendFile(path.join(webDist, 'index.html'));
        } else {
            res.status(404).send('web build not found. Please build the web project.');
        }
    });

    const port: number = CONFIG.adminPort || 3007;
    ctx.server = app.listen(port, '0.0.0.0', () => {
        adminLogger.info('admin panel started', { url: `http://localhost:${port}`, port });
    });

    // Setup Socket.IO
    setupSocketIO(ctx);

    // 启动定期清理
    const cleanupFn = createCleanupExpiredUsers(ctx);
    setInterval(cleanupFn, 5 * 60 * 1000); // 每5分钟检查一次
}

function emitRealtimeStatus(accountId: string, status: any): void {
    if (!ctx) return;
    _emitStatus(ctx, accountId, status);
}

function emitRealtimeLog(entry: any): void {
    if (!ctx) return;
    _emitLog(ctx, entry);
}

function emitRealtimeAccountLog(entry: any): void {
    if (!ctx) return;
    _emitAccountLog(ctx, entry);
}

module.exports = {
    startAdminServer,
    emitRealtimeStatus,
    emitRealtimeLog,
    emitRealtimeAccountLog,
};
