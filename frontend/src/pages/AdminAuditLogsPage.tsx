import React, { useEffect, useState } from 'react';
import { Activity, Shield, Clock } from 'lucide-react';
import { api } from '../services/api';

export const AdminAuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLogs() {
      try {
        const data = await api.getAuditLogs();
        setLogs(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-100 flex items-center gap-2">
          <Activity className="w-6 h-6 text-purple-400" /> Security Audit & System Logs
        </h1>
        <p className="text-slate-400 text-sm">Real-time action audit trail for user authentication, document processing, and quiz generation.</p>
      </div>

      <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase font-semibold">
            <tr>
              <th className="p-4">Action</th>
              <th className="p-4">Details</th>
              <th className="p-4">User ID</th>
              <th className="p-4 text-right">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-900/40">
                <td className="p-4 font-mono font-bold text-indigo-400">{log.action}</td>
                <td className="p-4 text-slate-300">{log.details}</td>
                <td className="p-4 text-slate-500 font-mono text-[11px]">{log.user_id || 'System'}</td>
                <td className="p-4 text-right text-slate-400 font-mono">{new Date(log.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
