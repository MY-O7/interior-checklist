'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { SidebarWrapper } from '@/components/mobile-menu';
import { ArrowLeft, Download, Save, Printer, ChevronLeft, ChevronRight, Menu, FolderOpen, Calculator, Settings, Ruler, Home } from 'lucide-react';
import { useTheme } from '@/lib/theme';
import { apiGet, apiPost } from '@/lib/api';
import { OptionTag, DimensionInputs, RoomCheckGrid } from '@/components/checklist';
import { PageNav } from '@/components/shared';
import { SECTIONS, DEFAULT_ROOMS, migrateChecklistKeys, migrateRoomChecklistKeys } from '@/config/sections';
import { calcPyeong } from '@/lib/calc';
import type { ChecklistItemData, RoomMeasurement, SectionItem, Section, TagColor } from '@/types/checklist';
import { TAG_COLORS } from '@/types/checklist';

// ═══════════════════ ChecklistRow Component ═══════════════════
function ChecklistRow({ item, sectionId, data, roomData, onUpdate, onRoomUpdate, isSubItem, parentLabel, roomList }: {
  item: SectionItem; sectionId: string; data: ChecklistItemData;
  roomData?: RoomMeasurement;
  onUpdate: (field: keyof ChecklistItemData, value: any) => void;
  onRoomUpdate?: (roomId: string, field: string, value: any) => void;
  isSubItem?: boolean; parentLabel?: string;
  roomList: string[];
}) {
  const toggleOption = (opt: string) => {
    const parts = data.detail ? data.detail.split(', ').filter(Boolean) : [];
    const newDetail = parts.includes(opt) ? parts.filter(d => d !== opt).join(', ') : [...parts, opt].join(', ');
    onUpdate('detail', newDetail);
  };

  return (
    <div className={`p-5 space-y-3 border-b border-slate-100 dark:border-slate-800 ${isSubItem ? 'bg-slate-50/50 dark:bg-slate-900/30' : 'bg-white dark:bg-slate-800'}`}>
      <div className="flex items-start gap-3">
        <Checkbox checked={data.checked} onCheckedChange={(c) => onUpdate('checked', c)} className="w-6 h-6 border-2 mt-0.5" />
        <div className="flex-1 min-w-0">
          {parentLabel && <p className="text-xs text-[#CD363A] font-semibold mb-0.5 tracking-wide">▶ {parentLabel}</p>}
          <p className="font-semibold text-base sm:text-lg text-slate-800 dark:text-slate-200">
            {item.name}
            {item.badge && <span className={`ml-2 px-2 py-0.5 rounded text-xs font-bold ${item.badge === 'high' ? 'bg-rose-100 text-rose-700 border border-rose-300' : item.badge === 'req' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}>{item.badge === 'high' ? 'HIGH-END' : item.badge === 'req' ? '필수' : '선택'}</span>}
            {item.perRoom && <span className="ml-2 px-1.5 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800">방별</span>}
          </p>
        </div>
      </div>
      {item.options && item.options.length > 0 && (
        <div className="flex flex-wrap gap-2 ml-8">
          {item.options.map((opt) => <OptionTag key={opt} label={opt} color={item.optionColors?.[opt] || 'white'} checked={data.detail.includes(opt)} onToggle={() => toggleOption(opt)} />)}
        </div>
      )}
      {item.hasInput && (
        <div className="ml-9">
          <Input className="h-11 text-base bg-slate-50 dark:bg-slate-900 border-dashed" value={item.options ? data.value : data.detail} onChange={(e) => onUpdate(item.options ? 'value' : 'detail', e.target.value)} placeholder={item.placeholder} />
        </div>
      )}
      {item.hasMeasurement && !item.perRoom && (
        (item.measurementLabel === 'W×H' || item.measurementLabel === 'mm×mm') ? (
          <div className="ml-9">
            <DimensionInputs value={data.value} onChange={(v) => onUpdate('value', v)} />
          </div>
        ) : (
          <div className="ml-9 flex items-center gap-2">
            <Input className="h-11 text-base bg-slate-50 dark:bg-slate-900 border-dashed flex-1" value={data.value} onChange={(e) => onUpdate('value', e.target.value)} placeholder={`수치 입력 (${item.measurementLabel || ''})`} />
            {item.measurementLabel && <span className="text-sm text-slate-400">{item.measurementLabel}</span>}
          </div>
        )
      )}
      {item.perRoom && data.checked && onRoomUpdate && (
        <RoomCheckGrid 
          rooms={roomData || {}} 
          hasMeasurement={item.hasMeasurement} 
          measurementLabel={item.measurementLabel} 
          showJwa={item.name.includes('창호') || item.name.includes('폴딩도어')} 
          roomList={roomList} 
          onUpdate={onRoomUpdate}
          selectOptions={item.name === '문 / 문틀' ? (data.detail ? data.detail.split(', ').filter(Boolean) : undefined) : undefined}
          selectPlaceholder="문 종류 선택"
        />
      )}
      <div className="ml-9"><Input className="h-10 text-sm bg-transparent border-slate-200 dark:border-slate-700" value={data.note} onChange={(e) => onUpdate('note', e.target.value)} placeholder="비고 / 특이사항" /></div>
    </div>
  );
}

// ═══════════════════ Main Page ═══════════════════
export default function ProjectPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  const { theme, toggleTheme } = useTheme();
  
  const [project, setProject] = useState<any>(null);
  const [checklist, setChecklist] = useState<Record<string, Record<string, ChecklistItemData>>>({});
  const [roomChecklist, setRoomChecklist] = useState<Record<string, RoomMeasurement>>({});
  const [siteInfo, setSiteInfo] = useState({
    apartmentName: '', squareMeters: '', desiredDate: '', manager: '', floor: '',
    isOccupied: '', hasElevator: '', clientPhone: '',
    workScope: '' as '' | 'full' | 'partial',
  });
  const [specialNotes, setSpecialNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [printMode, setPrintMode] = useState(false);

  // 방 사이즈 섹션에서 체크된 방만 다른 공정에서 표시
  const activeRooms = (() => {
    const sectionData = checklist['roomSize'] || {};
    const checked = DEFAULT_ROOMS.filter(name => sectionData[name]?.checked);
    return checked.length > 0 ? checked : DEFAULT_ROOMS; // 아무것도 안 체크했으면 전체
  })();

  useEffect(() => {
    if (printMode) {
      window.scrollTo(0, 0);
    }
  }, [printMode]);

  useEffect(() => {
    apiPost('/api/auth', { action: 'me' })
      .then(data => { if (!data.user) { router.push('/login'); return; } loadChecklist(); })
      .catch(() => router.push('/login'));
  }, [projectId]);

  const loadChecklist = async () => {
    try {
      const data = await apiGet(`/api/checklists/${projectId}`);
      // 섹션/항목 이름이 바뀌어도 옛 저장 데이터가 사라지지 않게 키 이관
      setChecklist(migrateChecklistKeys(data.checklist || {}));
      setRoomChecklist(migrateRoomChecklistKeys(data.roomChecklist || {}));
      setSiteInfo({
        apartmentName: '', squareMeters: '', desiredDate: '', manager: '', floor: '',
        isOccupied: '', hasElevator: '', clientPhone: '', workScope: '',
        ...(data.siteInfo || {}),
      });
      setSpecialNotes(data.specialNotes || '');
      setProject({ id: projectId, name: data.projectName || projectId });
    } catch (e) {
      console.error('Failed to load checklist:', e);
      setProject({ id: projectId, name: projectId });
    }
  };

  const saveChecklist = async () => {
    setSaving(true);
    try {
      await apiPost(`/api/checklists/${projectId}`, { checklist, roomChecklist, siteInfo, specialNotes });
    } catch (e) { console.error('Failed to save:', e); }
    setTimeout(() => setSaving(false), 500);
  };

  // 자동 저장 (3초 디바운스)
  useEffect(() => {
    if (!project || Object.keys(checklist).length === 0) return;
    const timer = setTimeout(() => {
      apiPost(`/api/checklists/${projectId}`, { checklist, roomChecklist, siteInfo, specialNotes })
        .catch(e => console.error('자동 저장 실패:', e));
    }, 3000);
    return () => clearTimeout(timer);
  }, [checklist, roomChecklist, siteInfo, specialNotes, projectId, project]);

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ project, siteInfo, checklist, roomChecklist, specialNotes }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `${project?.name || 'checklist'}-${new Date().toISOString().slice(0, 10)}.json`; a.click();
  };

  const updateItem = (sectionId: string, itemName: string, field: keyof ChecklistItemData, value: any) => {
    setChecklist(prev => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        [itemName]: {
          ...prev[sectionId]?.[itemName],
          checked: field === 'checked' ? value : prev[sectionId]?.[itemName]?.checked ?? false,
          detail: field === 'detail' ? value : prev[sectionId]?.[itemName]?.detail ?? '',
          value: field === 'value' ? value : prev[sectionId]?.[itemName]?.value ?? '',
          note: field === 'note' ? value : prev[sectionId]?.[itemName]?.note ?? '',
        }
      }
    }));
  };

  const updateRoomData = (itemKey: string, roomId: string, field: string, value: any) => {
    setRoomChecklist(prev => ({
      ...prev,
      [itemKey]: {
        ...prev[itemKey],
        [roomId]: {
          ...prev[itemKey]?.[roomId],
          checked: field === 'checked' ? value : prev[itemKey]?.[roomId]?.checked ?? false,
          value: field === 'value' ? value : prev[itemKey]?.[roomId]?.value ?? '',
          note: field === 'note' ? value : prev[itemKey]?.[roomId]?.note ?? '',
        }
      }
    }));
  };

  if (!project) return null;

  return (
    <div className="h-screen flex bg-[var(--background)] print:block">
      <SidebarWrapper isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)}>
        <div className="w-64 flex flex-col h-full print:hidden shrink-0">
          <div className="p-4 border-b">
            <button onClick={() => router.push('/dashboard')} className="flex items-center gap-2 text-sm text-[var(--foreground-muted)] hover:text-[var(--brand-primary)] mb-2">
              <ArrowLeft className="w-4 h-4" /> 프로젝트 목록
            </button>
            <h1 className="font-bold text-[var(--brand-primary)] truncate">{project.name}</h1>
            <p className="text-sm text-[var(--foreground-muted)]">체크리스트</p>
          </div>
          <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
            <div className="px-3 py-2 text-xs font-semibold text-[var(--brand-primary)] tracking-widest uppercase">현장 정보</div>
            <button onClick={() => { setCurrentSection(-1); setSidebarOpen(false); }} className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-sm transition-all ${currentSection === -1 ? 'bg-[var(--brand-primary)] text-white shadow-md' : 'hover:bg-[var(--muted)] text-[var(--foreground-secondary)]'}`}><span className="text-xs">📋</span><span>기본 정보</span></button>
            <div className="px-3 py-2 text-xs font-semibold text-[var(--brand-primary)] tracking-widest uppercase mt-3">체크리스트</div>
            {SECTIONS.map((section, i) => <button key={section.id} onClick={() => { setCurrentSection(i); setSidebarOpen(false); }} className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-sm transition-all ${currentSection === i ? 'bg-[var(--brand-primary)] text-white shadow-md' : 'hover:bg-[var(--muted)] text-[var(--foreground-secondary)]'}`}><span className="w-5 text-center text-xs font-mono text-[var(--foreground-muted)]">{String(i + 1).padStart(2, '0')}</span><span className="truncate">{section.title}</span></button>)}
          </nav>
          <div className="p-3 border-t space-y-1">
            <button onClick={saveChecklist} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-[var(--muted)] text-sm"><Save className="w-4 h-4" /> 저장 {saving && <span className="text-emerald-500">✓</span>}</button>
            <button onClick={exportData} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-[var(--muted)] text-sm"><Download className="w-4 h-4" /> 내보내기</button>
            <button onClick={() => setPrintMode(true)} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-[var(--muted)] text-sm"><Printer className="w-4 h-4" /> 인쇄</button>
          </div>
          <PageNav projectId={projectId} current="checklist" />
        </div>
      </SidebarWrapper>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b bg-[var(--card)] flex items-center justify-between px-4 print:hidden sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden p-2 -ml-2 rounded-lg hover:bg-[var(--muted)]" aria-label="메뉴"><Menu className="w-5 h-5 text-[var(--foreground-secondary)]" /></button>
            <span className="text-sm font-medium text-[var(--foreground-secondary)]">{currentSection === -1 ? '현장 기본 정보' : `${String(currentSection + 1).padStart(2, '0')} ${SECTIONS[currentSection]?.title}`}</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={saveChecklist} className="p-2 rounded-lg hover:bg-[var(--muted)] md:hidden" aria-label="저장"><Save className="w-4 h-4 text-[var(--foreground-muted)]" /></button>
            <button onClick={() => router.push('/dashboard')} className="p-2 rounded-lg hover:bg-[var(--muted)]" aria-label="홈"><Home className="w-4 h-4 text-[var(--foreground-muted)]" /></button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-4 sm:p-6">

            {/* ─── 기본 정보 섹션 ─── */}
            {!printMode && currentSection === -1 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 bg-gradient-to-r from-slate-800 to-slate-700 rounded-t-xl px-5 py-3.5"><span className="text-white text-lg">📋</span><h2 className="text-lg font-bold text-white">현장 기본 정보</h2></div>

                {/* 공사 범위 */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                    <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">🏗️ 공사 범위</Label>
                  </div>
                  <div className="p-4">
                    <RadioGroup value={siteInfo.workScope} onValueChange={(v) => setSiteInfo({ ...siteInfo, workScope: v as any })} className="flex gap-4">
                      {[{ v: 'full', l: '전체 공사', d: '모든 공간 시공' }, { v: 'partial', l: '부분 공사', d: '선택 공간만 시공' }].map(({ v, l, d }) => (
                        <label key={v} className={`flex-1 cursor-pointer rounded-xl border-2 p-4 transition-all ${siteInfo.workScope === v ? 'border-slate-800 dark:border-slate-300 bg-slate-50 dark:bg-slate-700' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}>
                          <div className="flex items-center gap-3">
                            <RadioGroupItem value={v} id={`scope-${v}`} />
                            <div><p className="text-sm font-bold">{l}</p><p className="text-xs text-slate-400">{d}</p></div>
                          </div>
                        </label>
                      ))}
                    </RadioGroup>
                  </div>
                </div>

                {/* 기존 현장 정보 */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                  {[
                    { label: '현장명 / 아파트', key: 'apartmentName', placeholder: '래미안 힐스테이트' },
                    { label: '평형 (공급/전용)', key: 'squareMeters', placeholder: '84/68' },
                    { label: '시공 예정일', key: 'desiredDate', placeholder: '2026-04-01' },
                    { label: '담당자', key: 'manager', placeholder: '홍길동' },
                    { label: '층수', key: 'floor', placeholder: '15층' },
                    { label: '고객 연락처', key: 'clientPhone', placeholder: '010-1234-5678' },
                  ].map(({ label, key, placeholder }) => (
                    <div key={key} className="flex flex-col sm:flex-row">
                      <div className="px-4 py-3 sm:w-48 bg-slate-50 dark:bg-slate-900/50 flex items-center"><Label className="text-sm font-semibold text-slate-600 dark:text-slate-400">{label}</Label></div>
                      <div className="flex-1 px-4 py-2"><Input value={(siteInfo as any)[key]} onChange={(e) => setSiteInfo({ ...siteInfo, [key]: e.target.value })} placeholder={placeholder} className="h-12 text-lg border-0 border-b border-dashed border-slate-200 dark:border-slate-700 rounded-none bg-transparent focus:ring-0 focus:border-[#CD363A]" /></div>
                    </div>
                  ))}
                  <div className="flex flex-col sm:flex-row"><div className="px-4 py-3 sm:w-48 bg-slate-50 dark:bg-slate-900/50"><Label className="text-sm font-semibold text-slate-600 dark:text-slate-400">거주 여부</Label></div><div className="flex-1 px-4 py-3"><RadioGroup value={siteInfo.isOccupied} onValueChange={(v) => setSiteInfo({ ...siteInfo, isOccupied: v })} className="flex gap-6">{['공실', '거주중'].map(v => <div key={v} className="flex items-center space-x-2"><RadioGroupItem value={v} id={`occ-${v}`} /><Label htmlFor={`occ-${v}`}>{v}</Label></div>)}</RadioGroup></div></div>
                  <div className="flex flex-col sm:flex-row"><div className="px-4 py-3 sm:w-48 bg-slate-50 dark:bg-slate-900/50"><Label className="text-sm font-semibold text-slate-600 dark:text-slate-400">엘리베이터</Label></div><div className="flex-1 px-4 py-3"><RadioGroup value={siteInfo.hasElevator} onValueChange={(v) => setSiteInfo({ ...siteInfo, hasElevator: v })} className="flex gap-6">{['있음', '없음'].map(v => <div key={v} className="flex items-center space-x-2"><RadioGroupItem value={v} id={`elev-${v}`} /><Label htmlFor={`elev-${v}`}>{v}</Label></div>)}</RadioGroup></div></div>
                </div>
              </div>
            )}

            {/* ─── 체크리스트 섹션 ─── */}
            {!printMode && currentSection >= 0 && SECTIONS[currentSection] && (
              <div>
                <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                  <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-5 py-4 flex items-center gap-3">
                    <span className="text-slate-400 font-mono text-base">{String(currentSection + 1).padStart(2, '0')}</span>
                    <h2 className="text-lg sm:text-xl font-bold text-white">{SECTIONS[currentSection].title}</h2>
                    <span className="text-sm text-slate-400 hidden sm:inline ml-auto">{SECTIONS[currentSection].subtitle}</span>
                  </div>
                  <div className="hidden md:grid grid-cols-[64px_180px_1fr_220px] bg-slate-100 dark:bg-slate-700 text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase border-b border-slate-200 dark:border-slate-600">
                    <div className="px-3 py-2.5 text-center whitespace-nowrap">확인</div><div className="px-3 py-2.5">항목</div><div className="px-3 py-2.5">선택 옵션</div><div className="px-3 py-2.5">비고</div>
                  </div>
                  {SECTIONS[currentSection].id === 'notes' ? (
                    <div className="bg-white dark:bg-slate-800 p-4">
                      <textarea className="w-full min-h-[250px] px-4 py-3 text-lg border border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 resize-y focus:outline-none focus:border-[#CD363A]" value={specialNotes} onChange={(e) => setSpecialNotes(e.target.value)} placeholder="특이사항 및 추가 요청사항을 입력하세요..." />
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                      {SECTIONS[currentSection].items.map((item) => {
                        if (item.subItems) {
                          const parentKey = `${SECTIONS[currentSection].id}_${item.name}_enabled`;
                          const isEnabled = checklist[SECTIONS[currentSection].id]?.[item.name]?.checked !== false;
                          return (
                          <div key={item.name}>
                            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-900/50 flex items-center gap-2">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={isEnabled} onChange={(e) => updateItem(SECTIONS[currentSection].id, item.name, 'checked', e.target.checked)} className="w-5 h-5 rounded accent-slate-800" />
                                <span className={`text-base font-bold ${isEnabled ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 line-through'}`}>{item.name}</span>
                              </label>
                              {!isEnabled && <span className="text-xs text-slate-400 ml-1">비활성</span>}
                            </div>
                            {isEnabled && item.subItems.map((sub) => {
                              const subKey = `${item.name}_${sub.name}`;
                              const subData = checklist[SECTIONS[currentSection].id]?.[subKey] || { checked: false, detail: '', value: '', note: '' };
                              const subRoomKey = `${SECTIONS[currentSection].id}_${subKey}`;
                              return <ChecklistRow key={subKey} item={sub} sectionId={SECTIONS[currentSection].id} data={subData}
                                roomData={roomChecklist[subRoomKey]}
                                onUpdate={(field, value) => updateItem(SECTIONS[currentSection].id, subKey, field, value)}
                                onRoomUpdate={(roomId, field, value) => updateRoomData(subRoomKey, roomId, field, value)}
                                isSubItem parentLabel={item.name}
                                roomList={SECTIONS[currentSection].id === 'roomSize' ? DEFAULT_ROOMS : activeRooms} />;
                            })}
                          </div>
                        );}
                        const itemData = checklist[SECTIONS[currentSection].id]?.[item.name] || { checked: false, detail: '', value: '', note: '' };
                        const roomKey = `${SECTIONS[currentSection].id}_${item.name}`;
                        return <ChecklistRow key={item.name} item={item} sectionId={SECTIONS[currentSection].id} data={itemData}
                          roomData={roomChecklist[roomKey]}
                          onUpdate={(field, value) => updateItem(SECTIONS[currentSection].id, item.name, field, value)}
                          onRoomUpdate={(roomId, field, value) => updateRoomData(roomKey, roomId, field, value)}
                          roomList={SECTIONS[currentSection].id === 'roomSize' ? DEFAULT_ROOMS : activeRooms} />;
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ─── 네비게이션 ─── */}
            <div className="flex justify-between items-center mt-6 print:hidden">
              <Button variant="outline" onClick={() => setCurrentSection(Math.max(-1, currentSection - 1))} disabled={currentSection === -1} className="h-11 gap-1 border-slate-300"><ChevronLeft className="w-4 h-4" /> 이전</Button>
              <div className="flex items-center gap-2">{SECTIONS.map((_, i) => <button key={i} onClick={() => setCurrentSection(i)} className={`w-2 h-2 rounded-full transition-all ${currentSection === i ? 'bg-slate-800 dark:bg-slate-300 w-6' : 'bg-slate-300 dark:bg-slate-600'}`} />)}</div>
              <Button onClick={() => { setCurrentSection(Math.min(SECTIONS.length - 1, currentSection + 1)); saveChecklist(); }} disabled={currentSection === SECTIONS.length - 1} className="h-11 gap-1 bg-slate-800 hover:bg-slate-700">다음 <ChevronRight className="w-4 h-4" /></Button>
            </div>

            {/* ─── 인쇄 전용: 전체 섹션 ─── */}
            {printMode && (
              <div className="space-y-5 print-area">
                {/* 인쇄 액션 바 */}
                <div className="flex items-center justify-between bg-slate-800 text-white rounded-xl px-6 py-4 print:hidden">
                  <button onClick={() => setPrintMode(false)} className="flex items-center gap-2 text-sm hover:text-slate-300 transition">
                    <ChevronLeft className="w-4 h-4" /> 돌아가기
                  </button>
                  <span className="text-sm font-medium">인쇄 미리보기</span>
                  <button onClick={() => window.print()} className="flex items-center gap-2 bg-white text-slate-800 px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-100 transition">
                    <Printer className="w-4 h-4" /> 인쇄하기
                  </button>
                </div>

                {/* 표지 헤더 */}
                <div className="border-b-2 border-slate-800 pb-6 mb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <img src="/logo.png" alt="SOMSSI" className="w-14 h-14 object-contain" />
                      <div>
                        <h1 className="text-2xl font-black tracking-tight text-slate-800">SOMSSI INTERIOR</h1>
                        <p className="text-sm text-slate-400 font-medium tracking-widest">솜씨인테리어 시공 체크리스트</p>
                      </div>
                    </div>
                    <div className="text-right text-xs text-slate-400">
                      <p>작성일: {new Date().toLocaleDateString('ko-KR')}</p>
                      {siteInfo.manager && <p>담당: {siteInfo.manager}</p>}
                    </div>
                  </div>
                </div>

                {/* 현장 기본 정보 카드 */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div style={{ backgroundColor: '#1e293b', color: '#ffffff', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties} className="px-5 py-3 flex items-center gap-2">
                    <span className="text-lg">📋</span>
                    <h2 className="text-base font-bold" style={{ color: '#ffffff' }}>현장 기본 정보</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-0">
                    {[
                      ['현장명', siteInfo.apartmentName], ['평형 (공급/전용)', siteInfo.squareMeters],
                      ['시공 예정일', siteInfo.desiredDate], ['담당자', siteInfo.manager],
                      ['층수', siteInfo.floor], ['고객 연락처', siteInfo.clientPhone],
                      ['거주 여부', siteInfo.isOccupied], ['엘리베이터', siteInfo.hasElevator],
                      ['공사 범위', siteInfo.workScope === 'full' ? '전체 공사' : siteInfo.workScope === 'partial' ? '부분 공사' : '-'],
                    ].filter(([, v]) => v).map(([label, value], i) => (
                      <div key={label} className={`flex border-b border-slate-200 ${i % 2 === 0 ? 'border-r' : ''}`}>
                        <div className="w-28 px-3 py-2.5 bg-slate-50 text-xs font-bold text-slate-600 flex items-center">{label}</div>
                        <div className="flex-1 px-3 py-2.5 text-sm">{value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 모든 체크리스트 섹션 */}
                {SECTIONS.map((section, sIdx) => {
                  if (section.id === 'notes') {
                    return specialNotes ? (
                      <div key={section.id} className="border border-slate-200 rounded-lg overflow-hidden break-inside-avoid">
                        <div style={{ backgroundColor: "#1e293b", color: "#ffffff", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" } as React.CSSProperties} className="px-5 py-3">
                          <span className="font-mono text-slate-400 mr-3 text-sm">{String(sIdx + 1).padStart(2, '0')}</span>
                          <span className="font-bold text-base">{section.title}</span>
                        </div>
                        <div className="p-4"><p className="whitespace-pre-wrap text-sm leading-relaxed">{specialNotes}</p></div>
                      </div>
                    ) : null;
                  }

                  const sectionData = checklist[section.id] || {};
                  const hasCheckedItems = Object.values(sectionData).some((d: any) => d.checked);
                  if (!hasCheckedItems) return null;

                  return (
                    <div key={section.id} className="border border-slate-200 rounded-lg overflow-hidden break-inside-avoid">
                      <div style={{ backgroundColor: "#1e293b", color: "#ffffff", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" } as React.CSSProperties} className="px-5 py-3 flex items-center">
                        <span className="font-mono text-slate-400 mr-3 text-sm">{String(sIdx + 1).padStart(2, '0')}</span>
                        <span className="font-bold text-base">{section.title}</span>
                        <span className="ml-auto text-xs text-slate-400">{section.subtitle}</span>
                      </div>
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="bg-slate-100 text-slate-600 text-xs font-bold uppercase">
                            <th className="px-3 py-2.5 text-center w-10 border-b border-slate-200">✓</th>
                            <th className="px-3 py-2.5 text-left w-36 border-b border-slate-200">항목</th>
                            <th className="px-3 py-2.5 text-left border-b border-slate-200">선택 옵션 / 방별</th>
                            <th className="px-3 py-2.5 text-left w-44 border-b border-slate-200">비고</th>
                          </tr>
                        </thead>
                        <tbody>
                          {section.items.map((item) => {
                            if (item.subItems) {
                              const parentEnabled = sectionData[item.name]?.checked !== false;
                              if (!parentEnabled) return null;
                              return item.subItems.map((sub) => {
                                const subKey = `${item.name}_${sub.name}`;
                                const d = sectionData[subKey];
                                if (!d?.checked) return null;
                                const roomKey = `${section.id}_${subKey}`;
                                const rd = roomChecklist[roomKey] || {};
                                const checkedRooms = Object.entries(rd).filter(([, r]: any) => r.checked).map(([name, r]: any) => r.value ? `${name} (${r.value})` : name);
                                return (
                                  <tr key={subKey} className="border-b border-slate-100">
                                    <td className="px-3 py-2.5 text-center text-emerald-600 font-bold">✓</td>
                                    <td className="px-3 py-2.5"><span className="text-[10px] text-slate-400 block">{item.name}</span><span className="font-semibold">{sub.name}</span></td>
                                    <td className="px-3 py-2.5">{d.detail && <span className="inline-block bg-slate-100 px-2 py-0.5 rounded text-xs mr-1 mb-0.5">{d.detail}</span>}{checkedRooms.length > 0 && <div className="mt-1 text-xs text-blue-700 font-medium">📍 {checkedRooms.join(' · ')}</div>}</td>
                                    <td className="px-3 py-2.5 text-slate-500 text-xs">{d.value}{d.note && <div className="text-slate-400 mt-0.5">{d.note}</div>}</td>
                                  </tr>
                                );
                              });
                            }
                            const d = sectionData[item.name];
                            if (!d?.checked) return null;
                            const roomKey = `${section.id}_${item.name}`;
                            const rd = roomChecklist[roomKey] || {};
                            const checkedRooms = Object.entries(rd).filter(([, r]: any) => r.checked).map(([name, r]: any) => r.value ? `${name} (${r.value})` : name);
                            return (
                              <tr key={item.name} className="border-b border-slate-100">
                                <td className="px-3 py-2.5 text-center text-emerald-600 font-bold">✓</td>
                                <td className="px-3 py-2.5 font-semibold">{item.name}</td>
                                <td className="px-3 py-2.5">{d.detail && <span className="inline-block bg-slate-100 px-2 py-0.5 rounded text-xs mr-1 mb-0.5">{d.detail}</span>}{checkedRooms.length > 0 && <div className="mt-1 text-xs text-blue-700 font-medium">📍 {checkedRooms.join(' · ')}</div>}</td>
                                <td className="px-3 py-2.5 text-slate-500 text-xs">{d.value}{d.note && <div className="text-slate-400 mt-0.5">{d.note}</div>}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })}

                {/* 푸터 */}
                <div className="border-t-2 border-slate-800 pt-4 mt-6 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <img src="/logo.png" alt="" className="w-5 h-5 object-contain opacity-50" />
                    <span>SOMSSI INTERIOR</span>
                  </div>
                  <span>본 체크리스트는 시공 전 확인용이며, 현장 상황에 따라 변경될 수 있습니다.</span>
                </div>

                {/* 하단 액션 바 */}
                <div className="flex items-center justify-center gap-4 mt-8 print:hidden">
                  <button onClick={() => setPrintMode(false)} className="px-6 py-3 rounded-lg border border-slate-300 text-sm font-medium hover:bg-slate-50 transition">
                    ← 돌아가기
                  </button>
                  <button onClick={() => window.print()} className="px-6 py-3 rounded-lg bg-slate-800 text-white text-sm font-bold hover:bg-slate-700 transition flex items-center gap-2">
                    <Printer className="w-4 h-4" /> 인쇄하기
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}
