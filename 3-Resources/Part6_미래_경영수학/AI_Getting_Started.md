# AI 시작 가이드 (AI Getting Started)

**↑ [[0_Part6_Future_Index|Part 6 인덱스로 돌아가기]]**

---

## 개요

AI와 Cognitive Twin 개념을 **오늘 당장** 시작할 수 있는 실전 가이드. "미래 기술"이 아닌 "현재 사용 가능한 도구"로 접근한다.

**핵심 메시지**: AI는 연구소의 기술이 아니다. 무료 도구와 간단한 Python으로 지금 시작할 수 있다.

**불변량 준수**:
- ✅ **복잡성 단순화**: 복잡한 AI 이론 대신 실용적 도구
- ✅ **점진적 개선**: Level 1부터 시작, 단계별 발전
- ✅ **실용주의**: 오늘 시작 가능한 도구와 방법
- ✅ **데이터 기반**: 작은 데이터로 시작, 점진적 확장

---

## AI와 Cognitive Twin이란?

### Cognitive Twin (인지적 디지털 트윈)

**Digital Twin**: 물리적 시스템의 디지털 복제
- 예: 공장 설비의 3D 모델, 실시간 센서 데이터 동기화

**Cognitive Twin**: 인지/의사결정 시스템의 디지털 복제
- 예: 조직 행동 모델, 시장 반응 시뮬레이터, 전략 의사결정 엔진

**차이점**:
| Digital Twin | Cognitive Twin |
|--------------|----------------|
| 물리적 상태 복제 | 인지 프로세스 복제 |
| 센서 데이터 | 행동 데이터, 의사결정 이력 |
| What-If 시뮬레이션 | Why, How 추론 |

### AI의 역할

**자동 패턴 인식**: 데이터에서 숨겨진 패턴 발견
**자동 모델 생성**: 현실을 수학적 모델로 변환
**실시간 학습**: 새 데이터로 모델 업데이트
**시나리오 시뮬레이션**: 전략의 결과 예측

---

## 4단계 AI 적용 로드맵

### Level 1: 데이터 수집 및 시각화 (오늘 시작)

**목표**: AI 이전에 데이터를 이해하라

**도구**: 무료, 설치 불필요
- Google Sheets / Excel
- Google Colab (무료 Python)
- Pandas (데이터 처리)
- Matplotlib/Seaborn (시각화)

**Step 1: 데이터 수집**
```markdown
수집할 데이터:
- 조직: 프로젝트 완료 시간, 회의 시간, 의사결정 지연
- 프로세스: 처리 시간, 에러율, 재작업률
- 고객: 전환율, 이탈률, NPS
- 재무: 매출, 비용, 현금 흐름

시작: 가장 문제되는 영역 1개 선택, 최근 3개월 데이터
```

**Step 2: 간단한 시각화**

Python 예시 (Google Colab에서 실행):
```python
import pandas as pd
import matplotlib.pyplot as plt

# 데이터 로드 (CSV 파일)
df = pd.read_csv('project_data.csv')

# 기본 통계
print(df.describe())

# 시각화
df['completion_time'].plot(kind='hist', bins=20)
plt.title('프로젝트 완료 시간 분포')
plt.xlabel('일수')
plt.show()

# 시간에 따른 트렌드
df.plot(x='date', y='completion_time', kind='line')
plt.title('프로젝트 완료 시간 추이')
plt.show()
```

**결과**: 데이터 패턴 발견
- 프로젝트 완료 시간이 매달 증가하는가?
- 특정 요일/월에 문제가 집중되는가?
- 이상치(Outlier)가 있는가?

**시간 투자**: 1-2일
**비용**: $0

---

### Level 2: 간단한 예측 모델 (1주 후)

**목표**: 과거 데이터로 미래 예측

**도구**: Python + scikit-learn (무료)

**Step 1: 선형 회귀 (가장 간단한 AI)**

