import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import nodemailer from "nodemailer";
import { v4 as uuidv4 } from "uuid";
import { pool, query } from "./db.js";
import {
  TABLE_COLUMNS,
  USER_OWNED_TABLES,
  assertColumn,
  assertTable,
  normalizeRow,
  pickAllowedColumns,
} from "./schema.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT || 3001);
const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production";
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || "";
const APP_BASE_URL = process.env.APP_BASE_URL || "https://app.localfiny.com";
const uploadRoot = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, "..", "uploads"));
const smtpPort = Number(process.env.SMTP_PORT || 587);

const mailer = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: process.env.SMTP_USER
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
        : undefined,
      tls: {
        rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== "false",
      },
    })
  : null;

fs.mkdirSync(uploadRoot, { recursive: true });

app.use(cors({ origin: process.env.CORS_ORIGIN || true, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use("/uploads", express.static(uploadRoot));

const upload = multer({ dest: uploadRoot, limits: { fileSize: 5 * 1024 * 1024 } });
const marketQuoteCacheTtlMs = Number(process.env.MARKET_QUOTES_CACHE_TTL_MS || 60000);
let marketQuoteCache = null;

async function runSqlFileIfExists(filePath) {
  if (!fs.existsSync(filePath)) return;
  const sql = fs.readFileSync(filePath, "utf8");
  const statements = sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await pool.query(statement);
  }
}

async function ensureColumn(tableName, columnName, definition) {
  const rows = await query(
    `select column_name
       from information_schema.columns
      where table_schema = database()
        and table_name = ?
        and column_name = ?
      limit 1`,
    [tableName, columnName],
  );

  if (!rows.length) {
    await query(`alter table ${tableName} add column ${columnName} ${definition}`);
  }
}

async function ensureTable(tableName, createSql) {
  const rows = await query(
    `select table_name
       from information_schema.tables
      where table_schema = database()
        and table_name = ?
      limit 1`,
    [tableName],
  );

  if (!rows.length) {
    await query(createSql);
  }
}

async function ensureBasePlans() {
  const basePlans = [
    {
      plan_type: "starter",
      name: "Gratuito",
      description: "Controle básico das suas finanças",
      price_monthly: 0,
      price_yearly: 0,
      features: ["Dashboard básico", "2 contas bancárias", "1 meta financeira", "3 lembretes"],
      max_banks: 2,
      max_goals: 1,
      max_reminders: 3,
      history_months: 3,
      is_active: true,
      whatsapp_enabled: false,
      reports_enabled: false,
      cashflow_projection_enabled: false,
      export_enabled: false,
      split_enabled: false,
      business_profile_enabled: false,
      advanced_dashboard_enabled: false,
      annual_projection_enabled: false,
      monthly_planning_enabled: false,
      ai_enabled: false,
      import_enabled: false,
    },
    {
      plan_type: "pro",
      name: "Pro",
      description: "Para quem quer organização completa",
      price_monthly: 2990,
      price_yearly: 29900,
      features: ["Dashboard completo", "Contas ilimitadas", "Metas ilimitadas", "Lembretes via WhatsApp", "Relatórios avançados"],
      max_banks: 999,
      max_goals: 999,
      max_reminders: 999,
      history_months: 9999,
      is_active: true,
      whatsapp_enabled: true,
      reports_enabled: true,
      cashflow_projection_enabled: true,
      export_enabled: true,
      split_enabled: true,
      business_profile_enabled: false,
      advanced_dashboard_enabled: true,
      annual_projection_enabled: true,
      monthly_planning_enabled: true,
      ai_enabled: true,
      import_enabled: true,
    },
    {
      plan_type: "business",
      name: "Business",
      description: "Para microempreendedores e freelancers",
      price_monthly: 4990,
      price_yearly: 49900,
      features: ["Tudo do Pro", "Perfil PJ separado", "Exportação de relatórios", "Suporte prioritário"],
      max_banks: 999,
      max_goals: 999,
      max_reminders: 999,
      history_months: 9999,
      is_active: true,
      whatsapp_enabled: true,
      reports_enabled: true,
      cashflow_projection_enabled: true,
      export_enabled: true,
      split_enabled: true,
      business_profile_enabled: true,
      advanced_dashboard_enabled: true,
      annual_projection_enabled: true,
      monthly_planning_enabled: true,
      ai_enabled: true,
      import_enabled: true,
    },
  ];

  for (const plan of basePlans) {
    const rows = await query("select id from plans where plan_type = ? limit 1", [plan.plan_type]).catch(() => []);
    if (rows.length) continue;

    await query(
      `insert into plans
        (id, name, plan_type, description, price_monthly, price_yearly, features, max_banks, max_goals,
         max_reminders, history_months, is_active, whatsapp_enabled, reports_enabled, cashflow_projection_enabled,
         export_enabled, split_enabled, business_profile_enabled, advanced_dashboard_enabled, annual_projection_enabled,
         monthly_planning_enabled, ai_enabled, import_enabled)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        plan.name,
        plan.plan_type,
        plan.description,
        plan.price_monthly,
        plan.price_yearly,
        JSON.stringify(plan.features),
        plan.max_banks,
        plan.max_goals,
        plan.max_reminders,
        plan.history_months,
        plan.is_active,
        plan.whatsapp_enabled,
        plan.reports_enabled,
        plan.cashflow_projection_enabled,
        plan.export_enabled,
        plan.split_enabled,
        plan.business_profile_enabled,
        plan.advanced_dashboard_enabled,
        plan.annual_projection_enabled,
        plan.monthly_planning_enabled,
        plan.ai_enabled,
        plan.import_enabled,
      ],
    );
  }
}

async function runMigrations() {
  await runSqlFileIfExists(path.join(__dirname, "..", "database", "mysql", "localfiny_2_0.sql"));
  await ensureTable("pushinpay_config", `
    create table pushinpay_config (
      id char(36) primary key,
      api_key text null,
      api_url text null,
      webhook_secret text null,
      is_active boolean not null default false,
      created_at timestamp not null default current_timestamp,
      updated_at timestamp not null default current_timestamp on update current_timestamp
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci
  `);
  await ensureColumn("transactions", "payment_method", "varchar(50) null after bank_id");
  await ensureColumn("debt_payments", "bank_id", "char(36) null after debt_id");
  await ensureColumn("debt_payments", "transaction_id", "char(36) null after bank_id");
  await ensureColumn("debt_payments", "payment_method", "varchar(50) null after payment_date");
  await ensureColumn("debt_payments", "profile_type", "varchar(20) null after payment_method");
  await ensureColumn("custom_goals", "profile_type", "varchar(20) not null default 'personal' after user_id");
  await ensureColumn("custom_goals", "goal_mode", "varchar(20) not null default 'expense' after profile_type");
  await ensureColumn("custom_goals", "destination_bank_id", "char(36) null after goal_mode");
  await ensureColumn("custom_goals", "debt_id", "char(36) null after destination_bank_id");
  await ensureColumn("emergency_goals", "profile_type", "varchar(20) not null default 'personal' after user_id");
  await ensureColumn("fixed_costs", "profile_type", "varchar(20) not null default 'personal' after user_id");
  await ensureColumn("plans", "ai_enabled", "boolean not null default false after monthly_planning_enabled");
  await ensureColumn("plans", "import_enabled", "boolean not null default false after ai_enabled");
  await ensureColumn("plans", "is_active", "boolean not null default true after features");
  await ensureColumn("payments", "gateway", "varchar(40) not null default 'mercadopago' after mercadopago_preference_id");
  await ensureColumn("payments", "provider_payment_id", "varchar(255) null after gateway");
  await ensureBasePlans();
}

const marketQuoteSymbols = [
  { symbol: "USDBRL=X", label: "Dólar", type: "currency", currency: "BRL" },
  { symbol: "EURBRL=X", label: "Euro", type: "currency", currency: "BRL" },
  { symbol: "GBPBRL=X", label: "Libra", type: "currency", currency: "BRL" },
  { symbol: "ARSBRL=X", label: "Peso Argentino", type: "currency", currency: "BRL", maximumFractionDigits: 5 },
  { symbol: "^BVSP", label: "Ibovespa", type: "index" },
  { symbol: "^GSPC", label: "S&P 500", type: "index" },
  { symbol: "^IXIC", label: "Nasdaq", type: "index" },
  { symbol: "GC=F", label: "Ouro", type: "commodity", currency: "USD" },
  { symbol: "CL=F", label: "Petróleo", type: "commodity", currency: "USD" },
  { symbol: "BTC-USD", label: "Bitcoin", type: "crypto", currency: "USD" },
  { symbol: "ETH-USD", label: "Ethereum", type: "crypto", currency: "USD" },
];

async function fetchYahooChartQuote(config) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(config.symbol)}?range=5d&interval=1d`,
      {
        signal: controller.signal,
        headers: {
          "user-agent": "Mozilla/5.0 LocalFiny/1.0",
          accept: "application/json",
        },
      },
    );

    if (!response.ok) throw new Error(`Yahoo Finance respondeu ${response.status}`);

    const payload = await response.json();
    const result = payload.chart?.result?.[0];
    const meta = result?.meta;
    const quotes = result?.indicators?.quote?.[0];
    const closes = (quotes?.close || []).filter((value) => Number.isFinite(value));
    const current = Number(meta?.regularMarketPrice ?? closes.at(-1));
    const previous = Number(meta?.chartPreviousClose ?? closes.at(-2));

    if (!Number.isFinite(current)) throw new Error(`Cotacao indisponivel para ${config.symbol}`);

    const changePercent = Number.isFinite(previous) && previous !== 0
      ? ((current - previous) / previous) * 100
      : null;

    return {
      symbol: config.symbol,
      label: config.label,
      type: config.type,
      currency: config.currency || meta?.currency || null,
      value: current,
      previousClose: Number.isFinite(previous) ? previous : null,
      changePercent,
      maximumFractionDigits: config.maximumFractionDigits || null,
      updatedAt: meta?.regularMarketTime
        ? new Date(meta.regularMarketTime * 1000).toISOString()
        : new Date().toISOString(),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function getMarketQuotes() {
  const now = Date.now();
  if (marketQuoteCache && now - marketQuoteCache.fetchedAt < marketQuoteCacheTtlMs) {
    return { ...marketQuoteCache.payload, cached: true };
  }

  const settled = await Promise.allSettled(marketQuoteSymbols.map(fetchYahooChartQuote));
  const quotes = settled
    .map((result) => (result.status === "fulfilled" ? result.value : null))
    .filter(Boolean);
  const errors = settled
    .map((result, index) => (result.status === "rejected" ? `${marketQuoteSymbols[index].label}: ${result.reason.message}` : null))
    .filter(Boolean);

  if (!quotes.length) {
    const error = new Error(errors[0] || "Nao foi possivel carregar indicadores de mercado");
    error.status = 502;
    throw error;
  }

  const payload = {
    quotes,
    errors,
    provider: "Yahoo Finance",
    fetchedAt: new Date(now).toISOString(),
    cacheTtlMs: marketQuoteCacheTtlMs,
  };
  marketQuoteCache = { fetchedAt: now, payload };
  return { ...payload, cached: false };
}

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
  );
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role || "user",
    user_metadata: {
      name: user.name,
      full_name: user.name,
      organization_name: user.organization_name,
      telefone: user.telefone,
    },
  };
}

async function sendPasswordResetEmail(user, resetUrl) {
  if (!mailer) {
    const error = new Error("SMTP nao configurado");
    error.status = 500;
    throw error;
  }

  const appName = process.env.APP_NAME || "LocalFiny";
  const from = process.env.MAIL_FROM || process.env.SMTP_USER;
  const logoUrl = `${PUBLIC_BASE_URL || "https://app.localfiny.com"}/brand/logo.png`;
  await mailer.sendMail({
    from: `${appName} <${from}>`,
    to: user.email,
    subject: `Redefina sua senha no ${appName}`,
    text: [
      `Ola${user.name ? `, ${user.name}` : ""}.`,
      "",
      `Recebemos uma solicitacao para redefinir sua senha no ${appName}.`,
      `Acesse o link abaixo para criar uma nova senha:`,
      "",
      resetUrl,
      "",
      "Este link expira em 1 hora. Se voce nao solicitou esta alteracao, ignore este email.",
    ].join("\n"),
    html: `
      <div style="margin:0;background:#f8fafc;padding:32px;font-family:Arial,sans-serif;color:#0f172a">
        <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:18px;padding:32px;border:1px solid #e2e8f0">
          <img src="${logoUrl}" alt="${appName}" style="display:block;width:180px;max-width:100%;height:auto;margin:0 0 28px;border-radius:10px" />
          <h1 style="margin:0 0 12px;font-size:24px;color:#0f172a">Redefina sua senha</h1>
          <p style="margin:0 0 20px;line-height:1.6;color:#475569">
            Recebemos uma solicitação para redefinir sua senha no <strong>${appName}</strong>.
          </p>
          <a href="${resetUrl}" style="display:inline-block;background:#f97316;color:#ffffff;text-decoration:none;font-weight:700;border-radius:12px;padding:14px 22px">
            Criar nova senha
          </a>
          <p style="margin:24px 0 0;font-size:14px;line-height:1.6;color:#64748b">
            Este link expira em 1 hora. Se você não solicitou esta alteração, ignore este email.
          </p>
        </div>
      </div>
    `,
  });
}

async function authRequired(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Nao autenticado" });
    const payload = jwt.verify(token, JWT_SECRET);
    const rows = await query("select * from users where id = ? limit 1", [payload.sub]);
    if (!rows.length) return res.status(401).json({ error: "Usuario nao encontrado" });
    req.user = rows[0];
    next();
  } catch (error) {
    res.status(401).json({ error: "Sessao invalida" });
  }
}

async function optionalAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (token) {
      const payload = jwt.verify(token, JWT_SECRET);
      const rows = await query("select * from users where id = ? limit 1", [payload.sub]);
      req.user = rows[0] || null;
    }
  } catch {
    req.user = null;
  }
  next();
}

