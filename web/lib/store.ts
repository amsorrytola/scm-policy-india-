import { create } from "zustand";

export interface SCMResult {
  case_meta: {
    treated_unit: string;
    donor_pool: string[];
    predictors: string[];
    outcome: string;
    treatment_date: string;
  };
  dates: string[];
  treated_outcome: number[];
  synthetic_outcome: number[];
  gap: number[];
  weights: Record<string, number>;
  diagnostics: {
    pre_rmspe: number;
    post_rmspe: number;
    rmspe_ratio: number;
    avg_post_effect: number;
    n_pre: number;
    n_post: number;
    n_donors: number;
  };
  placebo_gaps?: Record<string, (number | null)[]>;
  placebo_rmspe_ratios?: Record<string, number | null>;
}

export interface BSTSResult {
  case_meta: {
    treated_unit: string;
    donor_pool: string[];
    outcome: string;
    treatment_date: string;
    method: string;
  };
  dates: string[];
  observed: (number | null)[];
  predicted_mean: (number | null)[];
  predicted_lower: (number | null)[];
  predicted_upper: (number | null)[];
  point_effect: (number | null)[];
  point_effect_lower: (number | null)[];
  point_effect_upper: (number | null)[];
  cumulative_effect: (number | null)[];
  summary_text: string;
  p_value: number | null;
  pre_period_idx: [number, number];
  post_period_idx: [number, number];
}

export interface CaseMetadata {
  case_id: string;
  title: string;
  description: string;
  treatment_date: string;
  treated_unit: string;
  default_donors: string[];
  all_donors: string[];
  default_predictors: string[];
  available_predictors: string[];
  primary_outcome: string;
  secondary_outcome: string;
  available_outcomes: string[];
  outcome_labels: Record<string, string>;
  pre_period_start: string;
  pre_period_end: string;
  post_period_end: string;
  source_note: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
}

interface AppState {
  // Data
  scmResult: SCMResult | null;
  bstsResult: BSTSResult | null;
  scmTaxResult: SCMResult | null;
  bstsTaxResult: BSTSResult | null;
  caseMetadata: CaseMetadata | null;

  // UI
  activeOutcome: "primary" | "tax";
  activeMethod: "scm" | "bsts" | "both";
  showPlacebos: boolean;
  selectedDonors: string[];
  selectedPredictors: string[];
  isRefitting: boolean;
  chatHistory: ChatMessage[];

  // Actions
  setSCMResult: (r: SCMResult) => void;
  setBSTSResult: (r: BSTSResult | null) => void;
  setSCMTaxResult: (r: SCMResult) => void;
  setBSTSTaxResult: (r: BSTSResult | null) => void;
  setCaseMetadata: (m: CaseMetadata) => void;
  setActiveOutcome: (o: "primary" | "tax") => void;
  setActiveMethod: (m: "scm" | "bsts" | "both") => void;
  setShowPlacebos: (v: boolean) => void;
  setSelectedDonors: (d: string[]) => void;
  setSelectedPredictors: (p: string[]) => void;
  setIsRefitting: (v: boolean) => void;
  addMessage: (msg: ChatMessage) => void;
  clearChat: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  scmResult: null,
  bstsResult: null,
  scmTaxResult: null,
  bstsTaxResult: null,
  caseMetadata: null,
  activeOutcome: "primary",
  activeMethod: "scm",
  showPlacebos: false,
  selectedDonors: [],
  selectedPredictors: [
    "nsdp_pc_current_inr",
    "urban_share_pct",
    "literacy_rate_pct",
  ],
  isRefitting: false,
  chatHistory: [],

  setSCMResult: (r) => set({ scmResult: r }),
  setBSTSResult: (r) => set({ bstsResult: r }),
  setSCMTaxResult: (r) => set({ scmTaxResult: r }),
  setBSTSTaxResult: (r) => set({ bstsTaxResult: r }),
  setCaseMetadata: (m) =>
    set({ caseMetadata: m, selectedDonors: m.default_donors }),
  setActiveOutcome: (o) => set({ activeOutcome: o }),
  setActiveMethod: (m) => set({ activeMethod: m }),
  setShowPlacebos: (v) => set({ showPlacebos: v }),
  setSelectedDonors: (d) => set({ selectedDonors: d }),
  setSelectedPredictors: (p) => set({ selectedPredictors: p }),
  setIsRefitting: (v) => set({ isRefitting: v }),
  addMessage: (msg) =>
    set((s) => ({ chatHistory: [...s.chatHistory, msg] })),
  clearChat: () => set({ chatHistory: [] }),
}));
