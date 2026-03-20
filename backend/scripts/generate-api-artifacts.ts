import fs from "node:fs";
import path from "node:path";

import ts from "typescript";

type HttpMethod = "get" | "post" | "put" | "patch" | "delete";
type ValidationSource = "body" | "query" | "params";
type SecurityKind = "bearerAuth" | "internalHeaderAuth" | "internalBearerAuth";

interface RouteDefinition {
  method: HttpMethod;
  path: string;
  module: string;
  sourceFile: string;
  handler?: string;
  middlewares: string[];
  validation: Partial<Record<ValidationSource, string>>;
  security: SecurityKind[];
  requiredPermission?: string;
  optionalAuth: boolean;
  operationId: string;
}

interface TestInvocation {
  method: HttpMethod;
  path: string;
  normalizedPath: string;
  sourceFile: string;
}

interface GeneratedArtifacts {
  openApiJson: string;
  routeInventoryJson: string;
  coverageJson: string;
  coverageMarkdown: string;
}

const backendRoot = process.cwd();
const srcRoot = path.join(backendRoot, "src");
const routesRoot = path.join(srcRoot, "routes");
const modulesRoot = path.join(srcRoot, "modules");
const contractsDir = path.join(backendRoot, "contracts");
const reportsDir = path.join(backendRoot, "reports");
const packageJsonPath = path.join(backendRoot, "package.json");
const httpMethods = new Set<HttpMethod>(["get", "post", "put", "patch", "delete"]);
const outputTargets = [
  {
    path: path.join(contractsDir, "openapi.json"),
    contentKey: "openApiJson"
  },
  {
    path: path.join(reportsDir, "route-inventory.json"),
    contentKey: "routeInventoryJson"
  },
  {
    path: path.join(reportsDir, "http-test-coverage.json"),
    contentKey: "coverageJson"
  },
  {
    path: path.join(reportsDir, "http-test-coverage.md"),
    contentKey: "coverageMarkdown"
  }
] as const;

const readJsonFile = <T>(filePath: string): T => JSON.parse(fs.readFileSync(filePath, "utf8")) as T;

const createSourceFile = (filePath: string): ts.SourceFile =>
  ts.createSourceFile(filePath, fs.readFileSync(filePath, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

const toPosixRelative = (filePath: string): string => path.relative(backendRoot, filePath).split(path.sep).join("/");

const ensureDir = (dirPath: string): void => {
  fs.mkdirSync(dirPath, {
    recursive: true
  });
};

const listFiles = (directory: string, matcher: (filePath: string) => boolean): string[] => {
  const files: string[] = [];

  const visit = (currentPath: string): void => {
    const entries = fs.readdirSync(currentPath, {
      withFileTypes: true
    });

    for (const entry of entries) {
      const resolved = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        visit(resolved);
        continue;
      }

      if (matcher(resolved)) {
        files.push(resolved);
      }
    }
  };

  visit(directory);
  return files.sort();
};

const extractStringValue = (node: ts.Expression, sourceFile: ts.SourceFile): string | undefined => {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }

  if (ts.isTemplateExpression(node)) {
    let value = node.head.text;

    for (const span of node.templateSpans) {
      const expressionText = span.expression.getText(sourceFile).split(".").pop() ?? "param";
      value += `:${expressionText.replace(/[^A-Za-z0-9_]/g, "_")}${span.literal.text}`;
    }

    return value;
  }

  return undefined;
};

const buildMountedPath = (mountPrefix: string, routePath: string): string => {
  const normalizedMount = mountPrefix.trim();
  const normalizedRoute = routePath.trim();

  let combined = normalizedRoute;

  if (normalizedMount) {
    combined = normalizedRoute === "/" ? normalizedMount : `${normalizedMount}${normalizedRoute.startsWith("/") ? normalizedRoute : `/${normalizedRoute}`}`;
  }

  if (!combined.startsWith("/")) {
    combined = `/${combined}`;
  }

  const withoutTrailingSlash = combined !== "/" ? combined.replace(/\/+$/, "") : combined;
  return `/api/v1${withoutTrailingSlash === "/" ? "" : withoutTrailingSlash}`;
};

const getPackageVersion = (): string => {
  const packageJson = readJsonFile<{ version?: string }>(packageJsonPath);
  return packageJson.version ?? "1.0.0";
};

const normalizeCoveragePath = (value: string): string =>
  value
    .split("?")[0]
    .replace(/\$\{[^}]+\}/g, ":param")
    .replace(/:[A-Za-z0-9_]+/g, ":param")
    .replace(/\/+$/, "")
    .replace(/\/{2,}/g, "/") || "/";

