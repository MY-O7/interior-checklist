'use client';

// 페이지 단위 에러 바운더리 — 렌더 중 예외가 나도 백지 대신 복구 UI를 보여준다.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-6 text-center">
      <div className="space-y-4">
        <p className="text-lg font-bold text-slate-700">문제가 발생했습니다</p>
        <p className="text-sm text-slate-500">{error.message || '알 수 없는 오류'}</p>
        <button
          onClick={reset}
          className="px-4 py-2 rounded-lg bg-emerald-700 text-white text-sm font-medium hover:bg-emerald-800"
        >
          다시 시도
        </button>
      </div>
    </div>
  );
}
