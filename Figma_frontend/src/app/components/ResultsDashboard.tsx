import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Shield,
  Users,
  Database,
  FileCheck,
  Lock,
  ClipboardList,
  ArrowLeft,
  MapPin,
  ChevronDown,
} from 'lucide-react';
import { useState } from 'react';
import { pageBackgroundStyle } from './pageBackground';
import DocumentModal from './DocumentModal';

function CollapsibleCategory({ title, children, nonCompliant = false }: { title: string; children: React.ReactNode; nonCompliant?: boolean | string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #e9d5ff' }}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-4 py-3"
        style={{ backgroundColor: open ? '#f3f0ff' : '#faf9ff' }}
      >
        <div className="flex items-center gap-2">
          <ChevronDown
            className="w-4 h-4 transition-transform flex-shrink-0"
            style={{ color: '#7500C0', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}
          />
          <p className="text-xs font-semibold uppercase tracking-wide text-left" style={{ color: '#460073' }}>{title}</p>
        </div>
        {nonCompliant ? (
          <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0 text-white" style={{ backgroundColor: nonCompliant === 'fail' ? '#dc2626' : nonCompliant === 'warning' ? '#f59e0b' : '#3b82f6' }}>
            {nonCompliant === 'fail' ? 'Non Compliant' : nonCompliant === 'warning' ? 'Needs Review' : 'Partial'}
          </span>
        ) : (
          <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0 text-white flex items-center gap-1" style={{ backgroundColor: '#16a34a' }}>
            <CheckCircle2 className="w-3 h-3" /> Compliant
          </span>
        )}
      </button>
      {open && (
        <div className="px-4 py-3 space-y-2 border-t" style={{ borderColor: '#e9d5ff', backgroundColor: '#fff' }}>
          {children}
        </div>
      )}
    </div>
  );
}

interface ResultsDashboardProps {
  fileName: string;
  onReset: () => void;
}

export default function ResultsDashboard({ fileName, onReset }: ResultsDashboardProps) {
  const [highlightedLocation, setHighlightedLocation] = useState<string | null>(null);
  const [showDocument, setShowDocument] = useState(false);
  const [showCategories, setShowCategories] = useState(false);

  const complianceChecks = [
    {
      category: '21 CFR Part 11',
      items: [
        { name: 'Electronic Signatures', status: 'pass', note: 'Two-factor authentication and signature manifests fully documented', location: null },
        { name: 'Audit Trail Requirements', status: 'pass', note: 'Full audit trail coverage across all data fields and modules', location: null },
        { name: 'System Validation', status: 'pass', note: 'IQ/OQ/PQ protocols completed and approved', location: null },
        { name: 'Access Controls', status: 'pass', note: 'Role-based access with MFA enforced for all privileged accounts', location: null },
        { name: 'Record Retention', status: 'pass', note: 'Retention periods clearly documented and enforced', location: null },
        { name: 'System Security', status: 'pass', note: 'Encryption at rest and in transit meets industry standards', location: null },
      ],
    },
    {
      category: 'SOP Requirements',
      items: [
        { name: 'Document Control', status: 'pass', note: 'Version control and approval workflows fully in place', location: null },
        { name: 'Training Records', status: 'fail', note: 'No training matrix or competency assessments documented', location: 'Page 12, Section 6.3' },
        { name: 'Change Management', status: 'pass', note: 'Change control process well defined with CAPA linkage', location: null },
        { name: 'Deviation Handling', status: 'warning', note: 'Escalation thresholds and CAPA timelines not specified', location: 'Page 15, Section 7.2' },
        { name: 'CAPA Process', status: 'pass', note: 'CAPA procedure meets ICH Q10 requirements', location: null },
      ],
    },
    {
      category: 'Internal Formatting Checks',
      items: [
        { name: 'Document Structure', status: 'pass', note: 'Proper headings and section hierarchy maintained', location: null },
        { name: 'Table Formatting', status: 'pass', note: 'Risk tables properly formatted with clear headers and units', location: null },
        { name: 'Numbering Consistency', status: 'warning', note: 'Risk IDs mix RA-XXX and R-XX formats without explanation', location: 'Page 9, Table 3' },
        { name: 'Cross-References', status: 'pass', note: 'All section references validated and accurate', location: null },
      ],
    },
    {
      category: 'Data Integrity',
      items: [
        { name: 'ALCOA+ Principles', status: 'pass', note: 'All ALCOA+ criteria met; contemporaneous recording technically enforced', location: null },
        { name: 'Data Backup Procedures', status: 'pass', note: 'Backup and recovery SOP documented, tested and approved', location: null },
        { name: 'Change Control Records', status: 'pass', note: 'Full justification and impact assessments captured for all changes', location: null },
        { name: 'Electronic Audit Trail', status: 'pass', note: 'Tamper-evident audit trails enforced at application and database level', location: null },
        { name: 'Data Lifecycle Management', status: 'pass', note: 'Archival, retrieval and destruction procedures documented', location: null },
        { name: 'Raw Data Integrity', status: 'pass', note: 'Original data preservation controls verified during audit', location: null },
      ],
    },
  ];

  const riskRatings = [
    { category: 'Patient Safety', rating: 8, icon: Users, assessment: 'Strong controls for patient data protection and adverse event reporting.' },
    { category: 'Data Integrity', rating: 6, icon: Database, assessment: 'Adequate controls but audit trail coverage needs improvement.' },
    { category: 'Product Quality', rating: 7, icon: FileCheck, assessment: 'Good quality control measures, minor gaps in batch record review.' },
    { category: 'Access Control', rating: 5, icon: Lock, assessment: 'Basic controls present, requires enhanced authentication methods.' },
    { category: 'Audit Trail', rating: 6, icon: ClipboardList, assessment: 'Partial coverage, needs comprehensive timestamp and user tracking.' },
  ];

  const suggestions = [
    {
      priority: 'High',
      title: 'Strengthen Audit Trail Implementation',
      description: 'Implement comprehensive audit trail that captures all data modifications with timestamp, user ID, and reason for change. Ensure trails are tamper-evident and reviewable.',
      regulation: '21 CFR Part 11.10(e)',
    },
    {
      priority: 'High',
      title: 'Enhance Access Control Mechanisms',
      description: 'Implement multi-factor authentication, enforce minimum 8-character passwords with complexity requirements, and establish role-based access control (RBAC) with regular review cycles.',
      regulation: '21 CFR Part 11.10(d)',
    },
    {
      priority: 'Medium',
      title: 'Document Training Requirements',
      description: 'Create detailed training SOPs covering system operation, data integrity principles, and regulatory requirements. Maintain training records with dates, signatures, and competency assessments.',
      regulation: 'GxP Training Requirements',
    },
    {
      priority: 'Medium',
      title: 'Improve Deviation Handling Procedures',
      description: 'Expand deviation handling SOP to include clear escalation criteria, investigation timelines, CAPA integration, and management review requirements.',
      regulation: 'ICH Q10 Quality Systems',
    },
    {
      priority: 'Low',
      title: 'Enhance Batch Record Review Process',
      description: 'Implement systematic batch record review with defined checkpoints, critical parameter verification, and exception reporting mechanisms.',
      regulation: '21 CFR Part 211',
    },
  ];

  const getStatusIcon = (status: string, small = false) => {
    const sz = small ? 'w-4 h-4' : 'w-5 h-5';
    switch (status) {
      case 'pass':    return <CheckCircle2 className={`${sz} text-green-500`} />;
      case 'warning': return <AlertTriangle className={`${sz} text-amber-500`} />;
      case 'fail':    return <XCircle className={`${sz} text-red-500`} />;
      case 'partial': return <div className={`${sz} rounded-full border-2 border-blue-400 flex items-center justify-center`}><div className="w-1.5 h-1.5 rounded-full bg-blue-400" /></div>;
      default: return null;
    }
  };

  const getRatingBarColor = (rating: number, i: number) => {
    if (i >= rating) return '#e5e7eb';
    if (rating >= 8) return '#22c55e';
    if (rating >= 6) return '#f59e0b';
    return '#ef4444';
  };

  const getRatingTextColor = (rating: number) => {
    if (rating >= 8) return '#22c55e';
    if (rating >= 6) return '#f59e0b';
    return '#ef4444';
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'High': return { backgroundColor: '#ffe4e6', color: '#9f1239', border: '1px solid #fecdd3' };
      case 'Medium': return { backgroundColor: '#fef9c3', color: '#854d0e', border: '1px solid #fef08a' };
      case 'Low': return { backgroundColor: '#f3e8ff', color: '#6b21a8', border: '1px solid #e9d5ff' };
      default: return {};
    }
  };

  return (
    <>
    <div className="relative min-h-screen p-6" style={pageBackgroundStyle}>
      <div className="max-w-7xl mx-auto">

        {/* Disclaimer banner */}
        <div className="mb-4 rounded-xl px-5 py-3 flex items-center gap-3" style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a' }}>
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-500" />
          <p className="text-xs text-amber-800">
            <strong>Disclaimer:</strong> This analysis provides guidance based on regulatory requirements and does not guarantee compliance. All findings should be reviewed by qualified personnel. This tool is intended to assist — not replace — professional regulatory expertise.
          </p>
        </div>

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl mb-1" style={{ color: '#460073' }}>Compliance Analysis Report</h1>
            <p className="text-gray-500">{fileName}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCategories(!showCategories)}
              className="flex items-center gap-2 px-5 py-3 rounded-lg transition-colors hover:opacity-90"
              style={{ backgroundColor: showCategories ? '#f3e8ff' : '#ffffff', border: '1px solid #e9d5ff', color: '#7500C0', boxShadow: '0 2px 8px rgba(70,0,115,0.1)' }}
            >
              <ClipboardList className="w-5 h-5" />
              Categories Reference
              <ChevronDown className="w-4 h-4 transition-transform" style={{ transform: showCategories ? 'rotate(180deg)' : 'rotate(0deg)' }} />
            </button>
            <button
              onClick={() => setShowDocument(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-lg transition-colors hover:opacity-90"
              style={{ backgroundColor: '#ffffff', border: '1px solid #e9d5ff', color: '#7500C0', boxShadow: '0 2px 8px rgba(70,0,115,0.1)' }}
            >
              <FileCheck className="w-5 h-5" />
              View Document
            </button>
            <button
              onClick={onReset}
              className="flex items-center gap-2 px-6 py-3 rounded-lg transition-colors hover:opacity-90"
              style={{ backgroundColor: '#ffffff', border: '1px solid #e9d5ff', color: '#460073', boxShadow: '0 2px 8px rgba(70,0,115,0.1)' }}
            >
              <ArrowLeft className="w-5 h-5" />
              New Analysis
            </button>
          </div>
        </div>

        {/* Categories Reference Slide Panel */}
        {showCategories && (
          <div className="mb-6 rounded-xl p-6 animate-fade" style={{ backgroundColor: '#ffffff', border: '1px solid #e9d5ff', boxShadow: '0 4px 20px rgba(70,0,115,0.1)' }}>
            <h2 className="text-lg mb-4" style={{ color: '#460073' }}>Categories Reference Guide</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {complianceChecks.map((section, idx) => (
                <div key={idx}>
                  <h3 className="text-sm mb-3 pb-2 border-b font-semibold" style={{ color: '#7500C0', borderColor: '#e9d5ff' }}>{section.category}</h3>
                  <div className="space-y-2">
                    {section.items.map((item, itemIdx) => (
                      <div key={itemIdx} className="flex items-start gap-3">
                        <div className="mt-0.5 flex-shrink-0">{getStatusIcon(item.status)}</div>
                        <div>
                          <p className="text-sm text-gray-900">{item.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{item.note}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Banner columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

          {/* Overall Score */}
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 8px 40px rgba(0,0,0,0.25), inset 0 1.5px 0 rgba(255,255,255,0.95)' }}>
            <div className="p-6 text-white" style={{ background: 'linear-gradient(135deg, #460073, #7500C0)' }}>
              <div className="flex items-center gap-3 mb-2">
                <Shield className="w-6 h-6" />
                <h3 className="text-lg">Overall Score</h3>
              </div>
              <p className="text-4xl mb-1">7.8/10</p>
              <p className="text-sm" style={{ color: '#e0b3ff' }}>Good compliance level</p>
            </div>
            <div className="p-4 space-y-2">
              {complianceChecks.map((section, sIdx) => (
                <CollapsibleCategory
                  key={`overall-section-${sIdx}`}
                  title={section.category}
                  nonCompliant={section.items.some(i => i.status === 'fail') ? 'fail' : section.items.some(i => i.status === 'warning') ? 'warning' : section.items.some(i => i.status === 'partial') ? 'partial' : false}
                >
                  {section.items.map((item, idx) => (
                    <div key={`overall-${sIdx}-${idx}`} className="flex items-center gap-2 text-sm">
                      <div className="flex-shrink-0">{getStatusIcon(item.status)}</div>
                      <span className="text-gray-700 truncate">{item.name}</span>
                    </div>
                  ))}
                </CollapsibleCategory>
              ))}
            </div>
          </div>

          {/* All Checks */}
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 8px 40px rgba(0,0,0,0.25), inset 0 1.5px 0 rgba(255,255,255,0.95)' }}>
            <div className="p-6 text-white" style={{ background: 'linear-gradient(135deg, #7500C0, #A100FF)' }}>
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle2 className="w-6 h-6" />
                <h3 className="text-lg">All Checks</h3>
              </div>
              <p className="text-4xl mb-1">8/16</p>
              <p className="text-sm" style={{ color: '#e0b3ff' }}>Requirements met</p>
            </div>
            <div className="p-4 space-y-2">
              {complianceChecks.map((section, sIdx) => (
                <CollapsibleCategory
                  key={`all-section-${sIdx}`}
                  title={section.category}
                  nonCompliant={section.items.some(i => i.status === 'fail') ? 'fail' : section.items.some(i => i.status === 'warning') ? 'warning' : section.items.some(i => i.status === 'partial') ? 'partial' : false}
                >
                  {section.items.map((item, idx) => (
                    <div key={`all-${sIdx}-${idx}`} className="flex items-start gap-2 text-sm">
                      <div className="flex-shrink-0 mt-0.5">{getStatusIcon(item.status)}</div>
                      <div>
                        <p className="text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{item.note}</p>
                      </div>
                    </div>
                  ))}
                </CollapsibleCategory>
              ))}
            </div>
          </div>

          {/* Improvement Areas */}
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 8px 40px rgba(0,0,0,0.25), inset 0 1.5px 0 rgba(255,255,255,0.95)' }}>
            <div className="p-6 text-white" style={{ background: 'linear-gradient(135deg, #460073, #A100FF)' }}>
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-6 h-6" />
                <h3 className="text-lg">Improvement Areas</h3>
              </div>
              <p className="text-4xl mb-1">8</p>
              <p className="text-sm" style={{ color: '#e0b3ff' }}>Action items identified</p>
            </div>
            <div className="p-4 space-y-2">
              {complianceChecks.map((section, sIdx) => {
                const filtered = section.items.filter(item => item.status === 'warning' || item.status === 'fail');
                if (filtered.length === 0) return null;
                return (
                  <CollapsibleCategory key={`improve-section-${sIdx}`} title={section.category} nonCompliant={filtered.some(i => i.status === 'fail') ? 'fail' : filtered.some(i => i.status === 'warning') ? 'warning' : 'partial'}>
                    {filtered.map((item, idx) => (
                        <div key={`improve-${sIdx}-${idx}`} className="flex items-start gap-2 text-sm group">
                          <div className="flex-shrink-0 mt-0.5">{getStatusIcon(item.status)}</div>
                          <div className="flex-1">
                            <p className="text-gray-900">{item.name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{item.note}</p>
                            {highlightedLocation === item.location && item.location && (
                              <div className="mt-2 p-2 rounded border-l-4" style={{ backgroundColor: '#fef9c3', borderColor: '#eab308' }}>
                                <p className="text-xs flex items-center gap-1" style={{ color: '#713f12' }}>
                                  <MapPin className="w-3 h-3" />
                                  Found at: {item.location}
                                </p>
                              </div>
                            )}
                          </div>
                          {item.location && (
                            <button
                              onClick={() => setHighlightedLocation(highlightedLocation === item.location ? null : item.location)}
                              className="flex-shrink-0 p-1.5 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                              style={{ backgroundColor: '#f3e8ff', color: '#7500C0' }}
                              title="Show location in document"
                            >
                              <MapPin className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                  </CollapsibleCategory>
                );
              })}
            </div>
          </div>
        </div>

        {/* Risk Assessment Ratings — horizontal row */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {riskRatings.map((risk, idx) => {
            const Icon = risk.icon;
            return (
              <div key={idx} className="rounded-xl p-4 text-center" style={{ backgroundColor: '#ffffff', border: '1px solid #e9d5ff', boxShadow: '0 4px 16px rgba(70,0,115,0.08)' }}>
                <Icon className="w-6 h-6 mx-auto mb-2" style={{ color: '#7500C0' }} />
                <p className="text-xs text-gray-500 mb-2">{risk.category}</p>
                <p className="text-3xl mb-2" style={{ color: getRatingTextColor(risk.rating) }}>{risk.rating}<span className="text-sm text-gray-400">/10</span></p>
                <div className="flex gap-0.5">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="h-1.5 flex-1 rounded-full" style={{ backgroundColor: getRatingBarColor(risk.rating, i) }} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Recommendations */}
        <div className="rounded-xl p-6" style={{ backgroundColor: '#ffffff', backdropFilter: 'none', WebkitBackdropFilter: 'blur(28px)', border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 8px 40px rgba(0,0,0,0.25), inset 0 1.5px 0 rgba(255,255,255,0.95), inset 0 -1px 0 rgba(255,255,255,0.1), inset 1px 0 0 rgba(255,255,255,0.2), inset -1px 0 0 rgba(255,255,255,0.2)' }}>
          <h2 className="text-xl mb-4" style={{ color: '#460073' }}>AI-Generated Recommendations</h2>
          <div className="space-y-4">
            {suggestions.map((suggestion, idx) => (
              <div
                key={idx}
                className="rounded-lg p-5 transition-colors"
                style={{ border: '1px solid rgba(255,255,255,0.35)', backgroundColor: '#f9f9f9', borderRadius: '0.5rem', backdropFilter: 'none', WebkitBackdropFilter: 'blur(16px)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8)' }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#A100FF')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#f3e8ff')}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg text-gray-900">{suggestion.title}</h3>
                  <span className="px-3 py-1 rounded-full text-xs" style={getPriorityStyle(suggestion.priority)}>
                    {suggestion.priority} Priority
                  </span>
                </div>
                <p className="text-gray-600 mb-3">{suggestion.description}</p>
                <div className="flex items-center gap-2 text-sm">
                  <Shield className="w-4 h-4" style={{ color: '#A100FF' }} />
                  <span style={{ color: '#7500C0' }}>{suggestion.regulation}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
    {showDocument && <DocumentModal onClose={() => setShowDocument(false)} />}
    </>
  );
}
