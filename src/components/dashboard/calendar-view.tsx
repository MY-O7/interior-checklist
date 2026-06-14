'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import { safeParse, toLocalDateStr } from '@/lib/utils';
import { ChevronLeft, ChevronRight, X, ChevronDown, ChevronUp, Trash2, Edit2, Plus, Download, Printer, Filter, FileText, Copy, Check } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  clientName: string | null;
  address: string | null;
  color: string;
}

interface ProjectSchedule {
  id: string;
  date: string;
  task: string;
  note: string | null;
  projectId: string;
  project: Project;
}

const STORAGE_KEY = 'interior-task-presets';
const COLOR_PRESETS = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#22c55e', '#8b5cf6', '#6366f1', '#ec4899', '#14b8a6', '#9333ea', '#06b6d4', '#84cc16', '#64748b'];

// 서버에서 받은 날짜 문자열을 로컬 Date로 파싱
function parseScheduleDate(dateStr: string): string {
  const d = new Date(dateStr);
  return toLocalDateStr(d);
}

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 2500);
    return () => clearTimeout(timer);
  }, [onClose]);
  return (
    <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-lg text-white text-sm font-medium shadow-lg ${type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}>
      {message}
    </div>
  );
}

// ICS 생성 (로컬 날짜 기준)
function generateICS(project: Project, schedules: ProjectSchedule[]): string {
  const projectSchedules = schedules.filter(s => s.projectId === project.id);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SomSSi Interior//Checklist//KO',
    `X-WR-CALNAME:${project.name}`,
    'CALSCALE:GREGORIAN',
  ];
  projectSchedules.forEach(s => {
    const dateKey = parseScheduleDate(s.date);
    const dateCompact = dateKey.replace(/-/g, '');
    // 종일 이벤트: DTEND는 다음날
    const endParts = dateKey.split('-').map(Number);
    const endDate = new Date(endParts[0], endParts[1] - 1, endParts[2] + 1);
    const endCompact = toLocalDateStr(endDate).replace(/-/g, '');
    lines.push(
      'BEGIN:VEVENT',
      `UID:${s.id}@somssi-interior`,
      `DTSTART;VALUE=DATE:${dateCompact}`,
      `DTEND;VALUE=DATE:${endCompact}`,
      `SUMMARY:${s.task}`,
      `DESCRIPTION:${project.name}${s.note ? ' - ' + s.note : ''}`,
      `CATEGORIES:${project.name}`,
      'END:VEVENT',
    );
  });
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function downloadICS(project: Project, schedules: ProjectSchedule[]) {
  const ics = generateICS(project, schedules);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.name}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

