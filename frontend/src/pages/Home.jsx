import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Zap, UserCheck, ArrowRight, TrendingUp, Users, Activity, BarChart3, ChevronDown, Sparkles, Globe, Lock, Layers, Cpu, Wallet } from 'lucide-react';
import { getPrice, getPublicStats } from '../services/blockchain';
import './Home.css';

/* ═══════════════════════════════════════════
   HOOKS & UTILITIES
   ═══════════════════════════════════════════ */

/* Scroll-reveal: adds .reveal class when element enters viewport */
function useScrollReveal(threshold = 0.12) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.unobserve(el); } },
      { threshold, rootMargin: '0px 0px -40px 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

/* Typing animation */
function useTypingEffect(texts, speed = 80, pause = 2200) {
  const [display, setDisplay] = useState('');
  const [idx, setIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = texts[idx % texts.length];
    let timeout;
    if (!deleting && charIdx <= current.length) {
      timeout = setTimeout(() => {
        setDisplay(current.slice(0, charIdx));
        setCharIdx(c => c + 1);
      }, speed);
    } else if (!deleting && charIdx > current.length) {
      timeout = setTimeout(() => setDeleting(true), pause);
    } else if (deleting && charIdx > 0) {
      timeout = setTimeout(() => {
        setCharIdx(c => c - 1);
        setDisplay(current.slice(0, charIdx - 1));
      }, speed / 2);
    } else {
      setDeleting(false);
      setIdx(i => i + 1);
    }
    return () => clearTimeout(timeout);
  }, [charIdx, deleting, idx, texts, speed, pause]);

  return display;
}

/* Animated counter */
function AnimatedCounter({ end, suffix = '', prefix = '', duration = 2000 }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const num = typeof end === 'number' ? end : parseFloat(end) || 0;
        if (num === 0) { setVal(0); return; }
        const startTime = performance.now();
        const step = (now) => {
          const t = Math.min((now - startTime) / duration, 1);
          const ease = 1 - Math.pow(1 - t, 4);
          setVal(Math.floor(ease * num));
          if (t < 1) requestAnimationFrame(step);
          else setVal(num);
        };
        requestAnimationFrame(step);
      }
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [end, duration]);
  return <span ref={ref}>{prefix}{val.toLocaleString()}{suffix}</span>;
}

/* ═══════════════════════════════════════════
   PARTICLE CANVAS — WebGL-like network
   ═══════════════════════════════════════════ */
function ParticleNetwork() {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;
    let w, h;

    const resize = () => {
      w = canvas.width = canvas.parentElement.offsetWidth;
      h = canvas.height = canvas.parentElement.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const PARTICLE_COUNT = 80;
    const CONNECTION_DIST = 150;
    const MOUSE_DIST = 200;

    const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
      r: Math.random() * 2.5 + 1,
      baseO: Math.random() * 0.6 + 0.2,
      pulseSpeed: Math.random() * 0.02 + 0.01,
      pulseOffset: Math.random() * Math.PI * 2,
    }));

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const handleMouseLeave = () => { mouseRef.current = { x: -1000, y: -1000 }; };
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    let tick = 0;
    const draw = () => {
      tick++;
      ctx.clearRect(0, 0, w, h);
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      particles.forEach(p => {
        /* mouse repulsion */
        const dmx = p.x - mx;
        const dmy = p.y - my;
        const dm = Math.sqrt(dmx * dmx + dmy * dmy);
        if (dm < MOUSE_DIST && dm > 0) {
          const force = (MOUSE_DIST - dm) / MOUSE_DIST * 0.8;
          p.vx += (dmx / dm) * force * 0.3;
          p.vy += (dmy / dm) * force * 0.3;
        }

        /* velocity damping */
        p.vx *= 0.98;
        p.vy *= 0.98;

        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) { p.x = 0; p.vx *= -1; }
        if (p.x > w) { p.x = w; p.vx *= -1; }
        if (p.y < 0) { p.y = 0; p.vy *= -1; }
        if (p.y > h) { p.y = h; p.vy *= -1; }

        /* pulsing opacity */
        const pulse = Math.sin(tick * p.pulseSpeed + p.pulseOffset) * 0.3 + 0.7;
        const opacity = p.baseO * pulse;

        /* draw particle */
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(129,140,248,${opacity})`;
        ctx.fill();

        /* glow */
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
        grad.addColorStop(0, `rgba(129,140,248,${opacity * 0.3})`);
        grad.addColorStop(1, 'rgba(129,140,248,0)');
        ctx.fillStyle = grad;
        ctx.fill();
      });

      /* connection lines */
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < CONNECTION_DIST) {
            const a = 0.15 * (1 - d / CONNECTION_DIST);
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(129,140,248,${a})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      /* mouse connection lines */
      if (mx > 0 && my > 0) {
        particles.forEach(p => {
          const dx = p.x - mx;
          const dy = p.y - my;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < MOUSE_DIST) {
            const a = 0.25 * (1 - d / MOUSE_DIST);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(mx, my);
            ctx.strokeStyle = `rgba(168,85,247,${a})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        });
      }

      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return <canvas ref={canvasRef} className="particle-canvas" />;
}

