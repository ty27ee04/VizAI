import {
  describe,
  expect,
  it
} from "vitest";

import {
  EnvironmentHikvisionIsapiCredentialResolver,
  HikvisionIsapiCredentialResolutionError
} from "../src/providers/hikvision-isapi/environment-hikvision-isapi-credential-resolver.js";

const bindings = {
  "entrance-isapi-credentials": {
    usernameVariable: "VIZAI_ENTRANCE_ISAPI_USERNAME",
    passwordVariable: "VIZAI_ENTRANCE_ISAPI_PASSWORD"
  }
} as const;

function captureError(
  operation: () => unknown
): unknown {
  try {
    operation();
  } catch (error) {
    return error;
  }

  throw new Error("Expected operation to throw");
}

describe(
  "EnvironmentHikvisionIsapiCredentialResolver",
  () => {
    it("resolves credentials through an explicit binding", () => {
      const resolver =
        new EnvironmentHikvisionIsapiCredentialResolver(
          bindings,
          {
            VIZAI_ENTRANCE_ISAPI_USERNAME:
              "test-camera-user",
            VIZAI_ENTRANCE_ISAPI_PASSWORD:
              "test-camera-password"
          }
        );

      expect(
        resolver.resolve(
          "entrance-isapi-credentials"
        )
      ).toEqual({
        username: "test-camera-user",
        password: "test-camera-password"
      });
    });

    it("keeps separate credential references independent", () => {
      const resolver =
        new EnvironmentHikvisionIsapiCredentialResolver(
          {
            first: {
              usernameVariable: "FIRST_USERNAME",
              passwordVariable: "FIRST_PASSWORD"
            },
            second: {
              usernameVariable: "SECOND_USERNAME",
              passwordVariable: "SECOND_PASSWORD"
            }
          },
          {
            FIRST_USERNAME: "first-user",
            FIRST_PASSWORD: "first-password",
            SECOND_USERNAME: "second-user",
            SECOND_PASSWORD: "second-password"
          }
        );

      expect(resolver.resolve("first")).toEqual({
        username: "first-user",
        password: "first-password"
      });

      expect(resolver.resolve("second")).toEqual({
        username: "second-user",
        password: "second-password"
      });
    });

    it("rejects an unknown credential reference", () => {
      const resolver =
        new EnvironmentHikvisionIsapiCredentialResolver(
          bindings,
          {
            VIZAI_ENTRANCE_ISAPI_USERNAME:
              "test-camera-user",
            VIZAI_ENTRANCE_ISAPI_PASSWORD:
              "test-camera-password"
          }
        );

      expect(() =>
        resolver.resolve("unknown-reference")
      ).toThrow(
        HikvisionIsapiCredentialResolutionError
      );
    });

    it("rejects missing or empty usernames", () => {
      const invalidUsernames = [
        undefined,
        ""
      ];

      for (const username of invalidUsernames) {
        const resolver =
          new EnvironmentHikvisionIsapiCredentialResolver(
            bindings,
            {
              VIZAI_ENTRANCE_ISAPI_USERNAME:
                username,
              VIZAI_ENTRANCE_ISAPI_PASSWORD:
                "test-camera-password"
            }
          );

        expect(() =>
          resolver.resolve(
            "entrance-isapi-credentials"
          )
        ).toThrow(
          HikvisionIsapiCredentialResolutionError
        );
      }
    });

    it("rejects missing or empty passwords", () => {
      const invalidPasswords = [
        undefined,
        ""
      ];

      for (const password of invalidPasswords) {
        const resolver =
          new EnvironmentHikvisionIsapiCredentialResolver(
            bindings,
            {
              VIZAI_ENTRANCE_ISAPI_USERNAME:
                "test-camera-user",
              VIZAI_ENTRANCE_ISAPI_PASSWORD:
                password
            }
          );

        expect(() =>
          resolver.resolve(
            "entrance-isapi-credentials"
          )
        ).toThrow(
          HikvisionIsapiCredentialResolutionError
        );
      }
    });

    it("reports a machine-readable failure reason", () => {
      const resolver =
        new EnvironmentHikvisionIsapiCredentialResolver(
          bindings,
          {
            VIZAI_ENTRANCE_ISAPI_PASSWORD:
              "test-camera-password"
          }
        );

      const error = captureError(() =>
        resolver.resolve(
          "entrance-isapi-credentials"
        )
      );

      expect(error).toBeInstanceOf(
        HikvisionIsapiCredentialResolutionError
      );

      expect(
        (
          error as
            HikvisionIsapiCredentialResolutionError
        ).reason
      ).toBe("missing-username");
    });

    it("does not expose resolved values in errors", () => {
      const privateMarker =
        "must-not-appear-in-error";

      const resolver =
        new EnvironmentHikvisionIsapiCredentialResolver(
          bindings,
          {
            VIZAI_ENTRANCE_ISAPI_USERNAME:
              privateMarker
          }
        );

      const error = captureError(() =>
        resolver.resolve(
          "entrance-isapi-credentials"
        )
      );

      expect(error).toBeInstanceOf(
        HikvisionIsapiCredentialResolutionError
      );

      expect((error as Error).message)
        .not.toContain(privateMarker);
    });
  }
);