import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Calendar, 
  UserCheck, 
  Wrench, 
  Building2, 
  Clock, 
  Layers, 
  FileCheck,
  MapPin,
  Tag,
  Hash,
  Info,
  Smartphone
} from 'lucide-react';
import { apiFetch } from '../lib/apiClient';
import { 
  CalibrationSchedule, 
  Hospital, 
  Technician, 
  CalibratorAsset, 
  MedicalDeviceToCalibrate,
  MarketingStaff 
} from '../types';
import { 
  TODAY_STR, 
  getHospitalCode, 
  formatLabelNumber, 
  calculateLabelRange,
  assignDeviceLabels 
} from '../utils/helpers';

interface ScheduleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (schedule: CalibrationSchedule) => void;
  hospitals: Hospital[];
  technicians: Technician[];
  calibrators: CalibratorAsset[];
  marketingList?: MarketingStaff[];
  initialData?: CalibrationSchedule | null;
}

export const ScheduleFormModal: React.FC<ScheduleFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  hospitals = [],
  technicians = [],
  calibrators = [],
  marketingList = [],
  initialData
}) => {
  if (!isOpen) return null;

  // Selected Hospital
  const defaultHospital = hospitals[0] || {
    id: 'RS-000',
    hospitalCode: '100',
    name: 'RSUD Dr. Moewardi Surakarta',
    type: 'RSUD' as const,
    address: 'Jl. Kolonel Sutarto No.132, Jebres, Kec. Jebres',
    city: 'Kota Surakarta, Jawa Tengah 57126',
    picName: 'H. Bambang Setiawan, S.ST., M.Kes.',
    picRole: 'Kepala Instalasi Pemeliharaan Sarana RS (IPSRS)',
    picPhone: '0812-2980-4567',
    picEmail: 'ipsrs.moewardi@jatengprov.go.id',
    activeDevicesCount: 32
  };

  const [hospitalId, setHospitalId] = useState(initialData?.hospitalId || '');
  const selectedHospitalObj = useMemo(() => {
    return hospitals.find(h => h.id === hospitalId);
  }, [hospitals, hospitalId]);

  // 7-Digit Calibration Label System States
  // Format: 3-Digit Hospital Code (>= 100) + 4-Digit Sequence (e.g. 1000001, 1000102, 1001879)
  const initialHospCode = initialData?.hospitalCode || (hospitalId ? getHospitalCode(hospitalId, hospitals) : '');
  const [hospitalCode, setHospitalCode] = useState(initialHospCode || '');
  const [startSequence, setStartSequence] = useState<number>(initialData?.labelSequenceStart || 1);

  // Form Fields
  const [hospitalName, setHospitalName] = useState(initialData?.hospitalName || '');
  const [hospitalAddress, setHospitalAddress] = useState(initialData?.hospitalAddress || '');
  const [hospitalCity, setHospitalCity] = useState(initialData?.hospitalCity || '');
  
  const [scheduledDate, setScheduledDate] = useState(initialData?.scheduledDate || TODAY_STR);
  const [endDate, setEndDate] = useState(initialData?.endDate || initialData?.scheduledDate || TODAY_STR);
  
  const [leadTechId, setLeadTechId] = useState(initialData?.leadTechnicianId || '');
  const [selectedSupportIds, setSelectedSupportIds] = useState<string[]>(initialData?.supportTechnicianIds || []);
  const [selectedCalibratorIds, setSelectedCalibratorIds] = useState<string[]>(
    initialData?.assignedCalibratorIds || []
  );

  const [contractValue, setContractValue] = useState(initialData ? String(initialData.contractValue) : '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  
  const [marketingName, setMarketingName] = useState(initialData?.marketingName || '');
  const [approvedByName, setApprovedByName] = useState(initialData?.approvedByName || 'Hafizh Pasifianto Utomo S.Tr,T');
  const [approvedByRole, setApprovedByRole] = useState(initialData?.approvedByRole || 'Manajer Teknik');
  
  const [workOrderNumber, setWorkOrderNumber] = useState(initialData?.workOrderNumber || '');
  const [bapNumber, setBapNumber] = useState(initialData?.bapNumber || '');
  const [poContractNumber, setPoContractNumber] = useState(initialData?.poContractNumber || '');
  const [poDate, setPoDate] = useState(initialData?.poDate || '');

  // Tera SMK (Tahap 3.3a, PRD F2.1–F2.2): mode sertifikat & rentang label cadangan.
  // Disimpan sebagai kunci JSON baru di jadwal; modul lama mengabaikannya. Bawaan = Manual (alur lama).
  const [modeSertifikat, setModeSertifikat] = useState<'tera' | 'manual_drive'>(
    initialData?.modeSertifikat === 'tera' ? 'tera' : 'manual_drive'
  );
  const urutDariLabel = (l?: string) => (l && /^[0-9]{3}\.[0-9]{4}$/.test(l) ? String(parseInt(l.slice(4), 10)) : '');
  const [cadAwal, setCadAwal] = useState(urutDariLabel(initialData?.labelCadanganAwal));
  const [cadAkhir, setCadAkhir] = useState(urutDariLabel(initialData?.labelCadanganAkhir));
  const [usulanCadangan, setUsulanCadangan] = useState<
    { status: 'memuat' | 'ada' | 'kosong' | 'gagal'; awal?: string; akhir?: string; jumlah?: number; bolong?: number } | null
  >(null);
  const [tampilSalahCadangan, setTampilSalahCadangan] = useState(false);

  // Medical devices list with quantity
  const [devices, setDevices] = useState<MedicalDeviceToCalibrate[]>(
    initialData?.targetDevices || []
  );

  // Auto update hospital PIC defaults when hospital select changes
  const handleHospitalChange = (newHospId: string) => {
    setHospitalId(newHospId);
    const targetHosp = hospitals.find(h => h.id === newHospId);
    if (targetHosp) {
      setHospitalName(targetHosp.name);
      setHospitalAddress(targetHosp.address);
      setHospitalCity(targetHosp.city);
      const code = targetHosp.hospitalCode || getHospitalCode(targetHosp.id, hospitals);
      setHospitalCode(code);
      setPoContractNumber(`PO-${targetHosp.name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase()}-2026`);
    }
  };

  const handleAddDeviceRow = () => {
    const newId = `dev-${Date.now().toString().slice(-4)}`;
    setDevices([
      ...devices,
      {
        id: newId,
        name: '',
        quantity: '' as any,
        room: '',
        brandModel: '',
        serialNumber: '',
        status: 'Pending'
      }
    ]);
  };

  const handleRemoveDeviceRow = (id: string) => {
    if (devices.length <= 1) return;
    setDevices(devices.filter(d => d.id !== id));
  };

  const handleDeviceChange = (id: string, field: keyof MedicalDeviceToCalibrate, val: any) => {
    setDevices(devices.map(d => {
      if (d.id === id) {
        return { ...d, [field]: val };
      }
      return d;
    }));
  };

  const toggleSupportTech = (techId: string) => {
    if (selectedSupportIds.includes(techId)) {
      setSelectedSupportIds(selectedSupportIds.filter(id => id !== techId));
    } else {
      setSelectedSupportIds([...selectedSupportIds, techId]);
    }
  };

  const toggleCalibrator = (calId: string) => {
    if (selectedCalibratorIds.includes(calId)) {
      setSelectedCalibratorIds(selectedCalibratorIds.filter(id => id !== calId));
    } else {
      setSelectedCalibratorIds([...selectedCalibratorIds, calId]);
    }
  };

  // Calculate totals and 7-digit label ranges
  const totalDeviceUnits = Math.max(1, devices.reduce((sum, d) => sum + (Number(d.quantity) || 0), 0));
  const labelRangeInfo = useMemo(() => {
    return calculateLabelRange(hospitalCode, startSequence, totalDeviceUnits);
  }, [hospitalCode, startSequence, totalDeviceUnits]);

  // Devices with auto-assigned 7-digit labels
  const labeledDevices = useMemo(() => {
    return assignDeviceLabels(devices, hospitalCode, startSequence);
  }, [devices, hospitalCode, startSequence]);

  // Label utama yang benar-benar tersimpan: jadwal transisi memakai label ketikan admin (lihat handleSaveSchedule)
  const labelAwalEfektif = (initialData?.sumber === 'transisi' ? initialData.labelStart : labelRangeInfo.startLabel) || '';
  const labelAkhirEfektif = (initialData?.sumber === 'transisi' ? initialData.labelEnd : labelRangeInfo.endLabel) || '';
  const boAktif = /^[0-9]{3}\./.test(labelAwalEfektif) ? labelAwalEfektif.slice(0, 3) : '';
  const labelCadangan = (urut: string) => `${boAktif}.${String(parseInt(urut, 10)).padStart(4, '0')}`;

  const salahCadangan = useMemo((): string | null => {
    if (!cadAwal && !cadAkhir) return null;
    if (!cadAwal || !cadAkhir) return 'Isi nomor awal dan akhir, atau kosongkan keduanya.';
    if (!boAktif) return 'Isi Kode Rumah Sakit (3 digit) dulu.';
    const a = parseInt(cadAwal, 10);
    const b = parseInt(cadAkhir, 10);
    if (!(a >= 1) || !(b >= 1) || a > 9999 || b > 9999) return 'Nomor urut 1 sampai 9999.';
    if (a > b) return 'Nomor awal lebih besar dari nomor akhir.';
    const akhirUtama = parseInt(labelAkhirEfektif.slice(4), 10);
    if (Number.isFinite(akhirUtama) && a <= akhirUtama) return `Harus sesudah label utama terakhir (${labelAkhirEfektif}).`;
    return null;
  }, [cadAwal, cadAkhir, boAktif, labelAkhirEfektif]);

  // Usulan otomatis dari stiker "Cadangan Laik Pakai" di BO ini (audit bagian 5); hanya membaca.
  useEffect(() => {
    if (!boAktif) { setUsulanCadangan(null); return; }
    let batal = false;
    setUsulanCadangan({ status: 'memuat' });
    const t = window.setTimeout(async () => {
      try {
        const res = await apiFetch(`/api/tera/usulan-cadangan?bo=${boAktif}`, { retries: 0, timeoutMs: 10000 });
        const isi = await res.json().catch(() => null);
        if (batal) return;
        if (!res.ok || !isi) { setUsulanCadangan({ status: 'gagal' }); return; }
        setUsulanCadangan(isi.ada ? { status: 'ada', awal: isi.awal, akhir: isi.akhir, jumlah: isi.jumlah, bolong: isi.bolong } : { status: 'kosong' });
      } catch {
        if (!batal) setUsulanCadangan({ status: 'gagal' });
      }
    }, 400);
    return () => { batal = true; window.clearTimeout(t); };
  }, [boAktif]);

  const selectedLeadTech = technicians.find(t => t.id === leadTechId) || technicians[0] || {
    id: 'TECH-001',
    name: 'Shifa Zalza Billa',
    strNumber: 'STR-TEM-2023-0101',
    specialization: 'Alat Terapi & Bedah'
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (salahCadangan) {
      setTampilSalahCadangan(true);
      document.getElementById('tera-cadangan-awal')?.focus();
      return;
    }
    const cadanganLengkap = !!(cadAwal && cadAkhir && boAktif);

    const supportTechNames = technicians
      .filter(t => selectedSupportIds.includes(t.id))
      .map(t => t.name);

    const calibratorNames = calibrators
      .filter(c => selectedCalibratorIds.includes(c.id))
      .map(c => `${c.code} - ${c.name.slice(0, 24)}`);

    const safeBap = bapNumber || initialData?.bapNumber || '021/SMK/BAP/VIII/2026';
    const safeBastp = initialData?.bastpNumber || safeBap.replace('BAP', 'BASTP');

    const savedSchedule: CalibrationSchedule = {
      id: initialData?.id || `SCH-${Date.now().toString().slice(-6)}`,
      workOrderNumber: workOrderNumber || initialData?.workOrderNumber || `WO/KAL/2026/${Math.floor(100 + Math.random() * 900)}`,
      bapNumber: safeBap,
      bastpNumber: safeBastp,
      poContractNumber: poContractNumber || initialData?.poContractNumber || '',
      poDate: poDate || initialData?.poDate || '',
      hospitalId: hospitalId || selectedHospitalObj?.id || initialData?.hospitalId || `HOSP-${Date.now()}`,
      hospitalCode: hospitalCode || initialData?.hospitalCode || '100',
      hospitalName: hospitalName || selectedHospitalObj?.name || initialData?.hospitalName || 'Rumah Sakit',
      hospitalAddress: hospitalAddress || selectedHospitalObj?.address || initialData?.hospitalAddress || '',
      hospitalCity: hospitalCity || selectedHospitalObj?.city || initialData?.hospitalCity || 'Surakarta',
      hospitalPic: selectedHospitalObj?.picName || initialData?.hospitalPic || 'Kepala IPSRS / ATEM',
      hospitalPicRole: 'Kepala IPSRS / ATEM',
      hospitalPhone: selectedHospitalObj?.picPhone || initialData?.hospitalPhone || '-',
      marketingName: marketingName || initialData?.marketingName || '',
      labelStart: labelRangeInfo.startLabel,
      labelEnd: labelRangeInfo.endLabel,
      labelRange: labelRangeInfo.displayRange,
      labelSequenceStart: startSequence,
      approvedByName: (approvedByName && approvedByName.trim()) ? approvedByName.trim() : 'Hafizh Pasifianto Utomo S.Tr,T',
      approvedByRole: (approvedByRole && approvedByRole.trim()) ? approvedByRole.trim() : 'Manajer Teknik',
      scheduledDate: scheduledDate || TODAY_STR,
      endDate: endDate || scheduledDate || TODAY_STR,
      leadTechnicianId: selectedLeadTech?.id || 'TECH-001',
      leadTechnicianName: selectedLeadTech?.name || 'Shifa Zalza Billa',
      supportTechnicianIds: selectedSupportIds,
      supportTechnicianNames: supportTechNames,
      targetDevices: labeledDevices,
      assignedCalibratorIds: selectedCalibratorIds,
      assignedCalibratorNames: calibratorNames,
      priority: initialData?.priority || 'Tinggi',
      status: (initialData?.status as any) || 'Dijadwalkan',
      estimatedHours: totalDeviceUnits * 2,
      contractValue: Number(contractValue.replace(/\./g, '')) || (initialData?.contractValue) || 35000000,
      notes,
      progressPercent: initialData?.progressPercent || 0,
      createdAt: initialData?.createdAt || TODAY_STR,
      remindersSentCount: initialData?.remindersSentCount || 0,
      modeSertifikat,
      labelCadanganAwal: cadanganLengkap ? labelCadangan(cadAwal) : undefined,
      labelCadanganAkhir: cadanganLengkap ? labelCadangan(cadAkhir) : undefined
    };

    onSave(savedSchedule);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
      <form 
        onSubmit={handleSubmit} 
        className="bg-white text-slate-800 rounded-2xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl border border-[#DCDFE3] my-6 max-h-[92vh] flex flex-col justify-between"
      >
        {/* Modal Header - Flux Theme */}
        <div className="flex items-center justify-between pb-4 border-b border-[#DCDFE3] shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-[#1C658C]/10 text-[#1C658C] text-[10px] font-bold font-mono border border-[#1C658C]/30">
                PENJADWALAN KALIBRASI RS
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-xs text-slate-500 font-medium">PT. SARANA MULTI KALIBRASI</span>
            </div>
            <h2 className="text-lg font-bold text-[#1C658C] mt-1">
              {initialData ? 'Edit Jadwal & Penomoran Label RS' : 'Tambah Jadwal Kalibrasi RS & Generate Nomor Label'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-[#EEEEEE] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto py-4 space-y-4 text-xs pr-1.5 custom-scrollbar">
          
          {/* SECTION: LABEL NUMBERING HIGHLIGHT WITH DOT NOTATION */}
          <div className="p-3.5 bg-[#EEEEEE]/50 rounded-xl border-2 border-[#1C658C] space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[#1C658C] text-xs flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-[#1C658C]" />
                <span>Sistem Penomoran Label Kalibrasi RS (Format: Kode RS . Nomor Urut)</span>
              </h3>
              <span className="bg-[#1C658C] text-white px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                TERSTRUKTUR & URUT
              </span>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed">
              Format Standar Label: <strong>Kode RS (3 Digit)</strong> + <strong>.</strong> + <strong>Nomor Urut Label (4 Digit)</strong> → Contoh: <strong className="text-[#1C658C]">{labelRangeInfo.startLabel || '062.0001'}</strong>.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Kode Rumah Sakit (3 Digit) *
                </label>
                <div className="flex items-center gap-1 bg-white border border-[#DCDFE3] rounded-xl px-3 py-2 focus-within:border-[#1C658C]">
                  <Hash className="w-3.5 h-3.5 text-[#1C658C] shrink-0" />
                  <input
                    type="text"
                    required
                    maxLength={3}
                    value={hospitalCode}
                    onChange={(e) => setHospitalCode(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full bg-transparent text-slate-900 font-mono font-bold text-xs focus:outline-none"
                    placeholder="062"
                  />
                  <span className="text-[10px] text-slate-400 font-semibold">e.g. 062</span>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Nomor Urut Awal Label *
                </label>
                <div className="flex items-center gap-1 bg-white border border-[#DCDFE3] rounded-xl px-3 py-2 focus-within:border-[#1C658C]">
                  <span className="text-[10px] text-slate-400 font-mono">#</span>
                  <input
                    type="number"
                    min={1}
                    required
                    value={startSequence === 0 || !startSequence ? '' : startSequence}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/^0+(?=\d)/, '');
                      setStartSequence(raw === '' ? ('' as any) : parseInt(raw, 10));
                    }}
                    onBlur={() => {
                      if (!startSequence || Number(startSequence) < 1) {
                        setStartSequence(1);
                      }
                    }}
                    className="w-full bg-transparent text-slate-900 font-mono font-bold text-xs focus:outline-none"
                    placeholder="1"
                  />
                  <span className="text-[10px] text-slate-400 font-semibold">e.g. 1</span>
                </div>
              </div>

              <div>
                <label className="font-semibold text-[#1C658C] block mb-1">
                  Rentang Label Tergenerate:
                </label>
                <div className="bg-[#1C658C] text-white rounded-xl px-3 py-2 font-mono font-bold text-xs flex items-center justify-between shadow-xs">
                  <span>{labelRangeInfo.displayRange}</span>
                  <span className="text-[10px] text-[#DCDFE3]">({totalDeviceUnits} Unit)</span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION TERA SMK: mode sertifikat & label cadangan (Tahap 3.3a) */}
          <div className="p-3.5 bg-white rounded-xl border border-[#DCDFE3] space-y-3 shadow-xs">
            <h3 className="font-bold text-[#1C658C] text-xs flex items-center gap-1.5">
              <Smartphone className="w-4 h-4" />
              <span>Sertifikat & Label Cadangan (Tera SMK)</span>
            </h3>

            <fieldset>
              <legend className="font-semibold text-slate-700 block mb-1.5">Mode sertifikat untuk jadwal ini</legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {([
                  { nilai: 'manual_drive', judul: 'Manual link Google Drive', ket: 'Cara lama: sertifikat diunggah & ditautkan manual.' },
                  { nilai: 'tera', judul: 'Terintegrasi Tera SMK', ket: 'LKK diisi di tablet, sertifikat terbit otomatis. Bisa di-Push ke Tera SMK.' }
                ] as const).map((m) => (
                  <label
                    key={m.nilai}
                    className={`p-2.5 rounded-xl border flex items-start gap-2 cursor-pointer transition-colors ${
                      modeSertifikat === m.nilai
                        ? 'bg-[#1C658C]/10 border-[#1C658C] text-[#1C658C]'
                        : 'bg-[#EEEEEE]/30 border-[#DCDFE3] text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <input
                      type="radio"
                      name="modeSertifikat"
                      value={m.nilai}
                      checked={modeSertifikat === m.nilai}
                      onChange={() => setModeSertifikat(m.nilai)}
                      className="mt-0.5 text-[#1C658C] focus:ring-[#1C658C]"
                    />
                    <span>
                      <span className="block text-[11px] font-bold">{m.judul}</span>
                      <span className="block text-[10px] text-slate-500 font-normal">{m.ket}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <p className="font-semibold text-slate-700 mb-1">Rentang label cadangan (untuk alat tambahan di luar PO)</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div>
                  <label htmlFor="tera-cadangan-awal" className="text-[10px] text-slate-500 block mb-1">Nomor urut awal</label>
                  <div className="flex items-center gap-1 bg-white border border-[#DCDFE3] rounded-xl px-3 py-2 focus-within:border-[#1C658C]">
                    <span className="text-[11px] text-slate-500 font-mono">{boAktif || '___'}.</span>
                    <input
                      id="tera-cadangan-awal"
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      value={cadAwal}
                      onChange={(e) => setCadAwal(e.target.value.replace(/[^0-9]/g, ''))}
                      onBlur={() => setTampilSalahCadangan(true)}
                      aria-invalid={tampilSalahCadangan && !!salahCadangan ? true : undefined}
                      aria-describedby="tera-cadangan-pesan"
                      className="w-full bg-transparent text-slate-900 font-mono font-bold text-xs focus:outline-none"
                      placeholder="kosong"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="tera-cadangan-akhir" className="text-[10px] text-slate-500 block mb-1">Nomor urut akhir</label>
                  <div className="flex items-center gap-1 bg-white border border-[#DCDFE3] rounded-xl px-3 py-2 focus-within:border-[#1C658C]">
                    <span className="text-[11px] text-slate-500 font-mono">{boAktif || '___'}.</span>
                    <input
                      id="tera-cadangan-akhir"
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      value={cadAkhir}
                      onChange={(e) => setCadAkhir(e.target.value.replace(/[^0-9]/g, ''))}
                      onBlur={() => setTampilSalahCadangan(true)}
                      aria-invalid={tampilSalahCadangan && !!salahCadangan ? true : undefined}
                      aria-describedby="tera-cadangan-pesan"
                      className="w-full bg-transparent text-slate-900 font-mono font-bold text-xs focus:outline-none"
                      placeholder="kosong"
                    />
                  </div>
                </div>
                <div>
                  {(cadAwal || cadAkhir) && (
                    <button
                      type="button"
                      onClick={() => { setCadAwal(''); setCadAkhir(''); setTampilSalahCadangan(false); }}
                      className="px-3 py-2 rounded-xl text-[11px] font-semibold text-slate-600 hover:bg-[#EEEEEE] border border-[#DCDFE3] transition-colors"
                    >
                      Kosongkan cadangan
                    </button>
                  )}
                </div>
              </div>

              <div id="tera-cadangan-pesan" aria-live="polite" className="mt-1.5 space-y-1">
                {tampilSalahCadangan && salahCadangan && (
                  <p className="text-[11px] font-semibold text-rose-700 flex items-start gap-1">
                    <Info className="w-3.5 h-3.5 mt-px shrink-0" />
                    <span>{salahCadangan}</span>
                  </p>
                )}
                {usulanCadangan?.status === 'memuat' && (
                  <p className="text-[10px] text-slate-500">Mencari stiker “Cadangan Laik Pakai” untuk BO {boAktif}…</p>
                )}
                {usulanCadangan?.status === 'ada' && (
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                    <span>
                      Usulan dari stiker “Cadangan Laik Pakai”: <strong className="font-mono text-[#1C658C]">{usulanCadangan.awal} s/d {usulanCadangan.akhir}</strong>
                      {' '}({usulanCadangan.jumlah} stiker{usulanCadangan.bolong ? `, ${usulanCadangan.bolong} nomor di tengahnya sudah tidak berstatus cadangan` : ''})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setCadAwal(String(parseInt(usulanCadangan.awal!.slice(4), 10)));
                        setCadAkhir(String(parseInt(usulanCadangan.akhir!.slice(4), 10)));
                        setTampilSalahCadangan(true);
                      }}
                      className="text-[#1C658C] font-bold bg-[#1C658C]/10 border border-[#1C658C]/30 px-2 py-1 rounded-lg hover:bg-[#1C658C]/20 transition-colors"
                    >
                      Pakai usulan
                    </button>
                  </div>
                )}
                {usulanCadangan?.status === 'kosong' && (
                  <p className="text-[10px] text-slate-500">Belum ada stiker “Cadangan Laik Pakai” untuk BO {boAktif}. Isi manual bila perlu, atau biarkan kosong.</p>
                )}
                {usulanCadangan?.status === 'gagal' && (
                  <p className="text-[10px] text-slate-500">Usulan otomatis belum bisa dimuat. Isian manual tetap bisa dipakai.</p>
                )}
              </div>
            </div>
          </div>

          {/* Section 1: RS, Marketing, & Priority */}
          <div className="p-3.5 bg-white rounded-xl border border-[#DCDFE3] space-y-3 shadow-xs">
            <h3 className="font-bold text-[#1C658C] text-xs flex items-center gap-1.5">
              <Building2 className="w-4 h-4" />
              <span>Informasi Klien Rumah Sakit & Pemasaran</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama Rumah Sakit / Klien *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: RS Unim Islam YAKSSI Gemolong"
                  value={hospitalName}
                  onChange={(e) => setHospitalName(e.target.value)}
                  className="w-full p-2.5 bg-[#EEEEEE]/50 border border-[#DCDFE3] rounded-xl text-slate-900 font-semibold focus:outline-none focus:border-[#1C658C]"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Staf Marketing / Pemasaran</label>
                <input
                  type="text"
                  placeholder="Nama staf marketing"
                  value={marketingName}
                  onChange={(e) => setMarketingName(e.target.value)}
                  className="w-full p-2.5 bg-[#EEEEEE]/50 border border-[#DCDFE3] rounded-xl text-slate-900 focus:outline-none focus:border-[#1C658C]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Kota / Kabupaten RS *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kab. Sragen / Kota Surakarta"
                  value={hospitalCity}
                  onChange={(e) => setHospitalCity(e.target.value)}
                  className="w-full p-2.5 bg-[#EEEEEE]/50 border border-[#DCDFE3] rounded-xl text-slate-900 focus:outline-none focus:border-[#1C658C]"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nomor BO / Work Order</label>
                <input
                  type="text"
                  value={workOrderNumber}
                  onChange={(e) => setWorkOrderNumber(e.target.value)}
                  className="w-full p-2.5 bg-[#EEEEEE]/50 border border-[#DCDFE3] rounded-xl text-[#1C658C] font-mono font-bold focus:outline-none focus:border-[#1C658C]"
                />
              </div>
            </div>

            {/* ALAMAT LENGKAP RUMAH SAKIT */}
            <div className="pt-2 border-t border-[#DCDFE3]/60">
              <label className="font-semibold text-slate-700 block mb-1">
                ALAMAT LENGKAP RUMAH SAKIT (Wajib untuk Dokumen Resmi)
              </label>
              <textarea
                rows={2}
                placeholder="Jl. Kolonel Sutarto No.132, Jebres, Surakarta"
                value={hospitalAddress}
                onChange={(e) => setHospitalAddress(e.target.value)}
                className="w-full p-2.5 bg-[#EEEEEE]/50 border border-[#DCDFE3] rounded-xl text-slate-900 text-xs focus:outline-none focus:border-[#1C658C]"
              />
            </div>
          </div>

          {/* Section 2: Jadwal & Nilai Kontrak */}
          <div className="p-3.5 bg-white rounded-xl border border-[#DCDFE3] space-y-3 shadow-xs">
            <h3 className="font-bold text-[#1C658C] text-xs flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <span>Jadwal Pelaksanaan & Nilai Kontrak</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tanggal Mulai Pelaksanaan</label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full p-2.5 bg-[#EEEEEE]/50 border border-[#DCDFE3] rounded-xl text-slate-900 font-mono focus:outline-none focus:border-[#1C658C]"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tanggal Selesai Pelaksanaan</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full p-2.5 bg-[#EEEEEE]/50 border border-[#DCDFE3] rounded-xl text-slate-900 font-mono focus:outline-none focus:border-[#1C658C]"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nilai Kontrak Jasa Kalibrasi (Rp)</label>
                <input
                  type="text"
                  placeholder="35000000"
                  value={contractValue === '0' ? '' : contractValue}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/^0+(?=\d)/, '');
                    setContractValue(raw);
                  }}
                  className="w-full p-2.5 bg-[#EEEEEE]/50 border border-[#DCDFE3] rounded-xl text-[#1C658C] font-bold font-mono focus:outline-none focus:border-[#1C658C]"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Alokasi Teknisi (11 Teknisi Elektromedis PT SMK) */}
          <div className="p-3.5 bg-white rounded-xl border border-[#DCDFE3] space-y-3 shadow-xs">
            <h3 className="font-bold text-[#1C658C] text-xs flex items-center gap-1.5">
              <UserCheck className="w-4 h-4" />
              <span>Penanggung Jawab Lapangan & Tim Teknisi (11 Personil Ber-STR)</span>
            </h3>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Penanggung Jawab Lapangan (Lead Teknisi Utama) *
              </label>
              <select
                value={leadTechId}
                onChange={(e) => setLeadTechId(e.target.value)}
                className="w-full p-2.5 bg-white border-2 border-[#1C658C] rounded-xl text-[#1C658C] font-bold focus:outline-none"
              >
                {technicians.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} [{t.status}]
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1.5">
                Teknisi Pendamping / Tim Lapangan Tambahan:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {technicians.filter(t => t.id !== leadTechId).map(tech => (
                  <label
                    key={tech.id}
                    className={`p-2 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                      selectedSupportIds.includes(tech.id)
                        ? 'bg-[#1C658C]/10 border-[#1C658C] text-[#1C658C] font-semibold'
                        : 'bg-[#EEEEEE]/30 border-[#DCDFE3] text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedSupportIds.includes(tech.id)}
                      onChange={() => toggleSupportTech(tech.id)}
                      className="rounded text-[#1C658C] focus:ring-[#1C658C]"
                    />
                    <div className="truncate">
                      <p className="truncate text-[11px] font-medium">{tech.name}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Section 4: Assigned Calibrator Master Tools */}
          <div className="p-3.5 bg-white rounded-xl border border-[#DCDFE3] space-y-3 shadow-xs">
            <h3 className="font-bold text-[#1C658C] text-xs flex items-center gap-1.5">
              <Wrench className="w-4 h-4" />
              <span>Pilih Alat Kalibrator Standar yang Dibawa ke Lapangan:</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {calibrators.map(cal => (
                <label
                  key={cal.id}
                  className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                    selectedCalibratorIds.includes(cal.id)
                      ? 'bg-[#398AB9]/10 border-[#398AB9] text-[#1C658C] font-semibold'
                      : 'bg-[#EEEEEE]/30 border-[#DCDFE3] text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedCalibratorIds.includes(cal.id)}
                    onChange={() => toggleCalibrator(cal.id)}
                    className="rounded text-[#1C658C] focus:ring-[#1C658C]"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-bold">{cal.code} - {cal.name}</p>
                    <p className="text-[10px] text-slate-400">{cal.brand} {cal.model ? `(${cal.model})` : ''} • Uji s/d: {cal.nextCalibrationDueDate}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Section 5: Target Medical Equipment Editor (With 7-Digit Label Assignment) */}
          <div className="p-3.5 bg-white rounded-xl border border-[#DCDFE3] space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-[#1C658C] text-xs flex items-center gap-1.5">
                  <Layers className="w-4 h-4" />
                  <span>Daftar Alat RS & Alokasi Nomor Label 7-Digit ({totalDeviceUnits} Unit)</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Setiap alat menerima nomor label kalibrasi berurutan otomatis sesuai format RS.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddDeviceRow}
                className="text-[#1C658C] hover:text-[#144966] font-bold text-xs flex items-center gap-1 bg-[#1C658C]/10 border border-[#1C658C]/30 px-2.5 py-1.5 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Tambah Alat Medis</span>
              </button>
            </div>

            <div className="space-y-2">
              {devices.map((device, idx) => (
                <div key={device.id} className="grid grid-cols-12 gap-2 p-2.5 bg-[#EEEEEE]/40 rounded-xl border border-[#DCDFE3] items-center">
                  <div className="col-span-1 text-center font-bold text-[#1C658C] text-[11px]">
                    #{idx + 1}
                  </div>
                  
                  <div className="col-span-6">
                    <label className="text-[10px] text-slate-500 block">Nama Alat Medis RS</label>
                    <input
                      type="text"
                      placeholder="e.g. Ventilator ICU"
                      value={device.name}
                      onChange={(e) => handleDeviceChange(device.id, 'name', e.target.value)}
                      className="w-full p-1.5 bg-white border border-[#DCDFE3] rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#1C658C]"
                    />
                  </div>

                  <div className="col-span-4">
                    <label className="text-[10px] text-[#1C658C] font-bold block">Qty / Unit</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="1"
                      value={device.quantity === 0 || !device.quantity ? '' : device.quantity}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/^0+(?=\d)/, '');
                        const val = raw === '' ? ('' as any) : parseInt(raw, 10);
                        handleDeviceChange(device.id, 'quantity', val);
                      }}
                      onBlur={() => {
                        if (!device.quantity || Number(device.quantity) < 1) {
                          handleDeviceChange(device.id, 'quantity', 1);
                        }
                      }}
                      className="w-full p-1.5 bg-white border border-[#398AB9] rounded-lg text-xs text-[#1C658C] font-bold font-mono text-center focus:outline-none"
                    />
                  </div>

                  <div className="col-span-1 text-right pt-3">
                    <button
                      type="button"
                      onClick={() => handleRemoveDeviceRow(device.id)}
                      disabled={devices.length <= 1}
                      className="text-slate-400 hover:text-rose-600 disabled:opacity-20 p-1 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 6: Approval / Otorisasi */}
          <div className="p-3.5 bg-white rounded-xl border border-[#DCDFE3] space-y-3 shadow-xs">
            <h3 className="font-bold text-[#1C658C] text-xs flex items-center gap-1.5">
              <FileCheck className="w-4 h-4" />
              <span>Otorisasi Resmi Manajer Teknik (TTD MT)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama Manajer Teknik (MT):</label>
                <input
                  type="text"
                  value={approvedByName}
                  onChange={(e) => setApprovedByName(e.target.value)}
                  className="w-full p-2.5 bg-[#EEEEEE]/50 border border-[#DCDFE3] rounded-xl text-slate-900 font-medium focus:outline-none focus:border-[#1C658C]"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Jabatan Otorisasi Teknis:</label>
                <input
                  type="text"
                  value={approvedByRole}
                  onChange={(e) => setApprovedByRole(e.target.value)}
                  className="w-full p-2.5 bg-[#EEEEEE]/50 border border-[#DCDFE3] rounded-xl text-slate-900 font-medium focus:outline-none focus:border-[#1C658C]"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Catatan Tambahan Pelaksanaan:</label>
              <textarea
                rows={2}
                placeholder="Catatan koordinasi keselamatan, izin isolasi, atau instruksi kerja..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-2.5 bg-[#EEEEEE]/50 border border-[#DCDFE3] rounded-xl text-slate-900 focus:outline-none focus:border-[#1C658C]"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-4 border-t border-[#DCDFE3] flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-[#EEEEEE] border border-[#DCDFE3] transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            className="bg-[#1C658C] hover:bg-[#398AB9] text-white px-6 py-2 rounded-xl text-xs font-bold shadow-md transition-all"
          >
            {initialData ? 'Simpan Perubahan Jadwal & Label' : 'Terbitkan Jadwal RS & Nomor Label'}
          </button>
        </div>
      </form>
    </div>
  );
};