/* ═══════════════════════════════════════════
   FLOATING TOKEN — 3D CSS token
   ═══════════════════════════════════════════ */
function FloatingToken() {
  return (
    <div className="floating-token-wrapper">
      <div className="floating-token">
        <div className="token-face token-front">
          <span className="token-symbol">M</span>
          <div className="token-ring" />
        </div>
        <div className="token-face token-back">
          <span className="token-symbol-sm">MRT</span>
        </div>
      </div>
      <div className="token-shadow" />
    </div>
  );
}

/* ═══════════════════════════════════════════
   MARQUEE TICKER
   ═══════════════════════════════════════════ */
function Ticker({ items }) {
  const doubled = [...items, ...items];
  return (
    <div className="ticker-wrapper">
      <div className="ticker-track">
        {doubled.map((item, i) => (
          <div key={i} className="ticker-item">
            <span className="ticker-icon">{item.icon}</span>
            <span className="ticker-label">{item.label}</span>
            <span className="ticker-value">{item.value}</span>
            <span className="ticker-sep">|</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */
export default function Home() {
  const { t } = useI18n();
  const { isAuthenticated } = useAuth();
  const [price, setPrice] = useState(null);
  const [publicStats, setPublicStats] = useState(null);

  useEffect(() => {
    getPrice().then(res => {
      const data = res.data;
      setPrice(data.formatted ?? data.price ?? data);
    }).catch(() => {});
    getPublicStats().then(res => setPublicStats(res.data)).catch(() => {});
  }, []);

  const typingTexts = useMemo(() => [
    t('home.heroHighlight'),
    'Web3',
    'Blockchain',
    'DeFi',
  ], [t]);
  const typedText = useTypingEffect(typingTexts, 90, 2000);

  const features = [
    { icon: <Shield size={28} />, title: t('home.feature1Title'), desc: t('home.feature1Desc'), color: 'blue' },
    { icon: <TrendingUp size={28} />, title: t('home.feature2Title'), desc: t('home.feature2Desc'), color: 'purple' },
    { icon: <UserCheck size={28} />, title: t('home.feature3Title'), desc: t('home.feature3Desc'), color: 'green' },
    { icon: <Zap size={28} />, title: t('home.feature4Title'), desc: t('home.feature4Desc'), color: 'orange' },
  ];

  const stats = [
    { icon: <TrendingUp size={22} />, label: t('home.statsPrice'), numericEnd: price, suffix: ' TRY' },
    { icon: <BarChart3 size={22} />, label: t('home.statsVolume'), numericEnd: publicStats?.volume24h, suffix: ' TRY' },
    { icon: <Users size={22} />, label: t('home.statsUsers'), numericEnd: publicStats?.activeUsers, suffix: '' },
    { icon: <Activity size={22} />, label: t('home.statsTx'), numericEnd: publicStats?.totalTransactions, suffix: '' },
  ];

  const tickerItems = [
    { icon: '📈', label: t('home.statsPrice'), value: price != null ? `${price} TRY` : '—' },
    { icon: '📊', label: t('home.statsVolume'), value: publicStats?.volume24h != null ? `${Number(publicStats.volume24h).toLocaleString()} TRY` : '—' },
    { icon: '👥', label: t('home.statsUsers'), value: publicStats?.activeUsers != null ? publicStats.activeUsers.toLocaleString() : '—' },
    { icon: '⚡', label: t('home.statsTx'), value: publicStats?.totalTransactions != null ? publicStats.totalTransactions.toLocaleString() : '—' },
    { icon: '🔗', label: 'Blockchain', value: 'Ethereum' },
    { icon: '🪙', label: 'Token', value: 'MRT (ERC-20)' },
  ];

  const steps = [
    { num: '01', icon: <Wallet size={28} />, title: t('home.step1Title'), desc: t('home.step1Desc'), color: 'blue' },
    { num: '02', icon: <UserCheck size={28} />, title: t('home.step2Title'), desc: t('home.step2Desc'), color: 'purple' },
    { num: '03', icon: <Layers size={28} />, title: t('home.step3Title'), desc: t('home.step3Desc'), color: 'green' },
    { num: '04', icon: <TrendingUp size={28} />, title: t('home.step4Title'), desc: t('home.step4Desc'), color: 'orange' },
  ];

  const techStack = [
    { icon: <Cpu size={20} />, label: 'Solidity' },
    { icon: <Layers size={20} />, label: 'Hardhat' },
    { icon: <Globe size={20} />, label: 'React' },
    { icon: <Lock size={20} />, label: 'JWT Auth' },
    { icon: <Sparkles size={20} />, label: 'ERC-20' },
    { icon: <Shield size={20} />, label: 'KYC Oracle' },
  ];

  const [statsRef, statsVisible] = useScrollReveal(0.15);
  const [featRef, featVisible] = useScrollReveal(0.1);
  const [stepsRef, stepsVisible] = useScrollReveal(0.1);
  const [techRef, techVisible] = useScrollReveal(0.15);
  const [ctaRef, ctaVisible] = useScrollReveal(0.15);

  return (
    <div className="home">

      {/* ════════ HERO ════════ */}
      <section className="hero">
        <ParticleNetwork />
        <div className="hero-bg">
          <div className="hero-orb hero-orb-1" />
          <div className="hero-orb hero-orb-2" />
          <div className="hero-orb hero-orb-3" />
          <div className="hero-grid-lines" />
        </div>

        <div className="container hero-content">
          <div className="hero-layout">
            <div className="hero-text">
              <div className="hero-badge animate-fadeIn">
                <span className="hero-badge-dot" />
                <Sparkles size={14} />
                <span>MERT Token — ERC-20</span>
              </div>
              <h1 className="hero-title animate-fadeIn delay-100">
                {t('home.heroTitle')}<br />
                <span className="text-gradient hero-title-glow">
                  {typedText}<span className="typing-cursor">|</span>
                </span>
              </h1>
              <p className="hero-desc animate-fadeIn delay-200">{t('home.heroDesc')}</p>
              <div className="hero-actions animate-fadeIn delay-300">
                <Link to="/trade" className="btn btn-hero-primary btn-lg">
                  <span>{t('home.startTrading')}</span>
                  <ArrowRight size={18} />
                  <div className="btn-shine" />
                </Link>
                <Link to="/dashboard" className="btn btn-hero-outline btn-lg">
                  <span>{t('dashboard.title')}</span>
                </Link>
              </div>
            </div>
            <div className="hero-visual animate-fadeIn delay-200">
              <FloatingToken />
            </div>
          </div>
          <div className="hero-scroll-indicator animate-fadeIn delay-400">
            <span className="scroll-text">{t('home.scrollDown')}</span>
            <ChevronDown size={18} className="scroll-bounce" />
          </div>
        </div>
      </section>

      {/* ════════ TICKER ════════ */}
      <div className="ticker-section">
        <Ticker items={tickerItems} />
      </div>

      {/* ════════ LIVE STATS ════════ */}
      <section className="stats-section" ref={statsRef}>
        <div className="container">
          <div className="stats-grid">
            {stats.map((s, i) => (
              <div key={i}
                className={`stat-card ${statsVisible ? 'reveal' : ''}`}
                style={{ transitionDelay: `${i * 0.1}s` }}>
                <div className="stat-card-glow" />
                <div className="stat-icon">{s.icon}</div>
                <div className="stat-value">
                  {s.numericEnd != null
                    ? <AnimatedCounter end={Number(s.numericEnd)} suffix={s.suffix} />
                    : '—'
                  }
                </div>
                <div className="stat-label">{s.label}</div>
                <div className="stat-pulse" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ FEATURES ════════ */}
      <section className="features-section" ref={featRef}>
        <div className="container">
          <div className="section-header">
            <span className={`section-overline ${featVisible ? 'reveal' : ''}`}>
              <Lock size={14} /> Web3 Powered
            </span>
            <h2 className={`section-title ${featVisible ? 'reveal' : ''}`}>{t('home.learnMore')}</h2>
          </div>
          <div className="features-grid">
            {features.map((f, i) => (
              <div key={i}
                className={`feature-card feature-${f.color} ${featVisible ? 'reveal' : ''}`}
                style={{ transitionDelay: `${i * 0.12 + 0.15}s` }}>
                <div className="feature-card-border" />
                <div className="feature-icon">{f.icon}</div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.desc}</p>
                <div className="feature-number">0{i + 1}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ HOW IT WORKS ════════ */}
      <section className="steps-section" ref={stepsRef}>
        <div className="container">
          <div className="section-header">
            <span className={`section-overline ${stepsVisible ? 'reveal' : ''}`}>
              <Layers size={14} /> {t('home.howItWorksOverline')}
            </span>
            <h2 className={`section-title ${stepsVisible ? 'reveal' : ''}`}>{t('home.howItWorks')}</h2>
          </div>
          <div className="steps-grid">
            {steps.map((step, i) => (
              <div key={i}
                className={`step-card ${stepsVisible ? 'reveal' : ''}`}
                style={{ transitionDelay: `${i * 0.15 + 0.1}s` }}>
                <div className="step-number">{step.num}</div>
                <div className={`step-icon step-icon-${step.color}`}>{step.icon}</div>
                <h3 className="step-title">{step.title}</h3>
                <p className="step-desc">{step.desc}</p>
                {i < steps.length - 1 && <div className="step-connector" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ TECH STACK ════════ */}
      <section className="tech-section" ref={techRef}>
        <div className="container">
          <div className="section-header">
            <span className={`section-overline ${techVisible ? 'reveal' : ''}`}>
              <Cpu size={14} /> {t('home.techOverline')}
            </span>
            <h2 className={`section-title ${techVisible ? 'reveal' : ''}`}>{t('home.techTitle')}</h2>
          </div>
          <div className="tech-grid">
            {techStack.map((tech, i) => (
              <div key={i}
                className={`tech-card ${techVisible ? 'reveal' : ''}`}
                style={{ transitionDelay: `${i * 0.08 + 0.1}s` }}>
                <div className="tech-icon">{tech.icon}</div>
                <span className="tech-label">{tech.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ CTA ════════ */}
      {!isAuthenticated && (
        <section className="cta-section" ref={ctaRef}>
          <div className="container">
            <div className={`cta-card ${ctaVisible ? 'reveal' : ''}`}>
              <div className="cta-bg">
                <div className="hero-orb hero-orb-1" />
                <div className="hero-orb hero-orb-2" />
                <div className="cta-grid-lines" />
              </div>
              <div className="cta-content">
                <Globe size={44} className="cta-globe" />
                <h2 className="cta-title">{t('home.ctaTitle')}</h2>
                <p className="cta-desc">{t('home.ctaDesc')}</p>
                <Link to="/trade" className="btn btn-cta btn-lg">
                  <span>{t('home.startTrading')}</span>
                  <ArrowRight size={18} />
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
