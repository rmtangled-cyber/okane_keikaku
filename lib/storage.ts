"use client";

import {
  collection, doc, getDocs, writeBatch, setDoc, getDoc, deleteDoc,
} from "firebase/firestore";
import { db, auth } from "./firebase";
import { Asset, Goal, MonthlySnapshot, StockHolding, FundHolding, MonthlyExpense, IncomeProfile, LifeEvent, InsurancePlan, SpendingRecord, LoanPlan, MortgageSimPlan, MortgageProperty, UserProfile, PropertyTaxEntry, SavingsAccount } from "./types";

// ── Viewer mode state ─────────────────────────────────────────────────────────

let _viewerOwnerUid: string | null = null;

export function setViewerOwnerUid(uid: string | null) { _viewerOwnerUid = uid; }
export function isViewerMode(): boolean { return _viewerOwnerUid !== null; }
function currentDataUid(): string { return _viewerOwnerUid ?? auth.currentUser?.uid ?? "no-user"; }

// ── Firestore helpers ─────────────────────────────────────────────────────────

// Firestore rejects undefined field values — strip them before writing
function stripUndefined<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function userCol(name: string) {
  const uid = currentDataUid();
  if (uid === "no-user") console.warn(`[storage] userCol("${name}"): no user`);
  return collection(db, "users", uid, name);
}

async function fsGetAll<T>(name: string): Promise<T[]> {
  const uid = currentDataUid();
  console.log(`[storage] fsGetAll("${name}") uid=${uid}`);
  const snap = await getDocs(userCol(name));
  console.log(`[storage] fsGetAll("${name}") → ${snap.docs.length} docs`);
  return snap.docs.map(d => d.data() as T);
}

async function fsSaveAll<T extends { id?: string; month?: string }>(name: string, items: T[]): Promise<void> {
  if (isViewerMode()) return;
  const col = userCol(name);
  const batch = writeBatch(db);
  const snap = await getDocs(col);
  snap.docs.forEach(d => batch.delete(d.ref));
  items.forEach(item => {
    const docId = item.id ?? item.month ?? crypto.randomUUID();
    batch.set(doc(col, docId), stripUndefined(item));
  });
  await batch.commit();
}

// ── Public API ────────────────────────────────────────────────────────────────
// getXxx()    → 空配列を返す（同期・即時）
// loadXxx()   → Firestoreから取得（非同期）
// saveXxx()   → Firestoreに保存

// Assets
export function getAssets(): Asset[] { return []; }
export function saveAssets(items: Asset[]): void {
  fsSaveAll("assets", items).catch(console.error);
}
export async function loadAssets(): Promise<Asset[]> {
  try { return await fsGetAll<Asset>("assets"); } catch { return []; }
}

// Stocks
export function getStocks(): StockHolding[] { return []; }
export function saveStocks(items: StockHolding[]): void {
  fsSaveAll("stocks", items).catch(console.error);
}
export async function loadStocks(): Promise<StockHolding[]> {
  try { return await fsGetAll<StockHolding>("stocks"); } catch { return []; }
}

// Funds
export function getFunds(): FundHolding[] { return []; }
export function saveFunds(items: FundHolding[]): void {
  fsSaveAll("funds", items).catch(console.error);
}
export async function loadFunds(): Promise<FundHolding[]> {
  try { return await fsGetAll<FundHolding>("funds"); } catch { return []; }
}

// Savings Accounts
export function getSavingsAccounts(): SavingsAccount[] { return []; }
export function saveSavingsAccounts(items: SavingsAccount[]): void {
  fsSaveAll("savings", items).catch(console.error);
}
export async function loadSavingsAccounts(): Promise<SavingsAccount[]> {
  try { return await fsGetAll<SavingsAccount>("savings"); } catch { return []; }
}

// Goals
export function getGoals(): Goal[] { return []; }
export function saveGoals(items: Goal[]): void {
  fsSaveAll("goals", items).catch(console.error);
}
export async function loadGoals(): Promise<Goal[]> {
  try { return await fsGetAll<Goal>("goals"); } catch { return []; }
}

// Snapshots
export function getSnapshots(): MonthlySnapshot[] { return []; }
export function saveSnapshots(items: MonthlySnapshot[]): void {
  fsSaveAll("snapshots", items).catch(console.error);
}
export async function loadSnapshots(): Promise<MonthlySnapshot[]> {
  try {
    const items = await fsGetAll<MonthlySnapshot>("snapshots");
    return items.sort((a, b) => a.month.localeCompare(b.month));
  } catch { return []; }
}

// Expenses
export function getExpenses(): MonthlyExpense[] { return []; }
export function saveExpenses(items: MonthlyExpense[]): void {
  fsSaveAll("expenses", items).catch(console.error);
}
export async function loadExpenses(): Promise<MonthlyExpense[]> {
  try { return await fsGetAll<MonthlyExpense>("expenses"); } catch { return []; }
}

