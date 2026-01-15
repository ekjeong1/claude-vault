import { Notice, Plugin } from 'obsidian';
import { AutoRSISettings, DEFAULT_SETTINGS, AutoRSISettingTab } from './settings';
import { VaultAnalyzer, VaultStats, Improvement } from './analyzer';
import { RSIScheduler } from './scheduler';
import { RSIModal } from './modal';  // ⬅️ 이 줄 추가!


export default class BrainTwinAutoRSI extends Plugin {
    settings: AutoRSISettings;
    analyzer: VaultAnalyzer;
    scheduler: RSIScheduler;

    async onload() {
        await this.loadSettings();

        this.analyzer = new VaultAnalyzer(this.app.vault);
        this.scheduler = new RSIScheduler(() => this.runAnalysis());

        // Add settings tab
        this.addSettingTab(new AutoRSISettingTab(this.app, this));

        // Add ribbon icon
        this.addRibbonIcon('brain-circuit', 'Run Auto RSI', () => {
            this.runAnalysis();
        });

        // Add command
        this.addCommand({
            id: 'run-auto-rsi',
            name: 'Run Auto RSI Now',
            callback: () => this.runAnalysis()
        });

        // Start scheduler if enabled
        if (this.settings.enabled) {
            this.startScheduler();
        }

        console.log('BrainTwin Auto RSI loaded');
    }

    onunload() {
        this.stopScheduler();
        console.log('BrainTwin Auto RSI unloaded');
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    startScheduler() {
        this.scheduler.start(
            this.settings.scheduleTime,
            this.settings.scheduleType,
            this.settings.scheduleDayOfWeek
        );
        new Notice('Auto RSI scheduler started');
    }

    stopScheduler() {
        this.scheduler.stop();
    }

    async runAnalysis() {
        if (this.settings.showNotifications) {
            new Notice('🤖 Running Auto RSI analysis...');
        }

        try {
            // 기본 통계
            const stats = await this.analyzer.analyze();
            
            // 개선사항 탐지
            const improvements = await this.analyzer.findImprovements();
            
            // 결과 표시
            if (improvements.length > 0) {
                // 개선사항이 있을 때
                this.showImprovementsModal(stats, improvements);
            } else {
                // 개선사항이 없을 때
                const message = this.formatResults(stats) + '\n\n✅ 개선사항 없음!';
                if (this.settings.showNotifications) {
                    new Notice(message, 10000);
                }
            }

            console.log('Auto RSI Analysis Results:', { stats, improvements });
            
            // TODO: Save to log file (Phase 2)
            
        } catch (error) {
            console.error('Auto RSI analysis failed:', error);
            new Notice('❌ Auto RSI analysis failed');
        }
    }

    // ⬇️ 이 메서드가 클래스 안에 있어야 합니다! ⬇️
    private showImprovementsModal(stats: VaultStats, improvements: Improvement[]) {
        // 모달 열기
        const modal = new RSIModal(this.app, stats, improvements);
        modal.open();
    }
    
    private formatResults(stats: VaultStats): string {
        return `✅ Auto RSI Complete!\n` +
               `📝 Notes: ${stats.totalNotes}\n` +
               `🔗 Links: ${stats.totalLinks}\n` +
               `⚠️ Isolated: ${stats.isolatedNotes}\n` +
               `📅 Modified today: ${stats.recentlyModified.length}`;
    }
}