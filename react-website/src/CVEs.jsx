/* Designed and engineered by liyander Rishwanth (CyberGhost05) */
import React, { useState, useEffect } from 'react';

function CVEs({ onSelectCve }) {
  const [cves, setCves] = useState([]);
  const [selectedCve, setSelectedCve] = useState(null);

  useEffect(() => {
    fetch('/api/cves')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setCves(data);
        } else {
          setCves([]);
          console.error("Expected array but got:", data);
        }
      })
      .catch(err => console.error("Failed to fetch CVEs", err));
  }, []);

  if (selectedCve) {
    return (
      <div className="max-w-7xl mx-auto p-6 md:p-12 text-on-surface">
        <button 
          onClick={() => setSelectedCve(null)}
          className="mb-8 font-mono text-sm text-outline hover:text-primary-container transition-colors flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          RETURN TO DIRECTORY
        </button>

        <div className="bg-surface-container-low border ghost-border rounded p-8 md:p-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 opacity-10 select-none pointer-events-none material-symbols-outlined text-9xl">bug_report</div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <span className="h-2 w-2 rounded-full bg-error animate-pulse shadow-[0_0_8px_rgba(255,0,0,0.8)]"></span>
              <span className="font-mono text-xs tracking-widest text-error font-bold">VERIFIED VULNERABILITY</span>
            </div>
            
            <h1 className="font-headline text-5xl md:text-6xl font-black text-primary mb-6 tracking-tighter">{selectedCve.cve_number}</h1>
            
            <div className="bg-surface-dim border-l-4 border-primary/50 p-6 mb-8 rounded-r">
              <p className="font-mono text-base text-on-surface-variant leading-relaxed">
                {selectedCve.details}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              {selectedCve.poc && (
                <div className="bg-background border border-outline/20 p-6 rounded relative group shadow-md">
                  <div className="absolute top-0 left-4 -translate-y-1/2 bg-surface-container-low px-2 font-mono text-xs text-primary font-bold">Proof of Concept</div>
                  <pre className="font-mono text-sm text-on-surface-variant whitespace-pre-wrap mt-2">{selectedCve.poc}</pre>
                </div>
              )}
              
              {selectedCve.reference_link && (
                <div className="bg-background border border-outline/20 p-6 rounded relative shadow-md flex flex-col justify-center gap-4">
                  <div className="absolute top-0 left-4 -translate-y-1/2 bg-surface-container-low px-2 font-mono text-xs text-primary font-bold">External Reference</div>
                  <a href={selectedCve.reference_link} target="_blank" rel="noopener noreferrer" className="mt-2 text-primary-container hover:text-primary transition-colors font-mono underline break-all flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">public</span>
                    {selectedCve.reference_link}
                  </a>
                </div>
              )}
            </div>

            {selectedCve.contributors && (() => {
              let contribs = [];
              try { contribs = typeof selectedCve.contributors === 'string' ? JSON.parse(selectedCve.contributors) : selectedCve.contributors; } catch(e){}
              if (contribs && contribs.length > 0) {
                return (
                  <div className="mt-8 border-t border-outline/20 pt-8">
                    <h3 className="font-headline font-bold text-xl mb-4 text-outline">Lead Researchers / Contributors</h3>
                    <div className="flex flex-wrap gap-3">
                      {contribs.map((c, i) => (
                        <div key={i} className="bg-surface-container-high px-4 py-2 rounded-full border border-outline/30 font-mono text-xs text-on-surface flex items-center gap-2">
                          <span className="h-1.5 w-1.5 bg-primary rounded-full"></span>
                          {c.name || c}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              return null;
            })()}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-12 py-12 w-full">
      <div className="flex items-center gap-4 mb-8 border-b ghost-border pb-6">
        <span className="material-symbols-outlined text-4xl text-primary drop-shadow-[0_0_10px_rgba(0,245,255,0.5)]">security</span>
        <div>
          <h1 className="font-headline font-black text-4xl tracking-tighter text-on-surface">THREAT INTELLIGENCE</h1>
          <p className="font-mono text-sm text-outline mt-1">Common Vulnerabilities and Exposures (CVEs) discovered by the lab.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cves.map(cve => (
          <div 
            key={cve.id} 
            onClick={() => setSelectedCve(cve)}
            className="group cursor-pointer bg-surface-container-low border ghost-border relative p-6 rounded hover:bg-surface-container hover:shadow-[0_0_20px_rgba(0,245,255,0.15)] transition-all"
          >
            <div className="text-error font-mono text-xs font-bold mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">warning</span> DISCLOSED
            </div>
            <h2 className="font-headline font-bold text-2xl text-primary mb-3 group-hover:text-primary-container transition-colors tracking-tight">{cve.cve_number}</h2>
            <p className="font-mono text-sm text-outline line-clamp-3 mb-6 relative z-10 group-hover:text-on-surface-variant transition-colors">{cve.details}</p>
            <div className="absolute right-4 bottom-4 text-xs font-mono text-primary font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
              VIEW DETAILS <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </div>
          </div>
        ))}
        
        {cves.length === 0 && (
          <div className="col-span-full py-20 text-center border ghost-border rounded border-dashed bg-surface-dim">
            <span className="material-symbols-outlined text-4xl text-outline mb-2">find_in_page</span>
            <p className="font-mono text-outline">No public vulnerabilities logged in the databank currently.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default CVEs;