const toOperationId = (route: { module: string; method: HttpMethod; path: string }): string => {
  const sanitizedPath = route.path
    .replace(/^\/api\/v1/, "")
    .split("/")
    .filter(Boolean)
    .map((segment) => {
      if (segment.startsWith(":")) {
        return `by_${segment.slice(1)}`;
      }

      return segment.replace(/[^A-Za-z0-9]+/g, "_");
    })
    .join("_");

  return `${route.module.replace(/[^A-Za-z0-9]+/g, "_")}_${route.method}_${sanitizedPath || "root"}`;
};

const resolveImportedRouteFilePath = (indexRoutePath: string, importPath: string): string =>
  path.resolve(path.dirname(indexRoutePath), `${importPath}.ts`);

const collectMountPrefixes = (indexRoutePath: string): Map<string, string> => {
  const sourceFile = createSourceFile(indexRoutePath);
  const mounts = new Map<string, string>();
  const importTargets = new Map<string, string>();

  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) && node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
      const moduleSpecifier = extractStringValue(node.moduleSpecifier, sourceFile);

      if (moduleSpecifier) {
        for (const element of node.importClause.namedBindings.elements) {
          importTargets.set(element.name.text, resolveImportedRouteFilePath(indexRoutePath, moduleSpecifier));
        }
      }
    }

    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === "routes" &&
      node.expression.name.text === "use"
    ) {
      const [firstArg, secondArg] = node.arguments;

      if (firstArg && secondArg && ts.isIdentifier(secondArg)) {
        const prefix = extractStringValue(firstArg, sourceFile);
        const targetFile = importTargets.get(secondArg.text);

        if (prefix !== undefined && targetFile) {
          mounts.set(targetFile, prefix);
        }
      } else if (firstArg && ts.isIdentifier(firstArg)) {
        const targetFile = importTargets.get(firstArg.text);

        if (targetFile) {
          mounts.set(targetFile, "");
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  ts.forEachChild(sourceFile, visit);
  return mounts;
};

const inferSecurity = (middlewares: string[]): {
  security: SecurityKind[];
  requiredPermission?: string;
  optionalAuth: boolean;
} => {
  const security = new Set<SecurityKind>();
  let requiredPermission: string | undefined;
  let optionalAuth = false;

  for (const middleware of middlewares) {
    if (middleware === "authenticate") {
      security.add("bearerAuth");
    }

    if (middleware === "optionalAuthenticate") {
      optionalAuth = true;
    }

    if (middleware === "internalAccess") {
      security.add("internalHeaderAuth");
      security.add("internalBearerAuth");
    }

    const permissionMatch = middleware.match(/^requirePermission\("([^"]+)"\)$/);

    if (permissionMatch) {
      security.add("bearerAuth");
      requiredPermission = permissionMatch[1];
    }
  }

  return {
    security: Array.from(security).sort() as SecurityKind[],
    requiredPermission,
    optionalAuth
  };
};

const inferValidation = (middlewares: string[]): Partial<Record<ValidationSource, string>> => {
  const validation: Partial<Record<ValidationSource, string>> = {};

  for (const middleware of middlewares) {
    const match = middleware.match(/^validate\(([^,]+?)(?:,\s*"([^"]+)")?\)$/);

    if (!match) {
      continue;
    }

    const schemaName = match[1].trim();
    const source = (match[2] as ValidationSource | undefined) ?? "body";
    validation[source] = schemaName;
  }

  return validation;
};

const parseRouteFile = (filePath: string, mountPrefix: string): RouteDefinition[] => {
  const sourceFile = createSourceFile(filePath);
  const routes: RouteDefinition[] = [];
  const routerNames = new Set<string>();
  const moduleName = filePath.includes(`${path.sep}src${path.sep}routes${path.sep}`) ? "platform" : path.basename(filePath, ".routes.ts");

  const visit = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      ts.isCallExpression(node.initializer) &&
      ts.isIdentifier(node.initializer.expression) &&
      node.initializer.expression.text === "Router"
    ) {
      routerNames.add(node.name.text);
    }

    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) &&
      routerNames.has(node.expression.expression.text) &&
      httpMethods.has(node.expression.name.text as HttpMethod)
    ) {
      const method = node.expression.name.text as HttpMethod;
      const [pathArg, ...handlerArgs] = node.arguments;
      const relativePath = pathArg ? extractStringValue(pathArg, sourceFile) : undefined;

      if (!relativePath) {
        ts.forEachChild(node, visit);
        return;
      }

      const fullPath = buildMountedPath(mountPrefix, relativePath);
      const handler = handlerArgs.length > 0 ? handlerArgs[handlerArgs.length - 1].getText(sourceFile) : undefined;
      const middlewares = handlerArgs.slice(0, -1).map((arg) => arg.getText(sourceFile));
      const { security, requiredPermission, optionalAuth } = inferSecurity(middlewares);
      const validation = inferValidation(middlewares);

      routes.push({
        method,
        path: fullPath,
        module: moduleName,
        sourceFile: toPosixRelative(filePath),
        handler,
        middlewares,
        validation,
        security,
        requiredPermission,
        optionalAuth,
        operationId: toOperationId({
          module: moduleName,
          method,
          path: fullPath
        })
      });
    }

    ts.forEachChild(node, visit);
  };

  ts.forEachChild(sourceFile, visit);
  return routes;
};

