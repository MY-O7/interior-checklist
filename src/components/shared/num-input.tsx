'use client';

import { useState, useRef, useEffect } from 'react';

/** 숫자 입력 — 0일 때 포커스하면 비우고, blur하면 0 복원 */
export function NumInput({ value, onChange, className = '', ...props }: {
  value: number;
  onChange: (v: number) => void;
  className?: string;
  [key: string]: any;
}) {
  const [display, setDisplay] = useState(String(value));
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  // 부모에서 값이 바뀌면 display 동기화 (포커스 아닐 때만)
  useEffect(() => {
    if (!focused) {
      setDisplay(String(value));
    }
  }, [value, focused]);

  return (
    <input
      ref={ref}
      type="text"
      inputMode="numeric"
      className={className}
      value={display}
      onFocus={() => {
        setFocused(true);
        if (value === 0) setDisplay('');
      }}
      onBlur={() => {
        setFocused(false);
        const n = parseInt(display.replace(/[^0-9-]/g, ''), 10);
        const v = isNaN(n) ? 0 : n;
        onChange(v);
        setDisplay(String(v));
      }}
      onChange={(e) => {
        setDisplay(e.target.value);
      }}
      {...props}
    />
  );
}
