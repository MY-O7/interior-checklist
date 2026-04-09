'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, Trash2, Save, Edit2, Check } from 'lucide-react';
import { MobileMenuButton, SidebarWrapper } from '@/components/mobile-menu';

interface Material {
  id: string;
  category: string;
  name: string;
  unit: string;
  unitPrice: number;
}

const CATEGORIES = ['바닥재', '타일', '필름', '도배', '욕실', '목공', '전기', '조명', '가구', '창호', '기타'];

const DEFAULT_MATERIALS: Material[] = [
  { id: '1', category: '바닥재', name: '강마루 (평당)', unit: '평', unitPrice: 80000 },
  { id: '2', category: '바닥재', name: '합판마루 (평당)', unit: '평', unitPrice: 120000 },
  { id: '3', category: '바닥재', name: '원목마루 (평당)', unit: '평', unitPrice: 200000 },
  { id: '4', category: '바닥재', name: '장판 (평당)', unit: '평', unitPrice: 30000 },
  { id: '5', category: '타일', name: '포세린 600x600 (평당)', unit: '평', unitPrice: 100000 },
  { id: '6', category: '타일', name: '포세린 1200x600 (평당)', unit: '평', unitPrice: 130000 },
  { id: '7', category: '필름', name: '필름 시공 (평당)', unit: '평', unitPrice: 50000 },
  { id: '8', category: '도배', name: '합지 도배 (평당)', unit: '평', unitPrice: 25000 },
  { id: '9', category: '도배', name: '실크 도배 (평당)', unit: '평', unitPrice: 40000 },
  { id: '10', category: '욕실', name: '화장실 올철거', unit: '실', unitPrice: 2000000 },
  { id: '11', category: '욕실', name: '화장실 덧방', unit: '실', unitPrice: 1500000 },
  { id: '12', category: '욕실', name: '젠다이 시공', unit: '개', unitPrice: 300000 },
  { id: '13', category: '욕실', name: '욕조 설치', unit: '개', unitPrice: 500000 },
  { id: '14', category: '욕실', name: '샤워부스 설치', unit: '개', unitPrice: 400000 },
  { id: '15', category: '목공', name: '에어컨 단내림', unit: '개', unitPrice: 200000 },
  { id: '16', category: '목공', name: '천장 평탄화', unit: '평', unitPrice: 50000 },
  { id: '17', category: '목공', name: '문 교체', unit: '개', unitPrice: 300000 },
  { id: '18', category: '목공', name: '문틀 교체', unit: '개', unitPrice: 150000 },
  { id: '19', category: '목공', name: '스텝도어', unit: '개', unitPrice: 800000 },
  { id: '20', category: '목공', name: '히든도어', unit: '개', unitPrice: 1200000 },
  { id: '21', category: '전기', name: '콘센트 추가', unit: '개', unitPrice: 50000 },
  { id: '22', category: '전기', name: '스위치 교체', unit: '개', unitPrice: 30000 },
  { id: '23', category: '전기', name: '일괄 소등 설치', unit: '식', unitPrice: 200000 },
  { id: '24', category: '조명', name: '다운라이트', unit: '개', unitPrice: 40000 },
  { id: '25', category: '조명', name: '마그네틱 레일 (1m)', unit: 'm', unitPrice: 150000 },
  { id: '26', category: '조명', name: '실링팬', unit: '개', unitPrice: 300000 },
  { id: '27', category: '가구', name: '신발장', unit: '개', unitPrice: 500000 },
  { id: '28', category: '가구', name: '붙박이장', unit: '개', unitPrice: 2000000 },
  { id: '29', category: '가구', name: '아일랜드 싱크대', unit: '개', unitPrice: 3000000 },
  { id: '30', category: '창호', name: '폴딩도어', unit: '개', unitPrice: 500000 },
  { id: '31', category: '창호', name: '샷시 교체', unit: '개', unitPrice: 400000 },
  { id: '32', category: '기타', name: '번호키 (도어락)', unit: '개', unitPrice: 200000 },
  { id: '33', category: '기타', name: '입주 청소', unit: '건', unitPrice: 300000 },
];

