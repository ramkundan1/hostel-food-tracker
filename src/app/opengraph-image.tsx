import { ImageResponse } from "next/og";

// The preview card shown when the link is shared on WhatsApp, Facebook, etc.
export const alt = "e-tracker — track every meal, know every cost";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
          color: "#0f172a",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <svg width="150" height="150" viewBox="0 0 32 32">
            <rect width="32" height="32" rx="9" fill="#2563eb" />
            <circle
              cx="16"
              cy="16"
              r="8"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.5"
            />
            <path
              d="M12.5 16.5l2.5 2.5 4.5-5"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div style={{ display: "flex", fontSize: 110, fontWeight: 700, marginLeft: 32 }}>
            e-tracker
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 46, marginTop: 40, color: "#475569" }}>
          Track every meal. Know every cost.
        </div>
      </div>
    ),
    { ...size }
  );
}
