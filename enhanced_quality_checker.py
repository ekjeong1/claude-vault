#!/usr/bin/env python3
"""
Enhanced Quality Checker for Obsidian RSI
확장된 Invariants 기반 품질 검증
"""

import re
from pathlib import Path
from typing import List, Dict, Tuple

class QualityChecker:
    """
    노트 품질 검증 클래스
    """
    
    def __init__(self, invariants_path=None):
        self.issues = []
        self.meta_files_prefixes = ['0_', '1_', '2_', '_']
    
    # ===== Part 1: 구조적 품질 (기존) =====
    
    def check_file_naming(self, file_path: Path) -> List[Dict]:
        """
        파일 명명 규칙 검증
        """
        issues = []
        name = file_path.stem
        
        # Untitled 체크
        if 'Untitled' in name:
            issues.append({
                'priority': 'P2',
                'category': '파일명',
                'file': file_path.name,
                'issue': f"Untitled 파일: {name}",
                'suggestion': "의미있는 이름으로 변경 필요"
            })
        
        return issues
    
    def check_links(self, content: str, file_path: Path) -> List[Dict]:
        """
        링크 구조 검증
        """
        issues = []
        
        # 메타 파일 제외
        if any(file_path.name.startswith(prefix) for prefix in self.meta_files_prefixes):
            return issues
        
        # 링크 추출 [[링크]]
        links = re.findall(r'\[\[(.*?)\]\]', content)
        
        if len(links) == 0:
            issues.append({
                'priority': 'P2',
                'category': '링크',
                'file': file_path.name,
                'issue': "고아 노트 (링크 없음)",
                'suggestion': "최소 1개 이상의 관련 개념 링크 추가"
            })
        elif len(links) < 2:
            issues.append({
                'priority': 'P3',
                'category': '연결성',
                'file': file_path.name,
                'issue': "링크가 1개뿐 (격리 위험)",
                'suggestion': "2개 이상의 관련 개념 연결 권장"
            })
        
        return issues
    
    def check_sections(self, content: str, file_path: Path) -> List[Dict]:
        """
        섹션 구조 검증
        """
        issues = []
        
        # 섹션 추출
        sections = re.findall(r'^##\s+(.+)$', content, re.MULTILINE)
        
        # 핵심 내용 섹션 체크
        core_content_section = None
        for match in re.finditer(r'^##\s+핵심\s*내용\s*$(.*?)(?=^##|\Z)', content, re.MULTILINE | re.DOTALL):
            core_content_section = match.group(1).strip()
            break
        
        if core_content_section is not None:
            if len(core_content_section) < 10:
                issues.append({
                    'priority': 'P1',
                    'category': '빈 섹션',
                    'file': file_path.name,
                    'issue': "'핵심 내용' 섹션이 비어있음",
                    'suggestion': "핵심 내용 작성 필요"
                })
        
        return issues
    
    # ===== Part 2: 내용적 품질 (신규) =====
    
    def check_content_quality(self, content: str, file_path: Path) -> List[Dict]:
        """
        내용 충실성 검증
        """
        issues = []
        
        # 핵심 내용 길이 체크
        core_content_section = None
        for match in re.finditer(r'^##\s+핵심\s*내용\s*$(.*?)(?=^##|\Z)', content, re.MULTILINE | re.DOTALL):
            core_content_section = match.group(1).strip()
            break
        
        if core_content_section:
            if len(core_content_section) < 150:
                issues.append({
                    'priority': 'P2',
                    'category': '내용 품질',
                    'file': file_path.name,
                    'issue': f"핵심 내용이 짧음 ({len(core_content_section)}자)",
                    'suggestion': "최소 150자 이상 작성 권장"
                })
            
            # 모호한 표현 체크
            vague_terms = ['등등', '등과 같은', '여러', '다양한']
            found_vague = [term for term in vague_terms if term in core_content_section]
            if found_vague:
                issues.append({
                    'priority': 'P3',
                    'category': '명확성',
                    'file': file_path.name,
                    'issue': f"모호한 표현 발견: {', '.join(found_vague)}",
                    'suggestion': "구체적인 표현으로 변경 권장"
                })
        
        return issues
    
    def check_clarity(self, content: str, file_path: Path) -> List[Dict]:
        """
        설명 명확성 검증
        """
        issues = []
        
        # 문장 길이 체크
        sentences = re.split(r'[.!?]\s+', content)
        long_sentences = [s for s in sentences if len(s) > 100]
        
        if len(long_sentences) > 5:
            issues.append({
                'priority': 'P3',
                'category': '명확성',
                'file': file_path.name,
                'issue': f"{len(long_sentences)}개 문장이 너무 김 (100자 이상)",
                'suggestion': "긴 문장을 짧게 분리 권장"
            })
        
        return issues
    
    def check_connectivity(self, content: str, file_path: Path) -> List[Dict]:
        """
        개념 연결성 검증
        """
        issues = []
        
        # 메타 파일 제외
        if any(file_path.name.startswith(prefix) for prefix in self.meta_files_prefixes):
            return issues
        
        # 링크와 맥락 체크
        links = re.findall(r'\[\[(.*?)\]\]', content)
        
        # 맥락 있는 링크 (링크 주변에 설명이 있는지)
        contextual_links = 0
        for match in re.finditer(r'(.{20})\[\[.*?\]\](.{20})', content):
            before = match.group(1).strip()
            after = match.group(2).strip()
            # 앞뒤에 한글이 있으면 맥락 있는 링크로 판단
            if (any('\uac00' <= c <= '\ud7a3' for c in before) or 
                any('\uac00' <= c <= '\ud7a3' for c in after)):
                contextual_links += 1
        
        if links and contextual_links / len(links) < 0.3:
            issues.append({
                'priority': 'P3',
                'category': '연결성',
                'file': file_path.name,
                'issue': f"링크 중 맥락 없는 것이 많음 ({contextual_links}/{len(links)})",
                'suggestion': "링크에 설명 추가 권장"
            })
        
        return issues
    
    def check_rag_optimization(self, content: str, file_path: Path) -> List[Dict]:
        """
        RAG 최적화 검증 (Phase 5 기준)
        """
        issues = []
        
        # 메타 파일 제외
        if any(file_path.name.startswith(prefix) for prefix in self.meta_files_prefixes):
            return issues
        
        char_count = len(content)
        sections = re.findall(r'^##\s+', content, re.MULTILINE)
        section_count = len(sections)
        
        # 길이 체크
        if char_count < 1000:
            issues.append({
                'priority': 'P2',
                'category': 'RAG 최적화',
                'file': file_path.name,
                'issue': f"노트가 짧음 ({char_count}자)",
                'suggestion': "1,500-2,000자 권장 (Phase 5 기준)"
            })
        elif char_count > 3500:
            issues.append({
                'priority': 'P2',
                'category': 'RAG 최적화',
                'file': file_path.name,
                'issue': f"노트가 너무 김 ({char_count}자)",
                'suggestion': "2,000자 이하 권장 - V3의 역설 참고"
            })
        
        # 섹션 수 체크
        if section_count > 0:
            if section_count < 4:
                issues.append({
                    'priority': 'P3',
                    'category': 'RAG 최적화',
                    'file': file_path.name,
                    'issue': f"섹션 부족 ({section_count}개)",
                    'suggestion': "5-8개 섹션 권장"
                })
            elif section_count > 10:
                issues.append({
                    'priority': 'P3',
                    'category': 'RAG 최적화',
                    'file': file_path.name,
                    'issue': f"섹션 과다 ({section_count}개)",
                    'suggestion': "5-8개 섹션 권장"
                })
            
            # 정보 밀도
            density = char_count / section_count
            if density < 150:
                issues.append({
                    'priority': 'P3',
                    'category': 'RAG 최적화',
                    'file': file_path.name,
                    'issue': f"정보 밀도 낮음 ({density:.0f}자/섹션)",
                    'suggestion': "200-250자/섹션 권장"
                })
            elif density > 450:
                issues.append({
                    'priority': 'P3',
                    'category': 'RAG 최적화',
                    'file': file_path.name,
                    'issue': f"정보 밀도 높음 ({density:.0f}자/섹션)",
                    'suggestion': "200-250자/섹션 권장"
                })
        
        return issues
    
    def check_example_quality(self, content: str, file_path: Path) -> List[Dict]:
        """
        예제 품질 검증
        """
        issues = []
        
        # 예제/사례 섹션 찾기
        example_sections = re.findall(
            r'^###\s+(사례|예제|Example)\s+\d+:?\s*(.+?)$\n(.*?)(?=^###|^##|\Z)',
            content,
            re.MULTILINE | re.DOTALL
        )
        
        if len(example_sections) > 4:
            issues.append({
                'priority': 'P3',
                'category': '예제 품질',
                'file': file_path.name,
                'issue': f"예제가 너무 많음 ({len(example_sections)}개)",
                'suggestion': "2-3개 권장 (Phase 5: V3의 3개 강제 문제)"
            })
        
        # 각 예제 품질 체크
        vague_terms = ['어떤', '특정', '일부']
        for i, (label, title, content_part) in enumerate(example_sections, 1):
            # 추상적 표현 체크
            if any(term in title or term in content_part for term in vague_terms):
                issues.append({
                    'priority': 'P3',
                    'category': '예제 품질',
                    'file': file_path.name,
                    'issue': f"예제 {i}가 추상적",
                    'suggestion': "구체적인 이름/숫자 포함 권장"
                })
            
            # 길이 체크
            if len(content_part.strip()) < 100:
                issues.append({
                    'priority': 'P3',
                    'category': '예제 품질',
                    'file': file_path.name,
                    'issue': f"예제 {i} 설명이 짧음 ({len(content_part)}자)",
                    'suggestion': "최소 100자 이상 권장"
                })
        
        return issues
    
    def calculate_quality_score(self, all_issues: List[Dict]) -> int:
        """
        품질 점수 계산 (0-100)
        """
        score = 100
        
        for issue in all_issues:
            if issue['priority'] == 'P1':
                score -= 15
            elif issue['priority'] == 'P2':
                score -= 5
            elif issue['priority'] == 'P3':
                score -= 2
        
        return max(0, score)
    
    def check_note(self, file_path: Path) -> Tuple[int, List[Dict]]:
        """
        단일 노트 검증
        """
        if not file_path.exists():
            return 0, []
        
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        all_issues = []
        
        # Part 1: 구조적 품질
        all_issues.extend(self.check_file_naming(file_path))
        all_issues.extend(self.check_links(content, file_path))
        all_issues.extend(self.check_sections(content, file_path))
        
        # Part 2: 내용적 품질
        all_issues.extend(self.check_content_quality(content, file_path))
        all_issues.extend(self.check_clarity(content, file_path))
        all_issues.extend(self.check_connectivity(content, file_path))
        all_issues.extend(self.check_rag_optimization(content, file_path))
        all_issues.extend(self.check_example_quality(content, file_path))
        
        # 점수 계산
        score = self.calculate_quality_score(all_issues)
        
        return score, all_issues


