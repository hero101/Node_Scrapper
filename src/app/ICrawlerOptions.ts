export interface ICrawlerOptions {
  timeBetweenRequests?: number;
  workers?: number;
  fileOutputPath?: string;
  ignoreExternal?: boolean;
  debug?: boolean;
}