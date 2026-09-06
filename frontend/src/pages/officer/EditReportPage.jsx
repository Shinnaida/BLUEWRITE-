// BLUEWRITE — Officer EditReportPage
// Edit incident report page with full form and AI assistant panel (Phase 1.3).

import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../../components/common/Button';
import { ConfirmDialog } from '../../components/common/Modal';
import ReportForm from '../../components/reports/ReportForm';
import { INCIDENT_TYPE_OPTIONS } from '../../utils/constants';
import Toast from '../../components/common/Toast';
import AIReportChat from '../../components/ai/AIReportChat';
import { getReport, updateReport, submitReport } from '../../services/reportService';

function EditReportPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [report,setReport]=React.useState({});
  const [formData, setFormData] = React.useState({});
  const [errors, setErrors] = React.useState({});
  const [formMessage, setFormMessage] = React.useState('');
  const [showSubmitConfirm, setShowSubmitConfirm] = React.useState(false);
  const [saveState, setSaveState] = React.useState('');
  const [toast, setToast] = React.useState({ message: '', type: 'info' });
  const initialData = React.useRef('{}');
  React.useEffect(()=>{getReport(id).then(r=>{setReport(r.data.data);setFormData(r.data.data);initialData.current=JSON.stringify(r.data.data)}).catch(()=>setFormMessage('Unable to load report.'));},[id]);

  React.useEffect(() => {
    if (JSON.stringify(formData) === initialData.current) return undefined;
    setSaveState('Saving draft locally...');
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(`bluewrite:edit-draft:${id}`, JSON.stringify(formData));
      setSaveState(`Draft saved locally at ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [formData, id]);

  React.useEffect(() => {
    const warn = (event) => {
      if (JSON.stringify(formData) !== initialData.current) { event.preventDefault(); event.returnValue = 'You have unsaved changes.'; }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [formData]);
  const validate = (isSubmit) => {
    const nextErrors = {};
    if (!formData.incident_type?.trim()) nextErrors.incident_type = 'Incident type is required.';
    if (!formData.incident_date?.trim()) nextErrors.incident_date = 'Incident date is required.';
    if (!formData.incident_time?.trim() && isSubmit) nextErrors.incident_time = 'Incident time is required.';
    if (!formData.location?.trim()) nextErrors.location = 'Incident location is required.';
    if (isSubmit && (!formData.narrative || formData.narrative.trim().length < 30)) nextErrors.narrative = 'Narrative must be at least 30 characters.';
    setErrors(nextErrors); setFormMessage(Object.keys(nextErrors).length ? 'Please correct the highlighted fields before continuing.' : ''); return Object.keys(nextErrors).length === 0;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-950">Edit Incident Report</h2>
        <p className="text-sm text-slate-600">Update the report details below.</p>
      </div>

      <ReportForm
        formData={formData}
        onChange={(next) => { setFormData(next); setFormMessage(''); }}
        errors={errors}
        incidentTypes={INCIDENT_TYPE_OPTIONS}
      />
      <AIReportChat
        reportId={id}
        reportStatus={report.status}
        reportContext={formData}
        onInsertSuggestion={(draft) => {
          setFormData((current) => ({ ...current, ...draft }));
          setToast({ message: 'AI report draft applied. Review every field before saving.', type: 'success' });
        }}
      />

      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="secondary" onClick={() => navigate('/officer/reports')}>
          Cancel
        </Button>
        <Button variant="secondary" onClick={async () => { if (validate(false)) try{const r=await updateReport(id,formData);setReport(r.data.data);setFormMessage('Draft saved to database.');initialData.current=JSON.stringify(r.data.data)}catch(e){setFormMessage(e.response?.data?.message||'Unable to update report.')} }}>Save as Draft</Button>
        <Button onClick={() => { if (validate(true)) setShowSubmitConfirm(true); }}>Submit Report</Button>
      </div>
      {saveState && <p className="text-right text-xs font-medium text-slate-500">{saveState}</p>}
      {formMessage && <p className="text-right text-sm font-medium text-red-600" role="alert">{formMessage}</p>}
      <ConfirmDialog isOpen={showSubmitConfirm} onClose={() => setShowSubmitConfirm(false)} onConfirm={async()=>{try{await updateReport(id,formData);await submitReport(id);setShowSubmitConfirm(false);navigate('/officer/reports')}catch(e){setShowSubmitConfirm(false);setFormMessage(e.response?.data?.message||'Unable to submit report.')}}} title="Submit Incident Report?" description="Once submitted, this report will be marked as Submitted. Please verify all report information before continuing." confirmLabel="Submit Report" />
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'info' })} />
    </div>
  );
}

export default EditReportPage;