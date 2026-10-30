import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { KoiPond, type FishType, type KoiPondHandle, type PondStats, type PondTheme } from './components/KoiPond';
import componentSource from './components/KoiPond.tsx?raw';
import './styles.css';

type FishPresetId = 'mixed-koi' | 'mixed-pond' | 'custom' | FishType;
const FISH_PRESETS: { id: FishPresetId; label: string; types: readonly FishType[]; description: string }[] = [
  { id: 'mixed-koi', label: 'Mixed koi', types: ['kohaku', 'sanke', 'tancho', 'showa'], description: 'Four classic koi patterns.' },
  { id: 'mixed-pond', label: 'Mixed pond', types: ['kohaku', 'sanke', 'tancho', 'showa', 'goldfish', 'betta'], description: 'A little bit of everything.' },
  { id: 'custom', label: 'Custom mix', types: ['kohaku', 'goldfish'], description: 'Choose one or more fish below.' },
  { id: 'kohaku', label: 'Kohaku koi', types: ['kohaku'], description: 'White koi with red markings.' },
  { id: 'sanke', label: 'Sanke koi', types: ['sanke'], description: 'Red, white and black markings.' },
  { id: 'tancho', label: 'Tancho koi', types: ['tancho'], description: 'A single red crown on white.' },
  { id: 'showa', label: 'Showa koi', types: ['showa'], description: 'Dark koi with red and white patches.' },
  { id: 'goldfish', label: 'Goldfish', types: ['goldfish'], description: 'Golden scales and a round fan tail.' },
  { id: 'betta', label: 'Blue betta', types: ['betta'], description: 'Cool blue tones and flowing fins.' },
];
const CUSTOM_FISH_OPTIONS: { id: FishType; label: string; color: string }[] = [
  { id: 'kohaku', label: 'Kohaku', color: '#cf8058' },
  { id: 'sanke', label: 'Sanke', color: '#a7776c' },
  { id: 'tancho', label: 'Tancho', color: '#d5cfc4' },
  { id: 'showa', label: 'Showa', color: '#76707a' },
  { id: 'goldfish', label: 'Goldfish', color: '#d99a49' },
  { id: 'betta', label: 'Betta', color: '#6b9eb1' },
];

type IconName = 'code' | 'arrow' | 'sun' | 'moon' | 'plus' | 'minus' | 'reset' | 'pause' | 'play' | 'cursor' | 'ripple' | 'chevron' | 'download' | 'copy' | 'check' | 'close';

function Icon({ name, size = 16, className }: { name: IconName; size?: number; className?: string }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.55, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true as const, className };
  const paths: Record<IconName, ReactNode> = {
    code: <><path d="m8 8-4 4 4 4"/><path d="m16 8 4 4-4 4"/><path d="m14 5-4 14"/></>,
    arrow: <><path d="M5 12h14"/><path d="m14 7 5 5-5 5"/></>,
    sun: <><circle cx="12" cy="12" r="3.75"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></>,
    moon: <path d="M20.5 14.1A8.3 8.3 0 0 1 9.9 3.5a8.4 8.4 0 1 0 10.6 10.6Z"/>,
    plus: <><path d="M12 5v14"/><path d="M5 12h14"/></>,
    minus: <path d="M5 12h14"/>,
    reset: <><path d="M4.5 11a7.5 7.5 0 1 1 1.8 5.3"/><path d="M4.5 5.5V11h5.4"/></>,
    pause: <><path d="M9 5v14"/><path d="M15 5v14"/></>,
    play: <path d="m8 5 11 7-11 7Z"/>,
    cursor: <><path d="m5 3 12.3 10.3-5.7.5-2.6 5.1L5 3Z"/><path d="m12 14 3 6"/></>,
    ripple: <><path d="M12 3v3"/><path d="M8.5 5.5 12 2l3.5 3.5"/><ellipse cx="12" cy="15.5" rx="8" ry="3.5"/><path d="M6.5 12.9a5.5 2.3 0 0 1 11 0"/></>,
    chevron: <path d="m7 10 5 5 5-5"/>,
    download: <><path d="M12 3v11"/><path d="m8 10 4 4 4-4"/><path d="M5 17v3h14v-3"/></>,
    copy: <><rect x="8" y="8" width="11" height="12" rx="1.5"/><path d="M16 8V5a1.5 1.5 0 0 0-1.5-1.5h-9A1.5 1.5 0 0 0 4 5v10A1.5 1.5 0 0 0 5.5 16H8"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    close: <><path d="M5 5l14 14"/><path d="M19 5 5 19"/></>,
  };
  return <svg {...common}>{paths[name]}</svg>;
}

