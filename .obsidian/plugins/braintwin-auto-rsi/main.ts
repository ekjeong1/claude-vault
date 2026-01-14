import { Notice, Plugin } from 'obsidian';
import { AutoRSISettings, DEFAULT_SETTINGS, AutoRSISettingTab } from './settings';
import { VaultAnalyzer, VaultStats } from './analyzer';
import { RSIScheduler } from './scheduler';

export default class BrainTwinAutoRSI extends Plugin {
    settings: AutoRSISettings;
    analyzer: VaultAnalyzer;
    scheduler: RSIScheduler;

    async onload() {
        await this.loadSettings();

        this.analyzer = new VaultAnalyzer(this.app.vault);
        this.scheduler = new RSIScheduler(() => this.runAnalysis());

        // Add settings tab
        this.addSettingTab(new AutoRSISettingTab(this.app, this));

        // Add ribbon icon
        this.addRibbonIcon('brain-circuit', 'Run Auto RSI', () => {
            this.runAnalysis();
        });

        // Add command
        this.addCommand({
            id: 'run-auto-rsi',
            name: 'Run Auto RSI Now',
            callback: () => this.runAnalysis()
        });

        // Start scheduler if enabled
        if (this.settings.enabled) {
            this.startScheduler();
        }

        console.log('BrainTwin Auto RSI loaded');
    }

    onunload() {
        this.stopScheduler();
        console.log('BrainTwin Auto RSI unloaded');
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    startScheduler() {
        this.scheduler.start(
            this.settings.scheduleTime,
            this.settings.scheduleType,
            this.settings.scheduleDayOfWeek
        );
        new Notice('Auto RSI scheduler started');
    }

    stopScheduler() {
        this.scheduler.stop();
    }

    async runAnalysis() {
        if (this.settings.showNotifications) {
            new Notice('🤖 Running Auto RSI analysis...');
        }

        try {
            const stats = await this.analyzer.analyze();
            
            const message = this.formatResults(stats);
            
            if (this.settings.showNotifications) {
                new Notice(message, 10000); // Show for 10 seconds
            }

            console.log('Auto RSI Analysis Results:', stats);
            
            // TODO: Save to log file (Phase 2 - 내일)
            
        } catch (error) {
            console.error('Auto RSI analysis failed:', error);
            new Notice('❌ Auto RSI analysis failed');
        }
    }

    private formatResults(stats: VaultStats): string {
        return `✅ Auto RSI Complete!\n` +
               `📝 Notes: ${stats.totalNotes}\n` +
               `🔗 Links: ${stats.totalLinks}\n` +
               `⚠️ Isolated: ${stats.isolatedNotes}\n` +
               `📅 Modified today: ${stats.recentlyModified.length}`;
    }
}