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
  ensureSpace(2);
  page.drawText("Traduccion completa", {
    x: left,
    y: cursorY,
    size: 13,
    font: boldFont,
    color: rgb(0.2, 0.2, 0.2),
  });
  cursorY -= 24;

  for (const rawLine of params.translatedText.split("\n")) {
    const line = rawLine.replace(/\t/g, "    ").trimEnd();

    if (!line.trim()) {
      cursorY -= lineHeight;
      continue;
    }

    const isHeading =
      line.length < 70 &&
      (line === line.toUpperCase() ||
        line.endsWith(":") ||
        /^\d+(\.\d+)*[\).\s]/.test(line));
    const isBullet = /^[-*•]\s+/.test(line);
    const indent = isBullet ? left + 12 : left;
    const content = isBullet ? line.replace(/^[-*•]\s+/, "• ") : line;
    const maxChars = isBullet ? 76 : 82;
    const activeFont = isHeading ? boldFont : font;
    const activeSize = isHeading ? 11.5 : 11;

    const lines = wrapText(content, maxChars);

    for (const line of lines) {
      ensureSpace();
      page.drawText(line, {
        x: indent,
        y: cursorY,
        size: activeSize,
        font: activeFont,
        color: rgb(0.15, 0.15, 0.15),
        maxWidth: right - left,
      });
      cursorY -= lineHeight;
    }

    cursorY -= isHeading ? 8 : 6;
  }

  return Buffer.from(await pdfDoc.save());
}
