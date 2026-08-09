import type { MetadataRoute } from "next";
import {
  DEFAULT_BUSINESS_NAME,
  DEFAULT_BUSINESS_TAGLINE,
} from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${DEFAULT_BUSINESS_NAME} — קביעת תורים`,
    short_name: DEFAULT_BUSINESS_NAME,
    description: DEFAULT_BUSINESS_TAGLINE,
    lang: "he",
    dir: "rtl",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
