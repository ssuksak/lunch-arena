# 오늘급식 / Lunch Arena 서비스 인수인계 문서

- 작성일: 2026-06-23 14:03 UTC
- 대상 repo: `/home/ubuntu/projects/lunch-arena`
- GitHub remote: `https://github.com/ssuksak/lunch-arena.git`
- 현재 브랜치: `master`
- 서비스명: **오늘급식** / 내부 컨셉명 **Lunch Arena, 급식아레나**
- 한줄 설명: 전국 학교 급식을 검색·조회·평가하고, 내 학교와 근처 학교 급식을 배틀시키는 모바일 웹/토스 미니앱

---

## 1. 현재 진행상황 요약

현재 서비스는 **정적 HTML 단일 페이지 앱 + Supabase 백엔드 + Apps in Toss 설정** 구조다.  
기획서상 Phase 1은 대체로 완료되어 있고, 실제 코드 기준으로는 Phase 2~3 기능 일부까지 들어가 있다.

### 완료된 것

- Supabase 기반 급식 조회/캐싱 연동
- 학교 검색
- 내 학교 설정
- 토스 미니앱 익명 키 기반 사용자 식별
- 일반 브라우저용 localStorage 기반 익명 client id
- 내 학교 급식 카드 표시
- 급식 자동 점수/랭크 표시
- 급식 별점/한줄평/사진 리뷰 UI 및 저장 로직
- 랭킹 탭
- 배틀 탭
- 근처 학교 기반 배틀 상대 자동 매칭 RPC
- 배틀 투표
- 배틀 상대 수동 변경
- 학교 변경 횟수 제한: 30일 롤링 3회
- XSS 방어용 `escapeHtml()` 일부 적용
- Kakao Map SDK 로드 및 지도 탭 기본 구조
- Apps in Toss 설정 파일 `granite.config.ts`
- 개인정보처리방침 `privacy.html`
- 앱 아이콘/썸네일 에셋

### 아직 미완/주의할 것

- `index.html`, `privacy.html`에 **미커밋 변경사항**이 있다.
  - 기존 canvas/screen fingerprint 방식 → random client id 방식으로 변경한 상태
  - privacy 문구도 이에 맞춰 수정됨
- `PROJECT_STATUS.md`는 이 인수인계 문서로 새로 작성한 파일이다. 필요하면 커밋해야 한다.
- Supabase anon key가 `index.html`에 직접 들어가 있는 구조다. 원래 anon key는 공개 가능하긴 하나 RLS/정책 설계가 매우 중요하다.
- Kakao JavaScript app key도 클라이언트에 노출되어 있다. 도메인 제한 확인 필요.
- 사진 업로드는 `reviews` Storage bucket이 public으로 생성되어 있어야 정상 동작한다.
- Supabase Edge Functions 소스는 현재 repo 안에 없다. 클라이언트는 `sync-schools`, `sync-meals`를 호출하지만 함수 구현 코드는 별도 위치/콘솔에 있는 것으로 보인다.
- `PLAN.md`에는 미로드 지역 학교 데이터 추가가 TODO로 남아 있다.
- 배틀 관련 테이블 기본 생성 SQL은 현재 migrations 폴더에 보이지 않는다. 기존 DB에는 이미 있을 수 있으나, repo만 보고 새 환경을 복원하려면 `battles`, `battle_votes`, `school_stats`, 기존 `schools/meals/ratings/daily_rankings` 스키마가 추가로 필요하다.

---

## 2. 파일/디렉터리 구조

```text
/home/ubuntu/projects/lunch-arena
├── PLAN.md
├── PROJECT_STATUS.md               # 이 문서
├── index.html                      # 핵심 앱. HTML/CSS/JS가 한 파일에 들어간 SPA
├── privacy.html                    # 개인정보처리방침
├── package.json                    # AIT + http-server 스크립트
├── package-lock.json
├── granite.config.ts               # Apps in Toss WebView 미니앱 설정
├── oneulgeupshik.ait               # AIT 산출/설정 파일로 보임
├── icon.svg
├── icon.png
├── icon_600.png
├── icon_600_rounded_backup.png
├── thumbnail_1932x828.png
└── migrations
    ├── 20260421_create_user_schools.sql
    ├── 20260422_battle_find_opponent.sql
    ├── 20260422_school_change_limit.sql
    └── 20260422_security_hardening.sql
```

