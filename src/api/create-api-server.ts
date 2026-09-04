import Fastify, {
  type FastifyInstance
} from "fastify";

import type {
  PeopleFlowAnalyticsService
} from "../analytics/people-flow-analytics-service.js";
import type {
  CameraGateway,
  GatewayHealth,
  RegisteredCameraSummary
} from "../core/camera-gateway.js";
import {
  InvalidPeopleFlowQueryError,
  parseCameraId,
  parsePeopleFlowHistoryQuery
} from "../query/people-flow-query.js";
import type {
  PeopleFlowQueryPort
} from "../query/people-flow-query-port.js";

export interface CameraGatewayReadPort {
  listCameras():
    readonly RegisteredCameraSummary[];

  health(): Promise<GatewayHealth>;
}

export interface ApiDependencies {
  readonly gateway:
    Pick<CameraGateway, "listCameras" | "health">;
  readonly peopleFlowQuery:
    PeopleFlowQueryPort;
  readonly analytics:
    PeopleFlowAnalyticsService;
}

export function createApiServer(
  dependencies: ApiDependencies
): FastifyInstance {
  const app = Fastify({
    logger: false,
    bodyLimit: 16 * 1_024
  });

  app.setErrorHandler(
    async (error, _request, reply) => {
      if (
        error
        instanceof InvalidPeopleFlowQueryError
      ) {
        await reply.status(400).send({
          error: "invalid-query",
          message: error.message
        });
        return;
      }

      await reply.status(500).send({
        error: "internal-error",
        message:
          "The request could not be completed."
      });
    }
  );

  app.get("/v1/cameras", async () => ({
    cameras:
      dependencies.gateway.listCameras()
  }));

  app.get(
    "/v1/cameras/:cameraId/health",
    async (request, reply) => {
      const params =
        request.params as Record<string, unknown>;

      const cameraId =
        parseCameraId(params["cameraId"]);

      const gatewayHealth =
        await dependencies.gateway.health();

      const camera =
        gatewayHealth.cameras.find(
          (candidate) =>
            candidate.cameraId === cameraId
        );

      if (camera === undefined) {
        await reply.status(404).send({
          error: "camera-not-found"
        });
        return;
      }

      return {
        camera
      };
    }
  );

  app.get(
    "/v1/people-flow/latest",
    async (request) => {
      const query =
        request.query as Record<string, unknown>;

      const cameraId =
        parseCameraId(query["cameraId"]);

      const measurement =
        await dependencies.peopleFlowQuery.latest(
          cameraId
        );

      return {
        cameraId,
        measurement: measurement ?? null
      };
    }
  );

  app.get(
    "/v1/people-flow/history",
    async (request) => {
      const query =
        parsePeopleFlowHistoryQuery(
          request.query
        );

      return {
        cameraId: query.cameraId,
        measurements:
          await dependencies.peopleFlowQuery
            .history(query)
      };
    }
  );

  app.get(
    "/v1/analytics/overview",
    async (request) => {
      const query =
        parsePeopleFlowHistoryQuery(
          request.query
        );

      return {
        overview:
          await dependencies.analytics
            .overview(query)
      };
    }
  );

  return app;
}