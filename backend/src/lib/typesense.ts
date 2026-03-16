import Typesense from "typesense";

const typesenseHost = process.env.TYPESENSE_HOST?.trim();
const typesenseApiKey = process.env.TYPESENSE_API_KEY?.trim();

const isTypesenseConfigured = Boolean(typesenseHost && typesenseApiKey);

const typesenseClient = isTypesenseConfigured
  ? new Typesense.Client({
      nodes: [
        {
          host: typesenseHost!,
          port: Number.parseInt(process.env.TYPESENSE_PORT ?? "8108", 10),
          protocol: process.env.TYPESENSE_PROTOCOL ?? "http"
        }
      ],
      apiKey: typesenseApiKey!,
      connectionTimeoutSeconds: Number.parseInt(process.env.TYPESENSE_CONNECTION_TIMEOUT_SECONDS ?? "2", 10)
    })
  : null;

const typesenseWorkersCollection = process.env.TYPESENSE_WORKERS_COLLECTION ?? "workers";

export { isTypesenseConfigured, typesenseClient, typesenseWorkersCollection };
