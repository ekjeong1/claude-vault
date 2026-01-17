# Weekly Summary 자동화 - 간단하고 안전한 방법

## 🎯 목표
**BrainTwin Auto RSI와 완전히 독립적으로 Weekly Summary 자동 생성**

---

## ✅ 방법: Templater Startup Template + Shell Commands

### **장점:**
- ✅ BrainTwin과 독립
- ✅ 플러그인 개발 불필요
- ✅ 5분 설정
- ✅ 오류 격리
- ✅ 쉬운 디버깅

### **동작 방식:**
```
Obsidian 시작
→ Templater Startup Template 자동 실행
→ 월요일 체크
→ Shell Command 호출
→ Python 스크립트 실행
→ Weekly Summary 생성
→ Startup Template 자동 삭제
```

---

## 📋 설치 순서 (5분)

### **Step 1: Shell Commands 플러그인 설치**

```
1. 설정 → Community plugins
2. "Browse" 클릭
3. "Shell commands" 검색
4. Install → Enable
```

### **Step 2: Shell Command 추가**

```
1. 설정 → Shell commands
2. "New shell command" 클릭
3. Command:

cd /d C:\Users\win10_original\claude-vault && python generate_weekly_summary.py

4. Alias: "weekly_summary"
5. Save
```

### **Step 3: Templater 설정 확인**

```
설정 → Templater
→ Enable Startup Templates: ☑️ (체크)
```

### **Step 4: Startup Template 생성**

**파일:** `Templates/Weekly_Summary_Check.md`

```markdown
<%*
// Obsidian 시작 시 자동 실행
const today = new Date();
const dayOfWeek = today.getDay(); // 1 = 월요일

// 월요일 체크
if (dayOfWeek === 1) {
    // 중복 실행 방지
    const lastRun = localStorage.getItem('weekly_summary_last_run');
    const todayStr = today.toISOString().split('T')[0];
    
    if (lastRun !== todayStr) {
        // Shell Command 실행
        try {
            await tp.user.shell_command('weekly_summary');
            localStorage.setItem('weekly_summary_last_run', todayStr);
            new Notice('✅ Weekly Summary 생성 완료!');
        } catch (error) {
            new Notice(`❌ Weekly Summary 오류: ${error.message}`);
        }
    }
}

// 이 노트 자동 삭제
await this.app.vault.delete(tp.config.target_file);
%>
```

### **Step 5: Startup Template 활성화**

```
설정 → Templater → Startup Templates
→ "Weekly_Summary_Check.md" 체크 ☑️
```

---

## 🧪 테스트

### **테스트 1: 수동 테스트**

```
1. Obsidian 재시작
2. Weekly_Summary_Check.md 노트가 잠깐 나타났다 사라짐
3. 월요일이면 Weekly Summary 생성됨
```

### **테스트 2: Shell Command 단독 테스트**

```
1. Ctrl+P (Command Palette)
2. "Shell commands: weekly_summary" 입력
3. Enter
4. 파일 생성 확인
```

---

## 📊 실행 타이밍

```
BrainTwin Auto RSI:
→ 매일 09:00 (플러그인 내부 스케줄러)

Weekly Summary:
→ Obsidian 시작 시 (월요일만)
→ 시간 독립적

충돌 없음! ✅
```

---

## 💡 추가 옵션

### **옵션 A: 특정 시간에 실행**

**Templater에 시간 체크 추가:**

```markdown
<%*
const now = new Date();
const dayOfWeek = now.getDay();
const hour = now.getHours();

// 월요일 오전 10시에만 (BrainTwin과 1시간 차이)
if (dayOfWeek === 1 && hour === 10) {
    // Shell Command 실행
    ...
}
%>
```

**주의:** Templater는 Obsidian 시작 시에만 실행되므로, 오전 10시에 Obsidian을 실행해야 합니다.

---

### **옵션 B: Daily Note와 연동**

**Daily Note Template에 추가:**

