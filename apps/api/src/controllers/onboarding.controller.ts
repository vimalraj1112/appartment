import type { Request, Response } from "express";
import * as onboarding from "../services/onboarding.service.js";
import { ok } from "../utils/respond.js";

export async function getOnboarding(_req: Request, res: Response): Promise<void> {
  ok(res, await onboarding.getOnboarding());
}

export async function setOnboardingStep(req: Request, res: Response): Promise<void> {
  const { step } = req.body as { step: number };
  ok(res, await onboarding.setOnboardingStep(step));
}
