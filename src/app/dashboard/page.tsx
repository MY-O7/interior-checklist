'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MobileMenuButton, SidebarWrapper } from '@/components/mobile-menu';
import { Plus, FolderOpen, Trash2, Moon, Sun, Settings, LogOut, FileText, Calculator, ChevronRight, ChevronDown, ChevronUp, Calendar, User, MapPin, Menu, Search, Ruler, Edit2, ClipboardList, Palette, Share2, X, UserPlus, ExternalLink } from 'lucide-react';
import { useTheme } from '@/lib/theme';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import { CalendarView } from '@/components/dashboard/calendar-view';

interface Project {
  id: string;
  name: string;
  clientName: string | null;
  address: string | null;
  status: string;
  createdAt: string;
  ownerName?: string;
  ownership?: 'mine' | 'shared' | 'other';
}

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState<User | null>(null);

  const validTabs = ['projects', 'estimates', 'calendar', 'notice', 'samples', 'settings'] as const;
  type Tab = typeof validTabs[number];
  const tabFromUrl = searchParams.get('tab') as Tab | null;
  const [activeTab, setActiveTab] = useState<Tab>(tabFromUrl && validTabs.includes(tabFromUrl) ? tabFromUrl : 'projects');

  const switchTab = useCallback((tab: Tab) => {
    setActiveTab(tab);
    router.replace(`/dashboard?tab=${tab}`, { scroll: false });
  }, [router]);

  // URL 변경 시 (뒤로가기/앞으로가기) 탭 동기화
  useEffect(() => {
    const t = searchParams.get('tab') as Tab | null;
    if (t && validTabs.includes(t) && t !== activeTab) {
      setActiveTab(t);
    }
  }, [searchParams]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', clientName: '', address: '' });
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 프로젝트 수정
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editForm, setEditForm] = useState({ name: '', clientName: '', address: '', status: '' });

  // 설정: 이름 수정
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');

  // 설정: 유저 관리
  const [allUsers, setAllUsers] = useState<{ id: string; email: string; name: string; role: string; createdAt: string; projects?: { id: string; name: string; status: string; createdAt: string }[] }[]>([]);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  // 공유 관리
  const [sharingProject, setSharingProject] = useState<Project | null>(null);
  const [shares, setShares] = useState<{ id: string; user: { id: string; email: string; name: string } }[]>([]);
  const [shareEmail, setShareEmail] = useState('');
  const [shareError, setShareError] = useState('');
  const [shareLoading, setShareLoading] = useState(false);

  useEffect(() => {
    // 사용자 확인
    apiPost('/api/auth', { action: 'me' })
      .then(data => {
        if (!data.user) {
          router.push('/login');
        } else {
          setUser(data.user);
          loadProjects();
        }
      });
  }, [router]);

  const loadProjects = async () => {
    try {
      const data = await apiGet('/api/projects');
      setProjects(data.projects || []);
    } catch (e) {
      console.error('Failed to load projects:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await apiPost('/api/auth', { action: 'logout' });
    router.push('/login');
  };

  const createProject = async () => {
    if (!newProject.name) return;
    
    try {
      const data = await apiPost('/api/projects', newProject);
      if (data.project) {
        setProjects([data.project, ...projects]);
        setNewProject({ name: '', clientName: '', address: '' });
        setShowNewProject(false);
      }
    } catch (e) {
      console.error('Failed to create project:', e);
    }
  };

  const deleteProject = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    
    try {
      await apiDelete(`/api/projects/${id}`);
      setProjects(projects.filter(p => p.id !== id));
    } catch (e) {
      console.error('Failed to delete project:', e);
    }
  };

  const openProject = (project: Project, type: 'checklist' | 'estimate') => {
    router.push(type === 'checklist' ? `/project/${project.id}` : `/estimate/${project.id}`);
  };

  const startEditProject = (project: Project) => {
    setEditingProject(project);
    setEditForm({ name: project.name, clientName: project.clientName || '', address: project.address || '', status: project.status });
  };

  const saveEditProject = async () => {
    if (!editingProject || !editForm.name) return;
    try {
      const data = await apiPatch(`/api/projects/${editingProject.id}`, editForm);
      if (data.project) {
        setProjects(projects.map(p => p.id === editingProject.id ? { ...p, ...editForm } : p));
      }
      setEditingProject(null);
    } catch (e) {
      console.error('Failed to update project:', e);
    }
  };

  const updateMyName = async () => {
    if (!newName.trim()) return;
    try {
      const data = await apiPost('/api/auth', { action: 'updateName', name: newName.trim() });
      if (data.user) { setUser(data.user); setEditingName(false); }
    } catch (e) { console.error(e); }
  };

  const loadUsers = async () => {
    try {
      const data = await apiPost('/api/auth', { action: 'listUsers' });
      if (data.users) { setAllUsers(data.users); setUsersLoaded(true); }
    } catch (e) { console.error(e); }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('이 계정을 삭제하시겠습니까?')) return;
    try {
      await apiPost('/api/auth', { action: 'deleteUser', userId });
      setAllUsers(allUsers.filter(u => u.id !== userId));
    } catch (e) { console.error(e); }
  };

  const toggleUserRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
    try {
      const data = await apiPost('/api/auth', { action: 'updateUserRole', userId, role: newRole });
      if (data.user) setAllUsers(allUsers.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (e) { console.error(e); }
  };

  const openShareModal = async (project: Project) => {
    setSharingProject(project);
    setShareEmail('');
    setShareError('');
    try {
      const data = await apiGet(`/api/projects/${project.id}/shares`);
      setShares(data.shares || []);
    } catch { setShares([]); }
  };

  const addShare = async () => {
    if (!sharingProject || !shareEmail.trim()) return;
    setShareLoading(true);
    setShareError('');
    try {
      const data = await apiPost(`/api/projects/${sharingProject.id}/shares`, { email: shareEmail.trim() });
      if (data.share) {
        setShares([data.share, ...shares]);
        setShareEmail('');
      } else {
        setShareError(data.error || '공유 실패');
      }
    } catch { setShareError('서버 오류'); }
    setShareLoading(false);
  };

  const removeShare = async (shareId: string) => {
    if (!sharingProject) return;
    try {
      await apiDelete(`/api/projects/${sharingProject.id}/shares`, { shareId });
      setShares(shares.filter(s => s.id !== shareId));
    } catch { console.error('Failed to remove share'); }
  };

  const navItems = [
    { id: 'projects', icon: FolderOpen, label: '프로젝트 목록' },
    { id: 'estimates', icon: Calculator, label: '견적서 관리' },
    { id: 'calendar', icon: Calendar, label: '캘린더' },
    { id: 'notice', icon: ClipboardList, label: '공사 안내문' },
    { id: 'samples', icon: Palette, label: '자재 샘플' },
    { id: 'settings', icon: Settings, label: '설정' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-slate-400">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-slate-50 dark:bg-slate-900 overflow-x-hidden">
      
      <SidebarWrapper isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)}>
        <div className="w-72 flex flex-col h-full bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 shrink-0">
          {/* Logo + Brand */}
          <div className="p-5 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-4">
              <img src="/logo.png" alt="SOMSSI" className="w-12 h-12 object-contain" />
              <div>
                <div className="text-[10px] font-bold tracking-[3px] text-slate-400 uppercase">SOMSSI INTERIOR</div>
                <h1 className="text-lg font-bold text-slate-800 dark:text-white">시공 관리</h1>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => { switchTab(item.id as Tab); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  activeTab === item.id 
                    ? 'bg-slate-800 text-white dark:bg-slate-700' 
                    : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </button>
            ))}
          </nav>

          {/* 외부 링크 */}
          <div className="px-4 pb-2 space-y-1">
            <a href="https://blog.naver.com/nm4710" target="_blank" rel="noopener noreferrer"
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-all">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M16.273 12.845 7.376 0H0v24h7.726V11.156L16.624 24H24V0h-7.727v12.845Z"/></svg>
              네이버 블로그
              <ExternalLink className="w-3.5 h-3.5 ml-auto opacity-40" />
            </a>
            <a href="https://www.instagram.com/somssi.interior/" target="_blank" rel="noopener noreferrer"
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-all">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              인스타그램
              <ExternalLink className="w-3.5 h-3.5 ml-auto opacity-40" />
            </a>
          </div>

          {/* User */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#CD363A] to-rose-600 flex items-center justify-center text-white font-medium shrink-0">
                {user?.name?.[0] || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <p className="text-xs text-slate-400">{user?.role === 'ADMIN' ? '관리자' : '사용자'}</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button onClick={toggleTheme} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all text-sm">
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
              </button>
              <button onClick={handleLogout} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-900/20 transition-all text-sm">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </SidebarWrapper>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="h-14 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center px-4 md:hidden sticky top-0 z-10 shrink-0">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="메뉴"><Menu className="w-5 h-5 text-slate-600 dark:text-slate-300" /></button>
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300 ml-2">{navItems.find(n => n.id === activeTab)?.label}</span>
        </header>
        <div className="flex-1 p-4 sm:p-6 md:p-8">
        {activeTab === 'projects' && (
          <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold">프로젝트 목록</h2>
                <p className="text-sm text-slate-400 mt-1">
                  총 {projects.length}개의 프로젝트
                  {user?.role === 'ADMIN' && <span className="ml-2 text-[#CD363A]">(전체 조회)</span>}
                  {user?.role !== 'ADMIN' && projects.some(p => p.ownership === 'shared') && (
                    <span className="ml-2 text-purple-500">(공유 {projects.filter(p => p.ownership === 'shared').length}개 포함)</span>
                  )}
                </p>
              </div>
              <Button onClick={() => setShowNewProject(true)} className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" /> 새 프로젝트
              </Button>
            </div>

            {/* 검색 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="프로젝트명, 고객명, 주소 검색..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 h-11"
              />
            </div>

            {showNewProject && (
              <Card>
                <CardContent className="p-4 sm:p-6 space-y-4">
                  <h3 className="font-semibold">새 프로젝트 생성</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>프로젝트명 *</Label>
                      <Input value={newProject.name} onChange={(e) => setNewProject({ ...newProject, name: e.target.value })} placeholder="래미안 84평" className="h-12 text-base" />
                    </div>
                    <div className="space-y-2">
                      <Label>고객명</Label>
                      <Input value={newProject.clientName} onChange={(e) => setNewProject({ ...newProject, clientName: e.target.value })} placeholder="홍길동" className="h-12 text-base" />
                    </div>
                    <div className="space-y-2">
                      <Label>주소</Label>
                      <Input value={newProject.address} onChange={(e) => setNewProject({ ...newProject, address: e.target.value })} placeholder="화성시 반월동" className="h-12 text-base" />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setShowNewProject(false)}>취소</Button>
                    <Button onClick={createProject}>생성</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {projects.filter(p => {
                if (!searchQuery.trim()) return true;
                const q = searchQuery.toLowerCase();
                return (p.name?.toLowerCase().includes(q)) || (p.clientName?.toLowerCase().includes(q)) || (p.address?.toLowerCase().includes(q));
              }).map((project) => (
                <Card key={project.id} className="hover:shadow-lg transition-all">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base sm:text-lg">{project.name}</h3>
                        <div className="flex items-center gap-2 mt-1 text-sm text-slate-400">
                          <User className="w-3.5 h-3.5 shrink-0" />
                          <span>{project.clientName || '-'}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          project.status === '진행중' ? 'bg-blue-100 text-blue-700' :
                          project.status === '완료' ? 'bg-green-100 text-green-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {project.status}
                        </span>
                        {project.ownership === 'shared' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 text-purple-700">
                            공유 · {project.ownerName}
                          </span>
                        )}
                        {project.ownership === 'other' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700">
                            {project.ownerName}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm text-slate-500 mb-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                        <span>{project.address || '주소 미입력'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                        <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1 h-10" onClick={() => openProject(project, 'checklist')}>
                          <FileText className="w-4 h-4 mr-1.5 shrink-0" /> 체크리스트
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1 h-10" onClick={() => openProject(project, 'estimate')}>
                          <Calculator className="w-4 h-4 mr-1.5 shrink-0" /> 견적서
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1 h-10" onClick={() => router.push(`/measurement/${project.id}`)}>
                          <Ruler className="w-4 h-4 mr-1.5 shrink-0" /> 실측
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1 h-10" onClick={() => startEditProject(project)}>
                          <Edit2 className="w-4 h-4 mr-1.5 shrink-0" /> 수정
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openShareModal(project)} className="h-10 px-3" title="공유">
                          <Share2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteProject(project.id)} className="text-red-500 hover:bg-red-50 h-10 px-3">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {projects.length === 0 && !showNewProject && (
              <Card className="py-12 sm:py-16">
                <CardContent className="text-center">
                  <FolderOpen className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <p className="text-lg font-medium mb-1">프로젝트가 없습니다</p>
                  <p className="text-sm text-slate-400 mb-4">새 프로젝트를 생성하여 시작하세요</p>
                  <Button onClick={() => setShowNewProject(true)}>
                    <Plus className="w-4 h-4 mr-2" /> 프로젝트 생성
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'estimates' && (
          <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
            <h2 className="text-xl sm:text-2xl font-bold">견적서 관리</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((project) => (
                <Card key={project.id} className="hover:shadow-md transition-all cursor-pointer" onClick={() => openProject(project, 'estimate')}>
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold truncate">{project.name}</h3>
                          {project.ownership === 'shared' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 text-purple-700 shrink-0">공유 · {project.ownerName}</span>
                          )}
                          {project.ownership === 'other' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700 shrink-0">{project.ownerName}</span>
                          )}
                        </div>
                        <p className="text-sm text-slate-400 mt-1 truncate">{project.clientName} · {project.address}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-300 shrink-0 ml-2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
            <h2 className="text-xl sm:text-2xl font-bold">캘린더</h2>
            <CalendarView />
          </div>
        )}

        {activeTab === 'notice' && (
          <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
            <h2 className="text-xl sm:text-2xl font-bold">공사 안내문</h2>
            <p className="text-slate-400 text-sm">프로젝트를 선택하여 공사 안내문을 작성하고 인쇄하세요.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((project) => (
                <Card key={project.id} className="hover:shadow-md transition-all cursor-pointer" onClick={() => router.push(`/notice/${project.id}`)}>
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold truncate">{project.name}</h3>
                          {project.ownership === 'shared' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 text-purple-700 shrink-0">공유 · {project.ownerName}</span>
                          )}
                          {project.ownership === 'other' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700 shrink-0">{project.ownerName}</span>
                          )}
                        </div>
                        <p className="text-sm text-slate-400 mt-1 truncate">{project.clientName} · {project.address}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-300 shrink-0 ml-2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'samples' && (
          <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
            <h2 className="text-xl sm:text-2xl font-bold">자재 샘플</h2>
            <p className="text-slate-400 text-sm">카테고리별 인테리어 자재 브랜드와 공식 카탈로그 링크를 관리합니다.</p>
            <Button onClick={() => router.push('/samples')}>
              <Palette className="w-4 h-4 mr-2" /> 자재 샘플 바로가기
            </Button>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
            <h2 className="text-xl sm:text-2xl font-bold">설정</h2>
            
            {/* 내 계정 정보 */}
            <Card>
              <CardContent className="p-4 sm:p-6 space-y-4">
                <h3 className="font-semibold">내 계정 정보</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-slate-400">이름</span>
                      {editingName ? (
                        <div className="flex items-center gap-2 mt-1">
                          <Input value={newName} onChange={e => setNewName(e.target.value)} className="h-9 w-48" onKeyDown={e => e.key === 'Enter' && updateMyName()} />
                          <Button size="sm" onClick={updateMyName} className="h-9">저장</Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingName(false)} className="h-9">취소</Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{user?.name}</p>
                          <button onClick={() => { setNewName(user?.name || ''); setEditingName(true); }} className="text-slate-400 hover:text-slate-600"><Edit2 className="w-3.5 h-3.5" /></button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div><span className="text-slate-400">이메일</span><p className="font-medium">{user?.email}</p></div>
                  <div><span className="text-slate-400">권한</span><p className="font-medium">{user?.role === 'ADMIN' ? '관리자' : '사용자'}</p></div>
                </div>
              </CardContent>
            </Card>

            {/* 유저 관리 (관리자 전용) */}
            {user?.role === 'ADMIN' && (
              <Card>
                <CardContent className="p-4 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">가입된 계정 관리</h3>
                    {!usersLoaded && <Button size="sm" variant="outline" onClick={loadUsers}>불러오기</Button>}
                  </div>
                  {usersLoaded && (
                    <div className="space-y-2">
                      {allUsers.length === 0 && <p className="text-sm text-slate-400">가입된 계정이 없습니다</p>}
                      {allUsers.map(u => (
                        <div key={u.id} className="rounded-lg bg-slate-50 dark:bg-slate-800 overflow-hidden">
                          <div className="flex items-center justify-between p-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedUser(expandedUser === u.id ? null : u.id)}>
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center text-white text-sm font-medium shrink-0">
                                {u.name?.[0] || '?'}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium">
                                  {u.name} <span className={`text-xs px-1.5 py-0.5 rounded ${u.role === 'ADMIN' ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-600'}`}>{u.role === 'ADMIN' ? '관리자' : '사용자'}</span>
                                  {u.projects && u.projects.length > 0 && <span className="text-xs text-slate-400 ml-2">프로젝트 {u.projects.length}개</span>}
                                </p>
                                <p className="text-xs text-slate-400">{u.email} · 가입: {new Date(u.createdAt).toLocaleDateString()}</p>
                              </div>
                              {u.projects && u.projects.length > 0 && (
                                expandedUser === u.id ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                              )}
                            </div>
                            {u.id !== user?.id && (
                              <div className="flex items-center gap-1 shrink-0 ml-2">
                                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => toggleUserRole(u.id, u.role)}>
                                  {u.role === 'ADMIN' ? '사용자로' : '관리자로'}
                                </Button>
                                <Button size="sm" variant="ghost" className="h-8 text-xs text-red-500 hover:bg-red-50" onClick={() => deleteUser(u.id)}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            )}
                          </div>
                          {/* 계정별 프로젝트 목록 */}
                          {expandedUser === u.id && u.projects && u.projects.length > 0 && (
                            <div className="px-3 pb-3 pt-0">
                              <div className="border-t border-slate-200 dark:border-slate-700 pt-2 space-y-1.5">
                                {u.projects.map(p => (
                                  <div key={p.id} className="flex items-center justify-between px-3 py-2 rounded-md bg-white dark:bg-slate-900">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <FolderOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                      <span className="text-sm truncate">{p.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                                        p.status === '진행중' ? 'bg-blue-100 text-blue-700' :
                                        p.status === '완료' ? 'bg-green-100 text-green-700' :
                                        'bg-slate-100 text-slate-600'
                                      }`}>{p.status}</span>
                                      <span className="text-xs text-slate-400">{new Date(p.createdAt).toLocaleDateString()}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="p-4 sm:p-6">
                <h3 className="font-semibold mb-2">체크리스트 항목 편집</h3>
                <p className="text-sm text-slate-400 mb-4">체크리스트 섹션과 항목을 직접 편집합니다.</p>
                <Button onClick={() => router.push('/settings/checklist')}>편집기 열기</Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 sm:p-6">
                <h3 className="font-semibold mb-2">자재 단가 관리</h3>
                <p className="text-sm text-slate-400 mb-4">견적서에 사용되는 자재 단가를 관리합니다.</p>
                <Button onClick={() => router.push('/settings/materials')}>단가 관리</Button>
              </CardContent>
            </Card>
          </div>
        )}
        </div>
      </main>

      {/* 프로젝트 수정 모달 */}
      {editingProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setEditingProject(null)}>
          <Card className="w-full max-w-md" onClick={e => e.stopPropagation()}>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">프로젝트 수정</h3>
                <button onClick={() => setEditingProject(null)} className="text-slate-400 hover:text-slate-600">✕</button>
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>프로젝트명 *</Label>
                  <Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="h-11 text-base" />
                </div>
                <div className="space-y-1">
                  <Label>고객명</Label>
                  <Input value={editForm.clientName} onChange={e => setEditForm({ ...editForm, clientName: e.target.value })} className="h-11 text-base" />
                </div>
                <div className="space-y-1">
                  <Label>주소</Label>
                  <Input value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} className="h-11 text-base" />
                </div>
                <div className="space-y-1">
                  <Label>상태</Label>
                  <div className="flex gap-2">
                    {['대기', '진행중', '완료'].map(s => (
                      <button key={s} onClick={() => setEditForm({ ...editForm, status: s })}
                        className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition ${editForm.status === s
                          ? s === '진행중' ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : s === '완료' ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-slate-800 bg-slate-50'
                          : 'border-slate-200 hover:border-slate-300'}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1 h-10" onClick={() => setEditingProject(null)}>취소</Button>
                <Button className="flex-1 h-10" onClick={saveEditProject} disabled={!editForm.name}>저장</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      {/* 공유 관리 모달 */}
      {sharingProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSharingProject(null)}>
          <Card className="w-full max-w-md" onClick={e => e.stopPropagation()}>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">프로젝트 공유</h3>
                <button onClick={() => setSharingProject(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-slate-500">{sharingProject.name}</p>

              {/* 이메일로 추가 */}
              <div className="flex gap-2">
                <Input
                  placeholder="공유할 사용자 이메일"
                  value={shareEmail}
                  onChange={e => { setShareEmail(e.target.value); setShareError(''); }}
                  onKeyDown={e => e.key === 'Enter' && addShare()}
                  className="flex-1 h-11 text-base"
                />
                <Button onClick={addShare} disabled={shareLoading || !shareEmail.trim()} className="h-11 px-4">
                  <UserPlus className="w-4 h-4" />
                </Button>
              </div>
              {shareError && <p className="text-sm text-red-500">{shareError}</p>}

              {/* 공유 목록 */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-400">공유된 사용자 ({shares.length}명)</p>
                {shares.length === 0 ? (
                  <p className="text-sm text-slate-400 py-3 text-center">공유된 사용자가 없습니다</p>
                ) : (
                  shares.map(share => (
                    <div key={share.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-medium shrink-0">
                          {share.user.name?.[0] || '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{share.user.name}</p>
                          <p className="text-xs text-slate-400 truncate">{share.user.email}</p>
                        </div>
                      </div>
                      <button onClick={() => removeShare(share.id)} className="text-slate-400 hover:text-red-500 shrink-0 ml-2">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-slate-400">로딩 중...</div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