// Income Profiles
const LS_INCOME_KEY = "okane_incomeProfiles_v2";
function lsLoadIncome(): IncomeProfile[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(LS_INCOME_KEY) ?? "[]"); } catch { return []; }
}
function lsSaveIncome(items: IncomeProfile[]) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(LS_INCOME_KEY, JSON.stringify(items)); } catch { /* quota */ }
}
export function getIncomeProfiles(): IncomeProfile[] { return []; }
export function saveIncomeProfiles(items: IncomeProfile[]): void {
  fsSaveAll("incomeProfiles", items).catch(console.error);
  lsSaveIncome(items);
}
export async function loadIncomeProfiles(): Promise<IncomeProfile[]> {
  try {
    const items = await fsGetAll<IncomeProfile>("incomeProfiles");
    if (items.length > 0) { lsSaveIncome(items); return items; }
    console.log("[storage] loadIncomeProfiles: Firestore empty, fallback to localStorage");
  } catch (e) {
    console.error("[storage] loadIncomeProfiles: Firestore error, fallback to localStorage", e);
  }
  const ls = lsLoadIncome();
  console.log(`[storage] loadIncomeProfiles: localStorage has ${ls.length} items`);
  return ls;
}
export async function upsertIncomeProfile(profile: IncomeProfile): Promise<void> {
  if (isViewerMode()) return;
  const uid = currentDataUid();
  console.log(`[storage] upsertIncomeProfile id=${profile.id} uid=${uid}`);
  await setDoc(doc(userCol("incomeProfiles"), profile.id), stripUndefined(profile));
  console.log("[storage] upsertIncomeProfile: setDoc done");
  const current = lsLoadIncome();
  const idx = current.findIndex(p => p.id === profile.id);
  if (idx >= 0) current[idx] = profile; else current.push(profile);
  lsSaveIncome(current);
}
export async function deleteIncomeProfileById(id: string): Promise<void> {
  if (isViewerMode()) return;
  await deleteDoc(doc(userCol("incomeProfiles"), id));
  lsSaveIncome(lsLoadIncome().filter(p => p.id !== id));
}

// Insurance Plans
export function getInsurancePlans(): InsurancePlan[] { return []; }
export function saveInsurancePlans(items: InsurancePlan[]): void {
  fsSaveAll("insurancePlans", items).catch(console.error);
}
export async function loadInsurancePlans(): Promise<InsurancePlan[]> {
  try { return await fsGetAll<InsurancePlan>("insurancePlans"); } catch { return []; }
}

// Spending Records
export function getSpendingRecords(): SpendingRecord[] { return []; }
export function saveSpendingRecords(items: SpendingRecord[]): void {
  fsSaveAll("spendingRecords", items).catch(console.error);
}
export async function loadSpendingRecords(): Promise<SpendingRecord[]> {
  try { return await fsGetAll<SpendingRecord>("spendingRecords"); } catch { return []; }
}

// Loan Plans
export function getLoanPlans(): LoanPlan[] { return []; }
export function saveLoanPlans(items: LoanPlan[]): void {
  fsSaveAll("loanPlans", items).catch(console.error);
}
export async function loadLoanPlans(): Promise<LoanPlan[]> {
  try { return await fsGetAll<LoanPlan>("loanPlans"); } catch { return []; }
}

// Life Events
export function getLifeEvents(): LifeEvent[] { return []; }
export function saveLifeEvents(items: LifeEvent[]): void {
  fsSaveAll("lifeEvents", items).catch(console.error);
}
export async function loadLifeEvents(): Promise<LifeEvent[]> {
  try { return await fsGetAll<LifeEvent>("lifeEvents"); } catch { return []; }
}

// Property Tax Entries
export function savePropertyTaxEntries(items: PropertyTaxEntry[]): void {
  fsSaveAll("propertyTaxEntries", items).catch(console.error);
}
export async function loadPropertyTaxEntries(): Promise<PropertyTaxEntry[]> {
  try { return await fsGetAll<PropertyTaxEntry>("propertyTaxEntries"); } catch { return []; }
}

// Mortgage Simulation Plan (single doc per user)
export async function saveMortgageSimPlan(plan: MortgageSimPlan): Promise<void> {
  if (isViewerMode()) return;
  const ref = doc(db, "users", currentDataUid(), "mortgageSimPlan", "default");
  await setDoc(ref, stripUndefined(plan));
}
export async function loadMortgageSimPlan(): Promise<MortgageSimPlan | null> {
  try {
    const ref = doc(db, "users", currentDataUid(), "mortgageSimPlan", "default");
    const snap = await getDoc(ref);
    return snap.exists() ? (snap.data() as MortgageSimPlan) : null;
  } catch { return null; }
}

