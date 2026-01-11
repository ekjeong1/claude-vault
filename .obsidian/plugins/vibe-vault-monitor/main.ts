import { App, Plugin, PluginSettingTab, Setting, TFile, TAbstractFile, WorkspaceLeaf, Notice, addIcon } from 'obsidian';
import { VaultMonitorView, VIEW_TYPE_VAULT_MONITOR } from './view';
import { VaultChangeTracker } from './vault-tracker';
import { VaultStats } from './vault-stats';

interface VaultMonitorSettings {
	enableNotifications: boolean;
	logRetentionDays: number;
	showInSidebar: boolean;
}

const DEFAULT_SETTINGS: VaultMonitorSettings = {
	enableNotifications: true,
	logRetentionDays: 30,
	showInSidebar: true
};

export default class VaultMonitorPlugin extends Plugin {
	settings: VaultMonitorSettings;
	vaultTracker: VaultChangeTracker;
	vaultStats: VaultStats;

	async onload() {
		await this.loadSettings();

		// Initialize components
		this.vaultStats = new VaultStats(this.app);
		this.vaultTracker = new VaultChangeTracker(this.app, this);

		// Register view
		this.registerView(
			VIEW_TYPE_VAULT_MONITOR,
			(leaf) => new VaultMonitorView(leaf, this)
		);

		// Add ribbon icon
		this.addRibbonIcon('activity', 'Vault Monitor', () => {
			this.activateView();
		});

		// Register the view to the left sidebar
		this.app.workspace.onLayoutReady(() => {
			if (this.settings.showInSidebar) {
				this.initLeftSidebar();
			}
		});

		// Add command to toggle the view
		this.addCommand({
			id: 'open-vault-monitor',
			name: 'Open Vault Monitor',
			callback: () => this.activateView(),
		});

		// Add settings tab
		this.addSettingTab(new VaultMonitorSettingTab(this.app, this));

		// Start tracking vault changes
		this.vaultTracker.startTracking();

		console.log('Vault Monitor plugin loaded');
	}
	
	// Initialize the left sidebar view
	initLeftSidebar() {
		// If we already have a leaf in the left sidebar, don't create another one
		if (this.app.workspace.getLeavesOfType(VIEW_TYPE_VAULT_MONITOR).length) {
			return;
		}
		
		// Create a new leaf in the left sidebar
		this.app.workspace.getLeftLeaf(false).setViewState({
			type: VIEW_TYPE_VAULT_MONITOR,
			active: false,
		});
	}

	onunload() {
		this.vaultTracker.stopTracking();
		console.log('Vault Monitor plugin unloaded');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async activateView() {
		const { workspace } = this.app;
		
		// Check if view already exists
		let leaf = workspace.getLeavesOfType(VIEW_TYPE_VAULT_MONITOR)[0];
		
		if (!leaf) {
			// Create new leaf in right sidebar
			leaf = workspace.getRightLeaf(false);
			await leaf.setViewState({
				type: VIEW_TYPE_VAULT_MONITOR,
				active: true,
			});
		}
		
		// Reveal the leaf
		workspace.revealLeaf(leaf);
	}

	showNotification(message: string) {
		if (this.settings.enableNotifications) {
			new Notice(message);
		}
	}
}

class VaultMonitorSettingTab extends PluginSettingTab {
	plugin: VaultMonitorPlugin;

	constructor(app: App, plugin: VaultMonitorPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Vault Monitor Settings' });

		new Setting(containerEl)
			.setName('Enable Notifications')
			.setDesc('Show notifications when notes are added or deleted')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableNotifications)
				.onChange(async (value) => {
					this.plugin.settings.enableNotifications = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Show in Sidebar')
			.setDesc('Automatically show Vault Monitor in the left sidebar')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showInSidebar)
				.onChange(async (value) => {
					this.plugin.settings.showInSidebar = value;
					await this.plugin.saveSettings();
					
					// Remove existing sidebar view if disabling
					if (!value) {
						const leaves = this.plugin.app.workspace.getLeavesOfType(VIEW_TYPE_VAULT_MONITOR);
						leaves.forEach(leaf => {
							if (leaf.getViewState().type === VIEW_TYPE_VAULT_MONITOR && 
								leaf.parentSplit && leaf.parentSplit.type === 'tabs') {
								leaf.detach();
							}
						});
					} else {
						// Add to sidebar if enabling
						this.plugin.initLeftSidebar();
					}
				}));

		new Setting(containerEl)
			.setName('Log Retention Period')
			.setDesc('Number of days to keep activity logs (1-365)')
			.addSlider(slider => slider
				.setLimits(1, 365, 1)
				.setValue(this.plugin.settings.logRetentionDays)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.logRetentionDays = value;
					await this.plugin.saveSettings();
				}));
	}
}