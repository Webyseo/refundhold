import { ImageResponse } from "next/og";

export const alt =
  "RefundHold - Stop AI agents from refunding Stripe money without approval";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#09090b",
          color: "#fafafa",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          padding: "72px",
          width: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "28px",
            width: "100%",
          }}
        >
          <div
            style={{
              color: "#6ee7b7",
              fontSize: "30px",
              fontWeight: 800,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
            }}
          >
            RefundHold
          </div>
          <div
            style={{
              fontSize: "76px",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1.02,
              maxWidth: "980px",
            }}
          >
            Stop AI agents from refunding Stripe money without approval
          </div>
          <div
            style={{
              color: "#d4d4d8",
              fontSize: "34px",
              fontWeight: 600,
            }}
          >
            Approval inbox for AI-proposed Stripe refunds
          </div>
        </div>
      </div>
    ),
    size,
  );
}
