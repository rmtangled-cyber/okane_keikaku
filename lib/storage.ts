"use client";

import {
  collection, doc, getDocs, writeBatch, deleteDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { getUid } from "./uid";
import { Asset, Goal, MonthlySnapshot, StockHolding, FundHolding, MonthlyExpense, IncomeProfile, LifeEvent, InsurancePlan, SpendingRecord, LoanPlan } from "./types";

// ── Firestore helpers ─────────────────────────────────────────────────────────

function userCol(name: string) {
  return collection(db, "users", getUid(), name);
}

async function fsGetAll<T>(name: string): Promise<T[]> {
  const snap = await getDocs(userCol(name));
  return snap.docs.map(d => d.data() as T);
}

async function fsSaveAll<T extends { id?: string; month?: string }>(name: string, items: T[]): Promise<void> {
  const col = userCol(name);
  const batch = writeBatch(db);
  const snap = await getDocs(col);
  snap.docs.forEach(d => batch.delete(d.ref));
  items.forEach(item => {
    const docId = item.id ?? item.month ?? crypto.randomUUID();
    batch.set(doc(col, docId), item);
  });
  await batch.commit();
}

// ── Local cache keys ──────────────────────────────────────────────────────────

const KEYS = {
  assets: "okane_assets",
  goals: "okane_goals",
  snapshots: "okane_snapshots",
  stocks: "okane_stocks",
  funds: "okane_funds",
  expenses: "okane_expenses",
  incomeProfiles: "okane_incomeProfiles",
  lifeEvents: "okane_lifeEvents",
  insurancePlans: "okane_insurancePlans",
  spendingRecords: "okane_spending",
  loanPlans: "okane_loans",
} as const;

type StoreKey = keyof typeof KEYS;

function localGet<T>(key: StoreKey): T[] | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEYS[key]);
  return raw ? JSON.parse(raw) : null;
}

function localSet<T>(key: StoreKey, data: T[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEYS[key], JSON.stringify(data));
}

// ── Public API ────────────────────────────────────────────────────────────────
// getXxx()    → ローカルキャッシュを返す（即時）
// loadXxx()   → Firestoreから取得してキャッシュ更新（非同期、コンポーネントのuseEffect用）
// saveXxx()   → ローカル即時保存 + Firestoreへバックグラウンド同期

// Assets
export function getAssets(): Asset[] { return localGet("assets") ?? getDefaultAssets(); }
export function saveAssets(items: Asset[]): void {
  localSet("assets", items);
  fsSaveAll("assets", items).catch(console.error);
}
export async function loadAssets(): Promise<Asset[]> {
  try {
    const items = await fsGetAll<Asset>("assets");
    if (items.length > 0) { localSet("assets", items); return items; }
  } catch { /* offline fallback */ }
  return getAssets();
}

// Stocks
export function getStocks(): StockHolding[] { return localGet("stocks") ?? getDefaultStocks(); }
export function saveStocks(items: StockHolding[]): void {
  localSet("stocks", items);
  fsSaveAll("stocks", items).catch(console.error);
}
export async function loadStocks(): Promise<StockHolding[]> {
  try {
    const items = await fsGetAll<StockHolding>("stocks");
    if (items.length > 0) { localSet("stocks", items); return items; }
  } catch { /* offline fallback */ }
  return getStocks();
}

// Funds
export function getFunds(): FundHolding[] { return localGet("funds") ?? getDefaultFunds(); }
export function saveFunds(items: FundHolding[]): void {
  localSet("funds", items);
  fsSaveAll("funds", items).catch(console.error);
}
export async function loadFunds(): Promise<FundHolding[]> {
  try {
    const items = await fsGetAll<FundHolding>("funds");
    if (items.length > 0) { localSet("funds", items); return items; }
  } catch { /* offline fallback */ }
  return getFunds();
}

// Goals
export function getGoals(): Goal[] { return localGet("goals") ?? getDefaultGoals(); }
export function saveGoals(items: Goal[]): void {
  localSet("goals", items);
  fsSaveAll("goals", items).catch(console.error);
}
export async function loadGoals(): Promise<Goal[]> {
  try {
    const items = await fsGetAll<Goal>("goals");
    if (items.length > 0) { localSet("goals", items); return items; }
  } catch { /* offline fallback */ }
  return getGoals();
}

// Snapshots
export function getSnapshots(): MonthlySnapshot[] { return localGet("snapshots") ?? getDefaultSnapshots(); }
export function saveSnapshots(items: MonthlySnapshot[]): void {
  localSet("snapshots", items);
  fsSaveAll("snapshots", items).catch(console.error);
}
export async function loadSnapshots(): Promise<MonthlySnapshot[]> {
  try {
    const items = await fsGetAll<MonthlySnapshot>("snapshots");
    if (items.length > 0) {
      const sorted = items.sort((a, b) => a.month.localeCompare(b.month));
      localSet("snapshots", sorted);
      return sorted;
    }
  } catch { /* offline fallback */ }
  return getSnapshots();
}

