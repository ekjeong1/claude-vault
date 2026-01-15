import { TFile, Vault } from 'obsidian';

export interface VaultStats {
    totalNotes: number;
    totalLinks: number;
    isolatedNotes: number;
    recentlyModified: string[];
}

export interface Improvement {
    type: string;
    priority: 'P1' | 'P2' | 'P3';
    title: string;
    description: string;
    file?: string;
    action?: string;
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

    async findImprovements(): Promise<Improvement[]> {
        const improvements: Improvement[] = [];
        
        // 1. Git 상태 확인
        const gitImprovements = await this.checkGitStatus();
        improvements.push(...gitImprovements);
        
        // 2. 불변량 검증
        const invariantImprovements = await this.checkInvariants();
        improvements.push(...invariantImprovements);
        
        // 3. 고아 노트 탐지
        const orphanImprovements = await this.findOrphans();
        improvements.push(...orphanImprovements);
        
        // 4. 빈 섹션 탐지
        const emptyImprovements = await this.findEmptySections();
        improvements.push(...emptyImprovements);
        
        return improvements;
    }

    private async checkGitStatus(): Promise<Improvement[]> {
        const improvements: Improvement[] = [];
        
        try {
            const files = this.vault.getFiles();
            const hasUncommitted = files.length > 0;
            
            if (hasUncommitted) {
                improvements.push({
                    type: 'git',
                    priority: 'P1',
                    title: 'Git: Uncommitted changes',
                    description: 'Vault에 커밋되지 않은 변경사항이 있습니다.',
                    action: 'git_commit'
                });
            }
        } catch (error) {
            console.error('Git check failed:', error);
        }
        
        return improvements;
    }

    private async checkInvariants(): Promise<Improvement[]> {
        const improvements: Improvement[] = [];
        
        const invariantFile = this.vault.getAbstractFileByPath('0_Invariants.md');
        
        if (!invariantFile) {
            improvements.push({
                type: 'invariant',
                priority: 'P1',
                title: '0_Invariants.md 파일 없음',
                description: '불변량 정의 파일이 없습니다.',
                action: 'create_invariants'
            });
        }
        
        return improvements;
    }

    private async findOrphans(): Promise<Improvement[]> {
        const improvements: Improvement[] = [];
        const files = this.vault.getMarkdownFiles();
        
        for (const file of files) {
            const content = await this.vault.cachedRead(file);
            const links = this.extractLinks(content);
            
            if (links.length === 0) {
                if (!file.path.includes('Templates') && 
                    !file.path.includes('Archive') &&
                    !file.path.includes('Daily')) {
                    
                    improvements.push({
                        type: 'orphan',
                        priority: 'P2',
                        title: `고아 노트: ${file.basename}`,
                        description: '다른 노트와 연결이 없습니다.',
                        file: file.path,
                        action: 'add_links'
                    });
                }
            }
        }
        
        return improvements;
    }

    private async findEmptySections(): Promise<Improvement[]> {
        const improvements: Improvement[] = [];
        const files = this.vault.getMarkdownFiles();
        
        for (const file of files) {
            const content = await this.vault.cachedRead(file);
            
            const coreContentMatch = content.match(/## 핵심 내용\s*\n\s*\n/);
            if (coreContentMatch) {
                improvements.push({
                    type: 'empty',
                    priority: 'P2',
                    title: `빈 섹션: ${file.basename}`,
                    description: '"핵심 내용" 섹션이 비어있습니다.',
                    file: file.path,
                    action: 'fill_section'
                });
            }
        }
        
        return improvements;
    }
}