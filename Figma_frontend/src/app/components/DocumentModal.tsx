import { useState } from 'react';
import { X, AlertTriangle, XCircle, ChevronRight } from 'lucide-react';

interface DocumentModalProps {
  onClose: () => void;
}

const issues = [
  { id: 'i1', status: 'warning', location: 'Section 3.2.1', title: 'Audit Trail Requirements', short: 'Gaps in change tracking procedures', regulation: '21 CFR Part 11.10(e)' },
  { id: 'i2', status: 'fail',    location: 'Section 3.3',   title: 'Electronic Audit Trail',      short: 'Audit trails not tamper-evident',          regulation: '21 CFR Part 11.10(e)' },
  { id: 'i3', status: 'warning', location: 'Section 4.1',   title: 'Access Controls',             short: 'Password complexity needs strengthening',  regulation: '21 CFR Part 11.10(d)' },
  { id: 'i4', status: 'fail',    location: 'Section 4.3',   title: 'System Security',             short: 'Insufficient encryption for data at rest', regulation: '21 CFR Part 11.10(c)' },
  { id: 'i5', status: 'warning', location: 'Table 3',       title: 'Numbering Consistency',       short: 'Inconsistent risk ID numbering scheme',    regulation: 'Internal SOP' },
  { id: 'i6', status: 'warning', location: 'Section 5.1',   title: 'ALCOA+ Principles',           short: 'Missing contemporaneous recording',        regulation: 'ALCOA+ / GxP' },
  { id: 'i7', status: 'fail',    location: 'Section 5.4',   title: 'Data Backup Procedures',      short: 'No documented backup/recovery SOP',        regulation: '21 CFR Part 11.10(c)' },
  { id: 'i8', status: 'fail',    location: 'Section 6.3',   title: 'Training Records',            short: 'Missing training requirement documentation',regulation: 'GxP Training' },
  { id: 'i9', status: 'warning', location: 'Section 6.7',   title: 'Change Control Records',      short: 'Incomplete justification for changes',     regulation: 'ICH Q10' },
  { id: 'i10',status: 'warning', location: 'Section 7.2',   title: 'Deviation Handling',          short: 'Escalation procedures need more detail',   regulation: 'ICH Q10' },
];