### 코드 규모

- `index.html`: 1,661 lines
- `privacy.html`: 76 lines
- SQL migrations: 267 lines total
- `granite.config.ts`: 43 lines
- `package.json`: 17 lines
- 전체 주요 텍스트 코드: 약 2,064 lines
- repo 크기: 약 5.0MB, 단 `.git`, `node_modules`, `dist` 제외 기준

---

## 3. 실행/빌드/배포

### package.json

```json
{
  "name": "oneulgeupshik",
  "version": "1.0.0",
  "description": "오늘급식 - 우리 학교 급식 점수는?",
  "private": true,
  "scripts": {
    "dev": "ait dev",
    "build": "ait build",
    "start": "npx http-server -p 5173 -c-1"
  },
  "dependencies": {
    "@apps-in-toss/web-framework": "^2.4.5"
  },
  "devDependencies": {
    "http-server": "^14.1.1"
  }
}
```

### 로컬 실행

```bash
cd /home/ubuntu/projects/lunch-arena
npm install
npm run start
```

- 단순 정적 서버 실행: `npx http-server -p 5173 -c-1`
- AIT 개발 모드: `npm run dev` → 내부적으로 `ait dev`

### 빌드

```bash
npm run build
```

`granite.config.ts` 기준 build command:

```bash
npm run build:static
```

`package.json`의 `build:static`:

```bash
mkdir -p dist && cp index.html privacy.html icon_600.png icon.png icon.svg thumbnail_1932x828.png dist/ && cp -r migrations dist/migrations
```

주의:

- 정적 사이트라 번들링은 거의 없다.
- AIT build가 outdir를 정리할 수 있어서 `outdir: 'dist'`로 분리되어 있다.
- GitHub Pages 배포 목적이면 `dist` 또는 root 정적 파일 배포 전략 확인 필요.

---

## 4. 서비스 컨셉/제품 스펙

### 핵심 컨셉

전국 학교 급식을 지도/검색으로 탐색하고, 급식 점수를 보고, 리뷰를 남기고, 내 학교와 근처 학교를 급식 배틀시키는 게이미피케이션 웹앱.

### 톤앤매너

- 토스식 클린 UI + 아케이드 게임 감성
- 밝은 색상, 둥근 카드, 이모지 중심
- 학생이 친구 단톡방에 공유하고 싶게 만드는 UX
- 키워드: `우리 학교 급식`, `점수`, `랭크`, `배틀`, `공유`

### 타겟

- 1차: 중고등학생
- 2차: 학부모
- 3차: 일반 사용자/재미 탐색층

---

## 5. 프론트엔드 구조

### 핵심 파일

- 모든 앱 로직은 현재 `index.html` 안에 있다.
- CSS, HTML, JS가 모두 한 파일에 존재한다.
- 별도 프레임워크는 사용하지 않고 Vanilla JS로 DOM 업데이트한다.

### 탭 구조

하단 탭 4개:

1. 홈: 내 학교 급식, 검색, 리뷰
2. 지도: Kakao Map 기반 학교 지도
3. 배틀: 내 학교 vs 근처 학교 급식 배틀
4. 랭킹: 날짜별 전국/학교급 랭킹

코드상 탭 전환 함수:

```js
switchTab(tab)
```

탭 진입 시 부가 동작:

- `map`: 최초 진입 시 `initKakaoMap()` 실행
- `ranking`: 날짜 표시 후 `loadFullRanking()` 실행
- `battle`: `loadBattle()` 실행

---

## 6. 주요 JavaScript 함수 맵

현재 `index.html` 주요 함수:

### 사용자 식별/보안

- `getFingerprint()`
  - 기존 canvas/screen 기반 fingerprint 대신 localStorage에 random client id 생성
  - 형식: `cid_<32 hex>`
  - 기존 fingerprint 사용자가 들어오면 `arena_school` 캐시를 제거해 잘못 동기화된 학교 문제를 줄임
- `getUserId()`
  - 토스 미니앱이면 `getAnonymousKey()` 사용 → `toss_<key>`
  - 일반 브라우저면 `fp_<cid...>`
- `escapeHtml(s)`
  - 사용자 입력 리뷰 출력 시 XSS 방어

### 날짜/유틸

- `fixWeekend(d)`
  - 토요일/일요일이면 금요일로 보정
