import puppeteer from "puppeteer";

const baseQuestionLink =
  "https://www.examtopics.com/discussions/google/view/117343-exam-professional-cloud-security-engineer-topic-1-question/";

const browser = await puppeteer.launch();
const page = await browser.newPage();

await goToPage(baseQuestionLink);
await clickShowAnswer();
await screenshotPagePortion();

async function goToPage(fullUrl: string): Promise<void> {
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
      `\rElapsed time going to page '${fullUrl}': ${timeString}`,
    );
  }, 1000);
  await page.goto(fullUrl, { waitUntil: "networkidle2" });

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

async function screenshotPagePortion(): Promise<void> {
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
    await element.screenshot({ path: "exam-topics/images/question.png" });
  } else {
    console.log("\nUnable to screenshot!");
  }
  clearInterval(interval);
}
