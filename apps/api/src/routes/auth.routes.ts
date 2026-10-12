import { Router } from "express";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
} from "@superlink/shared";
import * as authController from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { authLimiter } from "../middleware/rateLimit.js";
import { validateBody } from "../middleware/validate.js";

export const authRoutes: Router = Router();

authRoutes.post("/login", authLimiter, validateBody(loginSchema), authController.login);
authRoutes.post("/refresh", authController.refresh);
authRoutes.post("/logout", authController.logout);
authRoutes.post("/logout-all", authenticate, authController.logoutAll);
authRoutes.get("/me", authenticate, authController.me);
authRoutes.post(
  "/forgot-password",
  authLimiter,
  validateBody(forgotPasswordSchema),
  authController.forgotPassword,
);
authRoutes.post(
  "/reset-password",
  authLimiter,
  validateBody(resetPasswordSchema),
  authController.resetPassword,
);
