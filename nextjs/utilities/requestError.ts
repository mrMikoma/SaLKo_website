import type { Logger } from "@/utilities/logger";

export interface RequestErrorInfo {
  method?: string;
  /** The request path as Next gives it, possibly with a query string */
  path?: string;
}

export interface RequestErrorContext {
  routerKind?: string;
  routePath?: string;
  routeType?: string;
  renderSource?: string;
}

/**
 * One `error` record for a failed request (Next's `onRequestError` hook).
 * Only the method, the path without its query string and the route fields are
 * logged: no headers, cookies or bodies, and no tokens from the URL.
 */
export function logRequestError(
  logger: Logger,
  err: unknown,
  request: RequestErrorInfo,
  context: RequestErrorContext,
) {
  const path = (request.path ?? "").split(/[?#]/)[0];
  logger.child({ module: "request" }).error("Request failed", {
    err,
    method: request.method,
    path,
    routerKind: context.routerKind,
    routePath: context.routePath,
    routeType: context.routeType,
    renderSource: context.renderSource,
  });
}
