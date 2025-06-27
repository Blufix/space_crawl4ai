import { supabase } from './supabase';

export interface AppSettings {
  totalMissions: number;
  totalPagesCrawled: number;
  totalSitesCrawled: number;
  lastCrawlDate: string | null;
  crawlPreferences: {
    defaultCrawlType: 'single' | 'smart_site';
    maxPagesPerSite: number;
    enableEmbeddings: boolean;
  };
  uiPreferences: {
    defaultTab: string;
    showAdvancedOptions: boolean;
  };
  stats: {
    successfulCrawls: number;
    failedCrawls: number;
    totalContentSize: number;
  };
}

const DEFAULT_SETTINGS: AppSettings = {
  totalMissions: 0,
  totalPagesCrawled: 0,
  totalSitesCrawled: 0,
  lastCrawlDate: null,
  crawlPreferences: {
    defaultCrawlType: 'single',
    maxPagesPerSite: 10,
    enableEmbeddings: true,
  },
  uiPreferences: {
    defaultTab: 'crawl',
    showAdvancedOptions: false,
  },
  stats: {
    successfulCrawls: 0,
    failedCrawls: 0,
    totalContentSize: 0,
  },
};

class SettingsService {
  private settings: AppSettings;
  private readonly STORAGE_KEY = 'crawl4ai_settings';
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.settings = this.loadSettings();
    console.log('🔧 Settings service initialized:', this.settings);
  }

  /**
   * Load settings from localStorage with fallback to defaults
   */
  private loadSettings(): AppSettings {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to handle new settings added over time
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load settings from localStorage:', error);
    }
    
    return { ...DEFAULT_SETTINGS };
  }

  /**
   * Save settings to localStorage (immediate) and Supabase (delayed)
   */
  private async saveSettings(): Promise<void> {
    try {
      // Save to localStorage immediately for instant access
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.settings));
      
      // Debounce Supabase saves to avoid excessive API calls
      if (this.saveTimeout) {
        clearTimeout(this.saveTimeout);
      }
      
      this.saveTimeout = setTimeout(async () => {
        try {
          await this.saveToSupabase();
        } catch (error) {
          console.warn('Failed to save settings to Supabase:', error);
        }
      }, 2000); // Save to Supabase after 2 seconds of inactivity
      
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  /**
   * Save settings to Supabase for cross-device persistence
   */
  private async saveToSupabase(): Promise<void> {
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert({
          id: 'user_settings', // Single row for now, can be user-specific later
          settings: this.settings,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.warn('Supabase settings save failed:', error);
      } else {
        console.log('✅ Settings saved to Supabase');
      }
    } catch (error) {
      console.warn('Supabase settings save error:', error);
    }
  }

  /**
   * Load settings from Supabase (for cross-device sync)
   */
  async loadFromSupabase(): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('settings')
        .eq('id', 'user_settings')
        .single();

      if (error || !data) {
        console.log('No remote settings found, using local settings');
        return false;
      }

      // Merge remote settings with current settings
      this.settings = { ...DEFAULT_SETTINGS, ...data.settings };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.settings));
      console.log('✅ Settings loaded from Supabase');
      return true;
    } catch (error) {
      console.warn('Failed to load settings from Supabase:', error);
      return false;
    }
  }

  /**
   * Get current settings
   */
  getSettings(): AppSettings {
    return { ...this.settings };
  }

  /**
   * Update specific setting
   */
  updateSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    this.settings[key] = value;
    this.saveSettings();
  }

  /**
   * Increment mission counter and update related stats
   */
  recordMission(success: boolean, pagesCrawled: number = 1, contentSize: number = 0): void {
    this.settings.totalMissions++;
    this.settings.lastCrawlDate = new Date().toISOString();
    
    if (success) {
      this.settings.stats.successfulCrawls++;
      this.settings.totalPagesCrawled += pagesCrawled;
      this.settings.stats.totalContentSize += contentSize;
    } else {
      this.settings.stats.failedCrawls++;
    }
    
    console.log(`📊 Mission recorded: Total missions: ${this.settings.totalMissions}`);
    this.saveSettings();
  }

  /**
   * Record a new site being crawled
   */
  recordSiteCrawled(): void {
    // This could be enhanced to track unique domains
    this.settings.totalSitesCrawled++;
    this.saveSettings();
  }

  /**
   * Get formatted statistics
   */
  getFormattedStats() {
    const settings = this.settings;
    const successRate = settings.totalMissions > 0 
      ? Math.round((settings.stats.successfulCrawls / settings.totalMissions) * 100)
      : 0;

    return {
      totalMissions: settings.totalMissions.toLocaleString(),
      totalPages: settings.totalPagesCrawled.toLocaleString(),
      totalSites: settings.totalSitesCrawled.toLocaleString(),
      successRate: `${successRate}%`,
      totalContentSize: this.formatBytes(settings.stats.totalContentSize),
      lastCrawl: settings.lastCrawlDate 
        ? new Date(settings.lastCrawlDate).toLocaleDateString()
        : 'Never'
    };
  }

  /**
   * Format bytes to human readable size
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Reset all statistics (useful for testing or fresh start)
   */
  resetStats(): void {
    const resetSettings = {
      ...this.settings,
      totalMissions: 0,
      totalPagesCrawled: 0,
      totalSitesCrawled: 0,
      lastCrawlDate: null,
      stats: {
        successfulCrawls: 0,
        failedCrawls: 0,
        totalContentSize: 0,
      }
    };
    
    this.settings = resetSettings;
    this.saveSettings();
    console.log('📊 All statistics reset');
  }

  /**
   * Export settings for backup
   */
  exportSettings(): string {
    return JSON.stringify(this.settings, null, 2);
  }

  /**
   * Import settings from backup
   */
  importSettings(settingsJson: string): boolean {
    try {
      const imported = JSON.parse(settingsJson);
      this.settings = { ...DEFAULT_SETTINGS, ...imported };
      this.saveSettings();
      console.log('✅ Settings imported successfully');
      return true;
    } catch (error) {
      console.error('Failed to import settings:', error);
      return false;
    }
  }

  /**
   * Initialize settings sync on app start
   */
  async initialize(): Promise<void> {
    console.log('🔧 Initializing settings service...');
    
    // Try to load from Supabase first (for cross-device sync)
    const loaded = await this.loadFromSupabase();
    if (!loaded) {
      // If no remote settings, save current local settings to Supabase
      await this.saveToSupabase();
    }
  }
}

export const settingsService = new SettingsService();

// Auto-initialize when the module is imported
settingsService.initialize().catch(console.warn);