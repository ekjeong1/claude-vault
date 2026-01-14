import { TFile, Vault } from 'obsidian';

export interface VaultStats {
    totalNotes: number;
    totalLinks: number;
    isolatedNotes: number;
    recentlyModified: string[];
}

export class VaultAnalyzer {
    vault: Vault;

    constructor(vault: Vault) {
        this.vault = vault;
    }

    async analyze(): Promise<VaultStats> {
        const files = this.vault.getMarkdownFiles();
        
        const stats: VaultStats = {
            totalNotes: files.length,
            totalLinks: 0,
            isolatedNotes: 0,
            recentlyModified: []
        };

        // Count links and find isolated notes
        for (const file of files) {
            const content = await this.vault.cachedRead(file);
            const links = this.extractLinks(content);
            stats.totalLinks += links.length;

            if (links.length === 0) {
                stats.isolatedNotes++;
            }
        }

        // Get recently modified (last 24 hours)
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        stats.recentlyModified = files
            .filter(f => f.stat.mtime > oneDayAgo)
            .map(f => f.basename)
            .slice(0, 10); // Top 10

        return stats;
    }

    private extractLinks(content: string): string[] {
        const linkRegex = /\[\[([^\]]+)\]\]/g;
        const links: string[] = [];
        let match;

        while ((match = linkRegex.exec(content)) !== null) {
            links.push(match[1]);
        }

        return links;
    }
}