def main():
    """
    메인 실행 함수
    """
    print("="*60)
    print("Enhanced Quality Checker for Obsidian RSI")
    print("="*60)
    
    # Vault 경로 설정 (수정 필요)
    vault_path = Path("C:\Users\win10_original\claude-vault")
    
    if not vault_path.exists():
        print(f"❌ Error: Vault not found at {vault_path}")
        return
    
    print(f"\n📂 Vault: {vault_path}")
    
    # 모든 .md 파일 찾기
    md_files = list(vault_path.glob("**/*.md"))
    print(f"📄 Found {len(md_files)} markdown files")
    
    # 품질 체커 초기화
    checker = QualityChecker()
    
    # 전체 통계
    all_issues = []
    scores = {}
    
    print("\n🔍 Checking notes...")
    
    for file_path in md_files:
        score, issues = checker.check_note(file_path)
        
        if issues:
            all_issues.extend(issues)
            scores[file_path.name] = score
    
    print(f"✓ Checked {len(md_files)} files")
    print(f"✓ Found {len(all_issues)} issues")
    
    # 통계 출력
    print("\n" + "="*60)
    print("📊 Quality Statistics")
    print("="*60)
    
    if scores:
        avg_score = sum(scores.values()) / len(scores)
        print(f"\n평균 품질 점수: {avg_score:.1f}/100")
        
        # 등급별 분포
        excellent = sum(1 for s in scores.values() if s >= 90)
        good = sum(1 for s in scores.values() if 75 <= s < 90)
        fair = sum(1 for s in scores.values() if 60 <= s < 75)
        poor = sum(1 for s in scores.values() if s < 60)
        
        print(f"\n등급 분포:")
        print(f"  Excellent (90-100): {excellent}개")
        print(f"  Good (75-89): {good}개")
        print(f"  Fair (60-74): {fair}개")
        print(f"  Poor (0-59): {poor}개")
    
    # 우선순위별 통계
    if all_issues:
        print(f"\n우선순위별 이슈:")
        p1_count = sum(1 for i in all_issues if i['priority'] == 'P1')
        p2_count = sum(1 for i in all_issues if i['priority'] == 'P2')
        p3_count = sum(1 for i in all_issues if i['priority'] == 'P3')
        
        print(f"  P1 (Critical): {p1_count}개")
        print(f"  P2 (Important): {p2_count}개")
        print(f"  P3 (Nice-to-have): {p3_count}개")
        
        # 카테고리별 통계
        from collections import Counter
        categories = Counter(i['category'] for i in all_issues)
        
        print(f"\n카테고리별 이슈 (Top 5):")
        for category, count in categories.most_common(5):
            print(f"  {category}: {count}개")
    
    # 낮은 점수 파일 출력
    if scores:
        print(f"\n⚠️ 개선 필요 파일 (점수 < 70):")
        low_scores = [(name, score) for name, score in scores.items() if score < 70]
        low_scores.sort(key=lambda x: x[1])
        
        for name, score in low_scores[:10]:
            print(f"  {name}: {score:.0f}점")
    
    print("\n" + "="*60)
    print("✨ Quality check completed!")
    print("="*60)


if __name__ == "__main__":
    main()
