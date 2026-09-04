import type {
  FastifyInstance
} from "fastify";

import {
  createApiServer,
  type ApiDependencies
} from "../api/create-api-server.js";
import {
  DASHBOARD_CSS,
  DASHBOARD_HTML,
  DASHBOARD_JAVASCRIPT
} from "./dashboard-assets.js";

export function createDashboardServer(
  dependencies: ApiDependencies
): FastifyInstance {
  const app = createApiServer(dependencies);

  app.get("/", async (_request, reply) => {
    await reply
      .type("text/html; charset=utf-8")
      .send(DASHBOARD_HTML);
  });

  app.get(
    "/dashboard.css",
    async (_request, reply) => {
      await reply
        .type("text/css; charset=utf-8")
        .send(DASHBOARD_CSS);
    }
  );

  app.get(
    "/dashboard.js",
    async (_request, reply) => {
      await reply
        .type(
          "text/javascript; charset=utf-8"
        )
        .send(DASHBOARD_JAVASCRIPT);
    }
  );

  return app;
}