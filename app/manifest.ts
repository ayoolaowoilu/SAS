import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SAS - Smart Attendance System",
    short_name: "SAS",
    description: "Effortless, accurate, and real-time attendance tracking. Built for modern teams, classrooms, and organizations.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#000000",
    orientation: "portrait",
    icons: [
      {
        src: "/logo.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icon-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    categories: ["productivity", "education", "utilities"],
    lang: "en",
    dir: "ltr",
    scope: "/",
    id: "/",
    shortcuts: [
      {
        name: "Create Session",
        short_name: "Create",
        description: "Start a new attendance session",
        url: "/",
        icons: [{ src: "/logo.svg", sizes: "any" }],
      },
      {
        name: "Join Session",
        short_name: "Join",
        description: "Join an existing session",
        url: "/join",
        icons: [{ src: "/logo.svg", sizes: "any" }],
      },
    ],
  };
}