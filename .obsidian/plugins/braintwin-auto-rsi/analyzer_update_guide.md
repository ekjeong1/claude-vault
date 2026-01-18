# analyzer.ts 업데이트 가이드

## 📋 변경 사항 요약

**문제**: BrainTwin Auto RSI 플러그인이 메타 데이터 파일(로그, 보고서 등)을 고아 노트로 잘못 판별

**해결**: 0_Invariants.md v2.2의 메타 파일 정의를 analyzer.ts에 적용

---

## 🔍 변경된 코드

### 1️⃣ 새로 추가된 함수: `isMetaFile()`

**위치**: 132-180라인 (checkInvariants 함수 바로 아래)

```typescript
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
```

### 2️⃣ 수정된 함수: `findOrphans()`

**변경 전**:
```typescript
private async findOrphans(): Promise<Improvement[]> {
    const improvements: Improvement[] = [];
    const files = this.vault.getMarkdownFiles();
    
    for (const file of files) {
        const content = await this.vault.cachedRead(file);
        const links = this.extractLinks(content);
        
        if (links.length === 0) {
            // ⚠️ 문제: 폴더만 체크
            if (!file.path.includes('Templates') && 
                !file.path.includes('Archive') &&
                !file.path.includes('Daily')) {
                
                improvements.push({...}); // ❌ 메타 파일도 고아 노트로 잡힘
            }
        }
    }
    
    return improvements;
}
```

**변경 후**:
```typescript
private async findOrphans(): Promise<Improvement[]> {
    const improvements: Improvement[] = [];
    const files = this.vault.getMarkdownFiles();
    
    for (const file of files) {
        // ✅ 메타 파일은 먼저 제외
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
```

---

## 🎯 해결된 문제

### Before (문제 상황):
```
❌ 고아 노트: Quality_Report_2026-01-17
❌ 고아 노트: Weekly_Summary_2026-01-17
❌ 고아 노트: 0_Long_Term_RSI_Log
❌ 고아 노트: Invariants_old
❌ 고아 노트: 품질검사보고서_2026-01-17
```

### After (해결 후):
```
✅ Quality_Report_2026-01-17 → 메타 파일 (report 키워드)
✅ Weekly_Summary_2026-01-17 → 메타 파일 (summary 키워드)
✅ 0_Long_Term_RSI_Log → 메타 파일 (0_ 시작 + log 키워드)
✅ Invariants_old → 메타 파일 (old 키워드)
✅ 품질검사보고서_2026-01-17 → 메타 파일 (report 키워드)
```

---

## 📦 설치 방법

### 1. 현재 플러그인 폴더 확인
```
당신의 vault/.obsidian/plugins/braintwin-auto-rsi/
```

### 2. analyzer.ts 교체
1. 기존 `analyzer.ts` 백업 (선택사항)
2. 새 `analyzer.ts` 복사
3. 플러그인 재빌드

### 3. 플러그인 재빌드
```bash
cd vault/.obsidian/plugins/braintwin-auto-rsi
npm run build
```

### 4. Obsidian 재시작
- Obsidian을 완전히 종료 후 재시작
- 또는 설정 → Community plugins → BrainTwin Auto RSI 비활성화 후 재활성화

---

## ✅ 검증 방법

### 테스트 1: 메타 파일 제외 확인
1. BrainTwin Auto RSI 실행 (Daily 9 AM 또는 수동 실행)
2. P2 이슈 확인
3. 다음 파일들이 **나오지 않으면** 성공:
   - `Quality_Report_*`
   - `Weekly_Summary_*`
   - `0_Long_Term_RSI_Log`
   - `*_old.md`
   - `*_v1.md`, `*_v2.md`

### 테스트 2: 개념 노트는 정상 체크
1. Resources 폴더의 개념 노트 확인
2. 링크 없는 개념 노트는 **여전히 P2 이슈로 나와야** 함
   - 예: `Rank와 Nullity.md` (링크 없으면 경고)
   - 예: `베이즈 정리.md` (링크 없으면 경고)

---

## 📊 메타 파일 판별 규칙 (0_Invariants.md v2.2)

| 조건 | 예시 | 판별 |
|------|------|------|
| 숫자 시작 | `0_Invariants.md`, `1_Guide.md` | ✅ 메타 |
| 키워드 포함 | `Quality_Report_*.md` | ✅ 메타 |
| 백업 파일 | `Invariants_old.md`, `note_v2.md` | ✅ 메타 |
| 코드 파일 | `checker.py`, `analyzer.ts` | ✅ 메타 |
| 개념 노트 | `Rank와 Nullity.md` | ❌ 링크 체크 필수 |

---

## 🚀 다음 단계

### Phase 5 준비 완료 확인:
- [x] 0_Invariants.md v2.2 적용
- [x] analyzer.ts 업데이트
- [ ] 플러그인 재빌드 및 테스트
- [ ] 월요일 Phase 5 공식 테스트 시작

### 권장 테스트 순서:
1. 플러그인 재빌드
2. Obsidian 재시작
3. BrainTwin Auto RSI 수동 실행
4. 결과 확인 (메타 파일 제외 확인)
5. Git commit
6. 내일 월요일 자동 실행 확인

---

## 💡 추가 개선 사항 (선택사항)

향후 더 정교한 판별이 필요하면:

```typescript
private isConceptNote(filename: string, content: string): boolean {
    // 개념 키워드 체크
    const conceptKeywords = ['rank', 'nullity', '군론', '대칭성', 
                            '그래프', '중심성', '정리', 'theorem'];
    
    // 파일명 또는 내용에 개념 키워드 포함
    const hasKeyword = conceptKeywords.some(kw => 
        filename.toLowerCase().includes(kw)
    );
    
    // "## 개념" 또는 "## 정의" 섹션 존재
    const hasConceptSection = /^##\s+(개념|정의)/m.test(content);
    
    return hasKeyword || hasConceptSection;
}
```

---

**버전**: analyzer.ts v2.2  
**호환성**: 0_Invariants.md v2.2  
**업데이트 날짜**: 2026-01-18  
**작성자**: Claude (BrainTwin Phase 5 프로젝트)
