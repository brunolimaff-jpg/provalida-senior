import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Mantém assets auxiliares do pdfjs disponíveis no pacote serverless.
  // A rota registra o handler do worker em memória para evitar import relativo
  // quebrado a partir de .next/server/chunks no runtime da Vercel.
  outputFileTracingIncludes: {
    "/api/pdf-text": [
      "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
      "./node_modules/pdfjs-dist/standard_fonts/**",
    ],
  },
};

export default nextConfig;
