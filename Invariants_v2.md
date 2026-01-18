# BrainTwin Vault 불변량 정의 (확장판)

## 📋 개요

이 문서는 BrainTwin Vault의 핵심 불변량을 정의합니다.
Phase 5 연구 결과를 반영하여 **구조적 품질 + 내용적 품질**을 모두 검증합니다.

---

## 🏗️ Part 1: 구조적 품질 (기존)

### 1. 파일 명명 규칙

**규칙:**
- 모든 파일은 의미있는 이름을 가져야 함
- 숫자로 시작하는 파일: 0_, 1_, 2_ 등은 메타 문서
- `Untitled` 파일은 48시간 내에 이름 변경 필수

**검증:**
```python
# Bad
Untitled.md
Untitled 1.md

# Good
YOLO.md
0_Long_Term_RSI_Log.md
```

---

### 2. 링크 구조

**규칙:**
- 모든 노트는 최소 1개 이상의 링크를 가져야 함 (메타 문서 제외)
- 고아 노트(orphan)는 P2 우선순위로 개선
- 양방향 링크 권장 (backlink 활용)

**검증:**
```python
def check_links(note):
    links = extract_links(note)
    return len(links) >= 1
```

---

### 3. 섹션 구조

**규칙:**
- "## 핵심 내용" 섹션은 비어있으면 안 됨
- "## 관련 노트" 섹션에는 최소 1개 이상의 링크
- 섹션 제목은 명확하고 일관되게

**검증:**
```python
# 필수 섹션
required_sections = ["핵심 내용", "관련 노트"]

# 빈 섹션 체크
if section_is_empty("핵심 내용"):
    flag_as_P2_issue()
```

---

### 4. Git 관리

**규칙:**
- 변경사항은 정기적으로 커밋 (Daily)
- 커밋 메시지는 명확하게 작성
- Uncommitted changes는 24시간 이내 처리

**검증:**
```bash
git status --porcelain
# 출력 있으면 → P1 이슈
```

---

## 📝 Part 2: 내용적 품질 (신규 - Phase 5 기반)

### 5. 내용 충실성

**규칙:**
- "## 핵심 내용" 섹션은 최소 3문장 이상 (약 150자)
- 각 개념은 명확한 정의를 포함
- 예제가 있는 경우 구체적이어야 함 (추상적 설명 지양)
- 모호한 표현 지양: "등등", "등과 같은", "여러", "다양한" (구체화 필요)

**검증:**
```python
def check_content_quality(note):
    core_content = extract_section(note, "핵심 내용")
    
    # 최소 길이 체크
    if len(core_content) < 150:
        return False, "핵심 내용이 너무 짧음 (최소 150자)"
    
    # 모호한 표현 체크
    vague_terms = ["등등", "등과 같은", "여러", "다양한"]
    if any(term in core_content for term in vague_terms):
        return False, "모호한 표현 발견 - 구체화 필요"
    
    return True, "OK"
```

---

### 6. 설명 명확성

**규칙:**
- 전문 용어는 첫 사용 시 정의 또는 링크 제공
- 문장은 간결하고 명확하게 (1문장 = 1개념)
- 논리적 비약 없이 순차적 설명
- 예제는 구체적인 숫자, 이름, 상황 포함

**검증:**
```python
def check_clarity(note):
    issues = []
    
    # 전문 용어 체크
    technical_terms = extract_technical_terms(note)
    for term in technical_terms:
        if not has_definition(note, term) and not has_link(note, term):
            issues.append(f"전문 용어 '{term}' 정의 필요")
    
    # 문장 길이 체크 (80자 이상 = 복잡할 가능성)
    long_sentences = find_long_sentences(note, threshold=80)
    if long_sentences:
        issues.append(f"{len(long_sentences)}개 문장이 너무 김 - 분리 권장")
    
    return issues
```

---

### 7. 개념 연결성

**규칙:**
- 관련 노트는 단순 링크가 아닌 **맥락과 함께** 제시
  - Bad: `[[개념A]]`
  - Good: `[[개념A]]는 이 개념의 상위 개념으로...`
- 상위/하위 개념 관계 명시
- 순환 참조 방지 (A → B → A)
- 최소 2개 이상의 관련 개념 연결 (격리 방지)

**검증:**
```python
def check_connectivity(note, all_notes):
    links = extract_links(note)
    
    # 최소 연결 체크
    if len(links) < 2:
        return False, "최소 2개 이상의 관련 개념 필요"
    
    # 맥락 있는 링크 체크
    contextual_links = count_links_with_context(note)
    if contextual_links / len(links) < 0.5:
        return False, "링크의 50% 이상은 맥락과 함께 제시 필요"
    
    return True, "OK"
```

---

### 8. RAG 최적화 (Phase 5 발견 기반)

**규칙:**
- 노트 길이: **1,500-2,000자 권장** (Phase 5: V4 평균 1,540자)
- 섹션 수: **5-8개 적정** (Phase 5: V4 평균 7.2개)
- 정보 밀도: **200-250자/섹션** (Phase 5: V4 214자/섹션)
- 할루시네이션 방지: 명확한 사실만 기술, 추측 금지