- `fmtDate(d)`
  - `YYYY-MM-DD`
- `fmtDateKR(d)`
  - `M/D (요일)`
- `timeAgo(ts)`
  - 방금/분 전/시간 전/일 전

### 내 학교

- `loadMySchool()`
  - Supabase `user_schools`에서 현재 사용자 학교 조회
  - 없으면 localStorage fallback
- `saveMySchoolToDb()`
  - 선택 학교를 서버 DB에 upsert
- `fetchSchoolChangeStatus()`
  - RPC `get_school_change_status` 호출
- `applyMySchool()`
  - UI에 내 학교 반영
- `openSchoolSetSheet()`, `closeSchoolSetSheet()`
  - 학교 설정 바텀시트
- `selectMySchool(s)`
  - 학교 선택 후 저장/반영
- `onSetSchoolSearch(q)`
  - 학교 설정 검색

### 홈/급식 조회

- `loadMySchoolMeal()`
  - 내 학교 오늘 급식 로드
  - Edge Function `sync-meals` 호출
  - 급식 카드, 점수, 랭크, 공유 버튼, 리뷰 영역 렌더링
- `loadMySchoolStats()`
  - `school_stats`에서 연승 정보 조회
- `onHomeSearch(q)`
  - 학교 검색
- `selectDetailSchool(s)`
  - 검색한 학교 상세 보기
- `renderSchoolDetail()`
  - 학교 상세 카드 렌더링
- `changeDetailDate(delta)`
  - 상세 조회 날짜 변경
- `loadDetailMeal()`
  - 특정 학교/날짜 급식 로드

### 점수/랭크/메뉴 태그

- `menuItemHtml(m)`
  - 메뉴 문자열에 `인기`, `후식`, `건강` 태그 부여
- `schoolItemHtml(s, onclick)`
  - 검색 결과 학교 아이템 HTML
- `getRank(score)`
  - S/A/B/C/D 랭크 반환

랭크 기준:

- S: 90~100, 전설의 급식
- A: 75~89, 갓급식
- B: 55~74, 괜찮은 급식
- C: 35~54, 그저 그런 급식
- D: 0~34, 아쉬운 급식

### 리뷰/평가

- `renderRating(mealId, targetEl)`
  - 별점/한줄평/사진 평가 UI
  - localStorage `rated_<mealId>`로 기기 내 중복 제출 UI 제한
- `setRating(n, mealId)`
  - 별점 선택
- `onPhotoSelected(input)`
  - 사진 미리보기
- `removePhoto(mealId)`
  - 사진 제거
- `uploadPhoto(file)`
  - Supabase Storage `reviews` bucket에 업로드
- `submitRating(mealId)`
  - Supabase `ratings`에 POST
- `loadReviews(mealId, targetEl)`
  - 리뷰 목록 로드

주의:

- `comment`는 `escapeHtml()` 처리됨.
- `photo_url`은 그대로 img src에 들어간다. Storage URL만 저장되도록 정책/검증 필요.
- 서버 DB unique constraint가 있다면 중복 평가를 막고, 클라이언트는 `409`를 무시하는 구조다.

### 랭킹

- `changeRankDate(delta)`
  - 랭킹 날짜 변경, 주말 보정
- `setRankFilter(f, el)`
  - 전국/초/중/고 필터
- `loadFullRanking()`
  - `meals`를 `auto_score.desc`로 최대 30개 조회
  - `schools` 조인
  - 내 학교는 강조 표시

### 배틀

- `loadBattle()`
  - 내 학교가 없으면 학교 설정 유도
  - 기존 오늘 배틀 조회
  - 없으면 내 학교 급식 로드
  - 근처 동일 학교급 상대 후보 RPC 조회
  - 후보가 없으면 fallback으로 같은 학교급 검색 후 급식 있는 학교 탐색
  - `battles` 생성
  - 생성 후 조인 포함 재조회 후 렌더
- `renderBattleCard(battle)`
  - AI 판정, 점수, 메뉴, 여론 투표 바 렌더링
- `openBattleOppSheet(battleId, totalVotes)`
  - 투표가 없을 때만 상대 변경 가능
  - RPC 후보 목록 표시
- `closeBattleOppSheet()`
- `pickBattleOpponent(oldBattleId, newOppId, newMealId, newScore)`
  - 기존 배틀 삭제 후 새 상대 배틀 생성
