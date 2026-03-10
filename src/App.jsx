import React, { useState, useMemo, useEffect } from 'react';
import { auth, loginGoogle, logout } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";

import { Plus } from "lucide-react";
import { 
  Calendar, 
  UserCheck, 
  GraduationCap, 
  Minus, 
  AlertTriangle, 
  X, 
  Check, 
  Trash2,
  Clock,
  FileText,
  ChevronRight
} from 'lucide-react';

// --- CONFIGURAÇÕES FIXAS ---
const DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
const TIME_SLOTS = [
  '07h - 08h', '08h - 09h', '09h - 10h', '10h - 11h', '11h - 12h',
  '12h - 13h', '13h - 14h', '14h - 15h', '15h - 16h', '16h - 17h', '17h - 18h'
];

const COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 
  'bg-amber-500', 'bg-rose-500', 'bg-indigo-500', 'bg-cyan-500'
];

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('attendance');
  
  // Estados iniciais vazios (serão preenchidos após o login)
  const [subjects, setSubjects] = useState([]);
  const [schedule, setSchedule] = useState({});

  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [isEvalModalOpen, setIsEvalModalOpen] = useState(false);
  
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);
  const [selectedDayForAbsence, setSelectedDayForAbsence] = useState(DAYS[new Date().getDay() - 1] || 'Segunda');

  const [newSubject, setNewSubject] = useState({ name: '', ch: '' });
  const [newEval, setNewEval] = useState({ name: '', date: '', weight: 1, grade: '' });

  // --- EFEITOS DE AUTENTICAÇÃO E DADOS ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      try {
        const savedSubjects = localStorage.getItem(`mh_subjects_${user.uid}`);
        if (savedSubjects) setSubjects(JSON.parse(savedSubjects));

        const savedSchedule = localStorage.getItem(`mh_schedule_${user.uid}`);
        if (savedSchedule) setSchedule(JSON.parse(savedSchedule));
      } catch (e) { 
        console.error("Erro ao carregar dados", e); 
      }
    } else {
      setSubjects([]);
      setSchedule({});
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      localStorage.setItem(`mh_subjects_${user.uid}`, JSON.stringify(subjects));
    }
  }, [subjects, user]);

  useEffect(() => {
    if (user) {
      localStorage.setItem(`mh_schedule_${user.uid}`, JSON.stringify(schedule));
    }
  }, [schedule, user]);

  // --- LÓGICA DO APP ---
  const hoursPerSubjectPerDay = useMemo(() => {
    const map = {};
    DAYS.forEach(day => {
      map[day] = {};
      TIME_SLOTS.forEach(time => {
        const slotKey = `${day}-${time}`;
        const subId = schedule[slotKey];
        if (subId) {
          map[day][subId] = (map[day][subId] || 0) + 1;
        }
      });
    });
    return map;
  }, [schedule]);

  const getSubjectStats = (subject) => {
    const evals = subject.evaluations || [];
    if (evals.length === 0) return { avg: 0, totalWeight: 0, needed: 7 };
    const sumPoints = evals.reduce((acc, ev) => acc + (parseFloat(ev.grade || 0) * parseFloat(ev.weight)), 0);
    const totalWeight = evals.reduce((acc, ev) => acc + parseFloat(ev.weight), 0);
    const avg = totalWeight > 0 ? sumPoints / totalWeight : 0;
    return { avg, totalWeight, needed: Math.max(0, (7 - avg)).toFixed(1) };
  };

  const handleAddSubject = (e) => {
    e.preventDefault();
    if (!newSubject.name || !newSubject.ch) return;
    const subject = {
      id: crypto.randomUUID(),
      name: newSubject.name,
      ch: parseInt(newSubject.ch),
      absences: 0,
      color: COLORS[subjects.length % COLORS.length],
      evaluations: []
    };
    setSubjects([...subjects, subject]);
    setNewSubject({ name: '', ch: '' });
    setIsSubjectModalOpen(false);
  };

  const removeSubject = (id) => {
    if(!confirm("Tem certeza que deseja excluir esta disciplina?")) return;
    setSubjects(subjects.filter(s => s.id !== id));
    const newSchedule = { ...schedule };
    Object.keys(newSchedule).forEach(key => { if (newSchedule[key] === id) delete newSchedule[key]; });
    setSchedule(newSchedule);
  };

  const handleAddEvaluation = (e) => {
    e.preventDefault();
    const evaluation = {
      id: crypto.randomUUID(),
      name: newEval.name,
      date: newEval.date,
      weight: parseFloat(newEval.weight),
      grade: parseFloat(newEval.grade)
    };
    setSubjects(subjects.map(s => s.id === selectedSubjectId ? { ...s, evaluations: [...(s.evaluations || []), evaluation] } : s));
    setNewEval({ name: '', date: '', weight: 1, grade: '' });
    setIsEvalModalOpen(false);
  };

  const removeEvaluation = (subjectId, evalId) => {
    setSubjects(subjects.map(s => s.id === subjectId ? { ...s, evaluations: s.evaluations.filter(ev => ev.id !== evalId) } : s));
  };

  const assignSubjectToSlot = (subjectId) => {
    setSchedule({ ...schedule, [selectedSlot]: subjectId });
    setIsSlotModalOpen(false);
  };

  const clearSlot = () => {
    const newSchedule = { ...schedule };
    delete newSchedule[selectedSlot];
    setSchedule(newSchedule);
    setIsSlotModalOpen(false);
  };

  const updateAbsences = (id, delta) => {
    setSubjects(subjects.map(s => s.id === id ? { ...s, absences: Math.max(0, s.absences + delta) } : s));
  };

  // --- RENDERIZAÇÃO CONDICIONAL (LOADING E LOGIN) ---
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-indigo-600 font-bold animate-pulse">
        Carregando...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-10 rounded-[2rem] shadow-xl text-center max-w-sm w-full border border-slate-100 animate-in zoom-in-95">
          <h1 className="text-2xl font-black mb-2 text-indigo-600 tracking-tighter uppercase italic">
            Meu Horário
          </h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-8">Painel Acadêmico</p>
          <button
            onClick={loginGoogle}
            className="w-full bg-indigo-600 text-white px-6 py-4 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-100 active:scale-95 transition-all"
          >
            Entrar com Google
          </button>
        </div>
      </div>
    );
  }

  // --- RENDERIZAÇÃO PRINCIPAL DO APP ---
  return (
    <div className="min-h-screen bg-slate-50 pb-32 font-sans text-slate-900 overflow-x-hidden">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 py-4 flex justify-between items-center shadow-sm">
        <div className="flex-1">
          <h1 className="text-xl font-black text-indigo-600 tracking-tighter uppercase leading-none">MEU HORÁRIO</h1>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic">Painel Acadêmico</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={logout}
            className="text-rose-500 hover:text-rose-600 text-[10px] font-black uppercase tracking-widest transition-colors"
          >
            Sair
          </button>
          <button 
            onClick={() => setIsSubjectModalOpen(true)}
            className="flex items-center gap-1.5 bg-indigo-600 text-white px-3 py-2 rounded-xl text-[10px] font-black shadow-lg shadow-indigo-100 active:scale-95 transition-all whitespace-nowrap"
          >
            <Plus size={14} /> CADASTRAR
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 space-y-6">
        
        {/* ABA: HORÁRIO */}
        {activeTab === 'schedule' && (
          <div className="animate-in fade-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-4 px-1">
              <h2 className="text-md font-bold flex items-center gap-2 text-slate-700 uppercase tracking-tight italic">
                <Calendar className="text-indigo-500" size={18} /> Horário
              </h2>
              <div className="flex items-center gap-1 text-slate-300 animate-pulse">
                <span className="text-[9px] font-bold uppercase tracking-widest">Arraste</span>
                <ChevronRight size={12}/>
              </div>
            </div>

            <div className="bg-white rounded-[2rem] shadow-xl border border-slate-200 overflow-hidden overflow-x-auto">
              <div className="min-w-[750px] sm:min-w-[850px]">
                <div className="grid grid-cols-[80px_repeat(5,1fr)] bg-slate-50 border-b border-slate-200">
                  <div className="p-3 border-r border-slate-200 text-[9px] font-black text-slate-400 text-center uppercase flex items-center justify-center italic">Hora</div>
                  {DAYS.map(day => (
                    <div key={day} className="p-4 border-r border-slate-200 last:border-r-0 text-[10px] font-black text-slate-600 text-center uppercase tracking-widest italic text-indigo-900/40">
                      {day}
                    </div>
                  ))}
                </div>

                {TIME_SLOTS.map(time => (
                  <div key={time} className="grid grid-cols-[80px_repeat(5,1fr)] border-b border-slate-100 last:border-0 group">
                    <div className="p-3 border-r border-slate-200 bg-slate-50/30 flex items-center justify-center text-center">
                      <span className="text-[9px] font-bold text-slate-400 leading-tight">{time}</span>
                    </div>
                    {DAYS.map(day => {
                      const slotKey = `${day}-${time}`;
                      const subId = schedule[slotKey];
                      const subject = subjects.find(s => s.id === subId);
                      return (
                        <button 
                          key={slotKey}
                          onClick={() => { setSelectedSlot(slotKey); setIsSlotModalOpen(true); }}
                          className="p-1 border-r border-slate-100 last:border-r-0 min-h-[75px] transition-all hover:bg-indigo-50/30 flex flex-col items-center justify-center text-center"
                        >
                          {subject ? (
                            <div className={`${subject.color} text-white w-full h-full rounded-xl p-1.5 flex flex-col justify-center items-center shadow-sm animate-in fade-in scale-in-90`}>
                              <span className="text-[9px] font-black leading-tight uppercase line-clamp-2">{subject.name}</span>
                            </div>
                          ) : (
                            <div className="w-6 h-6 rounded-full border border-dashed border-slate-100 flex items-center justify-center opacity-30">
                              <Plus size={10} className="text-slate-300" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ABA: FALTAS */}
        {activeTab === 'attendance' && (
          <div className="max-w-md mx-auto space-y-6 animate-in slide-in-from-bottom-6 duration-500">
            <div className="bg-indigo-600 rounded-[2rem] p-6 text-white shadow-2xl shadow-indigo-200 relative overflow-hidden">
               <div className="relative z-10">
                 <h2 className="text-lg font-black italic tracking-tighter mb-4 uppercase">Registro Rápido</h2>
                 <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
                   {DAYS.map(day => (
                     <button 
                      key={day}
                      onClick={() => setSelectedDayForAbsence(day)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${selectedDayForAbsence === day ? 'bg-white text-indigo-600 shadow-md' : 'bg-indigo-500/30 text-indigo-100'}`}
                     >
                       {day.slice(0, 3)}
                     </button>
                   ))}
                 </div>
                 <div className="space-y-3 mt-2">
                   {Object.keys(hoursPerSubjectPerDay[selectedDayForAbsence] || {}).length > 0 ? (
                     Object.entries(hoursPerSubjectPerDay[selectedDayForAbsence]).map(([subId, hours]) => {
                       const subject = subjects.find(s => s.id === subId);
                       if (!subject) return null;
                       return (
                         <div key={subId} className="bg-white/10 backdrop-blur-md rounded-xl p-3 flex justify-between items-center border border-white/10">
                           <div className="flex-1 min-w-0 mr-2">
                             <p className="text-[11px] font-black uppercase tracking-tight truncate">{subject.name}</p>
                             <p className="text-[9px] font-bold text-indigo-200 uppercase">{hours} {hours === 1 ? 'Hora' : 'Horas'}</p>
                           </div>
                           <button onClick={() => updateAbsences(subId, hours)} className="bg-white text-indigo-600 text-[9px] font-black px-4 py-2 rounded-lg shadow-sm uppercase active:scale-95 transition-transform">Faltei</button>
                         </div>
                       );
                     })
                   ) : (
                     <p className="text-center py-4 text-[10px] font-bold text-indigo-200 italic opacity-60 uppercase">Sem aulas em {selectedDayForAbsence}.</p>
                   )}
                 </div>
               </div>
            </div>

            <h2 className="text-md font-bold flex items-center gap-2 text-slate-700 uppercase italic px-1">
              <UserCheck className="text-indigo-500" size={18} /> Situação de Faltas
            </h2>

            <div className="grid gap-4">
              {subjects.map(subject => {
                const limit = subject.ch * 0.25;
                const percentage = (subject.absences / limit) * 100;
                const remains = Math.max(0, limit - subject.absences);
                const isCritical = percentage >= 85;
                return (
                  <div key={subject.id} className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm transition-all hover:shadow-md">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1 min-w-0 pr-2">
                        <h3 className="font-black text-slate-800 uppercase tracking-tight text-xs truncate">{subject.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                           <span className="bg-slate-100 text-slate-500 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">CH: {subject.ch}h</span>
                           <span className="bg-indigo-50 text-indigo-600 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">Limite: {limit.toFixed(0)}h</span>
                        </div>
                      </div>
                      <div className="flex items-center bg-slate-50 p-1 rounded-xl gap-1.5 border border-slate-100">
                        <button onClick={() => updateAbsences(subject.id, -1)} className="p-1.5 bg-white rounded-lg shadow-sm text-slate-400 hover:text-rose-500 active:scale-90"><Minus size={14}/></button>
                        <span className="text-sm font-black w-6 text-center tabular-nums">{subject.absences}</span>
                        <button onClick={() => updateAbsences(subject.id, 1)} className="p-1.5 bg-white rounded-lg shadow-sm text-slate-400 hover:text-indigo-600 active:scale-90"><Plus size={14}/></button>
                      </div>
                    </div>
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200 mb-2 relative">
                      <div className={`h-full transition-all duration-700 ${percentage >= 85 ? 'bg-rose-500' : percentage >= 60 ? 'bg-amber-400' : 'bg-emerald-500'}`} style={{ width: `${Math.min(percentage, 100)}%` }} />
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1">
                         <Clock size={10} className="text-slate-300"/>
                         <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Pode faltar: <span className={remains <= 2 ? 'text-rose-500 font-black underline' : 'text-slate-600'}>{remains.toFixed(0)}h</span></span>
                      </div>
                      <span className={`text-[9px] font-black uppercase ${isCritical ? 'text-rose-500' : 'text-emerald-500'}`}>{subject.absences >= limit ? 'REPROVADO' : `${percentage.toFixed(0)}% USADO`}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ABA: NOTAS */}
        {activeTab === 'grades' && (
          <div className="max-w-md mx-auto space-y-6 animate-in slide-in-from-bottom-6 duration-500">
            <h2 className="text-md font-bold px-1 flex items-center gap-2 text-slate-700 uppercase italic">
              <GraduationCap size={18} className="text-indigo-500"/> Notas e Desempenho
            </h2>
            {subjects.map(subject => {
              const { avg, needed } = getSubjectStats(subject);
              const isPassing = avg >= 7;
              return (
                <div key={subject.id} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                    <h3 className="font-black text-slate-800 uppercase text-[11px] truncate flex-1 pr-2 tracking-tight">{subject.name}</h3>
                    <div className="flex items-center gap-2">
                      <div className={`px-3 py-1 rounded-lg text-[10px] font-black shadow-sm ${isPassing ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>{avg.toFixed(1)}</div>
                      <button onClick={() => removeSubject(subject.id)} className="text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={14}/></button>
                    </div>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="space-y-1.5">
                      {subject.evaluations?.map(ev => (
                        <div key={ev.id} className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl border border-slate-100 group">
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-bold text-slate-700 truncate">{ev.name}</p>
                            <p className="text-[8px] text-slate-400 font-bold uppercase italic">Peso {ev.weight}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] font-black text-indigo-600">{ev.grade.toFixed(1)}</span>
                            <button onClick={() => removeEvaluation(subject.id, ev.id)} className="text-slate-200 hover:text-rose-500"><X size={12}/></button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                       <div className="flex-1 bg-indigo-50 p-3 rounded-xl flex items-center justify-between border border-indigo-100/50 shadow-inner">
                          <span className="text-[9px] font-black text-indigo-400 uppercase tracking-tighter italic">Status</span>
                          <span className="text-[10px] font-black text-indigo-700 uppercase tracking-tighter">{isPassing ? 'APROVADO' : `FALTAM ${needed}`}</span>
                       </div>
                       <button onClick={() => { setSelectedSubjectId(subject.id); setIsEvalModalOpen(true); }} className="p-3 bg-indigo-600 text-white rounded-xl font-black text-[9px] uppercase active:scale-95 shadow-lg shadow-indigo-100">LANÇAR NOTA</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <footer className="text-center pt-8 pb-4 opacity-40">
           <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">Desenvolvido por Orlando Marques Jr</p>
        </footer>
      </main>

      {/* MODAIS */}
      {isSubjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-xs rounded-[2rem] shadow-2xl overflow-hidden p-6 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-md font-black italic tracking-tighter uppercase text-indigo-600">Nova Matéria</h3>
              <button onClick={() => setIsSubjectModalOpen(false)} className="text-slate-300"><X size={20}/></button>
            </div>
            <form onSubmit={handleAddSubject} className="space-y-5 text-left">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-1 tracking-widest">Nome</label>
                <input required placeholder="Cálculo, Física..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-xs font-bold outline-none focus:border-indigo-500" value={newSubject.name} onChange={e => setNewSubject({...newSubject, name: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-1 tracking-widest">Carga Total (H)</label>
                <input required type="number" placeholder="45, 60, 90..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-xs font-bold outline-none focus:border-indigo-500" value={newSubject.ch} onChange={e => setNewSubject({...newSubject, ch: e.target.value})} />
                <div className="flex gap-1.5 mt-2">
                  {[30, 45, 60, 72].map(v => (
                    <button key={v} type="button" onClick={() => setNewSubject({...newSubject, ch: v})} className={`flex-1 py-1.5 text-[9px] font-black rounded-lg border ${newSubject.ch == v ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-100 text-slate-400'}`}>{v}H</button>
                  ))}
                </div>
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl mt-4 active:scale-95 transition-all">SALVAR</button>
            </form>
          </div>
        </div>
      )}

      {isEvalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-xs rounded-[2rem] shadow-2xl overflow-hidden p-6 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-md font-black italic tracking-tighter uppercase text-indigo-600">Lançar Nota</h3>
              <button onClick={() => setIsEvalModalOpen(false)} className="text-slate-300"><X size={20}/></button>
            </div>
            <form onSubmit={handleAddEvaluation} className="space-y-4 text-left">
              <input required placeholder="Descrição (P1, Trabalho...)" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none" value={newEval.name} onChange={e => setNewEval({...newEval, name: e.target.value})} />
              <div className="grid grid-cols-2 gap-3">
                 <input type="number" step="0.1" placeholder="Peso" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none" value={newEval.weight} onChange={e => setNewEval({...newEval, weight: e.target.value})} />
                 <input required type="number" step="0.1" max="10" placeholder="Nota" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-black outline-none text-indigo-600" value={newEval.grade} onChange={e => setNewEval({...newEval, grade: e.target.value})} />
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-xl text-[10px] font-black uppercase tracking-widest mt-2 active:scale-95 transition-all shadow-lg">REGISTRAR</button>
            </form>
          </div>
        </div>
      )}

      {isSlotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in text-left">
          <div className="bg-white w-full max-w-xs rounded-[2rem] shadow-2xl overflow-hidden p-6 animate-in zoom-in-95">
            <h3 className="text-sm font-black text-center mb-1 uppercase tracking-tight italic">Ocupar Horário</h3>
            <p className="text-[9px] font-bold text-slate-400 text-center uppercase mb-6 tracking-widest">{selectedSlot?.replace('-', ' • ')}</p>
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {subjects.map(s => (
                <button key={s.id} onClick={() => assignSubjectToSlot(s.id)} className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-100 hover:bg-indigo-50 transition-all text-left">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${s.color}`}></div>
                    <span className="text-[10px] font-bold text-slate-700 truncate uppercase tracking-tighter">{s.name}</span>
                  </div>
                  <Check size={14} className="text-indigo-600 opacity-0 transition-opacity" />
                </button>
              ))}
            </div>
            <div className="mt-6 flex flex-col gap-3">
              <button onClick={clearSlot} className="w-full text-slate-300 text-[9px] font-black uppercase hover:text-rose-500 underline underline-offset-4">Limpar Horário</button>
              <button onClick={() => setIsSlotModalOpen(false)} className="w-full py-3 bg-slate-50 rounded-xl text-[9px] font-black uppercase text-slate-400 border border-slate-100">Voltar</button>
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-slate-100 px-6 py-4 pb-10 z-40 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
        <div className="max-w-md mx-auto flex justify-around items-center">
          <NavButton active={activeTab === 'schedule'} onClick={() => setActiveTab('schedule')} icon={<Calendar size={20} />} label="Grade" />
          <NavButton active={activeTab === 'attendance'} onClick={() => setActiveTab('attendance')} icon={<UserCheck size={20} />} label="Faltas" />
          <NavButton active={activeTab === 'grades'} onClick={() => setActiveTab('grades')} icon={<GraduationCap size={20} />} label="Notas" />
        </div>
      </nav>
    </div>
  );
}

function NavButton({ active, icon, label, onClick }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 transition-all">
      <div className={`p-2 rounded-xl transition-all ${active ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 -translate-y-1.5' : 'text-slate-300'}`}>
        {icon}
      </div>
      <span className={`text-[8px] font-black uppercase tracking-widest ${active ? 'text-indigo-600' : 'text-slate-300'}`}>{label}</span>
    </button>
  );
}