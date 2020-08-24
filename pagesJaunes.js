const ObjectsToCsv = require('objects-to-csv');
const puppeteer = require('puppeteer');
const prompt = require("prompt-async");

const chromeOptions = {
  headless: false,
  defaultViewport: null,
  slowMo: 10,
};

(async () => {
  console.log('--- Initialisation ---');
  prompt.start();
  console.log('URL de la recherche Page Jaune. Mettez vous sur la première page de recherche ! Ex: https://www.pagesjaunes.fr/annuaire/chercherlespros?quoiqui=restaurant%20%C3%A0%20emporter&ou=Paris&idOu=L07505600&page=1&contexte=gHJHEY0R3Vwat1cA29bH2QxISMRndNFsTX8Pg%2Byl0iE%3D&proximite=0&carte=0&quoiQuiInterprete=restaurant%20%C3%A0%20emporter')
  const { pageURL }  = await prompt.get(['pageURL']);
  const browser = await puppeteer.launch(chromeOptions);
  const page = await browser.newPage();
  console.log("--- Connexion à l'url spécifié ---");
  await page.goto(pageURL);

  const confirmHuman = await prompt.get(["Confirmez que vous êtes humain, puis appuyez sur une touche. Si il n'y a pas besoin, appuyez sur une touche"]);

  // AGREE TERMS OF SERVICES
  console.log("--- Confirmation de la popup 'Terms of Services' ---");
  try {
    await page.evaluate(() => document.getElementById('didomi-notice-agree-button').click());
  }
  catch {
  }

  // GET PAGES
  const pageNumber = await page.evaluate(() => document.getElementById('SEL-compteur').textContent);
  console.log(`Il y a ${pageNumber.split('/')[1]} pages. Indiquez combien vous voulez en récupérer`)
  const result = await prompt.get(['Pages à récupérer']);

  // GET PAGES INFOS
  console.log("--- Récupération des informations ---");
  let pageToScrap = +result['Pages à récupérer'];
  let currentPage = 1;
  let businesses = {
    businessList: [],
    pageUrl: '',
  };
  while (currentPage <= pageToScrap) {
    // Indicate Page
    console.log(await page.evaluate(() => document.getElementById('SEL-compteur').textContent.split('/')[0] + ` / ${pageToScrap}`));
    
    businesses = await page.evaluate(async (businesses) => {
      Object.values(document.getElementsByClassName('bi-bloc blocs')).forEach((business) => {
        const title = document.querySelector(`#${business.id} > div > header > div > div > h3 > a.denomination-links.pj-link`).textContent;
        const address = document.querySelector(`#${business.id} > div > header > div > div > a`).textContent;
        let prestations = document.querySelector(`#bi-desc-${business.id.split('-')[2].split(' ')[0]} > div.zone-cvi-cviv > p.cviv.cris`);
        let tel = document.querySelector(`#${business.id} > div > footer > ul.main-contact-container > li > div > div > strong`);
        
        tel === null && ( tel = ' ' );
        prestations === null && ( prestations = ' ' );
    
        let website = '';
        try {
          website = JSON.parse(document.querySelector(
            `#bi-contact-${business.id.split('-')[2].split(' ')[0]} > ul.barre-liens-contact > li.item.hidden-phone.site-internet.SEL-internet > a`
          ).getAttribute('data-pjlb'));
          website = atob(website.url);
        }
        catch {
          const websites = document.querySelector(`#bi-sites-internet-${business.id.split('-')[2].split(' ')[0]}`);
          if (websites === null) {
            website = ' ';
          } else {
            Object.values(websites.children).forEach((_website) => {
              website += '\n' + atob(JSON.parse(_website.children[0].getAttribute('data-pjlb')).url);
            });
          }
        }
    
        businesses.businessList.push({
          Nom: title.replace(/[\n]/g, ' '),
          Adresse: address.replace(/[\n]/g, ' '),
          Prestations: prestations !== ' ' && prestations.textContent.replace(/[\n]/g, ' ') || ' ',
          Tel: tel !== ' ' && tel.textContent.replace(/[\n]/g, ' ') || ' ',
          Website: website.replace(/[\n]/g, ' '),
        });
      });

      try {
        businesses.pageUrl = `https://www.pagesjaunes.fr` + atob(JSON.parse(document.getElementsByClassName('link_pagination next pj-lb pj-link')[0].getAttribute('data-pjlb')).url);
      } catch {
        businesses.pageUrl = `https://www.pagesjaunes.fr`;
      }
      return businesses;
    }, businesses);

    await page.goto(businesses.pageUrl);
    currentPage += 1;
  }

  // EXPORT CSV
  console.log("--- Exportation CSV ---");
  const csv = new ObjectsToCsv(businesses.businessList);
  await csv.toDisk('./result.csv');
  await browser.close();

  console.log("--- Terminé ---");
})();