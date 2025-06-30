import { env } from "#/env";
import { createHash, createHmac } from "crypto";
import { NextRequest, NextResponse } from "next/server";

interface ApiKeyValidationResult {
  isValid: boolean;
  error?: string;
  rateLimitExceeded?: boolean;
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const rateLimitStore: RateLimitStore = {};

export async function validateApiKeyMiddleware(
  request: NextRequest,
): Promise<NextResponse | null> {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid Authorization header" },
        { status: 401 },
      );
    }

    const providedApiKey = authHeader.substring(7);
    const clientIp = getClientIp(request);

    const validation = await validateApiKey(providedApiKey, clientIp, request);

    if (!validation.isValid) {
      const status = validation.rateLimitExceeded ? 429 : 401;
      return NextResponse.json({ error: validation.error }, { status });
    }

    return null;
  } catch (error) {
    console.error("API key validation error:", error);
    return NextResponse.json(
      { error: "Authentication service unavailable" },
      { status: 503 },
    );
  }
}

async function validateApiKey(
  providedKey: string,
  clientIp: string,
  request: NextRequest,
): Promise<ApiKeyValidationResult> {
  if (!isValidApiKey(providedKey)) {
    return { isValid: false, error: "Invalid API key" };
  }

  if (!isAllowedIp(clientIp)) {
    return { isValid: false, error: "IP address not allowed" };
  }

  if (!passesRateLimit(clientIp)) {
    return {
      isValid: false,
      error: "Rate limit exceeded",
      rateLimitExceeded: true,
    };
  }

  if (env.SESSION_ANALYSIS_SIGNATURE_SECRET) {
    const isValidSignature = await validateHmacSignature(request);
    if (!isValidSignature) {
      return { isValid: false, error: "Invalid request signature" };
    }
  }

  updateRateLimit(clientIp);
  return { isValid: true };
}

function isValidApiKey(providedKey: string): boolean {
  const validKeys = [env.SESSION_ANALYSIS_API_KEY].filter(Boolean);

  return validKeys.some((validKey) => {
    if (!validKey) return false;
    return (
      createHash("sha256").update(providedKey).digest("hex") ===
      createHash("sha256").update(validKey).digest("hex")
    );
  });
}

function isAllowedIp(clientIp: string): boolean {
  if (!env.SESSION_ANALYSIS_ALLOWED_IPS?.length) {
    return true;
  }

  return env.SESSION_ANALYSIS_ALLOWED_IPS.includes(clientIp);
}

function passesRateLimit(clientIp: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const limit = env.SESSION_ANALYSIS_RATE_LIMIT;

  const clientData = rateLimitStore[clientIp];

  if (!clientData) {
    return true;
  }

  if (now > clientData.resetTime) {
    return true;
  }

  return clientData.count < limit;
}

function updateRateLimit(clientIp: string): void {
  const now = Date.now();
  const windowMs = 60 * 1000;

  const clientData = rateLimitStore[clientIp];

  if (!clientData || now > clientData.resetTime) {
    rateLimitStore[clientIp] = {
      count: 1,
      resetTime: now + windowMs,
    };
  } else {
    rateLimitStore[clientIp]!.count++;
  }
}

async function validateHmacSignature(request: NextRequest): Promise<boolean> {
  try {
    const signature = request.headers.get("X-Signature");
    if (!signature) {
      return false;
    }

    const body = await request.text();
    const expectedSignature = createHmac(
      "sha256",
      env.SESSION_ANALYSIS_SIGNATURE_SECRET!,
    )
      .update(body)
      .digest("hex");

    const providedSignature = signature.replace("sha256=", "");

    return (
      createHash("sha256").update(expectedSignature).digest("hex") ===
      createHash("sha256").update(providedSignature).digest("hex")
    );
  } catch {
    return false;
  }
}

function getClientIp(request: NextRequest): string {
  const xForwardedFor = request.headers.get("X-Forwarded-For");
  const xRealIp = request.headers.get("X-Real-IP");
  const xClientIp = request.headers.get("X-Client-IP");

  if (xForwardedFor) {
    return xForwardedFor.split(",")[0]?.trim() || "unknown";
  }

  if (xRealIp) {
    return xRealIp;
  }

  if (xClientIp) {
    return xClientIp;
  }

  return request.ip || "unknown";
}

export function createAuditLog(
  action: string,
  clientIp: string,
  details?: Record<string, unknown>,
): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    action,
    clientIp,
    details,
  };

  console.log("API_AUDIT:", JSON.stringify(logEntry));
}
