import zoomPlugin from 'chartjs-plugin-zoom';
import Hammer from 'hammerjs';
import { FaHome, FaChartLine, FaBroadcastTower, FaCrown, FaHistory, FaUserCircle, FaPencilAlt, FaCopy, FaSearch, FaChevronDown, FaBars, FaTimes } from 'react-icons/fa';
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
  Legend,
  zoomPlugin
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
                // LÓGICA CENTRALIZADA AQUI
                const userDocRef = doc(db, "users", currentUser.uid);
                const docSnap = await getDoc(userDocRef);
                
                if (docSnap.exists()) {
                    // Se o perfil já existe, apenas o carrega
                    setUserProfile(docSnap.data());
                } else {
                    // Se o perfil NÃO existe (primeiro login com Google, por ex.), CRIA AGORA
                    const newProfile = {
                        displayName: currentUser.displayName || 'Novo Utilizador',
                        email: currentUser.email,
                        photoURL: currentUser.photoURL || process.env.PUBLIC_URL + '/images/perfil.png',
                        isVip: false,
                        phone: '',
                        address: ''
                    };
                    await setDoc(userDocRef, newProfile);
                    setUserProfile(newProfile); // Define o perfil recém-criado
                }
            } else {
                setUserProfile(null);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);
    
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

    // --- ADICIONADO: Estado para controlar o menu mobile ---
    const [isMenuOpen, setIsMenuOpen] = useState(false);

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
    
    // --- ADICIONADO: Função para fechar o menu ao clicar num link ---
    const handleLinkClick = () => {
        setIsMenuOpen(false);
    };
    
    // Fecha o menu se a localização mudar
    useEffect(() => {
        handleLinkClick();
    }, [location]);

    return (
        <header id="main-header">
            <div className="container">
                <a href="/#" onClick={handleHomeClick}>
                    <img src={process.env.PUBLIC_URL + '/images/logo.png'} alt="UnderPro AI Logo" className="logo" />
                </a>

                {/* --- ADICIONADO: Botão do Menu Hambúrguer --- */}
                <button className="mobile-nav-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                    {isMenuOpen ? <FaTimes /> : <FaBars />}
                </button>

                {/* --- MODIFICADO: Adicionada a classe 'active' condicionalmente --- */}
                <nav id="main-nav" className={isMenuOpen ? 'active' : ''}>
                    <ul id="nav-links">
                        {/* --- MODIFICADO: Adicionado onClick a todos os links --- */}
                        <li><a href="/#" onClick={(e) => { handleHomeClick(e); handleLinkClick(); }} className="nav-link-icon"><FaHome /> Home</a></li>
                        <li><a href="/#strategy-section" onClick={(e) => { e.preventDefault(); scrollToSection('strategy-section'); handleLinkClick(); }} className="nav-link-icon"><FaChartLine /> A Estratégia</a></li>
                        <li><Link to="/dashboard" onClick={handleLinkClick} className="nav-link-icon"><FaHistory /> Histórico</Link></li>
                        <li><Link to="/sinais-gratuitos" onClick={handleLinkClick} className="nav-link-icon"><FaBroadcastTower /> Sinais Gratuitos</Link></li>
                        
                        {userProfile?.isVip && (
                             <li><Link to="/gestao-de-banca" onClick={handleLinkClick} className="nav-link-icon"><FaChartLine /> Gestão de Banca</Link></li>
                        )}

                        <li>
                            <Link to="/sinais-vip" onClick={handleLinkClick} className="vip-link">
                                <FaCrown className="crown-icon" />
                                Sinais VIP
                            </Link>
                        </li>
                        {user && userProfile ? (
                            <>
                                <li>
                                    <Link to="/perfil" onClick={handleLinkClick} className="user-profile-widget">
                                        <img src={userProfile?.photoURL || process.env.PUBLIC_URL + '/images/perfil.png'} alt="Perfil" className="header-profile-pic" />
                                        <div className="user-info-header">
                                            <span>{userProfile.displayName}</span>
                                            <span className={`status-badge-header ${userProfile.isVip ? 'vip' : 'free'}`}>
                                                {userProfile.isVip ? <><FaCrown /> VIP</> : 'Free'}
                                            </span>
                                        </div>
                                    </Link>
                                </li>
                                <li><button onClick={() => { handleLogout(); handleLinkClick(); }} className="btn btn-logout">Sair</button></li>
                            </>
                        ) : (
                            <li><Link to="/login" onClick={handleLinkClick} className="btn btn-primary">Entrar</Link></li>
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
                        <h3>Simulação Prática: 20 Apostas</h3>
                        <p className="simulation-subtitle">Veja a diferença da gestão num cenário de curto prazo com banca de R$1.000, considerando uma odd média de 1.28 (valor comum em nossas entradas).</p>
                        <div className="simulation-grid">
                            <div className="simulation-card">
                                <h4>Método 1: Stake Fixa</h4>
                                <p className="strategy-desc">Você aposta sempre o mesmo valor, independentemente de ganhos ou perdas.</p>
                                <ul className="results-list">
                                    <li><span>Lucro Líquido:</span> <strong className="result-profit">R$32,00</strong></li>
                                    <li><span>Crescimento:</span> <strong>+3,2%</strong></li>
                                </ul>
                            </div>
                            <div className="simulation-card vip-method">
                                <h4>Método 2: Híbrido (UnderPro AI)</h4>
                                <p className="strategy-desc">A stake varia com a sua banca (juros compostos) e é otimizada após vitórias (método Soros).</p>
                                <ul className="results-list">
                                    <li><span>Lucro Líquido:</span> <strong className="result-profit-vip">R$81,00</strong></li>
                                    <li><span>Crescimento:</span> <strong>+8,1%</strong></li>
                                </ul>
                            </div>
                        </div>
                        <hr className="section-divider" />
                        <div className="long-term-example">
                            <h3>O Verdadeiro Tesouro: O Longo Prazo (Exemplo Real de 2024)</h3>
                            <p className="simulation-subtitle">O segredo é a consistência. Veja o resultado real de 2024 (194 Greens e 41 Reds), também com odd média de 1.28, começando com R$1.000:</p>
                            <div className="simulation-grid">
                                <div className="simulation-card">
                                    <h4>Método 1: Stake Fixa</h4>
                                    <p className="strategy-desc">Mesmo com um ano excelente, o crescimento é lento e linear, limitado pela falta de reinvestimento dos lucros.</p>
                                    <ul className="results-list">
                                        <li><span>Banca Inicial:</span> <strong>R$1.000,00</strong></li>
                                        <li><span>Banca Final:</span> <strong>R$1.266,00</strong></li>
                                        <li><span>Crescimento Anual:</span> <strong>+26,6%</strong></li>
                                    </ul>
                                </div>
                                <div className="simulation-card vip-method">
                                    <h4>Método 2: Híbrido (UnderPro AI)</h4>
                                    <p className="strategy-desc">Aqui, os juros compostos e a gestão dinâmica transformam a consistência em um crescimento explosivo e exponencial.</p>
                                    <ul className="results-list">
                                        <li><span>Banca Inicial:</span> <strong>R$1.000,00</strong></li>
                                        <li><span>Banca Final:</span> <strong className="result-profit-vip">R$4.000,00</strong></li>
                                        <li><span>Crescimento Anual:</span> <strong className="result-profit-vip">+300%</strong></li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <p className="simulation-conclusion">
                            A escolha é sua: um lucro modesto ou um crescimento <strong>10 VEZES MAIOR</strong>. O acesso a este método de crescimento exponencial é o que separa amadores de investidores. Este é o poder do plano VIP.
                        </p>
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
    const { user, loading } = useAuth(); // Usamos o estado global de autenticação
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    // Efeito que processa o retorno do Google, mas não faz mais nada
    useEffect(() => {
        getRedirectResult(auth).catch((error) => {
            console.error("Erro no redirecionamento do Google:", error);
            setError("Falha ao fazer login com o Google. Tente novamente.");
        });
    }, []);

    // Efeito que redireciona o usuário DEPOIS que o AuthProvider confirmar o login
    useEffect(() => {
        if (!loading && user) {
            navigate('/dashboard', { replace: true }); // Usamos replace para não voltar para o login
        }
    }, [user, loading, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await signInWithEmailAndPassword(auth, email, password);
            // A navegação agora é tratada pelo useEffect acima
        } catch (err) {
            setError("E-mail ou senha incorretos.");
        }
    };
    
    const handleGoogleLogin = async () => {
        setError(''); // Limpa erros antigos
        try {
            await signInWithRedirect(auth, googleProvider);
        } catch (error) {
            setError("Não foi possível iniciar o login com o Google.");
        }
    };

    // Enquanto o sistema central (AuthProvider) está a verificar o usuário, exibimos um loading.
    // Isso é crucial para evitar o "loop".
    if (loading) {
        return <div style={{textAlign: 'center', marginTop: '150px'}}>Verificando autenticação...</div>;
    }

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

// Dentro do seu arquivo App.js

// Substitua sua função DashboardPage antiga por esta

function DashboardPage() {
    const [allData, setAllData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [stats, setStats] = useState({ total: 0, greens: 0, reds: 0, rate: '0.00%' });
    const [years, setYears] = useState([]);
    const [currentYear, setCurrentYear] = useState('all');
    const [chartData, setChartData] = useState(null);

    useEffect(() => {
        const parseData = (text) => {
            const cleanedText = text.replace(/--- RELATÓRIO COMPLETO DE BACKTEST V18.18 ---/g, '').replace(/RODADAS ANALISADAS: \d+ a \d+/g, '').replace(/-------------------------------------------/g, '').replace(/Total de Entradas \(Aptas\): \d+/g, '').replace(/Total de Greens: \d+/g, '').replace(/Total de Reds: \d+/g, '').replace(/Assertividade: \d+\.\d+%?/g, '');
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
        let labels = [], dataPoints = [], tooltipData = [], pointBackgroundColors = [], pointRadii = [];
        let bankroll = 100, isSorosLevel = false, sorosAmount = 0;
        const WIN_RATE = 0.807, AVG_ODD = 1.28;
        const kellyFraction = ((WIN_RATE * (AVG_ODD - 1)) - (1 - WIN_RATE)) / (AVG_ODD - 1);
        const standardStakePercentage = kellyFraction > 0 ? kellyFraction : 0.05;
        filteredData.forEach((entry, index) => {
            let stake = isSorosLevel ? sorosAmount : bankroll * standardStakePercentage;
            stake = Math.max(stake, 0.01);
            if (stake > bankroll) stake = bankroll;
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
                pointBackgroundColors.push('rgba(0, 209, 178, 0.8)');
                pointRadii.push(3);
            } else { // Red
                bankroll -= stake;
                isSorosLevel = false;
                sorosAmount = 0;
                pointBackgroundColors.push('#FF3860');
                pointRadii.push(5);
            }
            dataPoints.push(bankroll.toFixed(2));
            labels.push(index + 1);
            tooltipData.push({ ...entry, date: entry.date.toLocaleString('pt-BR'), bankroll: bankroll.toFixed(2) });
        });
        setChartData({
            labels,
            datasets: [{
                label: 'Performance', data: dataPoints, backgroundColor: 'rgba(0, 209, 178, 0.1)', fill: true, tension: 0.1,
                pointBackgroundColor: pointBackgroundColors, pointBorderColor: pointBackgroundColors, pointRadius: pointRadii, pointHoverRadius: 7,
                segment: {
                    borderColor: ctx => {
                        const dataIndex = ctx.p1.dataIndex;
                        if (tooltipData[dataIndex] && tooltipData[dataIndex].result === 0) return '#FF3860';
                        return 'rgba(0, 209, 178, 0.8)';
                    },
                },
            }],
            yAxisLabel: 'Banca (Unidades)', tooltipData
        });
    }, [filteredData]);

    return (
        <>
            <section className="dashboard-header"><div className="container"><h1>Performance Histórica da Estratégia</h1><p>Visualize nossos resultados desde 2022 de forma transparente.</p></div></section>
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
                                enabled: true, mode: 'index', intersect: false,
                                callbacks: {
                                    title: (context) => `Data (Aprox.): ${chartData.tooltipData[context[0].dataIndex].date}`,
                                    label: (context) => {
                                        const data = chartData.tooltipData[context.dataIndex];
                                        return [ `Jogo: ${data.teams} (${data.score})`, `Resultado: ${data.result === 1 ? 'Green' : 'Red'}`, `Banca: ${data.bankroll} Unidades`];
                                    }
                                }
                            },
                            // --- ESTA É A NOVA CONFIGURAÇÃO DE ZOOM ---
                            zoom: {
                                pan: { 
                                    enabled: true,      // Habilita o "arrastar"
                                    mode: 'x',          // Arrastar apenas no eixo horizontal
                                    threshold: 5,       
                                },
                                zoom: { 
                                    wheel: { enabled: true }, // Zoom com a roda do mouse
                                    pinch: { enabled: true }, // Zoom com gesto de pinça (mobile)
                                    mode: 'x'                 // Zoom apenas no eixo horizontal
                                }
                            },
                            // --- ESTA É A NOVA CONFIGURAÇÃO DE "SUAVIZAÇÃO" ---
                            decimation: { 
                                enabled: true,          // Habilita a otimização
                                algorithm: 'lttb',      // Algoritmo que mantém a forma do gráfico
                                samples: 100,           // Máximo de pontos a exibir quando sem zoom
                                threshold: 150          // Ativa apenas para gráficos com mais de 150 pontos
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
    const [error, setError] = useState('');

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
        setError('');
        if (!user) return;

        try {
            const userDocRef = doc(db, "users", user.uid);
            const updatedProfileData = { displayName, phone, address };
            await setDoc(userDocRef, updatedProfileData, { merge: true });
            
            if (user.displayName !== displayName) {
                await updateProfile(user, { displayName });
            }

            setUserProfile(prev => ({ ...prev, ...updatedProfileData }));
            setMessage('Perfil atualizado com sucesso!');
        } catch (err) {
            console.error("Erro ao atualizar o perfil:", err);
            setError('Erro ao atualizar o perfil.');
        }
    };

    const handlePasswordReset = async () => {
        setMessage('');
        setError('');
        try {
            await sendPasswordResetEmail(auth, user.email);
            setMessage('Link de redefinição enviado para o seu e-mail!');
        } catch (err) {
            setError('Não foi possível enviar o e-mail de redefinição.');
        }
    };

    if (!userProfile) {
        return <div style={{textAlign: 'center', marginTop: '150px'}}>Carregando perfil...</div>;
    }

    const memberSince = new Date(user.metadata.creationTime).toLocaleDateString('pt-BR', {
        day: '2-digit', month: 'long', year: 'numeric'
    });

    return (
        <>
            <section className="page-header">
                <div className="container"><h1>Meu Perfil</h1></div>
            </section>
            <div className="container" style={{maxWidth: '1000px', margin: '0 auto 80px auto'}}>
                <div className="profile-grid-container">
                    <div className="profile-main-card">
                         <div className="profile-header">
                            {/* IMAGEM PADRÃO ALTERADA E FUNCIONALIDADE DE UPLOAD REMOVIDA */}
                            <div className="profile-pic-container">
                                <img src={userProfile?.photoURL || process.env.PUBLIC_URL + '/images/perfil.png'} alt="Foto de Perfil" className="profile-pic" />
                            </div>
                            <h2>{userProfile.displayName}</h2>
                            <p>{user.email}</p>
                            <p className="member-since">Membro desde {memberSince}</p>
                        </div>
                        <form className="profile-form" onSubmit={handleSave}>
                            <div className="form-group">
                                <label htmlFor="displayName">Nome de Exibição</label>
                                <input type="text" id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label htmlFor="phone">Telefone</label>
                                <input type="tel" id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(XX) XXXXX-XXXX"/>
                            </div>
                            <div className="form-group">
                                <label htmlFor="address">Morada</label>
                                <input type="text" id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Sua cidade, estado"/>
                            </div>
                            <button type="submit" className="btn btn-primary">Guardar Alterações</button>
                        </form>
                    </div>

                    <div className="profile-side-cards">
                        <div className="side-card">
                            <h4>Meu Plano</h4>
                            <span className={`status-badge ${userProfile.isVip ? 'vip' : 'free'}`}>
                                {userProfile.isVip ? 'Plano VIP' : 'Plano Gratuito'}
                            </span>
                            <p className="plan-description">
                                {userProfile.isVip
                                    ? "Você tem acesso a todas as ferramentas e sinais exclusivos da plataforma."
                                    : "Faça o upgrade para o plano VIP e tenha acesso ilimitado a todas as nossas análises e ferramentas."
                                }
                            </p>
                            {!userProfile.isVip && (
                                <Link to="/planos" className="btn btn-primary" style={{width: '100%'}}>Seja VIP Agora</Link>
                            )}
                        </div>
                        <div className="side-card">
                             <h4>Segurança</h4>
                             <p className="plan-description">Mantenha sua conta segura. Se desejar, altere sua senha clicando no botão abaixo.</p>
                             <button className="btn btn-secondary" style={{width: '100%'}} onClick={handlePasswordReset}>Alterar Senha</button>
                        </div>
                         {(message || error) && (
                            <div className={`message ${error ? 'error' : 'success'}`} style={{display: 'block', marginTop: '20px', textAlign: 'center'}}>
                                {message || error}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

function VipSignalsPage() {
    const [signals, setSignals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const parseSignalText = (textData) => {
            const lines = textData.split('\n').map(line => line.trim()).filter(line => line);
            const rawSignals = [];

            let currentSignal = null;

            lines.forEach(line => {
                if (line.startsWith('🎯 PARTIDA:')) {
                    if (currentSignal) rawSignals.push(currentSignal);
                    currentSignal = { title: line.replace('🎯 PARTIDA:', '').trim(), content: [] };
                } else if (currentSignal && !line.startsWith('---') && !line.startsWith('===')) {
                    currentSignal.content.push(line);
                }
            });
            if (currentSignal) rawSignals.push(currentSignal);

            // Estruturar os dados de cada sinal
            return rawSignals.map((signal, index) => {
                const structuredSignal = {
                    id: index,
                    match: signal.title,
                    profile: 'Não especificado',
                    analysis: '',
                    warning: '',
                    betSuggestion: 'Mercado de Menos de 3.5 Gols.',
                    metrics: {}
                };

                let readingMetrics = false;
                signal.content.forEach(line => {
                    if (line.includes('PERFIL ENCONTRADO:')) {
                        structuredSignal.profile = line.split(':')[1].trim().replace(/"/g, '');
                    } else if (line.includes('RESUMO DA ANÁLISE:')) {
                        structuredSignal.analysis = line.split(':')[1].trim();
                    } else if (line.includes('PONTO DE ATENÇÃO:')) {
                        structuredSignal.warning = signal.content.slice(signal.content.indexOf(line) + 1).join(' ');
                        readingMetrics = false;
                    } else if (line.includes('MÉTRICAS CHAVE:')) {
                        readingMetrics = true;
                    } else if (readingMetrics) {
                        const parts = line.split(':');
                        if (parts.length > 1) {
                            const key = parts[0].replace('-', '').trim();
                            const value = parseFloat(parts[1]);
                            if (!isNaN(value)) {
                                structuredSignal.metrics[key] = value;
                            }
                        }
                    }
                });

                return structuredSignal;
            });
        };
        
        const loadTips = async () => {
            try {
                const response = await fetch(process.env.PUBLIC_URL + '/dicas-da-semana.txt');
                if (!response.ok) throw new Error('Arquivo de sinais não encontrado.');
                const textData = await response.text();
                
                const parsedSignals = parseSignalText(textData);
                setSignals(parsedSignals);
            } catch (error) {
                console.error("Erro ao carregar sinais VIP:", error);
            } finally {
                setLoading(false);
            }
        };
        loadTips();
    }, []);

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
        alert('Aposta copiada para a área de transferência!');
    };

    const filteredSignals = signals.filter(signal =>
        signal.match.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Componente para a barra de progresso
    const MetricBar = ({ label, value, max = 5 }) => {
        const percentage = (value / max) * 100;
        let barColor = 'var(--color-primary)';
        if (percentage > 66) barColor = '#FF3860'; // Vermelho para valores altos
        else if (percentage > 33) barColor = '#FFD700'; // Amarelo para médios
        
        return (
            <div className="metric-bar">
                <div className="metric-label">
                    <span>{label}</span>
                    <span>{value.toFixed(2)}</span>
                </div>
                <div className="progress-container">
                    <div className="progress-bar" style={{ width: `${percentage}%`, backgroundColor: barColor }}></div>
                </div>
            </div>
        );
    };


    return (
        <>
            <section className="page-header">
                <div className="container">
                    <h1>Sinais VIP</h1>
                    <p>Acesso completo a todas as análises geradas por nossa IA.</p>
                </div>
            </section>
            <div className="container" style={{ paddingBottom: '80px' }}>
                <div className="controls-container">
                    <div className="search-bar">
                        <FaSearch />
                        <input
                            type="text"
                            placeholder="Pesquisar por equipa ou liga..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="filters">
                        <button className="control-btn active">Hoje</button>
                        <button className="control-btn">Amanhã</button>
                    </div>
                </div>

                {loading ? (
                    <p style={{ textAlign: 'center' }}>A carregar sinais...</p>
                ) : (
                    <div className="signals-grid">
                        {filteredSignals.map(signal => (
                            <div key={signal.id} className="signal-card">
                                <div className="card-header">
                                    <h3>{signal.match}</h3>
                                    <span className="profile-badge">{signal.profile}</span>
                                </div>
                                <div className="card-body">
                                    <div className="main-bet-suggestion">
                                        <h4>Aposta Sugerida</h4>
                                        <p>{signal.betSuggestion}</p>
                                        <button className="copy-btn" onClick={() => handleCopy(`${signal.match} - ${signal.betSuggestion}`)}>
                                            <FaCopy /> Copiar Aposta
                                        </button>
                                    </div>
                                    <div className="metrics-container">
                                        <h4>Métricas Chave</h4>
                                        <MetricBar label="xG Total" value={signal.metrics['Expectativa de Gols (xG Total)'] || 0} max={4}/>
                                        <MetricBar label="Pot. Ofensivo" value={signal.metrics['Potencial Ofensivo Combinado (PO)'] || 0} max={5}/>
                                        <MetricBar label="Média Gols Sofridos" value={signal.metrics['Média de Gols Sofridos Combinada (MGS)'] || 0} max={4}/>
                                    </div>
                                </div>
                                <div className="card-footer">
                                    <details>
                                        <summary>
                                            Ver Análise Completa <FaChevronDown className="chevron-icon"/>
                                        </summary>
                                        <div className="analysis-content">
                                            <p><strong>Resumo:</strong> {signal.analysis}</p>
                                            <p><strong>Ponto de Atenção:</strong> {signal.warning}</p>
                                        </div>
                                    </details>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                 { !loading && filteredSignals.length === 0 && <p style={{textAlign: 'center', marginTop: '40px'}}>Nenhum sinal encontrado para a sua pesquisa.</p> }
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
// --- PÁGINA DE GESTÃO DE BANCA COM LÓGICA DE PRIMEIRO ACESSO CORRIGIDA ---

function BankrollManagerPage() {
    const { user } = useAuth();
    const [appState, setAppState] = useState({
        bankroll: 100.00,
        isSorosActive: false,
        sorosStake: 0,
        history: [],
        pendingBet: null,
    });
    const [odd, setOdd] = useState(1.24);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null); // Novo estado para erros
    const fileInputRef = useRef(null);

    useEffect(() => {
        const loadStateFromFirestore = async () => {
            if (!user) {
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null); // Reseta o erro a cada nova tentativa
            const docRef = doc(db, "bankrollManagement", user.uid);
            
            try {
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    // Usuário existente: carrega os dados
                    const loadedState = docSnap.data();
                    loadedState.pendingBet = null;
                    setAppState(loadedState);
                } else {
                    // NOVO USUÁRIO: A conta não existe, então apenas prepara o estado padrão.
                    // Isso é o comportamento esperado, não um erro.
                    setAppState({
                        bankroll: 100.00, isSorosActive: false, sorosStake: 0, history: [], pendingBet: null
                    });
                }
            } catch (err) {
                // ERRO REAL: Acontece se houver falha de conexão ou permissão.
                console.error("Erro ao carregar dados do Firestore:", err);
                setError("Não foi possível carregar seus dados. Verifique sua conexão e as regras de segurança do Firebase.");
            } finally {
                setLoading(false);
            }
        };

        loadStateFromFirestore();
    }, [user]);

    // ... (O restante de todas as outras funções: saveStateToFirestore, getNextStake, handleAddBet, resolveBet, etc., continuam EXATAMENTE IGUAIS) ...
    const saveStateToFirestore = async (newState) => {
        if (!user) return;
        const stateToSave = { ...newState, pendingBet: null };
        try {
            const docRef = doc(db, "bankrollManagement", user.uid);
            await setDoc(docRef, stateToSave);
        } catch (error) {
            console.error("Erro ao salvar o estado:", error);
            alert("Houve um erro ao salvar seu progresso.");
        }
    };
    
    const ASSERTIVENESS = 0.807;
    const ODD_THRESHOLD = 1.27;
    const FIXED_STAKE_PERCENTAGE = 0.05;

    const getNextStake = (currentOdd) => {
        if (appState.isSorosActive) {
            return { stake: appState.sorosStake, type: 'Soros Nv. 1' };
        }
        if (isNaN(currentOdd)) return { stake: 0, type: 'Inválido' };
        if (currentOdd <= ODD_THRESHOLD) {
            const stake = appState.bankroll * FIXED_STAKE_PERCENTAGE;
            return { stake, type: `Stake Fixa (${(FIXED_STAKE_PERCENTAGE * 100).toFixed(1)}%)` };
        } else {
            const p = ASSERTIVENESS;
            const b = currentOdd - 1;
            const kellyFraction = (p * b - (1 - p)) / b;
            if (kellyFraction <= 0) return { stake: 0, type: 'Kelly (EV-)' };
            return { stake: appState.bankroll * kellyFraction, type: `Kelly (${(kellyFraction * 100).toFixed(2)}%)` };
        }
    };

    const nextBetInfo = getNextStake(odd);

    const handleAddBet = () => {
        if (isNaN(odd) || odd <= 1) { alert('Insira uma odd válida.'); return; }
        if (nextBetInfo.stake <= 0) { alert('A aposta não tem EV+. Nenhuma aposta será registrada.'); return; }
        const newBet = { id: Date.now(), type: nextBetInfo.type, stake: nextBetInfo.stake, odd: odd };
        setAppState(prev => ({ ...prev, pendingBet: newBet }));
    };

    const resolveBet = (isWin) => {
        if (!appState.pendingBet) return;
        const betData = appState.pendingBet;
        const profit = isWin ? betData.stake * (betData.odd - 1) : -betData.stake;
        const newBankroll = appState.bankroll + profit;
        let newIsSorosActive = isWin && !appState.isSorosActive;
        let newSorosStake = newIsSorosActive ? betData.stake + profit : 0;
        const resolvedBet = { ...betData, profit, finalBankroll: newBankroll };
        const newState = {
            bankroll: newBankroll,
            isSorosActive: newIsSorosActive,
            sorosStake: newSorosStake,
            history: [resolvedBet, ...appState.history],
            pendingBet: null
        };
        setAppState(newState);
        saveStateToFirestore(newState);
    };
    
    const handleReset = () => {
        if (window.confirm("ATENÇÃO: Isso apagará PERMANENTEMENTE todo o histórico e redefinirá a banca. Deseja continuar?")) {
            const newState = {
                bankroll: 100.00, isSorosActive: false, sorosStake: 0, history: [], pendingBet: null
            };
            setAppState(newState);
            saveStateToFirestore(newState);
            setOdd(1.24);
        }
    };
    
    const handleExport = () => {
        const stateToExport = { ...appState, pendingBet: null };
        if (stateToExport.history.length === 0) { alert("Não há histórico para exportar."); return; }
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(stateToExport));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `historico_banca_${new Date().toISOString().slice(0,10)}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    const handleImport = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importedState = JSON.parse(e.target.result);
                if ('bankroll' in importedState && 'history' in importedState) {
                    if (window.confirm('Isso irá substituir o histórico atual. Deseja continuar?')) {
                        importedState.pendingBet = null;
                        setAppState(importedState);
                        saveStateToFirestore(importedState);
                        alert('Histórico importado com sucesso!');
                    }
                } else { throw new Error("Formato inválido."); }
            } catch (error) { alert('Erro ao carregar o arquivo.'); }
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    // Renderização condicional da UI
    const renderContent = () => {
        if (loading) {
            return <div className="bm-card" style={{textAlign: 'center', padding: '50px 0'}}>Carregando seus dados...</div>;
        }
        if (error) {
            return <div className="bm-card" style={{textAlign: 'center', padding: '50px 0', color: 'var(--color-error)'}}>{error}</div>;
        }
        return (
            <>
                <div className="bm-grid-container">
                     {/* ... Controles, Resumo, etc. ... */}
                     <div className="bm-card">
                        <h2 className="bm-card-title">Controles</h2>
                        <div className="form-group">
                            <label>Banca Atual (R$)</label>
                            <input type="number" value={appState.bankroll.toFixed(2)} onChange={(e) => setAppState(prev => ({...prev, bankroll: parseFloat(e.target.value) || 0, isSorosActive: false, sorosStake: 0}))} onBlur={() => saveStateToFirestore(appState)} />
                        </div>
                        <div className="form-group">
                            <label>Odd da Aposta</label>
                            <input type="number" value={odd} step="0.01" onChange={(e) => setOdd(parseFloat(e.target.value) || 0)} />
                        </div>
                        <div className="fixed-params">
                            <h3>Parâmetros Fixos</h3>
                            <div className="param-item"><span>Assertividade:</span><strong>80.7%</strong></div>
                            <div className="param-item"><span>Odd Limite (Kelly):</span><strong>1.27</strong></div>
                            <div className="param-item"><span>Stake Fixa (Odds Baixas):</span><strong>5%</strong></div>
                        </div>
                        <button className="btn btn-primary" onClick={handleAddBet} disabled={!!appState.pendingBet}>
                            {appState.pendingBet ? 'Aguardando Resultado...' : 'Registrar Nova Aposta'}
                        </button>
                    </div>
                    <div className="bm-card">
                        <h2 className="bm-card-title">Próxima Entrada</h2>
                        <div className="bm-summary">
                            <div className="bm-status" style={{color: appState.isSorosActive ? '#e67e22' : 'var(--color-text-secondary)'}}>
                                {appState.isSorosActive ? 'Status: Soros Nível 1' : `Status: ${nextBetInfo.type}`}
                            </div>
                            <label>Valor Recomendado:</label>
                            <div className="bm-next-stake">R$ {nextBetInfo.stake.toFixed(2)}</div>
                        </div>
                    </div>
                    {appState.pendingBet && (
                        <div className="bm-card bm-pending-card">
                            <h2 className="bm-card-title">Resolver Aposta Pendente</h2>
                            <p>Tipo: <strong>{appState.pendingBet.type} @ {appState.pendingBet.odd.toFixed(2)}</strong></p>
                            <p>Stake: <strong>R$ {appState.pendingBet.stake.toFixed(2)}</strong></p>
                            <div className="bm-resolve-buttons">
                                <button className="btn-success" onClick={() => resolveBet(true)}>Green</button>
                                <button className="btn-danger" onClick={() => resolveBet(false)}>Red</button>
                            </div>
                        </div>
                    )}
                    <div className="bm-card bm-io-controls">
                        <button className="control-btn" onClick={handleExport}>Exportar</button>
                        <button className="control-btn" onClick={() => fileInputRef.current.click()}>Importar</button>
                        <input type="file" ref={fileInputRef} accept=".json" onChange={handleImport} style={{display: 'none'}} />
                        <button className="control-btn btn-danger" onClick={handleReset}>Reiniciar Tudo</button>
                    </div>
                </div>
                <div className="bm-card" style={{marginTop: '20px'}}>
                    <h2 className="bm-card-title">Histórico de Apostas</h2>
                    <div className="bm-history-table-container">
                        <table className="bm-history-table">
                            <thead>
                                <tr>
                                    <th>#</th><th>Tipo</th><th>Stake (R$)</th><th>Odd</th><th>Resultado</th><th>Lucro/Prej. (R$)</th><th>Banca Final (R$)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {appState.history.length > 0 ? (
                                    appState.history.map(bet => (
                                        <tr key={bet.id} className={bet.profit > 0 ? 'bm-green' : 'bm-red'}>
                                            <td>{appState.history.length - appState.history.indexOf(bet)}</td>
                                            <td>{bet.type}</td>
                                            <td>{bet.stake.toFixed(2)}</td>
                                            <td>{bet.odd.toFixed(2)}</td>
                                            <td><strong>{bet.profit > 0 ? 'Green' : 'Red'}</strong></td>
                                            <td>{bet.profit > 0 ? '+' : ''}{bet.profit.toFixed(2)}</td>
                                            <td>{bet.finalBankroll.toFixed(2)}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="7">Nenhum registro no histórico. Comece sua primeira aposta!</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </>
        );
    };

    return (
        <>
            <section className="page-header">
                <div className="container">
                    <h1>Gestão de Banca VIP</h1>
                    <p>Sua ferramenta exclusiva para aplicar nossa estratégia e acompanhar seus resultados.</p>
                </div>
            </section>
            <div className="container" style={{maxWidth: '1000px', margin: '0 auto 80px auto'}}>
                <details className="bm-explanation-box">
                    <summary>
                        <h3>Como Usar a Gestão de Banca? (Clique para expandir)</h3>
                        <FaChevronDown className="chevron-icon"/>
                    </summary>
                    <div className="explanation-content">
                        <h4>O Método Híbrido</h4>
                        <p>Nossa gestão combina duas estratégias para maximizar lucros e proteger sua banca:</p>
                        <ul>
                            <li><strong>Stake Fixa (Odds ≤ 1.27):</strong> Para jogos de altíssima probabilidade, usamos uma stake fixa de 5% sobre a banca para garantir consistência.</li>
                            <li><strong>Critério de Kelly (Odds > 1.27):</strong> Para odds de maior valor, a ferramenta calcula a porcentagem ideal da banca a ser apostada, baseada no Valor Esperado Positivo (EV+).</li>
                            <li><strong>Método Soros:</strong> Após um "Green", a ferramenta entra em "Modo Soros", onde a próxima stake será o valor da aposta anterior somado ao lucro, potencializando ganhos em sequências de vitórias. Após um "Red" ou um "Green" em modo Soros, o ciclo volta ao normal.</li>
                        </ul>
                        <h4>Passo a Passo da Ferramenta</h4>
                        <ol>
                            <li><strong>Banca e Odd:</strong> Confira sua banca e insira a odd da aposta.</li>
                            <li><strong>Verifique a Stake:</strong> O quadro "Próxima Entrada" mostrará o valor recomendado.</li>
                            <li><strong>Registre a Aposta:</strong> Clique em "Registrar". A aposta ficará pendente.</li>
                            <li><strong>Resolva o Resultado:</strong> Após o jogo, clique em "Green" ou "Red" para salvar o resultado.</li>
                        </ol>
                    </div>
                </details>
                
                {renderContent()}
                
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
	    <Route path="/gestao-de-banca" element={<VipRoute><BankrollManagerPage /></VipRoute>} />
            {/* Rotas Protegidas */}
            <Route path="/perfil" element={<AuthenticatedRoute><ProfilePage /></AuthenticatedRoute>} />
            <Route path="/sinais-vip" element={<VipRoute><VipSignalsPage /></VipRoute>} />
          </Routes>
        </Layout>
      </Router>
    </AuthProvider>
  );
}