function isAdminUser(user) {
  return ["admin", "superadmin"].includes(String(user?.role || "").toLowerCase());
}

function adminRequired(req, res, next) {
  if (!isAdminUser(req.user)) return res.status(403).json({ error: "Acesso negado" });
  next();
}

function defaultPlan() {
  return {
    plan_type: "starter",
    plan_name: "Starter",
    is_active: true,
    max_banks: 999,
    max_goals: 1,
    max_reminders: 3,
    whatsapp_enabled: false,
    reports_enabled: false,
    cashflow_projection_enabled: false,
    export_enabled: false,
    split_enabled: false,
    business_profile_enabled: false,
    advanced_dashboard_enabled: false,
    annual_projection_enabled: false,
    history_months: 3,
    monthly_planning_enabled: false,
    ai_enabled: false,
    import_enabled: false,
  };
}

function fullFeaturePlan(planName = "Business") {
  return {
    ...defaultPlan(),
    plan_type: "business",
    plan_name: planName,
    max_goals: 999,
    max_reminders: 999,
    whatsapp_enabled: true,
    reports_enabled: true,
    cashflow_projection_enabled: true,
    export_enabled: true,
    split_enabled: true,
    business_profile_enabled: true,
    advanced_dashboard_enabled: true,
    annual_projection_enabled: true,
    history_months: 9999,
    monthly_planning_enabled: true,
    ai_enabled: true,
    import_enabled: true,
  };
}

function handleError(res, error) {
  const status = error.status || 500;
  res.status(status).json({ error: error.message || "Erro interno" });
}

function boolValue(value) {
  return value === true || value === 1 || value === "1" || value === "true";
}

function centsValue(value) {
  if (typeof value === "string") return Number.parseInt(value.replace(/\D/g, ""), 10) || 0;
  return Math.max(0, Math.round(Number(value || 0)));
}

