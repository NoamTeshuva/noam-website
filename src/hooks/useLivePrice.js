import { useState, useEffect } from 'react';
import { twelveDataAPI } from '../utils/api';

export default function useLivePrice(symbol) {
  const [priceData, setPriceData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!symbol) return;

    let intervalId;

    const fetchPrice = async () => {
      try {
        setIsLoading(true);
        const quote = await twelveDataAPI.getQuote(symbol);
        setPriceData({
          price: quote.price,
          change: quote.change,
          changePercent: parseFloat(quote.changePercent),
          volume: quote.volume,
          lastUpdated: new Date()
        });
      } catch (error) {
        console.error(`Error fetching price for ${symbol}:`, error);
        // Keep existing data on error
      } finally {
        setIsLoading(false);
      }
    };
    
    // Fetch immediately
    fetchPrice();
    
    // Then fetch every 30 seconds
    intervalId = setInterval(fetchPrice, 30000);
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [symbol]);
  
  return priceData;
} 