export default function MaterialsPage() {
  const router = useRouter();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [filter, setFilter] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('materials');
    if (saved) {
      setMaterials(JSON.parse(saved));
    } else {
      setMaterials(DEFAULT_MATERIALS);
      localStorage.setItem('materials', JSON.stringify(DEFAULT_MATERIALS));
    }
  }, []);

  const saveMaterials = () => {
    setSaving(true);
    localStorage.setItem('materials', JSON.stringify(materials));
    setTimeout(() => setSaving(false), 500);
  };

  const resetToDefault = () => {
    if (confirm('기본값으로 초기화하시겠습니까?')) {
      setMaterials(DEFAULT_MATERIALS);
      localStorage.setItem('materials', JSON.stringify(DEFAULT_MATERIALS));
    }
  };

  const addMaterial = () => {
    const newMaterial: Material = {
      id: Date.now().toString(),
      category: '기타',
      name: '',
      unit: '개',
      unitPrice: 0,
    };
    setMaterials([...materials, newMaterial]);
    setEditingId(newMaterial.id);
  };

  const updateMaterial = (id: string, field: keyof Material, value: any) => {
    setMaterials(materials.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const deleteMaterial = (id: string) => {
    setMaterials(materials.filter(m => m.id !== id));
  };

  const filteredMaterials = filter
    ? materials.filter(m => m.category === filter)
    : materials;

  return (
    <div className="min-h-screen flex bg-[var(--background)]">
      <MobileMenuButton isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      
      <SidebarWrapper isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)}>
      <div className="w-64 flex flex-col h-full">
        <div className="p-4 border-b">
          <button onClick={() => router.push('/dashboard')} className="flex items-center gap-2 text-sm text-[var(--foreground-muted)] hover:text-[var(--brand-primary)] mb-2">
            <ArrowLeft className="w-4 h-4" /> 대시보드
          </button>
          <h1 className="font-bold text-[var(--brand-primary)]">자재 단가 관리</h1>
          <p className="text-xs text-[var(--foreground-muted)]">관리자 전용</p>
        </div>

        <nav className="flex-1 p-2 overflow-y-auto">
          <div className="text-xs text-[var(--foreground-muted)] px-2 mb-2">카테고리 필터</div>
          <button
            onClick={() => { setFilter(''); setSidebarOpen(false); }}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 ${!filter ? 'bg-[var(--brand-primary)] text-white' : 'hover:bg-[var(--muted)]'}`}
          >
            전체 ({materials.length})
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => { setFilter(cat); setSidebarOpen(false); }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 ${filter === cat ? 'bg-[var(--brand-primary)] text-white' : 'hover:bg-[var(--muted)]'}`}
            >
              {cat} ({materials.filter(m => m.category === cat).length})
            </button>
          ))}
        </nav>

        <div className="p-3 border-t space-y-1">
          <button onClick={saveMaterials} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[var(--muted)] text-sm">
            <Save className="w-4 h-4" /> 저장 {saving && '✓'}
          </button>
          <button onClick={resetToDefault} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 text-sm">
            초기화
          </button>
        </div>
      </div>
      </SidebarWrapper>

      {/* 메인 */}
      <main className="flex-1 p-4 sm:p-6 overflow-y-auto pt-16 md:pt-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">자재 단가 관리</h2>
          <Button onClick={addMaterial}>
            <Plus className="w-4 h-4 mr-2" /> 자재 추가
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[var(--muted)]">
                  <tr>
                    <th className="p-3 text-left">카테고리</th>
                    <th className="p-3 text-left">자재명</th>
                    <th className="p-3 text-center">단위</th>
                    <th className="p-3 text-right">단가 (원)</th>
                    <th className="p-3 text-center w-24">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMaterials.map((material) => (
                    <tr key={material.id} className="border-b">
                      <td className="p-3">
                        {editingId === material.id ? (
                          <select
                            className="w-full h-8 px-2 border rounded"
                            value={material.category}
                            onChange={(e) => updateMaterial(material.id, 'category', e.target.value)}
                          >
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        ) : (
                          <span className="px-2 py-1 bg-[var(--muted)] rounded text-xs">{material.category}</span>
                        )}
                      </td>
                      <td className="p-3">
                        {editingId === material.id ? (
                          <Input
                            className="h-8"
                            value={material.name}
                            onChange={(e) => updateMaterial(material.id, 'name', e.target.value)}
                            placeholder="자재명"
                          />
                        ) : (
                          material.name || '-'
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {editingId === material.id ? (
                          <Input
                            className="h-8 w-16 text-center mx-auto"
                            value={material.unit}
                            onChange={(e) => updateMaterial(material.id, 'unit', e.target.value)}
                            placeholder="단위"
                          />
                        ) : (
                          material.unit
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {editingId === material.id ? (
                          <Input
                            className="h-8 w-32 ml-auto text-right"
                            type="number"
                            value={material.unitPrice}
                            onChange={(e) => updateMaterial(material.id, 'unitPrice', Number(e.target.value))}
                          />
                        ) : (
                          material.unitPrice.toLocaleString()
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex justify-center gap-1">
                          {editingId === material.id ? (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                                <Check className="w-4 h-4 text-green-500" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => deleteMaterial(material.id)}>
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => setEditingId(material.id)}>
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => deleteMaterial(material.id)}>
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredMaterials.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-[var(--muted-foreground)]">
                        자재가 없습니다
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
