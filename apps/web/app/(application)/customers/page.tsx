import { redirect } from "next/navigation";

import { apiFetch } from "@/lib/api/server";
import type { CustomerListResponse } from "@/lib/api/types";
import type { CustomersPageProps } from "@/lib/data/customers";
import { Customers } from "./customers";

export default async function CustomersPage({
  searchParams,
}: CustomersPageProps) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const search = params.search ?? "";

  const meResponse = await apiFetch("/api/v1/me");
  if (!meResponse.ok) {
    redirect("/login");
  }

  const me = await meResponse.json();
  if (!me.is_platform_admin) {
    redirect("/dashboard");
  }

  const query = new URLSearchParams({ page: String(page) });
  if (search) {
    query.set("search", search);
  }

  const listResponse = await apiFetch(`/api/v1/customers?${query.toString()}`);

  if (listResponse.headers.get("x-login-verification") === "required") {
    redirect("/login");
  }

  const data: CustomerListResponse | null = listResponse.ok
    ? await listResponse.json()
    : null;

  return (
    <Customers
      customers={data?.items ?? []}
      total={data?.total ?? 0}
      page={data?.page ?? 1}
      totalPages={data?.total_pages ?? 1}
      search={search}
    />
  );
}
