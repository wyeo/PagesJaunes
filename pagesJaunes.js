const ObjectsToCsv = require('objects-to-csv');
const puppeteer = require('puppeteer');
const prompt = require("prompt-async");
const { verifyTermsOfServices, getNumberOfPagesToScrap, getPagesInformations, getCompanyBossName, getPageUrl} = require('./src/services');

const chromeOptions = {
  headless: false,
  defaultViewport: null,
  slowMo: 10,
};

(async () => {
  // INIT PROGRAM
  console.log('--- Initialisation ---');
  let businesses = {
    businessList: [],
    pageUrl: '',
  };
  prompt.start();

  
  // GET PAGE URL
  const pageURL = await getPageUrl();


  // LAUNCH CHROMIUM
  const browser = await puppeteer.launch(chromeOptions);
  const page = await browser.newPage();
  console.log("--- Connexion à l'url spécifié ---");
  await page.goto(pageURL);


  // ASK TO CONFRIM CAPTCHA
  await prompt.get(["Confirmez que vous êtes humain, puis appuyez sur une touche. Si il n'y a pas besoin, appuyez sur une touche"]);


  // AGREE TERMS OF SERVICES
  verifyTermsOfServices(page);


  // PROMPT FOR NUMBER OF PAGES TO SCRAP
  const numberAsked = await getNumberOfPagesToScrap(page);


  // GET PAGES INFOS
  businesses = await getPagesInformations(businesses, page, numberAsked);


  // GET COMPANY INFOS
  businesses = await getCompanyBossName(businesses, page);


  // EXPORT CSV
  console.log("--- Exportation CSV ---");
  const csv = new ObjectsToCsv(businesses.businessList);
  await csv.toDisk('./result.csv');


  // CLOSE CHROMIUM
  await browser.close();


  console.log("--- Terminé ---");
})();