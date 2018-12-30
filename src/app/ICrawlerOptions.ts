import ICrawlerResult from '@app/ICrawlerResult';

export interface ICrawlerOptions {
  /**
   * Array of css selectors to fetch links
   */
  linkSelectors: string[];
  /**
   * Function to manage the crawled elements from {@link linkSelectors}.
   * The processed links should be added to the queue via {@link Crawler.addToQueue}
   * Results are represented in array of {@link ICrawlerResult}
   */
  fnLinks(result: ICrawlerResult[]): void;
  /**
   * Array of cs selectors to be executed on every link
   */
  contentSelectors: string[];
  /**
   * Function to manage the crawled elements from {@link contentSelectors}.
   * Results are represented in array of {@link ICrawlerResult}
   */
  fnContent(result: ICrawlerResult[]): void;
  /**
   * How much time to wait before
   * the next set of workers are dispatched
   */
  timeBetweenRequests?: number;
  /**
   * Number of requests after each {@link timeBetweenRequests}
   */
  workers?: number;
  /**
   * Ignores the external links outside the base URL
   */
  ignoreExternal?: boolean;
  /**
   * Enables printing of debug messages in the console via {@link console.info}
   */
  debug?: boolean;
}