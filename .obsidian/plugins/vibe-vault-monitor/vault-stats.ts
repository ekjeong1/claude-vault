import { App, TFile, getAllTags } from 'obsidian';

export interface VaultStatistics {
    totalNotes: number;
    totalLinks: number;
    isolatedNotes: number;
    lastUpdated: number;
}

export class VaultStats {
    private app: App;
    private stats: VaultStatistics;

    constructor(app: App) {
        this.app = app;
        this.stats = {
            totalNotes: 0,
            totalLinks: 0,
            isolatedNotes: 0,
            lastUpdated: 0
        };
    }

    async refreshStats(): Promise<VaultStatistics> {
        const markdownFiles = this.app.vault.getMarkdownFiles();
        const { metadataCache } = this.app;
        
        let totalLinks = 0;
        let isolatedNotes = 0;
        
        // Count notes with no links
        for (const file of markdownFiles) {
            const cache = metadataCache.getFileCache(file);
            
            // Count outgoing links
            const outgoingLinks = cache?.links?.length || 0;
            
            // Count incoming links (backlinks)
            const backlinks = Object.values(metadataCache.resolvedLinks[file.path] || {}).reduce((sum, count) => sum + count, 0);
            
            totalLinks += outgoingLinks;
            
            // A note is isolated if it has no outgoing or incoming links
            if (outgoingLinks === 0 && backlinks === 0) {
                isolatedNotes++;
            }
        }
        
        this.stats = {
            totalNotes: markdownFiles.length,
            totalLinks: totalLinks,
            isolatedNotes: isolatedNotes,
            lastUpdated: Date.now()
        };
        
        return this.stats;
    }

    getStats(): VaultStatistics {
        return this.stats;
    }

    // Format a timestamp as a readable date/time string
    static formatTimestamp(timestamp: number): string {
        return new Date(timestamp).toLocaleString();
    }
}