export function CalendarView() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [schedules, setSchedules] = useState<ProjectSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [viewMode, setViewMode] = useState<'month' | 'quarter'>('month');
  const [expandedQuarters, setExpandedQuarters] = useState<Set<number>>(new Set([Math.floor(new Date().getMonth() / 3)]));

  // 프로젝트 필터 (null = 전체, string = 특정 프로젝트)
  const [filterProjectId, setFilterProjectId] = useState<string | null>(null);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  }, []);

  // 모달별 상태는 객체 하나로 묶어 열기/닫기/폼 리셋을 한 곳에서 처리한다
  const [saving, setSaving] = useState(false);

  // 일정 추가 모달
  const [addModal, setAddModal] = useState({ open: false, date: '', projectId: '', task: '', note: '' });

  // 일정 편집 모달
  const [editModal, setEditModal] = useState<{ open: boolean; schedule: ProjectSchedule | null; date: string; task: string; note: string; projectId: string }>(
    { open: false, schedule: null, date: '', task: '', note: '', projectId: '' }
  );

  // 날짜 상세 모달 (일정 많을 때)
  const [dayModal, setDayModal] = useState<{ open: boolean; date: string; schedules: ProjectSchedule[] }>({ open: false, date: '', schedules: [] });

  // 프로젝트 편집 모달
  const [projectModal, setProjectModal] = useState<{ open: boolean; project: Project | null; name: string; color: string }>(
    { open: false, project: null, name: '', color: '' }
  );

  // 내보내기/인쇄 드롭다운
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showPrintMenu, setShowPrintMenu] = useState(false);

  // 공종별 요약 모달
  const [summaryModal, setSummaryModal] = useState({ open: false, text: '' });
  const [copied, setCopied] = useState(false);

  // 인쇄 대기 상태 — 필터가 렌더에 반영된 "후" effect에서 인쇄하고, afterprint에 복원한다
  const [pendingPrint, setPendingPrint] = useState<{ prevFilter: string | null } | null>(null);

  // 프리셋
  const [taskPresets, setTaskPresets] = useState<string[]>([]);
  const [newPresetInput, setNewPresetInput] = useState('');

  useEffect(() => {
    const parsed = safeParse<string[]>(localStorage.getItem(STORAGE_KEY), []);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const unique = Array.from(new Set(parsed)).sort((a, b) => a.localeCompare(b, 'ko'));
      setTaskPresets(unique);
    } else {
      const defaults = ['가구 철거', '가구 시공', '간판', '도배', '마루 철거', '마루 시공', '목공', '셋팅', '어닝', '욕실', '전기', '조명', '줄눈', '청소', '탄성', '타일', '페인트', '필름', '화장실 철거', '샷시', '설비'];
      const sorted = defaults.sort((a, b) => a.localeCompare(b, 'ko'));
      setTaskPresets(sorted);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
    }
  }, []);

  useEffect(() => {
    apiGet('/api/projects')
      .then(data => {
        setProjects(data.projects || []);
        if (data.projects?.length > 0) setAddModal(m => ({ ...m, projectId: data.projects[0].id }));
      })
      .catch(e => { console.error(e); showToast('프로젝트를 불러오지 못했습니다', 'error'); });
  }, [showToast]);

  useEffect(() => {
    if (projects.length === 0) {
      setLoading(false);
      setSchedules([]);
      return;
    }
    setLoading(true);
    apiGet(`/api/schedules?year=${currentYear}`)
      .then(data => setSchedules(data.schedules || []))
      .catch(e => { console.error(e); showToast('일정을 불러오지 못했습니다', 'error'); })
      .finally(() => setLoading(false));
  }, [currentYear, projects.length, showToast]);

  // 필터 적용된 일정
  const filteredSchedules = useMemo(() => {
    if (!filterProjectId) return schedules;
    return schedules.filter(s => s.projectId === filterProjectId);
  }, [schedules, filterProjectId]);

  const scheduleMap = useMemo(() => {
    const map = new Map<string, ProjectSchedule[]>();
    filteredSchedules.forEach(s => {
      const dateKey = parseScheduleDate(s.date);
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(s);
    });
    return map;
  }, [filteredSchedules]);

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else { setCurrentMonth(m => m - 1); }
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else { setCurrentMonth(m => m + 1); }
  };

  const toggleQuarter = (qIdx: number) => {
    setExpandedQuarters(prev => {
      const newSet = new Set(prev);
      newSet.has(qIdx) ? newSet.delete(qIdx) : newSet.add(qIdx);
      return newSet;
    });
  };

  const generateMonthDays = (year: number, month: number, compact = false) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ date: new Date(year, month, -startDayOfWeek + i + 1), isCurrentMonth: false });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({ date: new Date(year, month, day), isCurrentMonth: true });
    }
    if (compact) {
      while (days.length % 7 !== 0) {
        const lastDate = days[days.length - 1].date;
        days.push({ date: new Date(lastDate.getTime() + 86400000), isCurrentMonth: false });
      }
    } else {
      while (days.length < 42) {
        const lastDate = days[days.length - 1].date;
        days.push({ date: new Date(lastDate.getTime() + 86400000), isCurrentMonth: false });
      }
    }
    return days;
  };

  const openAddModal = (dateStr: string) => {
    setAddModal(m => ({ open: true, date: dateStr, projectId: projects[0]?.id || m.projectId, task: '', note: '' }));
  };

  const handleDateClick = (date: Date) => {
    const dateStr = toLocalDateStr(date);
    const daySchedules = scheduleMap.get(dateStr) || [];

    // 일정이 있으면 상세 모달, 없으면 바로 추가
    if (daySchedules.length > 0) {
      setDayModal({ open: true, date: dateStr, schedules: daySchedules });
    } else {
      openAddModal(dateStr);
    }
  };

  const openAddFromDay = () => {
    setDayModal(m => ({ ...m, open: false }));
    openAddModal(dayModal.date);
  };

  const handleScheduleClick = (schedule: ProjectSchedule, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setDayModal(m => ({ ...m, open: false }));
    setEditModal({
      open: true,
      schedule,
      date: parseScheduleDate(schedule.date),
      task: schedule.task,
      note: schedule.note || '',
      projectId: schedule.projectId,
    });
  };

  const addSchedule = async () => {
    if (!addModal.projectId || !addModal.date || !addModal.task.trim()) return;
    setSaving(true);
    try {
      const data = await apiPost('/api/schedules', {
        projectId: addModal.projectId,
        date: addModal.date + 'T12:00:00',
        task: addModal.task.trim(),
        note: addModal.note.trim() || null,
      });
      if (data.schedule) {
        setSchedules(prev => [...prev, data.schedule]);
        showToast('일정이 추가되었습니다');
      }
      setAddModal(m => ({ ...m, open: false }));
    } catch {
      showToast('일정 추가 실패', 'error');
    } finally {
      setSaving(false);
    }
  };

  const updateSchedule = async () => {
    if (!editModal.schedule || !editModal.projectId || !editModal.date || !editModal.task.trim()) return;
    setSaving(true);
    try {
      const data = await apiPatch(`/api/schedules/${editModal.schedule.id}`, {
        projectId: editModal.projectId,
        date: editModal.date + 'T12:00:00',
        task: editModal.task.trim(),
        note: editModal.note.trim() || null,
      });
      if (data.schedule) {
        setSchedules(prev => prev.map(s => s.id === editModal.schedule!.id ? data.schedule : s));
        showToast('일정이 수정되었습니다');
      }
      setEditModal(m => ({ ...m, open: false }));
    } catch {
      showToast('일정 수정 실패', 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteSchedule = async () => {
    if (!editModal.schedule) return;
    if (!confirm('이 일정을 삭제하시겠습니까?')) return;
    try {
      await apiDelete(`/api/schedules/${editModal.schedule.id}`);
      setSchedules(prev => prev.filter(s => s.id !== editModal.schedule!.id));
      setEditModal(m => ({ ...m, open: false }));
      showToast('일정이 삭제되었습니다');
    } catch {
      showToast('삭제 실패', 'error');
    }
  };

  const openProjectModal = (project: Project) => {
    setProjectModal({ open: true, project, name: project.name, color: project.color });
  };

  const saveProject = async () => {
    const target = projectModal.project;
    if (!target) return;
    try {
      const data = await apiPatch(`/api/projects/${target.id}`, { name: projectModal.name, color: projectModal.color });
      if (data.project) {
        setProjects(prev => prev.map(p => p.id === target.id ? { ...p, name: projectModal.name, color: projectModal.color } : p));
        setSchedules(prev => prev.map(s =>
          s.projectId === target.id
            ? { ...s, project: { ...s.project, name: projectModal.name, color: projectModal.color } }
            : s
        ));
        showToast('프로젝트가 저장되었습니다');
      }
      setProjectModal(m => ({ ...m, open: false }));
    } catch {
      showToast('프로젝트 저장 실패', 'error');
    }
  };

  // 인쇄: 필터를 먼저 상태로 바꾸고, 렌더에 반영된 뒤(effect) 인쇄 → afterprint 에서 복원.
  // setTimeout 타이밍에 기대지 않으므로 느린 기기에서도 필터가 적용된 화면이 인쇄된다.
  const handlePrint = (projectId?: string) => {
    setShowPrintMenu(false);
    setPendingPrint({ prevFilter: filterProjectId });
    setFilterProjectId(projectId ?? null);
  };

  useEffect(() => {
    if (!pendingPrint) return;
    const prev = pendingPrint.prevFilter;
    const restore = () => {
      setFilterProjectId(prev);
      setPendingPrint(null);
    };
    window.addEventListener('afterprint', restore, { once: true });
    window.print();
    return () => window.removeEventListener('afterprint', restore);
  }, [pendingPrint]);

  // 연속 날짜 병합 (3월 16일, 17일, 18일 → 3월 16~18일)
  const mergeDates = (dates: string[]): string => {
    const parsed = dates.map(d => {
      const match = d.match(/(\d+)월 (\d+)일/);
      return match ? { month: parseInt(match[1]), day: parseInt(match[2]) } : null;
    }).filter(Boolean) as { month: number; day: number }[];

    parsed.sort((a, b) => a.month - b.month || a.day - b.day);

    const ranges: string[] = [];
    let i = 0;
    while (i < parsed.length) {
      const start = parsed[i];
      let end = start;
      while (i + 1 < parsed.length && parsed[i + 1].month === end.month && parsed[i + 1].day === end.day + 1) {
        i++;
        end = parsed[i];
      }
      if (start === end) {
        ranges.push(`${start.month}월 ${start.day}일`);
      } else if (start.month === end.month) {
        ranges.push(`${start.month}월 ${start.day}~${end.day}일`);
      } else {
        ranges.push(`${start.month}월 ${start.day}일~${end.month}월 ${end.day}일`);
      }
      i++;
    }
    return ranges.join(', ');
  };

  // 철거+시공 같이 하는 공종 (같은 업체)
  const DEMOLITION_AND_INSTALL = new Set(['마루', '가구', '화장실', '욕실']);
  // 뒤에 "시공" 붙여야 하는 공종
  const NEEDS_SIGONG_SUFFIX = new Set(['필름', '목공', '페인트', '타일', '도배', '셋팅', '탄성', '줄눈', '간판', '어닝', '조명', '전기', '샷시', '설비']);

  // 공종별 요약 생성 (projectFilter: 특정 프로젝트만 / null = 전체)
  const buildSummaryText = (projectFilter?: string | null): string => {
    const targetSchedules = projectFilter
      ? schedules.filter(s => s.projectId === projectFilter)
      : schedules;

    // task별로 프로젝트-날짜 수집
    const taskMap = new Map<string, Map<string, { month: number; day: number }[]>>();

    targetSchedules.forEach(s => {
      const task = s.task;
      const project = projects.find(p => p.id === s.projectId);
      const projectName = project?.name || s.project.name;
      const dateKey = parseScheduleDate(s.date);
      const [, m, d] = dateKey.split('-').map(Number);

      if (!taskMap.has(task)) taskMap.set(task, new Map());
      const projectMap = taskMap.get(task)!;
      if (!projectMap.has(projectName)) projectMap.set(projectName, []);
      projectMap.get(projectName)!.push({ month: m, day: d });
    });

    const lines: string[] = [];
    const processed = new Set<string>();
    const allKeys = Array.from(taskMap.keys());

    // 1단계: 철거+시공 쌍 찾기 (예: "가구 철거" + "가구 시공")
    const pairedBases = new Set<string>();
    DEMOLITION_AND_INSTALL.forEach(base => {
      const demKey = base + ' 철거';
      const instKey = base + ' 시공';
      const hasDem = allKeys.includes(demKey);
      const hasInst = allKeys.includes(instKey);
      if (hasDem || hasInst) {
        pairedBases.add(base);
      }
    });

    // 2단계: 쌍으로 묶을 수 있는 것 먼저 처리
    pairedBases.forEach(base => {
      const demKey = base + ' 철거';
      const instKey = base + ' 시공';
      processed.add(demKey);
      processed.add(instKey);

      const demMap = taskMap.get(demKey);
      const instMap = taskMap.get(instKey);

      // 참여 프로젝트 모음
      const projectNames = new Set<string>();
      if (demMap) demMap.forEach((_, pn) => projectNames.add(pn));
      if (instMap) instMap.forEach((_, pn) => projectNames.add(pn));

      lines.push(`${base} 철거 및 시공`);
      lines.push('');

      projectNames.forEach(projectName => {
        const demDates = demMap?.get(projectName);
        const instDates = instMap?.get(projectName);

        lines.push(projectName);
        if (demDates) {
          lines.push(`철거 : ${mergeDates(demDates.map(d => `${d.month}월 ${d.day}일`))}`);
        }
        if (instDates) {
          lines.push(`시공 : ${mergeDates(instDates.map(d => `${d.month}월 ${d.day}일`))}`);
        }
        if (!demDates && !instDates) {
          lines.push('(일정 없음)');
        }
      });
      lines.push('');
    });

    // 3단계: 나머지 일반 공종 처리
    taskMap.forEach((projectMap, task) => {
      if (processed.has(task)) return;
      processed.add(task);

      const baseTask = task.replace(/\s*(철거|시공)$/, '');

      // 일반 공종 → "시공" 붙이기
      const suffix = NEEDS_SIGONG_SUFFIX.has(baseTask) || NEEDS_SIGONG_SUFFIX.has(task) ? ' 시공' : '';
      const displayTask = task.endsWith(' 시공') || task.endsWith(' 철거') ? task : task + suffix;

      lines.push(displayTask);
      lines.push('');
      projectMap.forEach((dates, projectName) => {
        const merged = mergeDates(dates.map(d => `${d.month}월 ${d.day}일`));
        lines.push(`${projectName} : ${merged}`);
      });
      lines.push('');
    });

    return lines.join('\n').trim();
  };

  const generateTaskSummary = (projectFilter?: string | null) => {
    setSummaryModal({ open: true, text: buildSummaryText(projectFilter) });
    setCopied(false);
    setShowExportMenu(false);
  };

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(summaryModal.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = summaryModal.text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const addTaskPreset = () => {
    const val = newPresetInput.trim();
    if (!val) return;
    if (taskPresets.includes(val)) {
      setNewPresetInput('');
      return; // 중복 방지
    }
    const updated = [...taskPresets, val].sort((a, b) => a.localeCompare(b, 'ko'));
    setTaskPresets(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setNewPresetInput('');
  };
  const removeTaskPreset = (preset: string) => {
    const updated = taskPresets.filter(p => p !== preset);
    setTaskPresets(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const quarters = [
    { label: '1분기', months: [0, 1, 2] },
    { label: '2분기', months: [3, 4, 5] },
    { label: '3분기', months: [6, 7, 8] },
    { label: '4분기', months: [9, 10, 11] },
  ];
  const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const today = toLocalDateStr(new Date());

  const filterProjectName = filterProjectId ? projects.find(p => p.id === filterProjectId)?.name : null;

  const renderPresetButtons = (currentValue: string, onSelect: (v: string) => void) => (
    <div className="flex flex-wrap gap-1 mt-1 mb-2">
      {taskPresets.map(preset => (
        <button key={preset} onClick={() => onSelect(preset)}
          className={`px-2 py-1 text-xs rounded-full border transition ${currentValue === preset ? 'bg-emerald-700 text-white border-emerald-700' : 'border-slate-300 hover:border-slate-400'}`}>
          {preset}
        </button>
      ))}
    </div>
  );

  const renderProjectSelector = (currentId: string, onSelect: (id: string) => void) => (
    <div className="grid grid-cols-2 gap-2 mt-1">
      {projects.map(p => (
        <button key={p.id} onClick={() => onSelect(p.id)}
          className={`flex items-center gap-2 p-2 rounded-lg border-2 transition ${currentId === p.id ? 'border-emerald-600 bg-emerald-50 dark:bg-slate-700' : 'border-slate-200 hover:border-slate-300'}`}>
          <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
          <span className="text-sm truncate">{p.name}</span>
        </button>
      ))}
    </div>
  );

  const renderMonthCalendar = (month: number, compact = false) => {
    const days = generateMonthDays(currentYear, month, compact);
    return (
      <Card className="overflow-hidden print:shadow-none print:border">
        <div className="bg-emerald-700 text-white text-center py-1.5 font-bold text-sm print:bg-slate-200 print:text-black">{monthNames[month]}</div>
        <CardContent className={compact ? 'p-1' : 'p-2'}>
          <div className="grid grid-cols-7 gap-px mb-1">
            {dayNames.map((day, i) => (
              <div key={day} className={`text-center font-medium py-0.5 ${compact ? 'text-[10px]' : 'text-xs'} ${i === 0 ? 'text-red-400 print:text-red-600' : i === 6 ? 'text-emerald-400 print:text-emerald-600' : 'text-slate-500 print:text-slate-600'}`}>{day}</div>
            ))}
          </div>
          <div className={`grid grid-cols-7 ${compact ? 'gap-px' : 'gap-1'}`}>
            {days.map((day, dayIdx) => {
              const dateStr = toLocalDateStr(day.date);
              const isSunday = dayIdx % 7 === 0;
              const isSaturday = dayIdx % 7 === 6;
              const isToday = dateStr === today;
              const daySchedules = scheduleMap.get(dateStr) || [];
              const hasSchedules = daySchedules.length > 0;

              if (compact) {
                return (
                  <div
                    key={dayIdx}
                    onClick={() => day.isCurrentMonth && handleDateClick(day.date)}
                    className={`p-0.5 rounded cursor-pointer transition text-center ${
                      day.isCurrentMonth ? 'hover:bg-slate-100 dark:hover:bg-slate-700' : 'opacity-30 cursor-default'
                    } ${isToday ? 'ring-2 ring-emerald-600 dark:ring-emerald-400' : ''}`}
                  >
                    <div className={`text-[11px] leading-tight ${!day.isCurrentMonth ? 'text-slate-300' : isSunday ? 'text-red-500' : isSaturday ? 'text-emerald-500' : 'text-slate-600 dark:text-slate-500'}`}>
                      {day.date.getDate()}
                    </div>
                    {hasSchedules && (
                      <div className="flex justify-center gap-px mt-0.5 flex-wrap">
                        {daySchedules.slice(0, 3).map(s => {
                          const project = projects.find(p => p.id === s.projectId);
                          return (
                            <div key={s.id} className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: project?.color || s.project.color }}
                              title={`${s.task}${s.note ? ' - ' + s.note : ''}`} />
                          );
                        })}
                        {daySchedules.length > 3 && <span className="text-[8px] text-slate-500">+{daySchedules.length - 3}</span>}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <div
                  key={dayIdx}
                  onClick={() => day.isCurrentMonth && handleDateClick(day.date)}
                  className={`min-h-[100px] p-1.5 border rounded cursor-pointer transition print:min-h-[80px] print:p-1 ${
                    day.isCurrentMonth
                      ? hasSchedules ? 'bg-slate-50 dark:bg-slate-750 hover:bg-slate-100' : 'bg-white dark:bg-slate-800 hover:bg-slate-50'
                      : 'bg-slate-100 dark:bg-slate-900 text-slate-300 cursor-default'
                  } ${isToday ? 'border-emerald-600 dark:border-emerald-400 border-2' : 'border-slate-200 dark:border-slate-700'}`}
                >
                  <div className={`text-sm font-medium mb-1 print:text-xs ${!day.isCurrentMonth ? 'text-slate-300' : isSunday ? 'text-red-500' : isSaturday ? 'text-emerald-500' : 'text-slate-600 dark:text-slate-500'}`}>
                    {day.date.getDate()}
                  </div>
                  <div className="space-y-0.5">
                    {daySchedules.map(schedule => {
                      const project = projects.find(p => p.id === schedule.projectId);
                      const bgColor = project?.color || schedule.project.color;
                      return (
                        <div
                          key={schedule.id}
                          onClick={(e) => { e.stopPropagation(); handleScheduleClick(schedule, e); }}
                          className="truncate px-1.5 py-0.5 rounded text-[11px] text-white hover:opacity-80 transition cursor-pointer print:text-[9px] print:py-0"
                          style={{ backgroundColor: bgColor }}
                          title={`${schedule.task}${schedule.note ? ' (' + schedule.note + ')' : ''}\n클릭하여 편집`}
                        >
                          {schedule.task}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4" id="calendar-root">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* 헤더 */}
      <div className="flex items-center justify-between flex-wrap gap-2 print:hidden">
        <div className="flex items-center gap-2">
          {viewMode === 'month' ? (
            <>
              <Button variant="outline" size="sm" onClick={prevMonth}><ChevronLeft className="w-4 h-4" /></Button>
              <h3 className="text-xl font-bold min-w-[120px] text-center">{currentYear}년 {monthNames[currentMonth]}</h3>
              <Button variant="outline" size="sm" onClick={nextMonth}><ChevronRight className="w-4 h-4" /></Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => setCurrentYear(y => y - 1)}><ChevronLeft className="w-4 h-4" /></Button>
              <h3 className="text-xl font-bold min-w-[80px] text-center">{currentYear}년</h3>
              <Button variant="outline" size="sm" onClick={() => setCurrentYear(y => y + 1)}><ChevronRight className="w-4 h-4" /></Button>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* 프로젝트 필터 */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setFilterProjectId(null)}
              className={`px-2 py-1 text-xs rounded-full border transition ${!filterProjectId ? 'bg-emerald-700 text-white border-emerald-700' : 'border-slate-300 hover:border-slate-400'}`}
            >전체</button>
            {projects.map(p => (
              <button key={p.id} onClick={() => setFilterProjectId(filterProjectId === p.id ? null : p.id)}
                className={`flex items-center gap-1 px-2 py-1 text-xs rounded-full border transition ${filterProjectId === p.id ? 'bg-emerald-700 text-white border-emerald-700' : 'border-slate-300 hover:border-slate-400'}`}>
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                {p.name}
              </button>
            ))}
          </div>
          {/* 내보내기 */}
          <div className="relative">
            <Button variant="outline" size="sm" onClick={() => { setShowExportMenu(!showExportMenu); setShowPrintMenu(false); }}>
              <Download className="w-4 h-4 mr-1" /> 내보내기
            </Button>
            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
                <div className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-800 border rounded-lg shadow-lg z-50 py-1 min-w-[220px] max-h-[70vh] overflow-y-auto">
                  {/* 공종별 요약 */}
                  <div className="px-3 py-1 text-[10px] text-slate-500 uppercase tracking-wider">공종별 요약 (문자용)</div>
                  <button onClick={() => generateTaskSummary(null)}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition font-medium">
                    <FileText className="w-4 h-4 text-slate-500" />
                    전체 요약
                  </button>
                  {projects.map(p => (
                    <button key={`sum-${p.id}`} onClick={() => generateTaskSummary(p.id)}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                      {p.name} 요약
                    </button>
                  ))}
                  <div className="border-t my-1" />
                  {/* ICS 내보내기 */}
                  <div className="px-3 py-1 text-[10px] text-slate-500 uppercase tracking-wider">iCloud 캘린더 (ICS)</div>
                  {projects.map(p => (
                    <button key={`ics-${p.id}`}
                      onClick={() => { downloadICS(p, schedules); setShowExportMenu(false); showToast(`${p.name} ICS 다운로드 완료`); }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                      {p.name}.ics
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          {/* 인쇄 */}
          <div className="relative">
            <Button variant="outline" size="sm" onClick={() => { setShowPrintMenu(!showPrintMenu); setShowExportMenu(false); }}>
              <Printer className="w-4 h-4 mr-1" /> 인쇄
            </Button>
            {showPrintMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowPrintMenu(false)} />
                <div className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-800 border rounded-lg shadow-lg z-50 py-1 min-w-[180px]">
                  <button onClick={() => handlePrint()}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition font-medium">
                    전체 인쇄
                  </button>
                  <div className="border-t my-1" />
                  {projects.map(p => (
                    <button key={p.id} onClick={() => handlePrint(p.id)}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                      {p.name}만 인쇄
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          {/* 뷰 전환 */}
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button onClick={() => setViewMode('month')} className={`px-3 py-1 text-sm rounded-md transition ${viewMode === 'month' ? 'bg-white dark:bg-slate-700 font-bold shadow' : 'text-slate-500'}`}>월별</button>
            <button onClick={() => setViewMode('quarter')} className={`px-3 py-1 text-sm rounded-md transition ${viewMode === 'quarter' ? 'bg-white dark:bg-slate-700 font-bold shadow' : 'text-slate-500'}`}>분기별</button>
          </div>
        </div>
      </div>

      {/* 프로젝트 범례 + 프리셋 */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 space-y-3 print:hidden">
        <div className="flex flex-wrap gap-3">
          {projects.map(project => (
            <button key={project.id} onClick={() => openProjectModal(project)} className="flex items-center gap-2 hover:opacity-70 transition group">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: project.color }} />
              <span className="text-sm">{project.name}</span>
              <Edit2 className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition" />
            </button>
          ))}
        </div>
        <div className="border-t pt-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-slate-500">작업 프리셋</span>
            <Input className="h-7 px-2 text-xs w-24" placeholder="새 프리셋" value={newPresetInput} onChange={e => setNewPresetInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTaskPreset()} />
            <Button size="sm" className="h-7 text-xs" onClick={addTaskPreset}>추가</Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {taskPresets.map(preset => (
              <div key={preset} className="flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-full">
                <span className="text-xs">{preset}</span>
                <button onClick={() => removeTaskPreset(preset)} className="text-slate-500 hover:text-red-500"><X className="w-3 h-3" /></button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 인쇄용 헤더 */}
      <div className="hidden print:block text-center mb-4">
        <h2 className="text-2xl font-bold">
          {filterProjectName
            ? `${filterProjectName} — ${currentMonth + 1}월 일정`
            : `${currentMonth + 1}월 일정`
          }
        </h2>
        <div className="flex justify-center gap-4 mt-2">
          {(filterProjectId ? projects.filter(p => p.id === filterProjectId) : projects).map(p => (
            <span key={p.id} className="flex items-center gap-1 text-sm">
              <span className="inline-block w-3 h-3 rounded-full border" style={{ backgroundColor: p.color }} />
              {p.name}
            </span>
          ))}
        </div>
      </div>

      {/* 캘린더 */}
      {loading ? (
        <div className="text-center py-8 text-slate-500">로딩 중...</div>
      ) : viewMode === 'month' ? (
        renderMonthCalendar(currentMonth, false)
      ) : (
        <div className="space-y-3">
          {quarters.map((quarter, qIdx) => {
            const isExpanded = expandedQuarters.has(qIdx);
            return (
              <div key={qIdx}>
                <button onClick={() => toggleQuarter(qIdx)} className="flex items-center gap-2 w-full text-left p-3 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition print:hidden">
                  <span className="text-lg font-bold">{quarter.label}</span>
                  <span className="text-sm text-slate-500">({quarter.months.map(m => monthNames[m]).join(', ')})</span>
                  <div className="ml-auto">{isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}</div>
                </button>
                {isExpanded && (
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {quarter.months.map(month => <div key={month}>{renderMonthCalendar(month, true)}</div>)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ===== 날짜 상세 모달 ===== */}
      {dayModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 print:hidden" onClick={() => setDayModal(m => ({ ...m, open: false }))}>
          <Card className="w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">{dayModal.date.replace(/-/g, '.')} 일정</h3>
                <button onClick={() => setDayModal(m => ({ ...m, open: false }))} className="text-slate-500 hover:text-slate-600"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {dayModal.schedules.map(s => {
                  const project = projects.find(p => p.id === s.projectId);
                  return (
                    <div key={s.id} onClick={() => handleScheduleClick(s)}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: project?.color || s.project.color }} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{s.task}</div>
                        <div className="text-xs text-slate-500">{project?.name || s.project.name}{s.note ? ` · ${s.note}` : ''}</div>
                      </div>
                      <Edit2 className="w-4 h-4 text-slate-500" />
                    </div>
                  );
                })}
              </div>
              <Button className="w-full h-10" onClick={openAddFromDay}>
                <Plus className="w-4 h-4 mr-1" /> 일정 추가
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ===== 일정 추가 모달 ===== */}
      {addModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 print:hidden" onClick={() => setAddModal(m => ({ ...m, open: false }))}>
          <Card className="w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold flex items-center gap-2"><Plus className="w-5 h-5" /> 일정 추가</h3>
                <button onClick={() => setAddModal(m => ({ ...m, open: false }))} className="text-slate-500 hover:text-slate-600"><X className="w-5 h-5" /></button>
              </div>
              <div>
                <label className="text-xs text-slate-500">날짜</label>
                <Input type="date" value={addModal.date} onChange={e => setAddModal(m => ({ ...m, date: e.target.value }))} className="mt-1 h-10" />
              </div>
              <div>
                <label className="text-xs text-slate-500">프로젝트</label>
                {renderProjectSelector(addModal.projectId, id => setAddModal(m => ({ ...m, projectId: id })))}
              </div>
              <div>
                <label className="text-xs text-slate-500">작업 내용</label>
                {renderPresetButtons(addModal.task, v => setAddModal(m => ({ ...m, task: v })))}
                <Input placeholder="직접 입력" value={addModal.task} onChange={e => setAddModal(m => ({ ...m, task: e.target.value }))} className="h-10" />
              </div>
              <div>
                <label className="text-xs text-slate-500">비고 (선택)</label>
                <Input placeholder="참고사항" value={addModal.note} onChange={e => setAddModal(m => ({ ...m, note: e.target.value }))} className="h-10 mt-1" />
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1 h-10" onClick={() => setAddModal(m => ({ ...m, open: false }))}>취소</Button>
                <Button className="flex-1 h-10" onClick={addSchedule} disabled={!addModal.projectId || !addModal.date || !addModal.task.trim() || saving}>{saving ? '추가 중...' : '추가'}</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ===== 일정 편집 모달 ===== */}
      {editModal.open && editModal.schedule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 print:hidden" onClick={() => setEditModal(m => ({ ...m, open: false }))}>
          <Card className="w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold flex items-center gap-2"><Edit2 className="w-5 h-5" /> 일정 편집</h3>
                <button onClick={() => setEditModal(m => ({ ...m, open: false }))} className="text-slate-500 hover:text-slate-600"><X className="w-5 h-5" /></button>
              </div>
              <div>
                <label className="text-xs text-slate-500">날짜</label>
                <Input type="date" value={editModal.date} onChange={e => setEditModal(m => ({ ...m, date: e.target.value }))} className="mt-1 h-10" />
              </div>
              <div>
                <label className="text-xs text-slate-500">프로젝트</label>
                {renderProjectSelector(editModal.projectId, id => setEditModal(m => ({ ...m, projectId: id })))}
              </div>
              <div>
                <label className="text-xs text-slate-500">작업 내용</label>
                {renderPresetButtons(editModal.task, v => setEditModal(m => ({ ...m, task: v })))}
                <Input placeholder="직접 입력" value={editModal.task} onChange={e => setEditModal(m => ({ ...m, task: e.target.value }))} className="h-10" />
              </div>
              <div>
                <label className="text-xs text-slate-500">비고 (선택)</label>
                <Input placeholder="참고사항" value={editModal.note} onChange={e => setEditModal(m => ({ ...m, note: e.target.value }))} className="h-10 mt-1" />
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="destructive" size="sm" className="h-10 px-3" onClick={deleteSchedule}>
                  <Trash2 className="w-4 h-4" />
                </Button>
                <Button variant="outline" className="flex-1 h-10" onClick={() => setEditModal(m => ({ ...m, open: false }))}>취소</Button>
                <Button className="flex-1 h-10" onClick={updateSchedule} disabled={!editModal.projectId || !editModal.date || !editModal.task.trim() || saving}>{saving ? '저장 중...' : '저장'}</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ===== 프로젝트 편집 모달 ===== */}
      {projectModal.open && projectModal.project && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 print:hidden" onClick={() => setProjectModal(m => ({ ...m, open: false }))}>
          <Card className="w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">프로젝트 편집</h3>
                <button onClick={() => setProjectModal(m => ({ ...m, open: false }))} className="text-slate-500 hover:text-slate-600"><X className="w-5 h-5" /></button>
              </div>
              <div>
                <label className="text-xs text-slate-500">프로젝트명</label>
                <Input value={projectModal.name} onChange={e => setProjectModal(m => ({ ...m, name: e.target.value }))} className="mt-1 h-10" />
              </div>
              <div>
                <label className="text-xs text-slate-500">색상</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {COLOR_PRESETS.map(color => (
                    <button key={color} onClick={() => setProjectModal(m => ({ ...m, color }))}
                      className={`w-7 h-7 rounded-full border-2 transition ${projectModal.color === color ? 'border-slate-800 dark:border-white scale-110' : 'border-transparent hover:scale-105'}`}
                      style={{ backgroundColor: color }} />
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1 h-10" onClick={() => setProjectModal(m => ({ ...m, open: false }))}>취소</Button>
                <Button className="flex-1 h-10" onClick={saveProject}>저장</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ===== 공종별 요약 모달 ===== */}
      {summaryModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 print:hidden" onClick={() => setSummaryModal(m => ({ ...m, open: false }))}>
          <Card className="w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold flex items-center gap-2"><FileText className="w-5 h-5" /> 공종별 요약</h3>
                <button onClick={() => setSummaryModal(m => ({ ...m, open: false }))} className="text-slate-500 hover:text-slate-600"><X className="w-5 h-5" /></button>
              </div>
              <div className="text-xs text-slate-500">업체에 보낼 문자로 사용하세요. 내용을 직접 수정한 뒤 복사할 수 있습니다.</div>
              <textarea
                value={summaryModal.text}
                onChange={e => setSummaryModal(m => ({ ...m, text: e.target.value }))}
                className="w-full h-[50vh] p-3 text-sm font-mono bg-slate-50 dark:bg-slate-900 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 h-10" onClick={() => setSummaryModal(m => ({ ...m, open: false }))}>닫기</Button>
                <Button className="flex-1 h-10" onClick={copySummary}>
                  {copied ? <><Check className="w-4 h-4 mr-1" /> 복사됨!</> : <><Copy className="w-4 h-4 mr-1" /> 클립보드 복사</>}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 인쇄 스타일 */}
      <style jsx global>{`
        @media print {
          @page {
            size: landscape;
            margin: 10mm;
          }
          body * { visibility: hidden; }
          #calendar-root, #calendar-root * { visibility: visible; }
          #calendar-root { position: absolute; left: 0; top: 0; width: 100%; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
        }
      `}</style>
    </div>
  );
}
