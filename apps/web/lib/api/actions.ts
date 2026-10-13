"use server";

import { headers } from "next/headers";
import { apiFetch } from "@/lib/api/server";
import { TOO_MANY_ATTEMPTS } from "@/lib/auth/errors";
import { consume } from "@/lib/rate-limit";
import type { AccountStatusResponse } from "./types";

/**
 * Named Server Actions for the FastAPI calls the browser makes.
 *
 * These replace the former `/api/backend/[...path]` catch-all relay. The client
 * calls a function, not a URL, so there is no addressable proxy left to aim an
 * arbitrary path, method, or body at — each action fixes the backend path and
 * checks its own input first. The caller's bearer token is still attached
 * server-side by `apiFetch`; the browser never sees it.
 */

export type ActionResult = { ok: true } | { ok: false; message: string };

const CALLER_UNKNOWN_IP = "unknown";

async function callerIp(): Promise<string> {
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for");
  return (
    forwarded?.split(",")[0]?.trim() ||
    requestHeaders.get("x-real-ip") ||
    CALLER_UNKNOWN_IP
  );
}

/** Register freshly verified user as active and provision their organization. */
export async function registerAccount(input?: {
  organizationName?: string;
}): Promise<ActionResult> {
  const ip = await callerIp();
  const limit = consume(`action:registerAccount:${ip}`, {
    limit: 10,
    windowMs: 60_000,
  });
  if (!limit.allowed) {
    return { ok: false, message: TOO_MANY_ATTEMPTS };
  }

  const response = await apiFetch("/api/v1/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      organization_name: input?.organizationName || null,
    }),
  });

  if (response.status === 429) {
    return { ok: false, message: TOO_MANY_ATTEMPTS };
  }
  if (!response.ok) {
    return {
      ok: false,
      message:
        "Your email is verified, but we could not finish organization registration. Please contact support.",
    };
  }

  return { ok: true };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type UserDecision = "approve" | "reject";

/** Activate or decline a pending account (platform admins only). */
export async function decideUser(input: {
  userId: string;
  decision: UserDecision;
}): Promise<ActionResult> {
  if (!UUID.test(input.userId)) {
    return { ok: false, message: "That account could not be found." };
  }
  if (input.decision !== "approve" && input.decision !== "reject") {
    return { ok: false, message: "That action is not supported." };
  }

  const ip = await callerIp();
  const limit = consume(`action:decideUser:${ip}`, {
    limit: 30,
    windowMs: 60_000,
  });
  if (!limit.allowed) {
    return { ok: false, message: TOO_MANY_ATTEMPTS };
  }

  const response = await apiFetch(
    `/api/v1/users/${input.userId}/${input.decision}`,
    { method: "POST" },
  );

  if (response.status === 429) {
    return { ok: false, message: TOO_MANY_ATTEMPTS };
  }
  if (!response.ok) {
    return {
      ok: false,
      message:
        input.decision === "approve"
          ? "Could not approve that account. Please try again."
          : "Could not decline that account. Please try again.",
    };
  }

  return { ok: true };
}

/** Permanently delete a user account (platform admins only). */
export async function deleteUser(input: {
  userId: string;
}): Promise<ActionResult> {
  if (!UUID.test(input.userId)) {
    return { ok: false, message: "That account could not be found." };
  }

  const ip = await callerIp();
  const limit = consume(`action:deleteUser:${ip}`, {
    limit: 30,
    windowMs: 60_000,
  });
  if (!limit.allowed) {
    return { ok: false, message: TOO_MANY_ATTEMPTS };
  }

  const response = await apiFetch(`/api/v1/users/${input.userId}`, {
    method: "DELETE",
  });

  if (response.status === 429) {
    return { ok: false, message: TOO_MANY_ATTEMPTS };
  }
  if (!response.ok) {
    return {
      ok: false,
      message: "Could not delete that account. Please try again.",
    };
  }

  return { ok: true };
}