```markdown
---
date: <% tp.date.now("YYYY-MM-DD") %>
---

# <% tp.date.now("YYYY-MM-DD (dddd)") %>

<%*
// 월요일 자동 체크
const dayOfWeek = new Date().getDay();
if (dayOfWeek === 1) {
    const lastRun = localStorage.getItem('weekly_summary_last_run');
    const today = tp.date.now("YYYY-MM-DD");
    
    if (lastRun !== today) {
        await tp.user.shell_command('weekly_summary');
        localStorage.setItem('weekly_summary_last_run', today);
        new Notice('✅ Weekly Summary 생성!');
    }
}
%>

## Tasks
...
```

**장점:**
- Daily Note 생성할 때 자동 실행
- 시간 제어 가능

---

## 🔧 고급 설정

### **Shell Command 개선**

**출력 처리:**

```
설정 → Shell commands → weekly_summary
→ Output handling: "Show notification"
→ Notification: "{{output}}"
```

**오류 처리:**

```
→ Error handling: "Show error notification"
→ Error notification: "Weekly Summary 오류: {{error}}"
```

---

## 🐛 트러블슈팅

### **문제 1: Shell Command 실행 안됨**

**해결:**
```
1. Shell Commands 설정 확인
2. Command 경로 확인
3. Python 경로 확인:
   cd /d C:\Users\win10_original\claude-vault && where python
```

### **문제 2: Startup Template 실행 안됨**

**해결:**
```
1. Templater 설정 확인
2. Startup Templates 체크 확인
3. 템플릿 파일 경로 확인
```

### **문제 3: 중복 실행**

**해결:**
```
localStorage 초기화:
1. Ctrl+Shift+I (콘솔)
2. 입력: localStorage.removeItem('weekly_summary_last_run')
3. Enter
```

---

## ✅ 장단점 비교

### **vs. 플러그인 통합**

| 항목 | Templater 방식 | 플러그인 통합 |
|------|---------------|--------------|
| 설정 시간 | 5분 | 30분+ |
| 독립성 | ✅ 완전 독립 | ❌ 의존성 |
| 오류 격리 | ✅ 격리됨 | ❌ 전체 영향 |
| 유지보수 | ✅ 간단 | ❌ 복잡 |
| 코딩 필요 | ❌ 불필요 | ✅ 필요 |

---

## 📝 전체 체크리스트

- [ ] Shell Commands 플러그인 설치
- [ ] Shell Command 추가 (weekly_summary)
- [ ] Shell Command 테스트 (수동 실행)
- [ ] Templater Startup Templates 활성화
- [ ] Weekly_Summary_Check.md 템플릿 생성
- [ ] Startup Template 활성화
- [ ] Obsidian 재시작 테스트
- [ ] 다음 월요일 자동 실행 확인

---

## 💡 Pro Tips

### **Tip 1: 수동 버튼 추가**

**Buttons 플러그인 사용:**

```markdown
```button
name 📊 Weekly Summary
type command
action Shell commands: weekly_summary
```
^button-weekly
```

### **Tip 2: 알림 커스터마이징**

```markdown
<%*
if (dayOfWeek === 1) {
    new Notice('🔄 Weekly Summary 생성 중...', 3000);
    await tp.user.shell_command('weekly_summary');
    new Notice('✅ 완료! 파일을 확인하세요.', 5000);
}
%>
```

### **Tip 3: 로그 자동 기록**

**Python 스크립트에서 로그 업데이트:**

```python
# generate_weekly_summary.py 끝에 추가
def update_rsi_log():
    log_file = vault_path / "0_Long_Term_RSI_Log.md"
    if log_file.exists():
        content = log_file.read_text(encoding='utf-8')
        today = datetime.now().strftime('%Y-%m-%d')
        entry = f"\n## Weekly Summary\n**날짜:** {today}\n**상태:** ✅ 자동 생성\n\n---\n"
        log_file.write_text(content + entry, encoding='utf-8')

# 실행
update_rsi_log()
```

---

## 🎉 완료!

**이제 완전히 독립적이고 안전한 자동화 시스템이 완성되었습니다!**

```
BrainTwin Auto RSI  →  독립적으로 작동
Weekly Summary      →  독립적으로 작동
오류 발생 시        →  서로 영향 없음
```

**간단하고, 안전하고, 효과적입니다!** ✨
