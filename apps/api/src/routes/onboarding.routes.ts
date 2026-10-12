import { Router } from "express";
import { z } from "zod";
import * as onboardingController from "../controllers/onboarding.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { requirePermission } from "../middleware/rbac.js";
import { validateBody } from "../middleware/validate.js";

const stepSchema = z.object({ step: z.coerce.number().int().min(0).max(20) });

export const onboardingRoutes: Router = Router();

onboardingRoutes.use(authenticate);
onboardingRoutes.use(requirePermission("STRUCTURE_MANAGE"));

onboardingRoutes.get("/", onboardingController.getOnboarding);
onboardingRoutes.patch("/", validateBody(stepSchema), onboardingController.setOnboardingStep);
