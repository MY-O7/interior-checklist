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
import { SettingsTab } from '@/components/dashboard/settings-tab';
import { ProjectsTab } from '@/components/dashboard/projects-tab';

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
      })
      .catch(() => router.push('/login'));
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
        setShareError('공유 실패');
      }
    } catch (e: any) { setShareError(e?.message || '서버 오류'); }
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
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--brand-primary)] to-rose-600 flex items-center justify-center text-white font-medium shrink-0">
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
          <ProjectsTab
            projects={projects}
            user={user}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            showNewProject={showNewProject}
            setShowNewProject={setShowNewProject}
            newProject={newProject}
            setNewProject={setNewProject}
            createProject={createProject}
            openProject={openProject}
            onMeasure={(id) => router.push(`/measurement/${id}`)}
            startEditProject={startEditProject}
            openShareModal={openShareModal}
            deleteProject={deleteProject}
          />
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
          <SettingsTab
            user={user}
            editingName={editingName}
            setEditingName={setEditingName}
            newName={newName}
            setNewName={setNewName}
            updateMyName={updateMyName}
            allUsers={allUsers}
            usersLoaded={usersLoaded}
            loadUsers={loadUsers}
            expandedUser={expandedUser}
            setExpandedUser={setExpandedUser}
            toggleUserRole={toggleUserRole}
            deleteUser={deleteUser}
            onEditChecklist={() => router.push('/settings/checklist')}
            onManageMaterials={() => router.push('/settings/materials')}
          />
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
