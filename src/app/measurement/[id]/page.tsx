'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { SidebarWrapper } from '@/components/mobile-menu';
import { Printer, Clipboard, ChevronLeft, Ruler, Menu, Copy, Home } from 'lucide-react';
import { useTheme } from '@/lib/theme';
import { PageNav } from '@/components/shared';
import { calcArea } from '@/lib/calc';
import { apiGet } from '@/lib/api';

// 실측 관심 항목 (sectionId + itemName → roomChecklist key = "sectionId_itemName")
const MEASUREMENT_ITEMS = [
  { sectionId: 'flooring', name: '마루 시공', label: '마루', category: '바닥', icon: '🪵', isDimension: true },
  { sectionId: 'flooring', name: '타일 시공', label: '타일 (바닥)', category: '바닥', icon: '🔲', isDimension: true },
  { sectionId: 'flooring', name: '장판 시공', label: '장판', category: '바닥', icon: '📜', isDimension: true },
  { sectionId: 'flooring', name: '데코타일 시공', label: '데코타일', category: '바닥', icon: '🔳', isDimension: true },
  { sectionId: 'windows', name: '창호 (샷시)', label: '창호 (샷시)', category: '창호', icon: '🪟', isDimension: true, showJwa: true },
  { sectionId: 'windows', name: '폴딩도어', label: '폴딩도어', category: '창호', icon: '🚪', isDimension: true, showJwa: true },
  { sectionId: 'carpentry', name: '문 / 문틀', label: '문 / 문틀', category: '목공', icon: '🚪', isDoor: true },
  { sectionId: 'furniture', name: '맞춤 가구', label: '맞춤 가구', category: '가구', icon: '🪑', isDimension: true },
  { sectionId: 'equipment', name: '시스템 에어컨', label: '시스템 에어컨', category: '설비', icon: '❄️' },
  { sectionId: 'film', name: '필름 시공', label: '필름', category: '마감', icon: '🎞️' },
  { sectionId: 'wallpaper', name: '도배 시공', label: '도배', category: '도배', icon: '📃' },
  { sectionId: 'tile', name: '타일 시공', label: '타일 (벽)', category: '벽면', icon: '🧱' },
  { sectionId: 'elastic', name: '탄성코트', label: '탄성코트', category: '벽면', icon: '🖌️' },
  { sectionId: 'bathroom', name: '공용 화장실', label: '공용 화장실', category: '욕실', icon: '🚿' },
  { sectionId: 'bathroom', name: '안방 화장실', label: '안방 화장실', category: '욕실', icon: '🚿' },
  { sectionId: 'carpentry', name: '에어컨 단내림', label: '에어컨 단내림', category: '목공', icon: '🔧' },
  { sectionId: 'carpentry', name: '천장 평탄화', label: '천장 평탄화', category: '목공', icon: '📐' },
];

// 문/문틀 JSON 값을 사람이 읽는 문장으로
function formatDoor(value: string): string {
  let d: any;
  try { d = JSON.parse(value || '{}'); } catch { return value || ''; }
  if (!d || typeof d !== 'object') return value || '';
  const parts: string[] = [];
  if (d.type) parts.push(d.type);
  const door = [d.dw, d.dh].filter(Boolean).join('×');
  const doorBits = [door ? `${door}mm` : '', d.handle ? `손잡이 ${d.handle}` : ''].filter(Boolean).join(' · ');
  if (doorBits) parts.push(`문짝 ${doorBits}`);
  const frame = [d.fw, d.fh].filter(Boolean).join('×');
  const frameBits = [frame ? `${frame}mm` : '', d.bar ? `bar ${d.bar}` : ''].filter(Boolean).join(' · ');
  if (frameBits) parts.push(`문틀 ${frameBits}`);
  return parts.join('  /  ');
}

