'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { apiGet } from '@/lib/api';
import { toLocalDateStr } from '@/lib/utils';
import { ArrowLeft, Printer, Trash2 } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  clientName: string | null;
  address: string | null;
  startDate: string | null;
  endDate: string | null;
}

interface Schedule {
  id: string;
  date: string;
  task: string;
  note: string | null;
  projectId: string;
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

const BRAND = '#CD363A';
const BRAND_GRADIENT = 'linear-gradient(135deg, #CD363A, #e04848, #CD363A)';

// 소음 등급: 강/중/약/없음
const NOISE_MAP: Record<string, 'heavy' | 'medium' | 'light'> = {
  '가구 철거': 'heavy',
  '마루 철거': 'heavy',
  '마루 시공': 'heavy',
  '화장실 철거': 'heavy',
  '샷시': 'heavy',
  '샷시 시공': 'heavy',
  '샤시': 'heavy',
  '샤시 시공': 'heavy',
  '철거': 'heavy',
  '가구 시공': 'medium',
  '목공': 'medium',
  '셋팅': 'medium',
  '타일': 'medium',
  '전기': 'light',
  '조명': 'light',
  '줄눈': 'light',
  '청소': 'light',
  '탄성': 'light',
  '페인트': 'light',
  '필름': 'light',
  '도배': 'light',
  '설비': 'light',
  // 간판, 어닝: 외부 시공 → 소음 없음 (맵에 안 넣음)
  // 욕실: 제외
};

function getDateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const s = new Date(start);
  const e = new Date(end);
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    dates.push(toLocalDateStr(new Date(d)));
  }
  return dates;
}

type NoiseLevel = 'heavy' | 'medium' | 'light' | 'none';

