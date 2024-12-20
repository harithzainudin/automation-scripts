import puppeteer from "puppeteer";
import { PDFDocument, PDFName, PDFPage, PDFString, rgb } from "pdf-lib";
import fsPromises from "fs/promises";
// import * as fs from "fs";
import * as path from "path";

const baseUrl = "https://www.examtopics.com";

/**
 * Change this 3 value accordingly
 * keyword - the keyword that the crawler able to find in the title of the list of discussions page
 * folderName - Folder that you need to create manually first
 * basePage - the base page of the discussions
 */
const keyword = "Exam AWS Certified Solutions Architect - Associate SAA-C03";
const folderName = "aws-sa-associate";
const basePage = `${baseUrl}/discussions/amazon/1`;

const browser = await puppeteer.launch();
const page = await browser.newPage();
let pdfDoc = await PDFDocument.create();
const allQuestionsLink: TextAndLink[] = [];

await goToPage(basePage, "first page");
await logCurrentPage("span.discussion-list-page-indicator");

const questionsLink = await getQuestionsLink(baseUrl, keyword, folderName);
allQuestionsLink.push(...questionsLink);

// Start screenshot each questions
for (let i = 0; i < questionsLink.length; i++) {
  const questionLink = questionsLink[i];
  await goToPage(questionLink.link, questionLink.text);
  await clickShowAnswer();
  await screenshotPagePortion(questionLink.text, folderName);
}

// Going to previous page, to get the next page link
await goToPage(basePage, "going back to previous page");
let nextPageLink = await getNextPageLink(baseUrl);

while (nextPageLink) {
  console.log();
  await goToPage(nextPageLink, "next page");
  await logCurrentPage("span.discussion-list-page-indicator");
  const questionsLink = await getQuestionsLink(baseUrl, keyword, folderName);
  allQuestionsLink.push(...questionsLink);

  for (let i = 0; i < questionsLink.length; i++) {
    const questionLink = questionsLink[i];
    await goToPage(questionLink.link, questionLink.text);
    await clickShowAnswer();
    await screenshotPagePortion(questionLink.text, folderName);
  }

  await goToPage(nextPageLink, "going back to previous page");

  nextPageLink = await getNextPageLink(baseUrl);
}

// Start add all questions in pdf
pdfDoc = await addPdfPage(pdfDoc, folderName, allQuestionsLink);

const pdfBytes = await pdfDoc.save();
await fsPromises.writeFile(`exam-topics/${folderName}.pdf`, pdfBytes);
await browser.close();

