import React, { useMemo, useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from 'recharts';
import { 
  Package, 
  CheckCircle2, 
  XSquare, 
  History, 
  Map as MapIcon,
  TrendingUp,
  Users,
  Warehouse,
  Sparkles,
  Loader2
} from 'lucide-react';
import { DeliveryTask, KPIStats } from '../types';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface DashboardProps {
  data: DeliveryTask[];
}

export const Dashboard: React.FC<DashboardProps> = ({ data }) => {
  const [aiSummary, setAiSummary] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  const stats = useMemo<KPIStats>(() => {
    const total = data.length;
const successful = data.filter((t) => t.Task_Status.includes('Successful') || t.Task_Status.includes('Completed')).length;
    const failed = data.filter((t) => ['Failed', 'Declined', 'Cancelled'].includes(t.Task_Status)).length;
    
    const successRate = total > 0 ? (successful / (successful + failed)) * 100 : 0;
    
    const successfulTasks = data.filter((t) => t.Task_Status.includes('Successful'));
    const avgTime = successfulTasks.length > 0 
      ? successfulTasks.reduce((acc, curr) => acc + (Number(curr['Total_Time_Taken(min)']) || 0), 0) / successfulTasks.length 
      : 0;

    const totalDistance = data.reduce((acc, curr) => acc + (Number(curr['Distance(KM)']) || 0), 0);

    return {
      totalOrders: total,
      successfulOrders: successful,
      successRate: isNaN(successRate) ? 0 : successRate,
      avgDeliveryTime: avgTime,
      totalDistance: totalDistance,
    };
  }, [data]);

  // AI Summary generation
  useEffect(() => {
    if (data.length > 0) {
      const getAiAnalysis = async () => {
        setIsAiLoading(true);
        try {
          const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stats })
          });
          const result = await response.json();
          if (result.summary) setAiSummary(result.summary);
        } catch (error) {
          console.error("AI Analysis failed:", error);
        } finally {
          setIsAiLoading(false);
        }
      };
      
      const timer = setTimeout(getAiAnalysis, 1000); // Debounce to prevent multiple calls
      return () => clearTimeout(timer);
    }
  }, [stats, data.length]);

  // Chart Data: Status Distribution
  const statusData = useMemo(() => {
    const counts = {
      'ناجحة': data.filter(t => t.Task_Status.includes('Successful')).length,
      'نشطة': data.filter(t => ['Assigned', 'Accepted', 'Started', 'InProgress'].includes(t.Task_Status)).length,
      'فاشلة': data.filter(t => ['Failed', 'Declined', 'Cancelled'].includes(t.Task_Status)).length,
    };
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [data]);

  // Chart Data: Top 5 Agents
  const topAgentsData = useMemo(() => {
    const agentCounts: Record<string, number> = {};
    data.filter(t => t.Task_Status.includes('Successful')).forEach(t => {
      agentCounts[t.Agent_Name] = (agentCounts[t.Agent_Name] || 0) + 1;
    });
    return Object.entries(agentCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [data]);

  // Chart Data: Warehouse workload
  const warehouseData = useMemo(() => {
    const teamCounts: Record<string, number> = {};
    data.forEach(t => {
      teamCounts[t.Team_Name] = (teamCounts[t.Team_Name] || 0) + 1;
    });
    return Object.entries(teamCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [data]);

  const KPICard = ({ title, value, unit, icon: Icon, trend }: any) => (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col justify-between hover:shadow-lg hover:shadow-slate-200/50 transition-all duration-300 group">
      <div className="flex justify-between items-start mb-4">
        <span className="text-sm text-slate-500 font-bold uppercase tracking-wider">{title}</span>
        <div className="p-2 rounded-xl bg-slate-50 group-hover:bg-blue-50 transition-colors">
          <Icon className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
        </div>
      </div>
      <div className="flex items-end justify-between">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-slate-800 tracking-tight">
            {typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 1 }) : value}
          </span>
          <span className="text-slate-400 text-sm font-medium">{unit}</span>
        </div>
        {trend && (
          <span className="text-emerald-500 text-[10px] font-bold bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
            {trend}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 pb-12" dir="rtl">
      {/* AI Summary Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 rounded-2xl shadow-lg shadow-blue-200 text-white relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32 blur-3xl" />
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
            <Sparkles className="w-5 h-5 text-amber-300" />
          </div>
          <h2 className="text-lg font-bold">الملخص الذكي (AI Analysis)</h2>
        </div>
        
        {isAiLoading ? (
          <div className="flex items-center gap-3 text-white/70">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">جاري مراجعة الأداء من قبل الذكاء الاصطناعي...</span>
          </div>
        ) : (
          <p className="text-slate-100 leading-relaxed text-sm font-medium">
            {aiSummary || "بانتظار تحليل البيانات لتقديم الملخص..."}
          </p>
        )}
      </motion.div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard 
          title="إجمالي الطلبات" 
          value={stats.totalOrders} 
          unit="طلب" 
          icon={Package} 
          trend="+12%"
        />
        <KPICard 
          title="الطلبات الناجحة" 
          value={stats.successfulOrders} 
          unit="طلب" 
          icon={CheckCircle2} 
        />
        <KPICard 
          title="معدل النجاح" 
          value={stats.successRate} 
          unit="%" 
          icon={TrendingUp} 
        />
        <KPICard 
          title="متوسط الوقت" 
          value={stats.avgDeliveryTime} 
          unit="دقيقة" 
          icon={History} 
        />
        <KPICard 
          title="إجمالي المسافات" 
          value={stats.totalDistance} 
          unit="كم" 
          icon={MapIcon} 
        />
      </div>

      {/* Visualizations Row */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Status Distribution */}
        <div className="md:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 flex flex-col h-[380px]">
          <h3 className="text-xs font-bold text-slate-400 mb-6 uppercase tracking-widest pl-2 border-r-4 border-blue-600 pr-2">توزيع الحالات</h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData} layout="vertical" margin={{ right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={60} tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                />
                <Bar dataKey="value" name="عدد الطلبات" radius={[0, 10, 10, 0]} barSize={24}>
                  {statusData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.name === 'ناجحة' ? '#10b981' : entry.name === 'فاشلة' ? '#f43f5e' : '#3b82f6'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top 5 Agents */}
        <div className="md:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 flex flex-col h-[380px]">
          <h3 className="text-xs font-bold text-slate-400 mb-6 uppercase tracking-widest pl-2 border-r-4 border-amber-500 pr-2">أداء المناديب الاستثنائي</h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topAgentsData} margin={{ top: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                />
                <Bar dataKey="count" name="طلبات ناجحة" fill="#f59e0b" radius={[10, 10, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Team Volume Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col h-[400px]">
        <h3 className="text-xs font-bold text-slate-400 mb-8 uppercase tracking-widest pl-2 border-r-4 border-indigo-500 pr-2">توزيع ضغط العمل على المستودعات</h3>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={warehouseData} margin={{ top: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip 
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
              />
              <Bar dataKey="count" name="إجمالي الطلبات" fill="#6366f1" radius={[10, 10, 0, 0]} barSize={55} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col shadow-sm">
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white">
          <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest">تاريخ العمليات المكتملة</h3>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-500 hover:bg-slate-100 transition-colors uppercase tracking-wider">فلترة الأعمدة</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead className="bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">تاريخ ووقت الطلب</th>
                <th className="px-6 py-4">اسم المندوب</th>
                <th className="px-6 py-4">حالة العملية</th>
                <th className="px-6 py-4 text-center">المسافة</th>
                <th className="px-6 py-4">العنوان</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-slate-100">
              {data.map((task, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4 text-slate-500 font-medium">
                    {new Date(task.Creation_DateTime).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-700">{task.Agent_Name}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-extrabold border uppercase tracking-wide",
                      task.Task_Status.includes('Successful') ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                      ['Failed', 'Declined', 'Cancelled'].includes(task.Task_Status) ? "bg-rose-50 text-rose-600 border-rose-100" :
                      "bg-blue-50 text-blue-600 border-blue-100"
                    )}>
                      {task.Task_Status}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-slate-500 text-center">{task['Distance(KM)']} كم</td>
                  <td className="px-6 py-4 text-slate-400 group-hover:text-slate-600 transition-colors">{task.Customer_Address}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.length === 0 && (
            <div className="p-16 text-center text-slate-400 bg-slate-50/50">
              <History className="w-12 h-12 mx-auto mb-4 opacity-10" />
              <p className="text-sm font-medium">لا توجد بيانات سجلات متاحة حالياً.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
