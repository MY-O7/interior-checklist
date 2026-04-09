'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Plus, Trash2, ExternalLink, Edit2, X, ChevronDown, ChevronUp, Search, GripVertical } from 'lucide-react';

interface BrandLink {
  id: string;
  name: string;
  url: string;
  description?: string;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  brands: BrandLink[];
}

const STORAGE_KEY = 'interior-sample-data';

// 기본 데이터
const DEFAULT_DATA: Category[] = [
  {
    id: 'wallpaper', name: '벽지 (도배)', icon: '🖼️',
    brands: [
      { id: 'w1', name: 'LG하우시스 (지인)', url: 'https://www.lghausys.co.kr', description: '실크, 합지, 천연벽지' },
      { id: 'w2', name: '신한벽지', url: 'https://www.shinhanwall.co.kr', description: '실크, 합지, 디자인벽지' },
      { id: 'w3', name: '한화 인테리어', url: 'https://www.hanwhacorp.co.kr', description: '실크, 합지' },
      { id: 'w4', name: '개나리벽지', url: 'https://www.gaenari.co.kr', description: '실크, 합지, 포인트벽지' },
      { id: 'w5', name: '코스모스벽지', url: 'https://www.cosmoswallpaper.co.kr', description: '실크, 합지' },
      { id: 'w6', name: '벽산벽지', url: 'https://www.byucksan.com', description: '실크, 합지' },
      { id: 'w7', name: '성지벽지', url: 'https://www.sungjiwallpaper.co.kr', description: '실크, 합지, 천연소재' },
      { id: 'w8', name: '대한벽지', url: 'https://www.daehanwall.co.kr', description: '합지, 실크' },
      { id: 'w9', name: '삼보벽지', url: 'https://www.sambowall.co.kr', description: '합지, 실크' },
      { id: 'w10', name: '샘플창고 벽지', url: 'https://sample.bjchango.com/wallpaper', description: '벽지 통합 샘플' },
    ]
  },
  {
    id: 'tile', name: '타일', icon: '🧱',
    brands: [
      { id: 't1', name: '로얄세라믹스', url: 'https://www.royalceramics.co.kr', description: '바닥/벽 타일, 폴리싱' },
      { id: 't2', name: '한일타일', url: 'https://www.haniltile.co.kr', description: '바닥/벽, 외장 타일' },
      { id: 't3', name: '대동타일', url: 'https://www.daedong-tile.co.kr', description: '바닥/벽 타일' },
      { id: 't4', name: '동서타일', url: 'https://www.dongseotile.co.kr', description: '수입 타일, 모자이크' },
      { id: 't5', name: '과림타일', url: 'https://www.kwarim.co.kr', description: '수입 타일, 대형 타일' },
      { id: 't6', name: '아이에스동서', url: 'https://www.isdongseo.co.kr', description: '프리미엄 타일' },
      { id: 't7', name: '삼성타일', url: 'https://www.samsungtile.co.kr', description: '바닥/벽 타일' },
    ]
  },
  {
    id: 'floor', name: '마루 / 강마루', icon: '🪵',
    brands: [
      { id: 'f1', name: 'LG하우시스 (지인)', url: 'https://www.lghausys.co.kr', description: '강마루, 강화마루, 원목마루' },
      { id: 'f2', name: '동화자연마루', url: 'https://www.dwfloor.com', description: '강마루, 원목, 비닐마루' },
      { id: 'f3', name: 'KCC글라스', url: 'https://www.kccworld.co.kr', description: '강마루, 강화마루' },
      { id: 'f4', name: '동화 (종합)', url: 'https://www.dongwha.com', description: '마루, 보드, 건축자재' },
      { id: 'f5', name: '한화 인테리어', url: 'https://www.hanwhacorp.co.kr', description: '강마루, 비닐마루' },
    ]
  },
  {
    id: 'sheet', name: '장판 / 바닥재', icon: '📐',
    brands: [
      { id: 's1', name: 'LG하우시스 (지인)', url: 'https://www.lghausys.co.kr', description: '장판, 데코타일, 비닐' },
      { id: 's2', name: 'KCC글라스', url: 'https://www.kccworld.co.kr', description: '장판, 바닥시트' },
      { id: 's3', name: '한화 인테리어', url: 'https://www.hanwhacorp.co.kr', description: '장판, 바닥재' },
    ]
  },
  {
    id: 'film', name: '필름 (인테리어 필름)', icon: '🎞️',
    brands: [
      { id: 'fi1', name: 'LG하우시스 (벤이프)', url: 'https://www.lghausys.co.kr', description: '인테리어필름, 벤이프' },
      { id: 'fi2', name: '한화 인테리어 (보노)', url: 'https://www.hanwhacorp.co.kr', description: '인테리어필름, 보노' },
      { id: 'fi3', name: '현대엘앤씨', url: 'https://www.hyundailnc.com', description: '인테리어필름' },
      { id: 'fi4', name: '3M (다이녹)', url: 'https://www.3m.co.kr', description: '다이녹 필름' },
      { id: 'fi5', name: 'KCC글라스', url: 'https://www.kccworld.co.kr', description: '인테리어필름' },
    ]
  },
  {
    id: 'paint', name: '페인트', icon: '🎨',
    brands: [
      { id: 'p1', name: '노루페인트', url: 'https://www.noroopaint.com', description: '실내/외 페인트, 컬러 시뮬레이션' },
      { id: 'p2', name: 'KCC페인트', url: 'https://www.kccpaint.com', description: '실내/외 페인트' },
      { id: 'p3', name: '삼화페인트', url: 'https://www.samhwapaint.co.kr', description: '실내/외 페인트' },
      { id: 'p4', name: '벤자민무어', url: 'https://www.benjaminmoorekorea.co.kr', description: '프리미엄 수입 페인트' },
    ]
  },
  {
    id: 'bathroom', name: '욕실 / 위생도기', icon: '🚿',
    brands: [
      { id: 'b1', name: '대림바스', url: 'https://www.daelimbath.com', description: '욕실, 세면대, 양변기' },
      { id: 'b2', name: '로얄토토', url: 'https://www.royaltoto.com', description: '양변기, 세면대' },
      { id: 'b3', name: '아메리칸스탠다드', url: 'https://www.americanstandard.co.kr', description: '양변기, 세면대, 욕조' },
      { id: 'b4', name: '한샘', url: 'https://www.hanssem.com', description: '욕실 패키지, 세트' },
    ]
  },
  {
    id: 'kitchen', name: '주방 / 싱크대', icon: '🍳',
    brands: [
      { id: 'k1', name: '한샘', url: 'https://www.hanssem.com', description: '주방, 싱크대, 붙박이' },
      { id: 'k3', name: '에넥스', url: 'https://www.enex.co.kr', description: '주방, 싱크대, 수납' },
    ]
  },
  {
    id: 'window', name: '창호 / 샷시', icon: '🪟',
    brands: [
      { id: 'wi1', name: 'LG하우시스 (지인)', url: 'https://www.lghausys.co.kr', description: '창호, 시스템창' },
      { id: 'wi2', name: 'KCC글라스', url: 'https://www.kccworld.co.kr', description: '창호, 유리' },
      { id: 'wi3', name: '현대엘앤씨', url: 'https://www.hyundailnc.com', description: '창호' },
      { id: 'wi4', name: '한화 인테리어', url: 'https://www.hanwhacorp.co.kr', description: '창호, 시스템창' },
    ]
  },
  {
    id: 'lighting', name: '조명', icon: '💡',
    brands: [
      { id: 'l1', name: '필립스', url: 'https://www.philips.co.kr', description: 'LED, 스마트조명' },
      { id: 'l2', name: '시그니파이', url: 'https://www.signify.com/ko-kr', description: 'LED 조명 전문 (필립스 조명)' },
      { id: 'l3', name: 'LED조명나라', url: 'https://www.ledmall.co.kr', description: 'LED 전문' },
    ]
  },
  {
    id: 'molding', name: '몰딩 / 걸레받이', icon: '📏',
    brands: [
      { id: 'm1', name: 'LG하우시스', url: 'https://www.lghausys.co.kr', description: '몰딩, 걸레받이' },
      { id: 'm3', name: 'KCC글라스', url: 'https://www.kccworld.co.kr', description: '몰딩, 마감재' },
    ]
  },
  {
    id: 'furniture', name: '가구 / 붙박이', icon: '🪑',
    brands: [
      { id: 'fu1', name: '한샘', url: 'https://www.hanssem.com', description: '붙박이장, 드레스룸' },
      { id: 'fu3', name: '에넥스', url: 'https://www.enex.co.kr', description: '붙박이장, 수납장' },
      { id: 'fu4', name: '일룸', url: 'https://www.iloom.com', description: '가구, 수납' },
    ]
  },
  {
    id: 'etc', name: '기타 / 종합', icon: '🔗',
    brands: [
      { id: 'e1', name: '샘플창고 (종합)', url: 'https://sample.bjchango.com', description: '벽지/타일/마루/필름 통합 샘플' },
      { id: 'e2', name: '오늘의집', url: 'https://www.ohouse.com', description: '인테리어 레퍼런스, 시공사례' },
    ]
  }
];

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