**검증:**
```python
def check_rag_optimization(note):
    char_count = len(note)
    section_count = count_sections(note)
    
    issues = []
    
    # 길이 체크
    if char_count < 1000:
        issues.append("노트가 너무 짧음 (1,500자 권장)")
    elif char_count > 3000:
        issues.append("노트가 너무 김 (2,000자 권장) - V3의 역설 참고")
    
    # 섹션 수 체크
    if section_count < 5:
        issues.append("섹션이 부족함 (5-8개 권장)")
    elif section_count > 10:
        issues.append("섹션이 너무 많음 (5-8개 권장)")
    
    # 정보 밀도 체크
    density = char_count / section_count if section_count > 0 else 0
    if density < 150:
        issues.append(f"정보 밀도 낮음 ({density:.0f}자/섹션, 200-250 권장)")
    elif density > 400:
        issues.append(f"정보 밀도 높음 ({density:.0f}자/섹션, 200-250 권장)")
    
    return issues
```

---

### 9. 예제 품질

**규칙:**
- 예제는 **구체적인 이름, 숫자, 상황** 포함
- 추상적 예제 지양: "어떤 회사", "특정 상황" → 구체적 기업명, 연도 명시
- 예제는 2-3개 권장 (Phase 5: V3의 3개 강제 문제 학습)
- 각 예제는 다른 관점 제시 (중복 방지)

**검증:**
```python
def check_example_quality(examples):
    issues = []
    
    for example in examples:
        # 구체성 체크
        if has_vague_terms(example, ["어떤", "특정", "일부"]):
            issues.append("예제가 추상적 - 구체적 이름/숫자 필요")
        
        # 길이 체크 (너무 짧으면 설명 부족)
        if len(example) < 100:
            issues.append("예제 설명이 너무 짧음 (최소 100자)")
    
    # 중복 체크
    if has_duplicate_examples(examples):
        issues.append("예제가 중복적 - 다른 관점 필요")
    
    return issues
```

---

### 10. TrendKorea 품질 기준 (Phase 5 실험 도메인)

**규칙:**
- **정의 섹션**: 트렌드의 명확한 정의 (1-2문장)
- **배경 섹션**: 등장 배경 및 사회적 맥락
- **특징 섹션**: 3-5개 핵심 특징 구조화
- **사례 섹션**: 2-3개 구체적 사례 (기업명, 제품명 명시)
- **시사점 섹션**: 비즈니스 또는 사회적 의미

**검증:**
```python
def check_trendkorea_format(note):
    required = ["정의", "배경", "특징", "사례", "시사점"]
    
    for section in required:
        if not has_section(note, section):
            return False, f"'{section}' 섹션 누락"
    
    # 사례 수 체크
    examples = count_examples(note)
    if examples < 2:
        return False, "최소 2개 사례 필요"
    elif examples > 4:
        return False, "사례가 너무 많음 (2-3개 권장)"
    
    return True, "OK"
```

---

## 🔍 검증 주기

### 자동 검증 (Auto RSI)
- **매일**: 구조적 품질 (Part 1) 전체 체크
- **매일**: 내용적 품질 (Part 2) 샘플링 체크 (20%)
- **주간**: 내용적 품질 전체 체크 (일요일)

### 우선순위
```
P1 (Critical): 
- Git Uncommitted changes
- 빈 핵심 내용 섹션
- 고아 노트 (링크 0개)

P2 (Important):
- Untitled 파일
- 내용 길이 부족 (<1,000자)
- 정보 밀도 문제
- 모호한 표현

P3 (Nice-to-have):
- 최적화 권장사항
- 예제 품질 개선
- 링크 맥락 추가
```

---

## 📊 품질 점수 계산

```python
def calculate_quality_score(note):
    """
    노트 품질 점수 (0-100)
    """
    score = 100
    
    # 구조적 품질 (40점)
    if not has_proper_name(note):
        score -= 10
    if not has_links(note):
        score -= 15
    if has_empty_sections(note):
        score -= 15
    
    # 내용적 품질 (60점)
    if len(note) < 1500:
        score -= 10
    content_issues = check_content_quality(note)
    score -= len(content_issues) * 5
    
    clarity_issues = check_clarity(note)
    score -= len(clarity_issues) * 3
    
    rag_issues = check_rag_optimization(note)
    score -= len(rag_issues) * 4
    
    return max(0, score)
```

**품질 등급:**
- 90-100: Excellent (개선 불필요)
- 75-89: Good (소폭 개선 권장)
- 60-74: Fair (개선 필요)
- 0-59: Poor (우선 개선 필요)

---

## 🎯 Phase 5 학습 반영

이 확장된 Invariants는 Phase 5 실험에서 배운 교훈을 반영합니다:

1. **"더 많다" ≠ "더 좋다"**
   - V3 (3,140자) < V4 (1,540자)
   - 최적 정보 밀도 중요

2. **유연한 구조 > 경직된 구조**
   - 고정 섹션보다 내용에 따라 조정
   - 5-8개 섹션 권장 (고정 아님)

3. **목표 제시 > 형식 강제**
   - "이렇게 써라" (X)
   - "할루시네이션 최소화하라" (O)

4. **프롬프트 효과 고려**
   - 너무 명확하면 개선 여지 없음 (V3: 0%p)
   - 적절한 품질 수준 유지

---

## 📝 버전 히스토리

- **v1.0** (2026-01-17): 초기 버전 (구조적 품질만)
- **v2.0** (2026-01-17): Phase 5 결과 반영 (내용적 품질 추가)

---

*이 문서는 살아있는 문서입니다. 새로운 인사이트가 발견되면 계속 업데이트됩니다.*