function PondMark() {
  return (
    <svg className="pond-mark" width="33" height="33" viewBox="0 0 33 33" fill="none" aria-hidden="true">
      <circle cx="16.5" cy="16.5" r="15.75" stroke="currentColor" opacity=".53"/>
      <path d="M6.5 16.3c3.4-5.1 8.3-6 13.5-2.1l5.4-3.2-1.3 5.4 1.3 5.3-5.4-3.2c-5.2 3.9-10.1 3-13.5-2.2Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/>
      <path d="M14 12.6c1.2 2.5 1.2 5.1 0 7.6" stroke="currentColor" strokeWidth="1.1"/>
      <circle cx="10.6" cy="15.7" r=".75" fill="currentColor"/>
    </svg>
  );
}

function FishSwatch({ preset }: { preset: FishPresetId }) {
  const rows = ['..####..#.', '.#######.#', '#########.', '.#######.#', '..####..#.'];
  const color = (x: number, y: number) => {
    if (x === 1 && y === 2) return '#312e30';
    if (preset === 'goldfish') return x > 3 && x < 6 ? '#edbc68' : '#cf8238';
    if (preset === 'betta') return x > 4 ? '#7686a4' : '#6b9eb1';
    if (preset === 'tancho') return x === 2 && y < 3 ? '#d17a50' : '#d4d0c6';
    if (preset === 'showa') return x < 3 || x > 6 ? '#5f5a5d' : x < 5 ? '#ca7651' : '#c5c1b8';
    if (preset === 'sanke' && x === 5 && y === 3) return '#555055';
    if ((preset === 'mixed-pond' || preset === 'custom') && x > 6) return '#7b9ca8';
    return (x > 1 && x < 4) || x === 6 ? '#cf8058' : '#d1cbc0';
  };
  return <svg className="fish-swatch" viewBox="0 0 30 15" width="32" height="18" aria-hidden="true">
    {rows.flatMap((row, y) => [...row].map((cell, x) => cell === '#' ? <rect key={`${x}-${y}`} x={x * 3} y={y * 3} width="2.5" height="2.5" fill={color(x, y)}/> : null))}
  </svg>;
}

