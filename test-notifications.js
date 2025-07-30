// Test script to manually trigger volume spike notifications
// Run this in the browser console to test the notification system

console.log('🧪 Testing Volume Spike Notification System');

// Import necessary modules (if available in browser)
if (typeof window.testVolumeSpike === 'undefined') {
  window.testVolumeSpike = () => {
    // Simulate a volume spike event
    const testEvent = {
      symbol: 'AAPL',
      type: 'volume_spike',
      todayVolume: 50000000,
      averageVolume14d: 20000000,
      ratio: 2.5,
      timestamp: new Date().toISOString()
    };

    // Try to find the toast system in the app
    const event = new CustomEvent('volumeSpike', { detail: testEvent });
    window.dispatchEvent(event);

    console.log('📢 Test volume spike event dispatched:', testEvent);
    
    // Alternative: directly call the notification if available
    if (window.showNotification) {
      window.showNotification(`🚨 ${testEvent.symbol} Volume Spike Alert! Today: 50M (2.5x avg of 20M)`);
    }
  };
}

// Test the watchlist store if available
if (typeof window.testWatchlist === 'undefined') {
  window.testWatchlist = () => {
    console.log('📊 Testing Watchlist Store Functions...');
    
    // These functions should be available if the store is working
    const testSymbol = 'TSLA';
    
    console.log('Current watchlist:', window.getWatchlist?.() || 'Store not available');
    console.log('Adding TSLA:', window.addToWatchlist?.(testSymbol) || 'Function not available');
    console.log('Updated watchlist:', window.getWatchlist?.() || 'Store not available');
    console.log('Removing TSLA:', window.removeFromWatchlist?.(testSymbol) || 'Function not available');
    console.log('Final watchlist:', window.getWatchlist?.() || 'Store not available');
  };
}

// Instructions
console.log(`
🎯 To test the system:

1. Open http://localhost:3000/bloomberg in your browser
2. Login if required
3. Open Developer Console (F12)
4. Run these commands:

   // Test volume spike notification
   testVolumeSpike()
   
   // Test watchlist functions  
   testWatchlist()

5. Check that:
   ✅ Watchlist sidebar opens/closes
   ✅ You can add/remove symbols
   ✅ Real-time prices update
   ✅ Toast notifications appear
   ✅ Volume spike alerts work

6. The app should be monitoring every 15 minutes for real volume spikes!
`);