import { Router } from "express";
import { leadCreateSchema } from "@superlink/shared";
import * as leadController from "../controllers/lead.controller.js";
import { authLimiter } from "../middleware/rateLimit.js";
import { validateBody } from "../middleware/validate.js";

/** Public marketing endpoint - a prospective community owner requests a demo. */
export const leadRoutes: Router = Router();

leadRoutes.post("/", authLimiter, validateBody(leadCreateSchema), leadController.submit);
