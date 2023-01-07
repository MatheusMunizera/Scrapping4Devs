import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CardEntity } from '../core/domain/entities/card.entity';
import { PersonEntity } from '../core/domain/entities/person.entity';
import { CardResponseMapper } from '../core/domain/mappers/card/card-response.mapper';
import { PersonResponseMapper } from '../core/domain/mappers/person/person-response.mapper';
import { CardResponse } from '../shared/dtos/card/card-response';
import { PersonResponseDto } from '../shared/dtos/person/person-response.dto';
import { BrandEnum } from '../shared/enum/brand.enum';

@Injectable()
export class ScraperService {
  @Inject(ConfigService)
  public baseUrl: string = process.env.BASE_URL_4DEVS;
  public config: ConfigService;

  constructor() {}

  //#region Private Methods
  
  private async defineChromePuppeterOptions() {
    let chrome: any = {};
    let puppeteer;

    if (process.env.AWS_LAMBDA_FUNCTION_VERSION) {
      chrome = require('chrome-aws-lambda');
      puppeteer = require('puppeteer-core');
    } else {
      puppeteer = require('puppeteer');
    }

    let options = {};

    if (process.env.AWS_LAMBDA_FUNCTION_VERSION) {
      options = {
        args: [
          ...chrome.args,
          '--hide-scrollbars',
          '--disable-web-security',
          '--no-sandbox',
        ],
        defaultViewport: chrome.defaultViewport,
        executablePath: await chrome.executablePath,
        headless: true,
        ignoreHTTPSErrors: true,
      };
    }

    return { chrome, puppeteer, options };
  }

  private async generateCard(brand: BrandEnum, page: any) {
    const generateCard = `gerar_cc('${brand}')`;
    await page.addScriptTag({ content: generateCard });

    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        const data = await page.evaluate(() => {
          const cardNumber =
            document.querySelector('#cartao_numero').textContent;
          const expirationDate =
            document.querySelector('#data_validade').textContent;
          const securityCode =
            document.querySelector('#codigo_seguranca').textContent;
          return { cardNumber, expirationDate, securityCode };
        });
        resolve(data);
      }, 1500);
    });
  }

  //#endregion

  //#region Public Methods
  async getPerson(): Promise<PersonResponseDto> {
    console.time('Scrapping Person');

    const { chrome, puppeteer, options } =
      await this.defineChromePuppeterOptions();

    const URL = `${process.env.BASE_URL_4DEVS}/gerador_de_pessoas`;
    const browser = await puppeteer.launch(options);
    const page = await browser.newPage();
    await page.goto(URL, { timeout: 0, waitUntil: 'domcontentloaded' });
    await page.evaluate(async () => {
      document.querySelector('#pontuacao_sim').setAttribute('value', 'N');
      document
        .querySelector('#bt_gerar_pessoa')
        .dispatchEvent(new CustomEvent('click'));
    });

    await page.waitForFunction(
      'document.querySelector("#dados_json").textContent.includes("nome")',
    );

    const results = await page.evaluate(async () => {
      const data = document.querySelector('#dados_json').textContent;

      return JSON.parse(data) as [PersonEntity];
    });

    const personResponseMapper = new PersonResponseMapper();

    var person = personResponseMapper.mapTo(results[0]);

    console.timeEnd('Scrapping Person');
    return person;
  }

  async getCard(brand: BrandEnum): Promise<CardResponse> {
    try {
      console.time('Scrapping Card');

      const { chrome, puppeteer, options } =
        await this.defineChromePuppeterOptions();

      const URL = `${process.env.BASE_URL_4DEVS}/gerador_de_numero_cartao_credito`;

      const browser = await puppeteer.launch({ headless: true });

      const page = await browser.newPage();

      await page.goto(URL, { timeout: 10000, waitUntil: 'domcontentloaded' });

      const result = await this.generateCard(brand, page);
      const cardResponseMapper = new CardResponseMapper();
      var card = cardResponseMapper.mapTo(result as CardEntity);
      card.brand = brand;
      console.log(card);
      console.timeEnd('Scrapping Card');
      return card;
    } catch (error) {
      console.timeEnd('Scrapping Card');
      console.log(error);
    }
  }

  //#endregion

 
}