```python
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
import numpy as np

# 데이터 준비
X = df[['team_size', 'complexity']]  # 입력: 팀 크기, 복잡도
y = df['completion_time']             # 출력: 완료 시간

# 학습/테스트 분리
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

# 모델 학습
model = LinearRegression()
model.fit(X_train, y_train)

# 예측
predictions = model.predict(X_test)

# 정확도
from sklearn.metrics import r2_score
print(f"R² Score: {r2_score(y_test, predictions):.2f}")

# 새 프로젝트 예측
new_project = [[5, 7]]  # 팀 5명, 복잡도 7
predicted_time = model.predict(new_project)
print(f"예상 완료 시간: {predicted_time[0]:.1f}일")
```

**비즈니스 적용**:
```markdown
질문: "팀 크기 8명, 복잡도 9인 프로젝트는 얼마나 걸릴까?"
AI 예측: "23.5일 (±3일)"

→ 데이터 기반 일정 수립
→ 리스크 사전 식별
```

**Step 2: 분류 모델 (성공/실패 예측)**

```python
from sklearn.ensemble import RandomForestClassifier

# 데이터 준비
X = df[['budget', 'team_experience', 'stakeholders']]
y = df['success']  # 1 = 성공, 0 = 실패

# 모델 학습
clf = RandomForestClassifier(n_estimators=100)
clf.fit(X_train, y_train)

# 중요도
importances = clf.feature_importances_
features = ['budget', 'team_experience', 'stakeholders']
for f, i in zip(features, importances):
    print(f"{f}: {i:.2%}")

# 새 프로젝트 예측
new_project = [[100000, 3, 5]]  # 예산, 경험, 이해관계자
prob = clf.predict_proba(new_project)[0]
print(f"성공 확률: {prob[1]:.1%}")
```

**결과**: 프로젝트 승인 전 리스크 평가
- "이 프로젝트 성공 확률 65% → 팀 경험 보강 필요"

**시간 투자**: 3-5일 (학습 포함)
**비용**: $0

---

### Level 3: 시나리오 시뮬레이션 (1개월 후)

**목표**: "만약 ~라면?" 질문에 답하기

**도구**: Python + 시뮬레이션

**Step 1: Monte Carlo 시뮬레이션**

```python
import numpy as np

# 파라미터 (과거 데이터에서 추정)
avg_completion = 20  # 평균 완료 시간
std_completion = 5   # 표준편차

# 시뮬레이션 (1000번 반복)
n_simulations = 1000
results = np.random.normal(avg_completion, std_completion, n_simulations)

# 확률 계산
prob_under_25 = (results < 25).sum() / n_simulations
prob_over_30 = (results > 30).sum() / n_simulations

print(f"25일 내 완료 확률: {prob_under_25:.1%}")
print(f"30일 초과 확률: {prob_over_30:.1%}")

# 시각화
plt.hist(results, bins=50)
plt.axvline(25, color='green', label='목표')
plt.axvline(30, color='red', label='한계')
plt.legend()
plt.show()
```

**Step 2: 전략 시나리오 비교**

```python
# 시나리오 1: 팀 유지 (현재)
scenario_1 = simulate_project(team_size=5, experience=3)

# 시나리오 2: 팀 증원
scenario_2 = simulate_project(team_size=7, experience=3)

# 시나리오 3: 시니어 투입
scenario_3 = simulate_project(team_size=5, experience=5)

# 비교
print("평균 완료 시간:")
print(f"  시나리오 1 (현재): {scenario_1.mean():.1f}일")
print(f"  시나리오 2 (증원): {scenario_2.mean():.1f}일")
print(f"  시나리오 3 (시니어): {scenario_3.mean():.1f}일")

print("\n비용 대비 효과:")
print(f"  시나리오 2: {calculate_roi(scenario_2):.1f}%")
print(f"  시나리오 3: {calculate_roi(scenario_3):.1f}%")
```

**비즈니스 적용**:
- 전략 A vs B vs C 정량적 비교
- 리스크와 수익 시뮬레이션
- 최악의 경우(Worst Case) 대비

