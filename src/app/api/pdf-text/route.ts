import { NextRequest, NextResponse } from 'next/server';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_PDF_SIZE_BYTES = 25 * 1024 * 1024;

interface TextItem {
  str: string;
  x: number;
  y: number;
  width: number;
}

// Resolve os arquivos do pdfjs-dist via import.meta.resolve em vez de
// createRequire.resolve. No bundle serverless com Turbopack, createRequire
// pode virar um ID numérico interno e quebrar chamadas de path.dirname().
// A resolução é lazy para não falhar durante o collect-page-data do build.
let standardFontDataUrlCache: string | null = null;

function resolvePdfjsAssets(): { standardFontDataUrl: string } {
  if (standardFontDataUrlCache) return { standardFontDataUrl: standardFontDataUrlCache };
  const standardFontFileUrl = import.meta.resolve('pdfjs-dist/standard_fonts/FoxitSerif.pfb');
  standardFontDataUrlCache = new URL('./', standardFontFileUrl).href;
  return { standardFontDataUrl: standardFontDataUrlCache };
}

function appendPageText(items: unknown[]): string {
  const lineMap = new Map<string, TextItem[]>();
  const yTolerance = 3;

  for (const item of items) {
    const textItem = item as { str?: string; transform?: number[]; width?: number };
    if (!textItem.str || textItem.str.trim() === '' || !textItem.transform) continue;

    const x = textItem.transform[4];
    const y = Math.round(textItem.transform[5]);
    const width = textItem.width || 0;

    let matchedKey: string | null = null;
    for (const key of lineMap.keys()) {
      const existingY = parseInt(key, 10);
      if (Math.abs(y - existingY) <= yTolerance) {
        matchedKey = key;
        break;
      }
    }

    const entry: TextItem = { str: textItem.str, x, y, width };
    if (matchedKey) {
      lineMap.get(matchedKey)!.push(entry);
    } else {
      lineMap.set(String(y), [entry]);
    }
  }

  const sortedLines = [...lineMap.entries()].sort(([a], [b]) => parseInt(b, 10) - parseInt(a, 10));

  return sortedLines
    .map(([, lineItems]) => lineItems.sort((a, b) => a.x - b.x).map(item => item.str).join(' '))
    .join('\n');
}

export async function POST(request: NextRequest) {
  try {
    const contentLengthHeader = request.headers.get('content-length');
    if (contentLengthHeader) {
      const contentLength = Number.parseInt(contentLengthHeader, 10);
      if (Number.isFinite(contentLength) && contentLength > MAX_PDF_SIZE_BYTES) {
        return NextResponse.json(
          { error: `PDF excede o tamanho máximo de ${Math.round(MAX_PDF_SIZE_BYTES / (1024 * 1024))} MB.` },
          { status: 413 }
        );
      }
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Arquivo PDF não enviado' }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'Formato não suportado. Envie um PDF.' }, { status: 400 });
    }

    if (file.size > MAX_PDF_SIZE_BYTES) {
      return NextResponse.json(
        { error: `PDF excede o tamanho máximo de ${Math.round(MAX_PDF_SIZE_BYTES / (1024 * 1024))} MB.` },
        { status: 413 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdfBytes = new Uint8Array(arrayBuffer);
    const { standardFontDataUrl } = resolvePdfjsAssets();
    const pdf = await pdfjsLib.getDocument({
      data: pdfBytes,
      disableWorker: true,
      standardFontDataUrl,
      verbosity: 0,
      useSystemFonts: true,
    } as Parameters<typeof pdfjsLib.getDocument>[0] & { disableWorker: boolean }).promise;

    let text = '';

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent({ includeMarkedContent: false });
      text += appendPageText(textContent.items);
      text += '\n\n';
    }

    const normalizedText = text.trim();

    return NextResponse.json({
      fileName: file.name,
      fileSize: file.size,
      numPages: pdf.numPages,
      text: normalizedText,
      hasText: normalizedText.length > 10,
    });
  } catch (error) {
    console.error('Erro ao extrair texto do PDF:', error);
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json(
      { error: `Erro ao extrair texto do PDF: ${message}` },
      { status: 500 }
    );
  }
}
