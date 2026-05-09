import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  Database, 
  FileSpreadsheet, 
  Loader2, 
  Filter,
  Calendar,
  ChevronRight,
  ChevronLeft,
  Search,
  LogOut,
  Info
} from 'lucide-react';
import { DataSource, DeliveryTask } from './types';
import { mockData } from './data/mockData';
import { Dashboard } from './components/Dashboard';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [source, setSource] = useState<DataSource>('mysql');
  const [isLoading, setIsLoading] = useState(false);
  const [rawTasks, setRawTasks] = useState<DeliveryTask[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<DeliveryTask[]>([]);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initial load
  useEffect(() => {
    handleSourceChange('mysql');
  }, []);

  // Filtering logic
  useEffect(() => {
    let result = [...rawTasks];
    if (dateRange.start) {
      result = result.filter(t => new Date(t.Creation_DateTime) >= new Date(dateRange.start));
    }
    if (dateRange.end) {
      result = result.filter(t => new Date(t.Creation_DateTime) <= new Date(dateRange.end));
    }
    setFilteredTasks(result);
  }, [rawTasks, dateRange]);

  const handleSourceChange = async (newSource: DataSource) => {
    setSource(newSource);
    setIsLoading(true);
    
    try {
      if (newSource === 'mysql') {
        const response = await fetch('/api/orders');
        if (!response.ok) throw new Error('API request failed');
        const data: DeliveryTask[] = await response.json();
        
        // Check for demo flag
        const isDemo = data.some((t: any) => t.isDemo);
        if (isDemo) {
          console.warn("Using demo data because database is not connected.");
        }
        
        const parsedData = data.map(t => ({
          ...t,
          'Distance(KM)': Number(t['Distance(KM)']),
          'Total_Time_Taken(min)': Number(t['Total_Time_Taken(min)']),
          عدد_الطبالي: Number(t.عدد_الطبالي || 0),
        }));
        setRawTasks(parsedData);
      } else {
        setRawTasks([]);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      // Fallback only if strictly necessary, but let's try to stick to real API
      setRawTasks([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<DeliveryTask>(ws);

        // Map and validate columns
        const validatedData = data.map((row: any) => ({
          Creation_DateTime: row.Creation_DateTime || row['تاريخ الطلب'] || new Date().toISOString(),
          Task_Status: row.Task_Status || row['حالة الطلب'] || 'Unknown',
          Agent_Name: row.Agent_Name || row['اسم المندوب'] || 'Unknown',
          Team_Name: row.Team_Name || row['اسم الفريق'] || 'Unknown',
          'Distance(KM)': Number(row['Distance(KM)'] || row['المسافة'] || 0),
          'Total_Time_Taken(min)': Number(row['Total_Time_Taken(min)'] || row['وقت التوصيل'] || 0),
          عدد_الطبالي: Number(row.عدد_الطبالي || row['عدد الطبالي'] || 0),
          Customer_Address: row.Customer_Address || row['العنوان'] || '-',
        }));

        setRawTasks(validatedData);
      } catch (err) {
        console.error('Error parsing excel:', err);
        alert('خطأ في قراءة ملف الإكسل. يرجى التأكد من تطابق أسماء الأعمدة.');
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans" dir="rtl">
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {sidebarOpen && (
          <motion.aside 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="h-screen bg-white border-l border-slate-200 flex-shrink-0 flex flex-col sticky top-0 overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100 flex items-center gap-3 text-slate-800">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-lg text-white">A</div>
              <span className="font-bold tracking-tight text-lg">abdullah prompt</span>
            </div>

            <nav className="p-6 flex-1 flex flex-col gap-8">
              <div className="space-y-4">
                <label className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1 block px-1">مصدر البيانات</label>
                <div className="space-y-2">
                  <button 
                    onClick={() => handleSourceChange('mysql')}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold text-sm border",
                      source === 'mysql' 
                        ? "bg-blue-50 border-blue-200 text-blue-900 shadow-sm shadow-blue-100" 
                        : "bg-white border-transparent hover:bg-slate-50 text-slate-600"
                    )}
                  >
                    <div className={cn("w-2 h-2 rounded-full", source === 'mysql' ? "bg-blue-600" : "bg-slate-300")} />
                    الربط المباشر (MySQL)
                  </button>
                  <button 
                    onClick={() => handleSourceChange('excel')}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold text-sm border",
                      source === 'excel' 
                        ? "bg-blue-50 border-blue-200 text-blue-900 shadow-sm shadow-blue-100" 
                        : "bg-white border-transparent hover:bg-slate-50 text-slate-600"
                    )}
                  >
                    <div className={cn("w-2 h-2 rounded-full", source === 'excel' ? "bg-blue-600" : "bg-slate-300")} />
                    رفع ملف إكسل
                  </button>
                </div>

                {source === 'excel' && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-all"
                    >
                      اختر ملف .xlsx
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept=".xlsx, .xls"
                      onChange={handleFileUpload} 
                    />
                  </motion.div>
                )}
              </div>

              <div className="space-y-4">
                <label className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1 block px-1">الفلاتر الذكية</label>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-500 font-bold flex items-center gap-1 uppercase tracking-wide">
                      من تاريخ
                    </label>
                    <input 
                      type="date" 
                      className="w-full bg-white border border-slate-200 rounded-lg text-xs p-2.5 text-slate-700 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all shadow-sm"
                      onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-500 font-bold flex items-center gap-1 uppercase tracking-wide">
                      إلى تاريخ
                    </label>
                    <input 
                      type="date" 
                      className="w-full bg-white border border-slate-200 rounded-lg text-xs p-2.5 text-slate-700 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all shadow-sm"
                      onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-auto">
                <div className="bg-blue-600 text-white p-5 rounded-2xl shadow-lg shadow-blue-200 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-12 translate-x-12 blur-2xl group-hover:scale-150 transition-transform duration-700" />
                  <p className="text-[10px] font-bold opacity-80 mb-2 uppercase tracking-widest">حالة المنصة</p>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
                    <span className="font-bold text-sm tracking-wide">متصل وبانتظار البيانات</span>
                  </div>
                </div>
              </div>
            </nav>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-screen relative">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-10 px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
            >
              {sidebarOpen ? <ChevronRight /> : <ChevronLeft />}
            </button>
            <h1 className="font-bold text-slate-800">منصة تحليل بيانات التوصيل</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="بحث في الطلبات..."
                className="bg-slate-100 border-none rounded-full py-2 pl-10 pr-4 text-xs w-64 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-8 max-w-7xl mx-auto w-full">
          {isLoading ? (
            <div className="h-[60vh] flex flex-col items-center justify-center gap-4 text-slate-400">
              <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
              <p className="font-medium">جاري جلب البيانات ومعالجتها...</p>
            </div>
          ) : rawTasks.length === 0 ? (
            <div className="h-[60vh] flex flex-col items-center justify-center gap-6">
              <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center">
                <Info className="w-10 h-10 text-indigo-500" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-slate-800">لا توجد بيانات حالياً</h3>
                <p className="text-slate-500 text-sm max-w-sm">
                  {source === 'excel' 
                    ? "يرجى رفع ملف إكسل يحتوي على بيانات التوصيل للبدء في التحليل."
                    : "يرجى اختيار الربط المباشر أو رفع ملف من القائمة الجانبية."
                  }
                </p>
              </div>
              {source === 'excel' && (
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-3 bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-600 transition-colors text-sm"
                >
                  رفع ملف إكسل الآن
                </button>
              )}
            </div>
          ) : (
            <Dashboard data={filteredTasks} />
          )}
        </div>
      </main>
    </div>
  );
}