function intValue(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizePaymentStatus(status) {
  const value = String(status || "").toLowerCase();
  if (["paid", "approved", "completed", "confirmed", "success", "succeeded"].includes(value)) return "completed";
  if (["failed", "canceled", "cancelled", "refused", "rejected"].includes(value)) return "failed";
  if (["expired"].includes(value)) return "expired";
  if (["processing", "in_process"].includes(value)) return "processing";
  return "pending";
}

function getPlanAmount(plan, billingPeriod) {
  const period = billingPeriod === "yearly" ? "yearly" : "monthly";
  const amount = period === "yearly" ? Number(plan.price_yearly || 0) : Number(plan.price_monthly || 0);
  return { amount: Math.max(0, Math.round(amount)), billingPeriod: period };
}

function buildWebhookUrl(pathName) {
  return `${APP_BASE_URL.replace(/\/+$/, "")}${pathName}`;
}

async function activatePaymentSubscription(paymentId) {
  const rows = await query(
    `select pay.*, p.plan_type
       from payments pay
       left join plans p on p.id = pay.plan_id
      where pay.id = ?
      limit 1`,
    [paymentId],
  );
  const payment = rows[0];
  if (!payment || payment.status === "completed") return payment;

  const periodEnd = new Date(Date.now() + (payment.billing_period === "yearly" ? 365 : 30) * 24 * 60 * 60 * 1000);
  const subRows = await query("select id from subscriptions where user_id = ? order by updated_at desc, created_at desc limit 1", [payment.user_id]);
  let subscriptionId = subRows[0]?.id;

  if (subscriptionId) {
    await query(
      `update subscriptions
          set plan_id = ?,
              status = 'active',
              billing_period = ?,
              current_period_start = now(),
              current_period_end = ?,
              canceled_at = null
        where id = ?`,
      [payment.plan_id, payment.billing_period || "monthly", periodEnd, subscriptionId],
    );
  } else {
    subscriptionId = uuidv4();
    await query(
      `insert into subscriptions
        (id, user_id, plan_id, status, billing_period, current_period_start, current_period_end)
       values (?, ?, ?, 'active', ?, now(), ?)`,
      [subscriptionId, payment.user_id, payment.plan_id, payment.billing_period || "monthly", periodEnd],
    );
  }

  await query(
    "update payments set status = 'completed', paid_at = coalesce(paid_at, now()), subscription_id = ? where id = ?",
    [subscriptionId, paymentId],
  );

  return { ...payment, status: "completed", subscription_id: subscriptionId };
}

async function updatePaymentStatusFromProvider(payment, providerStatus) {
  const status = normalizePaymentStatus(providerStatus);
  if (status === "completed") {
    return activatePaymentSubscription(payment.id);
  }
  if (status !== payment.status) {
    await query("update payments set status = ? where id = ?", [status, payment.id]);
  }
  return { ...payment, status };
}

async function createPushinPayPix({ userId, plan, amount, billingPeriod }) {
  const configRows = await query("select * from pushinpay_config where is_active = true order by updated_at desc, created_at desc limit 1").catch(() => []);
  const config = configRows[0];
  if (!config?.api_key) throw new Error("PushinPay nao configurado");

  const apiUrl = String(config.api_url || "https://api.pushinpay.com.br/api").replace(/\/+$/, "");
  const response = await fetch(`${apiUrl}/pix/cashIn`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.api_key}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      value: amount,
      webhook_url: buildWebhookUrl("/api/webhooks/pushinpay"),
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || payload.error || "Erro ao gerar PIX na PushinPay");
  }

  const providerPaymentId = String(payload.id || payload.transaction_id || payload.payment_id || "");
  if (!providerPaymentId) throw new Error("PushinPay nao retornou o ID da transacao");

  const qrCode = payload.qr_code || payload.copy_paste || payload.pix_code || payload.br_code || "";
  const qrCodeBase64 = String(payload.qr_code_base64 || payload.qrcode_base64 || "").replace(/^data:image\/\w+;base64,/, "");
  const paymentId = uuidv4();
  await query(
    `insert into payments
      (id, user_id, plan_id, amount, status, billing_period, payment_method, payment_link, qr_code, qr_code_base64,
       br_code, mercadopago_payment_id, provider_payment_id, gateway, expires_at)
     values (?, ?, ?, ?, 'pending', ?, 'pix', ?, ?, ?, ?, ?, ?, 'pushinpay', ?)`,
    [
      paymentId,
      userId,
      plan.id,
      amount,
      billingPeriod,
      payload.payment_link || payload.ticket_url || null,
      qrCode,
      qrCodeBase64,
      qrCode,
      providerPaymentId,
      providerPaymentId,
      new Date(Date.now() + 15 * 60 * 1000),
    ],
  );

  return {
    paymentId,
    providerPaymentId,
    pix: {
      qr_code: qrCode,
      qr_code_base64: qrCodeBase64,
      ticket_url: payload.payment_link || payload.ticket_url || "",
    },
  };
}