export default function NoticePage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  // 모바일에서 A4 미리보기를 화면 폭에 맞춰 축소 (인쇄 시엔 1)
  const noticeWrapRef = useRef<HTMLDivElement>(null);
  const [noticeScale, setNoticeScale] = useState(1);
  useEffect(() => {
    const calc = () => {
      const el = noticeWrapRef.current;
      if (!el) return;
      const cs = getComputedStyle(el);
      const inner = el.clientWidth - parseFloat(cs.paddingLeft || '0') - parseFloat(cs.paddingRight || '0');
      setNoticeScale(Math.min(1, inner / 793.7)); // 210mm ≈ 793.7px (패딩 제외 실폭)
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);
  const [loading, setLoading] = useState(true);

  // 편집 필드
  const [locationType, setLocationType] = useState<'apartment' | 'store'>('apartment');
  const [address, setAddress] = useState('');
  const [dong, setDong] = useState('');
  const [ho, setHo] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [workItems, setWorkItems] = useState<string[]>([]);
  const [newWorkItem, setNewWorkItem] = useState('');
  const [isEditing, setIsEditing] = useState(true);
  const [workItemNoiseLevels, setWorkItemNoiseLevels] = useState<Record<string, NoiseLevel>>({});

  // 소음 맵: 날짜 → 소음 레벨 (useMemo로 관리)
  const noiseMap = useMemo(() => {
    const noisePriority: Record<string, number> = { heavy: 3, medium: 2, light: 1, none: 0 };
    const nm = new Map<string, NoiseLevel>();
    schedules.forEach((s: Schedule) => {
      const dateKey = toLocalDateStr(new Date(s.date));
      // 사용자 설정 우선, 없으면 NOISE_MAP 기본값
      const level = workItemNoiseLevels[s.task] || NOISE_MAP[s.task] || null;
      if (level) {
        const current = nm.get(dateKey) || 'none';
        if (noisePriority[level] > noisePriority[current]) {
          nm.set(dateKey, level);
        }
      }
    });
    return nm;
  }, [schedules, workItemNoiseLevels]);

  useEffect(() => {
    Promise.all([
      apiGet(`/api/projects/${projectId}`),
      apiGet(`/api/schedules?projectId=${projectId}`),
    ]).then(([projectData, scheduleData]) => {
      const proj = projectData;
      setProject(proj);
      const sched: Schedule[] = scheduleData.schedules || [];
      setSchedules(sched);

      // 주소 파싱
      const addr = proj.address || '';
      setAddress(addr);
      // 동/호 추출 시도 (예: "522동 1504호")
      const dongMatch = addr.match(/(\d+)동/);
      const hoMatch = addr.match(/(\d+)호/);
      if (dongMatch) setDong(dongMatch[1]);
      if (hoMatch) setHo(hoMatch[1]);

      // 날짜 범위
      if (sched.length > 0) {
        const times = sched.map((s: Schedule) => new Date(s.date).getTime());
        setStartDate(toLocalDateStr(new Date(Math.min(...times))));
        setEndDate(toLocalDateStr(new Date(Math.max(...times))));
      }

      // 공종 목록
      const tasks = new Set<string>();
      sched.forEach((s: Schedule) => {
        const base = s.task.replace(/\s*(철거|시공)$/, '');
        tasks.add(base);
      });
      const ordered: string[] = [];
      const taskArray = Array.from(tasks);
      taskArray.forEach(t => { if (t.includes('철거') || ['철거', '샷시'].includes(t)) ordered.push(t); });
      taskArray.forEach(t => { if (!ordered.includes(t)) ordered.push(t); });
      setWorkItems(ordered.length > 0 ? ordered : ['철거', '목공', '필름', '타일', '마루', '도배']);

      setLoading(false);
    }).catch(err => { console.error(err); setLoading(false); });
  }, [projectId]);

  const addWorkItem = () => {
    if (!newWorkItem.trim()) return;
    setWorkItems([...workItems, newWorkItem.trim()]);
    setNewWorkItem('');
  };
  const removeWorkItem = (idx: number) => setWorkItems(workItems.filter((_, i) => i !== idx));

  const handlePrint = () => {
    setIsEditing(false);
    setTimeout(() => { window.print(); setTimeout(() => setIsEditing(true), 500); }, 100);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="text-slate-400">로딩 중...</div></div>;
  if (!project) return <div className="min-h-screen flex items-center justify-center"><div className="text-slate-400">프로젝트를 찾을 수 없습니다</div></div>;

  // 날짜 포맷
  const startD = startDate ? new Date(startDate) : null;
  const endD = endDate ? new Date(endDate) : null;
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const yearStr = startD ? `${startD.getFullYear()}년` : '';
  const startFmt = startD ? `${startD.getMonth() + 1}월 ${startD.getDate()}일(${days[startD.getDay()]})` : '';
  const endFmt = endD ? `${endD.getMonth() + 1}월 ${endD.getDate()}일(${days[endD.getDay()]})` : '';
  const startShort = startD ? `${startD.getMonth() + 1}월 ${startD.getDate()}일` : '';
  const endShort = endD ? `${endD.getMonth() + 1}월 ${endD.getDate()}일` : '';

  // 장소 표시
  const locationDisplay = locationType === 'apartment'
    ? `${dong ? dong + '동 ' : ''}${ho ? ho + '호' : ''}`
    : address;
  const dongDisplay = dong ? dong + '동' : '000동';

  // 소음 타임라인 데이터
  const timelineDates = (startDate && endDate) ? getDateRange(startDate, endDate) : [];

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      {/* 웹폰트: Pretendard */}
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" />

      {/* 툴바 */}
      <div className="print:hidden bg-white dark:bg-slate-800 border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard?tab=notice')}>
              <ArrowLeft className="w-4 h-4 mr-1" /> 돌아가기
            </Button>
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{project.name} — 공사 안내문</span>
          </div>
          <Button onClick={handlePrint}><Printer className="w-4 h-4 mr-1" /> 인쇄</Button>
        </div>
      </div>

      {/* 편집 패널 */}
      {isEditing && (
        <div className="print:hidden max-w-4xl mx-auto px-4 pt-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold text-sm text-slate-500">안내문 내용 편집</h3>

              {/* 장소 유형 */}
              <div>
                <label className="text-xs text-slate-500">장소 유형</label>
                <div className="flex gap-2 mt-1">
                  <button onClick={() => setLocationType('apartment')}
                    className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition ${locationType === 'apartment' ? 'border-slate-800 bg-slate-50' : 'border-slate-200'}`}>
                    🏢 아파트
                  </button>
                  <button onClick={() => setLocationType('store')}
                    className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition ${locationType === 'store' ? 'border-slate-800 bg-slate-50' : 'border-slate-200'}`}>
                    🏪 상가
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {locationType === 'apartment' ? (
                  <>
                    <div>
                      <label className="text-xs text-slate-500">주소</label>
                      <Input value={address} onChange={e => setAddress(e.target.value)} className="mt-1 h-10" placeholder="화성시 반월동 꽃메마을" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-slate-500">동 *</label>
                        <Input value={dong} onChange={e => setDong(e.target.value)} className="mt-1 h-10" placeholder="522" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500">호 *</label>
                        <Input value={ho} onChange={e => setHo(e.target.value)} className="mt-1 h-10" placeholder="1504" />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="sm:col-span-2">
                    <label className="text-xs text-slate-500">주소/상호명</label>
                    <Input value={address} onChange={e => setAddress(e.target.value)} className="mt-1 h-10" placeholder="오산시 세마역 국 매장" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500">공사 시작일</label>
                  <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 h-10 w-full min-w-0 block appearance-none text-sm" style={{ WebkitAppearance: 'none' }} />
                </div>
                <div>
                  <label className="text-xs text-slate-500">공사 종료일</label>
                  <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 h-10 w-full min-w-0 block appearance-none text-sm" style={{ WebkitAppearance: 'none' }} />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-500">공종 목록 (소음 등급 클릭하여 변경)</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {workItems.map((item, idx) => {
                    const level = workItemNoiseLevels[item] || NOISE_MAP[item] || 'medium';
                    const levelColor = level === 'heavy' ? 'bg-red-500' : level === 'medium' ? 'bg-amber-500' : level === 'light' ? 'bg-slate-400' : 'bg-slate-200';
                    const levelText = level === 'heavy' ? '강' : level === 'medium' ? '중' : level === 'light' ? '약' : '없음';
                    return (
                      <div key={idx} className="flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-full">
                        <button
                          onClick={() => {
                            const levels: NoiseLevel[] = ['heavy', 'medium', 'light', 'none'];
                            const currentIndex = levels.indexOf(workItemNoiseLevels[item] || NOISE_MAP[item] || 'medium');
                            const nextIndex = (currentIndex + 1) % levels.length;
                            setWorkItemNoiseLevels(prev => ({ ...prev, [item]: levels[nextIndex] }));
                          }}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold text-white ${levelColor}`}
                        >
                          {levelText}
                        </button>
                        <span className="text-sm">{item}</span>
                        <button onClick={() => removeWorkItem(idx)} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-2 mt-2">
                  <Input value={newWorkItem} onChange={e => setNewWorkItem(e.target.value)} onKeyDown={e => e.key === 'Enter' && addWorkItem()} placeholder="공종 추가" className="h-9 text-sm" />
                  <Button size="sm" onClick={addWorkItem} className="h-9">추가</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 안내문 본문 */}
      <div ref={noticeWrapRef} className="max-w-4xl mx-auto px-4 py-6 print:p-0 print:max-w-none" id="notice-content">
        <div className="notice-sheet bg-white shadow-lg print:shadow-none mx-auto relative overflow-hidden" style={{ width: '210mm', minHeight: '297mm', padding: '0', fontFamily: "'Pretendard', -apple-system, sans-serif", zoom: noticeScale }}>

          {/* 상단 바 */}
          <div style={{ height: '6px', background: BRAND_GRADIENT }} />

          <div style={{ padding: '26mm 24mm 20mm 24mm' }}>

            {/* 헤더 */}
            <div className="flex items-end justify-between mb-5">
              <div className="flex items-end gap-4">
                <img src="/logo.png" alt="솜씨인테리어" className="object-contain" style={{ width: '120px', height: '120px' }} />
                <div>
                  <div className="text-[14px] font-medium tracking-widest" style={{ color: '#b0b0b0', letterSpacing: '3px' }}>CONSTRUCTION NOTICE</div>
                  <h1 className="text-[45px] font-black leading-tight" style={{ color: '#1e293b' }}>공사 안내문</h1>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-black tracking-wider" style={{ color: BRAND, letterSpacing: '2px' }}>SOMSSI</div>
                <div className="text-[10px] text-slate-400 font-medium mt-0.5 tracking-widest">INTERIOR</div>
              </div>
            </div>

            {/* 구분선 */}
            <div className="mb-7" style={{ height: '2px', background: `linear-gradient(90deg, ${BRAND}, transparent)` }} />

            {/* 공사 정보 카드 */}
            <div className="rounded-xl mb-7 overflow-hidden" style={{ border: '1.5px solid #f0f0f0' }}>
              <div className="grid grid-cols-3">
                <div className="p-4 border-r" style={{ borderColor: '#f0f0f0' }}>
                  <div className="text-[14px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#b04045" }}>공사 기간</div>
                  <div className="text-[13px] font-medium text-slate-700 leading-relaxed">
                    {yearStr} {startFmt}<br/>~ {endFmt}
                  </div>
                </div>
                <div className="p-4 border-r" style={{ borderColor: '#f0f0f0' }}>
                  <div className="text-[14px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#b04045" }}>
                    {locationType === 'apartment' ? '공사 장소' : '공사 장소'}
                  </div>
                  <div className="text-[13px] font-medium text-slate-700">
                    {locationType === 'apartment' ? (
                      <>{address && <div className="text-slate-500 text-[11px]">{address}</div>}<div className="font-bold">{dong}동 {ho}호</div></>
                    ) : (
                      <div>{address}</div>
                    )}
                  </div>
                </div>
                <div className="p-4">
                  <div className="text-[14px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#b04045" }}>공사 내용</div>
                  <div className="text-[13px] font-medium text-slate-700">{workItems.join(', ')}</div>
                </div>
              </div>
            </div>

            {/* 안내 본문 */}
            <div className="space-y-3 text-[16.5px] leading-[1.95] text-slate-600 mb-4" style={{ fontWeight: 500 }}>
              <p>
                안녕하세요, <strong style={{ color: '#1e293b', fontWeight: 800 }}>솜씨 인테리어</strong>입니다.
              </p>
              <p>
                <strong className="text-slate-800">{startShort}</strong>부터 <strong className="text-slate-800">{endShort}</strong>까지 <strong className="text-slate-800">{locationDisplay}</strong> 인테리어 공사를 진행하게 되었습니다.
              </p>
              <p>
                어르신들, 공부하는 학생들, 어린 아이들과 함께 거주하고 있는 공간임을 알기에 안전하고 정확한 시공을 해야 함으로 이렇게라도 양해의 말씀을 드려 봅니다.
              </p>
              <p>
                공사하는 기간 동안 불편하심 없도록 최대한 노력하겠습니다.
              </p>
              <p>
                <strong className="text-slate-800">{dongDisplay} 입주민 여러분</strong>의 공사동의에 감사드리며 넓으신 양해와 협조 부탁드립니다. 감사합니다.
              </p>
            </div>

          </div>

          {/* 소음 타임라인 — 푸터 바로 위 고정 */}
          {timelineDates.length > 0 && (() => {
            // 3단계 소음 날짜 텍스트 생성
            const groupByMonth = (dates: { month: number; day: number }[]): string => {
              const byMonth = new Map<number, number[]>();
              dates.forEach(({ month, day }) => {
                if (!byMonth.has(month)) byMonth.set(month, []);
                byMonth.get(month)!.push(day);
              });
              const parts: string[] = [];
              byMonth.forEach((daysArr, month) => {
                const dayStr = daysArr.map(d => `${d}일`).join(', ');
                parts.push(`${month}월 ${dayStr}`);
              });
              return parts.join(' / ');
            };

            const heavyRaw: { month: number; day: number }[] = [];
            const mediumRaw: { month: number; day: number }[] = [];
            const lightRaw: { month: number; day: number }[] = [];
            timelineDates.forEach(dateStr => {
              const noise = noiseMap.get(dateStr);
              const d = new Date(dateStr);
              const entry = { month: d.getMonth() + 1, day: d.getDate() };
              if (noise === 'heavy') heavyRaw.push(entry);
              else if (noise === 'medium') mediumRaw.push(entry);
              else if (noise === 'light') lightRaw.push(entry);
            });
            const heavyText = groupByMonth(heavyRaw);
            const mediumText = groupByMonth(mediumRaw);
            const lightText = groupByMonth(lightRaw);

            const HEAVY_COLOR = BRAND;
            const MEDIUM_COLOR = '#f59e0b';
            const LIGHT_COLOR = '#94a3b8';

            return (
              <div className="absolute left-0 right-0" style={{ bottom: '130px', padding: '0 24mm' }}>
                {/* 날짜 텍스트 */}
                <div className="space-y-1.5 mb-3">
                  {heavyText && (
                    <div className="flex items-start gap-2">
                      <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold text-white" style={{ backgroundColor: HEAVY_COLOR }}>강</span>
                      <span className="text-[12px] text-slate-600 font-medium">{heavyText}</span>
                    </div>
                  )}
                  {mediumText && (
                    <div className="flex items-start gap-2">
                      <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold text-white" style={{ backgroundColor: MEDIUM_COLOR }}>중</span>
                      <span className="text-[12px] text-slate-600 font-medium">{mediumText}</span>
                    </div>
                  )}
                  {lightText && (
                    <div className="flex items-start gap-2">
                      <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold text-white" style={{ backgroundColor: LIGHT_COLOR }}>약</span>
                      <span className="text-[12px] text-slate-600 font-medium">{lightText}</span>
                    </div>
                  )}
                </div>

                {/* 바코드 그래프 */}
                <div className="rounded-lg overflow-hidden p-3" style={{ backgroundColor: '#fafafa', border: '1px solid #f0f0f0' }}>
                  {/* 범례 */}
                  <div className="flex items-center gap-3 mb-2 text-[10px]">
                    <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: HEAVY_COLOR }} /><span className="text-slate-500">강</span></span>
                    <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: MEDIUM_COLOR }} /><span className="text-slate-500">중</span></span>
                    <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: LIGHT_COLOR }} /><span className="text-slate-500">약</span></span>
                    <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#e2e8f0' }} /><span className="text-slate-500">없음</span></span>
                  </div>
                  <div className="flex gap-[2px] items-end" style={{ height: '32px' }}>
                    {timelineDates.map(dateStr => {
                      const d = new Date(dateStr);
                      const dayOfWeek = d.getDay();
                      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                      const noise = noiseMap.get(dateStr) || 'none';
                      const bg = noise === 'heavy' ? HEAVY_COLOR : noise === 'medium' ? MEDIUM_COLOR : noise === 'light' ? LIGHT_COLOR : '#e2e8f0';
                      const h = noise === 'heavy' ? '100%' : noise === 'medium' ? '70%' : noise === 'light' ? '45%' : '20%';

                      return (
                        <div key={dateStr} className="flex flex-col items-center justify-end" style={{ flex: '1 1 0', minWidth: 0, height: '100%' }}>
                          <div className="w-full rounded-sm" style={{ height: h, backgroundColor: bg, opacity: isWeekend && noise === 'none' ? 0.3 : 1 }} />
                        </div>
                      );
                    })}
                  </div>
                  {/* 날짜 라벨 */}
                  <div className="flex gap-[2px] mt-1">
                    {timelineDates.map((dateStr, idx) => {
                      const d = new Date(dateStr);
                      const dayNum = d.getDate();
                      const showLabel = dayNum === 1 || dayNum % 5 === 0 || idx === 0 || idx === timelineDates.length - 1;
                      return (
                        <div key={dateStr} className="text-center" style={{ flex: '1 1 0', minWidth: 0 }}>
                          {showLabel && <span className="text-[8px] text-slate-600 font-medium">{dayNum === 1 ? `${d.getMonth() + 1}/${dayNum}` : dayNum}</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* 푸터 */}
          <div className="absolute bottom-0 left-0 right-0">
            <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, #e8e8e8, transparent)' }} />
            <div className="flex items-center justify-between" style={{ padding: '14px 24mm', backgroundColor: '#fafafa' }}>
              <div className="flex items-center gap-3">
                <img src="/logo.png" alt="" className="w-8 h-8 object-contain" />
                <div className="text-base font-bold" style={{ color: '#1e293b' }}>솜씨인테리어</div>
              </div>
              <div className="flex items-center gap-4 text-[13px] text-slate-600">
                <span>📞 <strong className="text-slate-800">010-5382-3523</strong></span>
                <span className="font-bold text-slate-800">오영식</span>
              </div>
            </div>
            <div style={{ height: '4px', background: BRAND_GRADIENT }} />
          </div>

        </div>
      </div>

      {/* 인쇄 스타일 */}
      <style jsx global>{`
        @media print {
          @page { size: A4 portrait; margin: 0; }
          body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body * { visibility: hidden; }
          #notice-content, #notice-content * { visibility: visible; }
          #notice-content { position: absolute; left: 0; top: 0; width: 100%; }
          .notice-sheet { zoom: 1 !important; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