const collectRoutes = (): RouteDefinition[] => {
  const indexRoutePath = path.join(routesRoot, "index.ts");
  const mountPrefixes = collectMountPrefixes(indexRoutePath);
  const routeFiles = [
    indexRoutePath,
    ...listFiles(modulesRoot, (filePath) => filePath.endsWith(".routes.ts"))
  ];

  const routes = routeFiles.flatMap((filePath) => {
    const mountPrefix = filePath === indexRoutePath ? "" : mountPrefixes.get(filePath) ?? "";
    return parseRouteFile(filePath, mountPrefix);
  });

  return routes.sort((left, right) => {
    if (left.path === right.path) {
      return left.method.localeCompare(right.method);
    }

    return left.path.localeCompare(right.path);
  });
};

const collectHttpTestInvocations = (): TestInvocation[] => {
  const testFiles = listFiles(srcRoot, (filePath) => filePath.endsWith(".test.ts"));
  const invocations: TestInvocation[] = [];

  for (const filePath of testFiles) {
    const sourceFile = createSourceFile(filePath);

    const visit = (node: ts.Node): void => {
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        httpMethods.has(node.expression.name.text as HttpMethod) &&
        node.arguments.length > 0
      ) {
        const method = node.expression.name.text as HttpMethod;
        const rawPath = extractStringValue(node.arguments[0], sourceFile);

        if (rawPath?.startsWith("/api/v1/")) {
          invocations.push({
            method,
            path: rawPath,
            normalizedPath: normalizeCoveragePath(rawPath),
            sourceFile: toPosixRelative(filePath)
          });
        }
      }

      ts.forEachChild(node, visit);
    };

    ts.forEachChild(sourceFile, visit);
  }

  return invocations.sort((left, right) => {
    if (left.path === right.path) {
      if (left.method === right.method) {
        return left.sourceFile.localeCompare(right.sourceFile);
      }

      return left.method.localeCompare(right.method);
    }

    return left.path.localeCompare(right.path);
  });
};

const toOpenApiPath = (fullPath: string): string => {
  const trimmed = fullPath.replace(/^\/api\/v1/, "");
  return trimmed || "/";
};

