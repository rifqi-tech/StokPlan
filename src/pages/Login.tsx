import React, { useState, useEffect } from 'react';
import { useStok } from '../context/StokContext';
import { useNavigate } from 'react-router-dom';
import { Package, Key, Mail, AlertTriangle, CheckCircle } from 'lucide-react';

const Login: React.FC = () => {
  const { user, signIn, signUp, error, clearError, isSupabaseConnected, loading } = useStok();
  const navigate = useNavigate();

  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [signUpSuccess, setSignUpSuccess] = useState<boolean>(false);

  // If user is already logged in, redirect to dashboard
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    clearError();

    if (!email.trim() || !password.trim()) {
      setValidationError('Semua kolom harus diisi!');
      return;
    }

    if (password.length < 6) {
      setValidationError('Password minimal harus 6 karakter!');
      return;
    }

    try {
      if (isSignUpMode) {
        await signUp(email, password);
        if (isSupabaseConnected) {
          setSignUpSuccess(true);
          setValidationError(null);
        }
      } else {
        await signIn(email, password);
      }
    } catch (err: any) {
      // Error will be displayed by the error state from context
    }
  };

  const toggleMode = () => {
    setIsSignUpMode(!isSignUpMode);
    setValidationError(null);
    clearError();
    setSignUpSuccess(false);
  };

  return (
    <div className="main-content animate-fade-in" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '90vh',
      gap: '24px'
    }}>
      
      {/* BRAND HEADER */}
      <div style={{ textAlign: 'center', maxWidth: '360px' }}>
        <div style={{ 
          display: 'inline-flex', 
          padding: '14px', 
          borderRadius: '20px', 
          background: 'var(--gradient-primary)', 
          color: '#fff',
          boxShadow: 'var(--shadow-glow)',
          marginBottom: '16px'
        }}>
          <Package size={36} />
        </div>
        <h1 style={{ 
          fontSize: '38px', 
          fontWeight: 900, 
          margin: '0 0 6px 0',
          letterSpacing: '-0.06em',
          background: 'var(--gradient-primary)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          StokPlan
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.4, fontWeight: 500 }}>
          Sistem manajemen stok & inventaris multi-toko berbasis cloud yang cerdas, aman, dan real-time. ⚡
        </p>
      </div>

      {/* LOGIN CARD */}
      <div className="glass-card" style={{ width: '100%', maxWidth: '400px', padding: '28px 24px' }}>
        
        {/* TABS FOR SIGN IN / SIGN UP */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          background: 'rgba(5, 8, 17, 0.4)', 
          padding: '4px', 
          borderRadius: '14px', 
          border: '1px solid var(--border-color)',
          marginBottom: '28px' 
        }}>
          <button 
            type="button"
            onClick={toggleMode}
            disabled={!isSignUpMode}
            style={{ 
              padding: '10px', 
              borderRadius: '10px', 
              border: 'none', 
              fontSize: '13px', 
              fontWeight: 700, 
              cursor: 'pointer',
              background: !isSignUpMode ? 'var(--gradient-primary)' : 'transparent',
              color: !isSignUpMode ? '#fff' : 'var(--text-secondary)',
              transition: 'var(--transition-fast)'
            }}
          >
            Masuk
          </button>
          <button 
            type="button"
            onClick={toggleMode}
            disabled={isSignUpMode}
            style={{ 
              padding: '10px', 
              borderRadius: '10px', 
              border: 'none', 
              fontSize: '13px', 
              fontWeight: 700, 
              cursor: 'pointer',
              background: isSignUpMode ? 'var(--gradient-primary)' : 'transparent',
              color: isSignUpMode ? '#fff' : 'var(--text-secondary)',
              transition: 'var(--transition-fast)'
            }}
          >
            Daftar
          </button>
        </div>

        {/* SIGN UP SUCCESS MESSAGE (Supabase confirmation email scenario) */}
        {signUpSuccess ? (
          <div className="empty-state" style={{ padding: '16px 0', gap: '12px' }}>
            <div style={{ color: 'var(--success)', background: 'var(--success-bg)', padding: '12px', borderRadius: '50%' }}>
              <CheckCircle size={32} />
            </div>
            <h3 style={{ fontSize: '18px', margin: 0 }}>Pendaftaran Sukses!</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              Silakan cek kotak masuk email Anda (**{email}**) untuk melakukan verifikasi akun sebelum masuk ke dashboard.
            </p>
            <button className="btn btn-secondary" onClick={() => setSignUpSuccess(false)} style={{ marginTop: '12px' }}>
              Kembali ke Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label htmlFor="auth-email">Email Pengguna</label>
              <div style={{ position: 'relative' }}>
                <input 
                  id="auth-email"
                  type="email" 
                  placeholder="nama@email.com" 
                  className="input-control"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ paddingLeft: '44px' }}
                  required
                />
                <Mail 
                  size={16} 
                  style={{ 
                    position: 'absolute', 
                    left: '16px', 
                    top: '50%', 
                    transform: 'translateY(-50%)', 
                    color: 'var(--text-muted)' 
                  }} 
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label htmlFor="auth-pass">Kata Sandi</label>
              <div style={{ position: 'relative' }}>
                <input 
                  id="auth-pass"
                  type="password" 
                  placeholder="******" 
                  className="input-control"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingLeft: '44px' }}
                  required
                />
                <Key 
                  size={16} 
                  style={{ 
                    position: 'absolute', 
                    left: '16px', 
                    top: '50%', 
                    transform: 'translateY(-50%)', 
                    color: 'var(--text-muted)' 
                  }} 
                />
              </div>
            </div>

            {/* ERROR BADGES */}
            {(validationError || error) && (
              <div className="badge badge-danger" style={{ 
                width: '100%', 
                borderRadius: '12px', 
                padding: '10px 14px', 
                display: 'flex', 
                gap: '8px', 
                alignItems: 'flex-start',
                textTransform: 'none'
              }}>
                <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span style={{ fontSize: '13px', textAlign: 'left', fontWeight: 600 }}>
                  {validationError || error}
                </span>
              </div>
            )}

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '8px' }}>
              {loading ? 'Memproses...' : isSignUpMode ? 'Daftar Akun Baru' : 'Masuk ke Dashboard 🚪'}
            </button>
          </form>
        )}
      </div>

      {/* OFFLINE DEMO TIPS */}
      {!isSupabaseConnected && !signUpSuccess && (
        <div className="glass-card" style={{ 
          maxWidth: '400px', 
          background: 'rgba(245, 158, 11, 0.05)', 
          borderColor: 'rgba(245, 158, 11, 0.15)',
          padding: '16px 20px',
          borderRadius: '18px',
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-start'
        }}>
          <span style={{ fontSize: '18px', marginTop: '2px' }}>💡</span>
          <div>
            <h4 style={{ fontSize: '13px', margin: '0 0 4px 0', color: 'var(--warning)', fontWeight: 700 }}>MODE DEMO INTERAKTIF</h4>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
              Database Supabase belum terhubung. Anda dapat menggunakan akun demo berikut untuk menguji sistem multi-toko dan pemisahan data:
              <br />
              • <strong>toko1@gmail.com</strong> (Sandi: <strong>toko123</strong>)
              <br />
              • <strong>toko2@gmail.com</strong> (Sandi: <strong>toko123</strong>)
              <br />
              Atau daftarkan email baru Anda sendiri secara instan!
            </p>
          </div>
        </div>
      )}

      {/* FOOTER WATERMARK & CONTACT */}
      <div style={{ 
        textAlign: 'center', 
        marginTop: '12px', 
        fontSize: '11px', 
        color: 'var(--text-muted)',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        opacity: 0.6
      }}>
        <span>Made by <strong>Ripki</strong></span>
        <a 
          href="mailto:areef.qhi@gmail.com" 
          style={{ 
            color: 'var(--primary)', 
            textDecoration: 'none', 
            fontWeight: 600,
            transition: 'var(--transition-fast)'
          }}
          onMouseOver={(e) => e.currentTarget.style.color = '#818cf8'}
          onMouseOut={(e) => e.currentTarget.style.color = 'var(--primary)'}
        >
          areef.qhi@gmail.com
        </a>
      </div>
    </div>
  );
};

export default Login;