- `voteBattle(battleId, schoolId, side)`
  - 배틀 투표 처리
- `shareBattle(...)`
  - 배틀 결과 공유

배틀 매칭 기준:

- 내 학교 위치 lat/lng 필요
- 같은 학교급: 초/중/고
- 당일 급식 데이터가 있는 학교만
- 거리순으로 후보 정렬
- 기본은 가장 가까운 학교 자동 선택

### 지도

- `initKakaoMap()`
- `loadMapSchools()`
- `openBottomSheet()`
- `closeBottomSheet()`
- `goMyLocation()`

지도는 Kakao Map SDK 사용:

```html
<script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=...&libraries=services,clusterer&autoload=false"></script>
```

---

## 7. 백엔드/Supabase 구조

### Supabase 설정

`index.html` 상단에 다음 상수가 있다.

```js
const SUPABASE_URL = 'https://puwthqzbounohrdmacgo.supabase.co';
const SUPABASE_KEY = 'eyJhbG...NOy0';
```

주의:

- 실제 파일에는 anon key가 들어 있다.
- 공개 클라이언트 앱이므로 anon key 노출 자체보다 RLS 정책/Storage 정책이 중요하다.
- DB 쓰기 가능한 테이블은 반드시 RLS/constraint로 악용을 막아야 한다.

### 클라이언트 fetch helper

```js
const sb = (path, opts = {}) => fetch(`${SUPABASE_URL}/rest/v1/${path}`, ...).then(r => r.json())
const edge = (fn, body) => fetch(`${SUPABASE_URL}/functions/v1/${fn}`, ...).then(r => r.json())
```

### 호출하는 Edge Functions

- `sync-meals`
  - 급식 조회/캐싱
  - 입력: `{ atpt_code, school_code, date }`
  - 반환 예상: `{ meal, cached? }`
- `sync-schools`
  - 기획서상 학교 데이터 동기화 함수
  - 현재 `index.html`에서 직접 호출되는지는 추가 확인 필요

Edge Function 소스는 repo에 없으므로, 다른 에이전트가 백엔드까지 수정하려면 Supabase 함수 소스 위치를 찾아야 한다.

---

## 8. DB 테이블/스키마 정리

### 기획서상 기존 테이블

`PLAN.md`에 따르면 기존 테이블:

- `schools`
- `meals`
- `ratings`
- `daily_rankings`

### 현재 코드가 사용하는 테이블

- `schools`
- `meals`
- `ratings`
- `user_schools`
- `user_school_changes`
- `battles`
- `battle_votes`
- `school_stats`

### schools 예상 필드

코드에서 참조:

- `id`
- `name`
- `type`
- `address`
- `atpt_code`
- `school_code`
- `lat`
- `lng`

### meals 예상 필드

코드에서 참조:

- `id`
- `school_id`
- `meal_date`
- `menu`
- `calories`
- `auto_score`
- `auto_rank`
- `schools(...)` join

### ratings 예상 필드

코드에서 insert/select:

- `meal_id`
- `school_id`
- `score`
- `fingerprint`
- `comment`
- `photo_url`
- `created_at`

중복 평가 방지를 위해 DB 레벨 unique constraint가 필요하다. 예: `(meal_id, fingerprint)`.

### user_schools

생성 migration: `migrations/20260421_create_user_schools.sql`

목적: 토스 미니앱 사용자 및 브라우저 사용자가 선택한 학교를 서버에 기억.

주요 필드:

- `user_hash text primary key`
- `source text not null check (source in ('toss', 'fp'))`
- `school_id bigint references public.schools(id)`
- `school_name text not null`
- `school_type text`
- `atpt_code text not null`
- `school_code text not null`
- `address text`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

정책:

- select anon/authenticated 허용
- insert anon/authenticated 허용
- update anon/authenticated 허용

단, 이후 보안 migration에서 insert/update 정책이 강화됨.

### user_school_changes

생성 migration: `migrations/20260422_school_change_limit.sql`

목적: 사용자가 학교를 무한 변경하지 못하도록 30일 롤링 3회 제한.

주요 필드:

- `id bigserial primary key`
- `user_hash text not null`
- `from_school_id bigint references public.schools(id) on delete set null`
- `to_school_id bigint references public.schools(id) on delete set null`
- `changed_at timestamptz default now()`

트리거/함수:

