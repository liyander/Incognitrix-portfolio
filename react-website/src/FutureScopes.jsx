/* Designed and engineered by liyander Rishwanth (CyberGhost05) */
import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function FutureScopes() {
  const [scopes, setScopes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch future scopes from the MySQL backend on load
  useEffect(() => {
    fetch('/api/future_scopes')
      .then(res => res.json())
      .then(data => {
        setScopes(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch future scopes", err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="h-full bg-background text-on-surface font-body overflow-y-auto">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-12 flex flex-col gap-12">
        <h1 className="font-headline font-black text-5xl md:text-6xl text-on-surface tracking-tighter mb-4 border-b ghost-border pb-4">
          Future Scope
        </h1>

        {loading ? (
          <div className="flex justify-center py-12">
            <span className="material-symbols-outlined animate-spin text-primary text-4xl">sync</span>
          </div>
        ) : scopes.length === 0 ? (
          <div className="py-20 text-center font-mono text-outline border ghost-border rounded bg-surface-dim">
            <span className="material-symbols-outlined text-4xl mb-4 block">science</span>
            No future scopes tracked in the database at this time.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {scopes.map(scope => (
              <div key={scope.id} className="bg-surface-dim border-outline-variant-high rounded ghost-border p-8 hover:bg-surface-bright transition-colors duration-300 group flex flex-col h-full">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center space-x-2">
                    <span className="material-symbols-outlined text-primary-container text-lg">science</span>
                    <span className="font-mono text-xs tracking-widest text-primary-container uppercase">
                      {scope.category || 'RESEARCH'}
                    </span>
                  </div>
                  <span className={`font-mono text-[10px] px-2 py-1 rounded border ${scope.priority === 'High' ? 'bg-error/10 text-error border-error/20' : scope.priority === 'Medium' ? 'bg-primary-container/10 text-primary-container border-primary-container/20' : 'bg-tertiary-fixed-dim/10 text-tertiary-fixed-dim border-tertiary-fixed-dim/20'}`}>
                    PRIORITY: {scope.priority || 'Normal'}
                  </span>
                </div>
                
                <h3 className="font-headline font-bold text-3xl mb-4 group-hover:text-primary transition-colors">{scope.title}</h3>
                
                <div className="font-mono text-sm text-outline mb-8 leading-relaxed flex-1 prose prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {scope.description}
                  </ReactMarkdown>
                </div>
                
                <div className="grid grid-cols-2 gap-4 border-t ghost-border pt-6 mt-4">
                  <div>
                    <div className="font-mono text-[10px] text-outline mb-1">PROPOSED DATE</div>
                    <div className="font-mono text-xs text-on-surface">
                      {scope.proposed_date ? new Date(scope.proposed_date).toLocaleDateString() : 'TBD'}
                    </div>
                  </div>
                  
                  {scope.reference_link && (() => {
                    try {
                      // Attempt to parse as array first
                      const links = JSON.parse(scope.reference_link);
                      if (Array.isArray(links) && links.length > 0) {
                        return (
                          <div className="col-span-2 mt-2">
                            <div className="font-mono text-[10px] text-outline mb-2">REFERENCE LINKS</div>
                            <ul className="space-y-1">
                              {links.map((link, idx) => (
                                <li key={idx} className="truncate">
                                  <a href={link} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-primary-container hover:text-primary transition-colors">
                                    <span className="material-symbols-outlined text-[10px] mr-1 align-middle">link</span>
                                    {link}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      }
                      return null;
                    } catch (e) {
                      // Fallback to plain string if parse fails
                      if (scope.reference_link.trim()) {
                        return (
                          <div className="col-span-2 mt-2">
                            <div className="font-mono text-[10px] text-outline mb-2">REFERENCE LINK</div>
                            <div className="truncate">
                              <a href={scope.reference_link} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-primary-container hover:text-primary transition-colors">
                                <span className="material-symbols-outlined text-[10px] mr-1 align-middle">link</span>
                                {scope.reference_link}
                              </a>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }
                  })()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default FutureScopes;

