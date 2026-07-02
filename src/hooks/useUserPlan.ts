import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PlanType = "starter" | "pro" | "pro_plus" | "free" | "business";

interface UserPlan {
  plan_type: PlanType;
  plan_name: string;
  is_active: boolean;
  status?: "active" | "trialing" | "expired" | string;
  billing_period?: string | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
  trial_days_remaining?: number;
  max_banks: number;
  max_goals: number;
  max_reminders: number;
  whatsapp_enabled: boolean;
  reports_enabled: boolean;
  cashflow_projection_enabled: boolean;
  export_enabled: boolean;
  split_enabled: boolean;
  business_profile_enabled: boolean;
  advanced_dashboard_enabled: boolean;
  annual_projection_enabled: boolean;
  history_months: number;
  monthly_planning_enabled: boolean;
  ai_enabled: boolean;
  import_enabled: boolean;
}

interface PlanUsage {
  banks_count: number;
  goals_count: number;
  reminders_count: number;
}

const DEFAULT_PLAN: UserPlan = {
  plan_type: "starter",
  plan_name: "Starter",
  is_active: true,
  status: "trialing",
  billing_period: "trial",
  current_period_start: null,
  current_period_end: null,
  trial_days_remaining: 0,
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

const ADMIN_PLAN: UserPlan = {
  plan_type: "business",
  plan_name: "Admin",
  is_active: true,
  max_banks: 999,
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

// Cache for plan data to avoid redundant fetches
let planCache: { userId: string; plan: UserPlan; usage: PlanUsage; isAdmin: boolean; timestamp: number } | null = null;
const CACHE_TTL = 60000; // 1 minute

// Normalize legacy or specific plan types to ensure compatibility
function normalizePlanType(type: string): PlanType {
  const t = type?.toLowerCase();
  if (t === "free" || t === "starter") return "starter";
  if (t === "business" || t === "pro_plus") return "business";
  return t as PlanType;
}

export function useUserPlan() {
  const [plan, setPlan] = useState<UserPlan>(DEFAULT_PLAN);
  const [usage, setUsage] = useState<PlanUsage>({ banks_count: 0, goals_count: 0, reminders_count: 0 });
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const loadPlan = useCallback(async (forceRefresh = false) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Check cache first
      if (!forceRefresh && planCache && planCache.userId === user.id && Date.now() - planCache.timestamp < CACHE_TTL) {
        setPlan(planCache.plan);
        setUsage(planCache.usage);
        setIsAdmin(planCache.isAdmin);
        setLoading(false);
        return;
      }

      // Check if user is admin
      const { data: adminCheck } = await supabase
        .rpc("has_role", { _user_id: user.id, _role: "admin" });

      if (adminCheck === true) {
        setIsAdmin(true);
        setPlan(ADMIN_PLAN);
        setUsage({ banks_count: 0, goals_count: 0, reminders_count: 0 });
        planCache = { userId: user.id, plan: ADMIN_PLAN, usage: { banks_count: 0, goals_count: 0, reminders_count: 0 }, isAdmin: true, timestamp: Date.now() };
        setLoading(false);
        return;
      }

      // Get user plan, usage and block status in parallel
      const [planResult, profileResult, banksResult, goalsResult, remindersResult] = await Promise.all([
        supabase.rpc("get_user_plan", { p_user_id: user.id }),
        supabase.from("profiles").select("is_blocked").eq("id", user.id).maybeSingle(),
        supabase.from("banks").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("custom_goals").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("reminders").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      ]);

      if (profileResult.data?.is_blocked) {
        // Force logout or redirect if blocked
        await supabase.auth.signOut();
        window.location.href = "/auth?blocked=true";
        return;
      }

      let userPlan = DEFAULT_PLAN;
      if (!planResult.error && planResult.data && planResult.data.length > 0) {
        const raw = planResult.data[0] as any;
        userPlan = {
          ...raw,
          plan_type: normalizePlanType(raw.plan_type),
          status: raw.status || "active",
          billing_period: raw.billing_period || null,
          current_period_start: raw.current_period_start || null,
          current_period_end: raw.current_period_end || null,
          trial_days_remaining: Number(raw.trial_days_remaining || 0),
          // Ensure new fields have defaults if not returned
          cashflow_projection_enabled: raw.cashflow_projection_enabled ?? (raw.plan_type !== "starter" && raw.plan_type !== "free"),
          export_enabled: raw.export_enabled ?? (raw.plan_type !== "starter" && raw.plan_type !== "free"),
          split_enabled: raw.split_enabled ?? (raw.plan_type !== "starter" && raw.plan_type !== "free"),
          business_profile_enabled: raw.business_profile_enabled ?? (raw.plan_type === "business" || raw.plan_type === "pro_plus"),
          advanced_dashboard_enabled: raw.advanced_dashboard_enabled ?? (raw.plan_type !== "starter" && raw.plan_type !== "free"),
          annual_projection_enabled: raw.annual_projection_enabled ?? (raw.plan_type === "business" || raw.plan_type === "pro_plus"),
          history_months: raw.history_months ?? (raw.plan_type === "starter" ? 3 : raw.plan_type === "pro" ? 12 : 9999),
          monthly_planning_enabled: raw.monthly_planning_enabled ?? (raw.plan_type !== "starter" && raw.plan_type !== "free"),
          ai_enabled: raw.ai_enabled ?? (raw.plan_type !== "starter" && raw.plan_type !== "free"),
          import_enabled: raw.import_enabled ?? (raw.plan_type !== "starter" && raw.plan_type !== "free"),
        };
      }

      const userUsage = {
        banks_count: banksResult.count || 0,
        goals_count: goalsResult.count || 0,
        reminders_count: remindersResult.count || 0,
      };

      setPlan(userPlan);
      setUsage(userUsage);
      setIsAdmin(false);
      
      // Update cache
      planCache = { userId: user.id, plan: userPlan, usage: userUsage, isAdmin: false, timestamp: Date.now() };
    } catch (error) {
      console.error("Error loading plan:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  // Permission checks
  const hasActivePlan = useMemo(() => isAdmin || plan.is_active !== false, [isAdmin, plan.is_active]);

  const canAddGoal = useCallback(() => {
    if (!hasActivePlan) return false;
    if (isAdmin || plan.max_goals >= 999) return true;
    return usage.goals_count < plan.max_goals;
  }, [hasActivePlan, isAdmin, plan.max_goals, usage.goals_count]);

  const canUseReports = useCallback(() => {
    return hasActivePlan && (isAdmin || plan.reports_enabled);
  }, [hasActivePlan, isAdmin, plan.reports_enabled]);

  const canUseCashflowProjection = useCallback(() => {
    return hasActivePlan && (isAdmin || plan.cashflow_projection_enabled);
  }, [hasActivePlan, isAdmin, plan.cashflow_projection_enabled]);

  const canExportData = useCallback(() => {
    return hasActivePlan && (isAdmin || plan.export_enabled);
  }, [hasActivePlan, isAdmin, plan.export_enabled]);

  const canUseSplit = useCallback(() => {
    return hasActivePlan && (isAdmin || plan.split_enabled);
  }, [hasActivePlan, isAdmin, plan.split_enabled]);

  const canUseBusinessProfile = useCallback(() => {
    return hasActivePlan && (isAdmin || plan.business_profile_enabled);
  }, [hasActivePlan, isAdmin, plan.business_profile_enabled]);

  const canUseAdvancedDashboard = useCallback(() => {
    return hasActivePlan && (isAdmin || plan.advanced_dashboard_enabled);
  }, [hasActivePlan, isAdmin, plan.advanced_dashboard_enabled]);

  const canUseAnnualProjection = useCallback(() => {
    return hasActivePlan && (isAdmin || plan.annual_projection_enabled);
  }, [hasActivePlan, isAdmin, plan.annual_projection_enabled]);

  const canUseMonthlyPlanning = useCallback(() => {
    return hasActivePlan && (isAdmin || plan.monthly_planning_enabled);
  }, [hasActivePlan, isAdmin, plan.monthly_planning_enabled]);

  const canUseWhatsApp = useCallback(() => {
    return hasActivePlan && (isAdmin || plan.whatsapp_enabled);
  }, [hasActivePlan, isAdmin, plan.whatsapp_enabled]);

  const canUseAI = useCallback(() => {
    return hasActivePlan && (isAdmin || plan.ai_enabled);
  }, [hasActivePlan, isAdmin, plan.ai_enabled]);

  const canImportData = useCallback(() => {
    return hasActivePlan && (isAdmin || plan.import_enabled);
  }, [hasActivePlan, isAdmin, plan.import_enabled]);

  const canUseMultipleGoals = useCallback(() => {
    return hasActivePlan && (isAdmin || plan.max_goals > 1);
  }, [hasActivePlan, isAdmin, plan.max_goals]);

  // History months limit
  const historyMonths = useMemo(() => {
    if (isAdmin) return 9999;
    return plan.history_months;
  }, [isAdmin, plan.history_months]);

  // Get the required plan name for upgrade prompts
  const getRequiredPlanFor = useCallback((feature: string): "pro" | "business" => {
    const businessFeatures = ["business_profile", "advanced_dashboard", "annual_projection", "pf_pj"];
    if (businessFeatures.includes(feature)) return "business";
    return "pro";
  }, []);

  const refetch = useCallback(() => loadPlan(true), [loadPlan]);

  // Helpers for limits
  const canAddBank = useCallback(() => hasActivePlan, [hasActivePlan]);
  const canAddReminder = useCallback(() => {
    if (!hasActivePlan) return false;
    if (isAdmin || plan.max_reminders >= 999) return true;
    return usage.reminders_count < plan.max_reminders;
  }, [hasActivePlan, isAdmin, plan.max_reminders, usage.reminders_count]);
  const getRemainingBanks = useCallback(() => (hasActivePlan ? "Ilimitado" : 0) as string | number, [hasActivePlan]);
  const getRemainingGoals = useCallback(() => {
    if (!hasActivePlan) return 0 as string | number;
    if (isAdmin || plan.max_goals >= 999) return "Ilimitado" as string | number;
    return Math.max(0, plan.max_goals - usage.goals_count) as string | number;
  }, [hasActivePlan, isAdmin, plan.max_goals, usage.goals_count]);
  const getRemainingReminders = useCallback(() => {
    if (!hasActivePlan) return 0 as string | number;
    if (isAdmin || plan.max_reminders >= 999) return "Ilimitado" as string | number;
    return Math.max(0, plan.max_reminders - usage.reminders_count) as string | number;
  }, [hasActivePlan, isAdmin, plan.max_reminders, usage.reminders_count]);

  return {
    plan,
    usage,
    loading,
    isAdmin,
    refetch,
    canAddBank,
    canAddGoal,
    canAddReminder,
    canUseReports,
    canUseCashflowProjection,
    canExportData,
    canUseSplit,
    canUseBusinessProfile,
    canUseAdvancedDashboard,
    getRemainingBanks,
    getRemainingGoals,
    getRemainingReminders,
    canUseAnnualProjection,
    canUseMonthlyPlanning,
    canUseWhatsApp,
    canUseAI,
    canImportData,
    canUseMultipleGoals,
    historyMonths,
    getRequiredPlanFor,
  };
}
