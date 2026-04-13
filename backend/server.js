import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PORT = Number(process.env.PORT || 3001);
const ENV_PATH = resolve(process.cwd(), '.env');

loadEnvFile(ENV_PATH);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const server = createServer(async (request, response) => {
  if (request.method === 'OPTIONS') {
    writeJson(response, 204, {});
    return;
  }

  if (request.method === 'GET' && request.url === '/api/health') {
    writeJson(response, 200, { ok: true });
    return;
  }

  if (request.method === 'POST' && request.url === '/api/investment-advice') {
    if (!GEMINI_API_KEY) {
      writeJson(response, 500, {
        error: 'backend/.env 파일에 GEMINI_API_KEY를 설정해주세요.',
      });
      return;
    }

    try {
      const body = await readJsonBody(request);
      const prompt = buildPrompt(body);

      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': GEMINI_API_KEY,
          },
          body: JSON.stringify({
            system_instruction: {
              parts: [
                {
                  text:
                    '당신은 한국어로 답변하는 투자 보조 AI입니다. 사용자의 재정 상태를 바탕으로 현실적이고 신중한 주식 투자 참고 조언을 작성하세요. 반드시 분산 투자, 현금흐름, 비상금, 부채 관리 관점을 포함하고, 확정 수익을 약속하지 마세요.',
                },
              ],
            },
            contents: [
              {
                role: 'user',
                parts: [{ text: prompt }],
              },
            ],
          }),
        },
      );

      const result = await geminiResponse.json();

      if (!geminiResponse.ok) {
        const apiMessage = result?.error?.message || 'Gemini API 호출에 실패했습니다.';
        writeJson(response, geminiResponse.status, { error: apiMessage });
        return;
      }

      const advice = extractText(result);

      if (!advice) {
        writeJson(response, 502, { error: 'Gemini 응답에서 조언 텍스트를 찾지 못했습니다.' });
        return;
      }

      writeJson(response, 200, { advice });
    } catch (error) {
      writeJson(response, 500, {
        error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
      });
    }

    return;
  }

  writeJson(response, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`Backend server listening on http://localhost:${PORT}`);
});

function loadEnvFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');

    content.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith('#')) {
        return;
      }

      const separatorIndex = trimmed.indexOf('=');

      if (separatorIndex === -1) {
        return;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim();

      if (!(key in process.env)) {
        process.env[key] = stripQuotes(value);
      }
    });
  } catch (error) {
    if (error && error.code !== 'ENOENT') {
      throw error;
    }
  }
}

function stripQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function writeJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  });
  response.end(JSON.stringify(payload));
}

function readJsonBody(request) {
  return new Promise((resolvePromise, rejectPromise) => {
    let raw = '';

    request.on('data', (chunk) => {
      raw += chunk;
    });

    request.on('end', () => {
      try {
        resolvePromise(raw ? JSON.parse(raw) : {});
      } catch {
        rejectPromise(new Error('요청 본문이 올바른 JSON 형식이 아닙니다.'));
      }
    });

    request.on('error', () => {
      rejectPromise(new Error('요청 본문을 읽는 중 오류가 발생했습니다.'));
    });
  });
}

function buildPrompt(payload = {}) {
  const profile = payload.profile || {};
  const summary = payload.summary || {};
  const monthlySummary = Array.isArray(payload.monthlySummary) ? payload.monthlySummary : [];

  const monthlyText =
    monthlySummary.length > 0
      ? monthlySummary
          .map(
            (item) =>
              `- ${item.month}: 수입 ${formatNumber(item.income)}원, 지출 ${formatNumber(item.expense)}원, 잔액 ${formatNumber(item.balance)}원`,
          )
          .join('\n')
      : '- 최근 월별 거래 요약 없음';

  return [
    '다음 재정 상태를 바탕으로 한국어 주식 투자 조언을 작성해줘.',
    '',
    '[사용자 재정 상태]',
    `- 월 수입: ${formatNumber(profile.monthlyIncome)}원`,
    `- 월 지출: ${formatNumber(profile.monthlyExpenses)}원`,
    `- 보유 현금: ${formatNumber(profile.cashSavings)}원`,
    `- 부채: ${formatNumber(profile.debt)}원`,
    `- 월 투자 가능 금액: ${formatNumber(profile.investmentBudget)}원`,
    `- 투자 성향: ${profile.riskTolerance || '정보 없음'}`,
    `- 투자 목표: ${profile.investmentGoal || '정보 없음'}`,
    `- 투자 기간: ${profile.investmentHorizon || '정보 없음'}`,
    '',
    '[가계부 요약]',
    `- 총 수입: ${formatNumber(summary.income)}원`,
    `- 총 지출: ${formatNumber(summary.expense)}원`,
    `- 현재 잔액: ${formatNumber(summary.balance)}원`,
    '',
    '[최근 월별 요약]',
    monthlyText,
    '',
    '아래 형식으로 답변해줘.',
    '1. 재정 상태 진단',
    '2. 현재 상황에서 고려할 만한 주식 투자 전략 3가지',
    '3. 종목군 또는 ETF 유형 예시와 이유',
    '4. 지금 당장 체크할 리스크 3가지',
    '5. 마지막 줄에 "이 답변은 투자 참고용이며, 최종 판단은 본인 책임입니다." 문구를 포함',
  ].join('\n');
}

function extractText(result) {
  const candidates = Array.isArray(result?.candidates) ? result.candidates : [];

  for (const candidate of candidates) {
    const parts = candidate?.content?.parts;

    if (!Array.isArray(parts)) {
      continue;
    }

    const text = parts
      .map((part) => part?.text || '')
      .join('')
      .trim();

    if (text) {
      return text;
    }
  }

  return '';
}

function formatNumber(value) {
  const numericValue = Number(value || 0);
  return Number.isFinite(numericValue) ? numericValue.toLocaleString('ko-KR') : '0';
}
