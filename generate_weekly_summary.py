#!/usr/bin/env python3
"""
Weekly Summary Generator for Auto RSI (인코딩 자동 감지)
"""

import re
from pathlib import Path
from datetime import datetime, timedelta
from collections import defaultdict

def read_file_with_fallback_encoding(file_path):
    """여러 인코딩을 시도하여 파일 읽기"""
    encodings = ['utf-8', 'cp949', 'euc-kr', 'utf-16']
    
    for encoding in encodings:
        try:
            with open(file_path, 'r', encoding=encoding) as f:
                content = f.read()
                print(f"✓ 파일 인코딩: {encoding}")
                return content
        except (UnicodeDecodeError, UnicodeError):
            continue
    
    # 모두 실패하면 바이너리로 읽고 에러 무시
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
        print(f"⚠️ 인코딩 자동 감지 실패, UTF-8 (에러 무시)로 읽음")
        return content


def parse_rsi_log(log_file_path):
    """
    0_Long_Term_RSI_Log.md 파일 파싱
    """
    content = read_file_with_fallback_encoding(log_file_path)
    
    # Day별 섹션 추출 (## Day X 패턴)
    day_sections = re.split(r'^##\s+Day\s+(\d+)', content, flags=re.MULTILINE)
    
    daily_data = []
    
    # day_sections는 [헤더, day_num1, content1, day_num2, content2, ...] 형태
    for i in range(1, len(day_sections), 2):
        if i+1 < len(day_sections):
            day_num = day_sections[i]
            day_content = day_sections[i+1]
            
            # 날짜 추출 (여러 패턴 시도)
            date_patterns = [
                r'\*\*날짜:\*\*\s*(\d{4}-\d{2}-\d{2})',  # **날짜:** 2026-01-08
                r'날짜:\s*(\d{4}-\d{2}-\d{2})',           # 날짜: 2026-01-08
                r'(\d{4}-\d{2}-\d{2})',                   # 2026-01-08
            ]
            
            date = None
            for pattern in date_patterns:
                match = re.search(pattern, day_content)
                if match:
                    date = match.group(1)
                    break
            
            if not date:
                print(f"⚠️ Day {day_num}: 날짜를 찾을 수 없음")
                continue
            
            # AI 제안 수 추출 (다양한 형식 지원)
            ai_count = 0
            ai_patterns = [
                # 패턴 1: **AI 제안 수:** 5개 (콜론이 별표 안)
                r'\*\*AI\s*제안\s*수:\*\*\s*(\d+)개?',
                # 패턴 2: **AI 제안 수**: 5개 (콜론이 별표 밖)
                r'\*\*AI\s*제안\s*수\*\*:\s*(\d+)개?',
                # 패턴 3: AI 제안 수: 5개 (별표 없음)
                r'AI\s*제안\s*수:\s*(\d+)개?',
                # 패턴 4: **AI 제안 수:**\n-14개 (줄바꿈 + 하이픈)
                r'\*\*AI\s*제안\s*수:\*\*\s*\n\s*-?\s*(\d+)개?',
                # 패턴 5: AI 제안 수:\n-14개
                r'AI\s*제안\s*수:\s*\n\s*-?\s*(\d+)개?',
            ]
            
            for pattern in ai_patterns:
                match = re.search(pattern, day_content, re.MULTILINE)
                if match:
                    ai_count = int(match.group(1))
                    break
            
            # ===== "실행 여부" 또는 "실행" 섹션만 파싱 =====
            
            # 먼저 "**실행 여부:**" 섹션 확인 (Day 1-4, 6)
            execution_status = re.search(
                r'\*\*실행\s*여부:\*\*\s*\n?(.*?)(?:\n\*\*|\Z)',
                day_content,
                re.DOTALL | re.MULTILINE
            )
            
            # 별표 없는 "실행 여부:" 패턴도 확인 (Day 5)
            if not execution_status:
                execution_status = re.search(
                    r'실행\s*여부:\s*(.+?)(?:\n[^\n]*:|메모:|\Z)',
                    day_content,
                    re.DOTALL | re.MULTILINE
                )
            
            if execution_status:
                status_text = execution_status.group(1).strip()
                
                # Day 6 형식: 라인별 ✅ 체크
                completed_lines = [line for line in status_text.split('\n') if '✅' in line and line.strip().startswith('-')]
                
                if completed_lines:
                    # Day 6: 라인별 ✅ 개수
                    completed = len(completed_lines)
                    pending = 0
                else:
                    # Day 1-5: 텍스트에서 개수 추출
                    completed = 0
                    
                    if '완료' in status_text or '실행' in status_text:
                        # 전략 1: "N개" 패턴 먼저 찾기 (가장 확실)
                        num_match = re.search(r'(\d+)\s*개', status_text)
                        if num_match:
                            completed = int(num_match.group(1))
                        
                        # 전략 2: 제안 번호 카운트 (#1, #2, ...)
                        if completed == 0:
                            suggestion_nums = re.findall(r'#(\d+)', status_text)
                            if len(suggestion_nums) >= 2:  # 2개 이상만
                                completed = len(suggestion_nums)
                        
                        # 전략 3: ✅만 있으면 1개
                        if completed == 0 and '✅' in status_text:
                            completed = 1
                    
                    pending = 0
            
            else:
                # Day 7-10: "**실행:**" 섹션
                execution_section = re.search(
                    r'\*\*실행:\*\*\s*\n(.*?)(?:\n\*\*|\Z)',
                    day_content,
                    re.DOTALL | re.MULTILINE
                )
                
                if execution_section:
                    execution_text = execution_section.group(1)
                    completed_lines = [line for line in execution_text.split('\n') if '✅' in line and line.strip().startswith('-')]
                    pending_lines = [line for line in execution_text.split('\n') if '⏸️' in line and line.strip().startswith('-')]
                    
                    completed = len(completed_lines)
                    pending = len(pending_lines)
                else:
                    completed = 0
                    pending = 0
            
            # 실행 여부
            executed = completed > 0
            
            daily_data.append({
                'day': int(day_num),
                'date': date,
                'ai_suggestions': ai_count,
                'completed': completed,
                'pending': pending,
                'executed': executed,
                'content': day_content[:300]  # 처음 300자만 저장
            })
    
    return daily_data