async function getPushinPayStatus(providerPaymentId) {
  const configRows = await query("select * from pushinpay_config where is_active = true order by updated_at desc, created_at desc limit 1").catch(() => []);
  const config = configRows[0];
  if (!config?.api_key) throw new Error("PushinPay nao configurado");

  const apiUrl = String(config.api_url || "https://api.pushinpay.com.br/api").replace(/\/+$/, "");
  const response = await fetch(`${apiUrl}/transaction/${providerPaymentId}`, {
    headers: {
      Authorization: `Bearer ${config.api_key}`,
      Accept: "application/json",
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || payload.error || "Erro ao consultar pagamento na PushinPay");
  return payload.status || payload.situation || payload.payment_status;
}

async function createMercadoPagoPix({ user, plan, amount, billingPeriod }) {
  const configRows = await query("select * from mercado_pago_config where is_active = true order by updated_at desc, created_at desc limit 1").catch(() => []);
  const config = configRows[0];
  if (!config?.access_token) throw new Error("Mercado Pago nao configurado");

  const amountBRL = Number((amount / 100).toFixed(2));
  const response = await fetch("https://api.mercadopago.com/v1/payments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.access_token}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": uuidv4(),
    },
    body: JSON.stringify({
      transaction_amount: amountBRL,
      description: `LocalFiny - Plano ${plan.name}`,
      payment_method_id: "pix",
      notification_url: buildWebhookUrl("/api/webhooks/mercadopago"),
      payer: {
        email: user.email,
        first_name: user.name || user.email?.split("@")[0] || "Cliente",
      },
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || payload.error || "Erro ao gerar PIX no Mercado Pago");

  const transactionData = payload.point_of_interaction?.transaction_data || {};
  const providerPaymentId = String(payload.id || "");
  if (!providerPaymentId) throw new Error("Mercado Pago nao retornou o ID do pagamento");

  const paymentId = uuidv4();
  await query(
    `insert into payments
      (id, user_id, plan_id, amount, status, billing_period, payment_method, payment_link, qr_code, qr_code_base64,
       br_code, mercadopago_payment_id, provider_payment_id, gateway, expires_at)
     values (?, ?, ?, ?, 'pending', ?, 'pix', ?, ?, ?, ?, ?, ?, 'mercadopago', ?)`,
    [
      paymentId,
      user.id,
      plan.id,
      amount,
      billingPeriod,
      transactionData.ticket_url || null,
      transactionData.qr_code || "",
      String(transactionData.qr_code_base64 || "").replace(/^data:image\/\w+;base64,/, ""),
      transactionData.qr_code || "",
      providerPaymentId,
      providerPaymentId,
      new Date(Date.now() + 15 * 60 * 1000),
    ],
  );

  return {
    paymentId,
    providerPaymentId,
    pix: {
      qr_code: transactionData.qr_code || "",
      qr_code_base64: String(transactionData.qr_code_base64 || "").replace(/^data:image\/\w+;base64,/, ""),
      ticket_url: transactionData.ticket_url || "",
    },
  };
}

async function getMercadoPagoStatus(providerPaymentId) {
  const configRows = await query("select * from mercado_pago_config where is_active = true order by updated_at desc, created_at desc limit 1").catch(() => []);
  const config = configRows[0];
  if (!config?.access_token) throw new Error("Mercado Pago nao configurado");

  const response = await fetch(`https://api.mercadopago.com/v1/payments/${providerPaymentId}`, {
    headers: { Authorization: `Bearer ${config.access_token}` },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || payload.error || "Erro ao consultar Mercado Pago");
  return payload.status;
}

function buildWhere(table, filters, userId, params) {
  const clauses = [];
  if (USER_OWNED_TABLES.has(table)) {
    clauses.push(table === "profiles" ? "(user_id = ? or id = ?)" : "user_id = ?");
    params.push(userId);
    if (table === "profiles") params.push(userId);
  }

  for (const filter of filters || []) {
    const { column, op, operator, value } = filter;
    assertColumn(table, column);
    if (column === "user_id" && value !== userId) continue;

    if (op === "eq") {
      clauses.push(`${column} = ?`);
      params.push(value);
    } else if (op === "neq") {
      clauses.push(`${column} <> ?`);
      params.push(value);
    } else if (op === "lt" || op === "lte" || op === "gt" || op === "gte") {
      const sqlOp = { lt: "<", lte: "<=", gt: ">", gte: ">=" }[op];
      clauses.push(`${column} ${sqlOp} ?`);
      params.push(value);
    } else if (op === "in") {
      const values = Array.isArray(value) ? value : [];
      if (!values.length) {
        clauses.push("1 = 0");
      } else {
        clauses.push(`${column} in (${values.map(() => "?").join(", ")})`);
        params.push(...values);
      }
    } else if (op === "is") {
      if (value === null) {
        clauses.push(`${column} is null`);
      } else if (value === true) {
        clauses.push(`${column} is true`);
      } else if (value === false) {
        clauses.push(`${column} is false`);
      } else {
        clauses.push(`${column} = ?`);
        params.push(value);
      }
    } else if (op === "not") {
      if (operator === "is" && value === null) {
        clauses.push(`${column} is not null`);
      } else if (operator === "is" && value === true) {
        clauses.push(`${column} is not true`);
      } else if (operator === "is" && value === false) {
        clauses.push(`${column} is not false`);
      } else {
        const err = new Error(`Operador not nao permitido: ${operator}`);
        err.status = 400;
        throw err;
      }
    } else if (op === "ilike") {
      clauses.push(`lower(${column}) like lower(?)`);
      params.push(String(value).replace(/\*/g, "%"));
    } else {
      const err = new Error(`Operador nao permitido: ${op}`);
      err.status = 400;
      throw err;
    }
  }
  return clauses.length ? ` where ${clauses.join(" and ")}` : "";
}

function parseOrExpression(table, expression, params, userId) {
  const parts = String(expression || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const clauses = [];

  for (const part of parts) {
    const [column, op, ...rawValue] = part.split(".");
    const value = rawValue.join(".");
    assertColumn(table, column);
    if (column === "user_id" && value !== userId) {
      clauses.push("user_id = ?");
      params.push(userId);
      continue;
    }
    if (op === "eq") {
      clauses.push(`${column} = ?`);
      params.push(value === "true" ? true : value === "false" ? false : value);
    } else if (op === "ilike") {
      clauses.push(`lower(${column}) like lower(?)`);
      params.push(value.replace(/\*/g, "%"));
    }
  }

  return clauses.length ? `(${clauses.join(" or ")})` : "";
}

async function enrichRows(table, rows) {
  const normalized = rows.map(normalizeRow);

  async function attachById(fieldName, targetTable, targetField, outputName) {
    const ids = [...new Set(normalized.map((row) => row[fieldName]).filter(Boolean))];
    if (!ids.length) return;
    const related = await query(
      `select * from ${targetTable} where id in (${ids.map(() => "?").join(", ")})`,
      ids,
    );
    const map = new Map(related.map((row) => [row.id, normalizeRow(row)]));
    for (const row of normalized) {
      row[outputName] = row[fieldName] ? map.get(row[fieldName]) || null : null;
    }
  }

  if (["receitas", "despesas", "transacoes", "ia_analysis_results"].includes(table)) {
    await attachById("categoria_id", "categorias", "id", "categorias");
  }
  if (table === "transactions") {
    await attachById("category_id", "categories", "id", "categories");
    await attachById("bank_id", "banks", "id", "banks");
  }
  if (table === "receitas") {
    await attachById("bank_account_id", "bank_accounts", "id", "bank_accounts");
  }
  if (table === "itens_mercado") {
    await attachById("categoria_mercado_id", "categorias_mercado", "id", "categorias_mercado");
  }
  if (table === "metas") {
    await attachById("categoria_meta_id", "categorias_metas", "id", "categorias_metas");
  }
  return normalized;
}

async function selectRows(table, body, userId) {
  assertTable(table);
  const params = [];
  let where = buildWhere(table, body.filters, userId, params);
  const extraOrClauses = [];
  for (const expression of body.orFilters || []) {
    const clause = parseOrExpression(table, expression, params, userId);
    if (clause) extraOrClauses.push(clause);
  }
  if (extraOrClauses.length) {
    where += `${where ? " and " : " where "}${extraOrClauses.join(" and ")}`;
  }

  let count;
  if (body.selectOptions?.count) {
    const countRows = await query(`select count(*) as count from ${table}${where}`, params);
    count = Number(countRows[0]?.count || 0);
    if (body.selectOptions?.head) return { rows: [], count };
  }

  let sql = `select * from ${table}${where}`;

  if (body.order?.column) {
    assertColumn(table, body.order.column);
    sql += ` order by ${body.order.column} ${body.order.ascending === false ? "desc" : "asc"}`;
  }
  if (body.range) {
    const from = Math.max(0, Number(body.range.from || 0));
    const to = Math.max(from, Number(body.range.to || from));
    sql += " limit ? offset ?";
    params.push(to - from + 1, from);
  } else if (body.limit) {
    sql += " limit ?";
    params.push(Number(body.limit));
  }

  const rows = await query(sql, params);
  return { rows: await enrichRows(table, rows), count };
}

async function insertRows(table, payload, userId) {
  assertTable(table);
  const rows = Array.isArray(payload) ? payload : [payload];
  const inserted = [];

  for (const original of rows) {
    const data = pickAllowedColumns(table, original);
    data.id ||= uuidv4();
    if (USER_OWNED_TABLES.has(table)) data.user_id = userId;
    const columns = Object.keys(data);
    const values = columns.map((column) => data[column]);
    await query(
      `insert into ${table} (${columns.join(", ")}) values (${columns.map(() => "?").join(", ")})`,
      values,
    );
    const found = await query(`select * from ${table} where id = ? limit 1`, [data.id]);
    inserted.push(found[0]);
  }

  return enrichRows(table, inserted);
}

async function updateRows(table, body, userId) {
  assertTable(table);
  const data = pickAllowedColumns(table, body.payload);
  delete data.id;
  delete data.user_id;
  const columns = Object.keys(data);
  if (!columns.length) return [];

  const params = columns.map((column) => data[column]);
  const where = buildWhere(table, body.filters, userId, params);
  await query(`update ${table} set ${columns.map((column) => `${column} = ?`).join(", ")}${where}`, params);
  const selected = await selectRows(table, body, userId);
  return selected.rows;
}

async function deleteRows(table, body, userId) {
  assertTable(table);
  const params = [];
  const where = buildWhere(table, body.filters, userId, params);
  await query(`delete from ${table}${where}`, params);
  return [];
}

async function upsertRows(table, body, userId) {
  const rows = Array.isArray(body.payload) ? body.payload : [body.payload];
  const inserted = [];
  const conflictColumns = String(body.onConflict || "")
    .split(",")
    .map((column) => column.trim())
    .filter(Boolean);

  for (const row of rows) {
    const data = pickAllowedColumns(table, row);
    data.id ||= uuidv4();
    if (USER_OWNED_TABLES.has(table)) data.user_id = userId;
    const columns = Object.keys(data);
    const updateColumns = columns.filter((column) => column !== "id" && !conflictColumns.includes(column));
    const sql = `
      insert into ${table} (${columns.join(", ")})
      values (${columns.map(() => "?").join(", ")})
      on duplicate key update ${body.ignoreDuplicates ? "id = id" : updateColumns.map((column) => `${column} = values(${column})`).join(", ")}
    `;
    await query(sql, columns.map((column) => data[column]));
    const found = await query(`select * from ${table} where id = ? limit 1`, [data.id]);
    if (found[0]) inserted.push(found[0]);
  }
  return enrichRows(table, inserted);
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/market/quotes", async (_req, res) => {
  try {
    res.json(await getMarketQuotes());
  } catch (error) {
    handleError(res, error);
  }
});

app.post("/api/auth/signup", async (req, res) => {
  try {
    const { email, password, name, organizationName, telefone } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email e senha sao obrigatorios" });
    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, 12);
    await query(
      "insert into users (id, email, password_hash, role, name, organization_name, telefone) values (?, ?, ?, 'user', ?, ?, ?)",
      [id, email, passwordHash, name || null, organizationName || null, telefone || null],
    );
    await query(
      "insert into profiles (id, user_id, name, full_name, email, organization_name, telefone) values (?, ?, ?, ?, ?, ?, ?)",
      [id, id, name || email, name || email, email, organizationName || null, telefone || null],
    );
    const user = { id, email, role: "user", name, organization_name: organizationName, telefone };
    res.json({ user: publicUser(user), session: { access_token: signToken(user), user: publicUser(user) } });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "Email ja cadastrado" });
    handleError(res, error);
  }
});

app.post("/api/auth/signin", async (req, res) => {
  try {
    const { email, password } = req.body;
    const rows = await query("select * from users where email = ? limit 1", [email]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password || "", user.password_hash))) {
      return res.status(401).json({ error: "Email ou senha invalidos" });
    }
    res.json({ user: publicUser(user), session: { access_token: signToken(user), user: publicUser(user) } });
  } catch (error) {
    handleError(res, error);
  }
});

