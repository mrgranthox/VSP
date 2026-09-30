import fs from "node:fs";
import path from "node:path";

import { Router, type Request, type Response } from "express";

import { setReadinessState } from "../lib/metrics";
import { runApiReadinessChecks } from "../lib/readiness";
import { success } from "../lib/response";
import { adminRoutes, adminPlatformRoutes } from "../modules/admin/admin.routes";
import { analyticsRoutes } from "../modules/analytics/analytics.routes";
import { authRoutes } from "../modules/auth/auth.routes";
import { billingRoutes } from "../modules/billing/billing.routes";
import { bookingsRoutes } from "../modules/bookings/bookings.routes";
import { chatRoutes } from "../modules/chat/chat.routes";
import { mediaRoutes } from "../modules/media/media.routes";
import "../modules/moderation/moderation.events";
import { notificationsRoutes } from "../modules/notifications/notifications.routes";
import { observabilityRoutes } from "../modules/observability/observability.routes";
import { serviceRequestsRoutes } from "../modules/requests/requests.routes";
import { reviewsRoutes } from "../modules/reviews/reviews.routes";
import { searchRoutes } from "../modules/search/search.routes";
import { socialRoutes } from "../modules/social/social.routes";
import { supportRoutes } from "../modules/support/support.routes";
import { usersRoutes } from "../modules/users/users.routes";
import { workerProfilesRoutes } from "../modules/worker-profiles/worker-profiles.routes";
import { profileSectionsRoutes } from "../modules/profile-sections/profile-sections.routes";
import { skillsRoutes } from "../modules/skills/skills.routes";
import { recommendationsRoutes } from "../modules/recommendations/recommendations.routes";
import { articlesRoutes } from "../modules/articles/articles.routes";
import { eventsRoutes } from "../modules/events/events.routes";
import { groupsRoutes } from "../modules/groups/groups.routes";
import { companyPagesRoutes } from "../modules/company-pages/company-pages.routes";
import { hashtagsRoutes } from "../modules/hashtags/hashtags.routes";
import { jobAlertsRoutes } from "../modules/job-alerts/job-alerts.routes";
import { networkRoutes } from "../modules/network/network.routes";

const routes = Router();

const getVersion = (): string => {
  try {
    const packageJsonPath = path.resolve(process.cwd(), "package.json");
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as { version?: string };

    return packageJson.version ?? "1.0.0";
  } catch {
    return "1.0.0";
  }
};

const getRequestId = (req: Request): string | undefined =>
  typeof req.headers["x-request-id"] === "string" ? req.headers["x-request-id"] : undefined;

routes.get("/health", (req: Request, res: Response) => {
  res.status(200).json(
    success(
      {
        status: "ok",
        version: getVersion()
      },
      { requestId: getRequestId(req) }
    )
  );
});

routes.get("/health/ready", async (req: Request, res: Response) => {
  const readiness = await runApiReadinessChecks();
  setReadinessState("api_database", readiness.checks.database);
  setReadinessState("api_redis", readiness.checks.redis);
  setReadinessState("api_runtime", readiness.ready);

  res.status(readiness.ready ? 200 : 503).json(
    success(
      {
        status: readiness.ready ? "ready" : "degraded",
        version: getVersion(),
        checks: readiness.checks,
        ...(Object.keys(readiness.errors).length > 0 ? { errors: readiness.errors } : {})
      },
      { requestId: getRequestId(req) }
    )
  );
});

routes.use("/auth", authRoutes);
routes.use(adminRoutes);
routes.use(adminPlatformRoutes);
routes.use(analyticsRoutes);
routes.use(observabilityRoutes);
routes.use(billingRoutes);
routes.use(bookingsRoutes);
routes.use(chatRoutes);
routes.use(mediaRoutes);
routes.use(notificationsRoutes);
routes.use(reviewsRoutes);
routes.use(serviceRequestsRoutes);
routes.use("/users", usersRoutes);
routes.use("/worker-profiles", workerProfilesRoutes);
routes.use(searchRoutes);
routes.use(socialRoutes);
routes.use(supportRoutes);
routes.use(profileSectionsRoutes);
routes.use(skillsRoutes);
routes.use(recommendationsRoutes);
routes.use(articlesRoutes);
routes.use(eventsRoutes);
routes.use(groupsRoutes);
routes.use(companyPagesRoutes);
routes.use(hashtagsRoutes);
routes.use(jobAlertsRoutes);
routes.use(networkRoutes);

export { routes };
