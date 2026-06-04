'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Edit2, ChevronUp, ChevronDown, Trash2, FolderOpen } from 'lucide-react';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  projects?: { id: string; name: string; status: string; createdAt: string }[];
}

interface SettingsTabProps {
  user: { id: string; email: string; name: string; role: string } | null;
  editingName: boolean;
  setEditingName: (v: boolean) => void;
  newName: string;
  setNewName: (v: string) => void;
  updateMyName: () => void;
  allUsers: AdminUser[];
  usersLoaded: boolean;
  loadUsers: () => void;
  expandedUser: string | null;
  setExpandedUser: (v: string | null) => void;
  toggleUserRole: (id: string, role: string) => void;
  deleteUser: (id: string) => void;
  onEditChecklist: () => void;
  onManageMaterials: () => void;
}

export function SettingsTab({
  user, editingName, setEditingName, newName, setNewName, updateMyName,
  allUsers, usersLoaded, loadUsers, expandedUser, setExpandedUser,
  toggleUserRole, deleteUser, onEditChecklist, onManageMaterials,
}: SettingsTabProps) {
  return (
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
          <Button onClick={onEditChecklist}>편집기 열기</Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <h3 className="font-semibold mb-2">자재 단가 관리</h3>
          <p className="text-sm text-slate-400 mb-4">견적서에 사용되는 자재 단가를 관리합니다.</p>
          <Button onClick={onManageMaterials}>단가 관리</Button>
        </CardContent>
      </Card>
    </div>
  );
}