**시간 투자**: 1-2주
**비용**: $0

---

### Level 4: 실시간 학습 시스템 (3개월 후)

**목표**: 자동으로 학습하고 개선하는 시스템

**개념**: Cognitive Twin의 핵심
- 새 데이터 → 모델 업데이트 → 예측 개선

**Step 1: Online Learning**

```python
from river import linear_model, metrics

# Online Linear Regression (실시간 학습)
model = linear_model.LinearRegression()
metric = metrics.MAE()

# 데이터가 들어올 때마다 학습
for x, y in stream_data():
    # 예측
    y_pred = model.predict_one(x)

    # 실제 값으로 학습
    model.learn_one(x, y)

    # 성능 추적
    metric.update(y, y_pred)

print(f"평균 오차: {metric.get():.2f}")
```

**Step 2: A/B 테스트 자동화**

```python
# Multi-Armed Bandit (자동 최적화)
from river import proba

# 3개 전략 테스트
strategies = ['A', 'B', 'C']
bandit = proba.EpsilonGreedy(epsilon=0.1, seed=42)

for i in range(1000):
    # 전략 선택
    strategy = bandit.pull(strategies)

    # 실행 및 결과 측정
    reward = execute_strategy(strategy)

    # 학습
    bandit.update(strategy, reward)

# 최적 전략
print(f"최적 전략: {bandit.ranking}")
```

**비즈니스 적용**:
```markdown
상황: 마케팅 캠페인 3개 중 선택
전통 A/B: 50/50 분할, 2주 대기
Cognitive Twin:
  - 처음: 균등 분배
  - 1일차: 전략 A 성과 좋음 → 60% 할당
  - 3일차: 전략 C 급부상 → A 40%, C 50%
  - 1주차: C가 최적 → C 80% 집중

결과: 기회비용 최소화, 실시간 최적화
```

**시간 투자**: 1-2개월 (구축 및 테스트)
**비용**: $0 (오픈소스) ~ $100/월 (클라우드)

---

## 현재 사용 가능한 AI 도구

### 1. ChatGPT / Claude (대화형 AI)

**용도**: 패턴 분석, 아이디어 생성, 코드 작성 지원

**실전 활용**:
```markdown
프롬프트: "다음은 우리 팀의 지난 6개월 프로젝트 데이터야:
[데이터 붙여넣기]

패턴을 분석하고 다음 질문에 답해줘:
1. 프로젝트 지연의 주요 원인 3가지
2. 성공한 프로젝트의 공통점
3. 다음 프로젝트를 위한 권장사항"

→ 즉시 인사이트 획득
```

**비용**: $20/월 (Pro 버전)

---

### 2. Google Colab (무료 Python 환경)

**장점**:
- 설치 불필요, 웹 브라우저만
- 무료 GPU 제공
- 라이브러리 사전 설치

**사용법**:
1. colab.research.google.com 접속
2. 새 노트북 생성
3. 코드 작성 및 실행

---

### 3. Kaggle (무료 데이터셋 + 튜토리얼)

**장점**:
- 수천 개 실제 데이터셋
- 코드 예시 풍부
- 커뮤니티 학습

**추천 시작점**:
- Titanic 데이터셋 (분류 학습)
- House Prices (회귀 학습)
- 업종별 실제 데이터

---

### 4. Streamlit (대시보드 제작)

**용도**: AI 모델을 웹 앱으로 변환

```python
import streamlit as st
import pandas as pd

st.title("프로젝트 완료 시간 예측기")

# 입력
team_size = st.slider("팀 크기", 3, 10)
complexity = st.slider("복잡도", 1, 10)

# 예측
prediction = model.predict([[team_size, complexity]])

# 결과
st.write(f"예상 완료 시간: {prediction[0]:.1f}일")
```

**배포**: streamlit.io (무료 호스팅)

---

## Part 간 연결 및 통합

### Part 1 (조직·인력) + AI

