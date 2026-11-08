import React, { useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  Printer,
  Send,
  Briefcase,
  AlertTriangle,
  Award,
  ChevronRight,
  ShieldAlert,
  Search,
  Check,
  X,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react';
import {
  AttendanceRecord,
  AttendanceStatus,
  BusinessProfile,
  Employee,
  EmployeeRole,
} from '../types';
import { openWhatsAppDirect } from '../utils/whatsapp';

interface HRManagementViewProps {
  employees: Employee[];
  attendance: AttendanceRecord[];
  profile: BusinessProfile;
  onSaveEmployee: (employee: Employee) => void;
  onSaveAttendance: (record: AttendanceRecord) => void;
  onDeleteEmployee?: (employeeId: string) => void;
  onDeleteAttendance?: (recordId: string) => void;
}

export const HRManagementView: React.FC<HRManagementViewProps> = ({
  employees,
  attendance,
  profile,
  onSaveEmployee,
  onSaveAttendance,
  onDeleteEmployee,
  onDeleteAttendance,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'employees' | 'attendance' | 'payroll'>('employees');
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editingAttendanceRecord, setEditingAttendanceRecord] = useState<AttendanceRecord | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [selectedPaySlipEmp, setSelectedPaySlipEmp] = useState<Employee | null>(null);

  // New Employee Form State
  const [name, setName] = useState('');
  const [urduName, setUrduName] = useState('');
  const [phone, setPhone] = useState('');
  const [cnic, setCnic] = useState('');
  const [role, setRole] = useState<EmployeeRole>('cashier');
  const [baseSalary, setBaseSalary] = useState<number>(30000);
  const [medical, setMedical] = useState<number>(3000);
  const [fuel, setFuel] = useState<number>(4000);
  const [food, setFood] = useState<number>(4000);
  const [bonus, setBonus] = useState<number>(1000);
  const [joiningDate, setJoiningDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Attendance for the selected date
  const todayAttendanceMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    attendance
      .filter((a) => a.date === selectedDate)
      .forEach((a) => map.set(a.employeeId, a));
    return map;
  }, [attendance, selectedDate]);

  // Handle Mark Attendance
  const handleMarkStatus = (employeeId: string, status: AttendanceStatus) => {
    const existing = todayAttendanceMap.get(employeeId);
    const updated: AttendanceRecord = {
      id: existing ? existing.id : `att_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      employeeId,
      date: selectedDate,
      status,
      checkInTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    onSaveAttendance(updated);
  };

  // Submit New Employee
  const handleCreateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    const newEmp: Employee = {
      id: `emp_${Date.now()}`,
      name,
      urduName,
      phone,
      cnic,
      role,
      baseSalary,
      allowances: {
        medical,
        fuel,
        food,
        bonus,
      },
      joiningDate,
      status: 'active',
      notes,
    };

    onSaveEmployee(newEmp);
    setIsAddEmployeeOpen(false);

    // Reset Form
    setName('');
    setUrduName('');
    setPhone('');
    setCnic('');
    alert(`نیا ملازم ${name} کامیابی سے بھرتی کر لیا گیا!\nEmployee registered with allowances.`);
  };

  // Compute Monthly Payroll for Current Month
  const currentMonthStr = selectedDate.substring(0, 7); // e.g. "2026-03"
  const payrollRows = useMemo(() => {
    const monthRecords = attendance.filter((a) => a.date.startsWith(currentMonthStr));

    return employees.map((emp) => {
      const empMonthAtt = monthRecords.filter((a) => a.employeeId === emp.id);

      const presentDays = empMonthAtt.filter((a) => a.status === 'present').length;
      const lateDays = empMonthAtt.filter((a) => a.status === 'late').length;
      const halfDays = empMonthAtt.filter((a) => a.status === 'half_day').length;
      const absentDays = empMonthAtt.filter((a) => a.status === 'absent').length;

      // Allowances sum
      const totalAllowances =
        (emp.allowances.medical || 0) +
        (emp.allowances.fuel || 0) +
        (emp.allowances.food || 0) +
        (emp.allowances.bonus || 0);

      const grossSalary = emp.baseSalary + totalAllowances;
      const dailyRate = Math.round(emp.baseSalary / 30);

      // Calculations:
      // Absent = 100% daily deduction
      // Half Day = 50% daily deduction
      // Late = 25% daily deduction
      const deductions = Math.round(
        absentDays * dailyRate +
        halfDays * (dailyRate * 0.5) +
        lateDays * (dailyRate * 0.25)
      );

      const netSalary = Math.max(0, grossSalary - deductions);

      return {
        employee: emp,
        presentDays,
        lateDays,
        halfDays,
        absentDays,
        totalAllowances,
        grossSalary,
        dailyRate,
        deductions,
        netSalary,
      };
    });
  }, [employees, attendance, currentMonthStr]);

  const totalPayrollGross = payrollRows.reduce((acc, r) => acc + r.grossSalary, 0);
  const totalPayrollNet = payrollRows.reduce((acc, r) => acc + r.netSalary, 0);
  const totalDeductions = payrollRows.reduce((acc, r) => acc + r.deductions, 0);

  // Send WhatsApp Salary Slip
  const handleSendSalarySlipWhatsApp = (row: typeof payrollRows[0]) => {
    const emp = row.employee;
    const cleanPhone = emp.phone.replace(/\D/g, '');
    const msg = `📑 *ماہانہ تنخواہ سلپ / Monthly Salary Slip*\n*${profile.name} · مدینہ مارکیٹ*\n\nمحترم *${emp.name}*${emp.urduName ? ` (${emp.urduName})` : ''} صاحب،\n*عہدہ / Role:* ${emp.role.toUpperCase()}\n*Month:* ${currentMonthStr}\n\n*تنخواہ کی تفصیلات (Salary Breakdown):*\n• بنیادی تنخواہ (Base Salary): ${profile.currencySymbol}${emp.baseSalary.toLocaleString('en-PK')}\n• میڈیکل الاؤنس (Medical): ${profile.currencySymbol}${emp.allowances.medical.toLocaleString('en-PK')}\n• فیول / کنوینس (Fuel): ${profile.currencySymbol}${emp.allowances.fuel.toLocaleString('en-PK')}\n• راشن / کھانا الاؤنس (Food): ${profile.currencySymbol}${emp.allowances.food.toLocaleString('en-PK')}\n• پرفارمنس بونس (Bonus): ${profile.currencySymbol}${emp.allowances.bonus.toLocaleString('en-PK')}\n*کل گراس تنخواہ (Gross Package):* *${profile.currencySymbol}${row.grossSalary.toLocaleString('en-PK')}*\n\n*حاضری اور کٹوتیاں (Attendance Deductions):*\n• حاضر دن: ${row.presentDays}\n• تاخیر: ${row.lateDays} دن (25% کٹوتی)\n• آدھا دن: ${row.halfDays} دن (50% کٹوتی)\n• غیر حاضری: ${row.absentDays} دن (100% کٹوتی)\n• کل کٹوتی: *${profile.currencySymbol}${row.deductions.toLocaleString('en-PK')}*\n\n💵 *خالص قابل ادائیگی تنخواہ (Net Payable):* *${profile.currencySymbol}${row.netSalary.toLocaleString('en-PK')}*\n\nادائیگی بذریعہ بینک / کیش کر دی گئی ہے۔ شکریہ!`;

    openWhatsAppDirect(cleanPhone, msg);
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP METRICS & STATS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Total Staff (کل ملازمین)</span>
            <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <p className="text-xl font-black font-mono text-slate-900 dark:text-white">
            {employees.length} Active
          </p>
          <span className="text-[10px] text-slate-400 block">
            Managers, Cashiers, Dispatchers &amp; Riders
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Monthly Net Payroll (خالص تنخواہیں)</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <p className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            {profile.currencySymbol}{totalPayrollNet.toLocaleString('en-PK')}
          </p>
          <span className="text-[10px] text-slate-400 block font-mono">
            Gross: {profile.currencySymbol}{totalPayrollGross.toLocaleString('en-PK')}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Attendance Deductions (کٹوتی)</span>
            <span className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <p className="text-xl font-black font-mono text-amber-600 dark:text-amber-400">
            {profile.currencySymbol}{totalDeductions.toLocaleString('en-PK')}
          </p>
          <span className="text-[10px] text-slate-400 block">
            Auto-calculated on late / absent days
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Package Allowances</span>
            <span className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600">
              <Award className="w-4 h-4" />
            </span>
          </div>
          <p className="text-sm font-extrabold text-slate-900 dark:text-white pt-1">
            Medical · Fuel · Food · Bonus
          </p>
          <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold block">
            Role-Based Package System Active
          </span>
        </div>
      </div>

      {/* 2. SUB-NAVIGATION TABS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <button
            onClick={() => setActiveSubTab('employees')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeSubTab === 'employees'
                ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Staff Directory &amp; Packages ({employees.length})
          </button>
          <button
            onClick={() => setActiveSubTab('attendance')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeSubTab === 'attendance'
                ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Daily Attendance Log (روزانہ حاضری)
          </button>
          <button
            onClick={() => setActiveSubTab('payroll')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeSubTab === 'payroll'
                ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Auto Monthly Payroll (تنخواہیں اور سلپ)
          </button>
        </div>

        <button
          onClick={() => setIsAddEmployeeOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 font-bold text-xs rounded-xl hover:bg-slate-800 dark:hover:bg-amber-400 cursor-pointer shadow-xs"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Hire New Employee (نئی بھرتی)</span>
        </button>
      </div>

      {/* 3. SUBTAB 1: STAFF DIRECTORY & PACKAGES */}
      {activeSubTab === 'employees' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {employees.map((emp) => {
            const totalAllowances =
              emp.allowances.medical +
              emp.allowances.fuel +
              emp.allowances.food +
              emp.allowances.bonus;
            const gross = emp.baseSalary + totalAllowances;

            return (
              <div
                key={emp.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4 hover:shadow-md transition-all text-xs"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300">
                      {emp.role.replace('_', ' ')}
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-1">
                      {emp.name}
                    </h3>
                    {emp.urduName && (
                      <p className="font-urdu text-xs text-slate-500 dark:text-slate-400">
                        {emp.urduName}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Gross Package</span>
                    <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-base">
                      {profile.currencySymbol}{gross.toLocaleString('en-PK')}
                    </span>
                  </div>
                </div>

                {/* Contact & CNIC */}
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-400 font-mono bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-750">
                  <div>
                    <span className="text-[9px] uppercase text-slate-400 block font-bold">CNIC:</span>
                    <span>{emp.cnic}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase text-slate-400 block font-bold">Mobile Phone:</span>
                    <span>📞 {emp.phone}</span>
                  </div>
                </div>

                {/* Package Allowances Breakdown */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Allowances &amp; Base Salary Package:
                  </span>
                  <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                    <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200/60 dark:border-slate-750">
                      <span className="text-[10px] text-slate-500 block">Base Pay:</span>
                      <b className="text-slate-900 dark:text-white">{profile.currencySymbol}{emp.baseSalary.toLocaleString('en-PK')}</b>
                    </div>
                    <div className="p-2 bg-blue-50/60 dark:bg-blue-950/30 rounded border border-blue-200/60 dark:border-blue-900">
                      <span className="text-[10px] text-blue-700 dark:text-blue-300 block">Medical:</span>
                      <b className="text-blue-900 dark:text-blue-200">{profile.currencySymbol}{emp.allowances.medical.toLocaleString('en-PK')}</b>
                    </div>
                    <div className="p-2 bg-emerald-50/60 dark:bg-emerald-950/30 rounded border border-emerald-200/60 dark:border-emerald-900">
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-300 block">Fuel / Conveyance:</span>
                      <b className="text-emerald-900 dark:text-emerald-200">{profile.currencySymbol}{emp.allowances.fuel.toLocaleString('en-PK')}</b>
                    </div>
                    <div className="p-2 bg-amber-50/60 dark:bg-amber-950/30 rounded border border-amber-200/60 dark:border-amber-900">
                      <span className="text-[10px] text-amber-700 dark:text-amber-300 block">Food / Mess &amp; Bonus:</span>
                      <b className="text-amber-900 dark:text-amber-200">{profile.currencySymbol}{(emp.allowances.food + emp.allowances.bonus).toLocaleString('en-PK')}</b>
                    </div>
                  </div>
                </div>

                {/* Edit Staff & Package Action */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-slate-400">
                    Joined: {emp.joiningDate} · Status: <b className="capitalize text-emerald-600 dark:text-emerald-400">{emp.status}</b>
                  </span>
                  <button
                    onClick={() => setEditingEmployee(emp)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs cursor-pointer shadow-xs transition-colors"
                  >
                    <Pencil className="w-3 h-3" />
                    <span>Edit Staff &amp; Package (تبدیل کریں)</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. SUBTAB 2: DAILY ATTENDANCE LOG */}
      {activeSubTab === 'attendance' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white">
                Daily Attendance Register (روزانہ ملازمین حاضری)
              </h2>
              <span className="text-xs text-slate-500">
                Mark status to auto-calculate late, half-day, and absence deductions.
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Date:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          <div className="space-y-3">
            {employees.map((emp) => {
              const currentRecord = todayAttendanceMap.get(emp.id);
              const status = currentRecord?.status || 'present';

              return (
                <div
                  key={emp.id}
                  className="bg-slate-50 dark:bg-slate-850 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                        {emp.name}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 uppercase">
                        {emp.role}
                      </span>
                    </div>
                    <span className="text-slate-400 font-mono text-[11px]">
                      CNIC: {emp.cnic} · {emp.phone}
                    </span>
                  </div>

                  {/* Attendance Status Buttons */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleMarkStatus(emp.id, 'present')}
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                        status === 'present'
                          ? 'bg-emerald-600 text-white ring-2 ring-emerald-400 shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      ✓ Present (حاضر)
                    </button>

                    <button
                      type="button"
                      onClick={() => handleMarkStatus(emp.id, 'late')}
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                        status === 'late'
                          ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400 shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      ⏱️ Late (-25%)
                    </button>

                    <button
                      type="button"
                      onClick={() => handleMarkStatus(emp.id, 'half_day')}
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                        status === 'half_day'
                          ? 'bg-orange-500 text-white ring-2 ring-orange-400 shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      🌓 Half Day (-50%)
                    </button>

                    <button
                      type="button"
                      onClick={() => handleMarkStatus(emp.id, 'absent')}
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                        status === 'absent'
                          ? 'bg-red-600 text-white ring-2 ring-red-400 shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      ✕ Absent (-100%)
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Attendance Log History & Manual Corrections */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider">
                  Attendance Records History &amp; Editing (حاضری ریکارڈز کی درستی)
                </h3>
                <span className="text-[11px] text-slate-400">
                  Click Edit on any record to adjust check-in time, status, or delete wrong entries.
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                Total Records: {attendance.length}
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px]">
                    <th className="py-2.5 px-3">Date (تاریخ)</th>
                    <th className="py-2.5 px-3">Staff Name</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Check-In Time</th>
                    <th className="py-2.5 px-3">Notes</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {attendance.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400">
                        No attendance records logged yet. Use the status buttons above to mark today's attendance.
                      </td>
                    </tr>
                  ) : (
                    attendance.map((rec) => {
                      const emp = employees.find((e) => e.id === rec.employeeId);
                      return (
                        <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-850">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                            {rec.date}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                            {emp?.name || rec.employeeId}
                            {emp && <span className="block text-[10px] text-slate-400 font-normal">{emp.role}</span>}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                rec.status === 'present'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : rec.status === 'late'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                  : rec.status === 'half_day'
                                  ? 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300'
                                  : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                              }`}
                            >
                              {rec.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                            {rec.checkInTime || '09:00 AM'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 max-w-[200px] truncate">
                            {rec.notes || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setEditingAttendanceRecord(rec)}
                                className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded cursor-pointer"
                                title="Edit Record"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              {onDeleteAttendance && (
                                <button
                                  onClick={() => {
                                    if (confirm('Delete this attendance entry?')) {
                                      onDeleteAttendance(rec.id);
                                    }
                                  }}
                                  className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded cursor-pointer"
                                  title="Delete Record"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. SUBTAB 3: AUTO MONTHLY PAYROLL TABLE */}
      {activeSubTab === 'payroll' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white">
                Auto-Calculated Monthly Payroll Sheet ({currentMonthStr})
              </h2>
              <span className="text-xs text-slate-500">
                Formula: Net Salary = (Base Pay + Medical + Fuel + Food + Bonus) - Attendance Deductions.
              </span>
            </div>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Payroll Sheet</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px]">
                  <th className="py-2.5 px-3">Employee</th>
                  <th className="py-2.5 px-3">Base Pay</th>
                  <th className="py-2.5 px-3">Allowances</th>
                  <th className="py-2.5 px-3">Gross Package</th>
                  <th className="py-2.5 px-3">Attendance Stats</th>
                  <th className="py-2.5 px-3">Deductions</th>
                  <th className="py-2.5 px-3">Net Payable</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {payrollRows.map((row) => (
                  <tr key={row.employee.id} className="hover:bg-slate-50 dark:hover:bg-slate-850">
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                      <div>{row.employee.name}</div>
                      <span className="text-[10px] text-slate-400 font-normal">{row.employee.role}</span>
                    </td>
                    <td className="py-3 px-3 font-mono">
                      {profile.currencySymbol}{row.employee.baseSalary.toLocaleString('en-PK')}
                    </td>
                    <td className="py-3 px-3 font-mono text-blue-600 dark:text-blue-400">
                      +{profile.currencySymbol}{row.totalAllowances.toLocaleString('en-PK')}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                      {profile.currencySymbol}{row.grossSalary.toLocaleString('en-PK')}
                    </td>
                    <td className="py-3 px-3 text-[11px] space-x-1">
                      <span className="text-emerald-600 font-bold">{row.presentDays}P</span>
                      <span className="text-amber-600 font-bold">{row.lateDays}L</span>
                      <span className="text-orange-600 font-bold">{row.halfDays}H</span>
                      <span className="text-red-600 font-bold">{row.absentDays}A</span>
                    </td>
                    <td className="py-3 px-3 font-mono text-red-600 dark:text-red-400 font-bold">
                      -{profile.currencySymbol}{row.deductions.toLocaleString('en-PK')}
                    </td>
                    <td className="py-3 px-3 font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
                      {profile.currencySymbol}{row.netSalary.toLocaleString('en-PK')}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleSendSalarySlipWhatsApp(row)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-lg font-bold text-[11px] cursor-pointer"
                      >
                        <Send className="w-3 h-3" />
                        <span>Send Slip</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. MODAL: HIRE NEW EMPLOYEE */}
      {isAddEmployeeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl my-8">
            <div className="bg-[#FFD200] p-4 flex items-center justify-between text-slate-900">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                <h2 className="text-base font-black">Hire Employee &amp; Set Package (نئی بھرتی اور الاؤنس پیکج)</h2>
              </div>
              <button
                onClick={() => setIsAddEmployeeOpen(false)}
                className="p-1 text-slate-800 hover:text-black rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Full Name (مکمل نام)
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Asif Mehmood"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1 font-urdu">
                    Urdu Name (اردو نام)
                  </label>
                  <input
                    type="text"
                    value={urduName}
                    onChange={(e) => setUrduName(e.target.value)}
                    placeholder="آصف محمود"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-urdu"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Role (عہدہ)
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="manager">Store Manager</option>
                    <option value="cashier">POS Cashier</option>
                    <option value="dispatcher">COD Dispatcher</option>
                    <option value="rider">Delivery Rider</option>
                    <option value="warehouse_staff">Warehouse Staff</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Phone (واٹس ایپ)
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="03001234567"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    CNIC (شناختی کارڈ)
                  </label>
                  <input
                    type="text"
                    value={cnic}
                    onChange={(e) => setCnic(e.target.value)}
                    placeholder="35201-1234567-1"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                    required
                  />
                </div>
              </div>

              {/* Salary & Allowances Package */}
              <div className="p-3 bg-amber-50/70 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 space-y-3">
                <span className="font-bold text-amber-900 dark:text-amber-200 block text-xs">
                  Salary &amp; Allowances Package (تنخواہ اور الاؤنسز پیکج):
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-600 dark:text-slate-400 block mb-0.5">Base Salary</label>
                    <input
                      type="number"
                      value={baseSalary}
                      onChange={(e) => setBaseSalary(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-600 dark:text-slate-400 block mb-0.5">Medical</label>
                    <input
                      type="number"
                      value={medical}
                      onChange={(e) => setMedical(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-600 dark:text-slate-400 block mb-0.5">Fuel</label>
                    <input
                      type="number"
                      value={fuel}
                      onChange={(e) => setFuel(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-600 dark:text-slate-400 block mb-0.5">Food</label>
                    <input
                      type="number"
                      value={food}
                      onChange={(e) => setFood(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-600 dark:text-slate-400 block mb-0.5">Bonus</label>
                    <input
                      type="number"
                      value={bonus}
                      onChange={(e) => setBonus(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddEmployeeOpen(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow-xs cursor-pointer"
                >
                  Register Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. MODAL: EDIT EXISTING EMPLOYEE & ALLOWANCES */}
      {editingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl my-8 p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Pencil className="w-4 h-4 text-amber-500" />
                <span>Edit Staff Member &amp; Allowances (ملازم کی معلومات و الاؤنسز کی تدوین)</span>
              </h2>
              <button
                onClick={() => setEditingEmployee(null)}
                className="text-slate-400 hover:text-black dark:hover:text-white cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                onSaveEmployee(editingEmployee);
                setEditingEmployee(null);
                alert(`ملازم ${editingEmployee.name} کی معلومات کامیابی سے تبدیل کر دی گئیں!`);
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Employee Name (نام)
                  </label>
                  <input
                    type="text"
                    value={editingEmployee.name}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Urdu Name (اردو نام)
                  </label>
                  <input
                    type="text"
                    value={editingEmployee.urduName || ''}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, urduName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-urdu"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Role (عہدہ)
                  </label>
                  <select
                    value={editingEmployee.role}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, role: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="manager">Store Manager</option>
                    <option value="cashier">POS Cashier</option>
                    <option value="dispatcher">COD Dispatcher</option>
                    <option value="rider">Delivery Rider</option>
                    <option value="warehouse_staff">Warehouse Staff</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Phone (موبائل فون)
                  </label>
                  <input
                    type="text"
                    value={editingEmployee.phone}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    CNIC (شناختی کارڈ)
                  </label>
                  <input
                    type="text"
                    value={editingEmployee.cnic}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, cnic: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Status (موجودہ حالت)
                  </label>
                  <select
                    value={editingEmployee.status}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="active">Active (فعال ملازم)</option>
                    <option value="on_leave">On Leave (رخصت پر)</option>
                    <option value="resigned">Resigned (مستعفی)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Joining Date (تاریخ بھرتی)
                  </label>
                  <input
                    type="date"
                    value={editingEmployee.joiningDate}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, joiningDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Editable Salary & Allowances Package */}
              <div className="p-3 bg-amber-50/70 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 space-y-3">
                <span className="font-bold text-amber-900 dark:text-amber-200 block text-xs">
                  Salary &amp; Allowances Package (تنخواہ اور الاؤنسز پیکج تبدیل کریں):
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-600 dark:text-slate-400 block mb-0.5">Base Pay</label>
                    <input
                      type="number"
                      value={editingEmployee.baseSalary}
                      onChange={(e) =>
                        setEditingEmployee({ ...editingEmployee, baseSalary: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-600 dark:text-slate-400 block mb-0.5">Medical</label>
                    <input
                      type="number"
                      value={editingEmployee.allowances.medical}
                      onChange={(e) =>
                        setEditingEmployee({
                          ...editingEmployee,
                          allowances: { ...editingEmployee.allowances, medical: parseFloat(e.target.value) || 0 },
                        })
                      }
                      className="w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-600 dark:text-slate-400 block mb-0.5">Fuel</label>
                    <input
                      type="number"
                      value={editingEmployee.allowances.fuel}
                      onChange={(e) =>
                        setEditingEmployee({
                          ...editingEmployee,
                          allowances: { ...editingEmployee.allowances, fuel: parseFloat(e.target.value) || 0 },
                        })
                      }
                      className="w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-600 dark:text-slate-400 block mb-0.5">Food</label>
                    <input
                      type="number"
                      value={editingEmployee.allowances.food}
                      onChange={(e) =>
                        setEditingEmployee({
                          ...editingEmployee,
                          allowances: { ...editingEmployee.allowances, food: parseFloat(e.target.value) || 0 },
                        })
                      }
                      className="w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-600 dark:text-slate-400 block mb-0.5">Bonus</label>
                    <input
                      type="number"
                      value={editingEmployee.allowances.bonus}
                      onChange={(e) =>
                        setEditingEmployee({
                          ...editingEmployee,
                          allowances: { ...editingEmployee.allowances, bonus: parseFloat(e.target.value) || 0 },
                        })
                      }
                      className="w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Notes / ذمہ داریاں
                </label>
                <input
                  type="text"
                  value={editingEmployee.notes || ''}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex justify-between items-center border-t border-slate-200 dark:border-slate-800">
                {onDeleteEmployee && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Delete employee ${editingEmployee.name}?`)) {
                        onDeleteEmployee(editingEmployee.id);
                        setEditingEmployee(null);
                      }
                    }}
                    className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/60 rounded-lg cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Staff</span>
                  </button>
                )}
                <div className="flex gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setEditingEmployee(null)}
                    className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow-xs cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. MODAL: EDIT ATTENDANCE RECORD */}
      {editingAttendanceRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" />
                <span>Edit Attendance Record (حاضری ریکارڈ میں ترمیم)</span>
              </h2>
              <button
                onClick={() => setEditingAttendanceRecord(null)}
                className="text-slate-400 hover:text-black dark:hover:text-white cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                onSaveAttendance(editingAttendanceRecord);
                setEditingAttendanceRecord(null);
                alert('حاضری ریکارڈ کامیابی سے اپ ڈیٹ ہو گیا!');
              }}
              className="space-y-3"
            >
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Date (تاریخ)</label>
                <input
                  type="date"
                  value={editingAttendanceRecord.date}
                  onChange={(e) =>
                    setEditingAttendanceRecord({ ...editingAttendanceRecord, date: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Attendance Status (حالت حاضری)
                </label>
                <select
                  value={editingAttendanceRecord.status}
                  onChange={(e) =>
                    setEditingAttendanceRecord({
                      ...editingAttendanceRecord,
                      status: e.target.value as AttendanceStatus,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="present">✓ Present (حاضر)</option>
                  <option value="late">⏱️ Late (-25% Deduction)</option>
                  <option value="half_day">🌓 Half Day (-50% Deduction)</option>
                  <option value="absent">✕ Absent (-100% Deduction)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Check-In Time (آمد کا وقت)
                </label>
                <input
                  type="text"
                  value={editingAttendanceRecord.checkInTime || '09:00 AM'}
                  onChange={(e) =>
                    setEditingAttendanceRecord({ ...editingAttendanceRecord, checkInTime: e.target.value })
                  }
                  placeholder="e.g. 09:15 AM"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Notes / وجہ تاخیر
                </label>
                <input
                  type="text"
                  value={editingAttendanceRecord.notes || ''}
                  onChange={(e) =>
                    setEditingAttendanceRecord({ ...editingAttendanceRecord, notes: e.target.value })
                  }
                  placeholder="e.g. Traffic delay, family emergency..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex justify-between items-center border-t border-slate-200 dark:border-slate-800">
                {onDeleteAttendance && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Delete this attendance entry?')) {
                        onDeleteAttendance(editingAttendanceRecord.id);
                        setEditingAttendanceRecord(null);
                      }
                    }}
                    className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/60 rounded-lg cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Entry</span>
                  </button>
                )}
                <div className="flex gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setEditingAttendanceRecord(null)}
                    className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl shadow-xs cursor-pointer"
                  >
                    Update Attendance
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
