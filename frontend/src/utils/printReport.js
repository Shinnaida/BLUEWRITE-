// BLUEWRITE — Print Report Utility
// Opens a print-friendly window for an incident report.

/**
 * Open a print-friendly window for a report.
 * @param {object} report - The report data to print.
 */
export function printReport(report) {
  if (!report) return;

  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (!printWindow) return;

  const officerName = report.officer_name || '—';
  const badgeNumber = report.badge_number || '—';
  // incident_type may hold multiple comma-separated slugs (e.g. "theft,assault").
  const incidentTypeDisplay = String(report.incident_type || '')
    .split(',')
    .map((slug) => slug.trim())
    .filter(Boolean)
    .map((slug) => slug.charAt(0).toUpperCase() + slug.slice(1))
    .join(', ') || '—';

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>Incident Report ${report.report_number || ''}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #111827; margin: 40px; }
          h1 { font-size: 20px; margin-bottom: 4px; }
          .meta { color: #6B7280; font-size: 12px; margin-bottom: 24px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          td { padding: 8px; border: 1px solid #D1D5DB; font-size: 14px; vertical-align: top; }
          td.label { width: 180px; font-weight: bold; background: #F9FAFB; }
          .narrative { white-space: pre-wrap; line-height: 1.6; }
        </style>
      </head>
      <body>
        <h1>BLUEWRITE Incident Report</h1>
        <p class="meta">Report #${report.report_number || '—'} | Status: ${report.status || '—'}</p>
        <table>
          <tr><td class="label">Incident Type</td><td>${incidentTypeDisplay}</td></tr>
          <tr><td class="label">Incident Date</td><td>${report.incident_date || '—'}</td></tr>
          <tr><td class="label">Location</td><td>${report.location || '—'}</td></tr>
          <tr><td class="label">Officer</td><td>${officerName} (${badgeNumber})</td></tr>
        </table>
        <h2>Narrative</h2>
        <p class="narrative">${report.narrative || 'No narrative provided.'}</p>
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}