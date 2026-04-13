# money

가계부 기록과 AI 투자 조언 요청을 한 화면에서 처리하는 개인 자산 관리 프로젝트입니다.
프론트엔드는 React + Vite로 작성되어 있고, 백엔드는 Node.js 기본 HTTP 서버로 동작합니다. 백엔드는 사용자의 수입/지출 요약과 투자 성향 정보를 받아 Gemini API에 전달하고, 응답받은 투자 참고 조언을 다시 프론트엔드에 제공합니다.

## Screenshot

프로젝트 대표 이미지:

![money app screenshot](frontend/src/assets/hero.png)

실제 서비스 화면 캡처 이미지가 생기면 이 섹션의 이미지 경로만 교체하면 됩니다.

## 주요 기능

- 수입/지출 거래 내역 등록, 수정, 삭제
- 총수입, 총지출, 현재 잔액 자동 집계
- 최근 월별 수입/지출/잔액 요약 표시
- 거래 내역을 브라우저 `localStorage`에 저장
- 투자 성향, 투자 목표, 투자 기간을 입력해 AI 투자 조언 요청
- 백엔드에서 Gemini API를 호출해 텍스트 조언 생성

## 프로젝트 구조

```text
money/
├─ backend/
│  ├─ server.js          # Gemini API를 호출하는 Node HTTP 서버
│  ├─ package.json       # 백엔드 실행 스크립트
│  ├─ .env.example       # 환경 변수 예시
│  └─ .env               # 실제 환경 변수 파일
├─ frontend/
│  ├─ src/
│  │  ├─ App.jsx         # 메인 화면과 거래/조언 로직
│  │  ├─ main.jsx        # React 진입점
│  │  ├─ index.css       # 전역 스타일
│  │  └─ App.css         # 기본 템플릿 스타일 파일
│  ├─ public/            # 정적 리소스
│  ├─ dist/              # 프론트엔드 빌드 결과물
│  ├─ package.json       # 프론트엔드 의존성과 스크립트
│  └─ vite.config.js     # `/api` 프록시 설정
└─ README.md
```

## 동작 방식

1. 사용자가 프론트엔드에서 거래 내역을 입력합니다.
2. 거래 데이터는 브라우저 `localStorage`에 저장됩니다.
3. 화면에서 총수입, 총지출, 잔액, 최근 월별 요약을 계산합니다.
4. 사용자가 투자 관련 입력값을 작성하고 AI 조언 생성을 요청합니다.
5. 프론트엔드는 `POST /api/investment-advice`로 현재 재무 요약과 투자 프로필을 전송합니다.
6. 백엔드는 이 데이터를 기반으로 프롬프트를 생성하고 Gemini API에 전달합니다.
7. Gemini 응답 텍스트를 가공해 프론트엔드에 반환합니다.

## 기술 스택

### Frontend

- React 19
- Vite 8
- lucide-react

### Backend

- Node.js ESM
- Node 기본 `http`, `fs`, `path`
- Gemini Generative Language API

## 실행 방법

### 1. 백엔드 실행

`backend/.env.example`을 참고해서 `backend/.env` 파일을 준비합니다.

```env
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
```

백엔드 실행:

```bash
cd backend
npm install
npm run dev
```

또는:

```bash
cd backend
npm start
```

기본 포트는 `3001`이며, `PORT` 환경 변수로 변경할 수 있습니다.

### 2. 프론트엔드 실행

```bash
cd frontend
npm install
npm run dev
```

기본 개발 서버는 Vite를 사용하며, `vite.config.js`에서 `/api` 요청을 `http://localhost:3001`로 프록시합니다.

## 사용 예시

1. 거래 내역에 월급, 생활비, 교통비, 투자 적립 등의 항목을 입력합니다.
2. 화면 상단에서 누적 잔액과 최근 월별 흐름을 확인합니다.
3. 월수입, 월지출, 보유 현금, 부채, 투자 가능 금액, 투자 성향을 입력합니다.
4. AI 조언 생성 버튼을 누르면 Gemini가 투자 참고 의견을 반환합니다.

## API

### `GET /api/health`

서버 상태 확인용 엔드포인트입니다.

응답 예시:

```json
{
  "ok": true
}
```

### `POST /api/investment-advice`

투자 조언 생성을 요청합니다.

요청 본문 예시:

```json
{
  "profile": {
    "monthlyIncome": 3000000,
    "monthlyExpenses": 1800000,
    "cashSavings": 10000000,
    "debt": 0,
    "investmentBudget": 500000,
    "riskTolerance": "moderate",
    "investmentGoal": "장기 자산 성장",
    "investmentHorizon": "5년 이상"
  },
  "summary": {
    "income": 3000000,
    "expense": 1800000,
    "balance": 1200000
  },
  "monthlySummary": [
    {
      "month": "2026-04",
      "income": 3000000,
      "expense": 1800000,
      "balance": 1200000
    }
  ]
}
```

성공 응답 예시:

```json
{
  "advice": "AI가 생성한 투자 참고 조언"
}
```

## 환경 변수

`backend/.env`에서 아래 값을 사용합니다.

- `GEMINI_API_KEY`: Gemini API 호출에 필요한 키
- `GEMINI_MODEL`: 사용할 모델명. 기본값은 `gemini-2.5-flash`
- `PORT`: 백엔드 서버 포트. 미지정 시 `3001`

## 현재 구현 특징

- 백엔드는 외부 프레임워크 없이 단일 파일 `server.js`로 구성되어 있습니다.
- 프론트엔드 거래 데이터는 DB가 아니라 브라우저 저장소에 보관됩니다.
- AI 조언은 참고용 텍스트이며, 백엔드 프롬프트에도 최종 판단 책임은 사용자에게 있다는 문구를 포함하도록 설계되어 있습니다.
- 최근 6개월치 월별 요약 데이터가 AI 요청 payload에 포함됩니다.

## 주의 사항

- `backend/.env`의 실제 API 키는 저장소에 커밋하지 않는 것이 좋습니다.
- 현재 루트 또는 백엔드 전용 `.gitignore`는 보이지 않았고, 프론트엔드에만 `.gitignore`가 있습니다.
- 따라서 `backend/.env`나 루트 민감 파일이 Git에 포함되지 않도록 별도 관리가 필요합니다.
- 거래 내역은 브라우저 저장소에 저장되므로 브라우저 데이터 삭제 시 함께 사라질 수 있습니다.

## 개선 아이디어

- 거래 데이터를 파일 또는 DB에 저장하도록 변경
- 사용자 인증 기능 추가
- 카테고리 통계 차트 추가
- 투자 조언 요청 이력 저장
- 백엔드 입력 검증과 에러 메시지 개선
- 루트 `.gitignore` 추가로 민감정보 보호 강화
