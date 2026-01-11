import { ItemView, WorkspaceLeaf } from 'obsidian';
import VaultMonitorPlugin from './main';
import { VaultChange } from './vault-tracker';
import { VaultStatistics } from './vault-stats';

export const VIEW_TYPE_VAULT_MONITOR = 'vault-monitor-view';

export class VaultMonitorView extends ItemView {
    private plugin: VaultMonitorPlugin;
    private contentEl: HTMLElement;
    private statsEl: HTMLElement;
    private activityLogEl: HTMLElement;
    private refreshInterval: number;

    constructor(leaf: WorkspaceLeaf, plugin: VaultMonitorPlugin) {
        super(leaf);
        this.plugin = plugin;
        
        // Set up auto-refresh every 30 seconds
        this.refreshInterval = window.setInterval(() => {
            this.refreshView();
        }, 30000);
    }

    getViewType(): string {
        return VIEW_TYPE_VAULT_MONITOR;
    }

    getDisplayText(): string {
        return 'Vault Monitor';
    }

    getIcon(): string {
        return 'activity';
    }

    async onOpen(): Promise<void> {
        const { containerEl } = this;
        
        // Main container
        this.contentEl = containerEl.createDiv({ cls: 'vault-monitor-container' });
        
        // Create header
        const headerEl = this.contentEl.createEl('div', { cls: 'vault-monitor-header' });
        headerEl.createEl('h2', { text: 'Vault Monitor' });
        
        // Create refresh button
        const refreshBtn = headerEl.createEl('button', { 
            cls: 'vault-monitor-refresh-btn',
            text: 'Refresh'
        });
        refreshBtn.addEventListener('click', () => this.refreshView());
        
        // Create stats section
        const statsSection = this.contentEl.createEl('div', { cls: 'vault-monitor-section' });
        statsSection.createEl('h3', { text: 'Vault Statistics' });
        this.statsEl = statsSection.createDiv({ cls: 'vault-monitor-stats' });
        
        // Create activity log section
        const activitySection = this.contentEl.createEl('div', { cls: 'vault-monitor-section' });
        activitySection.createEl('h3', { text: 'Recent Activity' });
        this.activityLogEl = activitySection.createDiv({ cls: 'vault-monitor-activity-log' });
        
        // Register for change events
        const eventRef = this.app.workspace.on('vault-monitor:change-recorded', () => {
            this.refreshView();
        });
        this.registerEvent(eventRef);
        
        // Initial refresh
        await this.refreshView();
    }

    async onClose() {
        // Clear the refresh interval
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    }

    async refreshView() {
        // Refresh stats
        await this.refreshStats();
        
        // Refresh activity log
        this.refreshActivityLog();
    }

    async refreshStats() {
        // Clear existing content
        this.statsEl.empty();
        
        // Get fresh stats
        const stats = await this.plugin.vaultStats.refreshStats();
        
        // Create stats grid
        const statsGrid = this.statsEl.createDiv({ cls: 'vault-monitor-stats-grid' });
        
        // Add stat items
        this.createStatItem(statsGrid, 'Total Notes', stats.totalNotes.toString());
        this.createStatItem(statsGrid, 'Total Links', stats.totalLinks.toString());
        this.createStatItem(statsGrid, 'Isolated Notes', stats.isolatedNotes.toString());
        
        // Add last updated info
        const lastUpdated = this.statsEl.createDiv({ cls: 'vault-monitor-last-updated' });
        lastUpdated.setText(`Last updated: ${new Date(stats.lastUpdated).toLocaleString()}`);
    }

    createStatItem(container: HTMLElement, label: string, value: string) {
        const statItem = container.createDiv({ cls: 'vault-monitor-stat-item' });
        statItem.createDiv({ cls: 'vault-monitor-stat-value', text: value });
        statItem.createDiv({ cls: 'vault-monitor-stat-label', text: label });
        return statItem;
    }

    refreshActivityLog() {
        // Clear existing content
        this.activityLogEl.empty();
        
        // Get recent changes (last 10)
        const recentChanges = this.plugin.vaultTracker.getRecentChanges(10);
        
        if (recentChanges.length === 0) {
            this.activityLogEl.createDiv({ 
                cls: 'vault-monitor-empty-log',
                text: 'No recent activity'
            });
            return;
        }
        
        // Create activity list
        const activityList = this.activityLogEl.createEl('ul', { cls: 'vault-monitor-activity-list' });
        
        // Add activity items
        recentChanges.forEach(change => {
            const item = activityList.createEl('li', { cls: 'vault-monitor-activity-item' });
            
            // Add icon based on change type
            const iconClass = this.getChangeTypeIcon(change.type);
            item.createSpan({ cls: `vault-monitor-activity-icon ${iconClass}` });
            
            // Add content
            const content = item.createDiv({ cls: 'vault-monitor-activity-content' });
            
            // Add title with change type and filename
            content.createDiv({ 
                cls: 'vault-monitor-activity-title',
                text: `${this.capitalizeFirstLetter(change.type)}: ${change.filename}`
            });
            
            // Add timestamp
            content.createDiv({ 
                cls: 'vault-monitor-activity-time',
                text: new Date(change.timestamp).toLocaleString()
            });
        });
    }

    getChangeTypeIcon(type: string): string {
        switch (type) {
            case 'added': return 'vault-monitor-icon-added';
            case 'deleted': return 'vault-monitor-icon-deleted';
            case 'modified': return 'vault-monitor-icon-modified';
            default: return '';
        }
    }

    capitalizeFirstLetter(string: string): string {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
}