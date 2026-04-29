import { RefundRequestsPage } from "../action-requests/page";

export const dynamic = "force-dynamic";

export default async function RefundRequestsAliasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return RefundRequestsPage({
    searchParams,
    routeBase: "/app/refund-requests",
  });
}
