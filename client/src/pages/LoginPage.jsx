import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../services/api';

const LoginPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await API.post('/login', formData);
      
      if (response.data.success) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        const role = response.data.user.role;
        if (role === 'admin') {
          navigate('/admin/dashboard');
        } else if (role === 'registrar') {
          navigate('/registrar/dashboard');
        } else if (role === 'student') {
          navigate('/student/dashboard');
        } else {
          navigate('/');
        }
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotMessage('');

    try {
      const response = await API.post('/forgot-password', { email: forgotEmail });
      setForgotMessage(response.data.message);
      setForgotEmail('');
      setTimeout(() => {
        setShowForgotPassword(false);
        setForgotMessage('');
      }, 5000);
    } catch (error) {
      setForgotMessage(error.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      background: `
        linear-gradient(135deg, rgba(26, 86, 219, 0.85) 0%, rgba(16, 185, 129, 0.75) 100%),
        url('https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1600&q=80')
      `,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      overflow: 'hidden'
    }}>
      {/* Glassmorphism Container */}
      <div style={{
        display: 'flex',
        maxWidth: '1000px',
        width: '100%',
        height: '600px',
        maxHeight: '90vh',
        background: 'rgba(255,255,255,0.12)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: '24px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
        overflow: 'hidden',
        position: 'relative',
        border: '1px solid rgba(255,255,255,0.15)'
      }}>
        {/* Glass Decorative Elements */}
        <div style={{
          position: 'absolute',
          top: '-80px',
          right: '-80px',
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.08)'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-60px',
          left: '-60px',
          width: '150px',
          height: '150px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.08)'
        }} />

        {/* Left Side - Branding (Glass) */}
        <div style={{
          flex: '1',
          background: 'rgba(255,255,255,0.08)',
          padding: '50px 40px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          borderRight: '1px solid rgba(255,255,255,0.08)'
        }}>
          <div style={{ position: 'relative', zIndex: 2 }}>
            {/* Logo - Graduation Cap (same sa homepage) */}
            <div style={{
              background: 'rgba(255,255,255,0.15)',
              width: '70px',
              height: '70px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '24px',
              fontSize: '36px',
              border: '2px solid rgba(255,255,255,0.2)',
              backdropFilter: 'blur(10px)'
            }}>
              🎓
            </div>

            <h1 style={{
              fontSize: '32px',
              fontWeight: '800',
              marginBottom: '4px',
              letterSpacing: '-1px',
              textShadow: '0 2px 10px rgba(0,0,0,0.1)'
            }}>
              NCDC
            </h1>
            <p style={{
              fontSize: '14px',
              opacity: 0.9,
              marginBottom: '24px',
              fontWeight: '300'
            }}>
              National Child Development Center
            </p>

            <div style={{
              borderTop: '1px solid rgba(255,255,255,0.15)',
              paddingTop: '24px',
              marginTop: '4px'
            }}>
              <p style={{
                fontSize: '14px',
                opacity: 0.8,
                lineHeight: '1.8'
              }}>
                "Nurturing Today,<br />
                <strong style={{ color: '#fcd34d' }}>Empowering Tomorrow</strong>"
              </p>
            </div>

            {/* Features */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
              marginTop: '24px'
            }}>
              <div style={{
                background: 'rgba(255,255,255,0.08)',
                padding: '10px 14px',
                borderRadius: '10px',
                backdropFilter: 'blur(5px)',
                border: '1px solid rgba(255,255,255,0.08)'
              }}>
                <span style={{ fontSize: '18px' }}>🛡️</span>
                <p style={{ fontSize: '11px', marginTop: '2px', opacity: 0.9 }}>Safe Environment</p>
              </div>
              <div style={{
                background: 'rgba(255,255,255,0.08)',
                padding: '10px 14px',
                borderRadius: '10px',
                backdropFilter: 'blur(5px)',
                border: '1px solid rgba(255,255,255,0.08)'
              }}>
                <span style={{ fontSize: '18px' }}>📚</span>
                <p style={{ fontSize: '11px', marginTop: '2px', opacity: 0.9 }}>Quality Education</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form (Glass) */}
        <div style={{
          flex: '1.2',
          padding: '50px 45px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          overflow: 'hidden'
        }}>
          {!showForgotPassword ? (
            // ========== LOGIN FORM ==========
            <>
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{
                  fontSize: '26px',
                  fontWeight: '700',
                  color: 'white',
                  marginBottom: '2px',
                  textShadow: '0 2px 10px rgba(0,0,0,0.1)'
                }}>
                  Welcome Back! 🎓
                </h2>
                <p style={{
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: '14px'
                }}>
                  Sign in to continue to your account
                </p>
              </div>

              {error && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.2)',
                  backdropFilter: 'blur(10px)',
                  color: '#fca5a5',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  marginBottom: '14px',
                  fontSize: '13px',
                  border: '1px solid rgba(239, 68, 68, 0.3)'
                }}>
                  ❌ {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: 'rgba(255,255,255,0.9)',
                    marginBottom: '4px'
                  }}>
                    Username
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="Enter your username"
                    required
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '10px',
                      fontSize: '14px',
                      transition: 'all 0.3s',
                      background: 'rgba(255,255,255,0.08)',
                      backdropFilter: 'blur(10px)',
                      color: 'white',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'rgba(255,255,255,0.5)';
                      e.target.style.background = 'rgba(255,255,255,0.15)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255,255,255,0.2)';
                      e.target.style.background = 'rgba(255,255,255,0.08)';
                    }}
                  />
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: 'rgba(255,255,255,0.9)',
                    marginBottom: '4px'
                  }}>
                    Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    required
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '10px',
                      fontSize: '14px',
                      transition: 'all 0.3s',
                      background: 'rgba(255,255,255,0.08)',
                      backdropFilter: 'blur(10px)',
                      color: 'white',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'rgba(255,255,255,0.5)';
                      e.target.style.background = 'rgba(255,255,255,0.15)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255,255,255,0.2)';
                      e.target.style.background = 'rgba(255,255,255,0.08)';
                    }}
                  />
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '20px'
                }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13px',
                    color: 'rgba(255,255,255,0.8)',
                    cursor: 'pointer'
                  }}>
                    <input
                      type="checkbox"
                      style={{
                        width: '15px',
                        height: '15px',
                        accentColor: '#fcd34d'
                      }}
                    />
                    Remember me
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#fcd34d',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '600'
                    }}
                  >
                    Forgot Password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    background: loading ? 'rgba(255,255,255,0.3)' : 'linear-gradient(135deg, #fcd34d 0%, #f59e0b 100%)',
                    color: loading ? 'rgba(255,255,255,0.6)' : '#1f2937',
                    padding: '14px',
                    borderRadius: '10px',
                    border: 'none',
                    fontSize: '15px',
                    fontWeight: '700',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s',
                    boxShadow: '0 4px 20px rgba(245, 158, 11, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 8px 30px rgba(245, 158, 11, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 20px rgba(245, 158, 11, 0.3)';
                  }}
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>

              <div style={{
                marginTop: '16px',
                textAlign: 'center'
              }}>
                <p style={{
                  fontSize: '13px',
                  color: 'rgba(255,255,255,0.7)'
                }}>
                  Don't have an account?{' '}
                  <Link to="/apply" style={{
                    color: '#fcd34d',
                    fontWeight: '600',
                    textDecoration: 'none'
                  }}>
                    Apply Now
                  </Link>
                </p>
              </div>

              {/* Back to Home Button - instead of Login as Guest */}
              <div style={{
                marginTop: '12px',
                textAlign: 'center'
              }}>
                <Link to="/" style={{
                  display: 'inline-block',
                  background: 'rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(10px)',
                  color: 'rgba(255,255,255,0.8)',
                  padding: '10px 32px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  textDecoration: 'none',
                  fontWeight: '500',
                  fontSize: '14px',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(255,255,255,0.2)';
                  e.target.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(255,255,255,0.08)';
                  e.target.style.color = 'rgba(255,255,255,0.8)';
                }}>
                  ← Back to Home
                </Link>
              </div>
            </>
          ) : (
            // ========== FORGOT PASSWORD FORM ==========
            <>
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{
                  fontSize: '26px',
                  fontWeight: '700',
                  color: 'white',
                  marginBottom: '2px',
                  textShadow: '0 2px 10px rgba(0,0,0,0.1)'
                }}>
                  🔑 Forgot Password?
                </h2>
                <p style={{
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: '14px'
                }}>
                  Enter your email address and we'll notify the admin.
                </p>
              </div>

              {forgotMessage && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  marginBottom: '14px',
                  fontSize: '13px',
                  background: forgotMessage.includes('✅') ? 'rgba(52, 211, 153, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  color: forgotMessage.includes('✅') ? '#6ee7b7' : '#fca5a5',
                  border: `1px solid ${forgotMessage.includes('✅') ? 'rgba(52, 211, 153, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  backdropFilter: 'blur(10px)'
                }}>
                  {forgotMessage}
                </div>
              )}

              <form onSubmit={handleForgotPassword}>
                <div style={{ marginBottom: '18px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: 'rgba(255,255,255,0.9)',
                    marginBottom: '4px'
                  }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="Enter your registered email"
                    required
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '10px',
                      fontSize: '14px',
                      transition: 'all 0.3s',
                      background: 'rgba(255,255,255,0.08)',
                      backdropFilter: 'blur(10px)',
                      color: 'white',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'rgba(255,255,255,0.5)';
                      e.target.style.background = 'rgba(255,255,255,0.15)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255,255,255,0.2)';
                      e.target.style.background = 'rgba(255,255,255,0.08)';
                    }}
                  />
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>
                    We'll notify the admin to generate a temporary password for you.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  style={{
                    width: '100%',
                    background: forgotLoading ? 'rgba(255,255,255,0.3)' : 'linear-gradient(135deg, #fcd34d 0%, #f59e0b 100%)',
                    color: forgotLoading ? 'rgba(255,255,255,0.6)' : '#1f2937',
                    padding: '14px',
                    borderRadius: '10px',
                    border: 'none',
                    fontSize: '15px',
                    fontWeight: '700',
                    cursor: forgotLoading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s',
                    boxShadow: '0 4px 20px rgba(245, 158, 11, 0.3)'
                  }}
                >
                  {forgotLoading ? 'Sending...' : '📧 Send Request'}
                </button>
              </form>

              <div style={{ textAlign: 'center', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setForgotMessage('');
                    setForgotEmail('');
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(255,255,255,0.7)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    textDecoration: 'underline'
                  }}
                >
                  ← Back to Login
                </button>
              </div>
            </>
          )}

          {/* Footer */}
          <div style={{
            marginTop: '16px',
            paddingTop: '12px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
              © 2026 <strong style={{ color: 'rgba(255,255,255,0.7)' }}>NCDC</strong>. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;