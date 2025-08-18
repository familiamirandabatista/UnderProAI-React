import React, { useState, useEffect } from 'react';
// A principal mudança está aqui: Usamos HashRouter para compatibilidade com GitHub Pages
import { HashRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { FaHome, FaChartLine, FaBroadcastTower, FaCrown, FaHistory } from 'react-icons/fa';


// Registro dos componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// --- FUNÇÃO DE ROLAGEM SUAVE COM ACELERAÇÃO ---
const smoothScrollToTop = (duration) => {
  const start = window.pageYOffset;
  const startTime = 'now' in window.performance ? performance.now() : new Date().getTime();

  const easeInOutQuad = (t, b, c, d) => {
    t /= d / 2;
    if (t < 1) return c / 2 * t * t + b;
    t--;
    return -c / 2 * (t * (t - 2) - 1) + b;
  };

  const scroll = () => {
    const now = 'now' in window.performance ? performance.now() : new Date().getTime();
    const time = Math.min(1, ((now - startTime) / duration));
    const timeFunction = easeInOutQuad(time, 0, 1, 1);
    window.scrollTo(0, Math.ceil((timeFunction * (0 - start)) + start));

    if (window.pageYOffset === 0) {
      return;
    }

    requestAnimationFrame(scroll);
  };

  scroll();
};


// --- SIMULAÇÃO DO FIREBASE (PARA DESENVOLVIMENTO) ---
const mockAuth = {
  currentUser: null,
  users: new Map([
    ['teste@underpro.ai', { password: 'password123', name: 'Usuário Teste' }]
  ]),

  onAuthStateChanged: (callback) => {
    const userStr = sessionStorage.getItem('underproUser');
    const user = userStr ? JSON.parse(userStr) : null;
    mockAuth.currentUser = user;
    callback(user);
    return () => {};
  },

  signInWithEmailAndPassword: (email, password) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (mockAuth.users.has(email) && mockAuth.users.get(email).password === password) {
          const user = { email, name: mockAuth.users.get(email).name, uid: 'mock-uid-123' };
          sessionStorage.setItem('underproUser', JSON.stringify(user));
          mockAuth.currentUser = user;
          window.dispatchEvent(new Event('authChanged'));
          resolve({ user });
        } else {
          reject({ code: 'auth/invalid-credential', message: 'E-mail ou senha incorretos.' });
        }
      }, 500);
    });
  },

  createUserWithEmailAndPassword: (email, password) => {
     return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (mockAuth.users.has(email)) {
          reject({ code: 'auth/email-already-in-use', message: 'Este e-mail já está em uso.' });
        } else {
          const user = { email, name: 'Novo Usuário', uid: `mock-uid-${Date.now()}` };
          mockAuth.users.set(email, { password, name: 'Novo Usuário' });
          resolve({ user });
        }
      }, 500);
    });
  },
  
  sendPasswordResetEmail: (email) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (mockAuth.users.has(email)) {
          resolve();
        } else {
          resolve();
        }
      }, 500);
    });
  },

  signOut: () => {
    return new Promise(resolve => {
      sessionStorage.removeItem('underproUser');
      mockAuth.currentUser = null;
      window.dispatchEvent(new Event('authChanged'));
      resolve();
    });
  },
};


// --- CONTEXTO DE AUTENTICAÇÃO ---
const AuthContext = React.createContext(null);

const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const handleAuthChange = () => {
            mockAuth.onAuthStateChanged(currentUser => {
                setUser(currentUser);
                setLoading(false);
            });
        };
        
        handleAuthChange();
        window.addEventListener('authChanged', handleAuthChange);
        return () => window.removeEventListener('authChanged', handleAuthChange);
    }, []);
    
    const value = { user, loading };
    return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};

const useAuth = () => React.useContext(AuthContext);

// --- COMPONENTES PRINCIPAIS (HEADER, FOOTER, LAYOUT) ---

