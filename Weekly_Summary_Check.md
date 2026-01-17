<%*
// ============================================================
// Weekly Summary Auto Check - Startup Template
// ============================================================
// 이 템플릿은 Obsidian 시작 시 자동으로 실행됩니다.
// 월요일에만 Weekly Summary를 생성하고, 자동으로 삭제됩니다.

const today = new Date(); 
const dayOfWeek = today.getDay(); 
const hour = today.getHours(); 
const todayStr = today.toISOString().split('T')[0];

// 월요일 오전 10시 체크 (BrainTwin Auto RSI와 충돌 방지)
if (dayOfWeek === 1 && hour === 10) { 
	// 중복 실행 방지 (오늘 이미 실행했는지 확인) 
	const lastRun = localStorage.getItem('weekly_summary_last_run'); 
	
	if (lastRun !== todayStr) { 
		new Notice('📊 Weekly Summary 생성 중...', 3000);
        
        try {
            // Shell Command 실행
            // 주의: Shell Commands 플러그인에서 "weekly_summary" 명령이 설정되어 있어야 합니다
            const { exec } = require('child_process');
            const util = require('util');
            const execPromise = util.promisify(exec);
            
            const vaultPath = app.vault.adapter.basePath;
            const command = `cd "${vaultPath}" && python generate_weekly_summary.py`;
            
            const { stdout, stderr } = await execPromise(command);
            
            if (stderr && !stderr.includes('warning')) {
                throw new Error(stderr);
            }
            
            // 실행 날짜 저장
            localStorage.setItem('weekly_summary_last_run', todayStr);
            
            new Notice('✅ Weekly Summary 생성 완료!', 5000);
            console.log('Weekly Summary stdout:', stdout);
            
        } catch (error) {
            new Notice(`❌ Weekly Summary 오류: ${error.message}`, 8000);
            console.error('Weekly Summary error:', error);
        }
    } else {
        console.log('Weekly Summary: 오늘 이미 실행함');
    }
} else {
    console.log('Weekly Summary: 월요일이 아님');
}

// 이 Startup Template 노트 자동 삭제 // 주의: 템플릿 폴더가 아닌 경우에만 삭제 if (tp.config.target_file && !tp.config.target_file.path.startsWith('Templates/')) { await this.app.vault.delete(tp.config.target_file); } %> ``` ---
