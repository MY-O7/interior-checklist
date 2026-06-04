'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, Search, User, MapPin, Calendar, FileText, Calculator, Ruler, Edit2, Share2, Trash2, FolderOpen } from 'lucide-react';

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

interface ProjectsTabProps {
  projects: Project[];
  user: { id: string; role: string } | null;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  showNewProject: boolean;
  setShowNewProject: (v: boolean) => void;
  newProject: { name: string; clientName: string; address: string };
  setNewProject: (v: { name: string; clientName: string; address: string }) => void;
  createProject: () => void;
  openProject: (p: Project, type: 'checklist' | 'estimate') => void;
  onMeasure: (projectId: string) => void;
  startEditProject: (p: Project) => void;
  openShareModal: (p: Project) => void;
  deleteProject: (id: string) => void;
}

export function ProjectsTab({
  projects, user, searchQuery, setSearchQuery, showNewProject, setShowNewProject,
  newProject, setNewProject, createProject, openProject, onMeasure,
  startEditProject, openShareModal, deleteProject,
}: ProjectsTabProps) {
  return (
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
                  <Button variant="outline" size="sm" className="flex-1 h-10" onClick={() => onMeasure(project.id)}>
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
  );
}