app.get("/api/auth/me", authRequired, (req, res) => {
  const user = publicUser(req.user);
  res.json({ user, session: { user } });
});

app.post("/api/auth/update-password", async (req, res) => {
  try {
    const { password, token } = req.body;
    if (!password || password.length < 6) return res.status(400).json({ error: "Senha invalida" });

    if (token) {
      const tokenHash = crypto.createHash("sha256").update(String(token)).digest("hex");
      const rows = await query(
        "select * from users where reset_token_hash = ? and reset_token_expires_at > now() limit 1",
        [tokenHash],
      );
      const user = rows[0];
      if (!user) return res.status(400).json({ error: "Link de redefinicao invalido ou expirado" });
      await query(
        "update users set password_hash = ?, reset_token_hash = null, reset_token_expires_at = null where id = ?",
        [await bcrypt.hash(password, 12), user.id],
      );
      return res.json({ ok: true });
    }

    const header = req.headers.authorization || "";
    const jwtToken = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!jwtToken) return res.status(401).json({ error: "Nao autenticado" });
    const payload = jwt.verify(jwtToken, JWT_SECRET);
    await query("update users set password_hash = ? where id = ?", [await bcrypt.hash(password, 12), payload.sub]);
    res.json({ ok: true });
  } catch (error) {
    handleError(res, error);
  }
});

app.post("/api/auth/reset-password", async (req, res) => {
  try {
    const { email, redirectTo } = req.body;
    if (!email) return res.status(400).json({ error: "Email e obrigatorio" });

    const rows = await query("select * from users where email = ? limit 1", [email]);
    const user = rows[0];
    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      await query(
        "update users set reset_token_hash = ?, reset_token_expires_at = date_add(now(), interval 1 hour) where id = ?",
        [tokenHash, user.id],
      );
      const baseUrl = redirectTo || `${APP_BASE_URL}/#/reset-password`;
      const resetUrl = new URL(baseUrl);
      resetUrl.searchParams.set("type", "recovery");
      resetUrl.searchParams.set("token", token);
      await sendPasswordResetEmail(user, resetUrl.toString());
    }

    res.json({ ok: true });
  } catch (error) {
    handleError(res, error);
  }
});

app.post("/api/db/:table", authRequired, async (req, res) => {
  try {
    const { table } = req.params;
    const { action } = req.body;
    let data;
    let count;
    if (action === "select") {
      const result = await selectRows(table, req.body, req.user.id);
      data = result.rows;
      count = result.count;
    }
    else if (action === "insert") data = await insertRows(table, req.body.payload, req.user.id);
    else if (action === "update") data = await updateRows(table, req.body, req.user.id);
    else if (action === "delete") data = await deleteRows(table, req.body, req.user.id);
    else if (action === "upsert") data = await upsertRows(table, req.body, req.user.id);
    else return res.status(400).json({ error: `Acao nao permitida: ${action}` });

    if (req.body.single) data = data[0] || null;
    if (req.body.maybeSingle) data = data[0] || null;
    res.json({ data, count, error: null });
  } catch (error) {
    handleError(res, error);
  }
});

app.post("/api/rpc/delete_user_account", authRequired, async (req, res) => {
  try {
    await query("delete from users where id = ?", [req.user.id]);
    res.json({ data: true, error: null });
  } catch (error) {
    handleError(res, error);
  }
});

app.post("/api/rpc/has_role", authRequired, async (req, res) => {
  try {
    const requestedUserId = req.body?._user_id || req.body?.user_id || req.user.id;
    const requestedRole = String(req.body?._role || req.body?.role || "").toLowerCase();
    const roleRows = await query("select role from user_roles where user_id = ? limit 1", [requestedUserId]).catch(() => []);
    const roles = new Set([
      String(req.user.role || "").toLowerCase(),
      ...roleRows.map((row) => String(row.role || "").toLowerCase()),
    ]);
    const data = roles.has(requestedRole) || (requestedRole === "admin" && roles.has("superadmin"));
    res.json({ data, error: null });
  } catch (error) {
    handleError(res, error);
  }
});

app.post("/api/rpc/get_user_plan", authRequired, async (_req, res) => {
  try {
    if (isAdminUser(_req.user)) {
      return res.json({
        data: [fullFeaturePlan("Admin")],
        error: null,
      });
    }

    const rows = await query(
      `
        select
          p.plan_type,
          p.name as plan_name,
          p.max_banks,
          p.max_goals,
          p.max_reminders,
          p.whatsapp_enabled,
          p.reports_enabled,
          p.cashflow_projection_enabled,
          p.export_enabled,
          p.split_enabled,
          p.business_profile_enabled,
          p.advanced_dashboard_enabled,
          p.annual_projection_enabled,
          p.history_months,
          p.monthly_planning_enabled,
          s.status
        from subscriptions s
        join plans p on p.id = s.plan_id
        where s.user_id = ?
          and s.status = 'active'
          and (s.current_period_end is null or s.current_period_end > now())
        order by s.updated_at desc, s.created_at desc
        limit 1
      `,
      [_req.user.id],
    ).catch(() => []);

    if (rows[0]) {
      const plan = rows[0];
      const planType = String(plan.plan_type || "starter").toLowerCase();
      return res.json({
        data: [{
          ...defaultPlan(),
          ...normalizeRow(plan),
          plan_type: planType,
          plan_name: plan.plan_name || planType,
          is_active: true,
          ai_enabled: !["starter", "free"].includes(planType),
          import_enabled: !["starter", "free"].includes(planType),
        }],
        error: null,
      });
    }

    res.json({ data: [defaultPlan()], error: null });
  } catch (error) {
    handleError(res, error);
  }
});

app.post("/api/rpc/is_registration_allowed", optionalAuth, async (_req, res) => {
  try {
    const rows = await query("select allow_registration from app_settings order by created_at desc limit 1").catch(() => []);
    res.json({ data: rows.length ? Boolean(rows[0].allow_registration) : true, error: null });
  } catch (error) {
    handleError(res, error);
  }
});

app.post("/api/rpc/update_app_setting", authRequired, async (req, res) => {
  try {
    if (!isAdminUser(req.user)) return res.status(403).json({ error: "Acesso negado" });
    const allowRegistration = Boolean(req.body?.p_allow_registration ?? req.body?.allow_registration);
    const rows = await query("select id, allow_registration from app_settings order by created_at desc limit 1");
    if (rows[0]) {
      await query("update app_settings set allow_registration = ? where id = ?", [allowRegistration, rows[0].id]);
    } else {
      await query("insert into app_settings (id, allow_registration) values (?, ?)", [uuidv4(), allowRegistration]);
    }
    await query(
      "insert into app_settings_logs (id, changed_by, setting_key, old_value, new_value) values (?, ?, 'allow_registration', ?, ?)",
      [uuidv4(), req.user.id, rows[0] ? String(Boolean(rows[0].allow_registration)) : null, String(allowRegistration)],
    ).catch(() => null);
    res.json({ data: true, error: null });
  } catch (error) {
    handleError(res, error);
  }
});