**[[Part1_조직_인력/그래프 이론과 중심성|그래프 이론]]** → AI 자동 병목 탐지

```python
import networkx as nx

# 조직 네트워크
G = nx.DiGraph()
G.add_edges_from([('A','B'), ('A','C'), ('B','D'), ...])

# AI가 자동으로 중심성 계산
centrality = nx.betweenness_centrality(G)

# 병목 자동 식별
bottleneck = max(centrality, key=centrality.get)
print(f"병목: {bottleneck} (중심성: {centrality[bottleneck]:.2f})")
```

---

### Part 2 (프로세스·운영) + AI

**[[Part2_프로세스_운영/베이즈 정리|베이즈 정리]]** → AI 자동 업데이트

```python
# 사전 확률 (초기 믿음)
prior_success_rate = 0.5

# 새 데이터 수집
for trial in new_trials:
    # 베이즈 업데이트 (자동)
    posterior = bayesian_update(prior_success_rate, trial.result)
    prior_success_rate = posterior

print(f"업데이트된 성공률: {posterior:.1%}")
```

---

### Part 3 (전략·경쟁) + AI

**[[Part3_전략_경쟁/내쉬 균형|내쉬 균형]]** → AI 시뮬레이션

```python
# 경쟁자 전략 시뮬레이션
for _ in range(1000):
    our_strategy = choose_strategy()
    competitor_strategy = ai_predict_competitor()

    payoff = calculate_payoff(our_strategy, competitor_strategy)

    # 학습
    update_model(our_strategy, competitor_strategy, payoff)

# 최적 전략 도출
optimal = find_nash_equilibrium()
```

---

### Part 4 (의사결정·데이터) + AI

**[[Part4_의사결정_데이터/실험과 학습|실험과 학습]]** → AI 자동 실험

```python
# Multi-Armed Bandit (자동 A/B 테스트)
bandit = EpsilonGreedy()

for customer in stream:
    variant = bandit.pull(['A', 'B', 'C'])
    conversion = show_variant(customer, variant)
    bandit.update(variant, conversion)

# 실시간으로 최적 variant 찾기
```

---

## 케이스 스터디: 프로젝트 예측 시스템

### 상황

**회사**: 소프트웨어 개발사 (팀 30명)
**문제**: 프로젝트 일정이 항상 지연, 예측 불가능
**데이터**: 과거 50개 프로젝트 (팀 크기, 복잡도, 실제 완료 시간)

### Level 1: 데이터 시각화 (Day 1)

```python
# 데이터 로드
df = pd.read_csv('past_projects.csv')

# 발견
plt.scatter(df['estimated_days'], df['actual_days'])
plt.plot([0, 60], [0, 60], 'r--')  # 이상적 선
plt.xlabel('예측 (일)')
plt.ylabel('실제 (일)')
plt.title('예측 vs 실제')
plt.show()
```

**인사이트**: 예측이 평균 40% 낙관적

---

### Level 2: 예측 모델 (Week 1)

```python
from sklearn.ensemble import RandomForestRegressor

# 특징: 팀 크기, 복잡도, 유사 프로젝트 경험
X = df[['team_size', 'complexity', 'similar_experience']]
y = df['actual_days']

# 모델 학습
model = RandomForestRegressor(n_estimators=100)
model.fit(X, y)

# 새 프로젝트
new = pd.DataFrame([[6, 8, 2]],
                   columns=['team_size', 'complexity', 'similar_experience'])
prediction = model.predict(new)
print(f"예상: {prediction[0]:.1f}일")
```

**결과**: 예측 정확도 60% → 85%

---

### Level 3: 시나리오 시뮬레이션 (Month 1)