// Document paragraphs — some contain highlighted spans (flagged text)
const docParagraphs = [
  { id: 'p1', text: null, heading: '1. Introduction & Scope', level: 1 },
  { id: 'p2', segments: [
    { text: 'This Risk Assessment document defines the regulatory and quality framework applicable to electronic systems used in the manufacturing and quality control environment. The scope covers all computerized systems subject to 21 CFR Part 11 requirements.' },
  ]},
  { id: 'p3', segments: [
    { text: 'The assessment has been conducted in accordance with ICH Q9 Quality Risk Management principles and applies to all personnel involved in system operation, maintenance, and oversight.' },
  ]},
  { id: 'p4', text: null, heading: '2. System Overview', level: 1 },
  { id: 'p5', segments: [
    { text: 'The system architecture consists of a centralized data management platform with role-based access control. All electronic records are stored in a validated environment with appropriate security measures in place.' },
  ]},
  { id: 'p6', text: null, heading: '3. Electronic Records & Signatures', level: 1 },
  { id: 'p7', text: null, heading: '3.1 Electronic Signatures', level: 2 },
  { id: 'p8', segments: [
    { text: 'Electronic signatures are implemented using two-factor authentication mechanisms. Each signature event is linked to a unique user ID and timestamp.' },
  ]},
  { id: 'p9', text: null, heading: '3.2.1 Audit Trail Requirements', level: 2 },
  { id: 'p10', issueId: 'i1', segments: [
    { text: 'The system captures user actions at the application layer. Change tracking is implemented for primary data fields. ' },
    { text: 'Secondary metadata fields and inter-system data transfers currently lack complete audit coverage. Review cycles for audit logs are defined but not consistently enforced across all modules.', flagId: 'i1' },
  ]},
  { id: 'p11', text: null, heading: '3.3 Electronic Audit Trail', level: 2 },
  { id: 'p12', issueId: 'i2', segments: [
    { text: 'Audit trail entries are written to a shared database table accessible to database administrators. ' },
    { text: 'The current configuration does not prevent direct modification of audit records at the database level. Tamper-evident controls are not enforced, creating a potential integrity risk for regulatory review.', flagId: 'i2' },
  ]},
  { id: 'p13', text: null, heading: '4. Access & Security Controls', level: 1 },
  { id: 'p14', text: null, heading: '4.1 Access Controls', level: 2 },
  { id: 'p15', issueId: 'i3', segments: [
    { text: 'User authentication is handled via single-factor password-based login. ' },
    { text: 'Current password policy requires a minimum of 6 characters with no complexity requirements. Password expiration is set to 180 days. No multi-factor authentication is implemented for privileged accounts.', flagId: 'i3' },
  ]},
  { id: 'p16', text: null, heading: '4.3 System Security', level: 2 },
  { id: 'p17', issueId: 'i4', segments: [
    { text: 'Data in transit is protected using TLS 1.2. ' },
    { text: 'Data at rest is stored without encryption on the primary application server. Backup storage media is not encrypted, which does not meet industry standards for sensitive pharmaceutical data.', flagId: 'i4' },
  ]},
  { id: 'p18', text: null, heading: 'Table 3 — Risk ID Matrix', level: 2 },
  { id: 'p19', issueId: 'i5', segments: [
    { text: 'Risk identifiers follow a RA-XXX format in most sections. ' },
    { text: 'However, Tables 3 and 4 use an alternate R-XX scheme without explanation. Sub-risks in Section 5 are numbered independently from parent risks, creating cross-reference inconsistencies.', flagId: 'i5' },
  ]},
  { id: 'p20', text: null, heading: '5. Data Integrity', level: 1 },
  { id: 'p21', text: null, heading: '5.1 ALCOA+ Principles', level: 2 },
  { id: 'p22', issueId: 'i6', segments: [
    { text: 'Data attribution is documented for primary records. ' },
    { text: 'Contemporaneous recording requirements are referenced but not enforced procedurally — operators may complete records after the fact without justification. No technical controls prevent retrospective data entry.', flagId: 'i6' },
  ]},
  { id: 'p23', text: null, heading: '5.4 Data Backup Procedures', level: 2 },
  { id: 'p24', issueId: 'i7', segments: [
    { text: 'System backups are performed nightly by the IT department. ' },
    { text: 'No formal backup and recovery SOP exists within the quality system. Recovery time objectives have not been validated. Backup restoration has not been tested in the past 12 months.', flagId: 'i7' },
  ]},
  { id: 'p25', text: null, heading: '6. SOPs & Training', level: 1 },
  { id: 'p26', text: null, heading: '6.3 Training Records', level: 2 },
  { id: 'p27', issueId: 'i8', segments: [
    { text: 'Personnel training is managed through an informal sign-off process. ' },
    { text: 'No training matrix has been developed for this system. Competency assessments are not required prior to system access. Training records are stored in a separate system with no linkage to the QMS.', flagId: 'i8' },
  ]},
  { id: 'p28', text: null, heading: '6.7 Change Control Records', level: 2 },
  { id: 'p29', issueId: 'i9', segments: [
    { text: 'Change requests are logged in the change management system. ' },
    { text: 'Justifications for data modifications are captured at a summary level only. Several records contain only "data correction" as the stated reason, lacking detailed rationale and impact assessments.', flagId: 'i9' },
  ]},
  { id: 'p30', text: null, heading: '7.2 Deviation Handling', level: 2 },
  { id: 'p31', issueId: 'i10', segments: [
    { text: 'Deviations are recorded and assigned to quality personnel for investigation. ' },
    { text: 'Escalation triggers are vaguely defined and subject to individual interpretation. No formal criteria distinguish minor from critical deviations. CAPA initiation timelines are not specified.', flagId: 'i10' },
  ]},
];

