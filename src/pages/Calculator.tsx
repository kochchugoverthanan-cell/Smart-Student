import { useEffect, useState } from 'react';

// English-only calculator. Labels and digits are intentionally fixed (English, digits 0-9), as requested.
// It uses a small safe parser. It never calls eval().

class CalcError extends Error {}

function evaluate(src: string): number {
  const text = src.replace(/\s+/g, '');
  if (!text) throw new CalcError('Nothing to calculate');
  const tokens = text.match(/\d+\.?\d*|\.\d+|[+\-*/()]/g) ?? [];
  if (tokens.join('') !== text) throw new CalcError('Invalid expression');
  let pos = 0;
  const peek = () => tokens[pos];
  const next = () => tokens[pos++];

  function expr(): number {
    let v = term();
    while (peek() === '+' || peek() === '-') { const op = next(); const r = term(); v = op === '+' ? v + r : v - r; }
    return v;
  }
  function term(): number {
    let v = factor();
    while (peek() === '*' || peek() === '/') {
      const op = next(); const r = factor();
      if (op === '/') { if (r === 0) throw new CalcError('Cannot divide by zero'); v = v / r; } else v = v * r;
    }
    return v;
  }
  function factor(): number {
    const tk = next();
    if (tk === undefined) throw new CalcError('Invalid expression');
    if (tk === '+') return factor();
    if (tk === '-') return -factor();
    if (tk === '(') { const v = expr(); if (next() !== ')') throw new CalcError('Missing closing bracket'); return v; }
    if (/^[\d.]/.test(tk)) { const n = Number(tk); if (Number.isNaN(n)) throw new CalcError('Invalid number'); return n; }
    throw new CalcError('Invalid expression');
  }
  const out = expr();
  if (pos < tokens.length) throw new CalcError('Invalid expression');
  if (!Number.isFinite(out)) throw new CalcError('Number is too large');
  return out;
}

function format(n: number): string {
  const r = Number(n.toPrecision(12)); // removes tiny floating-point errors such as 0.1 + 0.2
  return String(r);
}

const KEYS: { label: string; value: string; kind: 'num' | 'op' | 'fn' | 'eq'; aria?: string }[] = [
  { label: 'C', value: 'C', kind: 'fn', aria: 'Clear all' }, { label: '(', value: '(', kind: 'fn' }, { label: ')', value: ')', kind: 'fn' }, { label: '÷', value: '/', kind: 'op', aria: 'Divide' },
  { label: '7', value: '7', kind: 'num' }, { label: '8', value: '8', kind: 'num' }, { label: '9', value: '9', kind: 'num' }, { label: '×', value: '*', kind: 'op', aria: 'Multiply' },
  { label: '4', value: '4', kind: 'num' }, { label: '5', value: '5', kind: 'num' }, { label: '6', value: '6', kind: 'num' }, { label: '−', value: '-', kind: 'op', aria: 'Subtract' },
  { label: '1', value: '1', kind: 'num' }, { label: '2', value: '2', kind: 'num' }, { label: '3', value: '3', kind: 'num' }, { label: '+', value: '+', kind: 'op', aria: 'Add' },
  { label: '0', value: '0', kind: 'num' }, { label: '.', value: '.', kind: 'num', aria: 'Decimal point' }, { label: '⌫', value: 'DEL', kind: 'fn', aria: 'Delete last' }, { label: '=', value: '=', kind: 'eq', aria: 'Equals' },
];

export default function Calculator() {
  const [expr, setExpr] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function press(v: string) {
    setError(null);
    if (v === 'C') { setExpr(''); setResult(null); return; }
    if (v === 'DEL') { if (result !== null) { setResult(null); setExpr(''); } else setExpr((e) => e.slice(0, -1)); return; }
    if (v === '=') {
      try { const r = format(evaluate(expr)); setResult(r); setExpr(expr); } catch (e) { setError(e instanceof CalcError ? e.message : 'Invalid expression'); }
      return;
    }
    const isOp = '+-*/'.includes(v);
    if (result !== null) { setExpr(isOp ? result + v : v); setResult(null); return; }
    setExpr((e) => e + v);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.ctrlKey || e.metaKey || e.altKey) return;
      const isButton = tag === 'BUTTON';
      if (/^[0-9.+\-*/()]$/.test(e.key)) { e.preventDefault(); press(e.key); }
      else if (e.key === 'Enter' && !isButton) { e.preventDefault(); press('='); }
      else if (e.key === '=') { e.preventDefault(); press('='); }
      else if (e.key === 'Backspace') { e.preventDefault(); press('DEL'); }
      else if (e.key === 'Escape' || e.key === 'Delete') { e.preventDefault(); press('C'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const shown = (expr || '0').replace(/\*/g, '×').replace(/\//g, '÷').replace(/-/g, '−');
  const cls = { num: 'bg-white hover:bg-slate-100', op: 'bg-primary-100 text-primary-900 hover:bg-primary-200', fn: 'bg-slate-200 hover:bg-slate-300', eq: 'bg-primary-700 text-white hover:bg-primary-800' };

  return (
    <div lang="en" className="mx-auto max-w-sm">
      <h1 className="mb-4 text-2xl font-bold text-primary-900">Calculator</h1>
      <div className="card !p-3">
        <div className="mb-3 rounded-lg bg-slate-900 p-3 text-right text-white" role="group" aria-label="Display">
          <p className="min-h-[1.75rem] break-all text-lg text-slate-300" aria-live="off">{result !== null ? `${shown} =` : '\u00A0'}</p>
          <p className="break-all text-3xl font-bold" aria-live="polite">{result !== null ? result : shown}</p>
        </div>
        {error && <p role="alert" className="mb-3 rounded-lg bg-red-50 p-2 text-center font-semibold text-red-900">{error}</p>}
        <div className="grid grid-cols-4 gap-2">
          {KEYS.map((k) => (
            <button key={k.label} type="button" aria-label={k.aria} onClick={() => press(k.value)} className={`min-h-[56px] rounded-lg border border-slate-300 text-xl font-semibold ${cls[k.kind]}`}>{k.label}</button>
          ))}
        </div>
        <p className="mt-3 text-sm text-slate-600">Keyboard: 0-9 . + - * / ( ), Enter or = to calculate, Backspace to delete, Esc to clear.</p>
      </div>
    </div>
  );
}
