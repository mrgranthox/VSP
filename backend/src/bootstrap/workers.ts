import { initializeTracing } from "../lib/tracing";

void initializeTracing("workers")
  .then(() => {
    require("../workers/entrypoint");
  })
  .catch((error) => {
    console.error("Failed to initialize tracing for workers", error);
    process.exit(1);
  });
