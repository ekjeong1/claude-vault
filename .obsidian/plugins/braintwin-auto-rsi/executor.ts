import { Vault, Notice } from 'obsidian';
import { Improvement } from './analyzer';

export class ActionExecutor {
    vault: Vault;

    constructor(vault: Vault) {
        this.vault = vault;
    }

    async executeImprovements(improvements: Improvement[]): Promise<{
        executed: Improvement[];
        successCount: number;
        failCount: number;
    }> {
        let successCount = 0;
        let failCount = 0;
        const executed: Improvement[] = [];

        for (const improvement of improvements) {
            try {
                await this.executeOne(improvement);
                successCount++;
                executed.push(improvement);
                console.log(`✅ 완료: ${improvement.title}`);
            } catch (error) {
                failCount++;
                console.error(`❌ 실패: ${improvement.title}`, error);
            }
        }
        // 결과 알림
        new Notice(`✅ 성공: ${successCount}개 | ❌ 실패: ${failCount}개`, 10000);
    
        // 결과 반환
        return { executed, successCount, failCount };
    }

    private async executeOne(improvement: Improvement): Promise<void> {
        switch (improvement.action) {
            case 'git_commit':
                await this.gitCommit();
                break;
            
            case 'create_invariants':
                await this.createInvariants();
                break;
            
            case 'add_links':
                await this.addLinks(improvement.file!);
                break;
            
            case 'fill_section':
                await this.fillSection(improvement.file!);
                break;
            
            default:
                console.warn(`알 수 없는 액션: ${improvement.action}`);
        }
    }

    // 1. Git commit 실행
    private async gitCommit(): Promise<void> {
        // 실제 Git 실행은 Node.js child_process 필요
        // Obsidian 플러그인에서는 제한적이므로 알림만 표시
        new Notice('⚠️ Git commit은 수동으로 실행해주세요\ngit add . && git commit -m "Auto RSI improvements"', 10000);
        
        console.log('Git commit 가이드:');
        console.log('터미널에서 실행:');
        console.log('cd C:\\Users\\win10_original\\claude-vault');
        console.log('git add .');
        console.log('git commit -m "Auto RSI: improvements"');
    }

    // 2. 0_Invariants.md 파일 생성
    private async createInvariants(): Promise<void> {
        const filePath = '0_Invariants.md';
        
        // 파일이 이미 있는지 확인
        const existingFile = this.vault.getAbstractFileByPath(filePath);
        if (existingFile) {
            new Notice('0_Invariants.md 파일이 이미 존재합니다');
            return;
        }

        const content = `# 불변량 정의

## 개요
이 문서는 BrainTwin Vault의 핵심 불변량을 정의합니다.

## 핵심 불변량

### 1. 파일 명명 규칙
- 모든 파일은 의미있는 이름을 가져야 함
- 숫자로 시작하는 파일: 0_, 1_, 2_ 등은 메타 문서

### 2. 링크 구조
- 모든 노트는 최소 1개 이상의 링크를 가져야 함
- 고아 노트(orphan)는 피해야 함

### 3. 섹션 구조
- "## 핵심 내용" 섹션은 비어있으면 안 됨
- "## 관련 노트" 섹션에는 최소 1개 이상의 링크

### 4. Git 관리
- 변경사항은 정기적으로 커밋
- 커밋 메시지는 명확하게 작성

## 검증 주기
- 매일 자동 검증 (Auto RSI)
- 위반 시 알림

---
생성일: ${new Date().toISOString().split('T')[0]}
`;

        await this.vault.create(filePath, content);
        new Notice('✅ 0_Invariants.md 파일 생성 완료!');
    }

    // 3. 고아 노트에 링크 추가
    private async addLinks(filePath: string): Promise<void> {
        const file = this.vault.getAbstractFileByPath(filePath);
        
        if (!file || !(file instanceof Object && 'path' in file)) {
            throw new Error(`파일을 찾을 수 없음: ${filePath}`);
        }

        const content = await this.vault.read(file as any);
        
        // 이미 "## 관련 노트" 섹션이 있는지 확인
        if (content.includes('## 관련 노트')) {
            new Notice(`${filePath}: 이미 관련 노트 섹션 있음`);
            return;
        }

        // 링크 섹션 추가
        const newContent = content + `

## 관련 노트
- [[0_Long_Term_RSI_Log]]
- [[README]]

---
링크 추가일: ${new Date().toISOString().split('T')[0]}
`;

        await this.vault.modify(file as any, newContent);
        new Notice(`✅ ${filePath}: 링크 추가 완료`);
    }

    // 4. 빈 섹션 채우기
    private async fillSection(filePath: string): Promise<void> {
        const file = this.vault.getAbstractFileByPath(filePath);
        
        if (!file || !(file instanceof Object && 'path' in file)) {
            throw new Error(`파일을 찾을 수 없음: ${filePath}`);
        }

        const content = await this.vault.read(file as any);
        
        // "## 핵심 내용" 빈 섹션 찾기
        const emptyPattern = /## 핵심 내용\s*\n\s*\n/;
        
        if (!emptyPattern.test(content)) {
            new Notice(`${filePath}: 빈 섹션을 찾을 수 없음`);
            return;
        }

        // 빈 섹션 채우기
        const newContent = content.replace(
            emptyPattern,
            `## 핵심 내용\n\n이 섹션은 자동으로 채워졌습니다. 내용을 업데이트해주세요.\n\n`
        );

        await this.vault.modify(file as any, newContent);
        new Notice(`✅ ${filePath}: 빈 섹션 채움`);
    }
}