import { AlertTriangle, XCircle, Flag } from 'lucide-react';

interface Flag {
  id: string;
  location: string;
  name: string;
  status: 'warning' | 'fail';
}

interface DocumentViewerProps {
  flags: Flag[];
  activeFlag: string | null;
  onFlagClick: (id: string) => void;
}

const docSections = [
  {
    page: 1,
    title: '1. Introduction & Scope',
    content:
      'This Risk Assessment document defines the regulatory and quality framework applicable to electronic systems used in the manufacturing and quality control environment. The scope covers all computerized systems subject to 21 CFR Part 11 requirements.',
    flagId: null,
  },
  {
    page: 2,
    title: '2. System Overview',
    content:
      'The system architecture consists of a centralized data management platform with role-based access control. All electronic records are stored in a validated environment with appropriate security measures.',
    flagId: null,
  },
  {
    page: 3,
    title: '3.1 Electronic Signatures',
    content:
      'Electronic signatures are implemented using two-factor authentication mechanisms. Each signature event is linked to a unique user ID and timestamp. Signature manifests are generated for all critical operations and stored with the associated record.',
    flagId: null,
  },
  {
    page: 5,
    title: '3.2.1 Audit Trail Requirements',
    content:
      'The system captures user actions at the application layer. Change tracking is implemented for primary data fields. Secondary metadata fields and inter-system data transfers currently lack complete audit coverage. Review cycles for audit logs are defined but not consistently enforced across all modules.',
    flagId: 'Page 5, Section 3.2.1',
  },
  {
    page: 6,
    title: '3.3 Electronic Audit Trail',
    content:
      'Audit trail entries are written to a shared database table accessible to database administrators. The current configuration does not prevent direct modification of audit records at the database level. Tamper-evident controls are not enforced, creating a potential integrity risk for regulatory review.',
    flagId: 'Page 6, Section 3.3',
  },
  {
    page: 7,
    title: '4.1 Access Controls',
    content:
      'User authentication is handled via single-factor password-based login. Current password policy requires a minimum of 6 characters with no complexity requirements. Password expiration is set to 180 days. No multi-factor authentication is implemented for privileged accounts.',
    flagId: 'Page 7, Section 4.1',
  },
  {
    page: 8,
    title: '4.3 System Security',
    content:
      'Data at rest is stored without encryption on the primary application server. Data in transit is protected using TLS 1.2. Backup storage media is not encrypted. The current encryption posture does not meet industry standards for sensitive pharmaceutical data.',
    flagId: 'Page 8, Section 4.3',
  },
  {
    page: 9,
    title: 'Table 3 — Risk Numbering',
    content:
      'Risk identifiers follow a RA-XXX format in most sections; however, Tables 3 and 4 use an alternate R-XX scheme without explanation. Sub-risks in Section 5 are numbered independently from parent risks, creating cross-reference inconsistencies in the traceability matrix.',
    flagId: 'Page 9, Table 3',
  },
  {
    page: 10,
    title: '5.1 ALCOA+ Principles',
    content:
      'Data attribution is documented for primary records. Contemporaneous recording requirements are referenced but not enforced procedurally — operators may complete records after the fact without justification. No technical controls prevent retrospective data entry beyond the defined review window.',
    flagId: 'Page 10, Section 5.1',
  },
  {
    page: 11,
    title: '5.4 Data Backup Procedures',
    content:
      'System backups are performed nightly by the IT department. No formal backup and recovery SOP exists within the quality system. Recovery time objectives and recovery point objectives have not been validated. Backup restoration has not been tested in the past 12 months.',
    flagId: 'Page 11, Section 5.4',
  },
  {
    page: 12,
    title: '6.3 Training Records',
    content:
      'Personnel training is managed through an informal sign-off process. No training matrix has been developed for this system. Competency assessments are not required prior to system access. Training records are stored in a separate system with no linkage to the quality management system.',
    flagId: 'Page 12, Section 6.3',
  },
  {
    page: 14,
    title: '6.7 Change Control Records',
    content:
      'Change requests are logged in the change management system. Justifications for data modifications are captured at a summary level only. Detailed rationale and impact assessments are inconsistently documented, with several records containing only "data correction" as the stated reason.',
    flagId: 'Page 14, Section 6.7',
  },
  {
    page: 15,
    title: '7.2 Deviation Handling',
    content:
      'Deviations are recorded and assigned to quality personnel for investigation. Escalation triggers are vaguely defined and subject to individual interpretation. No formal criteria distinguish minor from critical deviations. Management review thresholds and timelines for CAPA initiation are not specified.',
    flagId: 'Page 15, Section 7.2',
  },
];