function Header() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = async () => {
        await mockAuth.signOut();
        navigate('/');
    };

    const scrollToSection = (sectionId) => {
        if (location.pathname !== '/') {
            navigate('/#'); // Navega para a raiz do HashRouter
        }
        setTimeout(() => {
            const section = document.getElementById(sectionId);
            if (section) {
                section.scrollIntoView({ behavior: 'smooth' });
            }
        }, 100);
    };

    const handleHomeClick = (e) => {
        e.preventDefault();
        if (location.pathname === '/') {
            smoothScrollToTop(800);
        } else {
            navigate('/');
        }
    };

    return (
        <header id="main-header">
            <div className="container">
                <Link to="/">
                    <img src={process.env.PUBLIC_URL + '/images/logo.png'} alt="UnderPro AI Logo" className="logo" />
                </Link>
                <nav id="main-nav">
                    <ul id="nav-links">
                        {user ? (
                            <>
                                <li><Link to="/dashboard">Dashboard</Link></li>
                                <li><Link to="/historico">Histórico</Link></li>
                                <li><Link to="/sinais-gratuitos">Sinais VIP</Link></li>
                                <li><button onClick={handleLogout} className="btn btn-logout">Sair</button></li>
                            </>
                        ) : (
                            <>
                                <li><Link to="/" className="nav-link-icon"><FaHome /> Home</Link></li>
                                <li><a href="/#strategy-section" onClick={(e) => { e.preventDefault(); scrollToSection('strategy-section'); }} className="nav-link-icon"><FaChartLine /> A Estratégia</a></li>
                                <li><Link to="/historico" className="nav-link-icon"><FaHistory /> Histórico</Link></li>
                                <li><Link to="/sinais-gratuitos" className="nav-link-icon"><FaBroadcastTower /> Sinais Gratuitos</Link></li>
                                <li>
                                    <Link to="/cadastro" className="vip-link">
                                        <FaCrown className="crown-icon" />
                                        Sinais VIP
                                    </Link>
                                </li>
                                <li><Link to="/login" className="btn btn-primary">Entrar</Link></li>
                            </>
                        )}
                    </ul>
                </nav>
            </div>
        </header>
    );
}

function Footer() {
    const footerBgStyle = {
        backgroundImage: `url('${process.env.PUBLIC_URL}/images/fundo-palavras.PNG')`
    };

    return (
        <footer>
            <div className="footer-background" style={footerBgStyle}></div>
            <div className="container">
                <p>&copy; {new Date().getFullYear()} UnderPro AI. Todos os direitos reservados.</p>
            </div>
        </footer>
    );
}

function Layout({ children }) {
    const location = useLocation();
    const authPaths = ['/login', '/cadastro', '/reset-password'];
    const isAuthPage = authPaths.includes(location.pathname);

    useEffect(() => {
        document.body.style.backgroundImage = `linear-gradient(rgba(18, 18, 18, 0.97), rgba(18, 18, 18, 0.97)), url('${process.env.PUBLIC_URL}/images/fundo-geometrico.png')`;
        document.body.style.backgroundAttachment = 'fixed';
        
        const handleScroll = () => {
            if (window.scrollY > 50) {
                document.body.classList.add('scrolled');
            } else {
                document.body.classList.remove('scrolled');
            }
        };
        window.addEventListener('scroll', handleScroll);
        handleScroll();

        return () => {
            window.removeEventListener('scroll', handleScroll);
            document.body.style.backgroundImage = '';
            document.body.style.backgroundAttachment = '';
        }
    }, []);

    return (
        <>
            <Header />
            <main className={isAuthPage ? 'auth-main' : ''}>{children}</main>
            <Footer />
        </>
    );
}

// --- PÁGINAS ---

