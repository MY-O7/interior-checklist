'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, Trash2, Save, ChevronUp, ChevronDown, Edit2, Check, X } from 'lucide-react';
import { MobileMenuButton, SidebarWrapper } from '@/components/mobile-menu';

interface ChecklistSection {
  id: string;
  title: string;
  subtitle: string;
  order: number;
  items: ChecklistItem[];
}

interface ChecklistItem {
  id: string;
  name: string;
  options: string[];
  hasInput: boolean;
  placeholder: string;
  badge: 'high' | 'req' | 'opt' | null;
  order: number;
}

const DEFAULT_SECTIONS: ChecklistSection[] = [
  {
    id: '1',
    title: '확장 및 철거 공사',
    subtitle: 'Expansion & Demolition',
    order: 1,
    items: [
      { id: '1-1', name: '확장 여부', options: ['기존 확장 상태 확인', '신규 확장'], hasInput: true, placeholder: '시공 구역', badge: null, order: 1 },
      { id: '1-2', name: '바닥 철거', options: ['강마루', '강화마루', '장판', '타일', '데코타일'], hasInput: true, placeholder: '철거 범위', badge: null, order: 2 },
      { id: '1-3', name: '내부 철거', options: ['아트월', '알판', '몰딩', '문·문틀', '등박스', '화단'], hasInput: false, placeholder: '', badge: null, order: 3 },
    ],
  },
  {
    id: '2',
    title: '바닥재 시공',
    subtitle: 'Flooring',
    order: 2,
    items: [
      { id: '2-1', name: '마루 시공', options: ['강마루', '합판마루', '원목마루'], hasInput: true, placeholder: '시공 구역', badge: null, order: 1 },
      { id: '2-2', name: '타일 시공', options: ['600×600', '1200×600', '600×1200'], hasInput: true, placeholder: '시공 구역', badge: null, order: 2 },
      { id: '2-3', name: '장판 시공', options: ['1.8T', '2.5T', '3.0T'], hasInput: true, placeholder: '시공 구역', badge: null, order: 3 },
    ],
  },
  {
    id: '3',
    title: '욕실 공사',
    subtitle: 'Bathroom',
    order: 3,
    items: [
      { id: '3-1', name: '철거 방식', options: ['올철거', '덧방'], hasInput: false, placeholder: '', badge: null, order: 1 },
      { id: '3-2', name: '시공 항목', options: ['젠다이', '욕조', '파티션', '샤워부스', '환풍기'], hasInput: false, placeholder: '', badge: null, order: 2 },
      { id: '3-3', name: '젠다이 사이즈', options: [], hasInput: true, placeholder: 'mm 단위', badge: null, order: 3 },
    ],
  },
];