def calculate_weekly_stats(daily_data):
    """
    주간 통계 계산
    """
    if not daily_data:
        return None
    
    total_days = len(daily_data)
    total_suggestions = sum(d['ai_suggestions'] for d in daily_data)
    total_completed = sum(d['completed'] for d in daily_data)
    
    # 개선 추세 (제안 수 감소 = 품질 향상)
    if total_days > 1:
        first_half = daily_data[:len(daily_data)//2]
        second_half = daily_data[len(daily_data)//2:]
        
        first_half_avg = sum(d['ai_suggestions'] for d in first_half) / max(len(first_half), 1)
        second_half_avg = sum(d['ai_suggestions'] for d in second_half) / max(len(second_half), 1)
        
        improvement_trend = first_half_avg - second_half_avg
    else:
        improvement_trend = 0
    
    return {
        'total_days': total_days,
        'date_range': f"{daily_data[0]['date']} ~ {daily_data[-1]['date']}",
        'total_suggestions': total_suggestions,
        'total_completed': total_completed,
        'avg_suggestions_per_day': total_suggestions / total_days if total_days > 0 else 0,
        'avg_completed_per_day': total_completed / total_days if total_days > 0 else 0,
        'improvement_trend': improvement_trend,
    }


def generate_weekly_summary(daily_data, stats, output_path):
    """
    주간 요약 보고서 생성
    """
    
    report = f"""# 📊 Weekly Summary - Auto RSI

**생성 일시:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}  
**기간:** {stats['date_range']}  
**테스트 일수:** {stats['total_days']}일  

---

## 📈 전체 통계

| 지표 | 값 |
|------|-----|
| 총 AI 제안 수 | {stats['total_suggestions']}개 |
| 총 완료 작업 | {stats['total_completed']}개 |
| 일평균 제안 | {stats['avg_suggestions_per_day']:.1f}개 |
| 일평균 완료 | {stats['avg_completed_per_day']:.1f}개 |

---

## 📊 개선 추세

**AI 제안 수 변화:**
```
전반부 평균: {stats['avg_suggestions_per_day'] + stats['improvement_trend']/2:.1f}개/일
후반부 평균: {stats['avg_suggestions_per_day'] - stats['improvement_trend']/2:.1f}개/일
변화: {stats['improvement_trend']:+.1f}개/일
```

**해석:**
"""
    
    if stats['improvement_trend'] > 0:
        report += f"✅ **긍정적 추세**: 제안 수가 {stats['improvement_trend']:.1f}개/일 감소했습니다.\n"
        report += "→ Vault 품질이 향상되고 있음을 의미합니다.\n"
    elif stats['improvement_trend'] < 0:
        report += f"⚠️ **주의**: 제안 수가 {abs(stats['improvement_trend']):.1f}개/일 증가했습니다.\n"
        report += "→ 새로운 문제가 발견되었거나 품질 기준이 강화되었을 수 있습니다.\n"
    else:
        report += "➡️ **안정적**: 제안 수가 일정하게 유지되고 있습니다.\n"
    
    report += "\n---\n\n## 📅 일별 상세 내역\n\n"
    
    for day_data in daily_data:
        report += f"### Day {day_data['day']} ({day_data['date']})\n\n"
        report += f"- AI 제안: {day_data['ai_suggestions']}개\n"
        report += f"- 완료: {day_data['completed']}개\n"
        report += "\n"
    
    report += """---

## 💡 인사이트 및 권장사항

### 성과
"""
    
    if stats['total_completed'] > 0:
        report += f"- {stats['total_days']}일간 {stats['total_completed']}개 항목 완료\n"
        report += f"- 평균 {stats['avg_completed_per_day']:.1f}개/일의 안정적인 개선 속도\n"
    
    if stats['improvement_trend'] > 0:
        report += f"- AI 제안 감소 추세 ({stats['improvement_trend']:.1f}개/일) → 품질 향상 확인\n"
    
    report += "\n### 다음 주 목표\n\n"
    report += "- [ ] P1 항목 우선 처리\n"
    report += "- [ ] 반복적으로 나타나는 패턴 근본 해결\n"
    report += "- [ ] 품질 검증 기준 확대 검토\n"
    
    report += "\n---\n\n*Generated by Auto RSI Weekly Summary Generator*\n"
    
    # 파일 저장 (인코딩 명시)
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(report)
    
    return output_path


def main():
    """
    메인 실행 함수
    """
    print("="*60)
    print("Weekly Summary Generator for Auto RSI")
    print("="*60)
    
    # Vault 경로 설정
    vault_path = Path(r"C:\Users\win10_original\claude-vault")
    log_file = vault_path / "0_Long_Term_RSI_Log.md"
    
    if not log_file.exists():
        print(f"❌ Error: Log file not found at {log_file}")
        return
    
    print(f"\n📂 Vault: {vault_path}")
    print(f"📄 Log file: {log_file.name}")
    
    # 지난 주 계산 (월~일)
    today = datetime.now()
    days_since_monday = today.weekday()  # 0=월요일
    this_monday = today - timedelta(days=days_since_monday)
    last_monday = this_monday - timedelta(days=7)
    last_sunday = last_monday + timedelta(days=6)
    
    print(f"\n📅 지난 주 범위: {last_monday.strftime('%Y-%m-%d')} ~ {last_sunday.strftime('%Y-%m-%d')}")
    
    # 로그 파싱
    print("\n📊 Parsing RSI log...")
    all_daily_data = parse_rsi_log(log_file)
    
    if not all_daily_data:
        print("❌ No data found in log file.")
        return
    
    # 지난 주 데이터만 필터링
    daily_data = []
    for day in all_daily_data:
        day_date = datetime.strptime(day['date'], '%Y-%m-%d')
        if last_monday <= day_date <= last_sunday:
            daily_data.append(day)
    
    if not daily_data:
        print(f"❌ 지난 주 ({last_monday.strftime('%Y-%m-%d')} ~ {last_sunday.strftime('%Y-%m-%d')}) 데이터가 없습니다.")
        print(f"\n전체 데이터: {len(all_daily_data)}일")
        if all_daily_data:
            print(f"범위: {all_daily_data[0]['date']} ~ {all_daily_data[-1]['date']}")
        return
    
    print(f"✓ Found {len(daily_data)} days of data (지난 주)")
    for day in daily_data[:5]:
        print(f"  - Day {day['day']}: {day['date']}, 제안 {day['ai_suggestions']}개, 완료 {day['completed']}개")
    
    # 통계 계산
    print("\n📈 Calculating statistics...")
    stats = calculate_weekly_stats(daily_data)
    
    print(f"✓ Total suggestions: {stats['total_suggestions']}")
    print(f"✓ Total completed: {stats['total_completed']}")
    print(f"✓ Improvement trend: {stats['improvement_trend']:.1f} suggestions/day")
    
    # 보고서 생성
    print("\n📝 Generating weekly summary...")
    
    # 파일명: Weekly_Summary_YYYY-WW.md (주차 번호 포함)
    week_num = last_monday.isocalendar()[1]
    output_file = vault_path / f"Weekly_Summary_{last_monday.year}-W{week_num:02d}.md"
    
    generate_weekly_summary(daily_data, stats, output_file)
    
    print(f"✅ Summary generated: {output_file.name}")
    print("\n" + "="*60)
    print("✨ Weekly Summary completed!")
    print("="*60)


if __name__ == "__main__":
    main()
