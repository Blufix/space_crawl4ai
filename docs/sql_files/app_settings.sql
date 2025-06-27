-- App Settings Table for persistent storage
-- This table stores user preferences and statistics

CREATE TABLE IF NOT EXISTS app_settings (
    id TEXT PRIMARY KEY, -- Use 'user_settings' for global settings, can be user-specific later
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index for faster JSONB queries
CREATE INDEX IF NOT EXISTS idx_app_settings_jsonb ON app_settings USING gin (settings);

-- Enable RLS (Row Level Security)
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (can be restricted later)
CREATE POLICY "Allow public read access to app_settings"
    ON app_settings
    FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Allow public insert access to app_settings"
    ON app_settings
    FOR INSERT
    TO public
    WITH CHECK (true);

CREATE POLICY "Allow public update access to app_settings"
    ON app_settings
    FOR UPDATE
    TO public
    USING (true)
    WITH CHECK (true);

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_app_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_app_settings_updated_at_trigger
    BEFORE UPDATE ON app_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_app_settings_updated_at();

-- Insert default settings row
INSERT INTO app_settings (id, settings) 
VALUES ('user_settings', '{
    "totalMissions": 0,
    "totalPagesCrawled": 0,
    "totalSitesCrawled": 0,
    "lastCrawlDate": null,
    "crawlPreferences": {
        "defaultCrawlType": "single",
        "maxPagesPerSite": 10,
        "enableEmbeddings": true
    },
    "uiPreferences": {
        "defaultTab": "crawl",
        "showAdvancedOptions": false
    },
    "stats": {
        "successfulCrawls": 0,
        "failedCrawls": 0,
        "totalContentSize": 0
    }
}'::jsonb)
ON CONFLICT (id) DO NOTHING;