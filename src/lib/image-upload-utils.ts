/**
 * Utilitários para recepção, normalização, cópia/cola (clipboard)
 * e seleção de imagens para leitura de rodadas da roleta.
 */

export interface ProcessedImageData {
  dataUrl: string;
  fileName: string;
  sizeKb: number;
  width: number;
  height: number;
}

/**
 * Normaliza qualquer imagem (JPG, PNG, WebP, BMP, AVIF, print de clipboard, etc.)
 * Redimensiona suavemente via Canvas se ultrapassar 1920px para garantir velocidade,
 * máxima nitidez no OCR e evitar limites de payload.
 */
export async function processAndNormalizeImage(
  file: File | Blob,
  preferredName?: string
): Promise<ProcessedImageData> {
  const fileName =
    preferredName ||
    (file instanceof File && file.name
      ? file.name
      : `captura-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.png`);

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      try {
        const origWidth = img.naturalWidth || img.width;
        const origHeight = img.naturalHeight || img.height;

        if (!origWidth || !origHeight) {
          URL.revokeObjectURL(objectUrl);
          reject(new Error("Não foi possível identificar as dimensões da imagem."));
          return;
        }

        // Limite máximo de 1920px na maior dimensão para manter o OCR ultranítido e o payload leve
        const MAX_DIMENSION = 1920;
        let targetWidth = origWidth;
        let targetHeight = origHeight;

        if (origWidth > MAX_DIMENSION || origHeight > MAX_DIMENSION) {
          if (origWidth > origHeight) {
            targetWidth = MAX_DIMENSION;
            targetHeight = Math.round((origHeight * MAX_DIMENSION) / origWidth);
          } else {
            targetHeight = MAX_DIMENSION;
            targetWidth = Math.round((origWidth * MAX_DIMENSION) / origHeight);
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          reject(new Error("Falha ao criar contexto gráfico do navegador."));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        // JPEG 92% é leve e excelente para OCR
        const mimeType = "image/jpeg";
        const dataUrl = canvas.toDataURL(mimeType, 0.92);

        const base64Length = dataUrl.length - (dataUrl.indexOf(",") + 1);
        const sizeInBytes = Math.ceil((base64Length * 3) / 4);
        const sizeKb = Math.round(sizeInBytes / 1024);

        URL.revokeObjectURL(objectUrl);

        resolve({
          dataUrl,
          fileName,
          sizeKb,
          width: targetWidth,
          height: targetHeight,
        });
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err instanceof Error ? err : new Error("Erro ao processar imagem no canvas."));
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("O formato do arquivo selecionado não pôde ser carregado como imagem."));
    };

    img.src = objectUrl;
  });
}

/**
 * Extrai um arquivo de imagem a partir do evento nativo de Paste (Ctrl + V).
 */
export function extractImageFromClipboardEvent(event: ClipboardEvent): File | null {
  const clipboardData = event.clipboardData;
  if (!clipboardData) return null;

  if (clipboardData.items && clipboardData.items.length > 0) {
    for (let i = 0; i < clipboardData.items.length; i++) {
      const item = clipboardData.items[i];
      if (item && (item.type.indexOf("image") !== -1 || item.kind === "file")) {
        const file = item.getAsFile();
        if (file && (file.type.startsWith("image/") || file.size > 0)) {
          return file;
        }
      }
    }
  }

  if (clipboardData.files && clipboardData.files.length > 0) {
    for (let i = 0; i < clipboardData.files.length; i++) {
      const file = clipboardData.files[i];
      if (file && (file.type.startsWith("image/") || /\.(png|jpe?g|webp|bmp|gif|jfif|avif)$/i.test(file.name))) {
        return file;
      }
    }
  }

  return null;
}

/**
 * Lê imagem diretamente da área de transferência do sistema operacional.
 */
export async function readImageFromSystemClipboard(): Promise<{ file: File } | { error: string }> {
  if (!navigator.clipboard || !navigator.clipboard.read) {
    return {
      error: "Seu navegador não suporta leitura direta com um clique. Pressione Ctrl + V para colar.",
    };
  }

  try {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      const imageType = item.types.find((type) => type.startsWith("image/"));
      if (imageType) {
        const blob = await item.getType(imageType);
        const extension = imageType.split("/")[1] || "png";
        const file = new File(
          [blob],
          `captura-colada-${new Date().toISOString().slice(11, 19).replace(/:/g, "")}.${extension}`,
          { type: imageType }
        );
        return { file };
      }
    }
    return {
      error: "Nenhuma imagem foi encontrada na área de transferência. Use Win+Shift+S ou Ctrl+C em uma imagem antes de colar.",
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "";
    if (message.includes("permission") || message.includes("denied") || message.includes("NotAllowedError")) {
      return {
        error: "Permissão de área de transferência recusada. Use o atalho Ctrl + V diretamente na tela.",
      };
    }
    return {
      error: "Não foi possível acessar a área de transferência. Pressione Ctrl + V diretamente na página.",
    };
  }
}
