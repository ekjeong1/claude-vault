#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Enhanced Quality Checker v2.0 - Korean Version
BrainTwin Vault 품질 검사 도구 (한글 보고서)
"""

import os
import re
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Tuple

class QualityChecker:
    """노트 품질을 검사하는 메인 클래스"""
    
    def __init__(self, vault_path: str, invariants_path: str):
        self.vault_path = Path(vault_path)
        self.invariants_path = Path(invariants_path)
        self.issues = []
        self.file_scores = {}
        
    def check_all_notes(self) -> Dict:
        """모든 노트 파일 검사"""
        results = {
            'total_files': 0,
            'files_with_issues': 0,
            'total_issues': 0,
            'issues_by_priority': {'P1': 0, 'P2': 0, 'P3': 0},
            'issues_by_category': {},
            'average_score': 0,
            'grade_distribution': {'Excellent': 0, 'Good': 0, 'Fair': 0, 'Poor': 0}
        }
        
        total_score = 0
        
        # .md 파일 찾기
        for md_file in self.vault_path.rglob('*.md'):
            # 숨김 파일이나 .git 폴더 제외
            if any(part.startswith('.') for part in md_file.parts):
                continue
                
            results['total_files'] += 1
            
            # 파일 읽기
            try:
                content = md_file.read_text(encoding='utf-8')
            except Exception as e:
                print(f"❌ 파일 읽기 실패: {md_file} - {e}")
                continue
            
            # 품질 검사
            file_issues = self.check_file(md_file, content)
            
            # 점수 계산
            score = self.calculate_score(content, file_issues, md_file)
            self.file_scores[str(md_file)] = score
            total_score += score
            
            # 등급 분류
            if score >= 90:
                results['grade_distribution']['Excellent'] += 1
            elif score >= 75:
                results['grade_distribution']['Good'] += 1
            elif score >= 60:
                results['grade_distribution']['Fair'] += 1
            else:
                results['grade_distribution']['Poor'] += 1
            
            # 이슈가 있는 파일 카운트
            if file_issues:
                results['files_with_issues'] += 1
                
            # 이슈 통계
            for issue in file_issues:
                self.issues.append({**issue, 'file': md_file.name})
                results['total_issues'] += 1
                results['issues_by_priority'][issue['priority']] += 1
                
                category = issue['category']
                results['issues_by_category'][category] = \
                    results['issues_by_category'].get(category, 0) + 1
        
        # 평균 점수
        if results['total_files'] > 0:
            results['average_score'] = total_score / results['total_files']
        
        return results
    
    def check_file(self, file_path: Path, content: str) -> List[Dict]:
        """개별 파일 검사"""
        issues = []
        
        # 1. 파일명 검사
        issues.extend(self.check_filename(file_path))
        
        # 2. 링크 검사
        issues.extend(self.check_links(file_path, content))
        
        # 3. 섹션 검사
        issues.extend(self.check_sections(file_path, content))
        
        # 4. 수학식 검사
        issues.extend(self.check_math_requirement(file_path, content))
        
        # 5. RAG 최적화 검사
        issues.extend(self.check_rag_optimization(file_path, content))
        
        # 6. 명확성 검사
        issues.extend(self.check_clarity(file_path, content))
        
        return issues
    
    def check_filename(self, file_path: Path) -> List[Dict]:
        """파일명 규칙 검사"""
        issues = []
        filename = file_path.name
        
        # Untitled 파일 체크
        if 'untitled' in filename.lower():
            issues.append({
                'priority': 'P2',
                'category': '파일명',
                'issue': 'Untitled 파일',
                'suggestion': '48시간 내 의미있는 이름으로 변경 필요'
            })
        
        return issues
    
    def check_links(self, file_path: Path, content: str) -> List[Dict]:
        """링크 구조 검사"""
        issues = []
        
        # 메타 문서 제외 (숫자로 시작하는 파일, README 등)
        filename = file_path.name.lower()
        meta_patterns = ['0_', '1_', '2_', '3_', 'readme', 'changelog', 
                        'license', 'gitignore', 'index', 'log', 'guide', 'agenda']
        is_meta = any(pattern in filename for pattern in meta_patterns)
        
        if is_meta:
            return issues
        
        # 링크 패턴: [[...]] 또는 [...](...) 
        wiki_links = re.findall(r'\[\[([^\]]+)\]\]', content)
        md_links = re.findall(r'\[([^\]]+)\]\(([^\)]+)\)', content)
        
        total_links = len(wiki_links) + len(md_links)
        
        if total_links == 0:
            issues.append({
                'priority': 'P1',
                'category': '링크',
                'issue': '고아 노트 (링크 없음)',
                'suggestion': '최소 1개 이상의 관련 개념 링크 추가'
            })
        
        return issues
    
    def check_sections(self, file_path: Path, content: str) -> List[Dict]:
        """섹션 구조 검사"""
        issues = []
        
        # "## 핵심 내용" 섹션 체크
        core_section_match = re.search(r'^##\s+핵심\s*내용\s*$(.*?)(?=^##|\Z)', 
                                      content, re.MULTILINE | re.DOTALL)
        
        if core_section_match:
            section_content = core_section_match.group(1).strip()
            if len(section_content) < 10:  # 거의 비어있음
                issues.append({
                    'priority': 'P1',
                    'category': '빈 섹션',
                    'issue': '\'핵심 내용\' 섹션이 비어있음',
                    'suggestion': '핵심 내용 작성 필요'
                })
        
        return issues
    
    def check_math_requirement(self, file_path: Path, content: str) -> List[Dict]:
        """수학식 요구사항 검사 (BrainTwin 특화)"""
        issues = []
        
        filename = file_path.name.lower()
        
        # 메타 파일 제외
        meta_patterns = ['0_', '1_', '2_', '3_', '_',
                        'index', 'log', 'readme', 'guide', 'agenda']
        if any(pattern in filename for pattern in meta_patterns):
            return issues
        
        # 개념 노트 판별
        concept_keywords = ['rank', 'nullity', '군론', '대칭성',
                           '그래프', '중심성', '정리', 'theorem',
                           '개념', '이론', 'theory', '베이즈', 'bayes',
                           'phase', 'transition', '내쉬', 'nash',
                           '포트폴리오', 'portfolio', '행동경제',
                           '극값', '엔트로피', 'entropy', '최적화']
        
        is_concept_note = (
            any(kw in filename for kw in concept_keywords) or
            re.search(r'^##\s+(개념|정의)', content, re.MULTILINE)
        )
        
        if not is_concept_note:
            return issues
        
        # 수학식 체크
        has_inline = content.count('$') >= 2  # $...$
        has_block = '$$' in content            # $$...$$
        has_math = has_inline or has_block
        
        if not has_math:
            issues.append({
                'priority': 'P1',
                'category': '수학식',
                'issue': '개념 노트에 수학식 없음',
                'suggestion': 'LaTeX 수학식 추가: $E=mc^2$ 또는 $$\\int f(x)dx$$'
            })
        
        return issues
    
    def check_rag_optimization(self, file_path: Path, content: str) -> List[Dict]:
        """RAG 최적화 검사"""
        issues = []
        
        char_count = len(content)
        section_count = len(re.findall(r'^##\s+', content, re.MULTILINE))
        
        # 메타 파일 제외
        filename = file_path.name.lower()
        if any(p in filename for p in ['0_', '1_', '2_', '3_', 'readme', 'changelog']):
            return issues
        
        # 길이 체크
        if char_count < 1000:
            issues.append({
                'priority': 'P3',
                'category': 'RAG 최적화',
                'issue': f'노트가 짧음 ({char_count}자)',
                'suggestion': '1,500-2,000자 권장'
            })
        elif char_count > 3000:
            issues.append({
                'priority': 'P3',
                'category': 'RAG 최적화',
                'issue': f'노트가 김 ({char_count}자)',
                'suggestion': '2,000자 이하 권장 (V3의 역설 참고)'
            })
        
        # 섹션 수 체크
        if section_count > 0:
            if section_count < 5:
                issues.append({
                    'priority': 'P3',
                    'category': 'RAG 최적화',
                    'issue': f'섹션 부족 ({section_count}개)',
                    'suggestion': '5-8개 섹션 권장'
                })
            elif section_count > 10:
                issues.append({
                    'priority': 'P3',
                    'category': 'RAG 최적화',
                    'issue': f'섹션 과다 ({section_count}개)',
                    'suggestion': '5-8개 섹션 권장'
                })
        
        return issues
    
    def check_clarity(self, file_path: Path, content: str) -> List[Dict]:
        """명확성 검사"""
        issues = []
        
        # 모호한 표현 체크
        vague_terms = ['등등', '등과 같은', '여러', '다양한']
        found_vague = [term for term in vague_terms if term in content]
        
        if found_vague:
            issues.append({
                'priority': 'P2',
                'category': '명확성',
                'issue': f'모호한 표현 발견: {", ".join(found_vague)}',
                'suggestion': '구체적으로 명시 필요'
            })
        
        return issues
    
    def calculate_score(self, content: str, issues: List[Dict], file_path: Path) -> float:
        """품질 점수 계산 (0-100)"""
        score = 100.0
        
        # 파일명 체크
        if 'untitled' in file_path.name.lower():
            score -= 10
        
        # 이슈별 감점
        for issue in issues:
            if issue['priority'] == 'P1':
                score -= 15
            elif issue['priority'] == 'P2':
                score -= 5
            elif issue['priority'] == 'P3':
                score -= 2
        
        return max(0, score)
    
    def generate_report(self, results: Dict, output_path: str):
        """한글 보고서 생성"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M')
        
        report = f"""# 📊 품질 검사 보고서

**생성 시각:** {timestamp}  
**Vault 경로:** `{self.vault_path}`  
**기준:** `{self.invariants_path.name}` (Phase 5)

---

## 📈 전체 통계

- **평균 품질 점수:** {results['average_score']:.1f}/100
- **검사한 파일 수:** {results['total_files']:,}개
- **이슈 있는 파일:** {results['files_with_issues']:,}개
- **발견된 총 이슈:** {results['total_issues']:,}개

### 🎯 등급 분포

- **Excellent (90-100점):** {results['grade_distribution']['Excellent']}개 ({results['grade_distribution']['Excellent']/results['total_files']*100:.1f}%)
- **Good (75-89점):** {results['grade_distribution']['Good']}개 ({results['grade_distribution']['Good']/results['total_files']*100:.1f}%)
- **Fair (60-74점):** {results['grade_distribution']['Fair']}개 ({results['grade_distribution']['Fair']/results['total_files']*100:.1f}%)
- **Poor (0-59점):** {results['grade_distribution']['Poor']}개 ({results['grade_distribution']['Poor']/results['total_files']*100:.1f}%)

### 🚨 우선순위별 이슈

- **P1 (긴급):** {results['issues_by_priority']['P1']:,}개 - 즉시 해결 필요
- **P2 (중요):** {results['issues_by_priority']['P2']:,}개 - 조속히 개선 권장
- **P3 (권장):** {results['issues_by_priority']['P3']:,}개 - 점진적 개선

### 📋 카테고리별 이슈 (Top 5)

"""
        # 카테고리별 정렬
        sorted_categories = sorted(results['issues_by_category'].items(), 
                                  key=lambda x: x[1], reverse=True)[:5]
        for category, count in sorted_categories:
            report += f"- **{category}:** {count:,}개\n"
        
        report += "\n---\n\n## 🔴 주의 필요 파일\n\n"
        
        # Poor 등급 파일
        poor_files = [(f, s) for f, s in self.file_scores.items() if s < 60]
        if poor_files:
            report += "### 긴급 (점수 60점 미만)\n\n"
            for file_path, score in sorted(poor_files, key=lambda x: x[1]):
                filename = Path(file_path).name
                report += f"- **{filename}** - {score:.0f}점\n"
        else:
            report += "### 긴급 (점수 60점 미만)\n\n*없음 - 모든 파일이 60점 이상입니다!* ✅\n"
        
        report += "\n"
        
        # Fair 등급 파일
        fair_files = [(f, s) for f, s in self.file_scores.items() if 60 <= s < 75]
        if fair_files:
            report += "### 개선 필요 (점수 60-74점)\n\n"
            for file_path, score in sorted(fair_files, key=lambda x: x[1])[:15]:
                filename = Path(file_path).name
                report += f"- **{filename}** - {score:.0f}점\n"
        
        report += "\n---\n\n## ⚠️ 긴급 이슈 (P1) - 즉시 조치 필요\n\n"
        
        # P1 이슈만 필터링
        p1_issues = [issue for issue in self.issues if issue['priority'] == 'P1']
        
        if not p1_issues:
            report += "*P1 이슈 없음* ✅\n"
        else:
            # 파일별로 그룹화
            issues_by_file = {}
            for issue in p1_issues:
                filename = issue['file']
                if filename not in issues_by_file:
                    issues_by_file[filename] = []
                issues_by_file[filename].append(issue)
            
            # 파일별로 출력 (최대 50개)
            count = 0
            for filename, issues in sorted(issues_by_file.items()):
                if count >= 50:
                    report += f"\n*...외 {len(issues_by_file) - count}개 파일 생략*\n"
                    break
                    
                report += f"### [{filename}]\n\n"
                for issue in issues:
                    report += f"- **카테고리:** {issue['category']}\n"
                    report += f"- **이슈:** {issue['issue']}\n"
                    report += f"- **제안:** {issue['suggestion']}\n\n"
                
                count += 1
        
        report += "\n---\n\n## 📝 참고사항\n\n"
        report += f"- 이 보고서는 `{self.invariants_path.name}` (Phase 5 기준)을 기반으로 생성되었습니다.\n"
        report += "- P1 이슈는 노트의 핵심 기능을 저해하므로 즉시 해결이 필요합니다.\n"
        report += "- P2 이슈는 품질 향상을 위해 조속히 개선을 권장합니다.\n"
        report += "- P3 이슈는 점진적으로 개선하면 됩니다.\n\n"
        report += f"**생성 도구:** Enhanced Quality Checker v2.0 (Korean)  \n"
        report += f"**보고서 생성:** {timestamp}\n"
        
        # 파일 저장
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(report)
        
        print(f"\n✅ 보고서 생성 완료: {output_path}")