app.get("/api/admin/users", authRequired, adminRequired, async (_req, res) => {
  try {
    const rows = await query(`
      select
        u.id,
        u.email,
        u.name,
        u.role,
        u.created_at,
        p.full_name,
        p.name as profile_name,
        p.phone_number,
        p.telefone,
        p.is_blocked,
        s.id as subscription_id,
        s.status as subscription_status,
        s.billing_period,
        s.current_period_start,
        s.current_period_end,
        pl.id as plan_id,
        pl.name as plan_name,
        pl.plan_type
      from users u
      left join profiles p on p.id = (
        select p2.id
          from profiles p2
         where p2.user_id = u.id or p2.id = u.id
         order by p2.updated_at desc, p2.created_at desc
         limit 1
      )
      left join subscriptions s on s.id = (
        select s2.id
          from subscriptions s2
         where s2.user_id = u.id
         order by (s2.status = 'active') desc, s2.updated_at desc, s2.created_at desc
         limit 1
      )
      left join plans pl on pl.id = s.plan_id
      order by u.created_at desc
    `);

    const users = rows.map((row) => {
      const normalized = normalizeRow(row);
      const isActive = normalized.subscription_status === "active";
      return {
        ...normalized,
        full_name: normalized.full_name || normalized.profile_name || normalized.name || "Sem nome",
        phone_number: normalized.phone_number || normalized.telefone || null,
        is_blocked: boolValue(normalized.is_blocked),
        plan_type: isActive ? (normalized.plan_type || "free") : "free",
        plan_name: isActive ? (normalized.plan_name || "Gratuito") : "Gratuito",
      };
    });

    res.json({ data: users, error: null });
  } catch (error) {
    handleError(res, error);
  }
});

app.get("/api/public/plans", async (_req, res) => {
  try {
    const rows = await query(`
      select *
        from plans
       where is_active = true
       order by case plan_type
          when 'starter' then 1
          when 'free' then 1
          when 'pro' then 2
          when 'business' then 3
          when 'pro_plus' then 3
          else 9
        end,
        price_monthly asc,
        created_at asc
    `);
    res.json({ data: rows.map(normalizeRow), error: null });
  } catch (error) {
    handleError(res, error);
  }
});

app.get("/api/admin/plans", authRequired, adminRequired, async (_req, res) => {
  try {
    const rows = await query(`
      select *
        from plans
       order by case plan_type
          when 'starter' then 1
          when 'free' then 1
          when 'pro' then 2
          when 'business' then 3
          when 'pro_plus' then 3
          else 9
        end,
        price_monthly asc,
        created_at asc
    `);
    res.json({ data: rows.map(normalizeRow), error: null });
  } catch (error) {
    handleError(res, error);
  }
});

app.put("/api/admin/plans/:id", authRequired, adminRequired, async (req, res) => {
  try {
    const plan = req.body || {};
    const payload = {
      id: req.params.id,
      name: String(plan.name || "").trim() || "Plano",
      description: plan.description || null,
      plan_type: String(plan.plan_type || "starter").trim().toLowerCase(),
      price_monthly: centsValue(plan.price_monthly),
      price_yearly: centsValue(plan.price_yearly),
      max_banks: intValue(plan.max_banks, 999),
      max_goals: intValue(plan.max_goals, 1),
      max_reminders: intValue(plan.max_reminders, 3),
      history_months: intValue(plan.history_months, 3),
      features: Array.isArray(plan.features) ? JSON.stringify(plan.features.filter(Boolean)) : (plan.features || null),
      is_active: boolValue(plan.is_active),
      whatsapp_enabled: boolValue(plan.whatsapp_enabled),
      reports_enabled: boolValue(plan.reports_enabled),
      cashflow_projection_enabled: boolValue(plan.cashflow_projection_enabled),
      export_enabled: boolValue(plan.export_enabled),
      split_enabled: boolValue(plan.split_enabled),
      business_profile_enabled: boolValue(plan.business_profile_enabled),
      advanced_dashboard_enabled: boolValue(plan.advanced_dashboard_enabled),
      annual_projection_enabled: boolValue(plan.annual_projection_enabled),
      monthly_planning_enabled: boolValue(plan.monthly_planning_enabled),
      ai_enabled: boolValue(plan.ai_enabled),
      import_enabled: boolValue(plan.import_enabled),
    };

    await query(
      `update plans
          set name = ?,
              description = ?,
              plan_type = ?,
              price_monthly = ?,
              price_yearly = ?,
              max_banks = ?,
              max_goals = ?,
              max_reminders = ?,
              history_months = ?,
              features = ?,
              is_active = ?,
              whatsapp_enabled = ?,
              reports_enabled = ?,
              cashflow_projection_enabled = ?,
              export_enabled = ?,
              split_enabled = ?,
              business_profile_enabled = ?,
              advanced_dashboard_enabled = ?,
              annual_projection_enabled = ?,
              monthly_planning_enabled = ?,
              ai_enabled = ?,
              import_enabled = ?
        where id = ?`,
      [
        payload.name,
        payload.description,
        payload.plan_type,
        payload.price_monthly,
        payload.price_yearly,
        payload.max_banks,
        payload.max_goals,
        payload.max_reminders,
        payload.history_months,
        payload.features,
        payload.is_active,
        payload.whatsapp_enabled,
        payload.reports_enabled,
        payload.cashflow_projection_enabled,
        payload.export_enabled,
        payload.split_enabled,
        payload.business_profile_enabled,
        payload.advanced_dashboard_enabled,
        payload.annual_projection_enabled,
        payload.monthly_planning_enabled,
        payload.ai_enabled,
        payload.import_enabled,
        payload.id,
      ],
    );

    res.json({ data: true, error: null });
  } catch (error) {
    handleError(res, error);
  }
});

app.put("/api/admin/users/:id/plan", authRequired, adminRequired, async (req, res) => {
  try {
    const userId = req.params.id;
    const planType = String(req.body?.plan_type || "free").toLowerCase();
    if (planType === "free") {
      await query("delete from subscriptions where user_id = ?", [userId]);
      return res.json({ data: true, error: null });
    }

    const planRows = await query("select id, name from plans where plan_type = ? and is_active = true order by price_monthly desc limit 1", [planType]);
    if (!planRows.length) return res.status(404).json({ error: "Plano nao encontrado" });

    const subRows = await query("select id from subscriptions where user_id = ? order by updated_at desc, created_at desc limit 1", [userId]);
    const periodEnd = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    if (subRows[0]) {
      await query(
        `update subscriptions
            set plan_id = ?,
                status = 'active',
                billing_period = ?,
                current_period_start = now(),
                current_period_end = ?,
                canceled_at = null
          where id = ?`,
        [planRows[0].id, req.body?.billing_period || "yearly", periodEnd, subRows[0].id],
      );
    } else {
      await query(
        `insert into subscriptions
          (id, user_id, plan_id, status, billing_period, current_period_start, current_period_end)
         values (?, ?, ?, 'active', ?, now(), ?)`,
        [uuidv4(), userId, planRows[0].id, req.body?.billing_period || "yearly", periodEnd],
      );
    }

    res.json({ data: true, error: null });
  } catch (error) {
    handleError(res, error);
  }
});

app.patch("/api/admin/users/:id/block", authRequired, adminRequired, async (req, res) => {
  try {
    const userId = req.params.id;
    if (userId === req.user.id) return res.status(400).json({ error: "Voce nao pode bloquear a si proprio" });
    const isBlocked = boolValue(req.body?.is_blocked);
    await query("update profiles set is_blocked = ? where user_id = ? or id = ?", [isBlocked, userId, userId]);
    res.json({ data: true, error: null });
  } catch (error) {
    handleError(res, error);
  }
});

app.delete("/api/admin/users/:id", authRequired, adminRequired, async (req, res) => {
  try {
    const userId = req.params.id;
    if (userId === req.user.id) return res.status(400).json({ error: "Voce nao pode excluir a si proprio" });
    await query("delete from users where id = ?", [userId]);
    res.json({ data: true, error: null });
  } catch (error) {
    handleError(res, error);
  }
});

const adminConfigTables = {
  mercado_pago: "mercado_pago_config",
  pushinpay: "pushinpay_config",
  evolution: "evolution_api_config",
  openai: "openai_config",
};

