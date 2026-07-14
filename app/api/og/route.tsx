import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") || "SAS";

  // Fetch logo.svg from public folder and convert to base64
  const logoUrl = new URL("/logo.svg", request.url);
  const logoRes = await fetch(logoUrl);
  const logoSvg = await logoRes.text();
  const logoBase64 = `data:image/svg+xml;base64,${btoa(logoSvg)}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#ffffff",
          gap: "1.5rem",
        }}
      >
        {/* Logo */}
        <img
          src={logoBase64}
          width={80}
          height={80}
          style={{ objectFit: "contain" }}
        />

        {/* Text */}
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: "#000000",
            letterSpacing: "-0.03em",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          }}
        >
          {title}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}