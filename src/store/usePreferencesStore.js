/**
 * User Preferences Store
 * Manages user settings and preferences with localStorage persistence
 * Syncs with cloud via syncManager
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const usePreferencesStore = create(
  persist(
    (set, get) => ({
      // Theme Settings
      theme: 'dark', // 'dark' or 'light'

      // Layout Settings
      layout: 'compact', // 'compact' or 'spacious'
      showPeersPanel: true,
      showTechnicalAnalysis: true,

      // Data Refresh Settings
      refreshInterval: 240000, // 4 minutes in milliseconds (default)
      autoRefresh: true,

      // Notification Settings
      enableNotifications: true,
      notificationDuration: 8000, // 8 seconds
      volumeSpikeThreshold: 2.0, // 2x average volume

      // Chart Settings
      defaultChartInterval: '1day',
      defaultChartPeriod: 90, // days
      showTechnicalIndicators: true,

      // API Settings
      showAPICounter: true,
      warnAtAPILimit: 600, // Warn when approaching 600/800 calls

      // Display Settings
      compactMode: false,
      fontSize: 'medium', // 'small', 'medium', 'large'

      // Actions

      /**
       * Set theme
       */
      setTheme: (theme) => {
        if (!['dark', 'light'].includes(theme)) {
          console.error('Invalid theme:', theme);
          return;
        }
        set({ theme });
      },

      /**
       * Set layout
       */
      setLayout: (layout) => {
        if (!['compact', 'spacious'].includes(layout)) {
          console.error('Invalid layout:', layout);
          return;
        }
        set({ layout });
      },

      /**
       * Toggle peers panel visibility
       */
      togglePeersPanel: () => {
        set((state) => ({ showPeersPanel: !state.showPeersPanel }));
      },

      /**
       * Toggle technical analysis visibility
       */
      toggleTechnicalAnalysis: () => {
        set((state) => ({ showTechnicalAnalysis: !state.showTechnicalAnalysis }));
      },

      /**
       * Set refresh interval
       */
      setRefreshInterval: (intervalMs) => {
        if (intervalMs < 60000) { // Minimum 1 minute
          console.error('Refresh interval too short (min 1 minute)');
          return;
        }
        if (intervalMs > 3600000) { // Maximum 1 hour
          console.error('Refresh interval too long (max 1 hour)');
          return;
        }
        set({ refreshInterval: intervalMs });
      },

      /**
       * Toggle auto-refresh
       */
      toggleAutoRefresh: () => {
        set((state) => ({ autoRefresh: !state.autoRefresh }));
      },

      /**
       * Set notification preferences
       */
      setNotificationPreferences: ({ enabled, duration, threshold }) => {
        const updates = {};
        if (enabled !== undefined) updates.enableNotifications = enabled;
        if (duration !== undefined) updates.notificationDuration = duration;
        if (threshold !== undefined) updates.volumeSpikeThreshold = threshold;
        set(updates);
      },

      /**
       * Set chart preferences
       */
      setChartPreferences: ({ interval, period, showIndicators }) => {
        const updates = {};
        if (interval !== undefined) updates.defaultChartInterval = interval;
        if (period !== undefined) updates.defaultChartPeriod = period;
        if (showIndicators !== undefined) updates.showTechnicalIndicators = showIndicators;
        set(updates);
      },

      /**
       * Set API preferences
       */
      setAPIPreferences: ({ showCounter, warnAtLimit }) => {
        const updates = {};
        if (showCounter !== undefined) updates.showAPICounter = showCounter;
        if (warnAtLimit !== undefined) updates.warnAtAPILimit = warnAtLimit;
        set(updates);
      },

      /**
       * Toggle compact mode
       */
      toggleCompactMode: () => {
        set((state) => ({ compactMode: !state.compactMode }));
      },

      /**
       * Set font size
       */
      setFontSize: (size) => {
        if (!['small', 'medium', 'large'].includes(size)) {
          console.error('Invalid font size:', size);
          return;
        }
        set({ fontSize: size });
      },

      /**
       * Reset all preferences to defaults
       */
      resetToDefaults: () => {
        set({
          theme: 'dark',
          layout: 'compact',
          showPeersPanel: true,
          showTechnicalAnalysis: true,
          refreshInterval: 240000,
          autoRefresh: true,
          enableNotifications: true,
          notificationDuration: 8000,
          volumeSpikeThreshold: 2.0,
          defaultChartInterval: '1day',
          defaultChartPeriod: 90,
          showTechnicalIndicators: true,
          showAPICounter: true,
          warnAtAPILimit: 600,
          compactMode: false,
          fontSize: 'medium'
        });
      },

      /**
       * Get all preferences as plain object (for syncing)
       */
      getAllPreferences: () => {
        const state = get();
        return {
          theme: state.theme,
          layout: state.layout,
          showPeersPanel: state.showPeersPanel,
          showTechnicalAnalysis: state.showTechnicalAnalysis,
          refreshInterval: state.refreshInterval,
          autoRefresh: state.autoRefresh,
          enableNotifications: state.enableNotifications,
          notificationDuration: state.notificationDuration,
          volumeSpikeThreshold: state.volumeSpikeThreshold,
          defaultChartInterval: state.defaultChartInterval,
          defaultChartPeriod: state.defaultChartPeriod,
          showTechnicalIndicators: state.showTechnicalIndicators,
          showAPICounter: state.showAPICounter,
          warnAtAPILimit: state.warnAtAPILimit,
          compactMode: state.compactMode,
          fontSize: state.fontSize
        };
      },

      /**
       * Set preferences from synced data
       */
      setFromSyncedData: (preferences) => {
        set(preferences);
      }
    }),
    {
      name: 'preferences-storage', // localStorage key
      partialize: (state) => ({
        theme: state.theme,
        layout: state.layout,
        showPeersPanel: state.showPeersPanel,
        showTechnicalAnalysis: state.showTechnicalAnalysis,
        refreshInterval: state.refreshInterval,
        autoRefresh: state.autoRefresh,
        enableNotifications: state.enableNotifications,
        notificationDuration: state.notificationDuration,
        volumeSpikeThreshold: state.volumeSpikeThreshold,
        defaultChartInterval: state.defaultChartInterval,
        defaultChartPeriod: state.defaultChartPeriod,
        showTechnicalIndicators: state.showTechnicalIndicators,
        showAPICounter: state.showAPICounter,
        warnAtAPILimit: state.warnAtAPILimit,
        compactMode: state.compactMode,
        fontSize: state.fontSize
      })
    }
  )
);