export default function MeasurementPage() {
  const router = useRouter();
  const { id: projectId } = useParams();
  const { theme } = useTheme();
  const [project, setProject] = useState<any>(null);
  const [siteInfo, setSiteInfo] = useState<any>(null);
  const [checklist, setChecklist] = useState<Record<string, Record<string, any>>>({});
  const [roomChecklist, setRoomChecklist] = useState<Record<string, Record<string, any>>>({});
  const [printMode, setPrintMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    // GET /api/projects/[id] 는 프로젝트 객체를 그대로 반환한다 (d.project 아님 — 기존엔 항상 undefined였음)
    apiGet(`/api/projects/${projectId}`).then(d => setProject(d)).catch(console.error);
    apiGet(`/api/checklists/${projectId}`).then(d => {
      if (d.checklist) {
        setChecklist(d.checklist || {});
        setRoomChecklist(d.roomChecklist || {});
        setSiteInfo(d.siteInfo || null);
      }
    }).catch(console.error);
  }, [projectId]);

  // 방 사이즈 데이터
  const roomSizes = useMemo(() => {
    const rs = checklist['roomSize'] || {};
    const result: Record<string, { value: string; area: ReturnType<typeof calcArea> }> = {};
    Object.entries(rs).forEach(([name, data]: [string, any]) => {
      if (data?.checked && data.value) {
        result[name] = { value: data.value, area: calcArea(data.value) };
      }
    });
    return result;
  }, [checklist]);

  // 실측 데이터 추출
  const measurements = useMemo(() => {
    return MEASUREMENT_ITEMS.map(item => {
      const sectionData = checklist[item.sectionId] || {};
      const ck = sectionData[item.name];
      const roomKey = `${item.sectionId}_${item.name}`;
      const rooms = roomChecklist[roomKey] || {};

      const checkedRooms = Object.entries(rooms)
        .filter(([_, rd]: [string, any]) => rd?.checked)
        .map(([name, rd]: [string, any]) => {
          const area = rd.value ? calcArea(rd.value) : null;
          // fallback: 방 사이즈 데이터
          const roomSizeArea = roomSizes[name]?.area || null;
          return { name, value: rd.value || '', note: rd.note || '', area, roomSizeArea };
        });

      const isActive = ck?.checked || checkedRooms.length > 0;

      return {
        ...item,
        active: isActive,
        options: ck?.options || [],
        value: ck?.value || '',
        rooms: checkedRooms,
      };
    }).filter(m => m.active);
  }, [checklist, roomChecklist, roomSizes]);

  // 카테고리별 그룹
  const grouped = useMemo(() => {
    return measurements.reduce((acc, m) => {
      if (!acc[m.category]) acc[m.category] = [];
      acc[m.category].push(m);
      return acc;
    }, {} as Record<string, typeof measurements>);
  }, [measurements]);

  // 방 사이즈 총면적
  const totalRoomArea = useMemo(() => {
    return Object.values(roomSizes).reduce((sum, rs) => sum + rs.area.pyeong, 0);
  }, [roomSizes]);

  // 항목별 복사
  const copyItem = (item: typeof measurements[0]) => {
    let text = `▸ ${item.label}`;
    if (item.options.length) text += ` (${item.options.join(', ')})`;
    text += '\n';
    item.rooms.forEach(r => {
      let detail = `  • ${r.name}`;
      if (r.area && r.area.mm2 > 0) {
        const segs = r.value.split('|').filter(Boolean).map((s: string) => { const [w,h] = s.split('×'); return `${w}×${h}`; }).join(' + ');
        detail += `: ${segs}mm = ${r.area.m2.toFixed(1)}㎡ (${r.area.pyeong.toFixed(1)}평)`;
        if (item.showJwa) detail += ` [${r.area.jwa.toFixed(1)}좌]`;
      } else if ((item as any).isDoor && r.value) {
        detail += `: ${formatDoor(r.value)}`;
      } else if (r.value) {
        detail += `: ${r.value}`;
      }
      if (r.note) detail += ` (${r.note})`;
      text += detail + '\n';
    });
    const totalArea = item.rooms.reduce((sum, r) => sum + (r.area?.mm2 || 0), 0);
    if (totalArea > 0) {
      const tp = totalArea / 3305800;
      text += `  합계: ${(totalArea / 1000000).toFixed(1)}㎡ / ${tp.toFixed(1)}평`;
      if (item.showJwa) {
        const tj = item.rooms.reduce((sum, r) => sum + (r.area?.jwa || 0), 0);
        text += ` / ${tj.toFixed(1)}좌`;
      }
      text += '\n';
    }
    navigator.clipboard.writeText(text).then(() => {
      // 간단한 피드백
      const el = document.getElementById(`copy-${item.sectionId}-${item.name}`);
      if (el) { el.textContent = '✓'; setTimeout(() => el.textContent = '', 1000); }
    });
  };

  // 방 사이즈 복사
  const copyRoomSizes = () => {
    let text = `📏 방 사이즈 (총 ${totalRoomArea.toFixed(1)}평)\n`;
    Object.entries(roomSizes).forEach(([name, rs]) => {
      const segs = rs.value.split('|').filter(Boolean).map((s: string) => { const [w,h] = s.split('×'); return `${w}×${h}mm`; }).join(' + ');
      text += `  • ${name}: ${segs} = ${rs.area.m2.toFixed(1)}㎡ (${rs.area.pyeong.toFixed(1)}평)\n`;
    });
    navigator.clipboard.writeText(text).then(() => {
      const el = document.getElementById('copy-roomsize');
      if (el) { el.textContent = '✓'; setTimeout(() => el.textContent = '', 1000); }
    });
  };

  const copyToClipboard = () => {
    let text = `📐 실측 정보 - ${project?.name || ''}\n`;
    text += `현장: ${siteInfo?.apartmentName || ''} ${siteInfo?.floor || ''}층\n`;
    text += `총 면적: ${totalRoomArea.toFixed(1)}평\n\n`;

    // 방 사이즈
    if (Object.keys(roomSizes).length > 0) {
      text += '【방 사이즈】\n';
      Object.entries(roomSizes).forEach(([name, rs]) => {
        const segs = rs.value.split('|').filter(Boolean).map((s: string) => {
          const [w, h] = s.split('×');
          return `${w}×${h}mm`;
        }).join(' + ');
        text += `  • ${name}: ${segs} = ${rs.area.m2.toFixed(1)}㎡ (${rs.area.pyeong.toFixed(1)}평)\n`;
      });
      text += '\n';
    }

    Object.entries(grouped).forEach(([cat, items]) => {
      text += `【${cat}】\n`;
      items.forEach(item => {
        text += `▸ ${item.label}`;
        if (item.options.length) text += ` (${item.options.join(', ')})`;
        text += '\n';
        item.rooms.forEach(r => {
          let detail = `  • ${r.name}`;
          if (r.area && r.area.mm2 > 0) {
            detail += `: ${r.area.m2.toFixed(1)}㎡ (${r.area.pyeong.toFixed(1)}평)`;
            if (item.showJwa) detail += ` [${r.area.jwa.toFixed(1)}좌]`;
          } else if ((item as any).isDoor && r.value) {
            detail += `: ${formatDoor(r.value)}`;
          } else if (r.value) {
            detail += `: ${r.value}`;
          }
          if (r.note) detail += ` (${r.note})`;
          text += detail + '\n';
        });
      });
      text += '\n';
    });

    navigator.clipboard.writeText(text).then(() => alert('클립보드에 복사되었습니다'));
  };

  return (
    <div className="h-screen flex bg-[var(--background)]">
      <SidebarWrapper isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)}>
        <div className="w-64 flex flex-col h-full print:hidden shrink-0">
          <div className="p-4 border-b">
            <button onClick={() => router.push('/dashboard')} className="flex items-center gap-2 text-sm text-[var(--foreground-muted)] hover:text-[var(--brand-primary)] mb-2">
              <ChevronLeft className="w-4 h-4" /> 프로젝트 목록
            </button>
            <h1 className="font-bold text-[var(--brand-primary)] truncate">{project?.name}</h1>
            <p className="text-sm text-[var(--foreground-muted)]">실측 정보</p>
            {totalRoomArea > 0 && <p className="text-xs text-[var(--brand-primary)] font-medium mt-1">총 {totalRoomArea.toFixed(1)}평</p>}
          </div>
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {Object.entries(grouped).map(([cat, items]) => (
              <div key={cat}>
                <p className="text-xs font-bold text-[var(--foreground-muted)] uppercase tracking-wider px-2 mt-3 mb-1">{cat}</p>
                {items.map(item => (
                  <div key={item.sectionId + item.name} className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-lg hover:bg-[var(--muted)]">
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                    <span className="ml-auto text-xs text-[var(--foreground-muted)]">{item.rooms.length}실</span>
                  </div>
                ))}
              </div>
            ))}
          </nav>
          <div className="p-3 border-t space-y-1">
            <button onClick={copyToClipboard} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-[var(--muted)] text-sm">
              <Clipboard className="w-4 h-4" /> 전체 텍스트 복사
            </button>
            <button onClick={() => setPrintMode(true)} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-[var(--muted)] text-sm">
              <Printer className="w-4 h-4" /> 인쇄
            </button>
          </div>
          <PageNav projectId={projectId as string} current="measurement" />
        </div>
      </SidebarWrapper>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b bg-[var(--card)] flex items-center justify-between px-4 print:hidden sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden p-2 -ml-2 rounded-lg hover:bg-[var(--muted)]" aria-label="메뉴"><Menu className="w-5 h-5 text-[var(--foreground-secondary)]" /></button>
            <span className="text-sm font-medium text-[var(--foreground-secondary)]">📐 실측 정보 — {project?.name}</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => router.push('/dashboard')} className="p-2 rounded-lg hover:bg-[var(--muted)]" aria-label="홈"><Home className="w-4 h-4 text-[var(--foreground-muted)]" /></button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">

        {!printMode && (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2"><Ruler className="w-5 h-5" /> 실측 정보 요약</h2>
              <p className="text-sm text-slate-400 mt-1">{project?.name} — 업체 전달용 실측 데이터</p>
            </div>

            {/* 방 사이즈 총괄 */}
            {Object.keys(roomSizes).length > 0 && (
              <Card className="mb-6">
                <CardContent className="p-0">
                  <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-blue-50 dark:bg-blue-900/20 rounded-t-xl">
                    <h3 className="font-bold text-sm text-blue-700 dark:text-blue-400">📏 방 사이즈 (총 {totalRoomArea.toFixed(1)}평 / {(totalRoomArea * 3.3058).toFixed(1)}㎡)</h3>
                    <button onClick={copyRoomSizes} className="ml-auto flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-700 font-medium">
                      <Copy className="w-3 h-3" /><span id="copy-roomsize">복사</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-4">
                    {Object.entries(roomSizes).map(([name, rs]) => (
                      <div key={name} className="px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <div className="font-medium text-sm">{name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {rs.value.split('|').filter(Boolean).map((seg, i) => {
                            const [w, h] = seg.split('×');
                            return <span key={i}>{i > 0 ? ' + ' : ''}{w}×{h}</span>;
                          })}
                          <span className="text-[10px] text-slate-400 ml-1">mm</span>
                        </div>
                        <div className="text-xs font-medium text-blue-600 dark:text-blue-400 mt-0.5">
                          {rs.area.m2.toFixed(1)}㎡ / {rs.area.pyeong.toFixed(1)}평
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {measurements.length === 0 && Object.keys(roomSizes).length === 0 ? (
              <Card className="py-16">
                <CardContent className="text-center">
                  <Ruler className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <p className="text-lg font-medium mb-1">실측 데이터가 없습니다</p>
                  <p className="text-sm text-slate-400">체크리스트에서 방별 체크 및 수치를 입력해주세요</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {Object.entries(grouped).map(([cat, items]) => (
                  <Card key={cat}>
                    <CardContent className="p-0">
                      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-t-xl">
                        <h3 className="font-bold text-sm">【{cat}】</h3>
                      </div>
                      <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {items.map(item => {
                          const totalArea = item.rooms.reduce((sum, r) => sum + (r.area?.mm2 || 0), 0);
                          const totalPyeong = totalArea / 3305800;
                          const totalJwa = item.rooms.reduce((sum, r) => sum + (r.area?.jwa || 0), 0);
                          return (
                            <div key={item.sectionId + item.name} className="p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg">{item.icon}</span>
                                <span className="font-medium">{item.label}</span>
                                {item.options.length > 0 && (
                                  <div className="flex gap-1 flex-wrap">
                                    {item.options.map((opt: string) => (
                                      <span key={opt} className="px-2 py-0.5 text-[10px] bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-full">{opt}</span>
                                    ))}
                                  </div>
                                )}
                                <div className="ml-auto flex items-center gap-2">
                                  {totalPyeong > 0 && (
                                    <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                      합계 {totalPyeong.toFixed(1)}평{item.showJwa ? ` / ${totalJwa.toFixed(1)}좌` : ''}
                                    </span>
                                  )}
                                  <button onClick={() => copyItem(item)} className="flex items-center gap-0.5 text-[10px] text-slate-400 hover:text-slate-600 font-medium">
                                    <Copy className="w-3 h-3" /><span id={`copy-${item.sectionId}-${item.name}`}></span>
                                  </button>
                                </div>
                              </div>
                              {item.rooms.length > 0 && (
                                <div className="ml-7 grid grid-cols-2 sm:grid-cols-3 gap-2">
                                  {item.rooms.map(r => (
                                    <div key={r.name} className="px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm">
                                      <div className="font-medium">{r.name}</div>
                                      {r.area && r.area.mm2 > 0 ? (
                                        <div className="text-xs mt-0.5">
                                          <span className="text-slate-500">{r.value.split('|').map((s: string) => { const [w,h] = s.split('×'); return `${w}×${h}`; }).join(' + ')}mm</span>
                                          <div className="text-blue-600 dark:text-blue-400 font-medium">
                                            {r.area.m2.toFixed(1)}㎡ / {r.area.pyeong.toFixed(1)}평
                                            {item.showJwa ? ` / ${r.area.jwa.toFixed(1)}좌` : ''}
                                          </div>
                                        </div>
                                      ) : (item as any).isDoor && r.value ? (
                                        <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed whitespace-pre-line">{formatDoor(r.value)}</div>
                                      ) : r.value ? (
                                        <div className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">{r.value}</div>
                                      ) : r.roomSizeArea ? (
                                        <div className="text-xs text-slate-400 mt-0.5">방 크기: {r.roomSizeArea.pyeong.toFixed(1)}평</div>
                                      ) : null}
                                      {r.note && <div className="text-[10px] text-slate-400 mt-0.5">({r.note})</div>}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {printMode && (
          <div className="space-y-0 print-area max-w-[800px] mx-auto">
            <div className="flex items-center justify-between bg-emerald-700 text-white rounded-xl px-6 py-4 mb-6 print:hidden">
              <button onClick={() => setPrintMode(false)} className="flex items-center gap-2 text-sm hover:text-slate-300 transition">
                <ChevronLeft className="w-4 h-4" /> 돌아가기
              </button>
              <span className="text-sm font-medium">실측 정보 인쇄</span>
              <button onClick={() => window.print()} className="flex items-center gap-2 bg-white text-slate-800 px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-100 transition">
                <Printer className="w-4 h-4" /> 인쇄하기
              </button>
            </div>

            <div className="border border-slate-400 p-5 text-[11px]">
              <div className="text-center mb-4">
                <h1 className="text-lg font-black tracking-[0.3em]">실 측 정 보</h1>
                <div className="w-12 h-0.5 mx-auto mt-1 bg-slate-800" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties}></div>
              </div>
              <div className="flex justify-between mb-4">
                <table className="border-collapse">
                  <tbody>
                    <tr><td className="font-bold pr-2 py-0.5">현장명</td><td className="border-b border-slate-300 min-w-[120px]">{project?.name}</td></tr>
                    <tr><td className="font-bold pr-2 py-0.5">주소</td><td className="border-b border-slate-300">{siteInfo?.apartmentName || '-'}</td></tr>
                    <tr><td className="font-bold pr-2 py-0.5">작성일</td><td className="border-b border-slate-300">{new Date().toLocaleDateString('ko-KR')}</td></tr>
                    {totalRoomArea > 0 && <tr><td className="font-bold pr-2 py-0.5">총 면적</td><td className="border-b border-slate-300">{(totalRoomArea * 3.3058).toFixed(1)}㎡ / {totalRoomArea.toFixed(1)}평</td></tr>}
                  </tbody>
                </table>
                <div className="flex items-start gap-1.5">
                  <img src="/logo.png" alt="" className="w-6 h-6 object-contain" onError={e => (e.target as HTMLImageElement).style.display = 'none'} />
                  <div>
                    <p className="font-black text-xs">솜씨인테리어</p>
                    <p className="text-[8px] text-slate-400">SOMSSI INTERIOR</p>
                  </div>
                </div>
              </div>

              {/* 방 사이즈 */}
              {Object.keys(roomSizes).length > 0 && (
                <div className="mb-4">
                  <h3 className="font-bold border-b border-slate-400 pb-0.5 mb-2">📏 방 사이즈</h3>
                  <table className="w-full border-collapse border border-slate-300">
                    <thead>
                      <tr style={{ backgroundColor: '#f1f5f9', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties}>
                        <th className="px-2 py-1 text-left border-r border-slate-300 w-24">방</th>
                        <th className="px-2 py-1 text-left border-r border-slate-300">사이즈 (mm)</th>
                        <th className="px-2 py-1 text-right border-r border-slate-300 w-16">㎡</th>
                        <th className="px-2 py-1 text-right w-16">평</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(roomSizes).map(([name, rs]) => (
                        <tr key={name} className="border-b border-slate-200">
                          <td className="px-2 py-0.5 border-r border-slate-200 font-medium">{name}</td>
                          <td className="px-2 py-0.5 border-r border-slate-200">{rs.value.split('|').filter(Boolean).map((s: string) => { const [w,h] = s.split('×'); return `${w}×${h}`; }).join(' + ')}</td>
                          <td className="px-2 py-0.5 border-r border-slate-200 text-right">{rs.area.m2.toFixed(1)}</td>
                          <td className="px-2 py-0.5 text-right">{rs.area.pyeong.toFixed(1)}</td>
                        </tr>
                      ))}
                      <tr className="font-bold border-t border-slate-400">
                        <td className="px-2 py-0.5 border-r border-slate-200">합계</td>
                        <td className="px-2 py-0.5 border-r border-slate-200"></td>
                        <td className="px-2 py-0.5 border-r border-slate-200 text-right">{(totalRoomArea * 3.3058).toFixed(1)}</td>
                        <td className="px-2 py-0.5 text-right">{totalRoomArea.toFixed(1)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {Object.entries(grouped).map(([cat, items]) => (
                <div key={cat} className="mb-4">
                  <h3 className="font-bold border-b border-slate-400 pb-0.5 mb-2">【{cat}】</h3>
                  {items.map(item => (
                    <div key={item.sectionId + item.name} className="mb-2">
                      <div className="flex items-center gap-1 font-medium">
                        <span>{item.icon}</span> {item.label}
                        {item.options.length > 0 && <span className="text-slate-400 font-normal"> ({item.options.join(', ')})</span>}
                      </div>
                      {item.rooms.length > 0 && (
                        <table className="w-full border-collapse border border-slate-300 mt-1 mb-1">
                          <thead>
                            <tr style={{ backgroundColor: '#f1f5f9', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties}>
                              <th className="px-2 py-1 text-left border-r border-slate-300 w-24">방</th>
                              <th className="px-2 py-1 text-left border-r border-slate-300">사이즈</th>
                              <th className="px-2 py-1 text-right border-r border-slate-300 w-14">㎡</th>
                              <th className="px-2 py-1 text-right border-r border-slate-300 w-12">평</th>
                              {item.showJwa && <th className="px-2 py-1 text-right border-r border-slate-300 w-12">좌</th>}
                              <th className="px-2 py-1 text-left w-20">비고</th>
                            </tr>
                          </thead>
                          <tbody>
                            {item.rooms.map(r => (
                              <tr key={r.name} className="border-b border-slate-200">
                                <td className="px-2 py-0.5 border-r border-slate-200 font-medium">{r.name}</td>
                                <td className="px-2 py-0.5 border-r border-slate-200">{r.area && r.area.mm2 > 0 ? r.value.split('|').map((s: string) => { const [w,h]=s.split('×'); return `${w}×${h}`; }).join('+') : (item as any).isDoor && r.value ? formatDoor(r.value) : r.value || '-'}</td>
                                <td className="px-2 py-0.5 border-r border-slate-200 text-right">{r.area && r.area.mm2 > 0 ? r.area.m2.toFixed(1) : '-'}</td>
                                <td className="px-2 py-0.5 border-r border-slate-200 text-right">{r.area && r.area.mm2 > 0 ? r.area.pyeong.toFixed(1) : '-'}</td>
                                {item.showJwa && <td className="px-2 py-0.5 border-r border-slate-200 text-right">{r.area ? r.area.jwa.toFixed(1) : '-'}</td>}
                                <td className="px-2 py-0.5 text-slate-400">{r.note || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-center gap-4 mt-8 print:hidden">
              <button onClick={() => setPrintMode(false)} className="px-6 py-3 rounded-lg border border-slate-300 text-sm font-medium hover:bg-slate-50 transition">← 돌아가기</button>
              <button onClick={() => window.print()} className="px-6 py-3 rounded-lg bg-emerald-700 text-white text-sm font-bold hover:bg-emerald-800 transition flex items-center gap-2">
                <Printer className="w-4 h-4" /> 인쇄하기
              </button>
            </div>
          </div>
        )}
        </div>
      </main>
    </div>
  );
}