function App() {
  const pondRef = useRef<KoiPondHandle>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const [theme, setTheme] = useState<PondTheme>('dark');
  const [fishPreset, setFishPreset] = useState<FishPresetId>('mixed-koi');
  const [customFishTypes, setCustomFishTypes] = useState<FishType[]>(['kohaku', 'goldfish']);
  const [count, setCount] = useState(6);
  const [lotusCount, setLotusCount] = useState(3);
  const [speed, setSpeed] = useState(1);
  const [interactive, setInteractive] = useState(true);
  const [paused, setPaused] = useState(false);
  const [stats, setStats] = useState<PondStats>({ koi: 6, pellets: 0 });
  const [panelOpen, setPanelOpen] = useState(() => typeof window === 'undefined' || window.innerWidth > 720);
  const [codeOpen, setCodeOpen] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  const selectedPreset = FISH_PRESETS.find((preset) => preset.id === fishPreset) ?? FISH_PRESETS[0];
  const selectedFishTypes = fishPreset === 'custom' ? customFishTypes : selectedPreset.types;
  const fishTypesExample = `[${selectedFishTypes.map((type) => `'${type}'`).join(', ')}]`;
  const snippet = `import { KoiPond } from './KoiPond';\n\nexport default function Page() {\n  return (\n    <KoiPond\n      fishCount={${count}}\n      fishTypes={${fishTypesExample}}\n      lotusCount={${lotusCount}}\n      speed={${speed.toFixed(1)}}\n      theme="${theme}"\n      interactive={${interactive}}\n      style={{ height: '100vh' }}\n    >\n      <main data-pond-avoid>\n        Your content goes here.\n      </main>\n    </KoiPond>\n  );\n}`;

  useEffect(() => {
    if (!codeOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setCodeOpen(false);
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]'));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); previous?.focus(); };
  }, [codeOpen]);

  useEffect(() => {
    if (copyState === 'idle') return;
    const id = window.setTimeout(() => setCopyState('idle'), 2400);
    return () => window.clearTimeout(id);
  }, [copyState]);

  const copyUsage = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard not available');
      await navigator.clipboard.writeText(snippet);
      setCopyState('copied');
    } catch {
      // The preview can run in a restricted iframe; fall back to a temporary textarea.
      const textarea = document.createElement('textarea');
      textarea.value = snippet;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      let copied = false;
      try { copied = document.execCommand('copy'); } catch { /* Restricted clipboard. */ }
      textarea.remove();
      setCopyState(copied ? 'copied' : 'failed');
    }
  };

  const downloadComponent = () => {
    const url = URL.createObjectURL(new Blob([componentSource], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'KoiPond.tsx';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const toggleCustomFish = (type: FishType) => {
    setCustomFishTypes((current) => {
      if (current.includes(type) && current.length === 1) return current;
      const next = current.includes(type) ? current.filter((item) => item !== type) : [...current, type];
      return CUSTOM_FISH_OPTIONS.map((option) => option.id).filter((item) => next.includes(item));
    });
  };

  const reset = () => {
    setTheme('dark');
    setFishPreset('mixed-koi');
    setCustomFishTypes(['kohaku', 'goldfish']);
    setCount(6);
    setLotusCount(3);
    setSpeed(1);
    setInteractive(true);
    setPaused(false);
    pondRef.current?.reset();
  };

  return (
    <KoiPond
      ref={pondRef}
      className={`pond-app ${theme}`}
      fishCount={count}
      fishTypes={selectedFishTypes}
      lotusCount={lotusCount}
      speed={speed}
      theme={theme}
      interactive={interactive}
      paused={paused}
      onStatsChange={setStats}
    >
      <div className="app-shell">
        <header className="topbar" data-pond-ignore>
          <div className="identity" data-pond-avoid>
            <PondMark />
            <div className="identity-copy">
              <span>KOI POND</span>
              <small>A LITTLE CANVAS EXPERIMENT</small>
            </div>
          </div>
          <div className="top-actions" data-pond-avoid>
            <span className="live-tag"><i/> LIVE PREVIEW</span>
            <button className="code-trigger" onClick={() => setCodeOpen(true)}>
              <Icon name="code" size={17} /> <span>Get component</span> <Icon name="arrow" size={14}/>
            </button>
          </div>
        </header>

        <main className="hero-copy" data-pond-avoid data-pond-ignore>
          <div className="eyebrow"><span/> A LITTLE SPACE TO BREATHE</div>
          <h1>Make room for<br/><em>stillness.</em></h1>
          <p>A little pond that moves with you.<br/>Take a moment. Stay a while.</p>
          <div className="hero-action-row">
            <button className="feed-button" onClick={() => pondRef.current?.feed()} disabled={reducedMotion} title={reducedMotion ? 'Feeding is unavailable while reduced motion is enabled' : undefined}>
              <Icon name="ripple" size={17}/>
              <span>Feed the fish</span>
              <Icon name="arrow" size={15}/>
            </button>
            <span className="or-click">{reducedMotion ? <>reduced motion<br/>is enabled</> : <>or click anywhere<br/>in the water</>}</span>
          </div>
          <div className="hero-hints">
            {reducedMotion ? <span><Icon name="pause" size={14}/> MOTION REDUCED IN SYSTEM SETTINGS</span> : <>
              <span><Icon name="cursor" size={14}/> MOVE TO ATTRACT</span>
              <span className="hint-divider"/>
              <span><Icon name="ripple" size={15}/> CLICK TO FEED</span>
            </>}
          </div>
        </main>

        <aside className={`settings ${panelOpen ? 'is-open' : 'is-closed'}`} data-pond-avoid data-pond-ignore aria-label="Pond settings">
          <div className="settings-heading">
            <div>
              <div className="panel-kicker"><span/> MAKE IT YOURS</div>
              <h2>Pond settings</h2>
            </div>
            <div className="panel-heading-actions">
              <button className="icon-button reset-button" onClick={reset} title="Reset pond and settings" aria-label="Reset pond and settings"><Icon name="reset" size={16}/></button>
              <button className="icon-button disclosure" onClick={() => setPanelOpen(!panelOpen)} aria-expanded={panelOpen} aria-controls="settings-body" aria-label={panelOpen ? 'Collapse settings' : 'Expand settings'}><Icon name="chevron" size={16}/></button>
            </div>
          </div>
          {panelOpen && (
            <div id="settings-body" className="settings-body">
              <div className="settings-rule"/>
              <div className="control-group fish-group">
                <div className="control-label"><label htmlFor="fish-type">Fish style</label><span className="control-detail">9 CHOICES</span></div>
                <div className="fish-select-wrap">
                  <FishSwatch preset={fishPreset}/>
                  <select id="fish-type" value={fishPreset} onChange={(event) => setFishPreset(event.target.value as FishPresetId)} aria-describedby="fish-description">
                    {FISH_PRESETS.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}
                  </select>
                  <Icon name="chevron" size={14} className="fish-select-chevron"/>
                </div>
                <div id="fish-description" className="fish-description">{selectedPreset.description}</div>
                {fishPreset === 'custom' && <>
                  <div className="fish-mix-options" role="group" aria-label="Fish in custom mix">
                    {CUSTOM_FISH_OPTIONS.map((fish) => {
                      const selected = customFishTypes.includes(fish.id);
                      const isLast = selected && customFishTypes.length === 1;
                      return <button key={fish.id} className={selected ? 'selected' : ''} aria-pressed={selected}
                        disabled={isLast} title={isLast ? 'Choose at least one fish style' : undefined}
                        onClick={() => toggleCustomFish(fish.id)}>
                        <span className="fish-mix-dot" style={{ backgroundColor: fish.color }}/>
                        <span>{fish.label}</span>
                        {selected && <Icon name="check" size={11}/>}
                      </button>;
                    })}
                  </div>
                  {count < selectedFishTypes.length && <div className="fish-mix-hint" role="status">Increase the fish count to see every style.</div>}
                </>}
              </div>
              <div className="control-group">
                <div className="control-label"><span>Appearance</span><span className="control-detail">THEME</span></div>
                <div className="theme-select" aria-label="Appearance">
                  <button className={theme === 'dark' ? 'selected' : ''} onClick={() => setTheme('dark')} aria-pressed={theme === 'dark'}><Icon name="moon" size={15}/> Dark</button>
                  <button className={theme === 'light' ? 'selected' : ''} onClick={() => setTheme('light')} aria-pressed={theme === 'light'}><Icon name="sun" size={15}/> Light</button>
                </div>
              </div>
              <div className="control-group count-group">
                <div className="control-label"><span>Fish in the pond</span><span className="control-value">{String(count).padStart(2, '0')}</span></div>
                <div className="count-control">
                  <button className="step-button" onClick={() => setCount((n) => Math.max(1, n - 1))} disabled={count <= 1} aria-label="Remove a fish"><Icon name="minus" size={15}/></button>
                  <div className="count-dots" aria-hidden="true">{Array.from({ length: 12 }, (_, i) => <span key={i} className={i < count ? 'filled' : ''}/>)}</div>
                  <button className="step-button" onClick={() => setCount((n) => Math.min(12, n + 1))} disabled={count >= 12} aria-label="Add a fish"><Icon name="plus" size={15}/></button>
                </div>
              </div>
              <div className="control-group lotus-group">
                <div className="control-label"><span>Lotus flowers</span><span className="control-value lotus-value">{String(lotusCount).padStart(2, '0')}</span></div>
                <div className="count-control">
                  <button className="step-button" onClick={() => setLotusCount((n) => Math.max(0, n - 1))} disabled={lotusCount <= 0} aria-label="Remove a lotus"><Icon name="minus" size={15}/></button>
                  <div className="count-dots lotus-dots" aria-hidden="true">{Array.from({ length: 8 }, (_, i) => <span key={i} className={i < lotusCount ? 'filled' : ''}/>)}</div>
                  <button className="step-button" onClick={() => setLotusCount((n) => Math.min(8, n + 1))} disabled={lotusCount >= 8} aria-label="Add a lotus"><Icon name="plus" size={15}/></button>
                </div>
                <div className="lotus-caption">Flowers with floating lily pads</div>
              </div>
              <div className="control-group speed-group">
                <div className="control-label"><label htmlFor="swim-speed">Swim speed</label><span className="control-value">{speed.toFixed(1)}×</span></div>
                <input id="swim-speed" type="range" min="0.5" max="1.8" step="0.1" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} style={{ '--range-progress': `${((speed - .5) / 1.3) * 100}%` } as CSSProperties}/>
                <div className="range-caption"><span>SLOW &amp; EASY</span><span>A LITTLE LIVELIER</span></div>
              </div>
              <div className="settings-rule lower-rule"/>
              <div className="interaction-row">
                <div><span>Interaction</span><small>{reducedMotion ? 'Unavailable with reduced motion' : 'Follow cursor & click to feed'}</small></div>
                <button className={`switch ${interactive ? 'on' : ''}`} role="switch" aria-checked={interactive} aria-label="Pond interaction" disabled={reducedMotion} onClick={() => setInteractive(!interactive)}><span/></button>
              </div>
              <div className="panel-bottom">
                <div className="pond-status"><span className={paused || reducedMotion ? 'paused-dot' : ''}/>{reducedMotion ? 'REDUCED MOTION' : paused ? 'PAUSED' : 'POND IS ALIVE'}</div>
                <button className="motion-button" onClick={() => setPaused(!paused)} disabled={reducedMotion} aria-label={paused ? 'Resume animation' : 'Pause animation'} title={reducedMotion ? 'Animation is off in your system settings' : paused ? 'Resume animation' : 'Pause animation'}><Icon name={paused ? 'play' : 'pause'} size={14}/><span>{paused ? 'Resume' : 'Pause'}</span></button>
              </div>
            </div>
          )}
        </aside>

        <footer className="footer" data-pond-ignore>
          <div className="footer-left" data-pond-avoid><span className="footer-cross">✳</span> A SMALL MOMENT, JUST FOR YOU <span className="footer-index">/ 001</span></div>
          <div className="footer-right" data-pond-avoid>
            <span className="footer-stats"><b>{String(stats.koi).padStart(2, '0')}</b> FISH <i/> <b>{String(stats.pellets).padStart(2, '0')}</b> FOOD</span>
            <a href="https://www.daoho.dev/" target="_blank" rel="noreferrer">INSPIRED BY DAO HO <span>↗</span></a>
          </div>
        </footer>
      </div>

      {codeOpen && (
        <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setCodeOpen(false); }} data-pond-ignore>
          <section ref={dialogRef} className="code-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" aria-describedby="modal-description">
            <div className="modal-topline"><span><i/> THE COMPONENT</span><button ref={closeRef} className="modal-close icon-button" onClick={() => setCodeOpen(false)} aria-label="Close component dialog"><Icon name="close" size={18}/></button></div>
            <h2 id="modal-title">A pond of your own.</h2>
            <p id="modal-description">One React component. No images or canvas libraries. Drop it in and make it yours.</p>
            <div className="code-card">
              <div className="code-card-header"><span><span className="code-file-dot"/> Example.tsx</span><span>REACT + TYPESCRIPT</span></div>
              <pre><code>{snippet}</code></pre>
            </div>
            <p className="modal-note">Tip: add <code>data-pond-avoid</code> to content the fish should swim around.</p>
            <div className="modal-actions">
              <button className="download-button" onClick={downloadComponent}><Icon name="download" size={16}/> Download KoiPond.tsx</button>
              <button className="copy-button" onClick={copyUsage}><Icon name={copyState === 'copied' ? 'check' : 'copy'} size={15}/>{copyState === 'copied' ? 'Copied!' : copyState === 'failed' ? 'Copy unavailable' : 'Copy usage'}</button>
            </div>
            <div className="modal-footer">Made with React &amp; Canvas <span>·</span> Inspired by <a href="https://www.daoho.dev/" target="_blank" rel="noreferrer">Dao Ho ↗</a></div>
          </section>
        </div>
      )}
    </KoiPond>
  );
}

export default App;
