import { initializeTracing } from "../lib/tracing";

void initializeTracing("api")
  .then(() => {
    require("../server");
  })
  .catch((error) => {
    console.error("Failed to initialize tracing for api", error);
    process.exit(1);
  });