export default function DocumentModal({ onClose }: DocumentModalProps) {
  const [activeIssue, setActiveIssue] = useState<string | null>(null);

  const failCount = issues.filter(i => i.status === 'fail').length;
  const warnCount = issues.filter(i => i.status === 'warning').length;

  const scrollToIssue = (id: string) => {
    setActiveIssue(id === activeIssue ? null : id);
    const el = document.getElementById(`doc-issue-${id}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-6xl h-[92vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl bg-white">

        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-3 flex-shrink-0 border-b" style={{ borderColor: '#e9d5ff', background: 'linear-gradient(135deg,#460073,#7500C0)' }}>
          <div className="flex items-center gap-4">
            <span className="text-white font-semibold text-sm">RA-2024-001 — Document Review</span>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ backgroundColor: 'rgba(220,38,38,0.25)', color: '#fca5a5' }}>
                <XCircle className="w-3 h-3" /> {failCount} Fails
              </span>
              <span className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ backgroundColor: 'rgba(245,158,11,0.25)', color: '#fde68a' }}>
                <AlertTriangle className="w-3 h-3" /> {warnCount} Warnings
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">

          {/* Left — Document text */}
          <div className="flex-1 overflow-y-auto px-16 py-10" style={{ backgroundColor: '#f9f9f9' }}>
            <div className="max-w-2xl mx-auto">
              {/* Document title */}
              <div className="mb-8 pb-6 border-b" style={{ borderColor: '#e5e7eb' }}>
                <h1 className="text-2xl font-bold mb-1" style={{ color: '#460073' }}>Risk Assessment Document</h1>
                <p className="text-sm text-gray-500">RA-2024-001 · Version 2.1 · 2024-11-15 · Confidential</p>
              </div>

              {docParagraphs.map((block) => {
                if (block.heading) {
                  return (
                    <div key={block.id} className={block.level === 1 ? 'mt-8 mb-3' : 'mt-5 mb-2'}>
                      {block.level === 1
                        ? <h2 className="text-base font-bold border-b pb-1" style={{ color: '#460073', borderColor: '#e9d5ff' }}>{block.heading}</h2>
                        : <h3 className="text-sm font-semibold" style={{ color: '#7500C0' }}>{block.heading}</h3>
                      }
                    </div>
                  );
                }

                const isActive = activeIssue === block.issueId;
                const issue = block.issueId ? issues.find(i => i.id === block.issueId) : null;

                return (
                  <p
                    key={block.id}
                    id={block.issueId ? `doc-issue-${block.issueId}` : undefined}
                    className="text-sm leading-7 mb-3 text-gray-800"
                    style={{
                      borderRadius: isActive ? '4px' : undefined,
                      outline: isActive ? `2px solid ${issue?.status === 'fail' ? '#dc2626' : '#f59e0b'}` : undefined,
                      padding: isActive ? '4px 6px' : undefined,
                    }}
                  >
                    {block.segments?.map((seg: any, si: number) => {
                      if (!seg.flagId) return <span key={si}>{seg.text}</span>;
                      const segIssue = issues.find(i => i.id === seg.flagId);
                      const isFail = segIssue?.status === 'fail';
                      const isSegActive = activeIssue === seg.flagId;
                      return (
                        <span
                          key={si}
                          onClick={() => scrollToIssue(seg.flagId)}
                          className="cursor-pointer transition-all"
                          style={{
                            backgroundColor: isSegActive
                              ? isFail ? '#fee2e2' : '#fef3c7'
                              : isFail ? '#fff1f1' : '#fffbeb',
                            borderBottom: `2px ${isFail ? '#dc2626' : '#f59e0b'} ${isSegActive ? 'solid' : 'dashed'}`,
                            borderRadius: '2px',
                          }}
                        >
                          {seg.text}
                        </span>
                      );
                    })}
                  </p>
                );
              })}
            </div>
          </div>

          {/* Right — Issues panel (Grammarly style) */}
          <div className="w-80 flex-shrink-0 overflow-y-auto border-l flex flex-col" style={{ borderColor: '#e9d5ff', backgroundColor: '#faf7ff' }}>
            <div className="px-4 py-4 border-b flex-shrink-0" style={{ borderColor: '#e9d5ff' }}>
              <p className="text-sm font-semibold" style={{ color: '#460073' }}>Issues Found</p>
              <p className="text-xs text-gray-500 mt-0.5">Click an issue to highlight in document</p>
            </div>

            <div className="flex-1 p-3 space-y-2">
              {issues.map((issue) => {
                const isFail = issue.status === 'fail';
                const isActive = activeIssue === issue.id;
                return (
                  <button
                    key={issue.id}
                    onClick={() => scrollToIssue(issue.id)}
                    className="w-full text-left rounded-xl p-3 transition-all"
                    style={{
                      backgroundColor: isActive
                        ? isFail ? '#fee2e2' : '#fef3c7'
                        : '#ffffff',
                      border: `1.5px solid ${isActive
                        ? isFail ? '#dc2626' : '#f59e0b'
                        : '#e9d5ff'}`,
                      boxShadow: isActive ? `0 0 0 3px ${isFail ? 'rgba(220,38,38,0.1)' : 'rgba(245,158,11,0.1)'}` : 'none',
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0 mt-0.5">
                        {isFail
                          ? <XCircle className="w-4 h-4 text-red-600" />
                          : <AlertTriangle className="w-4 h-4 text-amber-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold" style={{ color: isFail ? '#b91c1c' : '#92400e' }}>
                            {isFail ? 'FAIL' : 'WARNING'}
                          </span>
                          <span className="text-xs text-gray-400">{issue.location}</span>
                        </div>
                        <p className="text-xs font-medium text-gray-900 mt-0.5">{issue.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5 leading-snug">{issue.short}</p>
                        <p className="text-xs mt-1.5 font-mono" style={{ color: '#7500C0' }}>{issue.regulation}</p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