def main():
    """메인 함수"""
    # 경로 설정 (Windows 경로)
    vault_path = r"C:\Users\win10_original\claude-vault"
    invariants_path = r"C:\Users\win10_original\claude-vault\0_Invariants.md"
    
    # 경로 존재 확인
    if not os.path.exists(vault_path):
        print(f"❌ Vault 경로를 찾을 수 없습니다: {vault_path}")
        return
    
    if not os.path.exists(invariants_path):
        print(f"⚠️ Invariants 파일을 찾을 수 없습니다: {invariants_path}")
        print("기본 규칙으로 검사를 진행합니다.")
    
    print("🔍 BrainTwin Vault 품질 검사 시작...")
    print(f"📂 Vault: {vault_path}")
    print(f"📋 기준: 0_Invariants.md (Phase 5)\n")
    
    # 품질 검사 실행
    checker = QualityChecker(vault_path, invariants_path)
    results = checker.check_all_notes()
    
    # 결과 출력
    print("\n" + "="*60)
    print("📊 검사 완료!")
    print("="*60)
    print(f"총 파일 수: {results['total_files']:,}개")
    print(f"평균 점수: {results['average_score']:.1f}/100")
    print(f"발견된 이슈: {results['total_issues']:,}개")
    print(f"  - P1 (긴급): {results['issues_by_priority']['P1']:,}개")
    print(f"  - P2 (중요): {results['issues_by_priority']['P2']:,}개")
    print(f"  - P3 (권장): {results['issues_by_priority']['P3']:,}개")
    print("="*60 + "\n")
    
    # 보고서 생성
    timestamp = datetime.now().strftime('%Y-%m-%d')
    report_path = os.path.join(vault_path, f'품질검사보고서_{timestamp}.md')
    checker.generate_report(results, report_path)
    
    print(f"✅ 모든 작업 완료!")
    print(f"📄 보고서: {report_path}")


if __name__ == "__main__":
    main()