/** Permanently delete an organization (platform admins only). */
export async function deleteOrganization(input: {
  organizationId: string;
}): Promise<ActionResult> {
  if (!UUID.test(input.organizationId)) {
    return { ok: false, message: "That organization could not be found." };
  }

  const ip = await callerIp();
  const limit = consume(`action:deleteOrg:${ip}`, {
    limit: 30,
    windowMs: 60_000,
  });
  if (!limit.allowed) {
    return { ok: false, message: TOO_MANY_ATTEMPTS };
  }

  const response = await apiFetch(
    `/api/v1/organizations/${input.organizationId}`,
    {
      method: "DELETE",
    },
  );

  if (response.status === 429) {
    return { ok: false, message: TOO_MANY_ATTEMPTS };
  }
  if (!response.ok) {
    return {
      ok: false,
      message: "Could not delete that organization. Please try again.",
    };
  }

  return { ok: true };
}

/** Activate a pending organization (platform admins only). */
export async function approveOrganization(input: {
  organizationId: string;
}): Promise<ActionResult> {
  if (!UUID.test(input.organizationId)) {
    return { ok: false, message: "That organization could not be found." };
  }

  const ip = await callerIp();
  const limit = consume(`action:approveOrg:${ip}`, {
    limit: 30,
    windowMs: 60_000,
  });
  if (!limit.allowed) {
    return { ok: false, message: TOO_MANY_ATTEMPTS };
  }

  const response = await apiFetch(
    `/api/v1/organizations/${input.organizationId}/approve`,
    {
      method: "POST",
    },
  );

  if (response.status === 429) {
    return { ok: false, message: TOO_MANY_ATTEMPTS };
  }
  if (!response.ok) {
    return {
      ok: false,
      message: "Could not approve that organization. Please try again.",
    };
  }

  return { ok: true };
}

/** Cancel / suspend an organization (platform admins only). */
export async function cancelOrganization(input: {
  organizationId: string;
}): Promise<ActionResult> {
  if (!UUID.test(input.organizationId)) {
    return { ok: false, message: "That organization could not be found." };
  }

  const ip = await callerIp();
  const limit = consume(`action:cancelOrg:${ip}`, {
    limit: 30,
    windowMs: 60_000,
  });
  if (!limit.allowed) {
    return { ok: false, message: TOO_MANY_ATTEMPTS };
  }

  const response = await apiFetch(
    `/api/v1/organizations/${input.organizationId}/cancel`,
    {
      method: "POST",
    },
  );

  if (response.status === 429) {
    return { ok: false, message: TOO_MANY_ATTEMPTS };
  }
  if (!response.ok) {
    return {
      ok: false,
      message: "Could not cancel that organization. Please try again.",
    };
  }

  return { ok: true };
}

/** Create a customer (platform admins only). */
export async function createCustomer(input: {
  name: string;
  gstin?: string;
  companyName?: string;
  location?: string;
  address1?: string;
  address2?: string;
  pincode?: string;
  state?: string;
  email?: string;
  contactMobile?: string;
  contactTelephone?: string;
  openingBalance?: string;
  openingBalanceType?: "credit" | "debit";
  placeOfSupply?: string;
  organizationId?: string;
}): Promise<ActionResult> {
  const ip = await callerIp();
  const limit = consume(`action:createCustomer:${ip}`, {
    limit: 30,
    windowMs: 60_000,
  });
  if (!limit.allowed) {
    return { ok: false, message: TOO_MANY_ATTEMPTS };
  }

  const response = await apiFetch("/api/v1/customers", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      gstin: input.gstin || null,
      company_name: input.companyName || null,
      location: input.location || null,
      address1: input.address1 || null,
      address2: input.address2 || null,
      pincode: input.pincode || null,
      state: input.state || null,
      email: input.email || null,
      contact_mobile: input.contactMobile || null,
      contact_telephone: input.contactTelephone || null,
      opening_balance: input.openingBalance || null,
      opening_balance_type: input.openingBalanceType || null,
      place_of_supply: input.placeOfSupply || null,
      organization_id: input.organizationId || null,
    }),
  });

  if (response.status === 429) {
    return { ok: false, message: TOO_MANY_ATTEMPTS };
  }
  if (!response.ok) {
    let message = "Could not create that customer. Please try again.";
    try {
      const data = await response.json();
      if (data?.detail) {
        message = typeof data.detail === "string" ? data.detail : message;
      }
    } catch {
      // Response body wasn't JSON — keep the default message.
    }
    return { ok: false, message };
  }

  return { ok: true };
}

