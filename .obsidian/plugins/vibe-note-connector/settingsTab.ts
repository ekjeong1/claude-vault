import { App, PluginSettingTab, Setting } from 'obsidian';
import NoteConnectorPlugin from './main';
import { NoteConnectorSettings } from './types';

export class NoteConnectorSettingTab extends PluginSettingTab {
  plugin: NoteConnectorPlugin;

  constructor(app: App, plugin: NoteConnectorPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'Note Connector Settings' });

    new Setting(containerEl)
      .setName('Minimum relevance score')
      .setDesc('Only suggest connections with at least this relevance score (0-1)')
      .addSlider(slider => slider
        .setLimits(0, 1, 0.05)
        .setValue(this.plugin.settings.minRelevanceScore)
        .setDynamicTooltip()
        .onChange(async (value) => {
          this.plugin.settings.minRelevanceScore = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Maximum suggestions per note')
      .setDesc('Maximum number of suggestions to show for each isolated note')
      .addSlider(slider => slider
        .setLimits(1, 10, 1)
        .setValue(this.plugin.settings.maxSuggestionsPerNote)
        .setDynamicTooltip()
        .onChange(async (value) => {
          this.plugin.settings.maxSuggestionsPerNote = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Scan on startup')
      .setDesc('Automatically scan for isolated notes when Obsidian starts')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.scanOnStartup)
        .onChange(async (value) => {
          this.plugin.settings.scanOnStartup = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Create backlinks')
      .setDesc('When adding a link to an isolated note, also add a backlink from the target note')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.createBacklinks)
        .onChange(async (value) => {
          this.plugin.settings.createBacklinks = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Use AI for relevance analysis')
      .setDesc('Use AI to analyze note relevance (requires Vibesidian plugin)')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.useAIForRelevance)
        .onChange(async (value) => {
          this.plugin.settings.useAIForRelevance = value;
          await this.plugin.saveSettings();
        }));
  }
}