import { RequestPromiseOptions } from 'request-promise';
import { ICrawlerOptions }  from './ICrawlerOptions';

const rp = require('request-promise-native');
const cheerio = require('cheerio');

const fs = require('fs');

import * as chr from 'cheerio';

export default class Crawler {
  /**
   * Set of urls to be visited.
   * Unique urls only
   */
  public queue: Set<string>;

  private isActive: boolean;
  private readonly baseUrl: string;

  private visitedCount: number;

  private requestOptions: RequestPromiseOptions = {
    transform: (body: string) => cheerio.load(body),
  };

  private selector = 'ul > li > article > a';

  private options: ICrawlerOptions = {};

  /**
   *
   * @param baseUrl Url to start from.
   * Also use it to not crawl external sites.
   * @param options Options for the crawling process
   * Default 1000
   */
  constructor(baseUrl: string, options: ICrawlerOptions = {
    timeBetweenRequests: 1000,
    workers: 10,
    fileOutputPath: '',
    ignoreExternal: false,
  }) {
    this.baseUrl = baseUrl;

    this.queue = new Set([baseUrl]);

    this.visitedCount = 0;

    this.options = options;

    if (this.options.debug) {
      console.info(`Time between requests set to ${this.options.timeBetweenRequests}`);
    }

    this.isActive = false;
  }

  public getFromQueue(): string {
    const tempArr = Array.from(this.queue);
    const firstUrl = tempArr.shift() as string;

    this.queue = new Set(tempArr);

    return firstUrl;
  }

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

      if (!this.queue.has(url)) {
        this.queue.add(newUrl);

        if (!this.options.fileOutputPath) {
          return;
        }

        fs.appendFile(this.options.fileOutputPath, url, (err: Error) => {
          if (err) {
            return console.error(err);
          }
        });
      }
    } else {
      url.forEach((u) => {
        if (this.options.ignoreExternal) {
          if (u.startsWith('http') && !u.includes(this.baseUrl)) {
            return;
          }
        }

        let url = u;

        if (!url.includes(this.baseUrl)) {
          url = this.baseUrl + u;
        }

        if (!this.queue.has(url)) {
          this.queue.add(url);

          if (!this.options.fileOutputPath) {
            return;
          }

          fs.appendFile(this.options.fileOutputPath, `${url}\n`, (err: Error) => {
            if (err) {
              return console.error(err);
            }
          });
        }
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
    if (this.options.debug) {
      console.info(`On queue ${this.queue.size}` +
      ` :: Visited ${this.visitedCount}` +
      ` :: Diff ${this.queue.size - this.visitedCount}`);
    }

    for (let workerId = 0; workerId < (this.options.workers as number); workerId += 1) {
      const url = this.getFromQueue();

      if (!url) {
        console.warn('Queue empty');

        setTimeout(() => {
          if (this.isActive) {
            this.work();
          }
        },         this.options.timeBetweenRequests);
        return;
      }

      this.crawl(url)
        .then(links => this.addToQueue(links))
        .catch(err => this.addToQueue(url));
    }

    setTimeout(() => {
      if (this.isActive) {
        this.work();
      }
    },         this.options.timeBetweenRequests);
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
    this.visitedCount += 1;

    return result(this.selector)
      .toArray()
      .map((el: CheerioElement) => el.attribs.href);
  }

  private onError(err: Error, url: string) {
    console.error(`Crawling webpage @ ${url} encountered an error: ${err}`);

    throw err;
  }
}