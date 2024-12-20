import { PDFDocument, PDFName, PDFPage, PDFString, rgb } from "pdf-lib";
import questionsLink from "./data.json";
import fs from "fs/promises";

const pdfDoc = await PDFDocument.create();

for (let i = 0; i < questionsLink.length; i++) {
  const questionLink = questionsLink[i];

  const imageBytes = await fs.readFile(questionLink.path);
  const image = await pdfDoc.embedPng(new Uint8Array(imageBytes));

  const imgWidth = image.width;
  const imgHeight = image.height;

  // Create a new page in the PDF with the dimensions of the image
  const pdfPage = pdfDoc.addPage([imgWidth, imgHeight + 50]);
  // const pdfPage = pdfDoc.addPage();

  const titleXPos = 10;
  const titleYPos = pdfPage.getHeight() - 30;

  pdfPage.drawImage(image, {
    x: 0,
    y: 0,
    width: imgWidth,
    height: imgHeight,
  });

  pdfPage.drawText(questionLink.text, {
    size: 30,
    color: rgb(0, 0, 1),
    x: titleXPos,
    y: titleYPos,
  });

  // const link = createPageLinkAnnotation(pdfPage, questionLink.link);
  const link = pdfPage.doc.context.register(
    pdfPage.doc.context.obj({
      Type: "Annot",
      Subtype: "Link",
      Rect: [titleXPos - 4, titleYPos - 8, imgWidth - 4, imgHeight + 47], // xPos, yPos, secondXPos, secondYPos
      Border: [0, 0, 2],
      C: [0, 0, 1],
      A: {
        Type: "Action",
        S: "URI",
        URI: PDFString.of(questionLink.link),
      },
    }),
  );

  pdfPage.node.set(PDFName.of("Annots"), pdfDoc.context.obj([link]));
}

const pdfBytes = await pdfDoc.save();
await fs.writeFile(
  "exam-topics/google-professional-cloud-developer.pdf",
  pdfBytes,
);