export default function DocumentViewer({ flags, activeFlag, onFlagClick }: DocumentViewerProps) {
  const getFlagForSection = (sectionFlagId: string | null) =>
    sectionFlagId ? flags.find(f => f.location === sectionFlagId) ?? null : null;

  return (
    <div className="flex flex-col h-full" style={{ minWidth: 0 }}>
      {/* Header */}
      <div className="px-4 py-3 border-b flex-shrink-0" style={{ borderColor: '#e9d5ff', backgroundColor: '#faf7ff' }}>
        <div className="flex items-center gap-2 mb-1">
          <Flag className="w-4 h-4" style={{ color: '#7500C0' }} />
          <p className="text-sm font-semibold" style={{ color: '#460073' }}>Document Preview</p>
        </div>
        <p className="text-xs text-gray-500">Flagged sections are highlighted in red/amber</p>
        <div className="flex gap-3 mt-2">
          <span className="flex items-center gap-1 text-xs text-red-600">
            <XCircle className="w-3 h-3" /> Fail
          </span>
          <span className="flex items-center gap-1 text-xs text-amber-600">
            <AlertTriangle className="w-3 h-3" /> Warning
          </span>
        </div>
      </div>

      {/* Scrollable document */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ backgroundColor: '#f5f4f9' }}>
        {docSections.map((section, idx) => {
          const flag = getFlagForSection(section.flagId);
          const isActive = activeFlag === section.flagId;
          const isFail = flag?.status === 'fail';
          const isWarning = flag?.status === 'warning';

          return (
            <div
              key={idx}
              onClick={() => flag && onFlagClick(flag.location)}
              className="rounded-lg p-3 relative transition-all"
              style={{
                backgroundColor: isActive
                  ? isFail ? '#fee2e2' : isWarning ? '#fef9c3' : '#fff'
                  : flag ? isFail ? '#fff5f5' : '#fffbeb' : '#ffffff',
                border: isActive
                  ? `2px solid ${isFail ? '#dc2626' : '#f59e0b'}`
                  : flag
                  ? `1px solid ${isFail ? '#fca5a5' : '#fcd34d'}`
                  : '1px solid #e9d5ff',
                cursor: flag ? 'pointer' : 'default',
                boxShadow: isActive ? `0 0 0 3px ${isFail ? 'rgba(220,38,38,0.15)' : 'rgba(245,158,11,0.15)'}` : 'none',
              }}
            >
              {/* Flag indicator bar on left */}
              {flag && (
                <div
                  className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
                  style={{ backgroundColor: isFail ? '#dc2626' : '#f59e0b' }}
                />
              )}

              <div className="flex items-start justify-between gap-2 pl-1">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-400">p.{section.page}</span>
                    <p className="text-xs font-semibold truncate" style={{ color: flag ? (isFail ? '#b91c1c' : '#92400e') : '#460073' }}>
                      {section.title}
                    </p>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">{section.content}</p>
                  {flag && (
                    <div className="mt-2 flex items-center gap-1">
                      {isFail
                        ? <XCircle className="w-3 h-3 text-red-600 flex-shrink-0" />
                        : <AlertTriangle className="w-3 h-3 text-amber-600 flex-shrink-0" />}
                      <span className="text-xs font-medium" style={{ color: isFail ? '#dc2626' : '#b45309' }}>
                        {flag.name}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