// Mortgage Property Info (single doc per user — kept for migration reads)
export async function saveMortgageProperty(prop: MortgageProperty): Promise<void> {
  if (isViewerMode()) return;
  const ref = doc(db, "users", currentDataUid(), "mortgageProperty", "default");
  await setDoc(ref, stripUndefined(prop));
}
export async function loadMortgageProperty(): Promise<MortgageProperty | null> {
  try {
    const ref = doc(db, "users", currentDataUid(), "mortgageProperty", "default");
    const snap = await getDoc(ref);
    return snap.exists() ? (snap.data() as MortgageProperty) : null;
  } catch { return null; }
}

// Mortgage Properties (collection — supports multiple properties)
export function saveMortgageProperties(items: MortgageProperty[]): void {
  fsSaveAll("mortgageProperties", items).catch(console.error);
}
export async function loadMortgageProperties(): Promise<MortgageProperty[]> {
  try { return await fsGetAll<MortgageProperty>("mortgageProperties"); } catch { return []; }
}

// User Profile (single doc per user)
export async function saveUserProfile(profile: UserProfile): Promise<void> {
  if (isViewerMode()) return;
  const ref = doc(db, "users", currentDataUid(), "userProfile", "default");
  await setDoc(ref, stripUndefined(profile));
}
export async function loadUserProfile(): Promise<UserProfile | null> {
  try {
    const ref = doc(db, "users", currentDataUid(), "userProfile", "default");
    const snap = await getDoc(ref);
    return snap.exists() ? (snap.data() as UserProfile) : null;
  } catch { return null; }
}

// ── Viewer management ─────────────────────────────────────────────────────────

export async function lookupOwnerByViewerEmail(email: string): Promise<string | null> {
  try {
    const snap = await getDoc(doc(db, "viewerIndex", email));
    return snap.exists() ? (snap.data() as { ownerUid: string }).ownerUid : null;
  } catch { return null; }
}

export async function loadViewerEmails(): Promise<string[]> {
  const ownerUid = auth.currentUser?.uid;
  if (!ownerUid) return [];
  try {
    const snap = await getDoc(doc(db, "users", ownerUid, "viewerEmails", "default"));
    return snap.exists() ? ((snap.data() as { emails: string[] }).emails ?? []) : [];
  } catch { return []; }
}

export async function addViewerEmail(viewerEmail: string): Promise<void> {
  const ownerUid = auth.currentUser?.uid;
  if (!ownerUid || isViewerMode()) return;
  const emailsRef = doc(db, "users", ownerUid, "viewerEmails", "default");
  const snap = await getDoc(emailsRef);
  const current: string[] = snap.exists() ? ((snap.data() as { emails: string[] }).emails ?? []) : [];
  if (!current.includes(viewerEmail)) {
    await setDoc(emailsRef, { emails: [...current, viewerEmail] });
  }
  await setDoc(doc(db, "viewerIndex", viewerEmail), { ownerUid });
}

export async function removeViewerEmail(viewerEmail: string): Promise<void> {
  const ownerUid = auth.currentUser?.uid;
  if (!ownerUid || isViewerMode()) return;
  const emailsRef = doc(db, "users", ownerUid, "viewerEmails", "default");
  const snap = await getDoc(emailsRef);
  const current: string[] = snap.exists() ? ((snap.data() as { emails: string[] }).emails ?? []) : [];
  await setDoc(emailsRef, { emails: current.filter(e => e !== viewerEmail) });
  await deleteDoc(doc(db, "viewerIndex", viewerEmail));
}

export async function loadOwnerDisplayName(ownerUid: string): Promise<string | null> {
  try {
    const snap = await getDoc(doc(db, "users", ownerUid, "userProfile", "default"));
    return snap.exists() ? ((snap.data() as { displayName?: string }).displayName ?? null) : null;
  } catch { return null; }
}

// ── Clear all data for current user ──────────────────────────────────────────

const COLLECTION_NAMES = [
  "assets", "stocks", "funds", "goals", "snapshots", "expenses",
  "incomeProfiles", "lifeEvents", "insurancePlans", "spendingRecords", "loanPlans",
  "mortgageSimPlan",
] as const;

export async function clearAllUserData(): Promise<void> {
  for (const name of COLLECTION_NAMES) {
    const col = userCol(name);
    const snap = await getDocs(col);
    if (snap.docs.length === 0) continue;
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
  // Also wipe any leftover localStorage keys from the old architecture
  if (typeof window !== "undefined") {
    const oldKeys = [
      "okane_assets", "okane_goals", "okane_snapshots", "okane_stocks",
      "okane_funds", "okane_expenses", "okane_incomeProfiles", "okane_lifeEvents",
      "okane_insurancePlans", "okane_spending", "okane_loans", "okane_uid",
    ];
    oldKeys.forEach(k => localStorage.removeItem(k));
  }
}

// ── CSV export ────────────────────────────────────────────────────────────────

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
