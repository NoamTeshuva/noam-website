// CSS class name utilities for WatchlistSidebar components

export const sidebarStyles = {
  // Main sidebar container - full width on mobile, fixed width on larger screens
  container: "fixed left-0 top-0 h-full w-full sm:w-80 bg-bloomberg-primary border-r border-bloomberg-border z-40 flex flex-col",

  // Overlay for mobile/tablet
  overlay: "fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden",
  
  // Toggle button when closed - larger touch target on mobile
  toggleButton: "bg-bloomberg-panel border border-bloomberg-border rounded-r-terminal p-3 sm:p-3 text-bloomberg-orange hover:bg-bloomberg-button transition-colors shadow-lg min-h-[44px] min-w-[44px] flex items-center justify-center",

  // Header section
  header: "p-3 sm:p-4 border-b border-bloomberg-border",
  headerTitle: "text-bloomberg-orange font-bold text-base sm:text-lg font-bloomberg-mono",

  // Search input - larger on mobile for touch
  searchInput: `w-full bg-bloomberg-input-bg border border-bloomberg-input-border
               text-bloomberg-text-primary placeholder-bloomberg-input-placeholder
               px-3 py-3 sm:py-2 rounded-terminal focus:outline-none focus:border-bloomberg-orange
               disabled:opacity-50 disabled:cursor-not-allowed text-base sm:text-sm`,
  
  // Search results dropdown
  searchResults: "absolute top-full left-0 right-0 mt-1 bg-bloomberg-panel border border-bloomberg-border rounded-terminal shadow-lg z-50",
  
  // Loading spinner
  spinner: "animate-spin rounded-full h-4 w-4 border-b-2 border-bloomberg-orange",
  
  // Error message
  errorMessage: "absolute top-full left-0 right-0 mt-1 p-2 bg-bloomberg-status-error text-white text-xs rounded-terminal",
  
  // Empty state
  emptyState: "text-center text-bloomberg-text-secondary py-8",
  
  // Footer
  footer: "p-4 border-t border-bloomberg-border"
};

export const itemStyles = {
  // Watchlist item container - larger padding on mobile
  container: "bg-bloomberg-secondary rounded-terminal p-3 sm:p-3 border border-bloomberg-border hover:border-bloomberg-orange transition-colors",

  // Symbol header
  symbolHeader: "flex items-center space-x-2 flex-wrap gap-1",
  symbolText: "font-bloomberg-mono font-bold text-sm sm:text-sm text-bloomberg-text-primary",

  // Peer count button - larger touch target
  peerButton: "text-xs text-bloomberg-text-muted hover:text-bloomberg-orange transition-colors py-1 px-1",
  peerButtonFallback: "text-xs text-yellow-400 hover:text-yellow-300 transition-colors py-1 px-1",

  // Remove button - larger touch target
  removeButton: "text-bloomberg-text-muted hover:text-bloomberg-status-error transition-colors p-1 min-h-[32px] min-w-[32px] flex items-center justify-center",

  // Confirm delete buttons - larger on mobile
  confirmButton: "text-xs bg-bloomberg-status-error text-white px-3 py-2 sm:px-2 sm:py-1 rounded min-h-[32px]",
  cancelButton: "text-xs bg-bloomberg-text-muted text-white px-3 py-2 sm:px-2 sm:py-1 rounded min-h-[32px]",
  
  // Price display
  priceText: "font-bloomberg-mono text-sm text-bloomberg-text-primary",
  positiveChange: "text-xs text-bloomberg-data-positive",
  negativeChange: "text-xs text-bloomberg-data-negative",
  neutralChange: "text-xs text-bloomberg-data-neutral",
  
  // Loading state
  loadingText: "text-xs text-bloomberg-text-muted",
  
  // Peers section
  peersSection: "mt-2 pt-2 border-t border-bloomberg-border-subtle",
  peersLabel: "text-xs text-bloomberg-text-muted mb-1",
  peersContainer: "flex flex-wrap gap-1",
  
  // Peer detail panel
  peerDetail: "mt-2 p-2 bg-bloomberg-panel rounded text-xs",
  peerSymbol: "font-bold text-bloomberg-orange",
  peerName: "text-bloomberg-text-secondary",
  peerSector: "text-bloomberg-text-muted",
  
  // Loading and error states for peers
  peerLoading: "text-xs text-bloomberg-text-muted animate-pulse",
  peerError: "text-xs text-bloomberg-status-error",
  retryButton: "text-xs text-bloomberg-orange hover:text-bloomberg-orange-bright cursor-pointer underline"
};

export const pillStyles = {
  // Base pill styles
  base: "px-2 py-1 rounded text-xs font-mono transition-colors",
  
  // Normal state
  normal: "bg-bloomberg-button text-bloomberg-text-secondary hover:bg-bloomberg-orange hover:text-black",
  
  // Selected state
  selected: "bg-bloomberg-orange text-black",
  
  // Fallback data indicator
  fallback: "bg-yellow-600 text-yellow-100 hover:bg-yellow-500 hover:text-yellow-50",
  
  // Demo data indicator
  demo: "bg-gray-600 text-gray-300 hover:bg-gray-500 hover:text-gray-200"
};

export const searchResultStyles = {
  // Container - larger padding for touch
  container: "p-3 sm:p-3 hover:bg-bloomberg-button transition-colors border-b border-bloomberg-border last:border-b-0",

  // Symbol and company info
  symbol: "font-bloomberg-mono font-bold text-sm text-bloomberg-text-primary",
  name: "text-xs sm:text-xs text-bloomberg-text-secondary truncate",
  region: "text-xs text-bloomberg-text-muted",

  // Add button - larger touch target on mobile
  addButton: "ml-2 px-3 py-2 sm:px-2 sm:py-1 rounded text-xs font-bold transition-colors bg-bloomberg-orange text-black hover:bg-bloomberg-orange-bright min-h-[36px] sm:min-h-0",
  addButtonDisabled: "ml-2 px-3 py-2 sm:px-2 sm:py-1 rounded text-xs font-bold bg-bloomberg-text-muted text-bloomberg-text-secondary cursor-not-allowed min-h-[36px] sm:min-h-0",
  addButtonLoading: "ml-2 px-3 py-2 sm:px-2 sm:py-1 rounded text-xs font-bold bg-bloomberg-text-muted text-bloomberg-text-secondary cursor-wait min-h-[36px] sm:min-h-0"
};