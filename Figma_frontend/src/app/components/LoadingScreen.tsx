import { useState, useEffect } from 'react';
import { FileSearch, Shield, CheckCircle2, Activity } from 'lucide-react';
import { pageBackgroundStyle } from './pageBackground';

interface LoadingScreenProps {
  fileName: string;
}

const glassCard = {
  backgroundColor: '#ffffff',
  backdropFilter: 'blur(28px)',
  WebkitBackdropFilter: 'blur(28px)',
  border: '1px solid rgba(255,255,255,0.5)',
  boxShadow: '0 8px 40px rgba(0,0,0,0.25), inset 0 1.5px 0 rgba(255,255,255,0.95), inset 0 -1px 0 rgba(255,255,255,0.1), inset 1px 0 0 rgba(255,255,255,0.2), inset -1px 0 0 rgba(255,255,255,0.2)',
} as const;

export default function LoadingScreen({ fileName }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { icon: FileSearch, label: 'Analyzing document structure', duration: 1500 },
    { icon: Shield, label: 'Checking 21 CFR Part 11 compliance', duration: 2000 },
    { icon: Activity, label: 'Evaluating risk assessments', duration: 1800 },
    { icon: CheckCircle2, label: 'Generating recommendations', duration: 1200 },
  ];

  const totalDuration = steps.reduce((sum, step) => sum + step.duration, 0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) { clearInterval(interval); return 100; }
        return prev + (100 / totalDuration) * 50;
      });
    }, 50);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let elapsed = 0;
    for (let i = 0; i < steps.length; i++) {
      elapsed += steps[i].duration;
      if (progress < (elapsed / totalDuration) * 100) {
        setCurrentStep(i);
        return;
      }
    }
    setCurrentStep(steps.length - 1);
  }, [progress]);

  return (
    <div className="relative min-h-screen flex items-center justify-center p-6">
      <div className="fixed inset-0 -z-10" style={pageBackgroundStyle} />

      <div className="max-w-2xl w-full">
        <div className="rounded-2xl p-12" style={glassCard}>
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center mb-4">
              <svg width="96" height="100" viewBox="0 0 96 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <clipPath id="beaker-clip">
                    <path d="M14 18 L14 84 Q14 90 20 90 L76 90 Q82 90 82 84 L82 18 Z" />
                  </clipPath>
                  <linearGradient id="fluid-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#A100FF" stopOpacity="0.75" />
                    <stop offset="100%" stopColor="#460073" stopOpacity="0.9" />
                  </linearGradient>
                </defs>

                {/* Fluid — rises with progress, clipped to beaker shape */}
                <g clipPath="url(#beaker-clip)">
                  <rect
                    x="14" width="68" height="90"
                    fill="url(#fluid-grad)"
                    style={{
                      transform: `translateY(${90 - (progress / 100) * 72}px)`,
                      transition: 'transform 0.4s ease-out',
                    }}
                  />
                  {/* Wavy fluid surface */}
                  <g style={{
                    transform: `translateY(${90 - (progress / 100) * 72}px)`,
                    transition: 'transform 0.4s ease-out',
                  }}>
                    <path fill="#A100FF" opacity="0.85">
                      <animate attributeName="d" dur="1.2s" repeatCount="indefinite"
                        values="
                          M14,0 C27,-5 41,5 48,0 C55,-5 69,5 82,0 L82,10 L14,10 Z;
                          M14,0 C27,5 41,-5 48,0 C55,5 69,-5 82,0 L82,10 L14,10 Z;
                          M14,0 C27,-5 41,5 48,0 C55,-5 69,5 82,0 L82,10 L14,10 Z
                        "
                      />
                    </path>
                  </g>

                  {/* Bubbles rising through fluid */}
                  <circle cx="35" cy="90" r="3" fill="rgba(255,255,255,0.35)">
                    <animate attributeName="cy" values="88;20" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.6;0" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="r" values="3;1.5" dur="2s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="52" cy="90" r="2" fill="rgba(255,255,255,0.3)">
                    <animate attributeName="cy" values="88;25" dur="2.6s" begin="0.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.5;0" dur="2.6s" begin="0.5s" repeatCount="indefinite" />
                    <animate attributeName="r" values="2;1" dur="2.6s" begin="0.5s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="43" cy="90" r="2.5" fill="rgba(255,255,255,0.3)">
                    <animate attributeName="cy" values="88;30" dur="1.8s" begin="1s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.5;0" dur="1.8s" begin="1s" repeatCount="indefinite" />
                    <animate attributeName="r" values="2.5;1" dur="1.8s" begin="1s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="62" cy="90" r="1.8" fill="rgba(255,255,255,0.25)">
                    <animate attributeName="cy" values="88;35" dur="2.3s" begin="1.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.4;0" dur="2.3s" begin="1.5s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="28" cy="90" r="1.5" fill="rgba(255,255,255,0.25)">
                    <animate attributeName="cy" values="88;40" dur="2.1s" begin="0.8s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.4;0" dur="2.1s" begin="0.8s" repeatCount="indefinite" />
                  </circle>
                </g>

                {/* Beaker body outline */}
                <path d="M14 18 L14 84 Q14 90 20 90 L76 90 Q82 90 82 84 L82 18" stroke="#7500C0" strokeWidth="3" fill="none" strokeLinejoin="round" />

                {/* Thick flat rim */}
                <rect x="10" y="12" width="76" height="7" rx="2" fill="#7500C0" />

                {/* Graduation marks on left */}
                <line x1="14" y1="35" x2="23" y2="35" stroke="#7500C0" strokeWidth="2" strokeOpacity="0.6" />
                <line x1="14" y1="47" x2="21" y2="47" stroke="#7500C0" strokeWidth="1.5" strokeOpacity="0.4" />
                <line x1="14" y1="59" x2="23" y2="59" stroke="#7500C0" strokeWidth="2" strokeOpacity="0.6" />
                <line x1="14" y1="71" x2="21" y2="71" stroke="#7500C0" strokeWidth="1.5" strokeOpacity="0.4" />
                <line x1="14" y1="82" x2="23" y2="82" stroke="#7500C0" strokeWidth="2" strokeOpacity="0.6" />

              </svg>
            </div>
            <h2 className="text-2xl mb-2 text-gray-900">Analyzing Your Document</h2>
            <p className="text-gray-500">{fileName}</p>
          </div>


          <div className="space-y-3">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;

              return (
                <div
                  key={index}
                  className="flex items-center gap-4 p-4 rounded-xl transition-all"
                  style={{
                    backgroundColor: isActive ? 'rgba(161,0,255,0.08)' : 'rgba(255,255,255,0.4)',
                    border: isActive ? '1px solid rgba(161,0,255,0.4)' : '1px solid rgba(255,255,255,0.6)',
                    boxShadow: isActive ? '0 0 16px rgba(161,0,255,0.1)' : 'none',
                  }}
                >
                  <div
                    className="flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: isCompleted ? 'rgba(34,197,94,0.8)' : isActive ? 'rgba(117,0,192,0.8)' : 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.2)',
                    }}
                  >
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <span style={{ color: isActive ? '#460073' : isCompleted ? '#444' : '#aaa' }}>
                    {step.label}
                  </span>
                  {isCompleted && <CheckCircle2 className="w-5 h-5 text-green-400 ml-auto" />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
