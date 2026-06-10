'use client';

// 루트 레이아웃까지 깨졌을 때의 최후 방어선
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ko">
      <body style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontWeight: 700 }}>문제가 발생했습니다</p>
          <p style={{ fontSize: 14, color: '#64748b', margin: '8px 0 16px' }}>{error.message || '알 수 없는 오류'}</p>
          <button onClick={reset} style={{ padding: '8px 16px', borderRadius: 8, background: '#1e293b', color: '#fff', border: 0, cursor: 'pointer' }}>
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
}
