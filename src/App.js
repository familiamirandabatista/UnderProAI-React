import React, { useState, useEffect, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
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
// Ícone de lápis adicionado
import { FaHome, FaChartLine, FaBroadcastTower, FaCrown, FaHistory, FaUserCircle, FaPencilAlt } from 'react-icons/fa';

// Firebase imports
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    onAuthStateChanged, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    sendPasswordResetEmail,
    GoogleAuthProvider,
    signInWithRedirect,
    getRedirectResult,
    signOut,
    updateProfile
} from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
// Imports do Firebase Storage adicionados
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';


// --- CONFIGURAÇÃO DO FIREBASE ---
import { firebaseConfig } from './firebase'; 

// Inicializa o Firebase
// NOTA: Certifique-se de que o seu ficheiro 'firebase.js' exporta uma configuração
// que inclui a propriedade 'storageBucket' para o upload de ficheiros funcionar.
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app); // Inicializa o Storage
const googleProvider = new GoogleAuthProvider();


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

// --- CONTEXTO DE AUTENTICAÇÃO ---
const AuthContext = React.createContext(null);

const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [userProfile, setUserProfile] = useState(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                const userDocRef = doc(db, "users", currentUser.uid);
                const docSnap = await getDoc(userDocRef);
                if (docSnap.exists()) {
                    setUserProfile(docSnap.data());
                } else {
                    const newProfile = {
                        displayName: currentUser.displayName || 'Novo Utilizador',
                        email: currentUser.email,
                        photoURL: currentUser.photoURL, // Adicionado para consistência
                        isVip: false,
                        phone: '',
                        address: ''
                    };
                    await setDoc(userDocRef, newProfile);
                    setUserProfile(newProfile);
                }
            } else {
                setUserProfile(null);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);
    
    // Expondo setUserProfile para atualizações instantâneas na UI
    const value = { user, userProfile, loading, setUserProfile };
    return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};

const useAuth = () => React.useContext(AuthContext);

// --- COMPONENTES DE ROTA PROTEGIDA ---
const AuthenticatedRoute = ({ children }) => {
    const { user, loading } = useAuth();
    if (loading) {
        return <div style={{textAlign: 'center', marginTop: '150px'}}>A carregar...</div>;
    }
    if (!user) {
        return <Navigate to="/login" replace />;
    }
    return children;
};

const VipRoute = ({ children }) => {
    const { user, userProfile, loading } = useAuth();

    if (loading) {
        return <div style={{textAlign: 'center', marginTop: '150px'}}>A carregar...</div>;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }
    
    if (!userProfile?.isVip) {
        return <Navigate to="/planos" replace />;
    }

    return children;
};


// --- COMPONENTES PRINCIPAIS (HEADER, FOOTER, LAYOUT) ---