async function addPdfPage(
  pdfDoc: PDFDocument,
  folderName: string,
  questionsLink: TextAndLink[],
): Promise<PDFDocument> {
  console.log();

  const files: string[] = await fsPromises.readdir(`exam-topics/${folderName}`);

  for (const fileName of files) {
    const filePath = path.join(folderName, fileName);
    const questionLink = questionsLink.find((i) => fileName.includes(i.text))!;
    console.log(`Adding page for ${questionLink.text}`);
    const imageBytes = await fsPromises.readFile(questionLink.path);
    const image = await pdfDoc.embedPng(new Uint8Array(imageBytes));

    const imgWidth = image.width;
    const imgHeight = image.height;

    // Create a new page in the PDF with the dimensions of the image with extra head room for title
    const pdfPage = pdfDoc.addPage([imgWidth, imgHeight + 50]);

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

  return pdfDoc;
}

async function screenshotPagePortion(
  fileName: string,
  folderName: string,
): Promise<void> {
  const selector =
    "body > div.sec-spacer.pt-50 > div > div:nth-child(5) > div > div.discussion-header-container";

  let totalSecondsElapsed = 0;

  const interval = setInterval(() => {
    totalSecondsElapsed++;

    const minutes = Math.floor(totalSecondsElapsed / 60);
    const seconds = totalSecondsElapsed % 60;

    let timeString = "";
    if (minutes > 0)
      timeString += `${minutes} minute${minutes > 1 ? "s" : ""} `;
    timeString += `${seconds} second${seconds > 1 ? "s" : ""}`;

    process.stdout.write(`\rScreenshot: ${timeString}`);
  }, 1000);

  // Wait for the element to be present on the page
  await page.waitForSelector(selector);

  const element = await page.$(selector);

  if (element) {
    const path = `exam-topics/${folderName}/${fileName}.png`;
    await element.screenshot({ path });
  } else {
    console.log("\nUnable to screenshot!");
  }
  clearInterval(interval);
}

async function clickShowAnswer(): Promise<void> {
  const selector =
    "body > div.sec-spacer.pt-50 > div > div:nth-child(5) > div > div.discussion-header-container > div.question-body.mt-3.pt-3.border-top > a.btn.btn-primary.reveal-solution";

  let totalSecondsElapsed = 0;
  console.log("\n");

  const interval = setInterval(() => {
    totalSecondsElapsed++;

    const minutes = Math.floor(totalSecondsElapsed / 60);
    const seconds = totalSecondsElapsed % 60;

    let timeString = "";
    if (minutes > 0)
      timeString += `${minutes} minute${minutes > 1 ? "s" : ""} `;
    timeString += `${seconds} second${seconds > 1 ? "s" : ""}`;

    process.stdout.write(`\rClicking show answer: ${timeString}`);
  }, 1000);

  await page.waitForSelector(selector);
  await page.click(selector);

  clearInterval(interval);
}

async function getQuestionsLink(
  baseUrl: string,
  keyword: string,
  folderName: string,
): Promise<TextAndLink[]> {
  const selector = "a.discussion-link";

  const links = await page.$$eval(selector, (elements) =>
    elements.map((element) => ({
      text: element.textContent?.trim()!,
      link: element.getAttribute("href"),
    })),
  );

  const updatedLinks: TextAndLink[] = [];

  links.forEach((i) => {
    if (i.text.includes(keyword)) {
      const match = i.text.match(/question (\d+)/);

      if (match) {
        const formattedNumber = match[1].toString().padStart(4, "0");
        const title = `Question #${formattedNumber}`;
        updatedLinks.push({
          text: title,
          link: `${baseUrl}${i.link}`,
          path: `exam-topics/${folderName}/${title}.png`,
        });
      } else {
        console.log("No question number found!!! recheck", i);
      }
    }
  });

  return updatedLinks;
}

async function goToPage(fullUrl: string, title: string): Promise<void> {
  let totalSecondsElapsed = 0;

  const interval = setInterval(() => {
    totalSecondsElapsed++;

    const minutes = Math.floor(totalSecondsElapsed / 60);
    const seconds = totalSecondsElapsed % 60;

    let timeString = "";
    if (minutes > 0)
      timeString += `${minutes} minute${minutes > 1 ? "s" : ""} `;
    timeString += `${seconds} second${seconds > 1 ? "s" : ""}`;

    process.stdout.write(
      `\rGoing to page '${fullUrl} for '${title}'': ${timeString}`,
    );
  }, 1000);
  await page.goto(fullUrl, { waitUntil: "networkidle2" });

  clearInterval(interval);
}

async function getNextPageLink(baseUrl: string): Promise<string | undefined> {
  let totalSecondsElapsed = 0;

  const interval = setInterval(() => {
    totalSecondsElapsed++;

    const minutes = Math.floor(totalSecondsElapsed / 60);
    const seconds = totalSecondsElapsed % 60;

    let timeString = "";
    if (minutes > 0)
      timeString += `${minutes} minute${minutes > 1 ? "s" : ""} `;
    timeString += `${seconds} second${seconds > 1 ? "s" : ""}`;

    process.stdout.write(`\rElapsed time get pagination page: ${timeString}`);
  }, 1000);

  // body > div.sec-spacer > div > div.action-row-container.mb-4 > div > span > span.pagination-nav.ml-4 > a
  const nextBtnSelector = "a.btn.btn-sm";
  const paginationLinks = await page.$$eval(nextBtnSelector, (elements) =>
    elements.map((el) => ({
      text: el.textContent?.trim() || "",
      link: el.getAttribute("href") || "",
    })),
  );

  clearInterval(interval);

  let haveNextPage = false;
  let nextPageLink;

  for (let i = 0; i < paginationLinks.length; i++) {
    const paginationLink = paginationLinks[i];
    if (paginationLink.text === "Next") {
      haveNextPage = true;
      nextPageLink = baseUrl + paginationLink.link;
      break;
    }
  }

  return nextPageLink;
}

async function logCurrentPage(selector: string): Promise<void> {
  const text = await page.$eval(selector, (el) =>
    el.textContent?.trim().replaceAll(/\s+/g, " "),
  );

  const match = text!.match(/Page \d+ of \d+/);

  if (match) console.log(`\n${match[0]}`);
  else console.log("No page information found!!");
}

type TextAndLink = {
  text: string;
  link: string;
  path: string;
};