```python
# 시나리오 비교
scenarios = {
    '현재 팀': {'team_size': 6, 'complexity': 8, 'experience': 2},
    '시니어 추가': {'team_size': 6, 'complexity': 8, 'experience': 4},
    '팀 증원': {'team_size': 8, 'complexity': 8, 'experience': 2}
}

for name, params in scenarios.items():
    result = monte_carlo_simulation(model, params, n_sim=1000)
    print(f"{name}:")
    print(f"  평균: {result.mean():.1f}일")
    print(f"  90% 확률로: {result.quantile(0.9):.1f}일 이내")
```

**의사결정**: 시니어 추가가 ROI 최고

---

### Level 4: 실시간 시스템 (Month 3)

```python
# 프로젝트 진행 중 실시간 업데이트
for week in range(1, project_duration+1):
    current_progress = get_progress(week)

    # 완료 시간 재예측
    new_prediction = model.predict_with_progress(current_progress)

    # 경고
    if new_prediction > deadline:
        alert(f"지연 예상: {new_prediction - deadline}일")
        suggest_actions()
```

**결과**:
- 프로젝트 지연: 60% → 15%
- 고객 만족도: 3.2/5 → 4.5/5
- 예측 정확도: 85% → 92%

---

## 시작 체크리스트

### 즉시 (오늘)

- [ ] Google Colab 계정 생성
- [ ] ChatGPT/Claude 계정 생성
- [ ] 데이터 수집 시작 (1개 영역)
- [ ] 기본 시각화 실습

### 1주일 내

- [ ] Python 기초 학습 (3시간 튜토리얼)
- [ ] Pandas 데이터 처리 실습
- [ ] 첫 번째 예측 모델 실행

### 1개월 내

- [ ] 실제 비즈니스 데이터로 모델 구축
- [ ] 시나리오 시뮬레이션 실행
- [ ] 의사결정에 적용 (작은 규모)

### 3개월 내

- [ ] 실시간 학습 시스템 구축
- [ ] 대시보드 제작 (Streamlit)
- [ ] 팀 전체에 확산

---

## 학습 리소스

### 무료 강의 (한국어)

**Python 기초**:
- 유튜브 "파이썬 코딩 도장"
- 프로그래머스 Python 입문

**머신러닝**:
- Coursera "Machine Learning" (Andrew Ng)
- 유튜브 "머신러닝 야학"

**실전 프로젝트**:
- Kaggle Learn (무료 코스)
- Fast.ai (실용적 접근)

### 추천 도서

**입문**:
- "파이썬 라이브러리를 활용한 데이터 분석" (웨스 맥키니)

**실전**:
- "핸즈온 머신러닝" (오렐리앙 제롱)

**비즈니스**:
- "AI for Business" (Doug Rose)

---

## 다음 단계

1. **오늘**: Google Colab 튜토리얼 완료 (1시간)
2. **이번 주**: 데이터 수집 및 시각화 (3시간)
3. **다음 주**: 첫 예측 모델 실행 (5시간)
4. **1개월**: 실제 문제에 적용 (10시간)
5. **3개월**: 자동화 시스템 구축 (20시간)

**총 투자**: 40시간 (월 10시간 × 4개월)
**총 비용**: $0 ~ $100

---

## 관련 문서

- [[AI와_Cognitive_Twin|AI와 Cognitive Twin 이론]]
- [[Part4_의사결정_데이터/실험과 학습|실험과 학습]]
- [[Part2_프로세스_운영/베이즈 정리|베이즈 정리]]
- [[0_Part6_Future_Index|Part 6 인덱스]]

---

## 불변량 최종 검증

| 불변량 | 준수 여부 | 증거 |
|--------|----------|------|
| **복잡성 단순화** | ✅ | 복잡한 AI를 4단계로 단순화 |
| **점진적 개선** | ✅ | Level 1→2→3→4 단계적 발전 |
| **실용주의** | ✅ | 오늘 시작 가능, 무료 도구 |
| **데이터 기반** | ✅ | 모든 단계에서 측정 및 검증 |
| **구조적 사고** | ✅ | 패턴 인식 및 자동화 |

---

#resource #braintwin #part6 #ai #cognitive-twin #machine-learning #practical-guide #getting-started