const buildOpenApiSpec = (routes: RouteDefinition[]) => {
  const tags = Array.from(new Set(routes.map((route) => route.module))).sort().map((name) => ({
    name
  }));

  const paths: Record<string, Record<string, unknown>> = {};

  for (const route of routes) {
    const openApiPath = toOpenApiPath(route.path);
    const pathParameters = Array.from(openApiPath.matchAll(/:([A-Za-z0-9_]+)/g)).map((match) => ({
      name: match[1],
      in: "path",
      required: true,
      description: `${match[1]} path parameter`,
      schema: {
        type: "string"
      }
    }));

    const descriptionParts = [`Generated from ${route.sourceFile}`];

    if (route.handler) {
      descriptionParts.push(`Handler: ${route.handler}`);
    }

    const operation: Record<string, unknown> = {
      tags: [route.module],
      summary: `${route.method.toUpperCase()} ${openApiPath}`,
      description: descriptionParts.join(". "),
      operationId: route.operationId,
      parameters: pathParameters,
      responses: {
        "2XX": {
          description: "Successful response",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/SuccessEnvelope"
              }
            }
          }
        },
        "4XX": {
          description: "Client error response",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ErrorEnvelope"
              }
            }
          }
        },
        "5XX": {
          description: "Server error response",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ErrorEnvelope"
              }
            }
          }
        }
      },
      "x-vsp-source-file": route.sourceFile,
      "x-vsp-handler": route.handler ?? null,
      "x-vsp-middlewares": route.middlewares,
      "x-vsp-validation": route.validation
    };

    if (route.requiredPermission) {
      operation["x-vsp-required-permission"] = route.requiredPermission;
    }

    if (route.optionalAuth) {
      operation["x-vsp-optional-auth"] = true;
    }

    if (route.validation.body) {
      operation.requestBody = {
        required: true,
        content: {
          "application/json": {
            schema: {
              allOf: [
                {
                  $ref: "#/components/schemas/GenericObject"
                }
              ],
              title: route.validation.body,
              "x-vsp-validation-schema": route.validation.body
            }
          }
        }
      };
    }

    if (route.validation.query) {
      operation["x-vsp-query-schema"] = route.validation.query;
    }

    if (route.validation.params) {
      operation["x-vsp-params-schema"] = route.validation.params;
    }

    if (route.security.includes("internalHeaderAuth") || route.security.includes("internalBearerAuth")) {
      operation.security = [
        {
          internalHeaderAuth: []
        },
        {
          internalBearerAuth: []
        }
      ];
    } else if (route.security.includes("bearerAuth")) {
      operation.security = [
        {
          bearerAuth: []
        }
      ];
    }

    const openApiMethodPath = openApiPath.replace(/:([A-Za-z0-9_]+)/g, "{$1}");
    paths[openApiMethodPath] ??= {};
    paths[openApiMethodPath][route.method] = operation;
  }

  return {
    openapi: "3.1.0",
    info: {
      title: "VSP Backend API",
      version: getPackageVersion(),
      description: "Generated from TypeScript route declarations. Validation schema names are exposed through x-vsp-* extensions."
    },
    servers: [
      {
        url: "/api/v1"
      }
    ],
    tags,
    paths,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        },
        internalHeaderAuth: {
          type: "apiKey",
          in: "header",
          name: "x-internal-key"
        },
        internalBearerAuth: {
          type: "http",
          scheme: "bearer"
        }
      },
      schemas: {
        GenericObject: {
          type: "object",
          additionalProperties: true
        },
        SuccessEnvelope: {
          type: "object",
          required: ["success", "data", "meta"],
          properties: {
            success: {
              type: "boolean",
              const: true
            },
            data: {
              $ref: "#/components/schemas/GenericObject"
            },
            meta: {
              $ref: "#/components/schemas/GenericObject"
            }
          }
        },
        ErrorEnvelope: {
          type: "object",
          required: ["success", "error", "meta"],
          properties: {
            success: {
              type: "boolean",
              const: false
            },
            error: {
              type: "object",
              required: ["code", "message"],
              properties: {
                code: {
                  type: "string"
                },
                message: {
                  type: "string"
                },
                details: {
                  $ref: "#/components/schemas/GenericObject"
                }
              }
            },
            meta: {
              $ref: "#/components/schemas/GenericObject"
            }
          }
        }
      }
    }
  };
};

