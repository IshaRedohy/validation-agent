import { Upload } from 'lucide-react';
import { useState } from 'react';
import toolIcon from '../../imports/image-11.png';
import { pageBackgroundStyle } from './pageBackground';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
}

const glass = {
  backgroundColor: '#ffffff',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.45)',
  boxShadow: '0 4px 24px rgba(0,0,0,0.2), inset 0 1.5px 0 rgba(255,255,255,0.9), inset 0 -1px 0 rgba(255,255,255,0.15)',
} as const;

const glassCard = {
  backgroundColor: '#ffffff',
  backdropFilter: 'blur(28px)',
  WebkitBackdropFilter: 'blur(28px)',
  border: '1px solid rgba(255,255,255,0.5)',
  boxShadow: '0 8px 40px rgba(0,0,0,0.25), inset 0 1.5px 0 rgba(255,255,255,0.95), inset 0 -1px 0 rgba(255,255,255,0.1), inset 1px 0 0 rgba(255,255,255,0.2), inset -1px 0 0 rgba(255,255,255,0.2)',
} as const;

const purpleIconRing = {
  background: 'linear-gradient(135deg, rgba(161,0,255,0.15), rgba(70,0,115,0.1))',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1.5px solid rgba(161,0,255,0.35)',
  boxShadow: '0 4px 16px rgba(161,0,255,0.2), inset 0 1px 0 rgba(255,255,255,0.6)',
} as const;

export default function FileUpload({ onFileSelect }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-6">
      <div className="fixed inset-0 -z-10" style={pageBackgroundStyle} />

      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <img src={toolIcon} alt="Compliance Validator" className="mx-auto mb-4 block" style={{ width: '88px', height: '88px', objectFit: 'cover', border: '2.5px solid #A100FF', borderRadius: '24px' }} />
          <h1 className="text-4xl mb-3" style={{ color: '#460073' }}>Compliance Validator</h1>
          <p className="text-lg" style={{ color: '#7500C0' }}>
            Life Science & Pharma Risk Assessment Analysis
          </p>
        </div>

        {/* Upload card */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className="rounded-2xl p-12 text-center transition-all"
          style={{
            backgroundColor: isDragging ? 'rgba(161,0,255,0.06)' : glassCard.backgroundColor,
            backdropFilter: glassCard.backdropFilter,
            WebkitBackdropFilter: glassCard.WebkitBackdropFilter,
            boxShadow: isDragging ? '0 0 0 3px #A100FF, 0 8px 40px rgba(161,0,255,0.2)' : glassCard.boxShadow,
            borderStyle: 'dashed',
            borderWidth: isDragging ? '2px' : '1px',
            borderColor: isDragging ? '#A100FF' : 'rgba(161,0,255,0.3)',
            transform: isDragging ? 'scale(1.01)' : 'scale(1)',
          }}
        >
          {/* Upload icon — purple */}
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={purpleIconRing}>
            <Upload className="w-8 h-8" style={{ color: '#A100FF' }} />
          </div>
          <h2 className="text-xl mb-2 text-gray-900">Upload Risk Assessment Document</h2>
          <p className="mb-6 text-gray-500">
            Drag and drop your RA document here, or click to browse
          </p>
          <label className="inline-block">
            <input type="file" onChange={handleFileChange} accept=".pdf,.doc,.docx,.txt" className="hidden" />
            <span
              className="inline-block px-8 py-3 text-white rounded-xl cursor-pointer transition-all hover:opacity-90 hover:scale-[1.02]"
              style={{
                background: 'linear-gradient(135deg, #A100FF, #460073)',
                boxShadow: '0 4px 20px rgba(161,0,255,0.45), inset 0 1px 0 rgba(255,255,255,0.25)',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              Select Document
            </span>
          </label>
          <p className="text-sm mt-4 text-gray-400">
            Supported formats: PDF, DOC, DOCX, TXT
          </p>
        </div>

        {/* What we analyze */}
        <div className="mt-8 rounded-xl p-6" style={glass}>
          <h3 className="text-sm mb-3 font-medium text-gray-900">What we analyze:</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            {[
              '21 CFR Part 11 Compliance (Electronic Records & Signatures)',
              'Patient Safety & Data Integrity Risk Assessment',
              'Audit Trail, Access Control, and SOP Requirements',
              'Product Quality Risk Management',
              'Internal Formatting (Document Structure & Consistency)',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-0.5 w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[10px]"
                  style={{ background: 'linear-gradient(135deg, #A100FF, #460073)', boxShadow: '0 2px 8px rgba(161,0,255,0.35)' }}>
                  ✓
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