function Header() {
    const { user, userProfile } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = async () => {
        try {
            await signOut(auth);
            navigate('/');
        } catch (error) {
            console.error("Erro ao fazer logout:", error);
        }
    };

    const scrollToSection = (sectionId) => {
        if (location.pathname !== '/') {
            navigate('/#');
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
                <a href="/#" onClick={handleHomeClick}>
                    <img src={process.env.PUBLIC_URL + '/images/logo.png'} alt="UnderPro AI Logo" className="logo" />
                </a>
                <nav id="main-nav">
                    <ul id="nav-links">
                        <li><a href="/#" onClick={handleHomeClick} className="nav-link-icon"><FaHome /> Home</a></li>
                        <li><a href="/#strategy-section" onClick={(e) => { e.preventDefault(); scrollToSection('strategy-section'); }} className="nav-link-icon"><FaChartLine /> A Estratégia</a></li>
                        <li><Link to="/dashboard" className="nav-link-icon"><FaHistory /> Histórico</Link></li>
                        <li><Link to="/sinais-gratuitos" className="nav-link-icon"><FaBroadcastTower /> Sinais Gratuitos</Link></li>
                        <li>
                            <Link to="/sinais-vip" className="vip-link">
                                <FaCrown className="crown-icon" />
                                Sinais VIP
                            </Link>
                        </li>
                        {user && userProfile ? (
                            <>
                                <li>
                                    <Link to="/perfil" className="user-profile-widget">
                                        {/* CORREÇÃO: Usar userProfile?.photoURL para garantir que a foto mais recente é exibida */}
                                        <img src={userProfile?.photoURL || `https://i.pravatar.cc/40?u=${user.uid}`} alt="Perfil" className="header-profile-pic" />
                                        <div className="user-info-header">
                                            <span>{userProfile.displayName}</span>
                                            <span className={`status-badge-header ${userProfile.isVip ? 'vip' : 'free'}`}>
                                                {userProfile.isVip ? <><FaCrown /> VIP</> : 'Free'}
                                            </span>
                                        </div>
                                    </Link>
                                </li>
                                <li><button onClick={handleLogout} className="btn btn-logout">Sair</button></li>
                            </>
                        ) : (
                            <li><Link to="/login" className="btn btn-primary">Entrar</Link></li>
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
                    {/* TEXTO ALTERADO AQUI */}
                    <p>A UnderPro AI utiliza inteligência artificial para analisar milhares de dados e encontrar as melhores oportunidades no mercado de Under 3.5 gols.</p>
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
                            <Link to="/dashboard" className="btn btn-secondary" style={{marginTop: '20px'}}>Veja Agora Mesmo</Link>
                        </div>
                        <div className="feature-card">
                            <div className="icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
                            <h3>Educação Financeira</h3>
                            <p>Mais do que dicas, ensinamos gestão de banca e a mentalidade de longo prazo. Formamos investidores, não apostadores.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* SEÇÃO DA ESTRATÉGIA TOTALMENTE REFORMULADA */}
            <section id="strategy-section" className="section">
                <div className="container">
                    <h2 className="section-title">Transforme Apostas em Lucro Inteligente</h2>
                    <p className="section-subtitle">Chega de “achismos”. Aqui, a matemática trabalha a seu favor.</p>
                    <div className="strategy-content">
                        <div className="strategy-text">
                            <h3>Como Funciona?</h3>
                            <p>Com <strong>80,7% de assertividade</strong>, nosso método já é lucrativo a partir de odds de 1.25, mas é com odds estratégicas maiores que os lucros se multiplicam.</p>
                            <p><strong>1. Análise da IA:</strong> A inteligência artificial da UnderPro AI seleciona os jogos com a maior probabilidade de resultarem em Menos de 3.5 golos (Under 3.5).</p>
                            <p><strong>2. O Seu Controlo:</strong> Você recebe o sinal e decide quando e em qual odd entrar, mantendo total controlo sobre a sua aposta.</p>
                            <p><strong>3. Geração de Valor:</strong> Cada decisão, combinada com a alta assertividade da nossa estratégia, gera Valor Esperado Positivo (EV+) real e consistente a longo prazo.</p>
                        </div>
                        <div className="strategy-text">
                            <h3>EV+ na Prática: Veja os Números</h3>
                            <p>O Valor Esperado Positivo (EV+) é a base do lucro. Veja como a nossa assertividade se traduz em ganhos com diferentes odds:</p>
                            <div className="ev-calculation">
                                <h4>Odd 1.25:</h4>
                                <p>Neste cenário, o lucro já existe, provando a robustez do método.</p>
                                <code>EV+ = (0,807 × 1,25) - 1 = 0,00875 ≈ <strong>0,88% de lucro por aposta</strong></code>
                            </div>
                            <div className="ev-calculation">
                                <h4>Odd 1.35:</h4>
                                <p>Com uma odd ligeiramente maior, o retorno esperado aumenta exponencialmente.</p>
                                <code>EV+ = (0,807 × 1,35) - 1 = 0,08945 ≈ <strong>8,95% de lucro por aposta</strong></code>
                            </div>
                        </div>
                    </div>
                    <div className="strategy-example">
                        <h3>Exemplo Prático</h3>
                        <p>Apostando R$100 em odds de 1.35 com nossa assertividade:</p>
                        <ul>
                            <li><strong>Lucro esperado:</strong> Aproximadamente R$9 por aposta.</li>
                            <li><strong>Após 50 apostas consistentes:</strong> Potencial de ~R$450 de lucro acumulado.</li>
                        </ul>
                        <p>Cada sequência de vitórias aumenta o efeito exponencial, transformando sua banca em uma máquina de lucros previsíveis.</p>
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

    useEffect(() => {
        getRedirectResult(auth)
            .then((result) => {
                if (result) {
                    navigate('/dashboard');
                }
            }).catch((error) => {
                setError("Falha ao fazer login com o Google.");
            });
    }, [navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await signInWithEmailAndPassword(auth, email, password);
            navigate('/dashboard');
        } catch (err) {
            setError("E-mail ou senha incorretos.");
        }
    };
    
    const handleGoogleLogin = async () => {
        try {
            await signInWithRedirect(auth, googleProvider);
        } catch (error) {
            setError("Não foi possível iniciar o login com o Google.");
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
            <button onClick={handleGoogleLogin} className="btn btn-google">
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
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            await updateProfile(user, { displayName: name });

            const userDocRef = doc(db, "users", user.uid);
            await setDoc(userDocRef, {
                displayName: name,
                email: user.email,
                isVip: false,
                phone: '',
                address: ''
            });

            setShowVerification(true);
        } catch (err) {
             if (err.code === 'auth/email-already-in-use') {
                setError('Este e-mail já está em uso.');
            } else {
                setError('Falha ao criar a conta.');
            }
        }
    };
    
    const handleGoogleLogin = async () => {
        try {
            await signInWithRedirect(auth, googleProvider);
        } catch (error) {
            setError("Não foi possível iniciar o login com o Google.");
        }
    };

    if (showVerification) {
        return (
            <div className="auth-container" style={{textAlign: 'center'}}>
                 <h1 style={{ color: 'var(--color-success)' }}>Conta Criada!</h1>
                <p>Sua conta foi criada com sucesso. Você já pode fazer o login.</p>
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
            <button onClick={handleGoogleLogin} className="btn btn-google">
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
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        try {
            await sendPasswordResetEmail(auth, email);
            setMessage('Link de redefinição enviado! Verifique sua caixa de entrada.');
        } catch (err) {
             setError('Erro: não foi possível enviar o e-mail. Verifique o endereço digitado.');
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
                {message && <p className="message success" style={{display: 'block'}}>{message}</p>}
                {error && <p className="message error" style={{display: 'block'}}>{error}</p>}
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
    const [chartData, setChartData] = useState(null);

    useEffect(() => {
        const parseData = (text) => {
            const cleanedText = text.replace(/--- RELATÓRIO COMPLETO DE BACKTEST V18.18 ---/g, '')
                                     .replace(/RODADAS ANALISADAS: \d+ a \d+/g, '')
                                     .replace(/-------------------------------------------/g, '')
                                     .replace(/Total de Entradas \(Aptas\): \d+/g, '')
                                     .replace(/Total de Greens: \d+/g, '')
                                     .replace(/Total de Reds: \d+/g, '')
                                     .replace(/Assertividade: \d+\.\d+%?/g, '');

            const gameBlocks = cleanedText.split(/\[R\d+\]/).filter(block => block.trim() !== '');
            const data = [];

            gameBlocks.forEach(block => {
                const lines = block.trim().split('\n').map(line => line.trim());
                if (lines.length < 2) return;

                const matchLine = lines[0];
                const teamsMatch = matchLine.match(/(.+) (\d+–\d+) (.+)/);
                if (!teamsMatch) return;

                const teams = `${teamsMatch[1]} vs ${teamsMatch[3]}`;
                const score = teamsMatch[2];

                const resultLine = lines.find(l => l.includes('RESULTADO:'));
                const result = resultLine ? (resultLine.includes('Green') ? 1 : 0) : null;

                const dateMatches = block.match(/(\d{4}-\d{2}-\d{2}):/g);
                let bestGuessDate = null;
                if (dateMatches) {
                    const dates = dateMatches.map(d => new Date(d.replace(':', '') + 'T12:00:00Z'));
                    bestGuessDate = new Date(Math.max.apply(null, dates));
                }

                if (result !== null && bestGuessDate && !isNaN(bestGuessDate)) {
                    data.push({ date: bestGuessDate, teams, score, result });
                }
            });
            return data.sort((a, b) => a.date - b.date);
        };

        const loadData = async () => {
            try {
                const response = await fetch(process.env.PUBLIC_URL + '/banco-de-dados.txt');
                if (!response.ok) throw new Error('Falha ao carregar banco de dados.');
                const textData = await response.text();
                const processedData = parseData(textData);
                setAllData(processedData);
                const uniqueYears = [...new Set(processedData.map(d => d.date.getFullYear()))].sort((a, b) => a - b);
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
        let tooltipData = [];
        
        // --- NOVAS VARIÁVEIS PARA ESTILIZAÇÃO ---
        const pointBackgroundColors = [];
        const pointRadii = [];

        let bankroll = 100;
        let isSorosLevel = false;
        let sorosAmount = 0;
        
        const WIN_RATE = 0.807;
        const AVG_ODD = 1.28;
        const kellyFraction = ((WIN_RATE * (AVG_ODD - 1)) - (1 - WIN_RATE)) / (AVG_ODD - 1);
        const standardStakePercentage = kellyFraction > 0 ? kellyFraction : 0.05;

        filteredData.forEach((entry, index) => {
            let stake;

            if (isSorosLevel) {
                stake = sorosAmount;
            } else {
                stake = bankroll * standardStakePercentage;
            }
            
            stake = Math.max(stake, 0.01);
            if (stake > bankroll) {
                stake = bankroll;
            }

            if (entry.result === 1) { // Green
                const profit = stake * (AVG_ODD - 1);
                bankroll += profit;
                
                if (isSorosLevel) {
                    isSorosLevel = false;
                    sorosAmount = 0;
                } else {
                    isSorosLevel = true;
                    sorosAmount = stake + profit;
                }
                // Adiciona estilos para Green
                pointBackgroundColors.push('rgba(0, 209, 178, 0.8)');
                pointRadii.push(3);

            } else { // Red
                bankroll -= stake;
                isSorosLevel = false;
                sorosAmount = 0;

                // Adiciona estilos para Red
                pointBackgroundColors.push('#FF3860'); // Cor de erro do CSS
                pointRadii.push(5); // Raio maior para destacar
            }
            dataPoints.push(bankroll.toFixed(2));
            labels.push(index + 1);
            tooltipData.push({ ...entry, date: entry.date.toLocaleDateString('pt-BR'), bankroll: bankroll.toFixed(2) });
        });
        
        setChartData({
            labels,
            datasets: [{
                label: 'Performance',
                data: dataPoints,
                backgroundColor: 'rgba(0, 209, 178, 0.1)',
                fill: true,
                tension: 0.1,
                // --- PROPRIEDADES DE ESTILO ATUALIZADAS ---
                pointBackgroundColor: pointBackgroundColors,
                pointBorderColor: pointBackgroundColors,
                pointRadius: pointRadii,
                pointHoverRadius: 7, // Aumenta o raio no hover
                segment: {
                    // Colore o segmento de linha que LEVA a um ponto de Red
                    borderColor: ctx => {
                        const dataIndex = ctx.p1.dataIndex;
                        if (tooltipData[dataIndex] && tooltipData[dataIndex].result === 0) {
                            return '#FF3860'; // Cor vermelha
                        }
                        return 'rgba(0, 209, 178, 0.8)'; // Cor padrão
                    },
                },
            }],
            yAxisLabel: 'Banca (Unidades)',
            tooltipData
        });
    }, [filteredData]);

    return (
        <>
            <section className="dashboard-header">
                <div className="container">
                    <h1>Performance Histórica da Estratégia</h1>
                    <p>Visualize nossos resultados desde 2022 de forma transparente.</p>
                </div>
            </section>
            <div className="container" style={{marginBottom: "80px"}}>
                <div id="yearFilters" className="filters">
                    <button onClick={() => setCurrentYear('all')} className={`control-btn ${currentYear === 'all' ? 'active' : ''}`}>Todos</button>
                    {years.map(year => (
                        <button key={year} onClick={() => setCurrentYear(year.toString())} className={`control-btn ${currentYear === year.toString() ? 'active' : ''}`}>{year}</button>
                    ))}
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
                                        const resultLabel = data.result === 1 ? 'Green' : 'Red';
                                        const bankrollLabel = data.bankroll ? `Banca: ${data.bankroll} Unidades` : `Pontuação: ${context.raw}`;
                                        return [
                                            `Jogo: ${data.teams} (${data.score})`,
                                            `Resultado: ${resultLabel}`,
                                            bankrollLabel
                                        ];
                                    }
                                }
                            }
                        },
                        scales: {
                            x: { title: { display: true, text: 'Número de Entradas', color: '#EAEAEA' }, ticks: { color: '#BBBBBB' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } },
                            y: { title: { display: true, text: chartData.yAxisLabel, color: '#EAEAEA' }, ticks: { color: '#BBBBBB' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } }
                        }
                    }} /> : <p style={{textAlign: 'center'}}>Carregando dados do gráfico...</p>}
                </div>
                <div style={{textAlign: 'center', marginTop: '40px'}}>
                    <h3 style={{fontSize: '1.5rem', marginBottom: '16px'}}>Gostou dos números?</h3>
                    <p style={{color: 'var(--color-text-secondary)', marginBottom: '24px'}}>Torne-se VIP agora e tenha acesso a todas as entradas!!</p>
                    <Link to="/cadastro" className="btn btn-primary">Tornar-se VIP</Link>
                </div>
            </div>
        </>
    );
}
// --- NOVAS PÁGINAS ---

function ProfilePage() {
    const { user, userProfile, setUserProfile } = useAuth();
    const [displayName, setDisplayName] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [message, setMessage] = useState('');
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (userProfile) {
            setDisplayName(userProfile.displayName || '');
            setPhone(userProfile.phone || '');
            setAddress(userProfile.address || '');
        }
    }, [userProfile]);

    const handleSave = async (e) => {
        e.preventDefault();
        setMessage('');
        if (!user) return;

        try {
            const userDocRef = doc(db, "users", user.uid);
            await setDoc(userDocRef, { 
                displayName, 
                phone, 
                address 
            }, { merge: true });
            
            if (user.displayName !== displayName) {
                await updateProfile(user, { displayName });
            }

            setMessage('Perfil atualizado com sucesso!');
        } catch (error) {
            console.error("Erro ao atualizar o perfil:", error);
            setMessage('Erro ao atualizar o perfil.');
        }
    };

    const handleProfilePicClick = () => {
        if (!uploading) {
            fileInputRef.current.click();
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file || !user) return;

        setUploading(true);
        setMessage('');

        try {
            // Cria uma referência para o ficheiro no Firebase Storage
            const storageRef = ref(storage, `profilePictures/${user.uid}`);
            // Faz o upload do ficheiro
            await uploadBytes(storageRef, file);
            // Obtém o URL de download da imagem
            const newPhotoURL = await getDownloadURL(storageRef);

            // Atualiza o perfil no Firebase Authentication
            await updateProfile(auth.currentUser, { photoURL: newPhotoURL });

            // Atualiza o URL da foto no Firestore
            const userDocRef = doc(db, "users", user.uid);
            await setDoc(userDocRef, { photoURL: newPhotoURL }, { merge: true });
            
            // Atualiza o estado local para a UI refletir a mudança instantaneamente
            if (setUserProfile) {
                setUserProfile(prev => ({...prev, photoURL: newPhotoURL}));
            }
            
            setMessage('Foto de perfil atualizada com sucesso!');

        } catch (error) {
            console.error("Erro ao carregar a foto:", error);
            setMessage('Erro ao carregar a foto. Tente novamente.');
        } finally {
            setUploading(false);
        }
    };

    if (!userProfile) {
        return <div style={{textAlign: 'center', marginTop: '150px'}}>A carregar perfil...</div>;
    }

    return (
        <>
            <section className="page-header">
                <div className="container">
                    <h1>Meu Perfil</h1>
                </div>
            </section>
            <div className="container" style={{maxWidth: '800px', margin: '0 auto 80px auto'}}>
                <div className="profile-container">
                    <div className="profile-header">
                        <div className="profile-pic-container" onClick={handleProfilePicClick}>
                            {/* CORREÇÃO: Usar userProfile?.photoURL para garantir que a foto mais recente é exibida */}
                            <img src={userProfile?.photoURL || `https://i.pravatar.cc/150?u=${user.uid}`} alt="Foto de Perfil" className="profile-pic" />
                            <div className="profile-pic-overlay">
                                {uploading ? <span>A carregar...</span> : <FaPencilAlt size={30} />}
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                style={{ display: 'none' }}
                                accept="image/png, image/jpeg"
                            />
                        </div>

                        <h2>{userProfile.displayName}</h2>
                        <p>{user.email}</p>
                        <span className={`status-badge ${userProfile.isVip ? 'vip' : 'free'}`}>
                            {userProfile.isVip ? 'Plano VIP' : 'Plano Gratuito'}
                        </span>
                    </div>
                    <form className="profile-form" onSubmit={handleSave}>
                        <div className="form-group">
                            <label htmlFor="displayName">Nome de Exibição</label>
                            <input type="text" id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="phone">Telefone</label>
                            <input type="tel" id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="address">Morada</label>
                            <input type="text" id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
                        </div>
                        <button type="submit" className="btn btn-primary">Guardar Alterações</button>
                        {message && <p className={`message ${message.includes('Erro') ? 'error' : 'success'}`} style={{display: 'block'}}>{message}</p>}
                    </form>
                    {!userProfile.isVip && (
                        <div className="cta-vip">
                            <h3>Aceda a todos os sinais!</h3>
                            <p>Faça o upgrade para o plano VIP e tenha acesso ilimitado a todas as nossas análises e ferramentas exclusivas.</p>
                            <Link to="/planos" className="btn btn-primary">Seja VIP</Link>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

function VipSignalsPage() {
    const [tipsData, setTipsData] = useState({ title: 'A carregar sinais VIP...', tips: [] });

    useEffect(() => {
        const loadTips = async () => {
            try {
                const response = await fetch(process.env.PUBLIC_URL + '/dicas-da-semana.txt');
                if (!response.ok) throw new Error('Arquivo de sinais não encontrado.');
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
                
                setTipsData({ title: 'Sinais VIP Exclusivos', tips });
            } catch (error) {
                console.error("Erro ao carregar sinais VIP:", error);
                setTipsData({ title: 'Erro ao Carregar Sinais', tips: [] });
            }
        };
        loadTips();
    }, []);

    return (
        <>
            <section className="page-header"><div className="container">
                <h1>Sinais VIP</h1>
                <p>Acesso completo a todas as análises geradas por nossa IA.</p>
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
                        ) : ( <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>Nenhum sinal VIP disponível no momento.</p> )}
                    </div>
                </div>
            </div>
        </>
    );
}

function PlansPage() {
    return (
        <>
            <section className="page-header">
                <div className="container">
                    <h1>Nossos Planos VIP</h1>
                    <p>Escolha o plano ideal para você e comece a investir com inteligência.</p>
                </div>
            </section>
            <div className="container" style={{textAlign: 'center', paddingBottom: '80px'}}>
                <div className="feature-card" style={{maxWidth: '500px', margin: '0 auto'}}>
                    <h3>Plano VIP Completo</h3>
                    <p style={{fontSize: '2rem', color: 'var(--color-primary)', margin: '20px 0'}}>€9.99/mês</p>
                    <ul style={{listStyle: 'none', textAlign: 'left', marginBottom: '30px', color: 'var(--color-text-secondary)'}}>
                        <li>✅ Acesso a todos os sinais</li>
                        <li>✅ Análises detalhadas</li>
                        <li>✅ Ferramentas de gestão de banca</li>
                        <li>✅ Suporte prioritário</li>
                    </ul>
                    <button className="btn btn-primary" onClick={() => alert('Integração de pagamento em breve!')}>Assinar Agora</button>
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
            <Route path="/sinais-gratuitos" element={<AuthenticatedRoute><FreeSignalsPage /></AuthenticatedRoute>} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/planos" element={<PlansPage />} />
            {/* Rotas Protegidas */}
            <Route path="/perfil" element={<AuthenticatedRoute><ProfilePage /></AuthenticatedRoute>} />
            <Route path="/sinais-vip" element={<VipRoute><VipSignalsPage /></VipRoute>} />
          </Routes>
        </Layout>
      </Router>
    </AuthProvider>
  );
}