const buildCoverageArtifacts = (routes: RouteDefinition[], invocations: TestInvocation[]) => {
  const uniqueInvocations = Array.from(
    new Map(invocations.map((invocation) => [`${invocation.method} ${invocation.normalizedPath}`, invocation])).values()
  );
  const coverageIndex = new Map<string, TestInvocation[]>();

  for (const invocation of invocations) {
    const key = `${invocation.method} ${invocation.normalizedPath}`;
    const current = coverageIndex.get(key) ?? [];
    current.push(invocation);
    coverageIndex.set(key, current);
  }

  const coveredRoutes = routes.filter((route) => coverageIndex.has(`${route.method} ${normalizeCoveragePath(route.path)}`));
  const uncoveredRoutes = routes.filter((route) => !coverageIndex.has(`${route.method} ${normalizeCoveragePath(route.path)}`));
  const coverageRate = routes.length === 0 ? 1 : coveredRoutes.length / routes.length;

  const summary = {
    routeCount: routes.length,
    staticHttpInvocationCount: invocations.length,
    uniqueStaticHttpInvocationCount: uniqueInvocations.length,
    coveredRouteCount: coveredRoutes.length,
    uncoveredRouteCount: uncoveredRoutes.length,
    coverageRate
  };

  const coverageJson = {
    summary,
    limitations: [
      "Coverage is derived from static HTTP invocation parsing in *.test.ts files.",
      "Dynamic runtime-generated URLs, websocket traffic, and non-HTTP flows are not included.",
      "A matched route indicates at least one static request invocation, not exhaustive behavioral coverage."
    ],
    uncoveredRoutes: uncoveredRoutes.map((route) => ({
      method: route.method.toUpperCase(),
      path: route.path,
      module: route.module,
      sourceFile: route.sourceFile,
      operationId: route.operationId
    })),
    coveredRoutes: coveredRoutes.map((route) => ({
      method: route.method.toUpperCase(),
      path: route.path,
      module: route.module,
      sourceFile: route.sourceFile,
      coveredBy: (coverageIndex.get(`${route.method} ${normalizeCoveragePath(route.path)}`) ?? []).map((invocation) => invocation.sourceFile)
    }))
  };

  const coverageMarkdownLines = [
    "# HTTP Test Coverage",
    "",
    "Generated from the current TypeScript source tree.",
    "",
    `- Routes: ${summary.routeCount}`,
    `- Static HTTP test invocations: ${summary.staticHttpInvocationCount}`,
    `- Unique static HTTP invocations: ${summary.uniqueStaticHttpInvocationCount}`,
    `- Covered routes: ${summary.coveredRouteCount}`,
    `- Uncovered routes: ${summary.uncoveredRouteCount}`,
    `- Static coverage rate: ${(summary.coverageRate * 100).toFixed(2)}%`,
    "",
    "## Limitations",
    "",
    ...coverageJson.limitations.map((line) => `- ${line}`),
    "",
    "## Uncovered Routes",
    ""
  ];

  if (uncoveredRoutes.length === 0) {
    coverageMarkdownLines.push("- None");
  } else {
    for (const route of uncoveredRoutes) {
      coverageMarkdownLines.push(`- \`${route.method.toUpperCase()} ${route.path}\` (${route.module})`);
    }
  }

  coverageMarkdownLines.push("", "## Covered Route Samples", "");

  for (const route of coveredRoutes.slice(0, 25)) {
    coverageMarkdownLines.push(`- \`${route.method.toUpperCase()} ${route.path}\` via ${Array.from(new Set((coverageIndex.get(`${route.method} ${normalizeCoveragePath(route.path)}`) ?? []).map((invocation) => invocation.sourceFile))).join(", ")}`);
  }

  return {
    coverageJson: JSON.stringify(coverageJson, null, 2) + "\n",
    coverageMarkdown: coverageMarkdownLines.join("\n") + "\n"
  };
};

const buildArtifacts = (): GeneratedArtifacts => {
  const routes = collectRoutes();
  const invocations = collectHttpTestInvocations();
  const openApiSpec = buildOpenApiSpec(routes);
  const coverageArtifacts = buildCoverageArtifacts(routes, invocations);

  return {
    openApiJson: JSON.stringify(openApiSpec, null, 2) + "\n",
    routeInventoryJson:
      JSON.stringify(
        {
          routeCount: routes.length,
          routes
        },
        null,
        2
      ) + "\n",
    coverageJson: coverageArtifacts.coverageJson,
    coverageMarkdown: coverageArtifacts.coverageMarkdown
  };
};

const writeArtifacts = (artifacts: GeneratedArtifacts): void => {
  ensureDir(contractsDir);
  ensureDir(reportsDir);

  for (const target of outputTargets) {
    fs.writeFileSync(target.path, artifacts[target.contentKey], "utf8");
  }
};

const checkArtifacts = (artifacts: GeneratedArtifacts): string[] => {
  const driftedFiles: string[] = [];

  for (const target of outputTargets) {
    if (!fs.existsSync(target.path)) {
      driftedFiles.push(toPosixRelative(target.path));
      continue;
    }

    const current = fs.readFileSync(target.path, "utf8");

    if (current !== artifacts[target.contentKey]) {
      driftedFiles.push(toPosixRelative(target.path));
    }
  }

  return driftedFiles;
};

const main = (): void => {
  const artifacts = buildArtifacts();
  const checkMode = process.argv.includes("--check");

  if (checkMode) {
    const driftedFiles = checkArtifacts(artifacts);

    if (driftedFiles.length > 0) {
      console.error(`API artifacts are out of date:\n${driftedFiles.map((filePath) => `- ${filePath}`).join("\n")}`);
      process.exit(1);
    }

    console.log("API artifacts are up to date");
    return;
  }

  writeArtifacts(artifacts);
  console.log("Generated API artifacts:");

  for (const target of outputTargets) {
    console.log(`- ${toPosixRelative(target.path)}`);
  }
};

main();
