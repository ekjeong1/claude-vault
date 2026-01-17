#!/usr/bin/env python3
"""
Day 5 디버그 스크립트
"""

import re
from pathlib import Path

vault_path = Path(r"C:\Users\win10_original\claude-vault")
log_file = vault_path / "0_Long_Term_RSI_Log.md"

print("="*60)
print("Day 5 Debug")
print("="*60)

# 파일 읽기
encodings = ['utf-8', 'cp949', 'euc-kr']
for encoding in encodings:
    try:
        with open(log_file, 'r', encoding=encoding) as f:
            content = f.read()
            print(f"✓ 파일 인코딩: {encoding}")
            break
    except:
        continue

# Day 5 섹션만 추출
day5_match = re.search(r'## Day 5\s*\n(.*?)(?=## Day 6|\Z)', content, re.DOTALL)

if not day5_match:
    print("❌ Day 5 섹션을 찾을 수 없습니다")
    exit(1)

day5_content = day5_match.group(1)

print("\n" + "="*60)
print("Day 5 전체 내용 (처음 1000자):")
print("="*60)
print(day5_content[:1000])
print("="*60)

# 실행 여부 섹션 추출 시도
patterns = [
    (r'\*\*실행\s*여부:\*\*\s*(.+?)(?:\n\*\*|\Z)', "패턴 1: **실행 여부:**"),
    (r'\*\*실행\s*여부:\*\*\s*\n?(.*?)(?:\n\*\*|\Z)', "패턴 2: **실행 여부:** (줄바꿈 허용)"),
    (r'실행\s*여부:\s*(.+?)(?:\n\*\*|\Z)', "패턴 3: 실행 여부: (별표 없음)"),
]

print("\n실행 여부 섹션 추출 시도:")
print("="*60)

for pattern, description in patterns:
    match = re.search(pattern, day5_content, re.DOTALL | re.MULTILINE)
    if match:
        extracted = match.group(1).strip()
        print(f"\n{description}")
        print(f"추출 성공!")
        print(f"길이: {len(extracted)}자")
        print(f"내용: {extracted[:200]}")
        print(f"'완료' in text: {'완료' in extracted}")
        print(f"'실행' in text: {'실행' in extracted}")
        
        # 숫자 추출 시도
        num_patterns = [
            (r'(\d+)\s*개', "패턴: N개"),
            (r'(\d+)개', "패턴: N개 (공백 없음)"),
        ]
        
        print(f"\n숫자 추출 시도:")
        for num_pattern, num_desc in num_patterns:
            num_match = re.search(num_pattern, extracted)
            if num_match:
                print(f"  {num_desc}: {num_match.group(1)}")
        
        # 제안 번호 추출
        suggestions = re.findall(r'#(\d+)', extracted)
        if suggestions:
            print(f"\n제안 번호: {suggestions} (개수: {len(suggestions)})")
        
        break
    else:
        print(f"{description}: 실패")

print("\n" + "="*60)