- `log_user_school_change()`
  - `user_schools` update 후 학교가 바뀌면 변경 이력 insert
- `enforce_school_change_limit()`
  - `user_schools` update 전 최근 30일 변경 3회 이상이면 exception
- `get_school_change_status(p_user_hash text)`
  - used_count, remaining_count, oldest_change_at, next_available_at 반환

### find_battle_opponents RPC

파일: `migrations/20260422_battle_find_opponent.sql`

시그니처:

```sql
public.find_battle_opponents(
  p_my_lat double precision,
  p_my_lng double precision,
  p_my_type text,
  p_my_id bigint,
  p_date date,
  p_limit int default 20
)
```

반환:

- `school_id`
- `school_name`
- `school_type`
- `address`
- `atpt_code`
- `school_code`
- `lat`
- `lng`
- `distance_km`
- `meal_id`
- `auto_score`
- `auto_rank`
- `menu`

로직:

- `schools`와 `meals` join
- 동일 날짜 급식이 있는 학교만
- 내 학교 제외
- lat/lng가 있는 학교만
- 같은 학교급만
- 거리순 정렬

### security_hardening

파일: `migrations/20260422_security_hardening.sql`

목적:

- `user_schools` insert/update 정책 강화
- `user_hash` 형식 검증
- `source` 화이트리스트
- update 시 user_hash 변경 방지

자세한 정책 조건은 파일 확인 필요.

---

## 9. 급식 점수 시스템

기획서 기준 자동 점수는 100점.

배점:

- 다양성 25점: 반찬 수
- 인기 메뉴 25점: 치킨/떡볶이/피자 등
- 영양 균형 25점: 나물/생선/두부 등
- 디저트 25점: 과일/요구르트/케이크 등

코드상 프론트에서 메뉴 태그용 키워드는 다음과 같다.

```js
POPULAR = ['치킨','피자','떡볶이','햄버거','돈까스','돈가스','카레','짜장','탕수육','제육','불고기','갈비','스파게티','파스타','라면','순대','핫도그','너겟']
DESSERTS = ['케이크','아이스크림','푸딩','젤리','요구르트','요거트','딸기','귤','사과','바나나','포도','수박','초코','쿠키','빵','주스','우유']
HEALTHY = ['나물','샐러드','두부','콩','시금치','브로콜리','당근','버섯','미역','김','고등어','연어','잡곡','보리','현미']
```

실제 `auto_score` 계산은 프론트가 아니라 `sync-meals` Edge Function 또는 DB 저장 시점에서 되는 것으로 보인다.

---

## 10. Apps in Toss 설정

파일: `granite.config.ts`

주요 내용:

- `appName: 'lunch-arena'`
- `displayName: '오늘급식'`
- `primaryColor: '#FF8C32'`
- icon: `https://ssuksak.github.io/lunch-arena/icon_600.png`
- dev server host/port: `0.0.0.0:5173`
- category/type: `partner`
- permissions: `[]`

토스 미니앱 사용자 식별:

```js
import('https://esm.sh/@apps-in-toss/web-framework@^2.4.5')
mod.getAnonymousKey()
```

성공 시:

```js
window.USER = { id: 'toss_' + key, source: 'toss' }
```

실패 시:

```js
window.USER = { id: 'fp_' + FP, source: 'fp' }
```

---

## 11. Git 상태

최근 커밋:

```text
d2363be build: switch appName to lunch-arena and regenerate .ait
90812c1 build: generate oneulgeupshik.ait and fix static outdir for ait build
afa4d8b feat: AIT(앱인토스) granite.config.ts 추가
ca206e9 security: XSS 방어 escapeHtml + user_schools 형식 검증
b15520a fix: 배틀 로드 시 mySchool lat/lng 선로드
46fd345 feat: 배틀 상대 학교 위치 기반 자동 매칭 + 수동 변경 지원
181c91e feat: 학교 변경 30일 롤링 3회 제한
ac65341 feat: 토스 미니앱 user hash key로 사용자 학교 기억
```

현재 작업트리 변경사항:

```text
M index.html
M privacy.html
?? PROJECT_STATUS.md
```

`index.html`, `privacy.html` 변경 내용:

- fingerprint 방식을 canvas/screen 기반에서 random client id 기반으로 변경
- 잘못된 구 fingerprint 캐시 문제 방지를 위해 최초 migration 시 `arena_school` localStorage 제거
- privacy 문구를 fingerprint가 아닌 client id/서버 학교 설정 저장 구조로 수정