app.get("/api/admin/config/:name", authRequired, adminRequired, async (req, res) => {
  try {
    const table = adminConfigTables[req.params.name];
    if (!table) return res.status(404).json({ error: "Configuracao nao encontrada" });
    const rows = await query(`select * from ${table} order by created_at desc limit 1`);
    res.json({ data: rows[0] ? normalizeRow(rows[0]) : null, error: null });
  } catch (error) {
    handleError(res, error);
  }
});

app.put("/api/admin/config/:name", authRequired, adminRequired, async (req, res) => {
  try {
    const table = adminConfigTables[req.params.name];
    if (!table) return res.status(404).json({ error: "Configuracao nao encontrada" });
    const rows = await query(`select id from ${table} order by created_at desc limit 1`);
    const id = req.body?.id || rows[0]?.id || uuidv4();
    let payload;

    if (req.params.name === "mercado_pago") {
      payload = pickAllowedColumns(table, {
        id,
        access_token: req.body?.access_token || null,
        public_key: req.body?.public_key || null,
        webhook_secret: req.body?.webhook_secret || null,
        is_active: boolValue(req.body?.is_active ?? true),
      });
    } else if (req.params.name === "pushinpay") {
      payload = pickAllowedColumns(table, {
        id,
        api_key: req.body?.api_key || null,
        api_url: req.body?.api_url || "https://api.pushinpay.com.br/api",
        webhook_secret: req.body?.webhook_secret || null,
        is_active: boolValue(req.body?.is_active ?? true),
      });
    } else if (req.params.name === "evolution") {
      payload = pickAllowedColumns(table, {
        id,
        api_url: req.body?.api_url || null,
        api_key: req.body?.api_key || null,
        instance_name: req.body?.instance_name || null,
      });
    } else {
      payload = pickAllowedColumns(table, {
        id,
        api_key: req.body?.api_key || null,
        model: req.body?.model || "gpt-4o-mini",
      });
    }

    const columns = Object.keys(payload);
    await query(
      `insert into ${table} (${columns.join(", ")}) values (${columns.map(() => "?").join(", ")})
       on duplicate key update ${columns.filter((column) => column !== "id").map((column) => `${column} = values(${column})`).join(", ")}`,
      columns.map((column) => payload[column]),
    );
    const saved = await query(`select * from ${table} where id = ? limit 1`, [id]);
    res.json({ data: saved[0] ? normalizeRow(saved[0]) : true, error: null });
  } catch (error) {
    handleError(res, error);
  }
});

app.post("/api/admin/config/:name/test", authRequired, adminRequired, async (req, res) => {
  try {
    if (req.params.name === "openai") {
      const apiKey = req.body?.api_key;
      if (!apiKey) return res.status(400).json({ error: "Informe a chave da OpenAI" });
      const response = await fetch("https://api.openai.com/v1/models", {
        headers: { authorization: `Bearer ${apiKey}` },
      });
      if (!response.ok) return res.status(400).json({ error: "Chave OpenAI invalida ou sem acesso" });
      return res.json({ data: { success: true, message: "Conexao OpenAI estabelecida com sucesso" }, error: null });
    }

    if (req.params.name === "evolution") {
      const apiUrl = String(req.body?.api_url || "").replace(/\/+$/, "");
      const apiKey = req.body?.api_key;
      if (!apiUrl || !apiKey) return res.status(400).json({ error: "Informe URL e API Key da Evolution" });
      const response = await fetch(`${apiUrl}/instance/fetchInstances`, {
        headers: { apikey: apiKey },
      });
      if (!response.ok) return res.status(400).json({ error: "Nao foi possivel conectar na Evolution API" });
      return res.json({ data: { success: true, message: "Conexao Evolution estabelecida com sucesso" }, error: null });
    }

    if (req.params.name === "pushinpay") {
      const apiUrl = String(req.body?.api_url || "https://api.pushinpay.com.br/api").replace(/\/+$/, "");
      const apiKey = req.body?.api_key;
      if (!apiKey) return res.status(400).json({ error: "Informe o token da PushinPay" });
      const response = await fetch(`${apiUrl}/transaction/test`, {
        headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
      }).catch((error) => ({ ok: false, status: 0, error }));
      if (response.status === 401 || response.status === 403) return res.status(400).json({ error: "Token PushinPay invalido ou sem acesso" });
      return res.json({ data: { success: true, message: "Token PushinPay salvo para uso em cobrancas PIX" }, error: null });
    }

    res.json({ data: { success: true, message: "Configuracao salva" }, error: null });
  } catch (error) {
    handleError(res, error);
  }
});

app.get("/api/admin/payments", authRequired, adminRequired, async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize || 10)));
    const countRows = await query("select count(*) as count from payments");
    const rows = await query(
      `select
         pay.*,
         u.email as user_email,
         coalesce(p.full_name, p.name, u.name) as user_name
       from payments pay
       left join users u on u.id = pay.user_id
       left join profiles p on p.id = (
         select p2.id
           from profiles p2
          where p2.user_id = pay.user_id or p2.id = pay.user_id
          order by p2.updated_at desc, p2.created_at desc
          limit 1
       )
       order by pay.created_at desc
       limit ? offset ?`,
      [pageSize, (page - 1) * pageSize],
    );
    res.json({
      data: {
        data: rows.map((row) => {
          const normalized = normalizeRow(row);
          return {
            ...normalized,
            profiles: {
              full_name: normalized.user_name,
              email: normalized.user_email,
            },
          };
        }),
        count: Number(countRows[0]?.count || 0),
      },
      error: null,
    });
  } catch (error) {
    handleError(res, error);
  }
});

app.patch("/api/admin/payments/:id/status", authRequired, adminRequired, async (req, res) => {
  try {
    await query("update payments set status = ? where id = ?", [req.body?.status || "pending", req.params.id]);
    res.json({ data: true, error: null });
  } catch (error) {
    handleError(res, error);
  }
});

app.delete("/api/admin/payments", authRequired, adminRequired, async (_req, res) => {
  try {
    await query("delete from payments");
    res.json({ data: true, error: null });
  } catch (error) {
    handleError(res, error);
  }
});

app.post("/api/webhooks/pushinpay", async (req, res) => {
  try {
    const payload = req.body || {};
    const providerPaymentId = String(payload.id || payload.transaction_id || payload.payment_id || payload.external_id || "");
    const status = payload.status || payload.situation || payload.payment_status;
    if (!providerPaymentId) return res.json({ ok: true });

    const rows = await query(
      "select * from payments where provider_payment_id = ? or mercadopago_payment_id = ? limit 1",
      [providerPaymentId, providerPaymentId],
    );
    if (rows[0]) await updatePaymentStatusFromProvider(rows[0], status);
    res.json({ ok: true });
  } catch (error) {
    handleError(res, error);
  }
});

app.post("/api/webhooks/mercadopago", async (req, res) => {
  try {
    const paymentId = String(req.body?.data?.id || req.body?.id || req.query?.["data.id"] || "");
    if (!paymentId) return res.json({ ok: true });
    const rows = await query(
      "select * from payments where provider_payment_id = ? or mercadopago_payment_id = ? limit 1",
      [paymentId, paymentId],
    );
    if (rows[0]) {
      const status = await getMercadoPagoStatus(paymentId).catch(() => req.body?.status);
      await updatePaymentStatusFromProvider(rows[0], status);
    }
    res.json({ ok: true });
  } catch (error) {
    handleError(res, error);
  }
});

