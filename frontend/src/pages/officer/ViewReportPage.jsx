// BLUEWRITE — Officer ViewReportPage
// Dedicated View Report page with realistic fictional demo data (Phase 1.3).

import React, { useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Printer, Pencil } from 'lucide-react';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import PrintableReport from '../../components/reports/PrintableReport';
import { getReport, recordReportPrint } from '../../services/reportService';

function ViewReportPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const [report,setReport]=React.useState(null),[loadError,setLoadError]=React.useState('');
  useEffect(()=>{getReport(id).then(r=>setReport(r.data.data)).catch(()=>setLoadError('Unable to load report.'));},[id]);
  const isAdminView = location.pathname.startsWith('/admin/');
  const shouldPrint = new URLSearchParams(location.search).get('print') === 'true';
  const printReport = async () => { try { await recordReportPrint(report.id); } finally { window.print(); } };

  useEffect(() => {
    if (shouldPrint && report) {
      const printTimer = window.setTimeout(printReport, 250);
      return () => window.clearTimeout(printTimer);
    }
    return undefined;
  }, [report, shouldPrint]);

  if(loadError)return <p className="text-red-700">{loadError}</p>; if(!report)return <p>Loading report...</p>; return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-950">View Report</h2>
          <p className="text-sm text-slate-600">Report #{report.report_number}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} className="mr-2" />
            Back
          </Button>
          <Button variant="secondary" onClick={printReport}>
            <Printer size={16} className="mr-2" />
            Print
          </Button>
          {!isAdminView && report.status === 'Draft' && (
            <Button onClick={() => navigate(`/officer/reports/${report.id}/edit`)}>
              <Pencil size={16} className="mr-2" />
              Edit
            </Button>
          )}
        </div>
      </div>

      {/* Status + summary */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-sm text-slate-600">Status</p>
          <Badge variant={report.status.toLowerCase()}>{report.status}</Badge>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-600">Prepared by</p>
          <p className="text-sm font-medium text-slate-950">
            {report.officer_name}{' '}
            <span className="text-slate-600">({report.badge_number})</span>
          </p>
        </div>
      </div>

      {/* Full printable layout */}
      <PrintableReport report={report} />
    </div>
  );
}

export default ViewReportPage;