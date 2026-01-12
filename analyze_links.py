import re
import os
from pathlib import Path
from collections import defaultdict

# Get all markdown files in 3-Resources
resources_path = Path('3-Resources')
md_files = list(resources_path.rglob('*.md'))

# Get all existing files in the vault (for reference checking)
vault_root = Path('.')
all_vault_files = set()
for md in vault_root.rglob('*.md'):
    all_vault_files.add(md.stem)  # Just the filename without extension

# Check Archive folder
archive_files = set()
archive_path = vault_root / '4-Archive'
if archive_path.exists():
    for md in archive_path.rglob('*.md'):
        archive_files.add(md.stem)

# Consolidated meta docs (now merged into other files)
merged_meta_docs = {
    '0_Quick_Reference': '0_Reference',
    '0_FAQ': '0_Getting_Started',
    '0_Glossary': '0_Reference',
    '0_Concept_Map': 'Archived (merged into concepts)',
    '0_Learning_Path': '0_Getting_Started',
    '0_Maintenance_Guide': '0_Maintenance',
    '0_Quick_Start_Guide': '0_Getting_Started',
    '0_Problem_Diagnosis_Flowchart': '0_Workflows',
    '0_Toolkit_Integration': '0_Workflows',
    '0_Cross_Part_Workflows': '0_Workflows',
    '0_Real_World_Scenarios': '케이스 스터디에 통합됨',
    '0_Concept_Validation': '0_Invariants_Guide',
    '0_Concept_Dependency_Graph': '0_Reference',
    '0_Feedback_Log': '0_Maintenance',
    '0_Usage_Analytics': '0_Maintenance',
    '0_Invariant_Checklist_Template': '0_Invariants_Guide',
    '0_Invariant_Violations_Examples': '0_Invariants_Guide',
    '0_Future_Expansion_Roadmap': '0_Changelog',
    '0_Organizational_Math_Index': '0_Part1_Organization_Index'
}

# Pattern to extract wiki links
wiki_pattern = re.compile(r'\[\[([^\]|]+)(?:\|[^\]]+)?\]\]')

broken_links = defaultdict(list)

for md_file in md_files:
    try:
        with open(md_file, 'r', encoding='utf-8') as f:
            content = f.read()
            lines = content.split('\n')
    except Exception as e:
        print(f"Error reading {md_file}: {e}")
        continue

    for line_num, line in enumerate(lines, 1):
        matches = wiki_pattern.finditer(line)
        for match in matches:
            link = match.group(1)
            # Remove any heading anchors
            link_base = link.split('#')[0].strip()

            if not link_base:
                continue

            # Check if file exists
            link_stem = Path(link_base).stem

            # Determine category
            category = None
            recommendation = None

            # Check if it's in Archive
            if link_stem in archive_files:
                category = 'Archive'
                recommendation = f'문서가 4-Archive로 이동됨. 필요시 복원하거나 링크 제거'
            # Check if it's a merged meta doc
            elif link_stem in merged_meta_docs:
                category = '통합됨'
                recommendation = f'→ [[{merged_meta_docs[link_stem]}]]로 변경'
            # Check if it exists in vault
            elif link_stem not in all_vault_files:
                category = '존재하지않음'
                recommendation = f'파일이 존재하지 않음. 생성 또는 링크 제거 필요'

            if category:
                broken_links[str(md_file.relative_to(vault_root))].append({
                    'line': line_num,
                    'link': link_base,
                    'category': category,
                    'recommendation': recommendation
                })

# Print results
if broken_links:
    print('# 깨진 위키링크 분석 결과\n')

    # Count by category
    categories = defaultdict(int)
    for file_links in broken_links.values():
        for link_info in file_links:
            categories[link_info['category']] += 1

    print('## 요약')
    print(f'- 총 파일 수: {len(broken_links)}')
    print(f'- 총 깨진 링크 수: {sum(len(v) for v in broken_links.values())}')
    print(f'  - Archive 참조: {categories["Archive"]}')
    print(f'  - 통합된 메타 문서: {categories["통합됨"]}')
    print(f'  - 존재하지 않음: {categories["존재하지않음"]}')
    print()

    # Detailed results grouped by category
    print('## 카테고리별 상세 목록\n')

    for cat in ['통합됨', 'Archive', '존재하지않음']:
        cat_links = []
        for file_path, links in broken_links.items():
            for link_info in links:
                if link_info['category'] == cat:
                    cat_links.append((file_path, link_info))

        if cat_links:
            print(f'### {cat} ({len(cat_links)}개)\n')
            current_file = None
            for file_path, link_info in sorted(cat_links):
                if file_path != current_file:
                    if current_file is not None:
                        print()
                    print(f'**{file_path}**')
                    current_file = file_path
                print(f'  - 라인 {link_info["line"]}: `[[{link_info["link"]}]]` → {link_info["recommendation"]}')
            print()
else:
    print('깨진 링크가 발견되지 않았습니다.')