function HomePage() {
    const heroStyle = {
        backgroundImage: `linear-gradient(rgba(18, 18, 18, 0.8), rgba(18, 18, 18, 1)), url('${process.env.PUBLIC_URL}/images/hero-background.png')`
    };

    return (
        <>
            <section id="home-hero" style={heroStyle}>
                <div className="container">
                    <h1>Aposte com Dados, Não com Achismos.</h1>
                    <p>A UnderPro AI utiliza inteligência artificial para analisar milhares de dados e encontrar as melhores oportunidades no mercado de apostas esportivas.</p>
                    <Link to="/cadastro" className="btn btn-primary">Criar Conta Gratuita</Link>
                </div>
            </section>
            
            <section id="features" className="section">
                <div className="container">
                    <h2 className="section-title">Uma Plataforma Completa</h2>
                    <p className="section-subtitle">Nós não entregamos apenas dicas. Oferecemos as ferramentas e o conhecimento para você se tornar um investidor esportivo de sucesso.</p>
                    <div className="features-grid">
                        <div className="feature-card">
                            <div className="icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20V10M18 20V4M6 20V16"/></svg></div>
                            <h3>Dados vs. Achismo</h3>
                            <p>Nossa IA analisa milhares de pontos de dados para identificar padrões que o olho humano não vê. Adeus, "feeling". Olá, estatística.</p>
                        </div>
                        <div className="feature-card">
                            <div className="icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg></div>
                            <h3>Transparência Total</h3>
                            <p>Mostramos nosso histórico de performance de forma agregada. Acreditamos que a confiança se constrói com resultados verificáveis.</p>
                            <Link to="/historico" className="btn btn-secondary" style={{marginTop: '20px'}}>Veja Agora Mesmo</Link>
                        </div>
                        <div className="feature-card">
                            <div className="icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
                            <h3>Educação Financeira</h3>
                            <p>Mais do que dicas, ensinamos gestão de banca e a mentalidade de longo prazo. Formamos investidores, não apostadores.</p>
                        </div>
                    </div>
                </div>
            </section>

            <section id="strategy-section" className="section">
                <div className="container">
                    <h2 className="section-title">A Estratégia Lucrativa por Trás dos Sinais</h2>
                    <p className="section-subtitle">Não se trata de sorte, mas de matemática. Nosso método foca em encontrar apostas de Valor Esperado Positivo (EV+), o segredo dos profissionais.</p>
                    <div className="strategy-content">
                        <div className="strategy-text">
                            <h3>O que é Valor Esperado Positivo (EV+)?</h3>
                            <p>Imagine uma moeda viciada que cai "cara" 60% das vezes, mas a casa de apostas paga como se a chance fosse de 50%. Apostar em "cara" repetidamente é uma decisão de EV+, pois, a longo prazo, a probabilidade está a seu favor.</p>
                            <p>Nossa IA faz exatamente isso: ela analisa milhares de dados para encontrar "moedas viciadas" no mercado – jogos onde a probabilidade de um resultado (como Menos de 3.5 Gols) é maior do que a odd oferecida sugere.</p>
                        </div>
                        <div className="strategy-text">
                            <h3>Como 80.7% de Acerto se Torna Lucro?</h3>
                            <p>Muitos apostadores buscam odds altas e acabam perdendo no longo prazo. Nossa estratégia foca em consistência. Com uma assertividade de 80.7% e uma odd média de 1.28, a matemática é simples:</p>
                            <p>A cada 100 apostas, acertamos cerca de 81. Ganhamos 81 vezes o lucro da odd e perdemos 19 vezes o valor apostado. O resultado final é um lucro consistente e previsível, transformando a aposta em um verdadeiro investimento.</p>
                        </div>
                    </div>
                </div>
            </section>

            <section id="testimonials" className="section">
                <div className="container">
                    <h2 className="section-title">O que nossos membros dizem</h2>
                    <p className="section-subtitle">A confiança da nossa comunidade é o nosso maior ativo.</p>
                    <div className="testimonials-grid">
                        <div className="testimonial-card">
                            <p>"Finalmente uma plataforma que trata apostas como investimento. A transparência e as ferramentas de gestão mudaram meu jogo completamente."</p>
                            <div className="testimonial-author">
                                <img src={process.env.PUBLIC_URL + '/images/foto-homem.png'} alt="Foto de João P." />
                                <div><h4>João P.</h4><span>Membro Premium</span></div>
                            </div>
                        </div>
                        <div className="testimonial-card">
                            <p>"Eu era cética no início, mas os resultados falam por si. A análise de dados da UnderPro AI é de outro nível. Recomendo fortemente."</p>
                            <div className="testimonial-author">
                                <img src={process.env.PUBLIC_URL + '/images/foto-mulher.png'} alt="Foto de Maria R." />
                                <div><h4>Maria R.</h4><span>Membro Premium</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section id="cta" className="section">
                <div className="container">
                    <h2 className="section-title">Pronto para Apostar com Inteligência?</h2>
                    <p className="section-subtitle">Junte-se a centenas de investidores esportivos que estão usando dados para transformar seus resultados. O acesso às dicas gratuitas é imediato.</p>
                    <Link to="/cadastro" className="btn btn-primary">Criar Conta Gratuita</Link>
                </div>
            </section>
        </>
    );
}

function LoginPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await mockAuth.signInWithEmailAndPassword(email, password);
            navigate('/dashboard');
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="auth-container">
            <h1>Bem-vindo de volta!</h1>
            <p>Acesse sua conta para continuar.</p>
            <form id="login-form" onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input type="email" id="email" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div className="form-group">
                    <label htmlFor="password">Senha</label>
                    <input type="password" id="password" value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
                <div className="forgot-password"><Link to="/reset-password">Esqueceu a senha?</Link></div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Entrar</button>
                {error && <p id="error-message" className="message error" style={{display: 'block'}}>{error}</p>}
            </form>
            <div className="divider">OU</div>
            <button id="google-login-btn" className="btn btn-google">
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google icon" />
                Entrar com Google
            </button>
            <div className="switch-auth">Não tem uma conta? <Link to="/cadastro">Cadastre-se</Link></div>
        </div>
    );
}

function RegisterPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [showVerification, setShowVerification] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await mockAuth.createUserWithEmailAndPassword(email, password);
            setShowVerification(true);
        } catch (err) {
            setError(err.message);
        }
    };

    if (showVerification) {
        return (
            <div className="auth-container" style={{textAlign: 'center'}}>
                 <h1 style={{ color: 'var(--color-success)' }}>Último Passo!</h1>
                <p>Sua conta foi criada. Para ativá-la, enviamos um link de confirmação para o seu e-mail. Por favor, verifique sua caixa de entrada (e a pasta de spam).</p>
                <Link to="/login" className="btn btn-primary" style={{ marginTop: '20px', width: 'auto' }}>Ir para a Página de Login</Link>
            </div>
        )
    }

    return (
        <div className="auth-container">
            <h1>Crie sua Conta</h1>
            <p>Comece a sua jornada como investidor esportivo.</p>
            <form id="register-form" onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="name">Nome Completo</label>
                    <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input type="email" id="email" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div className="form-group">
                    <label htmlFor="password">Senha (mínimo 6 caracteres)</label>
                    <input type="password" id="password" value={password} onChange={e => setPassword(e.target.value)} required minLength="6" />
                </div>
                {error && <p id="error-message" className="message error" style={{display: 'block'}}>{error}</p>}
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Criar Conta Gratuita</button>
            </form>
            <div className="divider">OU</div>
            <button id="google-login-btn" className="btn btn-google">
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google icon" />
                Cadastrar com Google
            </button>
            <div className="switch-auth">Já tem uma conta? <Link to="/login">Faça login</Link></div>
        </div>
    );
}

function ResetPasswordPage() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        try {
            await mockAuth.sendPasswordResetEmail(email);
            setMessage('Link de redefinição enviado! Verifique sua caixa de entrada.');
        } catch (err) {
             setMessage('Erro: não foi possível enviar o e-mail.');
        }
    };

    return (
        <div className="auth-container">
            <h1>Recuperar Senha</h1>
            <p>Digite seu e-mail para receber o link de redefinição.</p>
            <form id="reset-form" onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input type="email" id="email" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Enviar Link</button>
                {message && <p id="message" className="message success" style={{display: 'block'}}>{message}</p>}
            </form>
            <div className="back-link"><Link to="/login">Voltar para o Login</Link></div>
        </div>
    );
}

