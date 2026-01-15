import { Modal, App, Setting } from 'obsidian';
import { VaultStats, Improvement } from './analyzer';
import { ActionExecutor } from './executor';
import { RSILogger } from './logger';  // ⬅️ 이 줄 추가!

export class RSIModal extends Modal {
    stats: VaultStats;
    improvements: Improvement[];
    selectedImprovements: Set<number>;

    constructor(app: App, stats: VaultStats, improvements: Improvement[]) {
        super(app);
        this.stats = stats;
        this.improvements = improvements;
        this.selectedImprovements = new Set();
        
        // P1은 기본 선택
        improvements.forEach((imp, index) => {
            if (imp.priority === 'P1') {
                this.selectedImprovements.add(index);
            }
        });
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        // 제목
        contentEl.createEl('h2', { text: '🤖 Auto RSI 분석 완료' });

        // 통계 요약
        const summaryDiv = contentEl.createDiv({ cls: 'rsi-summary' });
        summaryDiv.createEl('p', { 
            text: `📝 ${this.stats.totalNotes}개 노트 | 🔗 ${this.stats.totalLinks}개 링크`
        });
        summaryDiv.createEl('p', { 
            text: `⚠️ ${this.improvements.length}개 개선사항 발견`
        });

        contentEl.createEl('hr');

        // 우선순위별 분류
        const p1 = this.improvements.filter(i => i.priority === 'P1');
        const p2 = this.improvements.filter(i => i.priority === 'P2');
        const p3 = this.improvements.filter(i => i.priority === 'P3');

        // P1 섹션
        if (p1.length > 0) {
            this.createPrioritySection(contentEl, 'P1 (즉시 수정 필요)', p1, '🔴');
        }

        // P2 섹션
        if (p2.length > 0) {
            this.createPrioritySection(contentEl, 'P2 (개선 권장)', p2, '🟡');
        }

        // P3 섹션
        if (p3.length > 0) {
            this.createPrioritySection(contentEl, 'P3 (선택적)', p3, '🟢');
        }

        contentEl.createEl('hr');

        // 버튼들
        const buttonDiv = contentEl.createDiv({ cls: 'rsi-buttons' });
        
        new Setting(buttonDiv)
            .addButton(btn => btn
                .setButtonText('선택 실행')
                .setCta()
                .onClick(() => {
                    this.executeSelected();
                }))
            .addButton(btn => btn
                .setButtonText('모두 실행')
                .onClick(() => {
                    this.executeAll();
                }))
            .addButton(btn => btn
                .setButtonText('닫기')
                .onClick(() => {
                    this.close();
                }));

        // CSS 추가
        this.addStyles();
    }

    private createPrioritySection(
        container: HTMLElement, 
        title: string, 
        improvements: Improvement[],
        emoji: string
    ) {
        container.createEl('h3', { text: `${emoji} ${title}` });

        improvements.forEach(imp => {
            const index = this.improvements.indexOf(imp);
            
            const setting = new Setting(container)
                .setName(imp.title)
                .setDesc(imp.description);

            setting.addToggle(toggle => toggle
                .setValue(this.selectedImprovements.has(index))
                .onChange(value => {
                    if (value) {
                        this.selectedImprovements.add(index);
                    } else {
                        this.selectedImprovements.delete(index);
                    }
                }));
        });
    }

    private async executeSelected() {
        const selected = Array.from(this.selectedImprovements)
            .map(index => this.improvements[index]);
    
        console.log('실행할 개선사항:', selected);
    
        // 실제 실행
        const executor = new ActionExecutor(this.app.vault);
        const result = await executor.executeImprovements(selected);
    
        // 로그 저장
        const logger = new RSILogger(this.app.vault);
        await logger.logExecution(
            this.improvements,  // 전체 개선사항
            result.executed,     // 실행된 개선사항
            result.successCount,
            result.failCount
        );
    
        this.close();
    }

    private async executeAll() {
        console.log('모든 개선사항 실행:', this.improvements);
    
        // 실제 실행
        const executor = new ActionExecutor(this.app.vault);
        const result = await executor.executeImprovements(this.improvements);
    
        // 로그 저장
        const logger = new RSILogger(this.app.vault);
    await logger.logExecution(
            this.improvements,   // 전체 개선사항
            result.executed,     // 실행된 개선사항
            result.successCount,
            result.failCount
        );
    
    
        this.close();
    }

    private addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .rsi-summary {
                background: var(--background-secondary);
                padding: 10px;
                border-radius: 5px;
                margin-bottom: 10px;
            }
            .rsi-buttons {
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                margin-top: 20px;
            }
            .rsi-buttons .setting-item {
                border: none;
                padding: 0;
            }
        `;
        document.head.appendChild(style);
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}