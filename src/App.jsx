import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  BookOpen, 
  Calendar, 
  Clock, 
  XCircle, 
  BarChart3, 
  Plus, 
  Trash2,
  LogOut,
  Timer,
  School,
  Filter,
  TrendingUp,
  AlertTriangle,
  RotateCcw,
  Shield,
  User,
  Power,
  Lock,
  X,
  Key,
  Trophy,
  Star,
  GraduationCap,
  ClipboardList,
  ArrowLeft,
  MessageSquare,
  CheckCircle,
  Stethoscope,
  Home,
  PartyPopper,
  HelpCircle,
  Wifi,
  WifiOff,
  Loader
} from 'lucide-react';

// --- Firebase Imports ---
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signInWithCustomToken
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot,
  query
} from "firebase/firestore";

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyB_02HeiN2u2XQaNe0eGmd_36U1JIKgQmI",
  authDomain: "school-app-45711.firebaseapp.com",
  projectId: "school-app-45711",
  storageBucket: "school-app-45711.firebasestorage.app",
  messagingSenderId: "5129195648",
  appId: "1:5129195648:web:5e6c9a2661d27242325665"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'school-app-default';

const App = () => {
  // --- Auth & Connection State ---
  const [user, setUser] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [dataLoaded, setDataLoaded] = useState(false);

  // --- App Logic State ---
  const [userRole, setUserRole] = useState(null); // 'admin' | 'teacher'
  const [teacherClassId, setTeacherClassId] = useState(null);
  const [loginModalMode, setLoginModalMode] = useState(null);
  const [loginInput, setLoginInput] = useState('');
  const [loginError, setLoginError] = useState(false);
  const [currentView, setCurrentView] = useState('menu');

  // --- Data from Firebase ---
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [logs, setLogs] = useState([]);
  const [exams, setExams] = useState([]);
  const [grades, setGrades] = useState([]);
  const [dailyUpdates, setDailyUpdates] = useState([]);
  const [globalSettings, setGlobalSettings] = useState({ adminPassword: '1234' });

  // --- UI State ---
  const [activeTab, setActiveTab] = useState('attendance');
  const [gradesActiveTab, setGradesActiveTab] = useState('input');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [dismissalClassFilter, setDismissalClassFilter] = useState('all');
  const [adminUpdateClassFilter, setAdminUpdateClassFilter] = useState('all');
  
  // Student Details Modal State
  const [selectedStudentForDetails, setSelectedStudentForDetails] = useState(null);

  const [selectedExamId, setSelectedExamId] = useState(null);
  const [newExamTitle, setNewExamTitle] = useState('');
  const [newExamDate, setNewExamDate] = useState(new Date().toISOString().split('T')[0]);

  // Admin Updates UI
  const [updateStudentId, setUpdateStudentId] = useState('');
  const [updateReason, setUpdateReason] = useState('חולה');

  // New Item Inputs
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentClass, setNewStudentClass] = useState('');
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newClassName, setNewClassName] = useState('');
  const [newClassPassword, setNewClassPassword] = useState('');

  // Report Range
  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultStartDate.getDate() - 14);
  const [reportRange, setReportRange] = useState({
    start: defaultStartDate.toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  // --- Constants ---
  const ABSENCE_REASONS = [
    { label: 'חולה', icon: Stethoscope, color: 'text-rose-600', bg: 'bg-rose-100' },
    { label: 'נשלח לבית', icon: Home, color: 'text-orange-600', bg: 'bg-orange-100' },
    { label: 'לא חזר מהבית', icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' },
    { label: 'שמחה משפחתית', icon: PartyPopper, color: 'text-purple-600', bg: 'bg-purple-100' },
    { label: 'אחר', icon: HelpCircle, color: 'text-slate-600', bg: 'bg-slate-100' }
  ];

  // --- Firebase: Auth & Sync ---
  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    
    window.addEventListener('online', () => setIsOffline(false));
    window.addEventListener('offline', () => setIsOffline(true));
    
    return () => {
      unsubscribe();
      window.removeEventListener('online', () => setIsOffline(false));
      window.removeEventListener('offline', () => setIsOffline(true));
    };
  }, []);

  // Sync Data Effect
  useEffect(() => {
    if (!user) return;

    const basePath = `artifacts/${appId}/public/data`;
    
    const sub = (colName, setter) => onSnapshot(collection(db, basePath, colName), 
      (snap) => setter(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      (err) => console.error("Sync error:", err)
    );

    const unsubs = [
      sub('classes', setClasses),
      sub('students', setStudents),
      sub('subjects', setSubjects),
      sub('logs', setLogs),
      sub('exams', setExams),
      sub('grades', setGrades),
      sub('updates', setDailyUpdates),
      onSnapshot(doc(db, basePath, 'settings', 'global'), (doc) => {
        if (doc.exists()) setGlobalSettings(doc.data());
        else setDoc(doc.ref, { adminPassword: '1234' });
      })
    ];

    setTimeout(() => setDataLoaded(true), 1500);

    return () => unsubs.forEach(fn => fn());
  }, [user]);

  useEffect(() => {
    if (subjects.length > 0 && !selectedSubject) {
      setSelectedSubject(subjects[0].id);
    }
  }, [subjects, selectedSubject]);

  // --- Firebase Actions ---
  const saveDoc = async (col, id, data) => {
    if (!user) return;
    try {
      await setDoc(doc(db, `artifacts/${appId}/public/data`, col, id), data);
    } catch (e) { console.error("Save failed:", e); }
  };

  const removeDoc = async (col, id) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, `artifacts/${appId}/public/data`, col, id));
    } catch (e) { console.error("Delete failed:", e); }
  };

  // --- Helper Logic ---
  const getClassName = (classId) => classes.find(c => c.id === classId)?.name || 'ללא כיתה';
  const getSubjectName = (subId) => subjects.find(s => s.id === subId)?.name || 'לא ידוע';

  const toGematria = (num) => {
    if (num === 0) return '';
    if (num > 5000) num = num % 5000;
    const letters = [{val:400,c:'ת'},{val:300,c:'ש'},{val:200,c:'ר'},{val:100,c:'ק'},{val:90,c:'צ'},{val:80,c:'פ'},{val:70,c:'ע'},{val:60,c:'ס'},{val:50,c:'נ'},{val:40,c:'מ'},{val:30,c:'ל'},{val:20,c:'כ'},{val:10,c:'י'},{val:9,c:'ט'},{val:8,c:'ח'},{val:7,c:'ז'},{val:6,c:'ו'},{val:5,c:'ה'},{val:4,c:'ד'},{val:3,c:'ג'},{val:2,c:'ב'},{val:1,c:'א'}];
    let s = '', c = num;
    for (const {val, c: ch} of letters) {
        if (c===15){s+='טו';c=0;break;}if(c===16){s+='טז';c=0;break;}
        while(c>=val){s+=ch;c-=val;}
    }
    return s.length>1 ? s.slice(0,-1)+'"'+s.slice(-1) : s+"'";
  };

  const formatHebrewDate = (isoDate) => {
    if (!isoDate) return '';
    try {
      const d = new Date(isoDate);
      const opts = { calendar: 'hebrew', day: 'numeric', month: 'numeric', year: 'numeric' };
      const p = new Intl.DateTimeFormat('en-u-ca-hebrew', opts).formatToParts(d);
      const day = parseInt(p.find(x=>x.type==='day').value);
      const year = parseInt(p.find(x=>x.type==='year').value);
      const month = new Intl.DateTimeFormat('he-IL-u-ca-hebrew', {month:'long'}).format(d);
      return `${toGematria(day)} ב${month} ${toGematria(year)}`;
    } catch { return isoDate; }
  };

  const formatDualDate = (isoDate) => {
    if (!isoDate) return '';
    const greg = new Date(isoDate).toLocaleDateString('he-IL');
    const heb = formatHebrewDate(isoDate);
    return `${greg} • ${heb}`;
  }

  // --- Entity Actions ---
  const addClass = () => {
    if (newClassName.trim() && newClassPassword.trim()) {
      const id = crypto.randomUUID();
      saveDoc('classes', id, { name: newClassName.trim(), password: newClassPassword.trim() });
      setNewClassName(''); setNewClassPassword('');
    }
  };

  const addStudent = () => {
    if (newStudentName.trim() && newStudentClass) {
      const id = crypto.randomUUID();
      saveDoc('students', id, { name: newStudentName.trim(), classId: newStudentClass });
      setNewStudentName('');
    }
  };

  const addSubject = () => {
    if (newSubjectName.trim()) {
      const id = crypto.randomUUID();
      saveDoc('subjects', id, { name: newSubjectName.trim() });
      setNewSubjectName('');
    }
  };

  const updateAttendance = (studentId, status, minutes = 0) => {
    const id = `log_${selectedDate}_${studentId}_${selectedSubject}`;
    if (status === null) {
      removeDoc('logs', id);
    } else {
      const effectiveMinutes = status === 'absent' ? 45 : (status === 'late' ? minutes : 0);
      saveDoc('logs', id, {
        date: selectedDate,
        subjectId: selectedSubject,
        studentId,
        status,
        minutes: effectiveMinutes
      });
    }
  };

  const addDailyUpdate = () => {
    if (updateStudentId && updateReason && selectedDate) {
      const id = `update_${selectedDate}_${updateStudentId}`;
      saveDoc('updates', id, {
        studentId: updateStudentId,
        date: selectedDate,
        reason: updateReason
      });
      setUpdateStudentId('');
    }
  };

  const addExam = () => {
    if (newExamTitle.trim() && selectedSubject) {
      const id = crypto.randomUUID();
      saveDoc('exams', id, {
        title: newExamTitle.trim(),
        subjectId: selectedSubject,
        date: newExamDate
      });
      setNewExamTitle('');
    }
  };

  const deleteExam = (examId) => {
    removeDoc('exams', examId);
    grades.filter(g => g.examId === examId).forEach(g => removeDoc('grades', `grade_${examId}_${g.studentId}`));
    if (selectedExamId === examId) setSelectedExamId(null);
  };

  const updateGrade = (examId, studentId, score) => {
    const id = `grade_${examId}_${studentId}`;
    const numScore = score === '' ? '' : parseInt(score);
    if (numScore !== '' && (numScore < 0 || numScore > 100)) return;

    if (score === '') removeDoc('grades', id);
    else saveDoc('grades', id, { examId, studentId, score: numScore });
  };

  const updateAdminPassword = (newPass) => {
    saveDoc('settings', 'global', { adminPassword: newPass });
  };

  const removeClassAndRefs = (classId) => {
    removeDoc('classes', classId);
  };

  const removeStudentAndRefs = (studentId) => {
    removeDoc('students', studentId);
  };

  // --- Derived Data Getters ---
  const getLog = (studentId) => logs.find(l => l.date === selectedDate && l.subjectId === selectedSubject && l.studentId === studentId);
  const getDailyUpdate = (studentId) => dailyUpdates.find(u => u.studentId === studentId && u.date === selectedDate);
  const getGrade = (examId, studentId) => grades.find(g => g.examId === examId && g.studentId === studentId)?.score ?? '';
  const getExamAverage = (examId) => {
    const relevantStudentIds = filteredStudents.map(s => s.id);
    const relevantGrades = grades.filter(g => g.examId === examId && relevantStudentIds.includes(g.studentId));
    if (relevantGrades.length === 0) return 0;
    const sum = relevantGrades.reduce((acc, curr) => acc + curr.score, 0);
    return (sum / relevantGrades.length).toFixed(1);
  };

  // --- Report Calculations ---
  const filteredStudents = useMemo(() => {
    if (userRole === 'teacher' && teacherClassId) return students.filter(s => s.classId === teacherClassId);
    if (classFilter !== 'all') return students.filter(s => s.classId === classFilter);
    return students;
  }, [students, classFilter, userRole, teacherClassId]);

  const dismissalReport = useMemo(() => {
    return students
      .filter(s => dismissalClassFilter === 'all' || s.classId === dismissalClassFilter)
      .map(student => {
        const studentLogs = logs.filter(l => l.studentId === student.id && l.date >= reportRange.start && l.date <= reportRange.end);
        const validLogs = studentLogs.filter(l => !dailyUpdates.some(u => u.studentId === student.id && u.date === l.date));
        const penalty = validLogs.reduce((acc, curr) => acc + (curr.minutes || 0), 0);
        
        if (penalty === 0) return null;
        
        let mins = (13 * 60) + penalty;
        return {
          id: student.id,
          name: student.name,
          className: getClassName(student.classId),
          penalty,
          time: `${Math.floor(mins / 60)}:${(mins % 60).toString().padStart(2, '0')}`
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.className.localeCompare(b.className, 'he') || a.name.localeCompare(b.name, 'he'));
  }, [students, logs, dailyUpdates, reportRange, dismissalClassFilter, classes]);

  const statsData = useMemo(() => {
    const subjectStats = subjects.map(sub => {
      const subLogs = logs.filter(l => l.subjectId === sub.id && l.date >= reportRange.start && l.date <= reportRange.end);
      const validLogs = subLogs.filter(l => !dailyUpdates.some(u => u.studentId === l.studentId && u.date === l.date));
      const totalMinutes = validLogs.reduce((acc, curr) => acc + (curr.minutes || 0), 0);
      return { id: sub.id, name: sub.name, totalMinutes, incidentCount: validLogs.length };
    }).sort((a, b) => b.totalMinutes - a.totalMinutes);

    const classStats = classes.map(cls => {
      const clsStudents = students.filter(s => s.classId === cls.id);
      const studentIds = clsStudents.map(s => s.id);
      const clsLogs = logs.filter(l => studentIds.includes(l.studentId) && l.date >= reportRange.start && l.date <= reportRange.end);
      const validLogs = clsLogs.filter(l => !dailyUpdates.some(u => u.studentId === l.studentId && u.date === l.date));
      const totalMinutes = validLogs.reduce((acc, curr) => acc + (curr.minutes || 0), 0);
      const avgPerStudent = clsStudents.length > 0 ? (totalMinutes / clsStudents.length) : 0;
      return { id: cls.id, name: cls.name, totalMinutes, avgPerStudent, studentCount: clsStudents.length };
    }).sort((a, b) => b.avgPerStudent - a.avgPerStudent);

    return { subjectStats, classStats };
  }, [logs, subjects, classes, students, reportRange, dailyUpdates]);

  const gradesStatsData = useMemo(() => {
    const subjectStats = subjects.map(sub => {
      const subExams = exams.filter(e => e.subjectId === sub.id);
      const subExamIds = subExams.map(e => e.id);
      
      let eligibleStudents = students;
      if (userRole === 'teacher' && teacherClassId) {
        eligibleStudents = students.filter(s => s.classId === teacherClassId);
      }
      const studentIds = eligibleStudents.map(s => s.id);

      const subGrades = grades.filter(g => subExamIds.includes(g.examId) && studentIds.includes(g.studentId));
      
      const totalScore = subGrades.reduce((acc, curr) => acc + curr.score, 0);
      const avg = subGrades.length > 0 ? (totalScore / subGrades.length) : 0;
      
      return { id: sub.id, name: sub.name, avg, count: subGrades.length };
    }).filter(s => s.count > 0).sort((a, b) => b.avg - a.avg);

    const classStats = classes.map(cls => {
      if (userRole === 'teacher' && teacherClassId && cls.id !== teacherClassId) return null;
      const clsStudents = students.filter(s => s.classId === cls.id);
      const studentIds = clsStudents.map(s => s.id);
      const clsGrades = grades.filter(g => studentIds.includes(g.studentId));
      const totalScore = clsGrades.reduce((acc, curr) => acc + curr.score, 0);
      const avg = clsGrades.length > 0 ? (totalScore / clsGrades.length) : 0;
      return { id: cls.id, name: cls.name, avg, count: clsGrades.length };
    }).filter(Boolean).filter(s => s.count > 0).sort((a, b) => b.avg - a.avg);

    return { subjectStats, classStats };
  }, [exams, grades, subjects, classes, students, userRole, teacherClassId]);

  const filteredExams = useMemo(() => {
    return exams.filter(e => e.subjectId === selectedSubject);
  }, [exams, selectedSubject]);

  // --- Auth Handlers ---
  const handleAuth = () => {
    setLoginError(false);
    if (loginModalMode === 'admin') {
      if (loginInput === globalSettings.adminPassword) {
        setUserRole('admin');
        setTeacherClassId(null);
        setCurrentView('menu');
        setLoginModalMode(null);
        setLoginInput('');
      } else setLoginError(true);
    } else {
      const cls = classes.find(c => c.password === loginInput);
      if (cls) {
        setUserRole('teacher');
        setTeacherClassId(cls.id);
        setCurrentView('menu');
        setLoginModalMode(null);
        setLoginInput('');
      } else setLoginError(true);
    }
  };

  const handleLogout = () => {
    setUserRole(null);
    setTeacherClassId(null);
    setCurrentView('login');
    setClassFilter('all');
    setDismissalClassFilter('all');
    setGradesActiveTab('input');
    setAdminUpdateClassFilter('all');
    setSelectedStudentForDetails(null);
  };

  // --- Loading Screen ---
  if (!dataLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center flex-col gap-4 text-indigo-600" dir="rtl">
        <Loader className="animate-spin" size={48} />
        <div className="font-bold text-lg">טוען נתונים מהענן...</div>
        {isOffline && <div className="text-red-500 flex items-center gap-2"><WifiOff size={16}/> אין חיבור לאינטרנט</div>}
      </div>
    );
  }

  // --- Login View ---
  if (!userRole) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans relative notranslate" dir="rtl" translate="no">
        {loginModalMode && (
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-sm relative">
              <button onClick={() => { setLoginModalMode(null); setLoginInput(''); setLoginError(false); }} className="absolute top-4 left-4 text-slate-400 hover:text-slate-600"><X size={20} /></button>
              <div className="text-center mb-6">
                <div className="bg-indigo-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"><Lock className="text-indigo-600" size={24} /></div>
                <h2 className="text-xl font-bold text-slate-800">{loginModalMode === 'admin' ? 'כניסת מנהל' : 'כניסת מורה'}</h2>
                <p className="text-slate-500 text-sm">{loginModalMode === 'admin' ? 'הזן סיסמת מנהל' : 'הזן קוד כיתה'}</p>
              </div>
              <input type="password" value={loginInput} onChange={(e) => { setLoginInput(e.target.value); setLoginError(false); }} className="w-full p-3 border border-slate-300 rounded-xl text-center text-lg outline-none focus:ring-2 focus:ring-indigo-500 mb-4" autoFocus onKeyPress={(e) => e.key === 'Enter' && handleAuth()} />
              {loginError && <p className="text-red-500 text-xs text-center font-bold mb-4">פרטים שגויים</p>}
              <button onClick={handleAuth} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors">התחבר</button>
            </div>
          </div>
        )}
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center space-y-8">
          <div className="flex justify-center mb-4"><div className="bg-indigo-100 p-4 rounded-full"><School size={48} className="text-indigo-600" /></div></div>
          <div><h1 className="text-3xl font-bold text-slate-800 mb-2">מערכת מוסדית</h1><p className="text-slate-500">ניהול נוכחות וציונים בענן</p></div>
          <div className="space-y-4">
            <button onClick={() => setLoginModalMode('teacher')} className="w-full flex items-center justify-center gap-3 p-4 bg-white border-2 border-slate-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all group"><User size={24} className="text-slate-400 group-hover:text-indigo-600" /><div className="text-right flex-1"><div className="font-bold text-slate-700 group-hover:text-indigo-700">כניסת מורה</div><div className="text-xs text-slate-400">באמצעות קוד כיתה</div></div></button>
            <button onClick={() => setLoginModalMode('admin')} className="w-full flex items-center justify-center gap-3 p-4 bg-white border-2 border-slate-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all group"><Shield size={24} className="text-slate-400 group-hover:text-indigo-600" /><div className="text-right flex-1"><div className="font-bold text-slate-700 group-hover:text-indigo-700">כניסת מנהל</div><div className="text-xs text-slate-400">גישה מלאה למערכת</div></div></button>
          </div>
        </div>
      </div>
    );
  }

  // --- Menu View ---
  if (currentView === 'menu') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans notranslate" dir="rtl" translate="no">
        <div className="max-w-2xl w-full">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 text-white p-2 rounded-lg"><School size={24} /></div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">שלום, {userRole === 'admin' ? 'מנהל' : 'מורה'}</h1>
                <p className="text-slate-500">{teacherClassId ? `מחנך ${getClassName(teacherClassId)}` : 'תפריט ראשי'}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Power size={24} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button onClick={() => setCurrentView('attendance')} className="bg-white p-8 rounded-3xl shadow-sm border-2 border-transparent hover:border-indigo-500 hover:shadow-xl transition-all group text-center"><div className="bg-indigo-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-indigo-100 transition-colors"><ClipboardList size={40} className="text-indigo-600" /></div><h2 className="text-2xl font-bold text-slate-800 mb-2">נוכחות</h2><p className="text-slate-500">חיסורים, אישורים ודוחות</p></button>
            <button onClick={() => setCurrentView('grades')} className="bg-white p-8 rounded-3xl shadow-sm border-2 border-transparent hover:border-emerald-500 hover:shadow-xl transition-all group text-center"><div className="bg-emerald-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-emerald-100 transition-colors"><GraduationCap size={40} className="text-emerald-600" /></div><h2 className="text-2xl font-bold text-slate-800 mb-2">ציונים</h2><p className="text-slate-500">מבחנים, ציונים וסטטיסטיקה</p></button>
          </div>
        </div>
      </div>
    );
  }

  const Header = ({ title, icon: Icon, colorClass }) => (
    <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <button onClick={() => setCurrentView('menu')} className="bg-white p-2 rounded-full shadow-sm hover:bg-slate-100 transition-colors"><ArrowLeft size={20} className="text-slate-600" /></button>
        <div>
          <h1 className={`text-3xl font-bold flex items-center gap-2 ${colorClass}`}><Icon className="opacity-80" />{title}</h1>
          <p className="text-slate-500 flex items-center gap-2">
            <span className="bg-slate-200 text-slate-600 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">{userRole === 'admin' ? 'מנהל' : 'מורה'}</span>
            {isOffline && <span className="bg-red-100 text-red-600 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><WifiOff size={10}/> אופליין</span>}
          </p>
        </div>
      </div>
    </header>
  );

  // --- Grades App ---
  if (currentView === 'grades') {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8 font-sans notranslate" dir="rtl" translate="no">
        <div className="max-w-5xl mx-auto">
          <Header title="מערכת ציונים" icon={GraduationCap} colorClass="text-emerald-700" />
          <div className="mb-6 flex">
            <nav className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
              <button onClick={() => setGradesActiveTab('input')} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${gradesActiveTab === 'input' ? 'bg-emerald-600 text-white' : 'hover:bg-slate-100'}`}><ClipboardList size={18} /><span>הזנה</span></button>
              {userRole === 'admin' && <button onClick={() => setGradesActiveTab('stats')} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${gradesActiveTab === 'stats' ? 'bg-emerald-600 text-white' : 'hover:bg-slate-100'}`}><BarChart3 size={18} /><span>סטטיסטיקה</span></button>}
            </nav>
          </div>

          <div className="space-y-6 animate-in fade-in duration-300">
            {gradesActiveTab === 'input' && (
              <>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-end">
                  <div className="flex-1 w-full"><label className="text-sm font-semibold text-slate-600 block mb-1">מקצוע</label><select value={selectedSubject} onChange={(e) => {setSelectedSubject(e.target.value); setSelectedExamId(null);}} className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500">{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                  {userRole === 'admin' && <div className="flex-1 w-full"><label className="text-sm font-semibold text-slate-600 block mb-1">כיתה</label><select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 outline-none"><option value="all">הכל</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="space-y-4">
                     <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                        <h3 className="font-bold text-lg mb-4">מבחנים ב{getSubjectName(selectedSubject)}</h3>
                        <div className="space-y-2 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <div className="text-xs font-bold text-emerald-600 mb-2">יצירת מבחן חדש</div>
                          <input type="text" value={newExamTitle} onChange={(e) => setNewExamTitle(e.target.value)} placeholder="שם המבחן..." className="w-full p-2 text-sm border border-slate-300 rounded-lg outline-none mb-2" />
                          <div className="flex gap-2">
                            <input type="date" value={newExamDate} onChange={(e) => setNewExamDate(e.target.value)} className="w-full p-2 text-sm border border-slate-300 rounded-lg outline-none" />
                            <button onClick={addExam} className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold"><Plus size={18}/></button>
                          </div>
                          <div className="text-xs text-center text-slate-500 mt-1 font-bold">תאריך עברי: {formatHebrewDate(newExamDate)}</div>
                        </div>
                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                          {filteredExams.map(exam => (
                            <div key={exam.id} onClick={() => setSelectedExamId(exam.id)} className={`p-3 rounded-xl border cursor-pointer transition-all ${selectedExamId === exam.id ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500' : 'bg-slate-50 border-slate-200 hover:border-emerald-300'}`}>
                              <div className="flex justify-between items-start"><div><div className="font-bold text-slate-800">{exam.title}</div><div className="text-xs text-slate-500">{formatDualDate(exam.date)}</div></div><button onClick={(e) => { e.stopPropagation(); deleteExam(exam.id); }} className="text-slate-300 hover:text-red-500"><Trash2 size={14}/></button></div>
                              <div className="mt-2 text-xs font-bold text-emerald-600 flex items-center gap-1"><BarChart3 size={12}/> ממוצע: {getExamAverage(exam.id)}</div>
                            </div>
                          ))}
                          {filteredExams.length === 0 && <div className="text-center text-slate-400 text-sm py-4">אין מבחנים</div>}
                        </div>
                     </div>
                  </div>
                  <div className="lg:col-span-2">
                    {selectedExamId ? (
                      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center"><div><h3 className="font-bold text-lg">הזנת ציונים: <span className="text-emerald-600">{exams.find(e => e.id === selectedExamId)?.title}</span></h3><p className="text-xs text-slate-500">{formatDualDate(exams.find(e => e.id === selectedExamId)?.date)}</p></div><div className="text-sm bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full font-bold">ממוצע: {getExamAverage(selectedExamId)}</div></div>
                        <table className="w-full overflow-x-auto"><thead className="bg-slate-50 border-b text-sm"><tr><th className="px-6 py-3 text-right">תלמיד</th><th className="px-6 py-3 text-center w-32">ציון</th></tr></thead><tbody className="divide-y divide-slate-100">
                          {filteredStudents.map(student => (
                            <tr key={student.id} className="hover:bg-slate-50"><td className="px-6 py-3"><div className="font-bold">{student.name}</div><div className="text-xs text-slate-400">{getClassName(student.classId)}</div></td><td className="px-6 py-3 text-center"><input type="number" min="0" max="100" placeholder="-" value={getGrade(selectedExamId, student.id)} onChange={(e) => updateGrade(selectedExamId, student.id, e.target.value)} className="w-20 text-center p-2 border rounded-lg font-bold text-lg bg-slate-50" /></td></tr>
                          ))}
                        </tbody></table>
                      </div>
                    ) : <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 flex flex-col items-center justify-center text-slate-400 h-full"><GraduationCap size={48} className="mb-4 opacity-20" /><p>בחר מבחן להזנת ציונים</p></div>}
                  </div>
                </div>
              </>
            )}
            {gradesActiveTab === 'stats' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 relative overflow-hidden"><div className="relative z-10"><div className="text-emerald-800 font-bold mb-1 flex items-center gap-2"><Star size={18}/> מקצוע מצטיין</div><div className="text-2xl font-black text-emerald-600 truncate">{gradesStatsData.subjectStats.length > 0 ? gradesStatsData.subjectStats[0].name : '---'}</div><div className="text-xs text-emerald-500 mt-2">{gradesStatsData.subjectStats.length > 0 ? `ממוצע: ${gradesStatsData.subjectStats[0].avg.toFixed(1)}` : 'אין נתונים'}</div></div><Trophy className="absolute -bottom-4 -left-4 text-emerald-100 w-24 h-24" /></div>
                  <div className="bg-rose-50 p-6 rounded-2xl border border-rose-100 relative overflow-hidden"><div className="relative z-10"><div className="text-rose-800 font-bold mb-1 flex items-center gap-2"><AlertTriangle size={18}/> מקצוע חלש</div><div className="text-2xl font-black text-rose-600 truncate">{gradesStatsData.subjectStats.length > 0 ? gradesStatsData.subjectStats[gradesStatsData.subjectStats.length - 1].name : '---'}</div><div className="text-xs text-rose-500 mt-2">{gradesStatsData.subjectStats.length > 0 ? `ממוצע: ${gradesStatsData.subjectStats[gradesStatsData.subjectStats.length - 1].avg.toFixed(1)}` : 'אין נתונים'}</div></div><BookOpen className="absolute -bottom-4 -left-4 text-rose-100 w-24 h-24" /></div>
                  <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 relative overflow-hidden"><div className="relative z-10"><div className="text-blue-800 font-bold mb-1 flex items-center gap-2"><School size={18}/> כיתה מצטיינת</div><div className="text-2xl font-black text-blue-600 truncate">{gradesStatsData.classStats.length > 0 ? gradesStatsData.classStats[0].name : '---'}</div><div className="text-xs text-blue-500 mt-2">{gradesStatsData.classStats.length > 0 ? `ממוצע: ${gradesStatsData.classStats[0].avg.toFixed(1)}` : 'אין נתונים'}</div></div><Users className="absolute -bottom-4 -left-4 text-blue-100 w-24 h-24" /></div>
                  <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100 relative overflow-hidden"><div className="relative z-10"><div className="text-orange-800 font-bold mb-1 flex items-center gap-2"><AlertTriangle size={18}/> כיתה לשיפור</div><div className="text-2xl font-black text-orange-600 truncate">{gradesStatsData.classStats.length > 0 ? gradesStatsData.classStats[gradesStatsData.classStats.length - 1].name : '---'}</div><div className="text-xs text-orange-500 mt-2">{gradesStatsData.classStats.length > 0 ? `ממוצע: ${gradesStatsData.classStats[gradesStatsData.classStats.length - 1].avg.toFixed(1)}` : 'אין נתונים'}</div></div><Users className="absolute -bottom-4 -left-4 text-orange-100 w-24 h-24" /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"><div className="p-4 border-b border-slate-100 font-bold text-slate-700">דירוג מקצועות</div><table className="w-full text-sm overflow-x-auto"><thead className="bg-slate-50"><tr><th className="p-3 text-right">מקצוע</th><th className="p-3 text-center">ממוצע</th><th className="p-3 text-center">ציונים</th></tr></thead><tbody className="divide-y divide-slate-100">{gradesStatsData.subjectStats.map((sub, idx) => (<tr key={sub.id}><td className="p-3 font-medium">{sub.name}</td><td className="p-3 text-center font-bold">{sub.avg.toFixed(1)}</td><td className="p-3 text-center">{sub.count}</td></tr>))}</tbody></table></div>
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"><div className="p-4 border-b border-slate-100 font-bold text-slate-700">דירוג כיתות</div><table className="w-full text-sm overflow-x-auto"><thead className="bg-slate-50"><tr><th className="p-3 text-right">כיתה</th><th className="p-3 text-center">ממוצע</th><th className="p-3 text-center">ציונים</th></tr></thead><tbody className="divide-y divide-slate-100">{gradesStatsData.classStats.map((cls, idx) => (<tr key={cls.id}><td className="p-3 font-medium">{cls.name}</td><td className="p-3 text-center font-bold">{cls.avg.toFixed(1)}</td><td className="p-3 text-center">{cls.count}</td></tr>))}</tbody></table></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- Attendance App ---
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8 font-sans notranslate" dir="rtl" translate="no">
      <div className="max-w-5xl mx-auto">
        <Header title="מערכת נוכחות" icon={School} colorClass="text-indigo-700" />
        <div className="mb-6"><nav className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200 overflow-x-auto inline-flex">
          <button onClick={() => setActiveTab('attendance')} className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap ${activeTab === 'attendance' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100'}`}><Calendar size={18} /><span>רישום</span></button>
          {userRole === 'admin' && <><button onClick={() => setActiveTab('admin_updates')} className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap ${activeTab === 'admin_updates' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100'}`}><MessageSquare size={18} /><span>אישורים</span></button><button onClick={() => setActiveTab('dismissal')} className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap ${activeTab === 'dismissal' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100'}`}><LogOut size={18} /><span>יציאה</span></button><button onClick={() => setActiveTab('stats')} className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap ${activeTab === 'stats' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100'}`}><BarChart3 size={18} /><span>סטטיסטיקה</span></button><button onClick={() => setActiveTab('settings')} className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap ${activeTab === 'settings' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100'}`}><Users size={18} /><span>ניהול</span></button></>}
        </nav></div>

        {activeTab === 'attendance' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="space-y-2"><label className="text-sm font-semibold text-slate-600 block">תאריך</label><div className="relative"><input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full p-2 pl-4 border border-slate-300 rounded-lg outline-none text-transparent relative z-10 bg-transparent" /><div className="absolute inset-0 flex items-center pr-3 pointer-events-none z-0 text-slate-700 font-bold bg-white rounded-lg border border-slate-300">{formatHebrewDate(selectedDate)}</div></div><div className="mt-1"><input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"/><div className="text-sm text-indigo-600 font-bold mt-1 text-center bg-indigo-50 p-1 rounded">{formatHebrewDate(selectedDate)}</div></div></div>
              <div className="space-y-2"><label className="text-sm font-semibold text-slate-600 block">מקצוע</label><select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg outline-none">{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
              <div className="space-y-2"><label className="text-sm font-semibold text-slate-600 block flex items-center gap-1"><Filter size={14}/> כיתה</label>{userRole === 'teacher' ? <div className="w-full p-2 border border-slate-200 bg-slate-100 text-slate-500 rounded-lg font-bold">{getClassName(teacherClassId)}</div> : <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg bg-indigo-50 text-indigo-700 font-bold outline-none"><option value="all">הכל</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>}</div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-x-auto">
              <table className="w-full text-sm md:text-base"><thead className="bg-slate-50 border-b"><tr><th className="px-6 py-4 text-right">תלמיד</th><th className="px-6 py-4 text-center">סטטוס</th></tr></thead><tbody className="divide-y divide-slate-100">
                {filteredStudents.map(student => {
                  const log = getLog(student.id);
                  const update = getDailyUpdate(student.id);
                  return (
                    <tr key={student.id} className="hover:bg-slate-50"><td className="px-6 py-4"><div className="font-bold">{student.name}</div><div className="text-xs text-slate-400">{getClassName(student.classId)}</div></td>
                    <td className="px-6 py-4"><div className="flex justify-center gap-2">
                      {update ? <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 font-bold shadow-sm w-full justify-center ${ABSENCE_REASONS.find(r=>r.label===update.reason)?.bg} ${ABSENCE_REASONS.find(r=>r.label===update.reason)?.color}`}><CheckCircle size={16}/>{update.reason} (מאושר)</div> : 
                      <>
                        <div className={`flex items-center gap-1 p-1 rounded-xl border transition-all ${log?.status === 'late' ? 'bg-amber-100 border-amber-500 text-amber-800' : 'bg-white border-slate-200 text-slate-400'}`}><button onClick={() => updateAttendance(student.id, 'late', log?.status==='late'?log.minutes:5)} className="p-1"><Clock size={18}/></button><input type="number" placeholder="דק'" value={log?.status==='late'?log.minutes:''} onChange={(e)=>updateAttendance(student.id,'late',parseInt(e.target.value)||0)} className="w-10 bg-transparent text-center text-xs outline-none font-bold" /></div>
                        <button onClick={() => updateAttendance(student.id, 'absent')} className={`p-2 rounded-xl border ${log?.status === 'absent' ? 'bg-red-100 text-red-700 border-red-500' : 'bg-white border-slate-200 text-slate-400'}`}><XCircle size={18}/></button>
                        {log && <button onClick={() => updateAttendance(student.id, null)} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"><RotateCcw size={18}/></button>}
                      </>}
                    </div></td></tr>
                  );
                })}
              </tbody></table>
            </div>
          </div>
        )}

        {userRole === 'admin' && activeTab === 'admin_updates' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
               <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><MessageSquare className="text-indigo-600"/> עדכון אישור</h2>
               <div className="space-y-2"><label className="text-sm font-semibold text-slate-600 block">תאריך</label><div className="text-xs text-indigo-600 font-bold mb-1">{formatHebrewDate(selectedDate)}</div><input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg outline-none" /></div>
               <div className="space-y-2"><label className="text-sm font-semibold text-slate-600 block">סינון כיתה</label><select value={adminUpdateClassFilter} onChange={(e) => {setAdminUpdateClassFilter(e.target.value); setUpdateStudentId('');}} className="w-full p-2 border border-slate-300 rounded-lg outline-none"><option value="all">כל הכיתות</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
               <div className="space-y-2"><label className="text-sm font-semibold text-slate-600 block">תלמיד</label><select value={updateStudentId} onChange={(e) => setUpdateStudentId(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg outline-none"><option value="">בחר תלמיד...</option>{students.filter(s => adminUpdateClassFilter === 'all' || s.classId === adminUpdateClassFilter).map(s => <option key={s.id} value={s.id}>{s.name} ({getClassName(s.classId)})</option>)}</select></div>
               <div className="space-y-2"><label className="text-sm font-semibold text-slate-600 block">סיבה</label><div className="grid grid-cols-2 gap-2">{ABSENCE_REASONS.map(r => <button key={r.label} onClick={() => setUpdateReason(r.label)} className={`p-2 rounded-lg text-xs font-bold flex items-center gap-2 border ${updateReason === r.label ? `${r.bg} ${r.color} border-current` : 'bg-slate-50'}`}><r.icon size={14}/>{r.label}</button>)}</div></div>
               <button onClick={addDailyUpdate} disabled={!updateStudentId} className={`w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 ${updateStudentId ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-300'}`}><CheckCircle size={18}/> אשר</button>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col h-[500px]">
               <h2 className="text-xl font-bold text-slate-800 mb-4">אישורים ({formatHebrewDate(selectedDate)})</h2>
               <div className="flex-1 overflow-y-auto space-y-2">
                  {dailyUpdates.filter(u => u.date === selectedDate).map(update => {
                    const st = students.find(s => s.id === update.studentId);
                    const reason = ABSENCE_REASONS.find(r => r.label === update.reason) || ABSENCE_REASONS[4];
                    const Ico = reason.icon;
                    return <div key={update.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex justify-between items-center"><div className="flex items-center gap-3"><div className={`p-2 rounded-full ${reason.bg} ${reason.color}`}><Ico size={16}/></div><div><div className="font-bold text-slate-800">{st?.name}</div><div className="text-xs text-slate-500">{getClassName(st?.classId)} • {update.reason}</div></div></div><button onClick={() => removeDoc('updates', update.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button></div>
                  })}
                  {dailyUpdates.filter(u => u.date === selectedDate).length === 0 && <div className="text-center text-slate-400 mt-10">אין אישורים</div>}
               </div>
            </div>
          </div>
        )}

        {userRole === 'admin' && activeTab === 'settings' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 md:col-span-2">
                <h2 className="text-lg font-bold flex items-center gap-2"><Lock size={20} className="text-indigo-600" />אבטחה</h2>
                <div className="flex gap-4 items-center bg-slate-50 p-4 rounded-xl"><div className="flex-1"><label className="text-sm font-semibold text-slate-600 block mb-1">סיסמת מנהל</label><input type="text" value={globalSettings.adminPassword} onChange={(e) => { const v=e.target.value; setGlobalSettings(p=>({...p,adminPassword:v})); updateAdminPassword(v); }} className="w-full max-w-xs p-2 text-sm border border-slate-300 rounded-lg outline-none font-mono tracking-widest bg-white"/></div></div>
             </div>
             <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
               <h2 className="text-lg font-bold flex items-center gap-2"><School size={20} className="text-indigo-600" />כיתות</h2>
               <div className="flex gap-2"><input type="text" value={newClassName} onChange={(e) => setNewClassName(e.target.value)} placeholder="שם..." className="flex-1 p-2 text-sm border border-slate-300 rounded-lg outline-none" /><input type="text" value={newClassPassword} onChange={(e) => setNewClassPassword(e.target.value)} placeholder="קוד..." className="w-20 p-2 text-sm border border-slate-300 rounded-lg outline-none" /><button onClick={addClass} className="p-2 bg-indigo-600 text-white rounded-lg"><Plus size={18}/></button></div>
               <ul className="divide-y divide-slate-100 max-h-64 overflow-y-auto border rounded-lg">{classes.map(c => <li key={c.id} className="p-3 flex justify-between items-center text-sm"><div><span className="font-bold">{c.name}</span> <span className="text-xs bg-slate-100 px-1 rounded font-mono">{c.password}</span></div><button onClick={() => removeClassAndRefs(c.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button></li>)}</ul>
             </div>
             <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
               <h2 className="text-lg font-bold flex items-center gap-2"><Users size={20} className="text-indigo-600" />תלמידים</h2>
               <div className="space-y-2"><input type="text" value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} placeholder="שם..." className="w-full p-2 text-sm border border-slate-300 rounded-lg outline-none" /><div className="flex gap-2"><select value={newStudentClass} onChange={(e) => setNewStudentClass(e.target.value)} className="flex-1 p-2 text-sm border border-slate-300 rounded-lg outline-none"><option value="">בחר כיתה...</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select><button onClick={addStudent} className="px-4 bg-indigo-600 text-white rounded-lg"><Plus size={18}/></button></div></div>
               <ul className="divide-y divide-slate-100 max-h-64 overflow-y-auto border rounded-lg">{students.map(s => <li key={s.id} className="p-2 flex justify-between items-center text-sm"><div><div className="font-medium">{s.name}</div><div className="text-[10px] text-slate-400">{getClassName(s.classId)}</div></div><button onClick={() => removeStudentAndRefs(s.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button></li>)}</ul>
             </div>
             <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 md:col-span-2">
               <h2 className="text-lg font-bold flex items-center gap-2"><BookOpen size={20} className="text-indigo-600" />מקצועות</h2>
               <div className="flex gap-2"><input type="text" value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} placeholder="שם..." className="flex-1 p-2 text-sm border border-slate-300 rounded-lg outline-none" /><button onClick={addSubject} className="p-2 bg-indigo-600 text-white rounded-lg"><Plus size={18}/></button></div>
               <ul className="divide-y divide-slate-100 max-h-48 overflow-y-auto border rounded-lg">{subjects.map(s => <li key={s.id} className="p-2 flex justify-between items-center text-sm"><span>{s.name}</span><button onClick={() => removeSubject(s.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button></li>)}</ul>
             </div>
          </div>
        )}

        {userRole === 'admin' && activeTab === 'dismissal' && (
          <div className="space-y-6">
             <div className="bg-indigo-900 text-white p-6 rounded-2xl shadow-lg flex flex-col md:flex-row justify-between items-center gap-4">
                <div><h2 className="text-2xl font-bold flex items-center gap-2"><Timer />דו"ח יציאה</h2><p className="text-indigo-200 text-sm">חישוב עיכובים בניכוי אישורים</p>
                <p className="text-indigo-200 text-sm mt-1 font-bold bg-indigo-800/50 p-2 rounded-lg">
                  טווח: {formatHebrewDate(reportRange.start)} - {formatHebrewDate(reportRange.end)}
                </p>
                </div>
                <div className="flex flex-col gap-2 items-end">
                   <div className="flex items-center gap-2"><Filter size={16} className="text-indigo-300"/><select value={dismissalClassFilter} onChange={(e) => setDismissalClassFilter(e.target.value)} className="bg-indigo-800 border-none rounded-lg text-sm p-2 text-white font-bold"><option value="all">כל הכיתות</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                   <div className="flex gap-2"><input type="date" value={reportRange.start} onChange={(e) => setReportRange({...reportRange, start: e.target.value})} className="bg-indigo-800 border-none rounded-lg text-xs p-2 text-white" /><span className="text-indigo-300 self-center">עד</span><input type="date" value={reportRange.end} onChange={(e) => setReportRange({...reportRange, end: e.target.value})} className="bg-indigo-800 border-none rounded-lg text-xs p-2 text-white" /></div>
                </div>
             </div>
             <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-x-auto">
                <table className="w-full"><thead className="bg-slate-50 border-b"><tr><th className="px-6 py-4 text-right">תלמיד</th><th className="px-6 py-4 text-center">עיכוב</th><th className="px-6 py-4 text-left">שעת יציאה</th></tr></thead><tbody className="divide-y divide-slate-100">
                  {dismissalReport.map((item, idx) => (
                    <tr key={idx} className="hover:bg-indigo-50 cursor-pointer" onClick={() => setSelectedStudentForDetails(item.id)}><td className="px-6 py-4"><div className="font-bold">{item.name}</div><div className="text-xs text-slate-400">{item.className}</div></td><td className="px-6 py-4 text-center"><span className="px-2 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold border border-amber-200">{item.penalty} דק'</span></td><td className="px-6 py-4 text-left font-mono font-black text-xl text-indigo-700">{item.time}</td></tr>
                  ))}
                  {dismissalReport.length === 0 && <tr><td colSpan="3" className="px-6 py-12 text-center text-slate-400 italic">אין עיכובים</td></tr>}
                </tbody></table>
             </div>
             {selectedStudentForDetails && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                  <div className="p-4 border-b flex justify-between items-center bg-indigo-50">
                    <h3 className="font-bold text-lg text-indigo-800">{students.find(s => s.id === selectedStudentForDetails)?.name} - פירוט</h3>
                    <button onClick={() => setSelectedStudentForDetails(null)} className="p-2 hover:bg-indigo-100 rounded-full text-indigo-600"><X size={20}/></button>
                  </div>
                  <div className="p-0 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-500 sticky top-0"><tr><th className="px-4 py-3 text-right">תאריך</th><th className="px-4 py-3 text-right">מקצוע</th><th className="px-4 py-3 text-center">סוג</th><th className="px-4 py-3 text-center">דקות</th></tr></thead>
                      <tbody className="divide-y">
                        {logs.filter(l => 
                          l.studentId === selectedStudentForDetails && 
                          l.date >= reportRange.start && 
                          l.date <= reportRange.end &&
                          (l.status === 'late' || l.status === 'absent') &&
                          !dailyUpdates.some(u => u.studentId === l.studentId && u.date === l.date)
                        ).map((log, i) => (
                          <tr key={i}>
                            <td className="px-4 py-3"><div className="font-bold">{formatHebrewDate(log.date)}</div><div className="text-xs text-slate-400">{new Date(log.date).toLocaleDateString('he-IL')}</div></td>
                            <td className="px-4 py-3">{getSubjectName(log.subjectId)}</td>
                            <td className="px-4 py-3 text-center">
                              {log.status === 'absent' ? <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">חיסור</span> : <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs font-bold">איחור</span>}
                            </td>
                            <td className="px-4 py-3 text-center font-bold">{log.minutes}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {logs.filter(l => l.studentId === selectedStudentForDetails && l.date >= reportRange.start && l.date <= reportRange.end && (l.status === 'late' || l.status === 'absent') && !dailyUpdates.some(u => u.studentId === l.studentId && u.date === l.date)).length === 0 && (
                      <div className="p-8 text-center text-slate-400">אין אירועים חריגים בטווח זה</div>
                    )}
                  </div>
                </div>
              </div>
             )}
          </div>
        )}

        {userRole === 'admin' && activeTab === 'stats' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <h2 className="text-xl font-bold flex items-center gap-2"><TrendingUp className="text-indigo-600" />סטטיסטיקה ומגמות</h2>
              <div className="flex gap-2 mt-2 md:mt-0 items-center">
                 <div className="text-xs">
                    <input type="date" value={reportRange.start} onChange={(e) => setReportRange({...reportRange, start: e.target.value})} className="bg-slate-100 border-none rounded-lg text-xs p-2 outline-none" />
                    <div className="text-[9px] text-slate-400 text-center">{formatHebrewDate(reportRange.start)}</div>
                 </div>
                 <span className="self-center">-</span>
                 <div className="text-xs">
                    <input type="date" value={reportRange.end} onChange={(e) => setReportRange({...reportRange, end: e.target.value})} className="bg-slate-100 border-none rounded-lg text-xs p-2 outline-none" />
                    <div className="text-[9px] text-slate-400 text-center">{formatHebrewDate(reportRange.end)}</div>
                 </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-red-50 p-6 rounded-2xl border border-red-100 relative overflow-hidden"><div className="relative z-10"><div className="text-red-800 font-bold mb-1 flex items-center gap-2"><AlertTriangle size={18}/> מקצוע טעון שיפור</div><div className="text-2xl font-black text-red-600 truncate">{statsData.subjectStats[0]?.totalMinutes > 0 ? statsData.subjectStats[0].name : '---'}</div><div className="text-xs text-red-400 mt-2">{statsData.subjectStats[0]?.totalMinutes > 0 ? `סה"כ ${statsData.subjectStats[0].totalMinutes} דקות` : 'אין נתונים'}</div></div><BookOpen className="absolute -bottom-4 -left-4 text-red-100 w-24 h-24" /></div>
              <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 relative overflow-hidden"><div className="relative z-10"><div className="text-amber-800 font-bold mb-1 flex items-center gap-2"><AlertTriangle size={18}/> כיתה טעונה שיפור</div><div className="text-2xl font-black text-amber-600 truncate">{statsData.classStats[0]?.totalMinutes > 0 ? statsData.classStats[0].name : '---'}</div><div className="text-xs text-amber-600/70 mt-2">{statsData.classStats[0]?.totalMinutes > 0 ? `ממוצע ${statsData.classStats[0].avgPerStudent.toFixed(1)} דק'` : 'אין נתונים'}</div></div><Users className="absolute -bottom-4 -left-4 text-amber-100 w-24 h-24" /></div>
              <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 relative overflow-hidden"><div className="relative z-10"><div className="text-emerald-800 font-bold mb-1 flex items-center gap-2"><Star size={18}/> מקצוע מצטיין</div><div className="text-2xl font-black text-emerald-600 truncate">{statsData.bestSubject ? statsData.bestSubject.name : '---'}</div><div className="text-xs text-emerald-500 mt-2">{statsData.bestSubject ? `רק ${statsData.bestSubject.totalMinutes} דקות` : 'אין נתונים'}</div></div><Trophy className="absolute -bottom-4 -left-4 text-emerald-100 w-24 h-24" /></div>
              <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 relative overflow-hidden"><div className="relative z-10"><div className="text-blue-800 font-bold mb-1 flex items-center gap-2"><Star size={18}/> כיתה מצטיינת</div><div className="text-2xl font-black text-blue-600 truncate">{statsData.bestClass ? statsData.bestClass.name : '---'}</div><div className="text-xs text-blue-500 mt-2">{statsData.bestClass ? `ממוצע ${statsData.bestClass.avgPerStudent.toFixed(1)} דק'` : 'אין נתונים'}</div></div><Users className="absolute -bottom-4 -left-4 text-blue-100 w-24 h-24" /></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"><div className="p-4 border-b border-slate-100 font-bold text-slate-700">דירוג מקצועות (מהבעייתי לטוב)</div><table className="w-full text-sm overflow-x-auto"><thead className="bg-slate-50"><tr><th className="p-3 text-right">מקצוע</th><th className="p-3 text-center">דקות</th><th className="p-3 text-center">אירועים</th></tr></thead><tbody className="divide-y divide-slate-100">{statsData.subjectStats.map(s => (<tr key={s.id}><td className="p-3 font-medium">{s.name}</td><td className="p-3 text-center font-bold">{s.totalMinutes}</td><td className="p-3 text-center">{s.incidentCount}</td></tr>))}</tbody></table></div>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"><div className="p-4 border-b border-slate-100 font-bold text-slate-700">דירוג כיתות (לפי ממוצע)</div><table className="w-full text-sm overflow-x-auto"><thead className="bg-slate-50"><tr><th className="p-3 text-right">כיתה</th><th className="p-3 text-center">דקות</th><th className="p-3 text-center">ממוצע</th></tr></thead><tbody className="divide-y divide-slate-100">{statsData.classStats.map(c => (<tr key={c.id}><td className="p-3 font-medium">{c.name}</td><td className="p-3 text-center">{c.totalMinutes}</td><td className="p-3 text-center font-bold">{c.avgPerStudent.toFixed(1)}</td></tr>))}</tbody></table></div>
            </div>
          </div>
        )}
      </div>
      <footer className="mt-12 pt-6 border-t border-slate-200 text-center text-slate-400 text-xs">מערכת ניהול מוסדית v2.0 | כל הזכויות שמורות</footer>
    </div>
  );
};

export default App;