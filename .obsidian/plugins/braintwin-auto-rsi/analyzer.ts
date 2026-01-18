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

    /**
     * 메타 파일 여부 확인 (0_Invariants.md v2.2 기준)
     * 메타 파일은 링크 체크 대상에서 제외됩니다.
     */
    private isMetaFile(filename: string, filepath: string): boolean {
        const nameLower = filename.toLowerCase();
        
        // 1. 숫자로 시작하는 파일 (0_, 1_, 2_, 3_)
        if (/^[0-3]_/.test(filename)) {
            return true;
        }
        
        // 2. 키워드 포함 체크
        const metaKeywords = [
            'report', 'summary', 'check', 'log',
            'readme', 'changelog', 'license',
            'index', 'guide', 'agenda', 'template',
            'old', 'backup', 'v1', 'v2', 'v3'
        ];
        
        if (metaKeywords.some(kw => nameLower.includes(kw))) {
            return true;
        }
        
        // 3. 코드/설정 파일 확장자
        if (/\.(py|js|ts|json)$/i.test(filename)) {
            return true;
        }
        
        // 4. 특정 폴더 (기존 로직 유지)
        if (filepath.includes('Templates') || 
            filepath.includes('Archive') ||
            filepath.includes('Daily')) {
            return true;
        }
        
        return false;
    }

    private async findOrphans(): Promise<Improvement[]> {
        const improvements: Improvement[] = [];
        const files = this.vault.getMarkdownFiles();
        
        for (const file of files) {
            // 메타 파일은 고아 노트 체크 제외
            if (this.isMetaFile(file.basename, file.path)) {
                continue;
            }
            
            const content = await this.vault.cachedRead(file);
            const links = this.extractLinks(content);
            
            // 개념 노트만 링크 필수
            if (links.length === 0) {
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
