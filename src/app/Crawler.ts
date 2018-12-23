const rp = require('request-promise');
const cheerio = require('cheerio');
import * as chr from 'cheerio';

export default class Crawler {
  /**
   * Set of urls to be visited.
   * Unique urls only
   */
  public queue: Set<string>;

  private isActive: boolean;
  private baseUrl: string;

  private requestOptions = {
    transform: (body: string) => cheerio.load(body),
  };

  private selector = 'ul.news_tab_r_md>li>article>a';

  private wait: number;

  /**
   *
   * @param baseUrl Url to start from.
   * Also use it to not crawl external sites.
   * @param wait Time in miliseconds between each request.
   * Default 1000
   */
  constructor(baseUrl: string, wait: number = 1000) {
    this.baseUrl = baseUrl;
    this.queue = new Set().add(baseUrl);
    this.wait = wait;

    this.isActive = false;
  }

  public addToQueue(url: string | string[]) {
    if (typeof (url) === 'string') {
      this.queue.add(url);
    } else {
      url.forEach(u => this.queue.add(u));
    }
  }

  public start(): void {
    this.isActive = true;

    this.worker()
      .then(() => console.info('worker finished'))
      .catch(err => console.error(err));
  }

  public pause(): void {
    this.isActive = false;
  }

  private async worker(): Promise<any> {
    for (const url of this.queue) {
      if (!this.isActive) {
        return;
      }

      let crawledUrls = await this.crawl(url);

      crawledUrls = crawledUrls
        .map(url => this.baseUrl + url);

      this.addToQueue(crawledUrls);

      setTimeout(() => {},
                 this.wait);
    }
  }

  /**
   * On resolve returns array of crawled urls
   * @param url To be crawled from
   */
  private crawl(url: string): Promise<string[]> {
    return rp(url, this.requestOptions)
      .then(
        (result: CheerioStatic) => this.onSuccess(result),
        (err: Error) => this.onError(err, url))
      .catch((err: Error) => this.onError(err, url));
  }

  private onSuccess(result: CheerioStatic): string[] {
    return result(this.selector)
      .toArray()
      .map((el: CheerioElement) => el.attribs.href);
  }

  private onError(err: Error, url: string) {
    console.error(`Crawling webpage @ ${url} encountered an error: ${err}`);
  }
}