// Expenses
export function getExpenses(): MonthlyExpense[] { return localGet("expenses") ?? getDefaultExpenses(); }
export function saveExpenses(items: MonthlyExpense[]): void {
  localSet("expenses", items);
  fsSaveAll("expenses", items).catch(console.error);
}
export async function loadExpenses(): Promise<MonthlyExpense[]> {
  try {
    const items = await fsGetAll<MonthlyExpense>("expenses");
    if (items.length > 0) { localSet("expenses", items); return items; }
  } catch { /* offline fallback */ }
  return getExpenses();
}

// Income Profiles
export function getIncomeProfiles(): IncomeProfile[] { return localGet("incomeProfiles") ?? getDefaultIncomeProfiles(); }
export function saveIncomeProfiles(items: IncomeProfile[]): void {
  localSet("incomeProfiles", items);
  fsSaveAll("incomeProfiles", items).catch(console.error);
}
export async function loadIncomeProfiles(): Promise<IncomeProfile[]> {
  try {
    const items = await fsGetAll<IncomeProfile>("incomeProfiles");
    if (items.length > 0) { localSet("incomeProfiles", items); return items; }
  } catch { /* offline fallback */ }
  return getIncomeProfiles();
}

// Insurance Plans
export function getInsurancePlans(): InsurancePlan[] { return localGet("insurancePlans") ?? getDefaultInsurancePlans(); }
export function saveInsurancePlans(items: InsurancePlan[]): void {
  localSet("insurancePlans", items);
  fsSaveAll("insurancePlans", items).catch(console.error);
}
export async function loadInsurancePlans(): Promise<InsurancePlan[]> {
  try {
    const items = await fsGetAll<InsurancePlan>("insurancePlans");
    if (items.length > 0) { localSet("insurancePlans", items); return items; }
  } catch { /* offline fallback */ }
  return getInsurancePlans();
}

// Spending Records
export function getSpendingRecords(): SpendingRecord[] { return localGet("spendingRecords") ?? []; }
export function saveSpendingRecords(items: SpendingRecord[]): void {
  localSet("spendingRecords", items);
  fsSaveAll("spendingRecords", items).catch(console.error);
}
export async function loadSpendingRecords(): Promise<SpendingRecord[]> {
  try {
    const items = await fsGetAll<SpendingRecord>("spendingRecords");
    if (items.length > 0) { localSet("spendingRecords", items); return items; }
  } catch { /* offline fallback */ }
  return getSpendingRecords();
}

// Loan Plans
export function getLoanPlans(): LoanPlan[] { return localGet("loanPlans") ?? []; }
export function saveLoanPlans(items: LoanPlan[]): void {
  localSet("loanPlans", items);
  fsSaveAll("loanPlans", items).catch(console.error);
}
export async function loadLoanPlans(): Promise<LoanPlan[]> {
  try {
    const items = await fsGetAll<LoanPlan>("loanPlans");
    if (items.length > 0) { localSet("loanPlans", items); return items; }
  } catch { /* offline fallback */ }
  return getLoanPlans();
}

// Life Events
export function getLifeEvents(): LifeEvent[] { return localGet("lifeEvents") ?? []; }
export function saveLifeEvents(items: LifeEvent[]): void {
  localSet("lifeEvents", items);
  fsSaveAll("lifeEvents", items).catch(console.error);
}
export async function loadLifeEvents(): Promise<LifeEvent[]> {
  try {
    const items = await fsGetAll<LifeEvent>("lifeEvents");
    if (items.length > 0) { localSet("lifeEvents", items); return items; }
  } catch { /* offline fallback */ }
  return getLifeEvents();
}

// ── Migration: copy all data from an old anon UID to the current UID ─────────
const COLLECTION_NAMES = [
  "assets", "stocks", "funds", "goals", "snapshots", "expenses",
  "incomeProfiles", "lifeEvents", "insurancePlans", "spendingRecords", "loanPlans",
] as const;

export async function migrateFromUid(oldUid: string): Promise<void> {
  const currentUid = getUid();
  if (!oldUid || oldUid === currentUid) return;
  for (const name of COLLECTION_NAMES) {
    const oldCol = collection(db, "users", oldUid, name);
    const snap = await getDocs(oldCol);
    if (snap.docs.length === 0) continue;
    const items = snap.docs.map(d => d.data());
    // Write to current UID's collection
    const newCol = collection(db, "users", currentUid, name);
    const batch = writeBatch(db);
    const existing = await getDocs(newCol);
    existing.docs.forEach(d => batch.delete(d.ref));
    items.forEach(item => {
      const asAny = item as Record<string, unknown>;
      const docId = (asAny.id ?? asAny.month ?? crypto.randomUUID()) as string;
      batch.set(doc(newCol, docId), item);
    });
    await batch.commit();
  }
}

