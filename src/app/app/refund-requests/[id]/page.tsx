import { RefundRequestDetailPage } from "../../action-requests/[id]/page";

export const dynamic = "force-dynamic";

export default async function RefundRequestDetailAliasPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return RefundRequestDetailPage({
    params,
    searchParams,
    routeBase: "/app/refund-requests",
  });
}
