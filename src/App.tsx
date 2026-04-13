/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarView } from './components/CalendarView';
import { DiaryEntryForm } from './components/DiaryEntryForm';
import { StatsDashboard } from './components/StatsDashboard';
import { DiaryEntry } from './types';
import { LayoutDashboard, Calendar as CalendarIcon, Heart, PlusCircle, LogOut, Settings, Download, Upload, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db, signInWithGoogle, logOut } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, getDocFromServer } from 'firebase/firestore';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo?: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function App() {
  const [user, setUser] = React.useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = React.useState(false);
  const [entries, setEntries] = React.useState<DiaryEntry[]>([]);
  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date());
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingEntry, setEditingEntry] = React.useState<DiaryEntry | null>(null);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  React.useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  React.useEffect(() => {
    if (!isAuthReady || !user) {
      setEntries([]);
      return;
    }

    const path = `users/${user.uid}/entries`;
    const q = query(collection(db, path));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedEntries: DiaryEntry[] = [];
      snapshot.forEach((doc) => {
        loadedEntries.push({ id: doc.id, ...doc.data() } as DiaryEntry);
      });
      setEntries(loadedEntries);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });

    return () => unsubscribe();
  }, [user, isAuthReady]);

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  const handleAddEntry = (date: Date) => {
    setSelectedDate(date);
    setEditingEntry(null);
    setIsFormOpen(true);
  };

  const handleEditEntry = (entry: DiaryEntry) => {
    setSelectedDate(new Date(entry.date));
    setEditingEntry(entry);
    setIsFormOpen(true);
  };

  const handleDeleteEntry = async (entry: DiaryEntry) => {
    if (!user) return;
    const path = `users/${user.uid}/entries/${entry.id}`;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/entries`, entry.id));
      toast.success('Запис успішно видалено');
    } catch (error) {
      toast.error('Помилка при видаленні запису');
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const [isDataManageOpen, setIsDataManageOpen] = React.useState(false);
  const [deleteStartDate, setDeleteStartDate] = React.useState('');
  const [deleteEndDate, setDeleteEndDate] = React.useState('');
  const [showConfirmDeleteAll, setShowConfirmDeleteAll] = React.useState(false);

  const handleDeleteAll = async () => {
    if (!user) return;
    try {
      for (const entry of entries) {
        await deleteDoc(doc(db, `users/${user.uid}/entries`, entry.id));
      }
      toast.success('Всі записи успішно видалено');
      setIsDataManageOpen(false);
      setShowConfirmDeleteAll(false);
    } catch (error) {
      toast.error('Помилка при видаленні записів');
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/entries`);
    }
  };

  const handleDeleteByDateRange = async () => {
    if (!user || !deleteStartDate || !deleteEndDate) return;
    try {
      const start = new Date(deleteStartDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(deleteEndDate);
      end.setHours(23, 59, 59, 999);

      const entriesToDelete = entries.filter(e => {
        const d = new Date(e.date);
        return d >= start && d <= end;
      });

      for (const entry of entriesToDelete) {
        await deleteDoc(doc(db, `users/${user.uid}/entries`, entry.id));
      }
      toast.success(`Видалено ${entriesToDelete.length} записів`);
      setIsDataManageOpen(false);
    } catch (error) {
      toast.error('Помилка при видаленні записів');
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/entries`);
    }
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const parseDateString = (dateStr: string) => {
    if (!dateStr) return new Date();
    
    // Handle Excel serial date (e.g. 45300)
    if (/^\d{5}$/.test(dateStr)) {
      return new Date(Math.round((Number(dateStr) - 25569) * 86400 * 1000));
    }

    // Try DD.MM.YYYY, DD/MM/YYYY, DD.MM, DD/MM
    const separator = dateStr.includes('/') ? '/' : (dateStr.includes('.') ? '.' : null);
    if (separator) {
      const parts = dateStr.split(separator);
      if (parts.length === 3) {
        let year = parts[2];
        if (year.length === 2) year = '20' + year;
        return new Date(`${year}-${parts[1]}-${parts[0]}T12:00:00`);
      } else if (parts.length === 2) {
        return new Date(`${new Date().getFullYear()}-${parts[1]}-${parts[0]}T12:00:00`);
      }
    }
    
    return new Date(dateStr);
  };

  const processImportedData = async (rows: any[][]) => {
    if (rows.length < 2) {
      toast.info('Не знайдено даних для імпорту.');
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    const headers = rows[0].map(h => String(h || '').toLowerCase().trim());
    
    const getColIdx = (keywords: string[]) => {
      return headers.findIndex(h => keywords.some(kw => h.includes(kw.toLowerCase())));
    };

    const colMap = {
      date: getColIdx(['дата', '📅', 'date']),
      positions: getColIdx(['поза', '🗂️']),
      skipReason: getColIdx(['причина', '❓']),
      duration: getColIdx(['час', '⏱️']),
      problems: getColIdx(['ерекц', '🕡', 'проблеми']),
      myCount: getColIdx(['моя', '💦', 'еакуляція', 'еякуляція']),
      herCount: getColIdx(['її', '🌊']),
      initiator: getColIdx(['ініціат', '🗝️']),
      rating: getColIdx(['оцінка', '📊']),
      toys: getColIdx(['іграшк', '🪀']),
      notes: getColIdx(['коментар', 'примітк']),
      activityBool: getColIdx(['🔞', 'секс', 'активність']), // Just in case it exists
    };

    // Fallback if date column not found by header
    let dateColIdx = colMap.date;
    if (dateColIdx === -1) {
      if (/^\d{1,2}[/.]\d{1,2}/.test(String(rows[1][0])) || /^\d{5}$/.test(String(rows[1][0]))) dateColIdx = 0;
      else if (/^\d{1,2}[/.]\d{1,2}/.test(String(rows[1][1])) || /^\d{5}$/.test(String(rows[1][1]))) dateColIdx = 1;
    }

    if (dateColIdx === -1) {
      toast.error('Не вдалося знайти колонку з датою.');
      return;
    }

    // Group rows by date to handle "no skip if activity exists"
    const rowsByDate = new Map<string, { row: any[], date: Date }[]>();
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!Array.isArray(row) || row.length < 2) continue;
      
      const dateStr = String(row[dateColIdx] || '').trim();
      if (!dateStr) continue;
      
      const date = parseDateString(dateStr);
      if (isNaN(date.getTime())) continue;
      
      if (date.getFullYear() === 2001) {
        date.setFullYear(new Date().getFullYear());
      }
      
      const dateKey = date.toISOString().split('T')[0];
      if (!rowsByDate.has(dateKey)) {
        rowsByDate.set(dateKey, []);
      }
      rowsByDate.get(dateKey)!.push({ row, date });
    }

    for (const [dateKey, dayRows] of rowsByDate.entries()) {
      // Determine if there's any activity on this day
      let hasActivity = false;
      for (const { row } of dayRows) {
        const durationRaw = colMap.duration !== -1 ? String(row[colMap.duration] || '').trim() : '';
        const positionsRaw = colMap.positions !== -1 ? String(row[colMap.positions] || '').trim() : '';
        const myCountRaw = colMap.myCount !== -1 ? String(row[colMap.myCount] || '').trim() : '';
        const herCountRaw = colMap.herCount !== -1 ? String(row[colMap.herCount] || '').trim() : '';
        const actBoolRaw = colMap.activityBool !== -1 ? String(row[colMap.activityBool] || '').trim().toUpperCase() : '';
        
        const isActBool = actBoolRaw === 'TRUE' || actBoolRaw === 'ІСТИНА' || actBoolRaw === '1' || actBoolRaw === 'ТАК' || actBoolRaw === 'YES' || row[colMap.activityBool] === true;
        
        if (isActBool || (durationRaw && durationRaw !== '-') || (positionsRaw && positionsRaw !== '-') || (myCountRaw && myCountRaw !== '-') || (herCountRaw && herCountRaw !== '-')) {
          hasActivity = true;
          break;
        }
      }

      for (const { row, date } of dayRows) {
        try {
          const durationRaw = colMap.duration !== -1 ? String(row[colMap.duration] || '').trim() : '';
          const positionsRaw = colMap.positions !== -1 ? String(row[colMap.positions] || '').trim() : '';
          const myCountRaw = colMap.myCount !== -1 ? String(row[colMap.myCount] || '').trim() : '';
          const herCountRaw = colMap.herCount !== -1 ? String(row[colMap.herCount] || '').trim() : '';
          const skipReasonRaw = colMap.skipReason !== -1 ? String(row[colMap.skipReason] || '').trim() : '';
          const actBoolRaw = colMap.activityBool !== -1 ? String(row[colMap.activityBool] || '').trim().toUpperCase() : '';
          
          const isActBool = actBoolRaw === 'TRUE' || actBoolRaw === 'ІСТИНА' || actBoolRaw === '1' || actBoolRaw === 'ТАК' || actBoolRaw === 'YES' || row[colMap.activityBool] === true;
          
          const isActivityRow = isActBool || (durationRaw && durationRaw !== '-') || (positionsRaw && positionsRaw !== '-') || (myCountRaw && myCountRaw !== '-') || (herCountRaw && herCountRaw !== '-');

          // If the day has an activity, ignore skip rows
          if (hasActivity && !isActivityRow) {
            continue;
          }

          const entryId = Math.random().toString(36).substr(2, 9);
          let entryData: Partial<DiaryEntry> = {
            uid: user!.uid,
            date: date.toISOString(),
            type: isActivityRow ? 'activity' : 'skip',
          };

          if (isActivityRow) {
            if (positionsRaw && positionsRaw !== '-') {
              entryData.positions = positionsRaw.split(',').map(p => p.trim() as any);
            }

            if (durationRaw && !isNaN(parseInt(durationRaw))) {
              entryData.duration = parseInt(durationRaw);
            }

            const probVal = colMap.problems !== -1 ? String(row[colMap.problems] || '').trim() : '';
            const probValUpper = probVal.toUpperCase();
            
            if (probValUpper === 'TRUE' || probValUpper === 'ІСТИНА' || probValUpper === '1' || probValUpper === 'ТАК' || probValUpper === 'YES' || row[colMap.problems] === true) {
              entryData.problems = ['Проблеми з ерекцією'];
            } else if (probValUpper === 'FALSE' || probValUpper === 'ХИБНІСТЬ' || probValUpper === '0' || probValUpper === 'НІ' || probValUpper === 'NO' || row[colMap.problems] === false || probVal === '-' || probVal === '') {
              // No problems
            } else {
              // Custom text provided
              entryData.problems = [probVal as any];
            }

            const myCountLower = myCountRaw.toLowerCase();
            if (myCountLower === 'так' || myCountLower === 'true' || myCountLower === 'істина' || row[colMap.myCount] === true) {
              entryData.count = 1;
            } else if (myCountRaw && !isNaN(parseInt(myCountRaw))) {
              entryData.count = parseInt(myCountRaw);
            }

            const herCountLower = herCountRaw.toLowerCase();
            if (herCountLower === 'так' || herCountLower === 'true' || herCountLower === 'істина' || row[colMap.herCount] === true) {
              entryData.herCount = 1;
            } else if (herCountRaw && !isNaN(parseInt(herCountRaw))) {
              entryData.herCount = parseInt(herCountRaw);
            }
            
            const initRaw = colMap.initiator !== -1 ? String(row[colMap.initiator] || '').trim() : '';
            if (initRaw && initRaw !== '-') entryData.initiator = initRaw;

            const ratingRaw = colMap.rating !== -1 ? String(row[colMap.rating] || '').trim() : '';
            if (ratingRaw && !isNaN(parseInt(ratingRaw))) entryData.rating = parseInt(ratingRaw);

            const toysRaw = colMap.toys !== -1 ? String(row[colMap.toys] || '').trim() : '';
            if (toysRaw && toysRaw !== '-') entryData.toys = toysRaw;

            const notesRaw = colMap.notes !== -1 ? String(row[colMap.notes] || '').trim() : '';
            if (notesRaw && notesRaw !== '-') entryData.notes = notesRaw;

          } else {
            if (skipReasonRaw && skipReasonRaw !== '-') {
              const knownReasons = ['Втома', 'Стрес', 'Хвороба', 'Відсутність бажання', 'Партнер не готовий', 'Місячні', 'Інше'];
              const matchedReason = knownReasons.find(r => r.toLowerCase() === skipReasonRaw.toLowerCase());
              
              if (matchedReason) {
                entryData.skipReason = matchedReason as any;
              } else {
                entryData.skipReason = 'Інше';
                entryData.skipNotes = skipReasonRaw;
              }
            }
          }

          const cleanData = Object.fromEntries(
            Object.entries(entryData).filter(([_, v]) => v !== undefined && v !== '')
          );

          await setDoc(doc(db, `users/${user!.uid}/entries`, entryId), cleanData);
          successCount++;
        } catch (error) {
          console.error('Error importing row:', row, error);
          errorCount++;
        }
      }
    }
    
    if (successCount > 0) {
      toast.success(`Імпортовано записів: ${successCount}`);
    }
    if (errorCount > 0) {
      toast.error(`Помилок при імпорті: ${errorCount}`);
    }
    if (successCount === 0 && errorCount === 0) {
      toast.info('Не знайдено даних для імпорту. Перевірте формат файлу.');
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (fileExtension === 'csv') {
      Papa.parse(file, {
        header: false, // Read as arrays since headers are emojis
        skipEmptyLines: true,
        complete: async (results) => {
          await processImportedData(results.data as any[][]);
        },
        error: (error) => {
          toast.error('Помилка читання файлу CSV');
          console.error(error);
        }
      });
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          await processImportedData(jsonData as any[][]);
        } catch (error) {
          toast.error('Помилка читання файлу Excel');
          console.error(error);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      toast.error('Непідтримуваний формат файлу. Використовуйте CSV або XLSX.');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExport = () => {
    if (!entries || entries.length === 0) {
      toast.info('Немає даних для експорту');
      return;
    }

    const exportData = entries.map(entry => {
      if (entry.type === 'activity') {
        return {
          'Дата': format(new Date(entry.date), 'dd.MM.yyyy'),
          'Тип': 'Активність',
          'Пози': entry.positions?.join(', ') || '',
          'Моя еякуляція': entry.count || 0,
          'Її оргазм': entry.herCount || 0,
          'Ініціатор': entry.initiator || '',
          'Тривалість (хв)': entry.duration || '',
          'Оцінка': entry.rating || '',
          'Проблеми': entry.problems?.join(', ') || '',
          'Іграшки': entry.toys || '',
          'Нотатки': entry.notes || '',
          'Причина пропуску': '',
          'Нотатки до пропуску': ''
        };
      } else {
        return {
          'Дата': format(new Date(entry.date), 'dd.MM.yyyy'),
          'Тип': 'Пропуск',
          'Пози': '',
          'Моя еякуляція': '',
          'Її оргазм': '',
          'Ініціатор': '',
          'Тривалість (хв)': '',
          'Оцінка': '',
          'Проблеми': '',
          'Іграшки': '',
          'Нотатки': '',
          'Причина пропуску': entry.skipReason || '',
          'Нотатки до пропуску': entry.skipNotes || ''
        };
      }
    });

    const csv = Papa.unparse(exportData);
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv;charset=utf-8;' }); // Add BOM for Excel
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `intimate_diary_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Дані успішно експортовано');
  };

  const handleSubmitEntry = async (data: Partial<DiaryEntry>) => {
    if (!user) return;
    
    const entryId = data.id || Math.random().toString(36).substr(2, 9);
    const path = `users/${user.uid}/entries/${entryId}`;
    
    // Strip undefined values and 'id' as Firestore doesn't support undefined and 'id' is not in schema
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([k, v]) => v !== undefined && k !== 'id')
    );
    
    try {
      await setDoc(doc(db, `users/${user.uid}/entries`, entryId), {
        ...cleanData,
        uid: user.uid,
      });
      toast.success('Запис успішно збережено');
    } catch (error) {
      toast.error('Помилка при збереженні запису');
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  if (!isAuthReady) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">Завантаження...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <div className="w-16 h-16 bg-red-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
          <Heart className="w-8 h-8 text-white fill-current" />
        </div>
        <h1 className="text-2xl font-bold mb-2 text-center">Щоденник Чоловічого Здоров'я</h1>
        <p className="text-slate-500 mb-8 text-center max-w-sm">
          Приватний та безпечний простір для відстеження вашого інтимного здоров'я.
        </p>
        <Button onClick={signInWithGoogle} size="lg" className="rounded-full px-8">
          Увійти через Google
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
              <Heart className="w-5 h-5 text-white fill-current" />
            </div>
            <h1 className="font-bold text-xl tracking-tight hidden sm:block">Щоденник Чоловічого Здоров'я</h1>
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="file" 
              accept=".csv, .xlsx, .xls" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleImportFile}
            />
            
            <Dialog open={isDataManageOpen} onOpenChange={setIsDataManageOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Керування даними</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm text-slate-500 uppercase tracking-wider">Видалити за період</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="start-date">З дати</Label>
                        <Input 
                          id="start-date" 
                          type="date" 
                          value={deleteStartDate}
                          onChange={(e) => setDeleteStartDate(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="end-date">По дату</Label>
                        <Input 
                          id="end-date" 
                          type="date" 
                          value={deleteEndDate}
                          onChange={(e) => setDeleteEndDate(e.target.value)}
                        />
                      </div>
                    </div>
                    <Button 
                      variant="destructive" 
                      className="w-full" 
                      disabled={!deleteStartDate || !deleteEndDate}
                      onClick={handleDeleteByDateRange}
                    >
                      Видалити за обраний період
                    </Button>
                  </div>
                  
                  <div className="border-t pt-4 space-y-4">
                    <h4 className="font-medium text-sm text-red-500 uppercase tracking-wider">Небезпечна зона</h4>
                    {!showConfirmDeleteAll ? (
                      <Button 
                        variant="destructive" 
                        className="w-full bg-red-600 hover:bg-red-700 text-white" 
                        onClick={() => setShowConfirmDeleteAll(true)}
                      >
                        Очистити всі дані
                      </Button>
                    ) : (
                      <div className="space-y-3 p-3 border border-red-200 bg-red-50 rounded-md">
                        <p className="text-sm text-red-800 font-medium">Ви впевнені? Цю дію неможливо скасувати.</p>
                        <div className="flex gap-2">
                          <Button 
                            variant="destructive" 
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white" 
                            onClick={handleDeleteAll}
                          >
                            Так, видалити
                          </Button>
                          <Button 
                            variant="outline" 
                            className="flex-1" 
                            onClick={() => setShowConfirmDeleteAll(false)}
                          >
                            Скасувати
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" title="Налаштування">
                  <Settings className="w-5 h-5 text-slate-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-4 h-4 mr-2" />
                  <span>Імпорт даних</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExport}>
                  <Download className="w-4 h-4 mr-2" />
                  <span>Експорт даних</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsDataManageOpen(true)} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                  <Trash2 className="w-4 h-4 mr-2" />
                  <span>Керування даними</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  <span>Вийти</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <Tabs defaultValue="calendar" className="space-y-6">
          <div className="flex justify-center">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="calendar" className="gap-2">
                <CalendarIcon className="w-4 h-4" />
                Календар
              </TabsTrigger>
              <TabsTrigger value="stats" className="gap-2">
                <LayoutDashboard className="w-4 h-4" />
                Дашборд
              </TabsTrigger>
            </TabsList>
          </div>

          <AnimatePresence mode="wait">
            <TabsContent value="calendar" key="calendar">
              <motion.div
                key="calendar-motion"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <CalendarView 
                  entries={entries} 
                  onDateSelect={handleDateSelect} 
                  onAddEntry={handleAddEntry}
                  onEditEntry={handleEditEntry}
                  onDeleteEntry={handleDeleteEntry}
                  selectedDate={selectedDate} 
                />
              </motion.div>
            </TabsContent>

            <TabsContent value="stats" key="stats">
              <motion.div
                key="stats-motion"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <StatsDashboard entries={entries} />
              </motion.div>
            </TabsContent>
          </AnimatePresence>
        </Tabs>
      </main>

      <DiaryEntryForm 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        onSubmit={handleSubmitEntry} 
        selectedDate={selectedDate}
        initialData={editingEntry}
      />
      
      <Toaster position="top-center" />
      
      <footer className="py-12 text-center text-slate-400 text-sm">
        <p>© 2026 Щоденник Чоловічого Здоров'я. Приватно та Безпечно.</p>
      </footer>
    </div>
  );
}

