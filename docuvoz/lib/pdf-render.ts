import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

function wrapText(text: string, maxChars: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    if (nextLine.length > maxChars) {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    } else {
      currentLine = nextLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

export async function renderSpanishPdf(params: {
  title: string;
  translatedText: string;
  summary: string;
  summaryBullets: string[];
}) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage([612, 792]);
  let cursorY = 750;
  const left = 50;
  const right = 562;
  const lineHeight = 18;

  const ensureSpace = (neededLines = 1) => {
    if (cursorY - neededLines * lineHeight < 60) {
      page = pdfDoc.addPage([612, 792]);
      cursorY = 750;
    }
  };

  page.drawText(params.title, {
    x: left,
    y: cursorY,
    size: 18,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.1),
  });
  cursorY -= 34;

  page.drawText("Resumen en espanol", {
    x: left,
    y: cursorY,
    size: 13,
    font: boldFont,
    color: rgb(0.2, 0.2, 0.2),
  });
  cursorY -= 24;

  for (const line of wrapText(params.summary, 82)) {
    ensureSpace();
    page.drawText(line, {
      x: left,
      y: cursorY,
      size: 11,
      font,
      color: rgb(0.15, 0.15, 0.15),
    });
    cursorY -= lineHeight;
  }

  if (params.summaryBullets.length > 0) {
    cursorY -= 8;
    for (const bullet of params.summaryBullets) {
      for (const [index, line] of wrapText(bullet, 76).entries()) {
        ensureSpace();
        page.drawText(index === 0 ? `- ${line}` : `  ${line}`, {
          x: left,
          y: cursorY,
          size: 11,
          font,
          color: rgb(0.15, 0.15, 0.15),
        });
        cursorY -= lineHeight;
      }
    }
  }

  cursorY -= 18;
  ensureSpace(2);
  page.drawText("Traduccion completa", {
    x: left,
    y: cursorY,
    size: 13,
    font: boldFont,
    color: rgb(0.2, 0.2, 0.2),
  });
  cursorY -= 24;

  for (const paragraph of params.translatedText.split(/\n+/)) {
    const lines = wrapText(paragraph, 82);
    if (lines.length === 0) {
      cursorY -= lineHeight;
      continue;
    }

    for (const line of lines) {
      ensureSpace();
      page.drawText(line, {
        x: left,
        y: cursorY,
        size: 11,
        font,
        color: rgb(0.15, 0.15, 0.15),
        maxWidth: right - left,
      });
      cursorY -= lineHeight;
    }

    cursorY -= 6;
  }

  return Buffer.from(await pdfDoc.save());
}
