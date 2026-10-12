import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components выключены: почти все страницы зависят от вошедшего
  // пользователя, поэтому используется обычный динамический рендеринг.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  serverExternalPackages: ["exceljs"],
};

export default nextConfig;
