import "server-only";

import { wfmRateLimiter } from "./rateLimiter";

/**
 * Server-only Warframe.market client.
 *
 * - Items + orders: API v2 (`data` envelope)
 * - Statistics: API v1 still required (`payload` envelope) — v2 has no equivalent yet
 */

const WFM_V1_BASE_URL = "https://api.warframe.market/v1";
const WFM_V2_BASE_URL = "https://api.warframe.market/v2";
const WFM_LANGUAGE = "en";
const WFM_PLATFORM = "pc";
const WFM_FETCH_TIMEOUT_MS = 15_000;

const MAX_RETRIES = 5;
const BASE_RETRY_DELAY_MS = 500;

export class WfmApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly url: string,
  ) {
    super(message);
    this.name = "WfmApiError";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getUserAgent(): string {
  const userAgent = process.env.WFM_USER_AGENT;
  if (!userAgent) {
    throw new Error(
      "WFM_USER_AGENT env var is required to call the Warframe.market API",
    );
  }
  return userAgent;
}

function retryDelayMs(res: Response, attempt: number): number {
  const retryAfterHeader = res.headers.get("retry-after");
  if (retryAfterHeader) {
    const seconds = Number(retryAfterHeader);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return seconds * 1000;
    }
  }
  return BASE_RETRY_DELAY_MS * 2 ** attempt;
}

async function wfmFetch<TBody>(
  baseUrl: string,
  path: string,
  unwrap: (json: unknown) => TBody,
): Promise<TBody> {
  const url = `${baseUrl}${path}`;
  const headers = {
    Accept: "application/json",
    Language: WFM_LANGUAGE,
    Platform: WFM_PLATFORM,
    "User-Agent": getUserAgent(),
  };

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    await wfmRateLimiter.acquire();
    const res = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(WFM_FETCH_TIMEOUT_MS),
    });

    if (res.status === 429) {
      if (attempt === MAX_RETRIES) {
        throw new WfmApiError("Rate limited after max retries", res.status, url);
      }
      await sleep(retryDelayMs(res, attempt));
      continue;
    }

    if (!res.ok) {
      throw new WfmApiError(`WFM request failed: ${res.status}`, res.status, url);
    }

    const json: unknown = await res.json();
    return unwrap(json);
  }

  throw new WfmApiError("WFM request failed", 0, url);
}

/** v2 endpoints return `{ data: T }`. */
export async function wfmRequestV2<TData>(path: string): Promise<TData> {
  return wfmFetch(WFM_V2_BASE_URL, path, (json) => {
    const body = json as { data?: TData; error?: unknown };
    if (body.data === undefined) {
      throw new WfmApiError("WFM v2 response missing data", 0, `${WFM_V2_BASE_URL}${path}`);
    }
    return body.data;
  });
}

/** v1 endpoints return `{ payload: T }` (still used for statistics). */
export async function wfmRequestV1<TPayload>(path: string): Promise<TPayload> {
  return wfmFetch(WFM_V1_BASE_URL, path, (json) => {
    const body = json as { payload?: TPayload };
    if (body.payload === undefined) {
      throw new WfmApiError("WFM v1 response missing payload", 0, `${WFM_V1_BASE_URL}${path}`);
    }
    return body.payload;
  });
}

/** @deprecated Use wfmRequestV1 / wfmRequestV2. Kept as alias for v1 payload calls. */
export async function wfmRequest<TPayload>(path: string): Promise<TPayload> {
  return wfmRequestV1(path);
}
