import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Garante que o worker e as fontes padrão do pdfjs-dist sejam incluídos
  // no bundle da função serverless da rota /api/pdf-text na Vercel.
  outputFileTracingIncludes: {
    "/api/pdf-text": [
      "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
      "./node_modules/pdfjs-dist/standard_fonts/**",
    ],
  },
};

export default nextConfig;
