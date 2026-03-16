import { EventBus } from "../../lib/eventBus";
import { SearchService } from "./search.service";

const searchService = new SearchService();

EventBus.on("WORKER_PROFILE_CREATED", async (payload) => {
  const workerProfileId = typeof payload.workerProfileId === "string" ? payload.workerProfileId : null;

  if (!workerProfileId) {
    return;
  }

  await searchService.refreshSearchIndex(workerProfileId);
});

EventBus.on("WORKER_PROFILE_UPDATED", async (payload) => {
  const workerProfileId = typeof payload.workerProfileId === "string" ? payload.workerProfileId : null;

  if (!workerProfileId) {
    return;
  }

  await searchService.refreshSearchIndex(workerProfileId);
});

EventBus.on("USER_DELETION_REQUESTED", async (payload) => {
  const userId = typeof payload.userId === "string" ? payload.userId : null;

  if (!userId) {
    return;
  }

  await searchService.removeWorkerByUserId(userId);
});
