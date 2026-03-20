import { initializeTracing } from "../lib/tracing";

void initializeTracing("gateway")
  .then(() => {
    require("../gateway/entrypoint");
  })
  .catch((error) => {
    console.error("Failed to initialize tracing for gateway", error);
    process.exit(1);
  });
