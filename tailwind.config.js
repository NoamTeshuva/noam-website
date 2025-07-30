/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './public/index.html'
  ],
  theme: {
    extend: {
      colors: {
        // Legacy colors for backward compatibility
        bloombergBg: '#000000',
        bloombergAccent: '#FF6600',
        
        bloomberg: {
          // Core Background Colors
          primary: '#000000',        // Pure black - main background
          secondary: '#0A0A0A',      // Slightly lighter black for panels
          panel: '#1A1A1A',         // Panel backgrounds
          header: '#2D2D2D',        // Header bars and navigation
          
          // Bloomberg Signature Colors
          orange: {
            DEFAULT: '#FF6600',      // Classic Bloomberg orange
            bright: '#FF7700',       // Hover states
            muted: '#CC5500',        // Disabled states
            glow: '#FF6600CC',       // Glowing effects (with opacity)
          },
          
          // Text Colors
          text: {
            primary: '#FFFFFF',      // Main white text
            secondary: '#CCCCCC',    // Secondary information
            muted: '#999999',        // Labels and descriptions
            disabled: '#555555',     // Disabled text
            orange: '#FF6600',       // Orange highlights in text
          },
          
          // Data Colors (Financial) - Authentic Bloomberg
          data: {
            positive: '#006600',     // Dark green for gains (authentic Bloomberg)
            negative: '#990000',     // Burgundy/red for losses (authentic Bloomberg)
            neutral: '#666666',      // Medium gray for unchanged/neutral
            volume: '#00BFFF',       // Sky blue for volume indicators
            bid: '#66CDAA',          // Medium aquamarine for bid prices
            ask: '#FF8C00',          // Dark orange for ask prices
          },
          
          // UI Element Colors
          border: {
            DEFAULT: '#333333',      // Standard borders
            bright: '#555555',       // Highlighted borders
            orange: '#FF6600',       // Orange accented borders
            subtle: '#1A1A1A',       // Very subtle separators
          },
          
          // Interactive States
          button: {
            DEFAULT: '#2D2D2D',      // Default button background
            hover: '#404040',        // Hover state
            active: '#FF6600',       // Active/pressed state
            disabled: '#1A1A1A',     // Disabled state
          },
          
          // Status Colors
          status: {
            connected: '#00FF00',    // Live data connection
            connecting: '#FFFF00',   // Connecting state
            error: '#FF3333',        // Error/disconnected
            warning: '#FFA500',      // Warning states
          },
          
          // Authentic Bloomberg UI Colors
          selected: '#0033CC',       // Royal blue for selected rows
          activeTab: '#FF8C00',      // Bright orange for active tabs
          
          // Metric Bullet Colors
          metrics: {
            sales: '#00BFFF',          // Sky Blue
            transactions: '#FFD700',    // Gold
            customers: '#66CDAA',       // Medium Aquamarine
            avgTransaction: '#DC143C',  // Crimson
            transPerCustomer: '#FF8C00', // Dark Orange
            salesPerCustomer: '#DA70D6', // Orchid
          },
          
          // Input Fields
          input: {
            bg: '#1A1A1A',           // Input background
            border: '#333333',       // Input border
            focus: '#FF6600',        // Focused input border
            placeholder: '#666666',   // Placeholder text
          },
        }
      },
      fontFamily: {
        'bloomberg-mono': ['SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'monospace'],
        'bloomberg-sans': ['Bloomberg Sans', 'Arial', 'Helvetica', 'sans-serif'],
      },
      fontSize: {
        'terminal-xs': ['10px', '12px'],    // Small data labels
        'terminal-sm': ['11px', '13px'],    // Secondary data
        'terminal-base': ['12px', '14px'],  // Primary data text
        'terminal-lg': ['14px', '16px'],    // Headers
        'terminal-xl': ['16px', '18px'],    // Large price displays
        'terminal-2xl': ['20px', '22px'],   // Featured prices
      },
      spacing: {
        'terminal-xs': '2px',    // Tight spacing for data rows
        'terminal-sm': '4px',    // Small gaps
        'terminal-md': '8px',    // Standard spacing
        'terminal-lg': '12px',   // Section spacing
        'terminal-xl': '16px',   // Panel spacing
      },
      borderRadius: {
        'terminal': '2px',       // Subtle rounding
        'terminal-lg': '4px',    // Slightly more rounded for panels
      }
    },
  },
  plugins: [],
};
