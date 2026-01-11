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
  Loader,
  Eye,
  ListX,
  CheckSquare,
  Search,
  FileText,
  PieChart
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
// הקוד מנסה למשוך את ההגדרות מקובץ .env (עבור המחשב שלך)
// אם הוא לא מוצא (כמו כאן בתצוגה), הוא משתמש בברירת מחדל
let firebaseConfig;
try {
  // @ts-ignore
  if (import.meta.env && import.meta.env.VITE_FIREBASE_API_KEY) {
    firebaseConfig = {
      // @ts-ignore
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      // @ts-ignore
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      // @ts-ignore
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      // @ts-ignore
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      // @ts-ignore
      messagingSenderId: import.meta.env.VITE_FIREBASE_SENDER_ID,
      // @ts-ignore
      appId: import.meta.env.VITE_FIREBASE_APP_ID
    };
  }
} catch (error) {
  // התעלם משגיאות אם import.meta לא קיים
}

// Fallback לסביבת התצוגה (Canvas)
if (!firebaseConfig && typeof __firebase_config !== 'undefined') {
    firebaseConfig = JSON.parse(__firebase_config);
}

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
  const [loggedInTeacherId, setLoggedInTeacherId] = useState(null);
  
  const [loginModalMode, setLoginModalMode] = useState(null);
  const [loginInput, setLoginInput] = useState('');
  const [loginError, setLoginError] = useState(false);
  const [currentView, setCurrentView] = useState('menu');
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);

  // --- Data from Firebase ---
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [assignments, setAssignments] = useState([]); // Links Teacher -> Class -> Subject
  const [logs, setLogs] = useState([]);
  const [exams, setExams] = useState([]);
  const [grades, setGrades] = useState([]);
  const [dailyUpdates, setDailyUpdates] = useState([]);
  const [dailyReports, setDailyReports] = useState([]); 
  const [globalSettings, setGlobalSettings] = useState({ adminPassword: '1234' });

  // --- UI State ---
  const [activeTab, setActiveTab] = useState('attendance');
  const [gradesActiveTab, setGradesActiveTab] = useState('input');
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [dismissalClassFilter, setDismissalClassFilter] = useState('all');
  const [adminUpdateClassFilter, setAdminUpdateClassFilter] = useState('all');
  
  const [selectedStudentForDetails, setSelectedStudentForDetails] = useState(null);
  const [selectedExamId, setSelectedExamId] = useState(null);
  const [newExamTitle, setNewExamTitle] = useState('');
  const [newExamDetails, setNewExamDetails] = useState(''); // שדה חדש: פירוט מבחן
  const [newExamDate, setNewExamDate] = useState(new Date().toISOString().split('T')[0]);

  // Admin Updates UI
  const [updateStudentId, setUpdateStudentId] = useState('');
  const [updateReason, setUpdateReason] = useState('חולה');
  const [customUpdateReason, setCustomUpdateReason] = useState(''); 
  const [updateStudentSearch, setUpdateStudentSearch] = useState(''); // שדה חדש: חיפוש באישור

  // Inputs
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentClass, setNewStudentClass] = useState('');
  const [studentManagementSearch, setStudentManagementSearch] = useState(''); // שדה חדש: חיפוש בניהול
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectDuration, setNewSubjectDuration] = useState(45); // NEW: Duration input
  const [newClassName, setNewClassName] = useState('');
  const [newClassPassword, setNewClassPassword] = useState(''); 
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherCode, setNewTeacherCode] = useState('');
  const [assignTeacher, setAssignTeacher] = useState('');
  const [assignClass, setAssignClass] = useState('');
  const [assignSubject, setAssignSubject] = useState('');

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

  // --- Firebase Init ---
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
    return () => { unsubscribe(); window.removeEventListener('online', () => setIsOffline(false)); window.removeEventListener('offline', () => setIsOffline(true)); };
  }, []);

  // Sync Data
  useEffect(() => {
    if (!user) return;
    const basePath = `artifacts/${appId}/public/data`;
    const sub = (colName, setter) => onSnapshot(collection(db, basePath, colName), (snap) => setter(snap.docs.map(d => ({ id: d.id, ...d.data() }))), (err) => console.error("Sync error:", err));
    const unsubs = [
      sub('classes', setClasses), sub('students', setStudents), sub('subjects', setSubjects), sub('teachers', setTeachers), sub('assignments', setAssignments),
      sub('logs', setLogs), sub('exams', setExams), sub('grades', setGrades), sub('updates', setDailyUpdates), sub('daily_reports', setDailyReports),
      onSnapshot(doc(db, basePath, 'settings', 'global'), (doc) => { if (doc.exists()) setGlobalSettings(doc.data()); else setDoc(doc.ref, { adminPassword: '1234' }); })
    ];
    setTimeout(() => setDataLoaded(true), 1500);
    return () => unsubs.forEach(fn => fn());
  }, [user]);

  useEffect(() => { if (subjects.length > 0 && !selectedSubject) setSelectedSubject(subjects[0].id); }, [subjects, selectedSubject]);

  // --- Helpers ---
  const saveDoc = async (col, id, data) => { if (user) await setDoc(doc(db, `artifacts/${appId}/public/data`, col, id), data); };
  const removeDoc = async (col, id) => { if (user) await deleteDoc(doc(db, `artifacts/${appId}/public/data`, col, id)); };
  
  const getClassName = (id) => classes.find(c => c.id === id)?.name || 'ללא כיתה';
  const getSubjectName = (id) => subjects.find(s => s.id === id)?.name || 'לא ידוע';
  const getTeacherName = (id) => {
    if (id === 'admin') return 'דווח על ידי המנהל';
    return teachers.find(t => t.id === id)?.name || 'לא ידוע';
  };
  
  // פונקציה לחישוב מספר התלמידים בכיתה
  const getStudentCountInClass = (classId) => students.filter(s => s.classId === classId).length;

  const toGematria = (num) => {
    if (num === 0) return ''; if (num > 5000) num = num % 5000;
    const letters = [{val:400,c:'ת'},{val:300,c:'ש'},{val:200,c:'ר'},{val:100,c:'ק'},{val:90,c:'צ'},{val:80,c:'פ'},{val:70,c:'ע'},{val:60,c:'ס'},{val:50,c:'נ'},{val:40,c:'מ'},{val:30,c:'ל'},{val:20,c:'כ'},{val:10,c:'י'},{val:9,c:'ט'},{val:8,c:'ח'},{val:7,c:'ז'},{val:6,c:'ו'},{val:5,c:'ה'},{val:4,c:'ד'},{val:3,c:'ג'},{val:2,c:'ב'},{val:1,c:'א'}];
    let s = '', c = num;
    for (const {val, c: ch} of letters) { if (c===15){s+='טו';c=0;break;}if(c===16){s+='טז';c=0;break;} while(c>=val){s+=ch;c-=val;} }
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
  };

  // --- Filtering Logic ---
  const availableClasses = useMemo(() => {
    if (userRole === 'admin') return classes;
    if (userRole === 'teacher' && loggedInTeacherId) {
      const myAssignments = assignments.filter(a => a.teacherId === loggedInTeacherId);
      const classIds = [...new Set(myAssignments.map(a => a.classId))];
      return classes.filter(c => classIds.includes(c.id));
    }
    return [];
  }, [classes, userRole, loggedInTeacherId, assignments]);

  const availableSubjects = useMemo(() => {
    if (userRole === 'admin') return subjects;
    if (userRole === 'teacher' && loggedInTeacherId) {
      let relevantAssignments = assignments.filter(a => a.teacherId === loggedInTeacherId);
      if (classFilter !== 'all') relevantAssignments = relevantAssignments.filter(a => a.classId === classFilter);
      const subjectIds = [...new Set(relevantAssignments.map(a => a.subjectId))];
      return subjects.filter(s => subjectIds.includes(s.id));
    }
    return [];
  }, [subjects, userRole, loggedInTeacherId, assignments, classFilter]);

  useEffect(() => {
    if (availableSubjects.length > 0 && !availableSubjects.find(s => s.id === selectedSubject)) {
      setSelectedSubject(availableSubjects[0].id);
    } else if (availableSubjects.length === 0) {
      setSelectedSubject('');
    }
  }, [availableSubjects]);

  const filteredStudents = useMemo(() => {
    let relevantClasses = availableClasses;
    if (classFilter !== 'all') relevantClasses = classes.filter(c => c.id === classFilter);
    const relevantClassIds = relevantClasses.map(c => c.id);
    
    // מיון לפי א' ב' כברירת מחדל
    return students
      .filter(s => relevantClassIds.includes(s.classId))
      .sort((a, b) => a.name.localeCompare(b.name, 'he')); 
  }, [students, availableClasses, classFilter]);

  // --- Missing Reports Logic ---
  const missingReports = useMemo(() => {
    return assignments.map(assign => {
      const classStudentIds = students.filter(s => s.classId === assign.classId).map(s => s.id);
      if (classStudentIds.length === 0) return null; 

      const hasLogs = logs.some(l => 
        l.date === selectedDate && 
        l.subjectId === assign.subjectId && 
        classStudentIds.includes(l.studentId)
      );

      const hasConfirmation = dailyReports.some(r => 
        r.date === selectedDate &&
        r.classId === assign.classId &&
        r.subjectId === assign.subjectId &&
        r.teacherId === assign.teacherId
      );

      if (!hasLogs && !hasConfirmation) {
        return {
          teacherId: assign.teacherId,
          teacherName: getTeacherName(assign.teacherId),
          className: getClassName(assign.classId),
          subjectName: getSubjectName(assign.subjectId)
        };
      }
      return null;
    })
    .filter(Boolean)
    .sort((a, b) => a.className.localeCompare(b.className, 'he')); 
  }, [assignments, students, logs, selectedDate, dailyReports, teachers, classes, subjects]);


  // --- Actions ---
  const addClass = () => { if(newClassName.trim()){ const id=crypto.randomUUID(); saveDoc('classes',id,{name:newClassName.trim()}); setNewClassName(''); } };
  const addStudent = () => { if(newStudentName.trim()&&newStudentClass){ const id=crypto.randomUUID(); saveDoc('students',id,{name:newStudentName.trim(),classId:newStudentClass}); setNewStudentName(''); } };
  const addSubject = () => { 
    if(newSubjectName.trim()){ 
      const id=crypto.randomUUID(); 
      saveDoc('subjects',id,{
        name:newSubjectName.trim(),
        duration: parseInt(newSubjectDuration) || 45
      }); 
      setNewSubjectName(''); 
      setNewSubjectDuration(45);
    } 
  };
  const addTeacher = () => { if(newTeacherName.trim()&&newTeacherCode.trim()){ const id=crypto.randomUUID(); saveDoc('teachers',id,{name:newTeacherName.trim(),password:newTeacherCode.trim()}); setNewTeacherName(''); setNewTeacherCode(''); } };
  
  const assignTeacherToClass = () => { 
    if (assignClass && assignSubject) { 
        // Allow admin/no-teacher assignment by defaulting to 'admin' if empty
        const tId = assignTeacher || 'admin';
        const exists = assignments.find(a => a.teacherId === tId && a.classId === assignClass && a.subjectId === assignSubject);
        if (!exists) { 
            const id = crypto.randomUUID(); 
            saveDoc('assignments', id, { teacherId: tId, classId: assignClass, subjectId: assignSubject }); 
        } 
    } 
  };
  
  const removeAssignment = (id) => removeDoc('assignments', id);
  const removeTeacher = (id) => removeDoc('teachers', id);
  const removeClassAndRefs = (id) => removeDoc('classes', id);
  const removeStudentAndRefs = (id) => removeDoc('students', id);
  const removeSubject = (id) => removeDoc('subjects', id);
  const updateAdminPassword = (p) => saveDoc('settings', 'global', { adminPassword: p });

  const updateAttendance = (studentId, status, minutes = 0) => {
    const id = `log_${selectedDate}_${studentId}_${selectedSubject}`;
    if (status === null) removeDoc('logs', id);
    else {
      markAsReported();
      const subj = subjects.find(s => s.id === selectedSubject);
      const effectiveMinutes = status === 'absent' ? (subj?.duration || 45) : (status === 'late' ? minutes : 0);
      saveDoc('logs', id, { date: selectedDate, subjectId: selectedSubject, studentId, status, minutes: effectiveMinutes });
    }
  };

  const markAsReported = () => {
    // Allows admin to also mark as reported if a specific class is selected
    if (selectedSubject && classFilter !== 'all') {
       const reporterId = loggedInTeacherId || 'admin';
       const id = `report_${selectedDate}_${classFilter}_${selectedSubject}`;
       
       saveDoc('daily_reports', id, {
         date: selectedDate,
         classId: classFilter,
         subjectId: selectedSubject,
         teacherId: reporterId,
         timestamp: Date.now()
       });
    }
  };

  const addDailyUpdate = () => {
    if (updateStudentId && updateReason && selectedDate) {
      const finalReason = updateReason === 'אחר' ? (customUpdateReason.trim() || 'אחר') : updateReason;
      
      const id = `update_${selectedDate}_${updateStudentId}`;
      saveDoc('updates', id, { 
        studentId: updateStudentId, 
        date: selectedDate, 
        reason: finalReason 
      });
      setUpdateStudentId('');
      setCustomUpdateReason('');
      setUpdateReason('חולה');
      setUpdateStudentSearch(''); 
    }
  };
  const removeUpdate = (id) => removeDoc('updates', id);

  const addExam = () => { 
    if (newExamTitle.trim() && selectedSubject) { 
      const id = crypto.randomUUID(); 
      saveDoc('exams', id, { 
        title: newExamTitle.trim(), 
        details: newExamDetails.trim(), 
        subjectId: selectedSubject, 
        date: newExamDate 
      }); 
      setNewExamTitle(''); 
      setNewExamDetails('');
    } 
  };
  const deleteExam = (id) => { removeDoc('exams', id); if(selectedExamId===id) setSelectedExamId(null); };
  const updateGrade = (eid, sid, val) => { 
    const id=`grade_${eid}_${sid}`; 
    if(val==='') removeDoc('grades', id); 
    else { const s=parseInt(val); if(s>=0&&s<=100) saveDoc('grades',id,{examId:eid,studentId:sid,score:s}); } 
  };

  // --- Getters & Reports ---
  const getLog = (sid) => logs.find(l => l.date === selectedDate && l.subjectId === selectedSubject && l.studentId === sid);
  const getDailyUpdate = (sid) => dailyUpdates.find(u => u.studentId === sid && u.date === selectedDate);
  const getGrade = (eid, sid) => grades.find(g => g.examId === eid && g.studentId === sid)?.score ?? '';
  const getExamAverage = (eid) => {
    const sids = filteredStudents.map(s=>s.id);
    const gs = grades.filter(g=>g.examId===eid && sids.includes(g.studentId));
    return gs.length ? (gs.reduce((a,c)=>a+c.score,0)/gs.length).toFixed(1) : 0;
  };
  
  const isCurrentViewReported = useMemo(() => {
    if (classFilter === 'all' || !selectedSubject) return false;
    const hasLogs = logs.some(l => l.date === selectedDate && l.subjectId === selectedSubject && filteredStudents.map(s=>s.id).includes(l.studentId));
    const hasReportDoc = dailyReports.some(r => r.date === selectedDate && r.classId === classFilter && r.subjectId === selectedSubject);
    return hasLogs || hasReportDoc;
  }, [logs, dailyReports, selectedDate, selectedSubject, classFilter, filteredStudents]);

  const dismissalReport = useMemo(() => {
    const justifiedSet = new Set(dailyUpdates.map(u => `${u.studentId}_${u.date}`));
    
    // 1. Map active lessons (Class + Date + Subject) based on reports AND logs
    // This ensures that if a log exists (even without teacher assignment), the lesson counts as "Potential"
    const activeLessonsSet = new Set();
    
    // Add from "All Present" reports
    dailyReports.forEach(r => {
      if (r.date >= reportRange.start && r.date <= reportRange.end) {
        activeLessonsSet.add(`${r.classId}_${r.date}_${r.subjectId}`);
      }
    });

    // Add from individual Logs (Penalties)
    logs.forEach(l => {
      if (l.date >= reportRange.start && l.date <= reportRange.end) {
        const student = students.find(s => s.id === l.studentId);
        if (student) {
          activeLessonsSet.add(`${student.classId}_${l.date}_${l.subjectId}`);
        }
      }
    });

    return students
      .filter(s => dismissalClassFilter === 'all' || s.classId === dismissalClassFilter)
      .map(student => {
        const sLogs = logs.filter(l => l.studentId === student.id && l.date >= reportRange.start && l.date <= reportRange.end);
        const validLogs = sLogs.filter(l => !justifiedSet.has(`${l.studentId}_${l.date}`));
        const penalty = validLogs.reduce((acc, curr) => acc + (curr.minutes || 0), 0);
        
        let mins = (13 * 60) + penalty;
        
        // --- PERCENTAGE CALCULATION START ---
        let totalPotentialMinutes = 0;
        
        const start = new Date(reportRange.start);
        const end = new Date(reportRange.end);
        
        // Iterate days in range
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
           const dStr = d.toISOString().split('T')[0];
           
           // Check against ALL subjects to see if a lesson occurred for this student's class
           subjects.forEach(sub => {
              if (activeLessonsSet.has(`${student.classId}_${dStr}_${sub.id}`)) {
                totalPotentialMinutes += (sub.duration || 45);
              }
           });
        }
        
        const presentMinutes = Math.max(0, totalPotentialMinutes - penalty);
        const percentage = totalPotentialMinutes > 0 ? Math.round((presentMinutes / totalPotentialMinutes) * 100) : 100;
        // --- PERCENTAGE CALCULATION END ---

        if (penalty === 0 && totalPotentialMinutes === 0) return null;
        if (penalty === 0) return { 
           id: student.id, name: student.name || 'לא ידוע', className: getClassName(student.classId), 
           penalty: 0, time: "13:00", percentage, totalPotentialMinutes, presentMinutes 
        };

        return {
          id: student.id, name: student.name || 'לא ידוע', className: getClassName(student.classId), penalty,
          time: `${Math.floor(mins / 60)}:${(mins % 60).toString().padStart(2, '0')}`,
          percentage, totalPotentialMinutes, presentMinutes
        };
      })
      .filter(Boolean)
      .sort((a, b) => (a.className||'').localeCompare(b.className||'') || (a.name||'').localeCompare(b.name||''));
  }, [students, logs, dailyUpdates, reportRange, dismissalClassFilter, classes, dailyReports, subjects]);

  const statsData = useMemo(() => {
    const subjectStats = subjects.map(sub => {
      const subLogs = logs.filter(l => l.subjectId === sub.id && l.date >= reportRange.start && l.date <= reportRange.end);
      const validLogs = subLogs.filter(l => !dailyUpdates.some(u => u.studentId === l.studentId && u.date === l.date));
      const total = validLogs.reduce((acc, curr) => acc + (curr.minutes || 0), 0);
      return { id: sub.id, name: sub.name, total, count: validLogs.length };
    }).sort((a, b) => b.total - a.total);

    const classStats = classes.map(cls => {
      const sids = students.filter(s => s.classId === cls.id).map(s => s.id);
      const cLogs = logs.filter(l => sids.includes(l.studentId) && l.date >= reportRange.start && l.date <= reportRange.end);
      const validLogs = cLogs.filter(l => !dailyUpdates.some(u => u.studentId === l.studentId && u.date === l.date));
      const total = validLogs.reduce((acc, curr) => acc + (curr.minutes || 0), 0);
      const avg = sids.length ? total / sids.length : 0;
      return { id: cls.id, name: cls.name, total, avg, count: sids.length };
    }).sort((a, b) => b.avg - a.avg);
    return { subjectStats, classStats };
  }, [logs, subjects, classes, students, reportRange, dailyUpdates]);

  const gradesStatsData = useMemo(() => {
    const subjectStats = subjects.map(sub => {
      const subExams = exams.filter(e => e.subjectId === sub.id);
      const subExamIds = subExams.map(e => e.id);
      const subGrades = grades.filter(g => subExamIds.includes(g.examId));
      const totalScore = subGrades.reduce((acc, curr) => acc + curr.score, 0);
      const avg = subGrades.length > 0 ? (totalScore / subGrades.length) : 0;
      return { id: sub.id, name: sub.name, avg, count: subGrades.length };
    }).filter(s => s.count > 0).sort((a, b) => b.avg - a.avg);

    const classStats = classes.map(cls => {
      const sids = students.filter(s => s.classId === cls.id).map(s => s.id);
      const cGrades = grades.filter(g => sids.includes(g.studentId));
      const totalScore = cGrades.reduce((acc, curr) => acc + curr.score, 0);
      const avg = cGrades.length > 0 ? (totalScore / cGrades.length) : 0;
      return { id: cls.id, name: cls.name, avg, count: cGrades.length };
    }).filter(Boolean).filter(s => s.count > 0).sort((a, b) => b.avg - a.avg);
    
    const bestSubject = subjectStats.length ? subjectStats[0] : null;
    const bestClass = classStats.length ? classStats[0] : null;

    return { subjectStats, classStats, bestSubject, bestClass };
  }, [exams, grades, subjects, classes, students]);

  const filteredExams = useMemo(() => {
    return exams.filter(e => e.subjectId === selectedSubject);
  }, [exams, selectedSubject]);

  // --- Auth Handlers ---
  const handleAuth = () => {
    setLoginError(false);
    if (isRecoveryMode && loginModalMode === 'admin' && loginInput === 'admin-reset') {
        updateAdminPassword('1234'); setGlobalSettings({...globalSettings, adminPassword: '1234'});
        alert('סיסמה אופסה ל-1234'); setIsRecoveryMode(false); setLoginInput(''); return;
    }
    if (loginModalMode === 'admin') {
      if (loginInput === globalSettings.adminPassword) {
        setUserRole('admin'); setTeacherClassId(null); setCurrentView('menu'); setLoginModalMode(null); setLoginInput('');
      } else setLoginError(true);
    } else {
      const t = teachers.find(t => t.password === loginInput);
      if (t) {
        setUserRole('teacher'); setLoggedInTeacherId(t.id); setCurrentView('menu'); setLoginModalMode(null); setLoginInput('');
      } else setLoginError(true);
    }
  };
  const handleLogout = () => {
    setUserRole(null); setTeacherClassId(null); setLoggedInTeacherId(null); setCurrentView('login');
    setClassFilter('all'); setDismissalClassFilter('all'); setGradesActiveTab('input');
    setAdminUpdateClassFilter('all'); setSelectedStudentForDetails(null);
    setIsRecoveryMode(false);
  };

  if (!dataLoaded) return <div className="min-h-screen bg-slate-50 flex items-center justify-center flex-col gap-4 text-indigo-600" dir="rtl"><Loader className="animate-spin" size={48} /><div className="font-bold text-lg">טוען נתונים...</div></div>;

  // --- Views ---
  if (!userRole) return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans notranslate" dir="rtl" translate="no">
      {loginModalMode && <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"><div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-sm relative"><button onClick={() => {setLoginModalMode(null);setLoginInput('');setLoginError(false);setIsRecoveryMode(false);}} className="absolute top-4 left-4 text-slate-400"><X size={20}/></button><div className="text-center mb-6"><div className="bg-indigo-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"><Lock className="text-indigo-600" size={24}/></div><h2 className="text-xl font-bold text-slate-800">{loginModalMode==='admin'?(isRecoveryMode?'שחזור':'מנהל'):'מורה'}</h2><p className="text-slate-500 text-sm">{loginModalMode==='admin'?(isRecoveryMode?'קוד שחזור':'סיסמה'):'קוד אישי'}</p></div><input type="password" value={loginInput} onChange={(e)=>{setLoginInput(e.target.value);setLoginError(false);}} className="w-full p-3 border rounded-xl text-center text-lg outline-none mb-4" autoFocus onKeyPress={(e)=>e.key==='Enter'&&handleAuth()} placeholder="***" />{loginError && <p className="text-red-500 text-xs text-center font-bold mb-4">שגיאה</p>}<button onClick={handleAuth} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold">{isRecoveryMode?'אפס':'התחבר'}</button>{loginModalMode==='admin'&&<div className="mt-4 text-center"><button onClick={()=>{setIsRecoveryMode(!isRecoveryMode);setLoginInput('');setLoginError(false);}} className="text-xs text-slate-400 underline">{isRecoveryMode?'ביטול':'שכחתי סיסמה'}</button></div>}</div></div>}
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center space-y-8"><div className="flex justify-center mb-4"><div className="bg-indigo-100 p-4 rounded-full"><School size={48} className="text-indigo-600" /></div></div><div><h1 className="text-3xl font-bold text-slate-800 mb-2">ישיבת הבוכרים הצעירה</h1><p className="text-slate-500">מעקב נוכחות וציונים</p></div><div className="space-y-4"><button onClick={()=>setLoginModalMode('teacher')} className="w-full flex items-center justify-center gap-3 p-4 bg-white border-2 border-slate-200 rounded-xl hover:border-indigo-500 transition-all"><User size={24}/><div className="text-right flex-1"><div className="font-bold">כניסת מורה</div><div className="text-xs text-slate-400">קוד אישי</div></div></button><button onClick={()=>setLoginModalMode('admin')} className="w-full flex items-center justify-center gap-3 p-4 bg-white border-2 border-slate-200 rounded-xl hover:border-indigo-500 transition-all"><Shield size={24}/><div className="text-right flex-1"><div className="font-bold">כניסת מנהל</div><div className="text-xs text-slate-400">ניהול מלא</div></div></button></div></div>
    </div>
  );

  if (currentView === 'menu') return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans notranslate" dir="rtl" translate="no" style={{ backgroundImage: "url('/bg.jpg')", backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>
      <div className="absolute inset-0 bg-slate-50/90 z-0"></div>
      <div className="relative z-10 max-w-2xl w-full">
        <div className="flex justify-between items-center mb-8"><div className="flex items-center gap-3"><div className="bg-indigo-600 text-white p-2 rounded-lg"><School size={24} /></div><div><h1 className="text-2xl font-bold text-slate-800">שלום, {userRole==='admin'?'מנהל':getTeacherName(loggedInTeacherId)}</h1><p className="text-slate-500">תפריט ראשי</p></div></div><button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500"><Power size={24}/></button></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button onClick={()=>setCurrentView('attendance')} className="bg-white p-8 rounded-3xl shadow-sm border-2 border-transparent hover:border-indigo-500 transition-all group text-center"><div className="bg-indigo-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-indigo-100"><ClipboardList size={40} className="text-indigo-600"/></div><h2 className="text-2xl font-bold text-slate-800 mb-2">נוכחות</h2><p className="text-slate-500">חיסורים, אישורים ודוחות</p></button>
          <button onClick={()=>setCurrentView('grades')} className="bg-white p-8 rounded-3xl shadow-sm border-2 border-transparent hover:border-emerald-500 transition-all group text-center"><div className="bg-emerald-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-emerald-100"><GraduationCap size={40} className="text-emerald-600"/></div><h2 className="text-2xl font-bold text-slate-800 mb-2">ציונים</h2><p className="text-slate-500">מבחנים והישגים</p></button>
        </div>
      </div>
    </div>
  );

  const Header = ({ title, icon: Icon, color }) => (
    <header className="mb-8 flex justify-between items-center"><div className="flex items-center gap-4"><button onClick={()=>setCurrentView('menu')} className="bg-white p-2 rounded-full shadow-sm"><ArrowLeft size={20}/></button><div><h1 className={`text-3xl font-bold flex items-center gap-2 ${color}`}><Icon className="opacity-80"/>{title}</h1><p className="text-slate-500 text-sm">{userRole==='admin'?'מנהל':getTeacherName(loggedInTeacherId)}</p></div></div></header>
  );

  if (currentView === 'grades') return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8 font-sans notranslate" dir="rtl" translate="no" style={{ backgroundImage: "url('/bg.jpg')", backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>
      <div className="absolute inset-0 bg-slate-50/90 z-0"></div>
      <div className="relative z-10 max-w-5xl mx-auto"><Header title="ציונים" icon={GraduationCap} color="text-emerald-700" />
        <div className="mb-6 flex"><nav className="flex bg-white p-1 rounded-xl shadow-sm border overflow-x-auto"><button onClick={()=>setGradesActiveTab('input')} className={`flex items-center gap-2 px-4 py-2 rounded-lg ${gradesActiveTab==='input'?'bg-emerald-600 text-white':'hover:bg-slate-100'}`}><ClipboardList size={18}/><span>הזנה</span></button>{userRole==='admin'&&<button onClick={()=>setGradesActiveTab('stats')} className={`flex items-center gap-2 px-4 py-2 rounded-lg ${gradesActiveTab==='stats'?'bg-emerald-600 text-white':'hover:bg-slate-100'}`}><BarChart3 size={18}/><span>סטטיסטיקה</span></button>}</nav></div>
        {gradesActiveTab === 'input' ? (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border flex flex-col md:flex-row gap-4 items-end">
              {userRole==='admin' && <div className="flex-1 w-full"><label className="text-sm font-bold block mb-1">כיתה</label><select value={classFilter} onChange={(e)=>setClassFilter(e.target.value)} className="w-full p-2 border rounded-lg"><option value="all">הכל</option>{classes.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>}
              <div className="flex-1 w-full"><label className="text-sm font-bold block mb-1">מקצוע</label><select value={selectedSubject} onChange={(e)=>{setSelectedSubject(e.target.value);setSelectedExamId(null);}} className="w-full p-2 border rounded-lg">{availableSubjects.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
              {userRole==='teacher' && <div className="flex-1 w-full"><label className="text-sm font-bold block mb-1">כיתה</label><select value={classFilter} onChange={(e)=>setClassFilter(e.target.value)} className="w-full p-2 border rounded-lg"><option value="all">בחר...</option>{availableClasses.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-2xl shadow-sm border">
                   <h3 className="font-bold text-lg mb-4">מבחנים</h3>
                   <div className="space-y-2 mb-4 bg-slate-50 p-3 rounded-xl border"><input type="text" value={newExamTitle} onChange={(e)=>setNewExamTitle(e.target.value)} placeholder="שם..." className="w-full p-2 text-sm border rounded-lg mb-2"/>
                   <textarea value={newExamDetails} onChange={(e)=>setNewExamDetails(e.target.value)} placeholder="נושא/חומר למבחן..." className="w-full p-2 text-sm border rounded-lg mb-2 h-20 resize-none"></textarea>
                   <div className="flex gap-2"><input type="date" value={newExamDate} onChange={(e)=>setNewExamDate(e.target.value)} className="w-full p-2 text-sm border rounded-lg"/><button onClick={addExam} className="p-2 bg-emerald-600 text-white rounded-lg"><Plus size={18}/></button></div><div className="text-xs text-center text-slate-500 font-bold">{formatHebrewDate(newExamDate)}</div></div>
                   <div className="space-y-2 max-h-[400px] overflow-y-auto">{filteredExams.map(e=><div key={e.id} onClick={()=>setSelectedExamId(e.id)} className={`p-3 rounded-xl border cursor-pointer ${selectedExamId===e.id?'bg-emerald-50 border-emerald-500':'bg-slate-50'}`}><div className="flex justify-between"><div><div className="font-bold">{e.title}</div><div className="text-xs text-slate-500 mb-1">{formatDualDate(e.date)}</div><div className="text-xs text-slate-400 italic flex items-center gap-1"><FileText size={10}/> {e.details || 'אין פירוט'}</div></div><button onClick={(ev)=>{ev.stopPropagation();deleteExam(e.id)}} className="text-slate-300 hover:text-red-500"><Trash2 size={14}/></button></div></div>)}</div>
                </div>
              </div>
              <div className="lg:col-span-2">
                {selectedExamId ? <div className="bg-white rounded-2xl shadow-sm border overflow-hidden"><div className="bg-slate-50 p-4 border-b flex justify-between"><div><h3 className="font-bold text-lg">{exams.find(e=>e.id===selectedExamId)?.title}</h3><div className="text-xs text-slate-500 mt-1">{exams.find(e=>e.id===selectedExamId)?.details}</div></div><div className="text-sm bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full font-bold h-fit">ממוצע: {getExamAverage(selectedExamId)}</div></div><table className="w-full"><thead className="bg-slate-50 border-b text-sm"><tr><th className="px-6 py-3 text-right">תלמיד</th><th className="px-6 py-3 text-center w-32">ציון</th></tr></thead><tbody className="divide-y">{filteredStudents.map(s=><tr key={s.id}><td className="px-6 py-3"><div className="font-bold">{s.name}</div><div className="text-xs text-slate-400">{getClassName(s.classId)}</div></td><td className="px-6 py-3 text-center"><input type="number" value={getGrade(selectedExamId,s.id)} onChange={(e)=>updateGrade(selectedExamId,s.id,e.target.value)} className="w-20 text-center p-2 border rounded-lg font-bold bg-slate-50" /></td></tr>)}</tbody></table></div> : <div className="bg-white p-12 rounded-2xl border border-dashed text-center text-slate-400">בחר מבחן</div>}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 relative overflow-hidden"><div className="relative z-10"><div className="text-emerald-800 font-bold mb-1 flex items-center gap-2"><Star size={18}/> מקצוע מצטיין</div><div className="text-2xl font-black text-emerald-600 truncate">{gradesStatsData.bestSubject ? gradesStatsData.bestSubject.name : '---'}</div><div className="text-xs text-emerald-500 mt-2">{gradesStatsData.bestSubject ? `ממוצע: ${gradesStatsData.bestSubject.avg.toFixed(1)}` : 'אין נתונים'}</div></div><Trophy className="absolute -bottom-4 -left-4 text-emerald-100 w-24 h-24" /></div>
                <div className="bg-rose-50 p-6 rounded-2xl border border-rose-100 relative overflow-hidden"><div className="relative z-10"><div className="text-rose-800 font-bold mb-1 flex items-center gap-2"><AlertTriangle size={18}/> מקצוע חלש</div><div className="text-2xl font-black text-rose-600 truncate">{gradesStatsData.subjectStats.length > 0 ? gradesStatsData.subjectStats[gradesStatsData.subjectStats.length - 1].name : '---'}</div><div className="text-xs text-rose-500 mt-2">{gradesStatsData.subjectStats.length > 0 ? `ממוצע: ${gradesStatsData.subjectStats[gradesStatsData.subjectStats.length - 1].avg.toFixed(1)}` : 'אין נתונים'}</div></div><BookOpen className="absolute -bottom-4 -left-4 text-rose-100 w-24 h-24" /></div>
                <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 relative overflow-hidden"><div className="relative z-10"><div className="text-blue-800 font-bold mb-1 flex items-center gap-2"><School size={18}/> כיתה מצטיינת</div><div className="text-2xl font-black text-blue-600 truncate">{gradesStatsData.bestClass ? gradesStatsData.bestClass.name : '---'}</div><div className="text-xs text-blue-500 mt-2">{gradesStatsData.bestClass ? `ממוצע: ${gradesStatsData.bestClass.avg.toFixed(1)}` : 'אין נתונים'}</div></div><Users className="absolute -bottom-4 -left-4 text-blue-100 w-24 h-24" /></div>
                <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100 relative overflow-hidden"><div className="relative z-10"><div className="text-orange-800 font-bold mb-1 flex items-center gap-2"><AlertTriangle size={18}/> כיתה לשיפור</div><div className="text-2xl font-black text-orange-600 truncate">{gradesStatsData.classStats.length > 0 ? gradesStatsData.classStats[gradesStatsData.classStats.length - 1].name : '---'}</div><div className="text-xs text-orange-500 mt-2">{gradesStatsData.classStats.length > 0 ? `ממוצע: ${gradesStatsData.classStats[gradesStatsData.classStats.length - 1].avg.toFixed(1)}` : 'אין נתונים'}</div></div><Users className="absolute -bottom-4 -left-4 text-orange-100 w-24 h-24" /></div>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"><div className="p-4 border-b border-slate-100 font-bold text-slate-700">דירוג מקצועות</div><table className="w-full text-sm overflow-x-auto"><thead className="bg-slate-50"><tr><th className="p-3 text-right">מקצוע</th><th className="p-3 text-center">ממוצע</th><th className="p-3 text-center">ציונים</th></tr></thead><tbody className="divide-y divide-slate-100">{gradesStatsData.subjectStats.map((sub, idx) => (<tr key={sub.id}><td className="p-3 font-medium">{sub.name}</td><td className="p-3 text-center font-bold">{sub.avg.toFixed(1)}</td><td className="p-3 text-center">{sub.count}</td></tr>))}</tbody></table></div>
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"><div className="p-4 border-b border-slate-100 font-bold text-slate-700">דירוג כיתות</div><table className="w-full text-sm overflow-x-auto"><thead className="bg-slate-50"><tr><th className="p-3 text-right">כיתה</th><th className="p-3 text-center">ממוצע</th><th className="p-3 text-center">ציונים</th></tr></thead><tbody className="divide-y divide-slate-100">{gradesStatsData.classStats.map((cls, idx) => (<tr key={cls.id}><td className="p-3 font-medium">{cls.name}</td><td className="p-3 text-center font-bold">{cls.avg.toFixed(1)}</td><td className="p-3 text-center">{cls.count}</td></tr>))}</tbody></table></div>
             </div>
          </div>
        )}
      </div></div>
  );

  // --- Attendance Views ---
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8 font-sans notranslate" dir="rtl" translate="no" style={{ backgroundImage: "url('/bg.jpg')", backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>
      <div className="absolute inset-0 bg-slate-50/90 z-0"></div>
      <div className="relative z-10 max-w-5xl mx-auto">
        <Header title="נוכחות" icon={School} color="text-indigo-700" />
        <div className="mb-6"><nav className="flex bg-white p-1 rounded-xl shadow-sm border overflow-x-auto whitespace-nowrap">
          <button onClick={()=>setActiveTab('attendance')} className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap ${activeTab==='attendance'?'bg-indigo-600 text-white':'hover:bg-slate-100'}`}><Calendar size={18}/><span>רישום</span></button>
          {userRole==='admin' && <><button onClick={()=>setActiveTab('admin_updates')} className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap ${activeTab==='admin_updates'?'bg-indigo-600 text-white':'hover:bg-slate-100'}`}><MessageSquare size={18}/><span>אישורים</span></button><button onClick={()=>setActiveTab('missing_reports')} className={`flex items-center gap-2 px-4 py-2 rounded-lg ${activeTab==='missing_reports'?'bg-indigo-600 text-white':'hover:bg-slate-100'}`}><ListX size={18}/><span>בקרה</span></button><button onClick={()=>setActiveTab('dismissal')} className={`flex items-center gap-2 px-4 py-2 rounded-lg ${activeTab==='dismissal'?'bg-indigo-600 text-white':'hover:bg-slate-100'}`}><LogOut size={18}/><span>יציאה</span></button><button onClick={()=>setActiveTab('stats')} className={`flex items-center gap-2 px-4 py-2 rounded-lg ${activeTab==='stats'?'bg-indigo-600 text-white':'hover:bg-slate-100'}`}><BarChart3 size={18}/><span>סטטיסטיקה</span></button><button onClick={()=>setActiveTab('settings')} className={`flex items-center gap-2 px-4 py-2 rounded-lg ${activeTab==='settings'?'bg-indigo-600 text-white':'hover:bg-slate-100'}`}><Users size={18}/><span>ניהול</span></button></>}
        </nav></div>

        {activeTab === 'attendance' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-6 rounded-2xl shadow-sm border">
              <div className="space-y-2"><label className="text-sm font-bold block">תאריך</label><div className="relative"><input type="date" value={selectedDate} onChange={(e)=>setSelectedDate(e.target.value)} className="w-full p-2 pl-4 border rounded-lg text-transparent relative z-10 bg-transparent"/><div className="absolute inset-0 flex items-center pr-3 z-0 text-slate-700 bg-white rounded-lg border">{formatHebrewDate(selectedDate)}</div></div><div className="mt-1 text-sm text-indigo-600 font-bold text-center bg-indigo-50 p-1 rounded">{formatHebrewDate(selectedDate)}</div></div>
              <div className="space-y-2"><label className="text-sm font-bold block">כיתה {classFilter !== 'all' && `(${filteredStudents.length})`}</label>{userRole==='admin' ? <select value={classFilter} onChange={(e)=>setClassFilter(e.target.value)} className="w-full p-2 border rounded-lg"><option value="all">הכל</option>{classes.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select> : <select value={classFilter} onChange={(e)=>setClassFilter(e.target.value)} className="w-full p-2 border rounded-lg"><option value="all">בחר...</option>{availableClasses.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>}</div>
              <div className="space-y-2"><label className="text-sm font-bold block">מקצוע</label><select value={selectedSubject} onChange={(e)=>setSelectedSubject(e.target.value)} className="w-full p-2 border rounded-lg">{availableSubjects.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            </div>
            
            {/* Mark All Present Button - Visible to Teacher AND Admin */}
            {( (userRole === 'teacher' && selectedSubject && classFilter !== 'all') || 
               (userRole === 'admin' && selectedSubject && classFilter !== 'all') ) && (
              <div className="flex justify-end">
                <button 
                  onClick={markAsReported}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold shadow-sm transition-all ${isCurrentViewReported ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                  disabled={isCurrentViewReported}
                >
                  {isCurrentViewReported ? <><CheckCircle size={20}/> דיווח הושלם</> : <><CheckSquare size={20}/> כולם נוכחים / סיים דיווח</>}
                </button>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border overflow-x-auto"><table className="w-full text-sm md:text-base"><thead className="bg-slate-50 border-b"><tr><th className="px-6 py-4 text-right">תלמיד</th><th className="px-6 py-4 text-center">סטטוס</th></tr></thead><tbody className="divide-y">{filteredStudents.length>0 ? filteredStudents.map(s=>{ const l=getLog(s.id); const u=getDailyUpdate(s.id); return <tr key={s.id} className="hover:bg-slate-50"><td className="px-6 py-4"><div className="font-bold">{s.name}</div><div className="text-xs text-slate-400">{getClassName(s.classId)}</div></td><td className="px-6 py-4"><div className="flex justify-center gap-2">{u?<div className={`px-4 py-2 rounded-xl border flex items-center gap-2 font-bold w-full justify-center ${ABSENCE_REASONS.find(r=>r.label===u.reason)?.bg} ${ABSENCE_REASONS.find(r=>r.label===u.reason)?.color}`}><CheckCircle size={16}/>{u.reason} (מאושר)</div>:<><div className={`flex items-center gap-1 p-1 rounded-xl border ${l?.status==='late'?'bg-amber-100 border-amber-500 text-amber-800':'bg-white border-slate-200'}`}><button onClick={()=>updateAttendance(s.id,'late',l?.status==='late'?l.minutes:5)} className="p-1"><Clock size={18}/></button><input type="number" placeholder="דק'" value={l?.status==='late'?l.minutes:''} onChange={(e)=>updateAttendance(s.id,'late',parseInt(e.target.value)||0)} className="w-10 bg-transparent text-center font-bold"/></div><button onClick={()=>updateAttendance(s.id,'absent')} className={`p-2 rounded-xl border ${l?.status==='absent'?'bg-red-100 border-red-500':'bg-white'}`}><XCircle size={18}/></button>{l && <button onClick={()=>updateAttendance(s.id,null)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100"><RotateCcw size={18}/></button>}</>}</div></td></tr> }) : <tr><td colSpan="2" className="p-8 text-center text-slate-400">אין תלמידים / בחר כיתה ומקצוע</td></tr>}</tbody></table></div>
          </div>
        )}

        {/* Missing Reports Tab (NEW) */}
        {userRole === 'admin' && activeTab === 'missing_reports' && (
          <div className="space-y-6">
            <div className="bg-indigo-900 text-white p-6 rounded-2xl shadow-lg">
               <h2 className="text-2xl font-bold flex items-center gap-2"><ListX/> בקרה: דיווחים חסרים</h2>
               <p className="text-indigo-200 text-sm">רשימת מורים שלא הזינו נתונים (נוכחות/איחור/חיסור) באף תלמיד בכיתה המשויכת</p>
               <div className="mt-4 flex gap-4 items-center">
                 <label className="text-sm font-bold">תאריך לבדיקה:</label>
                 <div className="flex flex-col">
                   <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-indigo-800 border-none rounded-lg p-2 text-white outline-none" />
                   <span className="text-[10px] text-indigo-300 text-center">{formatHebrewDate(selectedDate)}</span>
                 </div>
               </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
               <table className="w-full text-sm min-w-[600px]"><thead className="bg-slate-50 border-b"><tr><th className="px-6 py-4 text-right">מורה</th><th className="px-6 py-4 text-right">כיתה</th><th className="px-6 py-4 text-right">מקצוע</th><th className="px-6 py-4 text-center">סטטוס</th></tr></thead><tbody className="divide-y">
                 {missingReports.map((item, idx) => (
                   <tr key={idx} className="hover:bg-red-50">
                     <td className="px-6 py-4 font-bold whitespace-nowrap">{item.teacherName}</td>
                     <td className="px-6 py-4 whitespace-nowrap">{item.className}</td>
                     <td className="px-6 py-4 whitespace-nowrap">{item.subjectName}</td>
                     <td className="px-6 py-4 text-center"><span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap">לא דווח</span></td>
                   </tr>
                 ))}
                 {missingReports.length === 0 && <tr><td colSpan="4" className="p-8 text-center text-emerald-600 font-bold">כל המורים דיווחו היום! 👏</td></tr>}
               </tbody></table>
            </div>
          </div>
        )}

        {userRole === 'admin' && activeTab === 'admin_updates' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
               <h2 className="text-xl font-bold flex items-center gap-2"><MessageSquare className="text-indigo-600"/> אישור היעדרות</h2>
               
               <div className="flex gap-2">
                 <div className="space-y-2 flex-1"><label className="text-sm font-bold block">תאריך התחלה</label><input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full p-2 border rounded-lg" /><div className="text-xs text-indigo-600 font-bold">{formatHebrewDate(selectedDate)}</div></div>
                 <div className="space-y-2 flex-1"><label className="text-sm font-bold block">תאריך סיום</label><input type="date" value={newExamDate} onChange={(e) => setNewExamDate(e.target.value)} className="w-full p-2 border rounded-lg" /><div className="text-xs text-indigo-600 font-bold">{formatHebrewDate(newExamDate)}</div></div>
               </div>
               
               <div className="space-y-2"><label className="text-sm font-bold block">סינון כיתה</label><select value={adminUpdateClassFilter} onChange={(e) => {setAdminUpdateClassFilter(e.target.value); setUpdateStudentId('');}} className="w-full p-2 border rounded-lg"><option value="all">כל הכיתות</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
               
               <div className="space-y-2">
                 <label className="text-sm font-bold block">תלמיד</label>
                 <div className="relative">
                   <Search size={16} className="absolute top-3 left-3 text-slate-400" />
                   <input 
                      type="text" 
                      placeholder="חפש תלמיד..." 
                      className="w-full p-2 pl-8 mb-2 border rounded-lg text-sm bg-slate-50 focus:bg-white transition-colors"
                      value={updateStudentSearch}
                      onChange={(e) => setUpdateStudentSearch(e.target.value)}
                   />
                 </div>
                 <select value={updateStudentId} onChange={(e) => setUpdateStudentId(e.target.value)} className="w-full p-2 border rounded-lg"><option value="">בחר...</option>
                   {students
                     .filter(s => adminUpdateClassFilter === 'all' || s.classId === adminUpdateClassFilter)
                     .filter(s => s.name.includes(updateStudentSearch))
                     .map(s => <option key={s.id} value={s.id}>{s.name} ({getClassName(s.classId)})</option>)
                   }
                 </select>
               </div>

               <div className="space-y-2"><label className="text-sm font-bold block">סיבה</label><div className="grid grid-cols-2 gap-2">{ABSENCE_REASONS.map(r => <button key={r.label} onClick={() => setUpdateReason(r.label)} className={`p-2 rounded-lg text-xs font-bold flex items-center gap-2 border ${updateReason === r.label ? `${r.bg} ${r.color} border-current` : 'bg-slate-50'}`}><r.icon size={14}/>{r.label}</button>)}</div></div>
               {updateReason === 'אחר' && <input type="text" value={customUpdateReason || ''} onChange={(e) => setCustomUpdateReason(e.target.value)} placeholder="פרט סיבה..." className="w-full p-2 text-sm border rounded-lg" />}
               <button onClick={addDailyUpdate} disabled={!updateStudentId} className={`w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 ${updateStudentId ? 'bg-indigo-600' : 'bg-slate-300'}`}><CheckCircle size={18}/> אשר</button>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border flex flex-col h-[500px]">
               <h2 className="text-xl font-bold mb-4">רשימת אישורים ({formatHebrewDate(selectedDate)})</h2>
               <div className="flex-1 overflow-y-auto space-y-2">
                  {dailyUpdates.filter(u => u.date === selectedDate).map(u => { const st = students.find(s => s.id === u.studentId); return <div key={u.id} className="p-3 rounded-xl border bg-slate-50 flex justify-between items-center"><div><div className="font-bold">{st?.name}</div><div className="text-xs text-slate-500">{u.reason}</div></div><button onClick={() => removeUpdate(u.id)} className="text-red-500"><Trash2 size={16}/></button></div> })}
                  {!dailyUpdates.some(u => u.date === selectedDate) && <div className="text-center text-slate-400 mt-10">אין אישורים</div>}
               </div>
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
                <div className="flex flex-col gap-2 items-end"><div className="flex items-center gap-2"><Filter size={16}/><select value={dismissalClassFilter} onChange={(e)=>setDismissalClassFilter(e.target.value)} className="bg-indigo-800 border-none rounded-lg text-sm p-2 text-white font-bold"><option value="all">כל הכיתות</option>{classes.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div><div className="flex gap-2"><input type="date" value={reportRange.start} onChange={(e)=>setReportRange({...reportRange, start:e.target.value})} className="bg-indigo-800 rounded-lg text-xs p-2 text-white"/><span className="self-center">עד</span><input type="date" value={reportRange.end} onChange={(e)=>setReportRange({...reportRange, end:e.target.value})} className="bg-indigo-800 rounded-lg text-xs p-2 text-white"/></div></div>
             </div>
             <div className="bg-white rounded-2xl shadow-sm border overflow-x-auto">
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
                  
                  {/* Pie Chart Section - Start */}
                  <div className="p-6 bg-slate-50 border-b flex flex-col items-center">
                    {(() => {
                         const currentStudentReport = dismissalReport.find(r => r.id === selectedStudentForDetails);
                         if (!currentStudentReport) return null;
                         
                         const { percentage, totalPotentialMinutes, presentMinutes } = currentStudentReport;
                         
                         return (
                             <div className="flex items-center gap-6">
                                <div className="relative w-32 h-32 rounded-full flex items-center justify-center shadow-lg"
                                     style={{
                                         background: `conic-gradient(#10b981 0% ${percentage}%, #ef4444 ${percentage}% 100%)`
                                     }}>
                                    <div className="absolute w-24 h-24 bg-white rounded-full flex items-center justify-center">
                                        <span className="text-2xl font-bold text-slate-700">{percentage}%</span>
                                    </div>
                                </div>
                                <div className="text-sm space-y-1">
                                    <div className="font-bold text-slate-700">סיכום נוכחות לתקופה</div>
                                    <div className="text-emerald-600 flex items-center gap-1"><CheckCircle size={14}/> נכח ב-{presentMinutes} דקות</div>
                                    <div className="text-red-600 flex items-center gap-1"><XCircle size={14}/> החסיר {totalPotentialMinutes - presentMinutes} דקות</div>
                                    <div className="text-xs text-slate-400 mt-2">מתוך סך {totalPotentialMinutes} דקות הוראה</div>
                                </div>
                             </div>
                         );
                    })()}
                  </div>
                  {/* Pie Chart Section - End */}

                  <div className="p-0 overflow-y-auto flex-1">
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

        {/* Stats Tab */}
        {userRole === 'admin' && activeTab === 'stats' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-2xl border shadow-sm">
              <h2 className="text-xl font-bold flex items-center gap-2"><TrendingUp className="text-indigo-600" />סטטיסטיקה</h2>
              <div className="flex gap-2"><input type="date" value={reportRange.start} onChange={(e)=>setReportRange({...reportRange,start:e.target.value})} className="bg-slate-100 rounded-lg text-xs p-2"/><span className="self-center">-</span><input type="date" value={reportRange.end} onChange={(e)=>setReportRange({...reportRange,end:e.target.value})} className="bg-slate-100 rounded-lg text-xs p-2"/></div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
               <div className="bg-red-50 p-6 rounded-2xl border border-red-100 relative overflow-hidden"><div className="relative z-10"><div className="text-red-800 font-bold mb-1 flex items-center gap-2"><AlertTriangle size={18}/> מקצוע טעון שיפור</div><div className="text-2xl font-black text-red-600 truncate">{statsData.subjectStats[statsData.subjectStats.length-1]?.total > 0 ? statsData.subjectStats[statsData.subjectStats.length-1].name : '---'}</div><div className="text-xs text-red-400 mt-2">{statsData.subjectStats[statsData.subjectStats.length-1]?.total > 0 ? `סה"כ ${statsData.subjectStats[statsData.subjectStats.length-1].total} דקות` : 'אין נתונים'}</div></div><BookOpen className="absolute -bottom-4 -left-4 text-red-100 w-24 h-24" /></div>
               <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 relative overflow-hidden"><div className="relative z-10"><div className="text-amber-800 font-bold mb-1 flex items-center gap-2"><AlertTriangle size={18}/> כיתה טעונה שיפור</div><div className="text-2xl font-black text-amber-600 truncate">{statsData.classStats[statsData.classStats.length-1]?.total > 0 ? statsData.classStats[statsData.classStats.length-1].name : '---'}</div><div className="text-xs text-amber-600/70 mt-2">{statsData.classStats[statsData.classStats.length-1]?.total > 0 ? `ממוצע ${statsData.classStats[statsData.classStats.length-1].avg.toFixed(1)} דק'` : 'אין נתונים'}</div></div><Users className="absolute -bottom-4 -left-4 text-amber-100 w-24 h-24" /></div>
               <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 relative overflow-hidden"><div className="relative z-10"><div className="text-emerald-800 font-bold mb-1 flex items-center gap-2"><Star size={18}/> מקצוע מצטיין</div><div className="text-2xl font-black text-emerald-600 truncate">{statsData.subjectStats[0]?.name || '---'}</div><div className="text-xs text-emerald-500 mt-2">{statsData.subjectStats[0] ? `רק ${statsData.subjectStats[0].total} דקות` : 'אין נתונים'}</div></div><Trophy className="absolute -bottom-4 -left-4 text-emerald-100 w-24 h-24" /></div>
               <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 relative overflow-hidden"><div className="relative z-10"><div className="text-blue-800 font-bold mb-1 flex items-center gap-2"><Star size={18}/> כיתה מצטיינת</div><div className="text-2xl font-black text-blue-600 truncate">{statsData.classStats[0]?.name || '---'}</div><div className="text-xs text-blue-500 mt-2">{statsData.classStats[0] ? `ממוצע ${statsData.classStats[0].avg.toFixed(1)} דק'` : 'אין נתונים'}</div></div><Users className="absolute -bottom-4 -left-4 text-blue-100 w-24 h-24" /></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border shadow-sm overflow-hidden"><div className="p-4 border-b font-bold text-slate-700">דירוג מקצועות (מהבעייתי לטוב)</div><table className="w-full text-sm"><thead className="bg-slate-50"><tr><th className="p-3 text-right">מקצוע</th><th className="p-3 text-center">דקות</th></tr></thead><tbody className="divide-y">{[...statsData.subjectStats].reverse().map(s=><tr key={s.id}><td className="p-3">{s.name}</td><td className="p-3 text-center font-bold">{s.total}</td></tr>)}</tbody></table></div>
              <div className="bg-white rounded-2xl border shadow-sm overflow-hidden"><div className="p-4 border-b font-bold text-slate-700">דירוג כיתות (לפי ממוצע)</div><table className="w-full text-sm"><thead className="bg-slate-50"><tr><th className="p-3 text-right">כיתה</th><th className="p-3 text-center">ממוצע דקות</th></tr></thead><tbody className="divide-y">{[...statsData.classStats].reverse().map(c=><tr key={c.id}><td className="p-3">{c.name}</td><td className="p-3 text-center font-bold">{c.avg.toFixed(1)}</td></tr>)}</tbody></table></div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {userRole === 'admin' && activeTab === 'settings' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {/* Admin Password */}
             <div className="bg-white p-5 rounded-2xl border shadow-sm md:col-span-2">
                <h2 className="text-lg font-bold flex items-center gap-2"><Lock size={20} className="text-indigo-600" />אבטחה</h2>
                <div className="flex gap-4 items-center bg-slate-50 p-4 rounded-xl"><div className="flex-1"><label className="text-sm font-bold block mb-1">סיסמת מנהל</label><input type="text" value={globalSettings.adminPassword} onChange={(e) => { const v=e.target.value; setGlobalSettings(p=>({...p,adminPassword:v})); updateAdminPassword(v); }} className="w-full max-w-xs p-2 text-sm border rounded-lg outline-none font-mono tracking-widest bg-white"/></div></div>
             </div>
             
             {/* Teachers & Assignments */}
             <div className="bg-white p-5 rounded-2xl border shadow-sm md:col-span-2">
               <h2 className="text-lg font-bold flex items-center gap-2"><User size={20} className="text-indigo-600" />מורים ושיוכים</h2>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 p-3 bg-slate-50 rounded-xl">
                      <div className="text-sm font-bold">הוספת מורה</div>
                      <div className="flex gap-2"><input type="text" value={newTeacherName} onChange={(e)=>setNewTeacherName(e.target.value)} placeholder="שם..." className="flex-1 p-2 text-sm border rounded-lg"/><input type="text" value={newTeacherCode} onChange={(e)=>setNewTeacherCode(e.target.value)} placeholder="קוד..." className="w-20 p-2 text-sm border rounded-lg"/><button onClick={addTeacher} className="p-2 bg-indigo-600 text-white rounded-lg"><Plus size={16}/></button></div>
                      <ul className="divide-y max-h-40 overflow-y-auto">{teachers.map(t=><li key={t.id} className="flex justify-between p-2 text-sm"><span>{t.name} ({t.password})</span><button onClick={()=>removeTeacher(t.id)} className="text-red-500"><Trash2 size={14}/></button></li>)}</ul>
                  </div>
                  <div className="space-y-2 p-3 bg-slate-50 rounded-xl">
                      <div className="text-sm font-bold">שיוך מורה לכיתה ומקצוע</div>
                      <div className="flex gap-2 flex-wrap">
                          <select value={assignTeacher} onChange={(e)=>setAssignTeacher(e.target.value)} className="p-2 text-sm border rounded-lg flex-1"><option value="">מורה...</option>
                              <option value="admin">ללא מורה (באחריות מנהל)</option>
                              {teachers.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                          <select value={assignClass} onChange={(e)=>setAssignClass(e.target.value)} className="p-2 text-sm border rounded-lg flex-1"><option value="">כיתה...</option>{classes.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
                          <select value={assignSubject} onChange={(e)=>setAssignSubject(e.target.value)} className="p-2 text-sm border rounded-lg flex-1"><option value="">מקצוע...</option>{subjects.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>
                          <button onClick={assignTeacherToClass} className="p-2 bg-indigo-600 text-white rounded-lg"><Plus size={16}/></button>
                      </div>
                      <ul className="divide-y max-h-40 overflow-y-auto">{assignments.map(a=><li key={a.id} className="flex justify-between p-2 text-sm"><span>{getTeacherName(a.teacherId)} - {getClassName(a.classId)} ({getSubjectName(a.subjectId)})</span><button onClick={()=>removeAssignment(a.id)} className="text-red-500"><Trash2 size={14}/></button></li>)}</ul>
                  </div>
               </div>
             </div>

             {/* Basic Entities */}
             <div className="bg-white p-5 rounded-2xl border shadow-sm">
               <h2 className="text-lg font-bold flex items-center gap-2"><School size={20} className="text-indigo-600" />כיתות</h2>
               <div className="flex gap-2"><input type="text" value={newClassName} onChange={(e) => setNewClassName(e.target.value)} placeholder="שם..." className="flex-1 p-2 text-sm border rounded-lg" /><button onClick={addClass} className="p-2 bg-indigo-600 text-white rounded-lg"><Plus size={18}/></button></div>
               <ul className="divide-y max-h-64 overflow-y-auto border rounded-lg mt-2">{classes.map(c => <li key={c.id} className="p-3 flex justify-between items-center text-sm"><span>{c.name} <span className="text-xs text-gray-500">({getStudentCountInClass(c.id)} תלמידים)</span></span><button onClick={() => removeClassAndRefs(c.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button></li>)}</ul>
             </div>
             
             <div className="bg-white p-5 rounded-2xl border shadow-sm">
               <h2 className="text-lg font-bold flex items-center gap-2"><BookOpen size={20} className="text-indigo-600" />מקצועות</h2>
               <div className="flex gap-2">
                 <input type="text" value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} placeholder="שם..." className="flex-1 p-2 text-sm border rounded-lg" />
                 <input type="number" value={newSubjectDuration} onChange={(e) => setNewSubjectDuration(e.target.value)} placeholder="דק'" className="w-16 p-2 text-sm border rounded-lg" />
                 <button onClick={addSubject} className="p-2 bg-indigo-600 text-white rounded-lg"><Plus size={18}/></button>
               </div>
               <ul className="divide-y max-h-64 overflow-y-auto border rounded-lg mt-2">{subjects.map(s => <li key={s.id} className="p-2 flex justify-between items-center text-sm"><span>{s.name} <span className="text-xs text-gray-400">({s.duration || 45} דק')</span></span><button onClick={() => removeSubject(s.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button></li>)}</ul>
             </div>

             <div className="bg-white p-5 rounded-2xl border shadow-sm md:col-span-2">
               <h2 className="text-lg font-bold flex items-center gap-2"><Users size={20} className="text-indigo-600" />תלמידים</h2>
               <div className="space-y-2">
                 <input type="text" value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} placeholder="שם..." className="w-full p-2 text-sm border rounded-lg outline-none" />
                 <div className="flex gap-2"><select value={newStudentClass} onChange={(e) => setNewStudentClass(e.target.value)} className="flex-1 p-2 text-sm border rounded-lg outline-none"><option value="">בחר כיתה...</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select><button onClick={addStudent} className="px-4 bg-indigo-600 text-white rounded-lg"><Plus size={18}/></button></div>
                 
                 {/* Student Search */}
                 <div className="relative mt-2">
                    <Search size={16} className="absolute top-3 left-3 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="חפש תלמיד ברשימה..." 
                      className="w-full p-2 pl-8 border rounded-lg text-sm bg-slate-50 focus:bg-white"
                      value={studentManagementSearch}
                      onChange={(e) => setStudentManagementSearch(e.target.value)}
                    />
                 </div>
               </div>
               <ul className="divide-y max-h-64 overflow-y-auto border rounded-lg mt-2">
                 {students
                    .filter(s => s.name.includes(studentManagementSearch))
                    .sort((a, b) => a.name.localeCompare(b.name, 'he')) // Alphabetical Sort
                    .map(s => <li key={s.id} className="p-2 flex justify-between items-center text-sm"><div><div className="font-medium">{s.name}</div><div className="text-[10px] text-slate-400">{getClassName(s.classId)}</div></div><button onClick={() => removeStudentAndRefs(s.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button></li>)
                 }
               </ul>
             </div>
          </div>
        )}
      </div>
      <footer className="mt-12 pt-6 border-t border-slate-200 text-center text-slate-400 text-xs">ישיבת הבוכרים הצעירה - מערכת מעקב נוכחות וציונים | כל הזכויות שמורות</footer>
    </div>
  );
};

export default App;