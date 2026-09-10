// src/components/settings/TrustedDevices.tsx
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  Smartphone, 
  ShieldCheck, 
  Check, 
  Trash2, 
  Edit3, 
  X, 
  AlertTriangle, 
  Loader2, 
  Clock, 
  ShieldAlert 
} from "lucide-react";

export function TrustedDevices() {
  const qc = useQueryClient();

  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);
  const [editName, setEditName] = useState<string>("");

  const devicesQuery = useQuery({
    queryKey: ["paired-devices"],
    queryFn: () => fetch("/api/auth/devices").then(res => res.json())
  });

  const approveDevice = useMutation({
    mutationFn: (requestId: string) => fetch("/api/auth/approve-device", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId })
    }).then(res => res.json()),
    onSuccess: () => {
      toast.success("Device Approved & Token Granted! 🛡️");
      qc.invalidateQueries({ queryKey: ["paired-devices"] });
    }
  });

  const renameDevice = useMutation({
    mutationFn: ({ id, deviceName }: { id: string; deviceName: string }) => fetch(`/api/auth/devices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceName })
    }).then(res => res.json()),
    onSuccess: () => {
      toast.success("Device renamed successfully!");
      setEditingDeviceId(null);
      setEditName("");
      qc.invalidateQueries({ queryKey: ["paired-devices"] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to rename device")
  });

  const revokeDevice = useMutation({
    mutationFn: (deviceId: string) => fetch(`/api/auth/devices/${deviceId}`, {
      method: "DELETE"
    }).then(res => res.json()),
    onSuccess: () => {
      toast.success("Device Access Revoked");
      qc.invalidateQueries({ queryKey: ["paired-devices"] });
    }
  });

  const trusted = Array.isArray(devicesQuery.data?.trusted) ? devicesQuery.data.trusted : [];
  const pending = Array.isArray(devicesQuery.data?.pending) ? devicesQuery.data.pending : [];

  const handleStartRename = (device: any) => {
    setEditingDeviceId(device.id);
    setEditName(device.device_name);
  };

  const handleSaveRename = (id: string) => {
    if (!editName.trim()) {
      toast.error("Device name cannot be empty");
      return;
    }
    renameDevice.mutate({ id, deviceName: editName.trim() });
  };

  // Calculate days remaining before 5-day expiration
  const getExpirationStatus = (lastActiveDateStr: string) => {
    const lastActive = new Date(lastActiveDateStr || Date.now()).getTime();
    const now = Date.now();
    const elapsedDays = (now - lastActive) / (1000 * 60 * 60 * 24);
    const daysRemaining = Math.max(0, 5 - elapsedDays);

    if (daysRemaining <= 1) {
      const hoursRemaining = Math.max(1, Math.round(daysRemaining * 24));
      return {
        label: `Expires in ~${hoursRemaining}h`,
        color: "bg-rose-50 text-rose-700 border-rose-200",
        isUrgent: true
      };
    } else if (daysRemaining <= 2) {
      return {
        label: `Expires in ${Math.ceil(daysRemaining)} days`,
        color: "bg-amber-50 text-amber-700 border-amber-200",
        isUrgent: false
      };
    } else {
      return {
        label: `Active • ${Math.ceil(daysRemaining)}d left`,
        color: "bg-emerald-50 text-emerald-700 border-emerald-200",
        isUrgent: false
      };
    }
  };

  return (
    <section className="rounded-3xl sm:rounded-[3rem] border-2 sm:border-4 border-slate-50 bg-white p-5 sm:p-8 shadow-sm space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <Smartphone className="size-5" />
          </div>
          <div>
            <h2 className="font-display text-base sm:text-lg font-black uppercase italic tracking-tight text-slate-900">
              Trusted Devices & Pairing
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Zero-Trust Local Access • Auto-revokes after 5 days of inactivity
            </p>
          </div>
        </div>

        {/* 5-Day Policy Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-500 border border-slate-200">
          <Clock size={13} className="text-slate-400" /> 5-Day Auto-Revoke
        </div>
      </div>

      {/* 1. Pending Pairing Requests */}
      {pending.length > 0 && (
        <div className="bg-amber-50/80 border-2 border-amber-200 rounded-2xl p-4 sm:p-5 space-y-3 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-800 flex items-center gap-1.5">
              <AlertTriangle size={14} className="text-amber-600" /> Pending Device Pairing Requests ({pending.length})
            </span>
          </div>

          <div className="space-y-2">
            {pending.map((p: any) => (
              <div key={p.id} className="bg-white p-3 sm:p-4 rounded-xl border border-amber-200 flex items-center justify-between gap-3 shadow-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-sm text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200">
                      {p.pairing_code}
                    </span>
                    <p className="text-xs font-black uppercase text-slate-800">{p.device_name}</p>
                  </div>
                  <p className="text-[9px] text-slate-400 font-bold mt-0.5">IP: {p.ip_address}</p>
                </div>

                <button
                  onClick={() => approveDevice.mutate(p.id)}
                  disabled={approveDevice.isPending}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 active:scale-95 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer min-h-[40px]"
                >
                  <Check size={14} /> Approve
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Active Trusted Devices List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Authorized Devices ({trusted.length})
          </span>
          <span className="text-[9px] font-bold text-slate-400 uppercase">
            Must connect every 5 days to stay authorized
          </span>
        </div>

        {trusted.length === 0 ? (
          <p className="text-xs font-bold text-slate-400 uppercase py-4 text-center">No paired devices recorded yet</p>
        ) : (
          <div className="divide-y divide-slate-100 bg-slate-50 rounded-2xl p-2 border border-slate-100 max-h-[320px] overflow-y-auto scrollbar-thin">
            {trusted.map((d: any) => {
              const isEditingThis = editingDeviceId === d.id;
              const expiration = getExpirationStatus(d.last_active || d.created_at);

              return (
                <div key={d.id} className="p-3 flex items-center justify-between gap-3 flex-wrap">
                  {isEditingThis ? (
                    <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                      <input
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        placeholder="e.g. Kitchen Wall Tablet, Dad's Phone"
                        className="p-2 text-xs font-black uppercase bg-white border-2 border-indigo-500 rounded-xl outline-none flex-1 min-h-[38px]"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveRename(d.id)}
                        disabled={renameDevice.isPending}
                        className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-xl shadow-xs transition-all cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
                        title="Save Name"
                      >
                        {renameDevice.isPending ? <Loader2 className="animate-spin size-4" /> : <Check size={16} />}
                      </button>
                      <button
                        onClick={() => { setEditingDeviceId(null); setEditName(""); }}
                        className="p-2 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-xl transition-all cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
                        title="Cancel"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs font-black uppercase text-slate-800 truncate">{d.device_name}</p>
                        
                        {/* 5-Day Expiration Badge */}
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${expiration.color}`}>
                          {expiration.label}
                        </span>

                        <button
                          onClick={() => handleStartRename(d)}
                          className="p-1 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                          title="Rename Device"
                        >
                          <Edit3 size={13} />
                        </button>
                      </div>
                      <p className="text-[9px] font-bold text-slate-400 mt-0.5">
                        Paired by {d.paired_by} • Last active: {new Date(d.last_active || d.created_at).toLocaleDateString()} at {new Date(d.last_active || d.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  )}

                  {!isEditingThis && (
                    <button
                      onClick={() => {
                        if (confirm(`Revoke access for "${d.device_name}"?`)) {
                          revokeDevice.mutate(d.id);
                        }
                      }}
                      className="p-2 bg-white hover:bg-rose-50 hover:text-rose-600 text-slate-400 rounded-xl border border-slate-200 transition-all cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center active:scale-95"
                      title="Revoke Device Access"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

    </section>
  );
}
