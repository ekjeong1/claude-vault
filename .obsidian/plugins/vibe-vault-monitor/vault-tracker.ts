import { App, TAbstractFile, TFile, Vault, EventRef } from 'obsidian';
import VaultMonitorPlugin from './main';

export interface VaultChange {
    type: 'added' | 'deleted' | 'modified';
    filename: string;
    path: string;
    timestamp: number;
}

export class VaultChangeTracker {
    private app: App;
    private plugin: VaultMonitorPlugin;
    private recentChanges: VaultChange[] = [];
    private maxChanges = 1000; // Maximum number of changes to store in memory
    private eventRefs: EventRef[] = [];

    constructor(app: App, plugin: VaultMonitorPlugin) {
        this.app = app;
        this.plugin = plugin;
    }

    startTracking() {
        // Register event handlers for file changes
        this.registerFileEvents();
    }

    stopTracking() {
        // Clean up event references
        this.eventRefs.forEach(ref => {
            this.app.vault.offref(ref);
        });
        this.eventRefs = [];
    }

    private registerFileEvents() {
        // File created event
        const createRef = this.app.vault.on('create', (file) => {
            if (file instanceof TFile && file.extension === 'md') {
                this.recordChange('added', file);
            }
        });
        this.eventRefs.push(createRef);
        this.plugin.registerEvent(createRef);

        // File deleted event
        const deleteRef = this.app.vault.on('delete', (file) => {
            if (file instanceof TFile && file.extension === 'md') {
                this.recordChange('deleted', file);
            }
        });
        this.eventRefs.push(deleteRef);
        this.plugin.registerEvent(deleteRef);

        // File modified event
        const modifyRef = this.app.vault.on('modify', (file) => {
            if (file instanceof TFile && file.extension === 'md') {
                this.recordChange('modified', file);
            }
        });
        this.eventRefs.push(modifyRef);
        this.plugin.registerEvent(modifyRef);
    }

    private recordChange(type: 'added' | 'deleted' | 'modified', file: TAbstractFile) {
        const change: VaultChange = {
            type,
            filename: file.name,
            path: file.path,
            timestamp: Date.now()
        };

        // Add to recent changes
        this.recentChanges.unshift(change);

        // Trim the changes list if it gets too long
        if (this.recentChanges.length > this.maxChanges) {
            this.recentChanges = this.recentChanges.slice(0, this.maxChanges);
        }

        // Show notification for add/delete if enabled
        if (type === 'added' || type === 'deleted') {
            const message = `Note ${type}: ${file.name}`;
            this.plugin.showNotification(message);
        }

        // Trigger an update of the view if it's open
        this.app.workspace.trigger('vault-monitor:change-recorded');
    }

    getRecentChanges(limit?: number): VaultChange[] {
        if (limit) {
            return this.recentChanges.slice(0, limit);
        }
        return this.recentChanges;
    }

    // Clean up old changes based on retention period
    cleanupOldChanges() {
        const cutoffTime = Date.now() - (this.plugin.settings.logRetentionDays * 24 * 60 * 60 * 1000);
        this.recentChanges = this.recentChanges.filter(change => change.timestamp >= cutoffTime);
    }
}