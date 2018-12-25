import Crawler from './src/app/Crawler';

const baseUrl = 'https://www.dunavmost.com/';

new Crawler(baseUrl, {
  timeBetweenRequests: 300,
  fileOutputPath: './data/links.txt',
  ignoreExternal: true,
  workers: 2,
}).start();