function FreeSignalsPage() {
    const [tipsData, setTipsData] = useState({ title: 'Carregando dicas...', tips: [] });

    useEffect(() => {
        const loadTips = async () => {
            try {
                // CORREÇÃO: Usando process.env.PUBLIC_URL para o caminho do arquivo
                const response = await fetch(process.env.PUBLIC_URL + '/dicas-da-semana.txt');
                if (!response.ok) throw new Error('Arquivo de dicas não encontrado.');
                const textData = await response.text();
                
                const lines = textData.split('\n').map(line => line.trim()).filter(line => line);
                const titleLine = lines.find(line => line.startsWith('--- DICAS E ANÁLISE')) || 'Dicas da Semana';
                const title = titleLine.replace('---', '').trim();
                
                const tips = [];
                let currentTip = null;

                lines.forEach(line => {
                    if (line.startsWith('🎯 PARTIDA:')) {
                        if (currentTip) tips.push(currentTip);
                        currentTip = { match: line.replace('🎯 PARTIDA:', '').trim(), details: [] };
                    } else if (currentTip && line.length > 0 && !line.startsWith('===') && !line.startsWith('---')) {
                        currentTip.details.push(line);
                    }
                });
                if (currentTip) tips.push(currentTip);
                setTipsData({ title, tips: tips.slice(0, 2) });
            } catch (error) {
                console.error("Erro ao carregar dicas:", error);
                setTipsData({ title: 'Erro ao Carregar', tips: [] });
            }
        };
        loadTips();
    }, []);

    return (
        <>
            <section className="page-header"><div className="container">
                <h1>Sinais Gratuitos da Semana</h1>
                <p>Análises com alta taxa de assertividade, geradas por nossa IA.</p>
            </div></section>
            <div className="container">
                <div className="chat-container">
                    <div className="chat-header">{tipsData.title}</div>
                    <div className="chat-messages">
                        {tipsData.tips.length > 0 ? (
                            tipsData.tips.map((tip, index) => (
                                <div key={index} className="chat-bubble">
                                    <div className="match-title">{tip.match}</div>
                                    <div className="match-details" dangerouslySetInnerHTML={{ __html: tip.details.join('<br />') }}></div>
                                </div>
                            ))
                        ) : ( <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>Nenhuma dica gratuita disponível no momento.</p> )}
                    </div>
                    <div className="chat-footer">
                        <p>Para acesso a todas as análises e ferramentas, <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>torne-se VIP</Link>.</p>
                    </div>
                </div>
            </div>
        </>
    );
}

