import express, { type Express } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { API_PREFIX } from "@superlink/shared";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./errors/handler.js";
import { requestContext } from "./middleware/requestContext.js";
import { globalLimiter } from "./middleware/rateLimit.js";
import { authRoutes } from "./routes/auth.routes.js";
import { structureRoutes } from "./routes/structure.routes.js";
import { residentRoutes } from "./routes/resident.routes.js";
import { invitationRoutes, publicInvitationRoutes } from "./routes/invitation.routes.js";
import { onboardingRoutes } from "./routes/onboarding.routes.js";
import { notificationRoutes } from "./routes/notification.routes.js";
import { dashboardRoutes } from "./routes/dashboard.routes.js";
import { publicVisitorRoutes, visitorRoutes } from "./routes/visitor.routes.js";
import { complaintRoutes } from "./routes/complaint.routes.js";
import { staffRoutes } from "./routes/staff.routes.js";
import { billingRoutes } from "./routes/billing.routes.js";
import { paymentRoutes } from "./routes/payment.routes.js";
import { expenseRoutes } from "./routes/expense.routes.js";
import { amenityRoutes } from "./routes/amenity.routes.js";
import { bookingRoutes } from "./routes/booking.routes.js";
import { vehicleRoutes } from "./routes/vehicle.routes.js";
import { parkingRoutes } from "./routes/parking.routes.js";
import { announcementRoutes } from "./routes/announcement.routes.js";
import { feedRoutes } from "./routes/feed.routes.js";
import { emergencyRoutes } from "./routes/emergency.routes.js";
import { handoverRoutes, reportRoutes } from "./routes/report.routes.js";
import { aiRoutes } from "./routes/ai.routes.js";
import { platformRoutes } from "./routes/platform.routes.js";
import { leadRoutes } from "./routes/lead.routes.js";
import { ok } from "./utils/respond.js";
import { prisma } from "./config/prisma.js";

export interface CreateAppOptions {
  /** Test-only: mount probe routes before the 404 handler. */
  setup?: (app: Express) => void;
}

export function createApp(options: CreateAppOptions = {}): Express {
  const app = express();

  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: "256kb" }));
  app.use(cookieParser());
  app.use(requestContext);

  app.get("/health", (_req, res) => {
    ok(res, { status: "ok", service: "superlink-api" });
  });

  app.get("/health/live", (_req, res) => {
    ok(res, { status: "ok" });
  });

  app.get("/health/ready", async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      ok(res, { status: "ok", db: "ok" });
    } catch {
      res.status(503).json({ success: false, error: { code: "NOT_READY", message: "Database unavailable." } });
    }
  });

  app.use(globalLimiter);

  app.use(`${API_PREFIX}/auth`, authRoutes);
  app.use(`${API_PREFIX}/leads`, leadRoutes);
  app.use(`${API_PREFIX}/invitations`, publicInvitationRoutes);
  app.use(`${API_PREFIX}/structure`, structureRoutes);
  app.use(`${API_PREFIX}/residents`, residentRoutes);
  app.use(`${API_PREFIX}/invitations`, invitationRoutes);
  app.use(`${API_PREFIX}/onboarding`, onboardingRoutes);
  app.use(`${API_PREFIX}/notifications`, notificationRoutes);
  app.use(`${API_PREFIX}/dashboard`, dashboardRoutes);
  app.use(`${API_PREFIX}/visitors`, publicVisitorRoutes);
  app.use(`${API_PREFIX}/visitors`, visitorRoutes);
  app.use(`${API_PREFIX}/complaints`, complaintRoutes);
  app.use(`${API_PREFIX}/staff`, staffRoutes);
  app.use(`${API_PREFIX}/billing`, billingRoutes);
  app.use(`${API_PREFIX}/payments`, paymentRoutes);
  app.use(`${API_PREFIX}/expenses`, expenseRoutes);
  app.use(`${API_PREFIX}/amenities`, amenityRoutes);
  app.use(`${API_PREFIX}/bookings`, bookingRoutes);
  app.use(`${API_PREFIX}/vehicles`, vehicleRoutes);
  app.use(`${API_PREFIX}/parking`, parkingRoutes);
  app.use(`${API_PREFIX}/announcements`, announcementRoutes);
  app.use(`${API_PREFIX}/feed`, feedRoutes);
  app.use(`${API_PREFIX}/emergency`, emergencyRoutes);
  app.use(`${API_PREFIX}/reports`, reportRoutes);
  app.use(`${API_PREFIX}/handover`, handoverRoutes);
  app.use(`${API_PREFIX}/ai`, aiRoutes);
  app.use(`${API_PREFIX}/platform`, platformRoutes);

  options.setup?.(app);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
