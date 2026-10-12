export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export const ACCESS_TOKEN_TTL = "15m";
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

export const API_PREFIX = "/api/v1";

export const INVITATION_TTL_DAYS = 7;

export interface OnboardingStep {
  key: string;
  label: string;
}

export const ONBOARDING_STEPS: readonly OnboardingStep[] = [
  { key: "community", label: "Community profile" },
  { key: "buildings", label: "Add buildings" },
  { key: "floors", label: "Add floors" },
  { key: "flats", label: "Add flats" },
  { key: "residents", label: "Invite residents" },
  { key: "staff", label: "Add staff" },
  { key: "billing", label: "Configure billing" },
  { key: "done", label: "Finish" },
] as const;
