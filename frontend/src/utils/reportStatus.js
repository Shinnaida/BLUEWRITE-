export function calculateReportStatus(draftCount, submittedCount) {
  const normalize = (value) => {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
  };

  const draft = normalize(draftCount);
  const submitted = normalize(submittedCount);
  const total = draft + submitted;
  const percentage = (count) => (total > 0 ? Math.round((count / total) * 100) : 0);

  return {
    draft,
    submitted,
    total,
    draftPercentage: percentage(draft),
    submittedPercentage: percentage(submitted),
  };
}