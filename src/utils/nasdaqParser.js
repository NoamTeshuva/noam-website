/**
 * Parse NASDAQ ticker list file
 * Format: Symbol|Security Name|Market Category|Test Issue|Financial Status|Round Lot Size|ETF|NextShares
 *
 * To update the list, run:
 * curl -s https://www.nasdaqtrader.com/dynamic/symdir/nasdaqlisted.txt -o public/nasdaqlisted.txt
 */

export const parseNasdaqList = async (fileUrl) => {
  try {
    const response = await fetch(fileUrl);
    const text = await response.text();
    const lines = text.split('\n');

    // Skip header and footer
    const tickers = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('File Creation Time')) continue;

      const parts = line.split('|');
      if (parts.length < 8) continue;

      const ticker = {
        symbol: parts[0],
        name: parts[1],
        category: parts[2],
        testIssue: parts[3],
        financialStatus: parts[4],
        roundLotSize: parts[5],
        etf: parts[6] === 'Y',
        nextShares: parts[7] === 'Y'
      };

      // Filter out test issues
      if (ticker.testIssue !== 'Y') {
        tickers.push(ticker);
      }
    }

    return tickers;
  } catch (error) {
    console.error('Error parsing NASDAQ list:', error);
    throw error;
  }
};

/**
 * Filter tickers by search query
 */
export const filterTickers = (tickers, query) => {
  if (!query) return tickers;

  const lowerQuery = query.toLowerCase();
  return tickers.filter(ticker =>
    ticker.symbol.toLowerCase().includes(lowerQuery) ||
    ticker.name.toLowerCase().includes(lowerQuery)
  );
};

/**
 * Filter options
 */
export const FILTER_OPTIONS = {
  ALL: 'all',
  STOCKS: 'stocks',
  ETFS: 'etfs'
};

/**
 * Apply filter type
 */
export const applyFilter = (tickers, filterType) => {
  switch (filterType) {
    case FILTER_OPTIONS.STOCKS:
      return tickers.filter(t => !t.etf);
    case FILTER_OPTIONS.ETFS:
      return tickers.filter(t => t.etf);
    case FILTER_OPTIONS.ALL:
    default:
      return tickers;
  }
};
