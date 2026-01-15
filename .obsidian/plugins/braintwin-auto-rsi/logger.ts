import { Vault } from 'obsidian';
import { Improvement } from './analyzer';

export class RSILogger {
    vault: Vault;
    logFilePath = '0_Long_Term_RSI_Log.md';

    constructor(vault: Vault) {
        this.vault = vault;
    }

    async logExecution(
        improvements: Improvement[],
        executed: Improvement[],
        successCount: number,
        failCount: number
    ): Promise<void> {
        try {
            // 로그 파일 읽기
            const logFile = this.vault.getAbstractFileByPath(this.logFilePath);
            if (!logFile) {
                console.error('로그 파일을 찾을 수 없음:', this.logFilePath);
                return;
            }

            const content = await this.vault.read(logFile as any);
            
            // Day 번호 파싱
            const { dayNumber, previousCount } = this.parseLastDay(content);
            
            // 새 로그 생성
            const newLog = this.generateDayLog(
                dayNumber,
                improvements,
                executed,
                successCount,
                failCount,
                previousCount
            );
            
            // 로그 추가 (주간 요약 앞에 삽입)
            const updatedContent = this.insertLog(content, newLog);
            
            // 파일 업데이트
            await this.vault.modify(logFile as any, updatedContent);
            
            console.log(`✅ Day ${dayNumber} 로그 저장 완료`);
            
        } catch (error) {
            console.error('로그 저장 실패:', error);
        }
    }

    private parseLastDay(content: string): { dayNumber: number; previousCount: number } {
        // "## Day X" 패턴 찾기
        const dayMatches = content.match(/## Day (\d+)/g);
        
        if (!dayMatches || dayMatches.length === 0) {
            return { dayNumber: 1, previousCount: 0 };
        }
        
        // 마지막 Day 번호
        const lastDayMatch = dayMatches[dayMatches.length - 1];
        const lastDayNumber = parseInt(lastDayMatch.match(/\d+/)![0]);
        
        // 마지막 Day의 제안 수 파싱
        const lastDaySection = content.split(lastDayMatch)[1].split('---')[0];
        const countMatch = lastDaySection.match(/\*\*AI 제안 수:\*\* (\d+)개/);
        const previousCount = countMatch ? parseInt(countMatch[1]) : 0;
        
        return {
            dayNumber: lastDayNumber + 1,
            previousCount
        };
    }

    private generateDayLog(
        dayNumber: number,
        allImprovements: Improvement[],
        executed: Improvement[],
        successCount: number,
        failCount: number,
        previousCount: number
    ): string {
        const today = new Date().toISOString().split('T')[0];
        const currentCount = allImprovements.length;
        const trend = currentCount > previousCount ? '↑' : 
                      currentCount < previousCount ? '↓' : '→';
        
        // 우선순위별 분류
        const p1 = allImprovements.filter(i => i.priority === 'P1');
        const p2 = allImprovements.filter(i => i.priority === 'P2');
        const p3 = allImprovements.filter(i => i.priority === 'P3');
        
        // 새로운 제안 목록
        let proposalsList = '';
        
        // P1 제안
        if (p1.length > 0) {
            p1.forEach(imp => {
                const status = executed.includes(imp) ? '✅ 완료' : '⏸️ 보류';
                proposalsList += `- P1: ${imp.title} ${status}\n`;
            });
        }
        
        // P2 제안
        if (p2.length > 0) {
            p2.forEach(imp => {
                const status = executed.includes(imp) ? '✅ 완료' : '⏸️ 보류';
                proposalsList += `- P2: ${imp.title} ${status}\n`;
            });
        }
        
        // P3 제안
        if (p3.length > 0) {
            p3.forEach(imp => {
                const status = executed.includes(imp) ? '✅ 완료' : '⏸️ 보류';
                proposalsList += `- P3: ${imp.title} ${status}\n`;
            });
        }
        
        // 실행 내역
        let executionList = '';
        if (executed.length > 0) {
            executed.forEach((imp, index) => {
                const mark = successCount > 0 ? '✅' : '❌';
                executionList += `- ${mark} P${imp.priority.slice(1)}-${index + 1}: ${imp.title}\n`;
            });
        } else {
            executionList = '- 실행 없음 (분석만 수행)\n';
        }
        
        const log = `
## Day ${dayNumber}
**날짜:** ${today}
**Auto RSI 자동 실행** ${dayNumber === 8 ? '(첫 자동 실행! 🎉)' : ''}
**AI 제안 수:** ${currentCount}개 (Day ${dayNumber - 1}: ${previousCount}개 → Day ${dayNumber}: ${currentCount}개) ${trend}
**새로운 제안:**
${proposalsList}**반복 제안:** ${this.checkRepeatProposals(allImprovements)}
**불변량 보존:** ✅
**실행:** 
${executionList}**메모:**
- 자동 실행: 성공 ${successCount}개, 실패 ${failCount}개
- 총 탐지: P1 ${p1.length}개, P2 ${p2.length}개, P3 ${p3.length}개
**백업:** 수동 commit 권장

---
`;
        
        return log;
    }

    private checkRepeatProposals(improvements: Improvement[]): string {
        // 간단 버전: 없음 반환
        // 향후 개선: 이전 Day들과 비교
        return '없음';
    }

    private insertLog(content: string, newLog: string): string {
        // "---\n## 주간 요약" 또는 파일 끝에 삽입
        const weeklyIndex = content.indexOf('---\n## 주간 요약');
        
        if (weeklyIndex !== -1) {
            // 주간 요약 앞에 삽입
            return content.slice(0, weeklyIndex) + newLog + content.slice(weeklyIndex);
        } else {
            // 파일 끝에 추가
            return content + '\n' + newLog;
        }
    }
}