export default function ChecklistEditorPage() {
  const router = useRouter();
  const [sections, setSections] = useState<ChecklistSection[]>([]);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('checklist-template');
    if (saved) {
      setSections(JSON.parse(saved));
    } else {
      setSections(DEFAULT_SECTIONS);
      localStorage.setItem('checklist-template', JSON.stringify(DEFAULT_SECTIONS));
    }
  }, []);

  const saveTemplate = () => {
    setSaving(true);
    localStorage.setItem('checklist-template', JSON.stringify(sections));
    setTimeout(() => setSaving(false), 500);
  };

  const resetToDefault = () => {
    if (confirm('기본값으로 초기화하시겠습니까?')) {
      setSections(DEFAULT_SECTIONS);
      localStorage.setItem('checklist-template', JSON.stringify(DEFAULT_SECTIONS));
    }
  };

  // 섹션 관리
  const addSection = () => {
    const newSection: ChecklistSection = {
      id: Date.now().toString(),
      title: '새 섹션',
      subtitle: 'New Section',
      order: sections.length + 1,
      items: [],
    };
    setSections([...sections, newSection]);
  };

  const updateSection = (id: string, field: keyof ChecklistSection, value: any) => {
    setSections(sections.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const deleteSection = (id: string) => {
    if (confirm('이 섹션을 삭제하시겠습니까?')) {
      setSections(sections.filter(s => s.id !== id));
    }
  };

  const moveSection = (id: string, direction: 'up' | 'down') => {
    const idx = sections.findIndex(s => s.id === id);
    if (direction === 'up' && idx > 0) {
      const newSections = [...sections];
      [newSections[idx - 1], newSections[idx]] = [newSections[idx], newSections[idx - 1]];
      setSections(newSections);
    } else if (direction === 'down' && idx < sections.length - 1) {
      const newSections = [...sections];
      [newSections[idx], newSections[idx + 1]] = [newSections[idx + 1], newSections[idx]];
      setSections(newSections);
    }
  };

  // 항목 관리
  const addItem = (sectionId: string) => {
    const newItem: ChecklistItem = {
      id: Date.now().toString(),
      name: '새 항목',
      options: [],
      hasInput: false,
      placeholder: '',
      badge: null,
      order: 0,
    };
    setSections(sections.map(s => s.id === sectionId ? { ...s, items: [...s.items, newItem] } : s));
  };

  const updateItem = (sectionId: string, itemId: string, field: keyof ChecklistItem, value: any) => {
    setSections(sections.map(s => {
      if (s.id !== sectionId) return s;
      return {
        ...s,
        items: s.items.map(i => i.id === itemId ? { ...i, [field]: value } : i),
      };
    }));
  };

  const deleteItem = (sectionId: string, itemId: string) => {
    setSections(sections.map(s => {
      if (s.id !== sectionId) return s;
      return { ...s, items: s.items.filter(i => i.id !== itemId) };
    }));
  };

  return (
    <div className="min-h-screen flex bg-[var(--background)]">
      <MobileMenuButton isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      
      <SidebarWrapper isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)}>
      {/* 사이드바 */}
      <div className="w-64 bg-[var(--card)] flex flex-col h-full">
        <div className="p-4 border-b">
          <button onClick={() => router.push('/dashboard')} className="flex items-center gap-2 text-sm text-[var(--foreground-muted)] hover:text-[var(--brand-primary)] mb-2">
            <ArrowLeft className="w-4 h-4" /> 대시보드
          </button>
          <h1 className="font-bold text-[var(--brand-primary)]">체크리스트 편집</h1>
          <p className="text-xs text-[var(--foreground-muted)]">관리자 전용</p>
        </div>

        <nav className="flex-1 p-2 overflow-y-auto">
          <div className="text-xs text-[var(--foreground-muted)] px-2 mb-2">섹션 목록</div>
          {sections.map((section, idx) => (
            <a
              key={section.id}
              href={`#section-${section.id}`}
              onClick={() => setSidebarOpen(false)}
              className="block px-3 py-2 rounded-lg hover:bg-[var(--muted)] text-sm truncate"
            >
              {idx + 1}. {section.title || '(제목 없음)'}
            </a>
          ))}
        </nav>

        <div className="p-3 border-t space-y-1">
          <button onClick={saveTemplate} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[var(--muted)] text-sm">
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
          <h2 className="text-2xl font-bold">체크리스트 항목 편집</h2>
          <Button onClick={addSection}>
            <Plus className="w-4 h-4 mr-2" /> 섹션 추가
          </Button>
        </div>

        <div className="space-y-6">
          {sections.map((section, sectionIdx) => (
            <Card key={section.id} id={`section-${section.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  {editingSection === section.id ? (
                    <div className="flex-1 grid grid-cols-2 gap-2 mr-4">
                      <Input
                        value={section.title}
                        onChange={(e) => updateSection(section.id, 'title', e.target.value)}
                        placeholder="섹션명"
                      />
                      <Input
                        value={section.subtitle}
                        onChange={(e) => updateSection(section.id, 'subtitle', e.target.value)}
                        placeholder="영문 부제"
                      />
                    </div>
                  ) : (
                    <CardTitle className="flex items-center gap-2">
                      <span className="text-[var(--brand-primary)]">{String(sectionIdx + 1).padStart(2, '0')}</span>
                      {section.title}
                      <span className="text-xs font-normal text-[var(--muted-foreground)]">{section.subtitle}</span>
                    </CardTitle>
                  )}
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => moveSection(section.id, 'up')} disabled={sectionIdx === 0}>
                      <ChevronUp className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => moveSection(section.id, 'down')} disabled={sectionIdx === sections.length - 1}>
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                    {editingSection === section.id ? (
                      <Button variant="ghost" size="sm" onClick={() => setEditingSection(null)}>
                        <Check className="w-4 h-4 text-green-500" />
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => setEditingSection(section.id)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => deleteSection(section.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {section.items.map((item) => (
                    <div key={item.id} className="border rounded-lg p-3">
                      {editingItem === item.id ? (
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                          <div>
                            <Label className="text-xs">항목명</Label>
                            <Input className="h-8" value={item.name} onChange={(e) => updateItem(section.id, item.id, 'name', e.target.value)} />
                          </div>
                          <div className="md:col-span-2">
                            <Label className="text-xs">옵션 (쉼표로 구분)</Label>
                            <Input className="h-8" value={item.options.join(', ')} onChange={(e) => updateItem(section.id, item.id, 'options', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} placeholder="옵션1, 옵션2" />
                          </div>
                          <div>
                            <Label className="text-xs">입력필드</Label>
                            <select className="w-full h-8 px-2 border rounded text-sm" value={item.hasInput ? 'yes' : 'no'} onChange={(e) => updateItem(section.id, item.id, 'hasInput', e.target.value === 'yes')}>
                              <option value="no">없음</option>
                              <option value="yes">있음</option>
                            </select>
                          </div>
                          <div>
                            <Label className="text-xs">플레이스홀더</Label>
                            <Input className="h-8" value={item.placeholder} onChange={(e) => updateItem(section.id, item.id, 'placeholder', e.target.value)} />
                          </div>
                          <div className="flex items-end gap-1">
                            <select className="h-8 px-2 border rounded text-sm" value={item.badge || ''} onChange={(e) => updateItem(section.id, item.id, 'badge', e.target.value || null)}>
                              <option value="">뱃지 없음</option>
                              <option value="high">하이엔드</option>
                              <option value="req">필수</option>
                              <option value="opt">선택</option>
                            </select>
                            <Button variant="ghost" size="sm" onClick={() => setEditingItem(null)}>
                              <Check className="w-4 h-4 text-green-500" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{item.name}</span>
                            {item.badge && (
                              <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                                item.badge === 'high' ? 'bg-yellow-100 text-yellow-800' :
                                item.badge === 'req' ? 'bg-green-100 text-green-800' :
                                'bg-indigo-100 text-indigo-800'
                              }`}>
                                {item.badge === 'high' ? '하이엔드' : item.badge === 'req' ? '필수' : '선택'}
                              </span>
                            )}
                            {item.options.length > 0 && (
                              <span className="text-xs text-[var(--muted-foreground)]">
                                [{item.options.join(', ')}]
                              </span>
                            )}
                            {item.hasInput && (
                              <span className="text-xs text-[var(--muted-foreground)]">
                                입력: {item.placeholder || '-'}
                              </span>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => setEditingItem(item.id)}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => deleteItem(section.id, item.id)}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => addItem(section.id)}>
                    <Plus className="w-4 h-4 mr-1" /> 항목 추가
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