function DashboardPage() {
    const [allData, setAllData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [stats, setStats] = useState({ total: 0, greens: 0, reds: 0, rate: '0.00%' });
    const [years, setYears] = useState([]);
    const [currentYear, setCurrentYear] = useState('all');
    const [currentMode, setCurrentMode] = useState('quantitative');
    const [chartData, setChartData] = useState(null);

    useEffect(() => {
        const parseData = (text) => {
            const entries = text.split('[R').slice(1);
            const data = [];
            entries.forEach(entryText => {
                const lines = entryText.split('\n').map(line => line.trim());
                const resultLine = lines.find(l => l.startsWith('RESULTADO:'));
                const resultInfo = resultLine ? resultLine.match(/RESULTADO: (Green|Red)/) : null;
                let date = null;
                for (const line of lines) {
                    const dateInfo = line.match(/(\d{4}-\d{2}-\d{2}):/);
                    if (dateInfo) {
                        date = new Date(dateInfo[1] + 'T12:00:00Z');
                        break;
                    }
                }
                if (resultInfo && date) {
                    data.push({ result: resultInfo[1] === 'Green' ? 1 : 0, date: date });
                }
            });
            return data.sort((a, b) => a.date - b.date);
        };

        const loadData = async () => {
            try {
                // CORREÇÃO: Usando process.env.PUBLIC_URL para o caminho do arquivo
                const response = await fetch(process.env.PUBLIC_URL + '/banco-de-dados.txt');
                if (!response.ok) throw new Error('Falha ao carregar banco de dados.');
                const textData = await response.text();
                const processedData = parseData(textData);
                setAllData(processedData);
                const uniqueYears = [...new Set(processedData.map(d => d.date.getFullYear()))].sort();
                setYears(uniqueYears);
            } catch (error) {
                console.error("Erro ao carregar dados:", error);
            }
        };
        loadData();
    }, []);

    useEffect(() => {
        const data = currentYear === 'all' ? allData : allData.filter(d => d.date.getFullYear().toString() === currentYear);
        setFilteredData(data);

        const total = data.length;
        if (total > 0) {
            const greens = data.filter(d => d.result === 1).length;
            const reds = total - greens;
            const rate = ((greens / total) * 100).toFixed(2) + '%';
            setStats({ total, greens, reds, rate });
        } else {
            setStats({ total: 0, greens: 0, reds: 0, rate: '0.00%' });
        }
    }, [currentYear, allData]);

    useEffect(() => {
        if (filteredData.length === 0) {
            setChartData(null);
            return;
        }

        let labels = [];
        let dataPoints = [];
        let yAxisLabel = '';

        if (currentMode === 'quantitative') {
            let currentScore = 0;
            filteredData.forEach((entry, index) => {
                currentScore += (entry.result === 1 ? 1 : -1);
                dataPoints.push(currentScore);
                labels.push(index + 1);
            });
            yAxisLabel = 'Pontuação (Greens - Reds)';
        } else if (currentMode === 'simulative') {
            const ODD_MEDIA = 1.28;
            let currentBankroll = 100;
            filteredData.forEach((entry, index) => {
                if (entry.result === 1) {
                    currentBankroll += (5 * (ODD_MEDIA - 1));
                } else {
                    currentBankroll -= 5;
                }
                dataPoints.push(currentBankroll.toFixed(2));
                labels.push(index + 1);
            });
            yAxisLabel = 'Unidades (U)';
        }
        
        setChartData({
            labels,
            datasets: [{
                label: 'Performance',
                data: dataPoints,
                borderColor: 'rgba(0, 209, 178, 0.8)',
                backgroundColor: 'rgba(0, 209, 178, 0.1)',
                fill: true,
                tension: 0.1,
            }],
            yAxisLabel
        });
    }, [filteredData, currentMode]);

    return (
        <>
            <section className="dashboard-header"><div className="container">
                <h1>Performance Histórica da Estratégia</h1>
                <p>Visualize nossos resultados desde 2019 de forma transparente.</p>
            </div></section>
            <div className="container">
                <div id="yearFilters" className="filters">
                    <button onClick={() => setCurrentYear('all')} className={`control-btn ${currentYear === 'all' ? 'active' : ''}`}>Todos</button>
                    {years.map(year => (
                        <button key={year} onClick={() => setCurrentYear(year.toString())} className={`control-btn ${currentYear === year.toString() ? 'active' : ''}`}>{year}</button>
                    ))}
                </div>
                <div className="controls">
                    <button onClick={() => setCurrentMode('quantitative')} className={`control-btn ${currentMode === 'quantitative' ? 'active' : ''}`}>Modo Quantitativo</button>
                    <button onClick={() => setCurrentMode('simulative')} className={`control-btn ${currentMode === 'simulative' ? 'active' : ''}`}>Nossa Banca Acumulada (Unidades)</button>
                </div>
                <div id="statsContainer" className="stats-container">
                    <div className="stat-card"><h3>Total de Entradas</h3><p>{stats.total}</p></div>
                    <div className="stat-card"><h3>Greens</h3><p className="green">{stats.greens}</p></div>
                    <div className="stat-card"><h3>Reds</h3><p className="red">{stats.reds}</p></div>
                    <div className="stat-card"><h3>Assertividade</h3><p>{stats.rate}</p></div>
                </div>
                <div className="chart-container">
                    {chartData ? <Line data={chartData} options={{
                        responsive: true,
                        plugins: { legend: { display: false } },
                        scales: {
                            x: { title: { display: true, text: 'Número de Entradas', color: '#EAEAEA' }, ticks: { color: '#BBBBBB' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } },
                            y: { title: { display: true, text: chartData.yAxisLabel, color: '#EAEAEA' }, ticks: { color: '#BBBBBB' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } }
                        }
                    }} /> : <p>Carregando dados do gráfico...</p>}
                </div>
            </div>
        </>
    );
}

function HistoricoPage() {
    const [allData, setAllData] = useState([]);
    const [chartData, setChartData] = useState(null);
    const [years, setYears] = useState([]);
    const [currentYear, setCurrentYear] = useState('all');

    useEffect(() => {
        const parseData = (text) => {
            const data = [];
            const cleanedText = text.replace(/--- RELATÓRIO COMPLETO DE BACKTEST V18.18 ---/g, '')
                                     .replace(/RODADAS ANALISADAS: \d+ a \d+/g, '')
                                     .replace(/-------------------------------------------/g, '')
                                     .replace(/Total de Entradas \(Aptas\): \d+/g, '')
                                     .replace(/Total de Greens: \d+/g, '')
                                     .replace(/Total de Reds: \d+/g, '')
                                     .replace(/Assertividade: \d+\.\d+%?/g, '');

            const gameBlocks = cleanedText.split(/\[R\d+\]/).filter(block => block.trim() !== '');

            gameBlocks.forEach((block, index) => {
                const lines = block.trim().split('\n').map(line => line.trim());
                if (lines.length < 2) return;

                const matchLine = lines[0];
                const teamsMatch = matchLine.match(/(.+) (\d+–\d+) (.+)/);
                if (!teamsMatch) return;

                const teams = `${teamsMatch[1]} vs ${teamsMatch[3]}`;
                const score = teamsMatch[2];

                const perfilLine = lines.find(l => l.startsWith('Perfil:'));
                const perfil = perfilLine ? perfilLine.split('|')[0].replace('Perfil:', '').trim() : 'N/A';
                
                const resultLine = lines.find(l => l.startsWith('RESULTADO:'));
                const result = resultLine ? (resultLine.includes('Green') ? 'Green' : 'Red') : 'N/A';

                const dateMatches = block.match(/(\d{4}-\d{2}-\d{2}):/g);
                let bestGuessDate = null;
                if (dateMatches) {
                    const dates = dateMatches.map(d => new Date(d.replace(':', '') + 'T12:00:00Z'));
                    bestGuessDate = new Date(Math.max.apply(null, dates));
                }

                if (result !== 'N/A' && bestGuessDate && !isNaN(bestGuessDate)) {
                     data.push({
                        index: index,
                        date: bestGuessDate,
                        teams,
                        score,
                        perfil,
                        result,
                    });
                }
            });
            return data.sort((a, b) => a.date - b.date);
        };

        const loadData = async () => {
            try {
                // CORREÇÃO: Usando process.env.PUBLIC_URL para o caminho do arquivo
                const response = await fetch(process.env.PUBLIC_URL + '/banco-de-dados.txt');
                if (!response.ok) throw new Error('Falha ao carregar banco de dados.');
                const textData = await response.text();
                const processedData = parseData(textData);
                setAllData(processedData);
                const uniqueYears = [...new Set(processedData.map(d => d.date.getFullYear()))].sort((a, b) => a - b);
                setYears(uniqueYears);
            } catch (error) {
                console.error("Erro ao carregar dados do histórico:", error);
            }
        };
        loadData();
    }, []);

    useEffect(() => {
        if (allData.length === 0) return;

        const dataToProcess = currentYear === 'all' 
            ? allData 
            : allData.filter(d => d.date.getFullYear().toString() === currentYear);

        if (dataToProcess.length === 0) {
            setChartData(null);
            return;
        }

        const bankrollData = [];
        const labels = [];
        const tooltipData = [];

        let bankroll = 100;
        let lastStake = 0;
        let isSorosLevel = false;

        const WIN_RATE = 0.807;
        const AVG_ODD = 1.28;
        
        const kellyFraction = ((WIN_RATE * (AVG_ODD - 1)) - (1 - WIN_RATE)) / (AVG_ODD - 1);
        const standardStakePercentage = kellyFraction > 0 ? kellyFraction : 0.05;

        dataToProcess.forEach((entry, index) => {
            let stake;
            if (isSorosLevel) {
                stake = lastStake + (lastStake * (AVG_ODD - 1));
            } else {
                stake = bankroll * standardStakePercentage;
            }
            
            stake = Math.max(stake, 0.01);

            if (entry.result === 'Green') {
                const profit = stake * (AVG_ODD - 1);
                bankroll += profit;
                lastStake = stake;
                isSorosLevel = true;
            } else { // Red
                bankroll -= stake;
                isSorosLevel = false;
            }
            
            bankrollData.push(bankroll.toFixed(2));
            labels.push(`Jogo ${index + 1}`);
            tooltipData.push({
                date: entry.date.toLocaleDateString('pt-BR'),
                teams: entry.teams,
                score: entry.score,
                perfil: entry.perfil,
                result: entry.result,
                bankroll: bankroll.toFixed(2)
            });
        });

        setChartData({
            labels: labels,
            datasets: [{
                label: 'Evolução da Banca (Unidades)',
                data: bankrollData,
                borderColor: 'rgba(0, 209, 178, 0.8)',
                backgroundColor: 'rgba(0, 209, 178, 0.1)',
                fill: true,
                tension: 0.1,
                pointRadius: 3,
                pointHoverRadius: 6,
            }],
            tooltipData
        });

    }, [allData, currentYear]);

    return (
      <>
        <section className="page-header">
          <div className="container">
            <h1>Histórico Completo da Estratégia</h1>
            <p>Acompanhe a evolução da nossa banca com base em cada entrada registrada.</p>
          </div>
        </section>
        <div className="container" style={{marginBottom: '80px'}}>
           <div id="yearFilters" className="filters">
                <button onClick={() => setCurrentYear('all')} className={`control-btn ${currentYear === 'all' ? 'active' : ''}`}>Todas as Temporadas</button>
                {years.map(year => (
                    <button key={year} onClick={() => setCurrentYear(year.toString())} className={`control-btn ${currentYear === year.toString() ? 'active' : ''}`}>{year}</button>
                ))}
            </div>
            <div className="chart-container">
                {chartData ? (
                    <Line 
                        data={chartData} 
                        options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: { display: false },
                                tooltip: {
                                    enabled: true,
                                    mode: 'index',
                                    intersect: false,
                                    callbacks: {
                                        title: function(context) {
                                            const dataIndex = context[0].dataIndex;
                                            return `Data (Aprox.): ${chartData.tooltipData[dataIndex].date}`;
                                        },
                                        label: function(context) {
                                            const data = chartData.tooltipData[context.dataIndex];
                                            return [
                                                `Jogo: ${data.teams} (${data.score})`,
                                                `Perfil: ${data.perfil}`,
                                                `Resultado: ${data.result}`,
                                                `Banca: ${data.bankroll} Unidades`
                                            ];
                                        }
                                    }
                                }
                            },
                            scales: {
                                x: { title: { display: true, text: 'Número da Entrada', color: '#EAEAEA' }, ticks: { color: '#BBBBBB' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } },
                                y: { title: { display: true, text: 'Banca (Unidades)', color: '#EAEAEA' }, ticks: { color: '#BBBBBB' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } }
                            }
                        }}
                    />
                ) : <p style={{textAlign: 'center'}}>Carregando dados do gráfico...</p>}
            </div>
        </div>
      </>
    );
}


// --- ROTEADOR PRINCIPAL ---
export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/cadastro" element={<RegisterPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/sinais-gratuitos" element={<FreeSignalsPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/historico" element={<HistoricoPage />} />
          </Routes>
        </Layout>
      </Router>
    </AuthProvider>
  );
}