/** Update a customer. */
export async function updateCustomer(input: {
  customerId: string;
  name: string;
  gstin?: string;
  companyName?: string;
  location?: string;
  address1?: string;
  address2?: string;
  pincode?: string;
  state?: string;
  email?: string;
  contactMobile?: string;
  contactTelephone?: string;
  openingBalance?: string;
  openingBalanceType?: "credit" | "debit";
  placeOfSupply?: string;
  organizationId?: string;
}): Promise<ActionResult> {
  if (!UUID.test(input.customerId)) {
    return { ok: false, message: "That customer could not be found." };
  }

  const ip = await callerIp();
  const limit = consume(`action:updateCustomer:${ip}`, {
    limit: 30,
    windowMs: 60_000,
  });
  if (!limit.allowed) {
    return { ok: false, message: TOO_MANY_ATTEMPTS };
  }

  const response = await apiFetch(`/api/v1/customers/${input.customerId}`, {
    method: "PUT",
    body: JSON.stringify({
      name: input.name,
      gstin: input.gstin || null,
      company_name: input.companyName || null,
      location: input.location || null,
      address1: input.address1 || null,
      address2: input.address2 || null,
      pincode: input.pincode || null,
      state: input.state || null,
      email: input.email || null,
      contact_mobile: input.contactMobile || null,
      contact_telephone: input.contactTelephone || null,
      opening_balance: input.openingBalance || null,
      opening_balance_type: input.openingBalanceType || null,
      place_of_supply: input.placeOfSupply || null,
      organization_id: input.organizationId || null,
    }),
  });

  if (response.status === 429) {
    return { ok: false, message: TOO_MANY_ATTEMPTS };
  }
  if (!response.ok) {
    let message = "Could not update that customer. Please try again.";
    try {
      const data = await response.json();
      if (data?.detail) {
        message = typeof data.detail === "string" ? data.detail : message;
      }
    } catch {
      // Response body wasn't JSON — keep the default message.
    }
    return { ok: false, message };
  }

  return { ok: true };
}

/** Delete a customer. */
export async function deleteCustomer(input: {
  customerId: string;
}): Promise<ActionResult> {
  if (!UUID.test(input.customerId)) {
    return { ok: false, message: "That customer could not be found." };
  }

  const ip = await callerIp();
  const limit = consume(`action:deleteCustomer:${ip}`, {
    limit: 20,
    windowMs: 60_000,
  });
  if (!limit.allowed) {
    return { ok: false, message: TOO_MANY_ATTEMPTS };
  }

  const response = await apiFetch(`/api/v1/customers/${input.customerId}`, {
    method: "DELETE",
  });

  if (response.status === 429) {
    return { ok: false, message: TOO_MANY_ATTEMPTS };
  }
  if (!response.ok) {
    let message = "Could not delete that customer. Please try again.";
    try {
      const data = await response.json();
      if (data?.detail) {
        message = typeof data.detail === "string" ? data.detail : message;
      }
    } catch {
      // Response body wasn't JSON — keep the default message.
    }
    return { ok: false, message };
  }

  return { ok: true };
}

export type CheckStatusResult =
  | { ok: true; data: AccountStatusResponse }
  | { ok: false; message: string };

/** Check an account's approval / active status by email. */
export async function checkAccountStatus(
  email: string,
): Promise<CheckStatusResult> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail?.includes("@")) {
    return { ok: false, message: "Please enter a valid email address." };
  }

  const ip = await callerIp();
  const ipLimit = consume(`action:checkStatus:ip:${ip}`, {
    limit: 15,
    windowMs: 60_000,
  });
  if (!ipLimit.allowed) {
    return { ok: false, message: TOO_MANY_ATTEMPTS };
  }

  const emailLimit = consume(`action:checkStatus:email:${cleanEmail}`, {
    limit: 5,
    windowMs: 60_000,
  });
  if (!emailLimit.allowed) {
    return { ok: false, message: TOO_MANY_ATTEMPTS };
  }

  const response = await apiFetch("/api/v1/auth/status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: cleanEmail }),
  });

  if (response.status === 429) {
    return { ok: false, message: TOO_MANY_ATTEMPTS };
  }
  if (!response.ok) {
    return {
      ok: false,
      message: "Could not retrieve account status. Please try again later.",
    };
  }

  const data: AccountStatusResponse = await response.json();
  return { ok: true, data };
}
