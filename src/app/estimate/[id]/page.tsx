'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SidebarWrapper } from '@/components/mobile-menu';
import { Plus, Trash2, Save, Printer, X, ChevronLeft, Download, Menu, Home, ArrowLeft, ArrowUp, ArrowDown, ListOrdered, Link2, FileSpreadsheet } from 'lucide-react';
import ExcelImportDialog from '@/components/ExcelImportDialog';
import { NumInput, PageNav } from '@/components/shared';
import { PrintEstimate } from '@/components/estimate/print-estimate';
import { ESTIMATE_PRESETS, CHECKLIST_TO_ESTIMATE, CATEGORIES, PRESET_CATEGORIES } from '@/config/estimate';
import { calcPyeong, calcEstimateTotals } from '@/lib/calc';
import { apiGet, apiPost, ApiError } from '@/lib/api';
import { safeParse } from '@/lib/utils';
import type { LaborEntry, EstimateItem, EstimateData, CompanyInfo } from '@/types/checklist';

function EstimateItemCard({ item, onUpdate, onRemove }: {
  item: EstimateItem;
  onUpdate: (field: string, value: any) => void;
  onRemove: () => void;
}) {
  return (
    <div className="border border-[var(--border)] rounded-xl p-4 bg-[var(--card)] space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-[var(--muted)] rounded text-xs shrink-0">{item.category}</span>
            <span className="font-medium text-sm truncate">{item.name || '(항목명 없음)'}</span>
          </div>
        </div>
        <button onClick={onRemove} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg shrink-0">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-[var(--foreground-muted)]">항목명</label>
          <Input className="h-9 text-sm mt-1" value={item.name} onChange={e => onUpdate('name', e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-[var(--foreground-muted)]">카테고리</label>
          <select className="w-full h-9 px-2 border rounded-lg text-sm mt-1 bg-[var(--input-bg)]" value={item.category} onChange={e => onUpdate('category', e.target.value)}>
            {PRESET_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="min-w-0">
          <label className="text-xs text-[var(--foreground-muted)]">단위</label>
          <Input className="h-9 text-sm text-center mt-1 w-full px-2" value={item.unit} onChange={e => onUpdate('unit', e.target.value)} />
        </div>
        <div className="min-w-0">
          <label className="text-xs text-[var(--foreground-muted)]">수량</label>
          <NumInput className="h-9 text-sm text-center mt-1 w-full px-2" value={item.quantity} onChange={v => onUpdate('quantity', v)} />
        </div>
        <div className="col-span-2 min-w-0">
          <label className="text-xs text-[var(--foreground-muted)]">단가</label>
          <NumInput className="h-9 text-sm text-right mt-1 w-full px-2" value={item.unitPrice} onChange={v => onUpdate('unitPrice', v)} />
        </div>
      </div>

      {/* 인건비 */}
      {(item.labor && item.labor.length > 0) && (
        <div className="space-y-2">
          {item.labor.map((l) => (
            <div key={l.id} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-lg p-2">
              <span className="text-xs font-medium w-8 shrink-0">{l.type}</span>
              <NumInput className="h-8 text-sm text-center w-16 px-2" step="0.5" value={l.days} onChange={v => {
                const updated = item.labor.map(x => x.id === l.id ? { ...x, days: v } : x);
                onUpdate('labor', updated);
              }} placeholder="품수" />
              <span className="text-xs shrink-0">×</span>
              <NumInput className="h-8 text-sm text-right flex-1 px-2 min-w-0" value={l.dayRate} onChange={v => {
                const updated = item.labor.map(x => x.id === l.id ? { ...x, dayRate: v } : x);
                onUpdate('labor', updated);
              }} placeholder="단가" />
              <span className="text-xs text-[var(--foreground-muted)] shrink-0">= {(l.days * l.dayRate).toLocaleString()}</span>
              <button onClick={() => onUpdate('labor', item.labor.filter(x => x.id !== l.id))} className="p-1 text-red-400 hover:text-red-600 shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={() => onUpdate('labor', [...(item.labor || []), { id: Date.now().toString(), type: '기공', days: 0, dayRate: 0 }])} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20">
          <Plus className="w-3 h-3" /> 기공
        </button>
        <button onClick={() => onUpdate('labor', [...(item.labor || []), { id: Date.now().toString(), type: '조공', days: 0, dayRate: 0 }])} className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800 px-2 py-1 rounded hover:bg-emerald-50 dark:hover:bg-emerald-900/20">
          <Plus className="w-3 h-3" /> 조공
        </button>
      </div>

      <div className="flex justify-between items-center pt-1 border-t border-[var(--border)]">
        <span className="text-xs text-[var(--foreground-muted)]">소계</span>
        <span className="font-semibold text-sm">{((item.quantity * item.unitPrice) + (item.labor || []).reduce((s, l) => s + l.days * l.dayRate, 0)).toLocaleString()}원</span>
      </div>
    </div>
  );
}

export default function EstimatePage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  
  const [project, setProject] = useState<any>(null);
  const [estimate, setEstimate] = useState<EstimateData>({
    projectId,
    items: [],
    discount: 0,
    vatRate: 10,
    includeVat: true,
    notes: '',
  });
  const [categoryOrder, setCategoryOrder] = useState<string[] | null>(null);
  const [showCategoryOrderModal, setShowCategoryOrderModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('로딩 중...'); // 초기 로드 완료 플래그
  const [printMode, setPrintMode] = useState(false);

  useEffect(() => {
    if (printMode) window.scrollTo(0, 0);
  }, [printMode]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [companyInfo, setCompanyInfo] = useState({
    ceoName: '',
    bizNumber: '',
    address: '',
  });

  useEffect(() => {
    async function load() {
      // Load project from API
      try {
        const data = await apiGet(`/api/projects/${projectId}`);
        setProject(data);
      } catch (e) {
        console.error('프로젝트 로드 실패:', e);
      }

      // Load estimate from API (DB)
      try {
        const data = await apiGet(`/api/estimates/${projectId}`);
        setDebugInfo(`API: 200, 항목 ${data.items?.length || 0}개`);
        setEstimate({
          items: (data.items || []).map((item: any) => ({
            ...item,
            labor: item.labor || []
          })),
          discount: data.discount || 0,
          vatRate: data.vatRate ?? 10,
          includeVat: data.includeVat ?? true,
          notes: data.notes || ''
        });
        if (data.categoryOrder) setCategoryOrder(data.categoryOrder);
      } catch (e: any) {
        setDebugInfo(e instanceof ApiError ? `API 실패: ${e.status}` : `에러: ${e.message}`);
      }

      // Load company info (저장소가 깨져 있어도 페이지가 죽지 않게 safeParse)
      const ci = localStorage.getItem(`companyInfo-${projectId}`) || localStorage.getItem('companyInfo-default');
      setCompanyInfo(prev => safeParse(ci, prev));

      setLoaded(true); // 로드 완료
    }
    load();
  }, [projectId]);

  // 자동 저장 (2초 디바운스) - 로드 완료 후에만
  useEffect(() => {
    if (!loaded) return; // 초기 로드 전엔 저장 안 함
    if (!estimate.items || estimate.items.length === 0) return;
    const timer = setTimeout(() => {
      apiPost(`/api/estimates/${projectId}`, { ...estimate, categoryOrder })
        .catch(e => console.error('자동 저장 실패:', e));
      localStorage.setItem(`estimate-${projectId}`, JSON.stringify(estimate));
    }, 2000);
    return () => clearTimeout(timer);
  }, [estimate, categoryOrder, projectId, loaded]);

  const save = async () => {
    setSaving(true);
    localStorage.setItem(`estimate-${projectId}`, JSON.stringify(estimate));
    localStorage.setItem(`companyInfo-${projectId}`, JSON.stringify(companyInfo));
    localStorage.setItem('companyInfo-default', JSON.stringify(companyInfo));
    // DB에 저장
    try {
      await apiPost(`/api/estimates/${projectId}`, { ...estimate, categoryOrder });
      setDebugInfo(`저장 성공! 항목 ${estimate.items.length}개`);
    } catch (e: any) {
      setDebugInfo(e instanceof ApiError ? `저장 실패: ${e.status} ${e.message}` : `저장 에러: ${e.message}`);
    }
    setTimeout(() => setSaving(false), 500);
  };

  // 고객용 읽기전용 공유 링크 생성 후 클립보드에 복사
  const shareEstimate = async () => {
    try {
      // 최신 견적이 DB에 반영되도록 먼저 저장
      await apiPost(`/api/estimates/${projectId}`, { ...estimate, categoryOrder });

      const data = await apiPost(`/api/estimates/${projectId}/share`);
      if (!data.token) {
        alert('공유 링크 생성에 실패했습니다');
        return;
      }
      const url = `${window.location.origin}/share/${data.token}`;
      try {
        await navigator.clipboard.writeText(url);
        alert(`공유 링크가 복사되었습니다.\n고객에게 전달하세요:\n\n${url}`);
      } catch {
        // 클립보드 권한이 없는 경우 링크를 직접 보여줌
        prompt('아래 공유 링크를 복사하세요:', url);
      }
    } catch {
      alert('공유 링크 생성 중 오류가 발생했습니다');
    }
  };

  const addPreset = (preset: typeof ESTIMATE_PRESETS[0]) => {
    setEstimate(prev => {
      // 같은 이름의 기존 항목 찾기
      const existingIdx = prev.items.findIndex(item => item.name === preset.name && item.unit === preset.unit);
      if (existingIdx >= 0) {
        // 기존 항목 수량 증가
        const newItems = [...prev.items];
        newItems[existingIdx] = { ...newItems[existingIdx], quantity: newItems[existingIdx].quantity + 1 };
        return { ...prev, items: newItems };
      }
      // 새 항목 추가
      return { ...prev, items: [{ id: Date.now().toString(), ...preset, labor: [], quantity: 1, note: '' }, ...prev.items] };
    });
    setSidebarOpen(false);
  };

  const addItem = () => {
    setEstimate(prev => ({
      ...prev,
      items: [{ id: Date.now().toString(), category: '기타', name: '', unit: '개', quantity: 1, unitPrice: 0, labor: [], note: '' }, ...prev.items]
    }));
  };

  // 중복 항목 병합 (같은 이름 + 단위)
  const mergeDuplicates = () => {
    setEstimate(prev => {
      const merged: Record<string, EstimateItem> = {};
      for (const item of prev.items) {
        if (!item.name) { merged[item.id] = item; continue; } // 이름 없으면 그대로
        const key = `${item.name}|${item.unit}`;
        if (merged[key]) {
          merged[key].quantity += item.quantity;
          if (item.note && !merged[key].note.includes(item.note)) {
            merged[key].note = merged[key].note ? `${merged[key].note}, ${item.note}` : item.note;
          }
        } else {
          merged[key] = { ...item, id: key };
        }
      }
      return { ...prev, items: Object.values(merged) };
    });
  };

  // 체크리스트에서 견적 항목 자동 가져오기
  const importFromChecklist = async () => {
    try {
      const data = await apiGet(`/api/checklists/${projectId}`);
      if (!data.checklist || Object.keys(data.checklist).length === 0) { alert('체크리스트 데이터가 없습니다'); return; }
      const ck: Record<string, Record<string, any>> = data.checklist || {};
      const roomCk: Record<string, Record<string, any>> = data.roomChecklist || {};
      
      // 방 사이즈에서 각 방 면적 (mm² → 평) 미리 계산
      const roomPyeong: Record<string, number> = {};
      const roomSizeData = ck['roomSize'] || {};
      Object.entries(roomSizeData).forEach(([roomName, rd]: [string, any]) => {
        if (!rd?.checked || !rd.value) return;
        const segs = rd.value.split('|').filter(Boolean);
        let totalMm2 = 0;
        for (const seg of segs) {
          const [w, h] = seg.split('×').map(Number);
          if (w > 0 && h > 0) totalMm2 += w * h;
        }
        if (totalMm2 > 0) roomPyeong[roomName] = totalMm2 / 3305800;
      });

      // 방별 실측 데이터에서 면적 계산 (W×H 형식)
      const calcRoomArea = (roomData: Record<string, any>): { totalPyeong: number; rooms: string[]; roomDetails: string[] } => {
        let totalMm2 = 0;
        const rooms: string[] = [];
        const roomDetails: string[] = [];
        Object.entries(roomData).forEach(([name, rd]: [string, any]) => {
          if (!rd?.checked) return;
          rooms.push(name);
          if (rd.value && rd.value.includes('×')) {
            const segs = rd.value.split('|').filter(Boolean);
            let roomMm2 = 0;
            for (const seg of segs) {
              const [w, h] = seg.split('×').map(Number);
              if (w > 0 && h > 0) roomMm2 += w * h;
            }
            if (roomMm2 > 0) {
              totalMm2 += roomMm2;
              roomDetails.push(`${name} ${(roomMm2 / 3305800).toFixed(1)}평`);
            } else if (roomPyeong[name]) {
              // 항목별 실측이 없으면 방 사이즈에서 가져옴
              totalMm2 += roomPyeong[name] * 3305800;
              roomDetails.push(`${name} ${roomPyeong[name].toFixed(1)}평(방)`);
            }
          } else if (rd.value && !isNaN(Number(rd.value))) {
            // 평수 직접 입력 (도배 등)
            totalMm2 += Number(rd.value) * 3305800;
            roomDetails.push(`${name} ${rd.value}평`);
          } else if (roomPyeong[name]) {
            totalMm2 += roomPyeong[name] * 3305800;
            roomDetails.push(`${name} ${roomPyeong[name].toFixed(1)}평(방)`);
          }
        });
        return { totalPyeong: totalMm2 / 3305800, rooms, roomDetails };
      };
      
      // 좌평 계산 (창호용)
      const calcJwa = (roomData: Record<string, any>): number => {
        let total = 0;
        Object.values(roomData).forEach((rd: any) => {
          if (!rd?.checked || !rd.value) return;
          const segs = rd.value.split('|').filter(Boolean);
          for (const seg of segs) {
            const [w, h] = seg.split('×').map(Number);
            if (w > 0 && h > 0) total += (w / 900) * (h / 900);
          }
        });
        return total;
      };

      const newItems: EstimateItem[] = [];
      const existingByName = new Map(estimate.items.map(i => [i.name, i]));
      const updatedIds = new Set<string>();
      
      // 섹션별 순회
      Object.entries(ck).forEach(([sectionId, sectionData]) => {
        if (sectionId === 'roomSize') return; // 방 사이즈는 스킵
        Object.entries(sectionData as Record<string, any>).forEach(([itemName, itemVal]: [string, any]) => {
          if (!itemVal?.checked) return;
          const options: string[] = itemVal.options || [];
          const roomKey = `${sectionId}_${itemName}`;
          const rooms = roomCk[roomKey] || {};
          const { totalPyeong, rooms: checkedRooms, roomDetails } = calcRoomArea(rooms);
          const checkedRoomCount = checkedRooms.length;
          
          // 매핑 키 생성
          const mappingKeys: string[] = [];
          if (options.length > 0) {
            options.forEach(opt => mappingKeys.push(`${sectionId}-${itemName}:${opt}`));
          }
          // 기본 키들
          mappingKeys.push(`${sectionId}-${itemName}`);
          // sectionId 없이도 시도 (이전 매핑 호환)
          const shortKeys = ['floor', 'interior', 'wall', 'misc', 'bathroom'];
          for (const sk of shortKeys) {
            if (options.length > 0) options.forEach(opt => mappingKeys.push(`${sk}-${itemName}:${opt}`));
            mappingKeys.push(`${sk}-${itemName}`);
          }
          
          for (const mk of mappingKeys) {
            const preset = CHECKLIST_TO_ESTIMATE[mk];
            if (!preset) continue;
            
            const existing = existingByName.get(preset.name);
            if (existing && !updatedIds.has(existing.id)) {
              // 기존 항목 업데이트 (수량, 비고)
              const qty = preset.unit === '평' && totalPyeong > 0
                ? Math.ceil(totalPyeong)
                : preset.unit === '개' || preset.unit === '실' || preset.unit === '대'
                  ? checkedRoomCount || existing.quantity
                  : existing.quantity;
              const note = roomDetails.length > 0 ? roomDetails.join(', ') : checkedRooms.join(', ');
              existing.quantity = qty;
              existing.note = note || existing.note;
              
              // 창호: 좌평 비고
              if (itemName.includes('창호') || itemName.includes('폴딩도어')) {
                const jwa = calcJwa(rooms);
                if (jwa > 0) existing.note = `${jwa.toFixed(1)}좌 / ${checkedRooms.join(', ')}`;
              }
              updatedIds.add(existing.id);
            } else if (!existing) {
              const qty = preset.unit === '평' && totalPyeong > 0
                ? Math.ceil(totalPyeong)
                : preset.unit === '개' || preset.unit === '실' || preset.unit === '대'
                  ? checkedRoomCount || 1
                  : 1;
              let note = roomDetails.length > 0 ? roomDetails.join(', ') : checkedRooms.join(', ');
              
              if (itemName.includes('창호') || itemName.includes('폴딩도어')) {
                const jwa = calcJwa(rooms);
                if (jwa > 0) note = `${jwa.toFixed(1)}좌 / ${checkedRooms.join(', ')}`;
              }
              
              newItems.push({
                id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
                ...preset,
                quantity: qty,
                labor: [],
                note,
              });
              existingByName.set(preset.name, newItems[newItems.length - 1]);
            }
          }
        });
      });
      
      if (newItems.length === 0 && updatedIds.size === 0) {
        alert('새로 추가하거나 업데이트할 항목이 없습니다');
        return;
      }
      
      setEstimate(prev => ({
        ...prev,
        items: [...newItems, ...prev.items.map(i => updatedIds.has(i.id) ? { ...existingByName.get(i.name)! } : i)]
      }));
      
      const msgs: string[] = [];
      if (newItems.length > 0) msgs.push(`${newItems.length}개 항목 추가`);
      if (updatedIds.size > 0) msgs.push(`${updatedIds.size}개 항목 수량/비고 업데이트`);
      alert(msgs.join(', '));
    } catch (e) {
      console.error('Import failed:', e);
      alert('체크리스트 불러오기 실패');
    }
  };

  const removeItem = (id: string) => {
    setEstimate(prev => ({ ...prev, items: prev.items.filter(i => i.id !== id) }));
  };

  const updateItem = (id: string, field: string, value: any) => {
    setEstimate(prev => ({
      ...prev,
      items: prev.items.map(i => i.id === id ? { ...i, [field]: value } : i)
    }));
  };

  // 합계 공식은 lib/calc.ts 단일 소스 — 고객 공유 페이지(share)와 항상 동일해야 함
  const miscRate = (estimate as any).miscRate ?? 0;
  const { materialTotal, laborTotal, miscAmount, subtotal, vatAmount, total } = calcEstimateTotals(estimate.items, {
    discount: estimate.discount,
    vatRate: estimate.vatRate,
    includeVat: estimate.includeVat,
    miscRate,
  });

  if (!project) return null;

  return (
    <div className="h-screen flex bg-[var(--background)]">

      <SidebarWrapper isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)}>
        <div className="w-64 flex flex-col h-full print:hidden shrink-0">
          <div className="p-4 border-b">
            <button onClick={() => router.push('/dashboard')} className="flex items-center gap-2 text-sm text-[var(--foreground-muted)] hover:text-[var(--brand-primary)] mb-2">
              <ArrowLeft className="w-4 h-4" /> 프로젝트 목록
            </button>
            <h1 className="font-bold text-[var(--brand-primary)] truncate">{project.name}</h1>
            <p className="text-sm text-[var(--foreground-muted)]">견적서</p>
          </div>
          <div className="flex-1 p-4 overflow-y-auto">
            <h3 className="text-sm font-medium mb-3">빠른 추가</h3>
            <div className="space-y-1">
              {ESTIMATE_PRESETS.map((p, i) => (
                <button key={i} onClick={() => addPreset(p)} className="w-full text-left px-2 py-2 text-xs rounded-lg hover:bg-[var(--muted)] flex justify-between items-center">
                  <span className="truncate">{p.name}</span>
                  <span className="text-[var(--foreground-muted)] shrink-0 ml-2">{p.unitPrice.toLocaleString()}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="p-3 border-t">
            <button onClick={importFromChecklist} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-[var(--muted)] text-sm text-blue-600 dark:text-blue-400 font-medium">
              <Download className="w-4 h-4" /> 체크리스트에서 가져오기
            </button>
          </div>
          <div className="p-3 border-t space-y-2">
            <h3 className="text-xs font-medium text-[var(--foreground-muted)] px-1">사업자 정보</h3>
            <div className="space-y-1.5 px-1">
              <Input className="h-8 text-xs" placeholder="대표자명" value={companyInfo.ceoName} onChange={e => setCompanyInfo(p => ({ ...p, ceoName: e.target.value }))} />
              <Input className="h-8 text-xs" placeholder="사업자번호 (000-00-00000)" value={companyInfo.bizNumber} onChange={e => setCompanyInfo(p => ({ ...p, bizNumber: e.target.value }))} />
              <Input className="h-8 text-xs" placeholder="주소" value={companyInfo.address} onChange={e => setCompanyInfo(p => ({ ...p, address: e.target.value }))} />
            </div>
          </div>
          <div className="p-3 border-t space-y-1">
            <button onClick={save} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-[var(--muted)] text-sm">
              <Save className="w-4 h-4" /> 저장 {saving && '✓'}
            </button>
            <button onClick={() => setPrintMode(true)} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-[var(--muted)] text-sm">
              <Printer className="w-4 h-4" /> 인쇄
            </button>
            <button onClick={shareEstimate} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-[var(--muted)] text-sm text-blue-600 dark:text-blue-400 font-medium">
              <Link2 className="w-4 h-4" /> 고객 공유 링크 복사
            </button>
            <button onClick={() => setShowImport(true)} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-[var(--muted)] text-sm">
              <FileSpreadsheet className="w-4 h-4" /> 엑셀에서 가져오기
            </button>
          </div>
          <PageNav projectId={projectId} current="estimate" />
        </div>
      </SidebarWrapper>

      {showImport && (
        <ExcelImportDialog
          mode="overwrite"
          projectId={projectId}
          onClose={() => setShowImport(false)}
          onDone={() => window.location.reload()}
        />
      )}

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b bg-[var(--card)] flex items-center justify-between px-4 print:hidden sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden p-2 -ml-2 rounded-lg hover:bg-[var(--muted)]" aria-label="메뉴"><Menu className="w-5 h-5 text-[var(--foreground-secondary)]" /></button>
            <span className="text-sm font-medium text-[var(--foreground-secondary)]">📋 견적서 — {project.name}</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={save} className="p-2 rounded-lg hover:bg-[var(--muted)] md:hidden" aria-label="저장"><Save className="w-4 h-4 text-[var(--foreground-muted)]" /></button>
            <button onClick={() => router.push('/dashboard')} className="p-2 rounded-lg hover:bg-[var(--muted)]" aria-label="홈"><Home className="w-4 h-4 text-[var(--foreground-muted)]" /></button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {!printMode && (<>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="text-xl font-bold">견적서</h2>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => setShowCategoryOrderModal(true)} variant="outline" className="w-full sm:w-auto text-xs">
              <ListOrdered className="w-4 h-4 mr-1" /> 공종 순서
            </Button>
            <Button onClick={mergeDuplicates} variant="outline" className="w-full sm:w-auto text-xs">
              중복 병합
            </Button>
            <Button onClick={addItem} className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" /> 항목 추가
            </Button>
          </div>
        </div>

        {/* 모바일: 카드 뷰 */}
        <div className="space-y-3 md:hidden">
          {estimate.items.map(item => (
            <EstimateItemCard
              key={item.id}
              item={item}
              onUpdate={(field, value) => updateItem(item.id, field, value)}
              onRemove={() => removeItem(item.id)}
            />
          ))}
          {estimate.items.length === 0 && (
            <Card className="py-12">
              <CardContent className="text-center text-[var(--foreground-muted)]">
                <p>항목이 없습니다</p>
                <p className="text-xs mt-1">메뉴에서 빠른 추가하거나 항목 추가 버튼을 눌러주세요</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 데스크탑: 테이블 뷰 */}
        <Card className="hidden md:block">
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-[var(--muted)]">
                <tr>
                  <th className="p-2 print:hidden w-12"></th>
                  <th className="p-2 text-left">카테고리</th>
                  <th className="p-2 text-left">항목명</th>
                  <th className="p-2 text-center">단위</th>
                  <th className="p-2 text-center">수량</th>
                  <th className="p-2 text-right">단가</th>
                  <th className="p-2 text-right">자재 금액</th>
                  <th className="p-2 text-left">인건비</th>
                  <th className="p-2 print:hidden">비고</th>
                </tr>
              </thead>
              <tbody>
                {estimate.items.map(item => (
                  <tr key={item.id} className="border-b">
                    <td className="p-2 print:hidden">
                      <Button variant="ghost" size="sm" onClick={() => removeItem(item.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </td>
                    <td className="p-2">
                      <select className="border rounded px-1 py-0.5 text-xs print:hidden bg-[var(--input-bg)]" value={item.category} onChange={e => updateItem(item.id, 'category', e.target.value)}>
                        {PRESET_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <span className="hidden print:inline">{item.category}</span>
                    </td>
                    <td className="p-2">
                      <Input className="h-7 text-xs print:hidden" value={item.name} onChange={e => updateItem(item.id, 'name', e.target.value)} />
                      <span className="hidden print:inline">{item.name}</span>
                    </td>
                    <td className="p-2 text-center">
                      <Input className="h-7 text-xs w-12 text-center print:hidden" value={item.unit} onChange={e => updateItem(item.id, 'unit', e.target.value)} />
                      <span className="hidden print:inline">{item.unit}</span>
                    </td>
                    <td className="p-2 text-center">
                      <NumInput className="h-7 text-xs w-14 text-center px-2 print:hidden" value={item.quantity} onChange={v => updateItem(item.id, 'quantity', v)} />
                      <span className="hidden print:inline">{item.quantity}</span>
                    </td>
                    <td className="p-2 text-right">
                      <NumInput className="h-7 text-xs w-24 text-right px-2 print:hidden" value={item.unitPrice} onChange={v => updateItem(item.id, 'unitPrice', v)} />
                      <span className="hidden print:inline">{item.unitPrice.toLocaleString()}</span>
                    </td>
                    <td className="p-2 text-right font-medium">{(item.quantity * item.unitPrice).toLocaleString()}원</td>
                    <td className="p-2">
                      <div className="space-y-1 print:hidden">
                        {(item.labor || []).map(l => (
                          <div key={l.id} className="flex items-center gap-1 text-xs">
                            <span className="w-7 shrink-0 font-medium">{l.type}</span>
                            <NumInput className="h-6 text-xs w-12 text-center px-2" step="0.5" value={l.days} onChange={v => updateItem(item.id, 'labor', (item.labor || []).map(x => x.id === l.id ? { ...x, days: v } : x))} />
                            <span>×</span>
                            <NumInput className="h-6 text-xs w-16 text-right px-2" value={l.dayRate} onChange={v => updateItem(item.id, 'labor', (item.labor || []).map(x => x.id === l.id ? { ...x, dayRate: v } : x))} />
                            <span className="text-[var(--foreground-muted)]">= {(l.days * l.dayRate).toLocaleString()}</span>
                            <button onClick={() => updateItem(item.id, 'labor', (item.labor || []).filter(x => x.id !== l.id))} className="text-red-400 hover:text-red-600 p-0.5"><X className="w-3 h-3" /></button>
                          </div>
                        ))}
                        <div className="flex gap-1">
                          <button onClick={() => updateItem(item.id, 'labor', [...(item.labor || []), { id: Date.now().toString(), type: '기공', days: 0, dayRate: 0 }])} className="text-[10px] text-blue-600 hover:underline">+기공</button>
                          <button onClick={() => updateItem(item.id, 'labor', [...(item.labor || []), { id: Date.now().toString(), type: '조공', days: 0, dayRate: 0 }])} className="text-[10px] text-emerald-600 hover:underline">+조공</button>
                        </div>
                      </div>
                      <span className="hidden print:inline text-xs">{(item.labor || []).map(l => `${l.type} ${l.days}품×${l.dayRate.toLocaleString()}`).join(', ')}</span>
                      {(item.labor || []).length > 0 && <div className="text-right font-medium text-xs mt-1">{(item.labor || []).reduce((s, l) => s + l.days * l.dayRate, 0).toLocaleString()}원</div>}
                    </td>
                    <td className="p-2 print:hidden">
                      <Input className="h-7 text-xs" value={item.note} onChange={e => updateItem(item.id, 'note', e.target.value)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* 합계 */}
        <Card className="mt-4">
          <CardContent className="p-4 sm:pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Label className="w-20 shrink-0">공과잡비</Label>
                  <NumInput className="h-10 w-20 text-right px-2" value={miscRate} onChange={v => setEstimate(prev => ({ ...prev, miscRate: v } as any))} />
                  <span className="text-sm shrink-0">%</span>
                  {miscRate > 0 && <span className="text-xs text-[var(--foreground-muted)]">({miscAmount.toLocaleString()}원)</span>}
                </div>
                <div className="flex items-center gap-2">
                  <Label className="w-20 shrink-0">할인</Label>
                  <NumInput className="h-10 text-right px-2" value={estimate.discount} onChange={v => setEstimate(prev => ({ ...prev, discount: v }))} />
                  <span className="text-sm shrink-0">원</span>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="w-20 shrink-0">부가세율</Label>
                  <NumInput className="h-10 w-20 text-right px-2" value={estimate.vatRate ?? 10} onChange={v => setEstimate(prev => ({ ...prev, vatRate: v }))} />
                  <span className="text-sm shrink-0">%</span>
                  <label className="flex items-center gap-1.5 ml-2 cursor-pointer">
                    <input type="checkbox" checked={estimate.includeVat !== false} onChange={e => setEstimate(prev => ({ ...prev, includeVat: e.target.checked }))} className="w-4 h-4 rounded accent-slate-800" />
                    <span className="text-sm">포함</span>
                  </label>
                </div>
              </div>
              <div className="bg-[var(--muted)] rounded-xl p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>자재비 소계</span><span>{materialTotal.toLocaleString()}원</span></div>
                  <div className="flex justify-between"><span>인건비 소계</span><span>{laborTotal.toLocaleString()}원</span></div>
                  {miscRate > 0 && (
                    <div className="flex justify-between"><span>공과잡비 ({miscRate}%)</span><span>{miscAmount.toLocaleString()}원</span></div>
                  )}
                  <div className="flex justify-between border-t pt-1"><span>공급가액</span><span>{subtotal.toLocaleString()}원</span></div>
                  {estimate.includeVat !== false && (
                    <div className="flex justify-between"><span>부가세 ({estimate.vatRate ?? 10}%)</span><span>{vatAmount.toLocaleString()}원</span></div>
                  )}
                  {estimate.discount > 0 && (
                    <div className="flex justify-between text-red-600"><span>할인</span><span>-{estimate.discount.toLocaleString()}원</span></div>
                  )}
                  <div className="border-t pt-2 flex justify-between font-bold text-lg">
                    <span>총 견적금액</span>
                    <span className="text-[var(--brand-primary)]">{total.toLocaleString()}원</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        </>)}

        {/* 공종 순서 편집 모달 */}
        {showCategoryOrderModal && (() => {
          // 현재 items에서 카테고리 추출 (등장 순서)
          const uniqueCats: string[] = [];
          estimate.items.forEach(item => {
            if (!uniqueCats.includes(item.category)) uniqueCats.push(item.category);
          });
          // categoryOrder가 있으면 그 순서 우선, 새로운 카테고리는 뒤에 추가
          const currentOrder = categoryOrder
            ? [...categoryOrder.filter(c => uniqueCats.includes(c)), ...uniqueCats.filter(c => !categoryOrder.includes(c))]
            : uniqueCats;

          const moveUp = (idx: number) => {
            if (idx === 0) return;
            const arr = [...currentOrder];
            [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
            setCategoryOrder(arr);
          };
          const moveDown = (idx: number) => {
            if (idx >= currentOrder.length - 1) return;
            const arr = [...currentOrder];
            [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
            setCategoryOrder(arr);
          };

          return (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCategoryOrderModal(false)}>
              <div className="bg-[var(--card)] rounded-2xl shadow-xl w-full max-w-sm max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="px-5 py-4 border-b flex items-center justify-between">
                  <h3 className="font-bold text-base">공종 순서 편집</h3>
                  <button onClick={() => setShowCategoryOrderModal(false)} className="p-1 rounded-lg hover:bg-[var(--muted)]">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-4 overflow-y-auto max-h-[60vh] space-y-1">
                  {currentOrder.map((cat, idx) => (
                    <div key={cat} className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[var(--muted)] hover:bg-slate-200 dark:hover:bg-slate-700">
                      <span className="text-xs font-bold text-[var(--foreground-muted)] w-5 text-center">{idx + 1}</span>
                      <span className="flex-1 text-sm font-medium truncate">{cat}</span>
                      <span className="text-xs text-[var(--foreground-muted)]">{estimate.items.filter(i => i.category === cat).length}건</span>
                      <button onClick={() => moveUp(idx)} disabled={idx === 0} className="p-1 rounded hover:bg-white dark:hover:bg-slate-600 disabled:opacity-20">
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button onClick={() => moveDown(idx)} disabled={idx >= currentOrder.length - 1} className="p-1 rounded hover:bg-white dark:hover:bg-slate-600 disabled:opacity-20">
                        <ArrowDown className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="px-5 py-4 border-t flex gap-2">
                  <button onClick={() => { setCategoryOrder(null); setShowCategoryOrderModal(false); }} className="flex-1 px-4 py-2.5 rounded-lg border text-sm hover:bg-[var(--muted)]">
                    기본값 초기화
                  </button>
                  <button onClick={() => { if (!categoryOrder) setCategoryOrder(currentOrder); setShowCategoryOrderModal(false); }} className="flex-1 px-4 py-2.5 rounded-lg bg-emerald-700 text-white text-sm font-bold hover:bg-emerald-800">
                    확인
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* 인쇄 미리보기 */}
        {printMode && (
          <PrintEstimate
            project={project}
            estimate={estimate}
            companyInfo={companyInfo}
            materialTotal={materialTotal}
            laborTotal={laborTotal}
            miscRate={miscRate}
            miscAmount={miscAmount}
            subtotal={subtotal}
            vatAmount={vatAmount}
            total={total}
            categoryOrder={categoryOrder}
            onClose={() => setPrintMode(false)}
          />
        )}
        </div>
      </main>
    </div>
  );
}