// CSV export
export function exportToCSV(assets: Asset[]): void {
  const header = ["カテゴリ", "資産名", "金額（円）", "メモ", "更新日時"];
  const rows = assets.map(a => [
    a.category, a.name, String(a.amount), a.note ?? "",
    new Date(a.updatedAt).toLocaleDateString("ja-JP"),
  ]);
  const csv = [header, ...rows]
    .map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `okane_assets_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Defaults ──────────────────────────────────────────────────────────────────

function getDefaultAssets(): Asset[] {
  return [
    { id: "1", name: "普通預金（メインバンク）", category: "現金・預金", amount: 1500000, updatedAt: new Date().toISOString() },
    { id: "2", name: "定期預金", category: "現金・預金", amount: 3000000, updatedAt: new Date().toISOString() },
    { id: "3", name: "個人向け国債", category: "債券", amount: 500000, updatedAt: new Date().toISOString() },
  ];
}

function getDefaultGoals(): Goal[] {
  return [
    { id: "1", title: "緊急予備費", targetAmount: 1000000, currentAmount: 800000, targetDate: "2026-12-31" },
    { id: "2", title: "住宅購入頭金", targetAmount: 5000000, currentAmount: 2000000, targetDate: "2030-03-31" },
    { id: "3", title: "老後資金（FIRE）", targetAmount: 30000000, currentAmount: 10500000, targetDate: "2045-03-31" },
  ];
}

function getDefaultSnapshots(): MonthlySnapshot[] {
  const months = ["2025-09","2025-10","2025-11","2025-12","2026-01","2026-02","2026-03","2026-04","2026-05","2026-06","2026-07","2026-08"];
  const base = 9000000;
  return months.map((month, i) => ({
    month, total: base + i * 150000,
    breakdown: {
      "現金・預金": 4500000 + i * 20000,
      "株式": 2500000 + i * 80000,
      "投資信託": 1500000 + i * 40000,
      "債券": 500000,
    },
  }));
}

function getDefaultStocks(): StockHolding[] {
  return [
    { id: "s1", ticker: "7203", name: "トヨタ自動車", accountType: "特定口座", purchasePrice: 2500, shares: 100, currentPrice: 3200, purchaseDate: "2023-04-01", updatedAt: new Date().toISOString() },
    { id: "s2", ticker: "VTI", name: "Vanguard Total Stock Market ETF", accountType: "NISA（成長投資枠）", purchasePrice: 22000, shares: 10, currentPrice: 28000, purchaseDate: "2022-10-15", updatedAt: new Date().toISOString() },
  ];
}

function getDefaultInsurancePlans(): InsurancePlan[] {
  return [
    {
      id: "ins1", name: "終身医療保険", type: "医療保険",
      premiumMonthly: 3500, startDate: "2022-04", coverageAmount: 1000000,
      updatedAt: new Date().toISOString(),
    },
  ];
}

function getDefaultExpenses(): MonthlyExpense[] {
  return [
    { id: "e1", name: "家賃", category: "住居費", amount: 80000, isFixed: true, updatedAt: new Date().toISOString() },
    { id: "e2", name: "食費・外食", category: "食費", amount: 40000, isFixed: false, updatedAt: new Date().toISOString() },
    { id: "e3", name: "水道光熱費", category: "水道光熱費", amount: 10000, isFixed: true, updatedAt: new Date().toISOString() },
    { id: "e4", name: "通信費", category: "通信費", amount: 5000, isFixed: true, updatedAt: new Date().toISOString() },
    { id: "e5", name: "娯楽費", category: "娯楽費", amount: 20000, isFixed: false, updatedAt: new Date().toISOString() },
  ];
}

function getDefaultIncomeProfiles(): IncomeProfile[] {
  return [
    { id: "i1", name: "現職", grossMonthly: 350000, prefecture: "東京", age: 30, dependents: 0, updatedAt: new Date().toISOString() },
  ];
}

function getDefaultFunds(): FundHolding[] {
  return [
    { id: "f1", name: "eMAXIS Slim 全世界株式（オール・カントリー）", accountType: "NISA（つみたて投資枠）", purchaseAmount: 1200000, currentValue: 1450000, expectedAnnualReturn: 7, monthlyContribution: 50000, startDate: "2022-01-01", updatedAt: new Date().toISOString() },
    { id: "f2", name: "SBI・全米株式インデックス・ファンド", accountType: "iDeCo", purchaseAmount: 800000, currentValue: 980000, expectedAnnualReturn: 7, monthlyContribution: 23000, startDate: "2021-06-01", updatedAt: new Date().toISOString() },
  ];
}