---

## 12. 최근 작업 맥락

최근 가장 중요한 이슈는 **브라우저 fingerprint 충돌 가능성**이다.

기존 방식:

- canvas text render
- screen width/height
- timezone
- language
- base64 잘라서 fingerprint 생성

문제:

- 같은 기종/같은 브라우저/비슷한 환경이면 fingerprint가 충돌할 수 있음
- 충돌 시 타인이 설정한 학교가 내 학교처럼 보일 수 있음
- 특히 `user_schools`가 서버에 저장되기 때문에 영향이 커짐

현재 미커밋 해결 방향:

- 브라우저에서는 최초 접속 시 crypto random 16 bytes 생성
- `cid_<hex>` 형태로 localStorage 저장
- user id는 `fp_cid_<hex>` 형태
- 토스 미니앱에서는 여전히 `toss_<anonymousKey>` 우선
- 기존 fingerprint 사용자는 새 client id로 migration하면서 localStorage `arena_school` 제거

이 변경은 합리적이지만 배포 전 확인할 것:

- `user_schools` RLS 정책이 `fp_cid_...` 형식을 허용하는지 확인
- 현재 `20260422_security_hardening.sql`의 user_hash regex는 `[A-Za-z0-9_-]`를 허용하므로 `fp_cid_...` 형식과 호환된다
- 기존 서버에 저장된 구 fingerprint 기반 `fp_<old>` rows는 자연스럽게 더 이상 조회되지 않음
- 사용자는 최초 1회 학교 재설정이 필요할 수 있음

---

## 13. 다음 에이전트에게 추천하는 작업 순서

### 1순위: 현재 변경사항 검증

- `index.html` random client id 변경이 DB 정책과 호환되는지 확인
- Supabase `user_schools` insert/update가 새 `user_hash`로 성공하는지 확인
- privacy 문구와 실제 동작 일치 확인
- 문제 없으면 커밋

추천 커밋 메시지:

```text
fix: replace browser fingerprint with random client id
```

### 2순위: 스키마 복원성 보강

현재 migrations 폴더에는 일부 추가 migration만 있고, 초기 스키마가 누락되어 있을 수 있다.

추가해야 할 가능성이 높은 SQL:

- `schools` create table
- `meals` create table
- `ratings` create table
- `daily_rankings` create table
- `battles` create table
- `battle_votes` create table
- `school_stats` create table
- Storage bucket/policy 설명
- 필수 indexes/unique constraints

다른 에이전트가 새 Supabase 프로젝트에서 재현 가능하게 만들려면 `schema.sql` 또는 `migrations/000_initial_schema.sql`이 필요하다.

### 3순위: Edge Functions 소스 확보

클라이언트가 의존하는 함수:

- `sync-meals`
- `sync-schools`

해야 할 일:

- 함수 소스가 다른 디렉터리에 있는지 검색
- 없다면 Supabase CLI로 pull 또는 콘솔에서 백업
- repo에 `supabase/functions/sync-meals/index.ts` 형태로 정리
- NEIS API key 등 secret은 env로 관리

### 4순위: 보안/RLS 점검

특히 공개 anon key 환경이므로 확인 필요:

- `ratings` insert 정책: score 범위 1~5, comment 길이 제한, fingerprint 형식 제한
- `ratings` select 정책: 공개 리뷰 노출 의도 확인
- `battle_votes` insert 정책: 중복 투표 unique 및 fingerprint 검증
- `battles` insert/delete/update 정책: 클라이언트가 임의 조작 가능한 범위 제한
- `user_schools` select 정책: 현재 전체 공개면 익명 user_hash와 학교 설정이 모두 조회될 수 있음. 가능하면 RPC 기반 본인 row 조회 구조가 더 안전함.
- Storage `reviews` bucket: 파일 타입/크기 제한 필요

### 5순위: UI/코드 구조화

현재 `index.html` 한 파일에 모든 로직이 있어 빠르게 만들기엔 좋지만 유지보수가 어렵다.

추천 분리:

```text
src/
├── api.js
├── identity.js
├── school.js
├── meal.js
├── rating.js
├── battle.js
├── ranking.js
├── map.js
└── ui.js
```

다만 현재는 정적 배포/토스 미니앱 단순성을 유지해야 하므로, 분리 시 build 파이프라인을 같이 설계해야 한다.

