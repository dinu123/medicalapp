import React, { useContext } from 'react';
import { AppContext } from '../App';
import { UserIcon } from './Icons';

const AuditTrail: React.FC = () => {
    const { auditLogs } = useContext(AppContext);

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex items-center gap-3 mb-6">
                <UserIcon className="w-8 h-8 text-primary" />
                <h1 className="text-3xl font-bold text-foreground">Audit Trail</h1>
            </div>

            <div className="bg-card rounded-xl border border-border overflow-x-auto">
                <table className="w-full text-sm text-left text-foreground">
                    <thead className="text-xs text-muted-foreground uppercase bg-secondary border-b border-border">
                        <tr>
                            <th scope="col" className="px-6 py-3 font-semibold">Timestamp</th>
                            <th scope="col" className="px-6 py-3 font-semibold">User</th>
                            <th scope="col" className="px-6 py-3 font-semibold">Action</th>
                            <th scope="col" className="px-6 py-3 font-semibold">Details</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {auditLogs.map(log => (
                            <tr key={log.id} className="hover:bg-secondary/50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {new Date(log.timestamp).toLocaleString('en-GB')}
                                </td>
                                <td className="px-6 py-4 font-semibold">{log.username}</td>
                                <td className="px-6 py-4">
                                    <span className="px-2 py-1 text-xs font-bold rounded-full bg-primary/10 text-primary">
                                        {log.action.replace(/_/g, ' ')}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-xs">
                                    <pre className="whitespace-pre-wrap font-sans bg-secondary/50 p-2 rounded-md">
                                        {JSON.stringify(log.details, null, 2)}
                                    </pre>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {auditLogs.length === 0 && (
                    <p className="text-center py-12 text-muted-foreground">No actions have been logged yet.</p>
                )}
            </div>
        </div>
    );
};

export default AuditTrail;
