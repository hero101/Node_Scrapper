import { RequestPromiseOptions } from 'request-promise-native';
import { ICrawlerOptions }  from '@app/ICrawlerOptions';
import ICrawlerResult from '@app/ICrawlerResult';

import * as chr from 'cheerio';

const rp = require('request-promise-native');
const cheerio = require('cheerio');

export default class Crawler {
  /**
   * Set of urls to be visited.
   * Unique urls only
   */
  private queue: Set<string>;

  private isActive: boolean;
  private readonly baseUrl: string;

  private visitedCount: number;

  private requestOptions: RequestPromiseOptions = {
    transform: (body: string) => cheerio.load(body),
  };

  private options: ICrawlerOptions;

  /**
   *
   * @param baseUrl Url to start from.
   * Also use it to not crawl external sites.
   * @param options Options for the crawling process
   * Default 1000
   */
  constructor(baseUrl: string, options: ICrawlerOptions = {
    linkSelectors: [],
    fnLinks: () => {},

    contentSelectors: [],
    fnContent: () => {},

    timeBetweenRequests: 1000,
    workers: 10,
    ignoreExternal: false,
  }) {
    this.baseUrl = baseUrl;

    this.queue = new Set([baseUrl]);

    this.visitedCount = 0;

    this.options = options;
    // options validation
    if (!this.options.linkSelectors.length) {
      throw new Error('link selectors option missing');
    }

    this.printDebug(`Time between requests set to ${this.options.timeBetweenRequests}`);

    this.isActive = false;
  }

  /**
   * Returns and removes the first element of the queue
   */
  public getFromQueue(): string {
    const tempArr = Array.from(this.queue);
    const firstUrl = tempArr.shift() as string;

    this.queue = new Set(tempArr);

    return firstUrl;
  }

  /**
   * Adds a link or array of links to the end of the queue
   * @param url
   */
  public addToQueue(url: string | string[]) {
    if (!url) {
      return;
    }

    if (typeof (url) === 'string') {
      if (this.options.ignoreExternal) {
        if (url.startsWith('http') && !url.includes(this.baseUrl)) {
          return;
        }
      }

      let newUrl = url;

      if (!url.includes(this.baseUrl)) {
        newUrl = this.baseUrl + url;
      }

      this.queue.add(newUrl);
    } else {
      url.forEach((u) => {
        if (this.options.ignoreExternal) {
          if (u.startsWith('http') && !u.includes(this.baseUrl)) {
            return;
          }
        }

        let newUrl = u;

        if (!newUrl.includes(this.baseUrl)) {
          newUrl = this.baseUrl + u;
        }

        this.queue.add(newUrl);
      });
    }
  }

  public start(): void {
    this.isActive = true;

    this.work();
  }

  public pause(): void {
    this.isActive = false;
  }

  private work(): void {
    for (let workerId = 0; workerId < (this.options.workers as number); workerId += 1) {
      this.startWorker();
    }
  }

  private startWorker(): void {
    this.printDebug(`On queue ${this.queue.size} :: Visited ${this.visitedCount}`);

    const url = this.getFromQueue();

    if (url) {
      this.crawl(url)
        .then((results: {
          linkSelection: ICrawlerResult[];
          contentSelection: ICrawlerResult[];
        }) => {
          this.options.fnLinks(results.linkSelection);
          this.options.fnContent(results.contentSelection);
        });
    }

    setTimeout(() => this.startWorker(), this.options.timeBetweenRequests);
  }

  /**
   * On resolve returns array of crawled {@link CheerioElement}
   * @param url To be crawled from
   */
  private crawl(url: string) {
    return rp(url, this.requestOptions)
      .then(
        (result: CheerioStatic) => this.onSuccess(result),
        (err: Error) => this.onError(err, url))
      .catch((err: Error) => this.onError(err, url));
  }

  private onSuccess(result: CheerioStatic): {
    linkSelection: ICrawlerResult[],
    contentSelection: ICrawlerResult[],
  } {
    this.visitedCount += 1;

    const linkSelection = this.cssSelection(result, this.options.linkSelectors);
    // @ts-ignore
    const contentSelection = this.cssSelection(result, this.options.contentSelectors);

    return { linkSelection, contentSelection };
  }

  private cssSelection(result: CheerioStatic, cssSelectors: string[]): ICrawlerResult[] {
    return cssSelectors
      .map((selector) => {
        return {
          selector,
          elements: result(selector).toArray(),
        };
      });
  }

  private onError(err: Error, url: string): never {
    console.error(`Crawling webpage @ ${url} encountered an error: ${err}`);

    throw err;
  }

  private printDebug(msg: string): void {
    if (this.options.debug) {
      console.log(msg);
    }
  }
}