export default function SamplesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [editingBrand, setEditingBrand] = useState<{ catId: string; brand: BrandLink } | null>(null);
  const [editForm, setEditForm] = useState({ name: '', url: '', description: '' });
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newBrand, setNewBrand] = useState({ name: '', url: '', description: '' });

  // 로드
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setCategories(JSON.parse(saved));
    } else {
      setCategories(DEFAULT_DATA);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_DATA));
    }
    // 전부 열기
    setExpandedCategories(new Set(DEFAULT_DATA.map(c => c.id)));
  }, []);

  const save = (data: Category[]) => {
    setCategories(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  const toggleCategory = (id: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpandedCategories(new Set(categories.map(c => c.id)));
  const collapseAll = () => setExpandedCategories(new Set());

  const startEditBrand = (catId: string, brand: BrandLink) => {
    setEditingBrand({ catId, brand });
    setEditForm({ name: brand.name, url: brand.url, description: brand.description || '' });
  };

  const saveEditBrand = () => {
    if (!editingBrand || !editForm.name || !editForm.url) return;
    const updated = categories.map(cat => {
      if (cat.id !== editingBrand.catId) return cat;
      return {
        ...cat,
        brands: cat.brands.map(b => b.id === editingBrand.brand.id
          ? { ...b, name: editForm.name, url: editForm.url, description: editForm.description || undefined }
          : b)
      };
    });
    save(updated);
    setEditingBrand(null);
  };

  const deleteBrand = (catId: string, brandId: string) => {
    if (!confirm('삭제하시겠습니까?')) return;
    const updated = categories.map(cat => {
      if (cat.id !== catId) return cat;
      return { ...cat, brands: cat.brands.filter(b => b.id !== brandId) };
    });
    save(updated);
  };

  const addBrand = (catId: string) => {
    if (!newBrand.name || !newBrand.url) return;
    const updated = categories.map(cat => {
      if (cat.id !== catId) return cat;
      return {
        ...cat,
        brands: [...cat.brands, { id: generateId(), name: newBrand.name, url: newBrand.url.startsWith('http') ? newBrand.url : 'https://' + newBrand.url, description: newBrand.description || undefined }]
      };
    });
    save(updated);
    setNewBrand({ name: '', url: '', description: '' });
    setAddingTo(null);
  };

  // 검색 필터
  const filtered = searchQuery.trim()
    ? categories.map(cat => ({
        ...cat,
        brands: cat.brands.filter(b =>
          b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (b.description || '').toLowerCase().includes(searchQuery.toLowerCase())
        )
      })).filter(cat => cat.brands.length > 0)
    : categories;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* 헤더 */}
      <div className="bg-white dark:bg-slate-800 border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')}>
              <ArrowLeft className="w-4 h-4 mr-1" /> 돌아가기
            </Button>
            <h1 className="text-lg font-bold">자재 샘플</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={expandAll} className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1">전체 열기</button>
            <button onClick={collapseAll} className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1">전체 접기</button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {/* 검색 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="브랜드명 또는 키워드 검색..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10 h-11"
          />
        </div>

        {/* 카테고리 목록 */}
        {filtered.map(cat => {
          const isExpanded = expandedCategories.has(cat.id);
          return (
            <Card key={cat.id} className="overflow-hidden">
              <button
                onClick={() => toggleCategory(cat.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700 transition text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{cat.icon}</span>
                  <div>
                    <span className="font-bold text-base">{cat.name}</span>
                    <span className="text-xs text-slate-400 ml-2">{cat.brands.length}개 브랜드</span>
                  </div>
                </div>
                {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
              </button>

              {isExpanded && (
                <CardContent className="p-0 border-t">
                  <div className="divide-y">
                    {cat.brands.map(brand => (
                      <div key={brand.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition group">
                        {/* 파비콘 */}
                        <img
                          src={`https://www.google.com/s2/favicons?domain=${new URL(brand.url).hostname}&sz=32`}
                          alt=""
                          className="w-6 h-6 rounded shrink-0"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                        {/* 브랜드 정보 */}
                        <div className="flex-1 min-w-0">
                          <a
                            href={brand.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-slate-800 dark:text-slate-200 hover:text-blue-600 transition flex items-center gap-1"
                          >
                            {brand.name}
                            <ExternalLink className="w-3 h-3 text-slate-300" />
                          </a>
                          {brand.description && (
                            <p className="text-xs text-slate-400 mt-0.5 truncate">{brand.description}</p>
                          )}
                        </div>
                        {/* 편집/삭제 */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                          <button onClick={() => startEditBrand(cat.id, brand)} className="p-1 hover:bg-slate-200 rounded">
                            <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                          </button>
                          <button onClick={() => deleteBrand(cat.id, brand.id)} className="p-1 hover:bg-red-100 rounded">
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* 추가 버튼 */}
                  {addingTo === cat.id ? (
                    <div className="p-4 border-t bg-slate-50 dark:bg-slate-800 space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        <Input placeholder="브랜드명 *" value={newBrand.name} onChange={e => setNewBrand({ ...newBrand, name: e.target.value })} className="h-9 text-sm" />
                        <Input placeholder="URL *" value={newBrand.url} onChange={e => setNewBrand({ ...newBrand, url: e.target.value })} className="h-9 text-sm" />
                        <Input placeholder="설명 (선택)" value={newBrand.description} onChange={e => setNewBrand({ ...newBrand, description: e.target.value })} className="h-9 text-sm" />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => addBrand(cat.id)} disabled={!newBrand.name || !newBrand.url}>추가</Button>
                        <Button size="sm" variant="outline" onClick={() => { setAddingTo(null); setNewBrand({ name: '', url: '', description: '' }); }}>취소</Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingTo(cat.id)}
                      className="w-full p-3 border-t text-sm text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition flex items-center justify-center gap-1"
                    >
                      <Plus className="w-4 h-4" /> 브랜드 추가
                    </button>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            검색 결과가 없습니다
          </div>
        )}
      </div>

      {/* 브랜드 편집 모달 */}
      {editingBrand && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setEditingBrand(null)}>
          <Card className="w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">브랜드 편집</h3>
                <button onClick={() => setEditingBrand(null)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-500">브랜드명</label>
                  <Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="mt-1 h-10" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">URL</label>
                  <Input value={editForm.url} onChange={e => setEditForm({ ...editForm, url: e.target.value })} className="mt-1 h-10" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">설명</label>
                  <Input value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} className="mt-1 h-10" />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1 h-10" onClick={() => setEditingBrand(null)}>취소</Button>
                <Button className="flex-1 h-10" onClick={saveEditBrand} disabled={!editForm.name || !editForm.url}>저장</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