---

## 14. 알려진 리스크/버그 후보

### 1. 새 client id와 DB 정책 호환성

새 client id는 다음처럼 저장된다.

```text
FP = cid_<32 hex>
USER.id = fp_cid_<32 hex>
```

`security_hardening.sql`의 `user_hash` regex는 `[A-Za-z0-9_-]`를 허용하므로 현재 migration 기준으로는 호환된다. 다만 운영 Supabase DB에 최신 migration이 실제 적용되어 있는지는 별도로 확인해야 한다.

### 2. 리뷰/배틀 중복 방지가 클라이언트 localStorage에 일부 의존

- `rated_<mealId>`
- `voted_battle_<battleId>`

DB unique constraint가 반드시 있어야 한다.

### 3. `user_schools` select policy가 전체 공개일 수 있음

현재 migration상 select는 anon에게 `using (true)`다.  
실제 user_hash가 익명이라도, 학교 설정 데이터가 공개 조회 가능한 구조다. 민감도는 낮지만 개선 여지가 있다.

### 4. Edge Function 에러 처리 약함

`edge()` helper가 HTTP status 확인 없이 `.json()`만 호출한다.  
서버 오류/HTML error/빈 응답이면 UI가 깨질 수 있다.

### 5. `sb()` helper도 HTTP status 확인이 약함

PostgREST 오류가 JSON으로 와도 정상 데이터처럼 처리될 수 있다.

### 6. 사진 업로드 검증 부족

클라이언트 accept는 `image/*`지만 서버 Storage 정책으로 MIME/type/size 제한이 필요하다.

### 7. HTML 문자열 기반 렌더링

대부분 `innerHTML` 기반이다. 학교명/주소/메뉴 등 외부 데이터가 들어가는 곳은 escape 필요.  
현재 리뷰 comment에는 escape가 들어갔지만 모든 필드에 일관 적용된 것은 아니다.

---

## 15. 현재 서비스가 의존하는 외부 서비스

- Supabase
  - Postgres
  - REST/PostgREST
  - Edge Functions
  - Storage
- NEIS Open API
  - 학교/급식 데이터
  - 직접 호출은 Edge Function에서 처리하는 것으로 추정
- Kakao Maps JavaScript SDK
  - 지도, geocoding/services, clusterer
- Apps in Toss Web Framework
  - 토스 미니앱 개발/빌드
  - `getAnonymousKey()`
- GitHub Pages
  - 정적 배포/아이콘 URL 기준

---

## 16. 개발자가 바로 확인해야 할 체크리스트

### 로컬

```bash
cd /home/ubuntu/projects/lunch-arena
npm install
npm run start
```

브라우저에서:

- 홈 로드 확인
- 학교 검색 확인
- 내 학교 설정 확인
- 새로고침 후 내 학교 유지 확인
- 급식 조회 확인
- 리뷰 등록 확인
- 랭킹 조회 확인
- 배틀 생성 확인
- 배틀 투표 확인
- 지도 탭 진입 확인

### Supabase

- `user_schools`에 새 `fp_cid_...` 값 insert되는지
- `get_school_change_status` RPC 정상 응답하는지
- `find_battle_opponents` RPC 정상 응답하는지
- `ratings` insert unique constraint 작동하는지
- Storage `reviews` bucket public URL 접근 가능한지

### 토스 미니앱

```bash
npm run dev
```

- AIT sandbox에서 앱 로드
- `getAnonymousKey()` 성공 여부
- `toss_<key>`로 `user_schools` 저장 여부
- 일반 브라우저 fallback과 충돌 없는지 확인

---

## 17. 다른 에이전트에게 줄 한 문장 브리핑

이 repo는 `index.html` 단일 파일로 구현된 오늘급식 모바일 SPA이며, Supabase Edge Function `sync-meals`로 NEIS 급식을 캐싱하고, Supabase 테이블에 학교/급식/리뷰/배틀/사용자 학교 설정을 저장한다. 최근 작업은 브라우저 fingerprint 충돌 문제를 random client id로 바꾸는 미커밋 수정이며, 다음 작업자는 이 변경이 Supabase RLS regex와 호환되는지 먼저 검증한 뒤 커밋하고, 누락된 초기 DB schema와 Edge Function 소스를 repo에 정리하는 것이 좋다.