async function adminSettingsHandler(req, res) {
  if (!isAdminUser(req.user)) return res.status(403).json({ error: "Acesso negado" });
  const { action, table, data = {} } = req.body || {};
  assertTable(table);

  if (action === "get") {
    const page = Math.max(1, Number(data.page || 1));
    const pageSize = Math.min(100, Math.max(1, Number(data.pageSize || 50)));
    const countRows = await query(`select count(*) as count from ${table}`);
    const rows = await query(`select * from ${table} order by created_at desc limit ? offset ?`, [pageSize, (page - 1) * pageSize])
      .catch(() => query(`select * from ${table} limit ? offset ?`, [pageSize, (page - 1) * pageSize]));
    return res.json({ data: table === "payments" ? { data: rows.map(normalizeRow), count: Number(countRows[0]?.count || 0) } : rows.map(normalizeRow), error: null });
  }

  if (action === "update") {
    const id = data.id || uuidv4();
    const payload = pickAllowedColumns(table, { ...data, id });
    const columns = Object.keys(payload);
    const updates = columns.filter((column) => column !== "id").map((column) => `${column} = values(${column})`);
    await query(
      `insert into ${table} (${columns.join(", ")}) values (${columns.map(() => "?").join(", ")}) on duplicate key update ${updates.length ? updates.join(", ") : "id = id"}`,
      columns.map((column) => payload[column]),
    );
    return res.json({ data: true, error: null });
  }

  if (action === "delete") {
    if (data.id) await query(`delete from ${table} where id = ?`, [data.id]);
    return res.json({ data: true, error: null });
  }

  if (action === "clear_all" && table === "payments") {
    await query("delete from payments");
    return res.json({ data: true, error: null });
  }

  return res.status(400).json({ error: `Acao nao permitida: ${action}` });
}

app.post("/api/functions/:name", optionalAuth, async (req, res) => {
  try {
    const { name } = req.params;

    if (name === "validate-signup") {
      const { email, password, fullName, captchaVerified } = req.body || {};
      if (!captchaVerified) return res.json({ data: { error: "Verificacao anti-spam invalida" }, error: null });
      if (!email || !password || !fullName) return res.json({ data: { error: "Preencha todos os campos" }, error: null });
      if (String(password).length < 8) return res.json({ data: { error: "Senha muito curta" }, error: null });
      return res.json({ data: { success: true }, error: null });
    }

    if (name === "get-market-quotes") {
      const payload = await getMarketQuotes();
      return res.json({
        data: {
          success: true,
          quotes: payload.quotes.map((quote) => ({
            symbol: quote.symbol,
            name: quote.label,
            price: quote.value,
            change: quote.previousClose === null ? 0 : quote.value - quote.previousClose,
            changePercent: quote.changePercent || 0,
            type: quote.type,
          })),
          lastUpdate: payload.fetchedAt,
        },
        error: null,
      });
    }

    if (name === "get-exchange-rates") {
      return res.json({
        data: {
          success: true,
          rates: { BRL: 5.5, USD: 1, EUR: 0.93, GBP: 0.79, JPY: 160, CNY: 7.25, ARS: 900, CAD: 1.36, AUD: 1.5, CHF: 0.9, MXN: 18, CLP: 930, PEN: 3.75, COP: 4100, UYU: 40 },
          lastUpdate: new Date().toISOString(),
        },
        error: null,
      });
    }

    if (name === "get-financial-news") {
      return res.json({ data: { success: true, news: [], lastUpdate: new Date().toISOString() }, error: null });
    }

    if (name === "admin-settings") return adminSettingsHandler(req, res);

    if (name === "create-mercadopago-checkout") {
      if (!req.user) return res.status(401).json({ error: "Sessao expirada" });
      const { planId, billingPeriod = "monthly", gateway } = req.body || {};
      const planRows = await query("select * from plans where id = ? and is_active = true limit 1", [planId]);
      const plan = planRows[0];
      if (!plan) return res.status(404).json({ error: "Plano nao encontrado" });

      const { amount, billingPeriod: normalizedPeriod } = getPlanAmount(plan, billingPeriod);
      if (amount <= 0) return res.status(400).json({ error: "Plano gratuito nao gera pagamento" });

      const pushinRows = await query("select id from pushinpay_config where is_active = true and api_key is not null limit 1").catch(() => []);
      const preferredGateway = gateway === "mercadopago" || gateway === "pushinpay"
        ? gateway
        : pushinRows.length
          ? "pushinpay"
          : "mercadopago";

      const result = preferredGateway === "pushinpay"
        ? await createPushinPayPix({ userId: req.user.id, plan, amount, billingPeriod: normalizedPeriod })
        : await createMercadoPagoPix({ user: req.user, plan, amount, billingPeriod: normalizedPeriod });

      return res.json({
        data: {
          success: true,
          gateway: preferredGateway,
          payment_id: result.providerPaymentId,
          local_payment_id: result.paymentId,
          pix: result.pix,
        },
        error: null,
      });
    }

    if (name === "check-payment-status") {
      if (!req.user) return res.status(401).json({ error: "Sessao expirada" });
      const providerPaymentId = String(req.body?.paymentId || req.body?.payment_id || "");
      if (!providerPaymentId) return res.status(400).json({ error: "Pagamento nao informado" });

      const rows = await query(
        "select * from payments where provider_payment_id = ? or mercadopago_payment_id = ? limit 1",
        [providerPaymentId, providerPaymentId],
      );
      const payment = rows[0];
      if (!payment) return res.status(404).json({ error: "Pagamento nao encontrado" });
      if (payment.user_id !== req.user.id && !isAdminUser(req.user)) return res.status(403).json({ error: "Acesso negado" });

      let providerStatus = payment.status;
      if (payment.gateway === "pushinpay") {
        providerStatus = await getPushinPayStatus(payment.provider_payment_id || payment.mercadopago_payment_id).catch(() => payment.status);
      } else if (payment.gateway === "mercadopago") {
        providerStatus = await getMercadoPagoStatus(payment.provider_payment_id || payment.mercadopago_payment_id).catch(() => payment.status);
      }
      const updated = await updatePaymentStatusFromProvider(payment, providerStatus);
      return res.json({ data: { success: true, status: updated.status || payment.status }, error: null });
    }

    if (name === "ai-chat") {
      return res.json({
        data: {
          success: false,
          message: "A assistente IA ja esta na interface do LocalFiny 2.0, mas a chave/configuracao da IA ainda precisa ser conectada no backend MySQL.",
        },
        error: null,
      });
    }

    if (["openai-config", "evolution-api", "send-whatsapp", "process-transaction-image", "check-achievements"].includes(name)) {
      return res.json({ data: { success: false, message: "Integracao ainda nao configurada no MySQL" }, error: null });
    }

    res.status(404).json({ error: `Funcao nao encontrada: ${name}` });
  } catch (error) {
    handleError(res, error);
  }
});

app.post("/api/storage/:bucket/upload", authRequired, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Arquivo ausente" });
    const bucket = req.params.bucket;
    const requestedPath = String(req.body.filePath || `${req.user.id}/${req.file.originalname}`);
    const safePath = requestedPath
      .split("/")
      .map((part) => part.replace(/[^\w.\-]/g, "_"))
      .filter(Boolean)
      .join("/");
    const bucketDir = path.join(uploadRoot, bucket, path.dirname(safePath));
    fs.mkdirSync(bucketDir, { recursive: true });
    const finalPath = path.join(uploadRoot, bucket, safePath);
    fs.renameSync(req.file.path, finalPath);
    const storagePath = safePath;
    const publicUrl = `${PUBLIC_BASE_URL}/uploads/${bucket}/${storagePath}`.replace(/([^:]\/)\/+/g, "$1");
    res.json({ data: { path: storagePath, publicUrl }, error: null });
  } catch (error) {
    handleError(res, error);
  }
});

const distPath = path.join(__dirname, "..", "dist");
if (fs.existsSync(distPath)) {
  const sendNoCacheStatic = (fileName) => (_req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.sendFile(path.join(distPath, fileName));
  };

  app.get("/sw.js", sendNoCacheStatic("sw.js"));
  app.get("/registerSW.js", sendNoCacheStatic("registerSW.js"));
  app.get("/pwa-192x192.png", sendNoCacheStatic("pwa-192x192.png"));
  app.get("/pwa-512x512.png", sendNoCacheStatic("pwa-512x512.png"));
  app.get("/workbox-:hash.js", (req, res) => {
    const fileName = `workbox-${req.params.hash}.js`;
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.sendFile(path.join(distPath, fileName));
  });

  app.use(
    express.static(distPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith(".html")) {
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
          res.setHeader("Pragma", "no-cache");
          res.setHeader("Expires", "0");
        }
      },
    }),
  );
  app.use((_req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.sendFile(path.join(distPath, "index.html"));
  });
}

await runMigrations();

app.listen(PORT, () => {
  console.log(`LocalFiny API listening on port ${PORT}`);
});
