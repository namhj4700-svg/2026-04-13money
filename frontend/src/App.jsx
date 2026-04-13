import React, { useEffect, useMemo, useState } from 'react';
import {
  Brain,
  Calendar,
  Pencil,
  Plus,
  Receipt,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';

const STORAGE_KEY = 'expenseTrackerTransactions';
const DEFAULT_PRODUCTION_API_BASE_URL = 'https://two026-04-13money.onrender.com';
const API_BASE_URL = resolveApiBaseUrl();

const categories = {
  income: ['월급', '부업', '용돈', '이자', '기타 수입'],
  expense: ['식비', '교통비', '주거/통신', '쇼핑', '문화생활', '건강', '교육', '경조사', '기타 지출'],
};

const initialTransactionForm = {
  type: 'expense',
  date: new Date().toISOString().split('T')[0],
  category: categories.expense[0],
  description: '',
  amount: '',
};

const initialAdviceForm = {
  monthlyIncome: '',
  monthlyExpenses: '',
  cashSavings: '',
  debt: '',
  investmentBudget: '',
  riskTolerance: 'moderate',
  investmentGoal: '장기 자산 성장',
  investmentHorizon: '5년 이상',
};

function App() {
  const [transactions, setTransactions] = useState(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);

    if (!savedData) {
      return [];
    }

    try {
      const parsedData = JSON.parse(savedData);
      return parsedData.filter((transaction) => Number(transaction.amount) !== 0);
    } catch (error) {
      console.error('저장된 거래 내역을 불러오지 못했습니다.', error);
      return [];
    }
  });

  const [transactionForm, setTransactionForm] = useState(initialTransactionForm);
  const [editingId, setEditingId] = useState(null);

  const [adviceForm, setAdviceForm] = useState(initialAdviceForm);
  const [advice, setAdvice] = useState('');
  const [adviceError, setAdviceError] = useState('');
  const [isGeneratingAdvice, setIsGeneratingAdvice] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  }, [transactions]);

  const summary = useMemo(() => {
    return transactions.reduce(
      (accumulator, transaction) => {
        if (transaction.type === 'income') {
          accumulator.income += transaction.amount;
          accumulator.balance += transaction.amount;
        } else {
          accumulator.expense += transaction.amount;
          accumulator.balance -= transaction.amount;
        }

        return accumulator;
      },
      { balance: 0, income: 0, expense: 0 },
    );
  }, [transactions]);

  const monthlySummary = useMemo(() => {
    const byMonth = {};

    transactions.forEach((transaction) => {
      const month = transaction.date.slice(0, 7);

      if (!byMonth[month]) {
        byMonth[month] = { income: 0, expense: 0, balance: 0 };
      }

      if (transaction.type === 'income') {
        byMonth[month].income += transaction.amount;
        byMonth[month].balance += transaction.amount;
      } else {
        byMonth[month].expense += transaction.amount;
        byMonth[month].balance -= transaction.amount;
      }
    });

    return Object.entries(byMonth)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([month, data]) => ({ month, ...data }));
  }, [transactions]);

  useEffect(() => {
    const latestMonth = monthlySummary[0];

    setAdviceForm((previous) => ({
      ...previous,
      monthlyIncome: previous.monthlyIncome || String(latestMonth?.income ?? summary.income),
      monthlyExpenses: previous.monthlyExpenses || String(latestMonth?.expense ?? summary.expense),
      cashSavings: previous.cashSavings || String(Math.max(summary.balance, 0)),
    }));
  }, [monthlySummary, summary.expense, summary.income, summary.balance]);

  const handleTransactionInputChange = (event) => {
    const { name, value } = event.target;

    if (name === 'type') {
      setTransactionForm((previous) => ({
        ...previous,
        type: value,
        category: categories[value][0],
      }));
      return;
    }

    setTransactionForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const resetTransactionForm = () => {
    setTransactionForm((previous) => ({
      ...initialTransactionForm,
      date: previous.date,
    }));
  };

  const handleTransactionSubmit = (event) => {
    event.preventDefault();

    if (!transactionForm.description || !transactionForm.amount) {
      return;
    }

    const amount = Number(transactionForm.amount);

    if (amount === 0) {
      return;
    }

    if (editingId) {
      setTransactions((previous) =>
        previous
          .map((transaction) =>
            transaction.id === editingId ? { ...transactionForm, amount, id: editingId } : transaction,
          )
          .sort((a, b) => new Date(b.date) - new Date(a.date)),
      );
      setEditingId(null);
    } else {
      const nextTransaction = {
        id: Date.now().toString(),
        ...transactionForm,
        amount,
      };

      setTransactions((previous) =>
        [nextTransaction, ...previous].sort((a, b) => new Date(b.date) - new Date(a.date)),
      );
    }

    resetTransactionForm();
  };

  const handleEdit = (transaction) => {
    setEditingId(transaction.id);
    setTransactionForm({
      type: transaction.type,
      date: transaction.date,
      category: transaction.category,
      description: transaction.description,
      amount: String(transaction.amount),
    });
  };

  const handleDelete = (id) => {
    setTransactions((previous) => previous.filter((transaction) => transaction.id !== id));
  };

  const cancelEdit = () => {
    setEditingId(null);
    resetTransactionForm();
  };

  const handleAdviceInputChange = (event) => {
    const { name, value } = event.target;

    setAdviceForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleGenerateAdvice = async (event) => {
    event.preventDefault();
    setAdviceError('');
    setAdvice('');
    setIsGeneratingAdvice(true);

    try {
      const response = await fetch(buildApiUrl('/api/investment-advice'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profile: adviceForm,
          summary,
          monthlySummary: monthlySummary.slice(0, 6),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '투자 조언을 생성하지 못했습니다.');
      }

      setAdvice(result.advice);
    } catch (error) {
      setAdviceError(error.message);
    } finally {
      setIsGeneratingAdvice(false);
    }
  };

  const formatCurrency = (amount) => {
    return `${Number(amount).toLocaleString('ko-KR')}원`;
  };

  const riskLabels = {
    conservative: '안정형',
    moderate: '중립형',
    aggressive: '공격형',
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 text-gray-800 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="mb-2 flex items-center gap-3">
          <div className="rounded-2xl bg-blue-600 p-3 text-white shadow-lg">
            <Wallet className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">가계부 및 투자 조언</h1>
            <p className="text-sm text-gray-500">거래 내역과 재정 상태를 기반으로 Gemini 투자 조언을 받아보세요.</p>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <SummaryCard icon={Wallet} label="총 잔액" value={formatCurrency(summary.balance)} iconClassName="text-blue-500" />
          <SummaryCard
            icon={TrendingUp}
            label="총 수입"
            value={`+${formatCurrency(summary.income)}`}
            valueClassName="text-emerald-600"
            iconClassName="text-emerald-500"
          />
          <SummaryCard
            icon={TrendingDown}
            label="총 지출"
            value={`-${formatCurrency(summary.expense)}`}
            valueClassName="text-rose-600"
            iconClassName="text-rose-500"
          />
        </div>

        {monthlySummary.length > 0 && (
          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              <h2 className="text-lg font-bold text-gray-800">월별 요약</h2>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {monthlySummary.slice(0, 3).map(({ month, income, expense, balance }) => (
                <div key={month} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="mb-3 text-sm font-semibold text-gray-700">{month}</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">수입</span>
                      <span className="font-medium text-emerald-600">+{formatCurrency(income)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">지출</span>
                      <span className="font-medium text-rose-600">-{formatCurrency(expense)}</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-200 pt-2 font-semibold">
                      <span>잔액</span>
                      <span className={balance >= 0 ? 'text-blue-600' : 'text-rose-600'}>
                        {balance > 0 ? '+' : ''}
                        {formatCurrency(balance)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
          <section className="xl:col-span-2 space-y-6">
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="mb-5 flex items-center gap-2 text-lg font-bold text-gray-800">
                {editingId ? <Pencil className="h-5 w-5 text-blue-500" /> : <Plus className="h-5 w-5 text-blue-500" />}
                {editingId ? '거래 수정' : '거래 추가'}
              </h2>

              <form onSubmit={handleTransactionSubmit} className="space-y-4">
                <div className="flex rounded-lg bg-gray-100 p-1">
                  <button
                    type="button"
                    onClick={() => handleTransactionInputChange({ target: { name: 'type', value: 'income' } })}
                    className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                      transactionForm.type === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'
                    }`}
                  >
                    수입
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTransactionInputChange({ target: { name: 'type', value: 'expense' } })}
                    className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                      transactionForm.type === 'expense' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-500'
                    }`}
                  >
                    지출
                  </button>
                </div>

                <LabeledField label="날짜">
                  <input
                    type="date"
                    name="date"
                    value={transactionForm.date}
                    onChange={handleTransactionInputChange}
                    required
                    className="w-full rounded-lg border border-gray-200 px-4 py-2 outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  />
                </LabeledField>

                <LabeledField label="카테고리">
                  <select
                    name="category"
                    value={transactionForm.category}
                    onChange={handleTransactionInputChange}
                    className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  >
                    {categories[transactionForm.type].map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </LabeledField>

                <LabeledField label="내용">
                  <input
                    type="text"
                    name="description"
                    value={transactionForm.description}
                    onChange={handleTransactionInputChange}
                    placeholder="예: 월급, 식비, ETF 적립"
                    required
                    className="w-full rounded-lg border border-gray-200 px-4 py-2 outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  />
                </LabeledField>

                <LabeledField label="금액">
                  <div className="relative">
                    <input
                      type="number"
                      name="amount"
                      value={transactionForm.amount}
                      onChange={handleTransactionInputChange}
                      placeholder="0"
                      min="0"
                      required
                      className="w-full rounded-lg border border-gray-200 px-4 py-2 pr-12 outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500">원</span>
                  </div>
                </LabeledField>

                <div className="flex gap-2">
                  <button type="submit" className="flex-1 rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-700">
                    {editingId ? '수정하기' : '추가하기'}
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="rounded-lg bg-gray-200 px-4 py-3 font-medium text-gray-700 transition hover:bg-gray-300"
                    >
                      취소
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="mb-5 flex items-center gap-2 text-lg font-bold text-gray-800">
                <Brain className="h-5 w-5 text-indigo-500" />
                AI 투자 조언 요청
              </h2>

              <form onSubmit={handleGenerateAdvice} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <LabeledField label="월 수입">
                    <input
                      type="number"
                      name="monthlyIncome"
                      value={adviceForm.monthlyIncome}
                      onChange={handleAdviceInputChange}
                      min="0"
                      required
                      className="w-full rounded-lg border border-gray-200 px-4 py-2 outline-none transition focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                    />
                  </LabeledField>
                  <LabeledField label="월 지출">
                    <input
                      type="number"
                      name="monthlyExpenses"
                      value={adviceForm.monthlyExpenses}
                      onChange={handleAdviceInputChange}
                      min="0"
                      required
                      className="w-full rounded-lg border border-gray-200 px-4 py-2 outline-none transition focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                    />
                  </LabeledField>
                  <LabeledField label="보유 현금">
                    <input
                      type="number"
                      name="cashSavings"
                      value={adviceForm.cashSavings}
                      onChange={handleAdviceInputChange}
                      min="0"
                      required
                      className="w-full rounded-lg border border-gray-200 px-4 py-2 outline-none transition focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                    />
                  </LabeledField>
                  <LabeledField label="부채">
                    <input
                      type="number"
                      name="debt"
                      value={adviceForm.debt}
                      onChange={handleAdviceInputChange}
                      min="0"
                      required
                      className="w-full rounded-lg border border-gray-200 px-4 py-2 outline-none transition focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                    />
                  </LabeledField>
                  <LabeledField label="월 투자 가능 금액">
                    <input
                      type="number"
                      name="investmentBudget"
                      value={adviceForm.investmentBudget}
                      onChange={handleAdviceInputChange}
                      min="0"
                      required
                      className="w-full rounded-lg border border-gray-200 px-4 py-2 outline-none transition focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                    />
                  </LabeledField>
                  <LabeledField label="투자 성향">
                    <select
                      name="riskTolerance"
                      value={adviceForm.riskTolerance}
                      onChange={handleAdviceInputChange}
                      className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 outline-none transition focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="conservative">안정형</option>
                      <option value="moderate">중립형</option>
                      <option value="aggressive">공격형</option>
                    </select>
                  </LabeledField>
                </div>

                <LabeledField label="투자 목표">
                  <input
                    type="text"
                    name="investmentGoal"
                    value={adviceForm.investmentGoal}
                    onChange={handleAdviceInputChange}
                    required
                    className="w-full rounded-lg border border-gray-200 px-4 py-2 outline-none transition focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                  />
                </LabeledField>

                <LabeledField label="투자 기간">
                  <input
                    type="text"
                    name="investmentHorizon"
                    value={adviceForm.investmentHorizon}
                    onChange={handleAdviceInputChange}
                    required
                    className="w-full rounded-lg border border-gray-200 px-4 py-2 outline-none transition focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                  />
                </LabeledField>

                <button
                  type="submit"
                  disabled={isGeneratingAdvice}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
                >
                  <Sparkles className="h-4 w-4" />
                  {isGeneratingAdvice ? 'Gemini가 조언 작성 중...' : 'Gemini 투자 조언 받기'}
                </button>
              </form>
            </div>
          </section>

          <section className="xl:col-span-3 space-y-6">
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="border-b border-gray-100 p-6">
                <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                  <Receipt className="h-5 w-5 text-blue-500" />
                  거래 내역 목록
                </h2>
              </div>

              <div className="overflow-x-auto">
                {transactions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 text-gray-400">
                    <Receipt className="mb-3 h-12 w-12 opacity-20" />
                    <p>아직 등록된 거래 내역이 없습니다.</p>
                  </div>
                ) : (
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/70 text-sm text-gray-500">
                        <th className="px-6 py-4 font-medium">날짜</th>
                        <th className="px-6 py-4 font-medium">분류</th>
                        <th className="px-6 py-4 font-medium">내용</th>
                        <th className="px-6 py-4 text-right font-medium">금액</th>
                        <th className="px-6 py-4 text-center font-medium">관리</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {transactions.map((transaction) => (
                        <tr key={transaction.id} className="transition-colors hover:bg-gray-50/60">
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">{transaction.date}</td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                              {transaction.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-medium text-gray-900">{transaction.description}</td>
                          <td
                            className={`whitespace-nowrap px-6 py-4 text-right font-bold ${
                              transaction.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {transaction.type === 'income' ? '+' : '-'}
                            {formatCurrency(transaction.amount)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleEdit(transaction)}
                                className="rounded-md p-1 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-500"
                                title="수정"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(transaction.id)}
                                className="rounded-md p-1 text-gray-400 transition-colors hover:bg-rose-50 hover:text-rose-500"
                                title="삭제"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-800">
                <Sparkles className="h-5 w-5 text-indigo-500" />
                AI 투자 조언 결과
              </h2>

              {adviceError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {adviceError}
                </div>
              )}

              {!adviceError && !advice && (
                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
                  재정 상태를 입력하고 Gemini 투자 조언을 요청해보세요.
                </div>
              )}

              {advice && (
                <div className="whitespace-pre-wrap rounded-xl bg-indigo-50/50 px-4 py-5 text-sm leading-7 text-gray-700">
                  {advice}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, valueClassName = 'text-gray-900', iconClassName = 'text-blue-500' }) {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-2 flex items-center justify-between text-sm text-gray-500">
        <span className="font-medium">{label}</span>
        <Icon className={`h-5 w-5 ${iconClassName}`} />
      </div>
      <div className={`text-2xl font-bold md:text-3xl ${valueClassName}`}>{value}</div>
    </div>
  );
}

function LabeledField({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );
}

function resolveApiBaseUrl() {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/+$/, '');
  }

  if (import.meta.env.DEV) {
    return '';
  }

  return DEFAULT_PRODUCTION_API_BASE_URL;
}

function buildApiUrl(path) {
  return API_BASE_URL ? `${API_BASE_URL}${path}` : path;
}

export default App;
