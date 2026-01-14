import { App, PluginSettingTab, Setting } from 'obsidian';
import BrainTwinAutoRSI from './main';

export interface AutoRSISettings {
    enabled: boolean;
    scheduleTime: string; // "09:00" format
    scheduleType: 'daily' | 'weekly';
    scheduleDayOfWeek: number; // 0-6 (Sunday-Saturday)
    showNotifications: boolean;
}

export const DEFAULT_SETTINGS: AutoRSISettings = {
    enabled: false,
    scheduleTime: '09:00',
    scheduleType: 'daily',
    scheduleDayOfWeek: 1, // Monday
    showNotifications: true
}

export class AutoRSISettingTab extends PluginSettingTab {
    plugin: BrainTwinAutoRSI;

    constructor(app: App, plugin: BrainTwinAutoRSI) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const {containerEl} = this;
        containerEl.empty();

        containerEl.createEl('h2', {text: 'BrainTwin Auto RSI Settings'});

        // Enable/Disable
        new Setting(containerEl)
            .setName('Enable Auto RSI')
            .setDesc('Automatically run RSI analysis on schedule')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enabled)
                .onChange(async (value) => {
                    this.plugin.settings.enabled = value;
                    await this.plugin.saveSettings();
                    if (value) {
                        this.plugin.startScheduler();
                    } else {
                        this.plugin.stopScheduler();
                    }
                }));

        // Schedule Type
        new Setting(containerEl)
            .setName('Schedule Type')
            .setDesc('Run daily or weekly')
            .addDropdown(dropdown => dropdown
                .addOption('daily', 'Daily')
                .addOption('weekly', 'Weekly')
                .setValue(this.plugin.settings.scheduleType)
                .onChange(async (value: 'daily' | 'weekly') => {
                    this.plugin.settings.scheduleType = value;
                    await this.plugin.saveSettings();
                    this.display(); // Refresh to show/hide day selector
                }));

        // Day of Week (only for weekly)
        if (this.plugin.settings.scheduleType === 'weekly') {
            new Setting(containerEl)
                .setName('Day of Week')
                .setDesc('Which day to run the analysis')
                .addDropdown(dropdown => dropdown
                    .addOption('0', 'Sunday')
                    .addOption('1', 'Monday')
                    .addOption('2', 'Tuesday')
                    .addOption('3', 'Wednesday')
                    .addOption('4', 'Thursday')
                    .addOption('5', 'Friday')
                    .addOption('6', 'Saturday')
                    .setValue(String(this.plugin.settings.scheduleDayOfWeek))
                    .onChange(async (value) => {
                        this.plugin.settings.scheduleDayOfWeek = parseInt(value);
                        await this.plugin.saveSettings();
                    }));
        }

        // Schedule Time
        new Setting(containerEl)
            .setName('Schedule Time')
            .setDesc('Time to run analysis (HH:MM format, 24-hour)')
            .addText(text => text
                .setPlaceholder('09:00')
                .setValue(this.plugin.settings.scheduleTime)
                .onChange(async (value) => {
                    this.plugin.settings.scheduleTime = value;
                    await this.plugin.saveSettings();
                }));

        // Show Notifications
        new Setting(containerEl)
            .setName('Show Notifications')
            .setDesc('Show notification when analysis completes')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showNotifications)
                .onChange(async (value) => {
                    this.plugin.settings.showNotifications = value;
                    await this.plugin.saveSettings();
                }));

        // Manual Run Button
        new Setting(containerEl)
            .setName('Manual Run')
            .setDesc('Run analysis now (for testing)')
            .addButton(button => button
                .setButtonText('Run Now')
                .onClick(() => {
                    this.plugin.runAnalysis();
                }));
    }
}