/**
 * Private credentials used by an ISAPI client.
 *
 * These values exist only in trusted runtime memory. They must never
 * be stored in CameraRegistration or providerConfig.
 */
export interface HikvisionIsapiCredentials {
  readonly username: string;
  readonly password: string;
}

/**
 * Resolves a non-secret credentialRef into private runtime values.
 */
export interface HikvisionIsapiCredentialResolver {
  resolve(
    credentialRef: string
  ): HikvisionIsapiCredentials;
}