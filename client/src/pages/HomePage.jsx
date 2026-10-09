import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const HomePage = () => {
  const [activeSection, setActiveSection] = useState('home');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setMobileMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['home', 'services', 'about', 'contact'];
      const scrollPosition = window.scrollY + 100;

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const offsetTop = element.offsetTop;
          const offsetHeight = element.offsetHeight;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
    // ✅ Auto-close mobile menu
    if (isMobile) setMobileMenuOpen(false);
  };

  // ✅ UPDATED: Elementary-focused services
  const services = [
    {
      icon: '📚',
      title: 'Primary Education',
      desc: 'Grades 1–3 — Building foundational skills in literacy, numeracy, and values formation aligned with DepEd K-12 curriculum.'
    },
    {
      icon: '🔬',
      title: 'Intermediate Education',
      desc: 'Grades 4–6 — Advanced academic subjects, critical thinking, and preparation for junior high school.'
    },
    {
      icon: '🏆',
      title: 'Academic Excellence',
      desc: 'Recognizing outstanding learners under DepEd Order No. 36, s. 2016 — With Highest Honors, High Honors, and With Honors.'
    },
    {
      icon: '💻',
      title: 'Digital Learning',
      desc: 'ICT-integrated lessons, online student portal, and modern tools preparing learners for a digital-first future.'
    }
  ];

  const navItems = ['home', 'services', 'about', 'contact'];

  return (
    <div style={{
      fontFamily: 'Arial, sans-serif',
      minHeight: '100vh',
      background: `
        linear-gradient(135deg, rgba(26, 86, 219, 0.85) 0%, rgba(16, 185, 129, 0.75) 100%),
        url('https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1600&q=80')
      `,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: isMobile ? 'scroll' : 'fixed'
    }}>
      {/* Navbar */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        padding: isMobile ? '12px 16px' : '16px 60px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 100,
        background: 'rgba(255,255,255,0.1)',
        backdropFilter: 'blur(15px)',
        borderBottom: '1px solid rgba(255,255,255,0.15)',
        transition: 'all 0.3s ease'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px' }}>
          <div style={{
            background: 'white',
            width: isMobile ? '36px' : '40px',
            height: isMobile ? '36px' : '40px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: isMobile ? '18px' : '20px',
            fontWeight: 'bold',
            color: '#1a56db',
            flexShrink: 0
          }}>
            🎓
          </div>
          <div>
            <span style={{
              fontSize: isMobile ? '18px' : '22px',
              fontWeight: 'bold',
              color: 'white'
            }}>NCDC</span>
            {!isMobile && (
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)', display: 'block', marginTop: '-2px' }}>
                National Child Development Center
              </span>
            )}
          </div>
        </div>

        {/* ✅ Desktop Nav */}
        {!isMobile && (
          <div style={{ display: 'flex', gap: '30px', alignItems: 'center' }}>
            {navItems.map((section) => (
              <button
                key={section}
                onClick={() => scrollToSection(section)}
                style={{
                  color: activeSection === section ? '#fcd34d' : 'rgba(255,255,255,0.8)',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: activeSection === section ? '700' : '500',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px 4px',
                  position: 'relative',
                  transition: 'color 0.3s ease',
                  borderBottom: activeSection === section ? '2px solid #fcd34d' : '2px solid transparent'
                }}
                onMouseEnter={(e) => e.target.style.color = 'white'}
                onMouseLeave={(e) => {
                  if (activeSection !== section) {
                    e.target.style.color = 'rgba(255,255,255,0.8)';
                  }
                }}
              >
                {section.charAt(0).toUpperCase() + section.slice(1)}
              </button>
            ))}

            <Link to="/login" style={{
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              padding: '8px 24px',
              borderRadius: '30px',
              border: '1px solid rgba(255,255,255,0.3)',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '14px',
              backdropFilter: 'blur(5px)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(255,255,255,0.3)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(255,255,255,0.2)';
            }}>
              Log In
            </Link>
            <Link to="/apply" style={{
              background: 'white',
              color: '#1a56db',
              padding: '8px 28px',
              borderRadius: '30px',
              border: 'none',
              textDecoration: 'none',
              fontWeight: '700',
              fontSize: '14px',
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'scale(1.05)';
              e.target.style.boxShadow = '0 8px 25px rgba(0,0,0,0.3)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'scale(1)';
              e.target.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
            }}>
              Apply Now
            </Link>
          </div>
        )}

        {/* ✅ Mobile Hamburger */}
        {isMobile && (
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.25)',
              color: 'white',
              fontSize: '20px',
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              backdropFilter: 'blur(5px)',
              padding: 0
            }}
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        )}
      </nav>

      {/* ✅ Mobile Drawer */}
      {isMobile && mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 98
          }}
        />
      )}
      {isMobile && (
        <div style={{
          position: 'fixed',
          top: '60px',
          right: '12px',
          background: 'rgba(255,255,255,0.98)',
          backdropFilter: 'blur(20px)',
          borderRadius: '14px',
          boxShadow: '0 15px 40px rgba(0,0,0,0.25)',
          padding: '12px',
          zIndex: 99,
          minWidth: '220px',
          transform: mobileMenuOpen ? 'translateY(0) scale(1)' : 'translateY(-10px) scale(0.95)',
          opacity: mobileMenuOpen ? 1 : 0,
          pointerEvents: mobileMenuOpen ? 'auto' : 'none',
          transition: 'all 0.25s ease',
          transformOrigin: 'top right'
        }}>
          {navItems.map((section) => (
            <button
              key={section}
              onClick={() => scrollToSection(section)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '12px 14px',
                background: activeSection === section ? 'rgba(26,86,219,0.08)' : 'transparent',
                color: activeSection === section ? '#1a56db' : '#1f2937',
                fontWeight: activeSection === section ? '700' : '500',
                fontSize: '15px',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'background 0.2s ease'
              }}
            >
              {section.charAt(0).toUpperCase() + section.slice(1)}
            </button>
          ))}
          <div style={{
            borderTop: '1px solid #e5e7eb',
            marginTop: '8px',
            paddingTop: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                background: 'rgba(26,86,219,0.08)',
                color: '#1a56db',
                padding: '12px 14px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: '15px',
                textAlign: 'center'
              }}
            >
              Log In
            </Link>
            <Link
              to="/apply"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                background: 'linear-gradient(135deg, #1a56db, #3b82f6)',
                color: 'white',
                padding: '12px 14px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: '700',
                fontSize: '15px',
                textAlign: 'center',
                boxShadow: '0 4px 15px rgba(26,86,219,0.3)'
              }}
            >
              Apply Now
            </Link>
          </div>
        </div>
      )}

      {/* HERO SECTION */}
      <section id="home" style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        color: 'white',
        padding: isMobile ? '100px 16px 40px' : '120px 20px 40px',
        position: 'relative'
      }}>
        {!isMobile && (
          <>
            <div style={{
              position: 'absolute',
              top: '20%',
              right: '10%',
              width: '300px',
              height: '300px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              animation: 'float 8s ease-in-out infinite'
            }} />
            <div style={{
              position: 'absolute',
              bottom: '15%',
              left: '5%',
              width: '200px',
              height: '200px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              animation: 'float 6s ease-in-out infinite reverse'
            }} />
          </>
        )}

        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
          }
        `}</style>

        <div style={{ maxWidth: '800px', position: 'relative', zIndex: 2, width: '100%' }}>
          <div style={{
            background: 'rgba(255,255,255,0.15)',
            width: isMobile ? '80px' : '100px',
            height: isMobile ? '80px' : '100px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: isMobile ? '0 auto 20px' : '0 auto 30px',
            border: '2px solid rgba(255,255,255,0.2)',
            backdropFilter: 'blur(10px)',
            fontSize: isMobile ? '36px' : '48px',
            animation: 'float 4s ease-in-out infinite'
          }}>
            🎓
          </div>

          <h1 style={{
            fontSize: isMobile ? '32px' : '56px',
            fontWeight: '800',
            marginBottom: '8px',
            letterSpacing: isMobile ? '-0.5px' : '-1px',
            textShadow: '0 2px 20px rgba(0,0,0,0.2)',
            lineHeight: 1.2
          }}>
            Nurturing Today,<br />
            <span style={{ color: '#fcd34d' }}>Empowering Tomorrow</span>
          </h1>

          <p style={{
            fontSize: isMobile ? '15px' : '20px',
            marginBottom: isMobile ? '28px' : '40px',
            opacity: 0.95,
            maxWidth: '600px',
            marginLeft: 'auto',
            marginRight: 'auto',
            textShadow: '0 1px 10px rgba(0,0,0,0.1)',
            lineHeight: 1.6
          }}>
            Empowering children through quality education, holistic development, and compassionate care.
          </p>

          <div style={{
            display: 'flex',
            gap: '16px',
            justifyContent: 'center',
            flexWrap: 'wrap',
            flexDirection: isMobile ? 'column' : 'row'
          }}>
            <Link to="/apply" style={{
              background: 'white',
              color: '#1a56db',
              padding: isMobile ? '14px 24px' : '16px 48px',
              borderRadius: '50px',
              textDecoration: 'none',
              fontWeight: '700',
              fontSize: isMobile ? '16px' : '18px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
              transition: 'transform 0.3s, box-shadow 0.3s',
              display: 'inline-block',
              textAlign: 'center'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'scale(1.05)';
              e.target.style.boxShadow = '0 12px 40px rgba(0,0,0,0.3)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'scale(1)';
              e.target.style.boxShadow = '0 8px 30px rgba(0,0,0,0.2)';
            }}>
              📝 Enroll Now
            </Link>
            <button
              onClick={() => scrollToSection('services')}
              style={{
                background: 'rgba(255,255,255,0.15)',
                color: 'white',
                padding: isMobile ? '14px 24px' : '16px 40px',
                borderRadius: '50px',
                border: '2px solid rgba(255,255,255,0.3)',
                backdropFilter: 'blur(10px)',
                fontWeight: '600',
                fontSize: isMobile ? '16px' : '18px',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255,255,255,0.25)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255,255,255,0.15)';
              }}>
              Learn More →
            </button>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
            gap: isMobile ? '16px' : '20px',
            marginTop: isMobile ? '40px' : '60px',
            paddingTop: isMobile ? '24px' : '40px',
            borderTop: '1px solid rgba(255,255,255,0.15)'
          }}>
            {[
              { icon: '🛡️', label: 'SAFE', desc: 'Secure environment' },
              { icon: '🌱', label: 'DEVELOPMENT', desc: 'Holistic growth' },
              { icon: '📚', label: 'EDUCATION', desc: 'Quality learning' },
              { icon: '❤️', label: 'CARE', desc: 'Compassionate support' }
            ].map((item, index) => (
              <div key={index} style={{
                transition: 'transform 0.3s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                <div style={{ fontSize: isMobile ? '24px' : '28px' }}>{item.icon}</div>
                <p style={{ fontSize: '12px', fontWeight: '600', marginTop: '4px', margin: '4px 0 0' }}>{item.label}</p>
                <p style={{ fontSize: '11px', opacity: 0.8, margin: '2px 0 0' }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ✅ UPDATED SERVICES SECTION */}
      <section id="services" style={{
        padding: isMobile ? '60px 16px' : '80px 40px',
        minHeight: isMobile ? 'auto' : '100vh',
        display: 'flex',
        alignItems: 'center'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          <h2 style={{
            textAlign: 'center',
            fontSize: isMobile ? '24px' : '36px',
            color: 'white',
            marginBottom: '8px',
            textShadow: '0 2px 10px rgba(0,0,0,0.2)'
          }}>
            Our <span style={{ color: '#fcd34d' }}>Services</span>
          </h2>
          <p style={{
            textAlign: 'center',
            color: 'rgba(255,255,255,0.8)',
            fontSize: isMobile ? '14px' : '18px',
            marginBottom: isMobile ? '30px' : '50px'
          }}>
            Comprehensive DepEd K-12 aligned programs for Grades 1 through 6
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: isMobile ? '16px' : '30px'
          }}>
            {services.map((service, index) => (
              <div key={index} style={{
                background: 'rgba(255,255,255,0.12)',
                backdropFilter: 'blur(10px)',
                padding: isMobile ? '20px' : '30px',
                borderRadius: '16px',
                textAlign: 'center',
                border: '1px solid rgba(255,255,255,0.15)',
                boxShadow: '0 8px 30px rgba(0,0,0,0.1)',
                transition: 'all 0.4s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-10px) scale(1.02)';
                e.currentTarget.style.boxShadow = '0 15px 50px rgba(0,0,0,0.2)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.1)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
              }}>
                <div style={{ fontSize: isMobile ? '36px' : '48px', marginBottom: '12px' }}>{service.icon}</div>
                <h3 style={{ fontSize: isMobile ? '17px' : '20px', color: 'white', marginBottom: '8px' }}>{service.title}</h3>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', lineHeight: 1.6 }}>
                  {service.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ✅ UPDATED ABOUT SECTION */}
      <section id="about" style={{
        padding: isMobile ? '60px 16px' : '80px 40px',
        minHeight: isMobile ? 'auto' : '100vh',
        display: 'flex',
        alignItems: 'center'
      }}>
        <div style={{
          maxWidth: '1000px',
          margin: '0 auto',
          width: '100%',
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: isMobile ? '20px' : '50px',
          alignItems: 'center'
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
            padding: isMobile ? '24px 20px' : '40px',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.15)',
            transition: 'all 0.4s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
            e.currentTarget.style.transform = 'scale(1.02)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
            e.currentTarget.style.transform = 'scale(1)';
          }}>
            <h2 style={{
              fontSize: isMobile ? '24px' : '36px',
              color: 'white',
              marginBottom: '16px',
              textShadow: '0 2px 10px rgba(0,0,0,0.2)'
            }}>
              About <span style={{ color: '#fcd34d' }}>NCDC</span>
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: isMobile ? '14px' : '16px', lineHeight: '1.8', marginBottom: '16px' }}>
              The <strong style={{ color: 'white' }}>National Child Development Center (NCDC)</strong> is
              a DepEd-aligned elementary school committed to providing quality education for
              <strong style={{ color: 'white' }}> Grades 1 through 6</strong>.
            </p>
            <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: isMobile ? '14px' : '16px', lineHeight: '1.8' }}>
              Our mission is to foster academic excellence, character development, and lifelong
              learning in a safe, inclusive, and technology-driven environment.
            </p>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
            height: isMobile ? '180px' : '300px',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: isMobile ? '60px' : '80px',
            border: '1px solid rgba(255,255,255,0.15)',
            transition: 'all 0.4s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.03)';
            e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
          }}>
            🏫
          </div>
        </div>
      </section>

      {/* CONTACT SECTION */}
      <section id="contact" style={{
        padding: isMobile ? '60px 16px' : '80px 40px',
        minHeight: isMobile ? 'auto' : '100vh',
        display: 'flex',
        alignItems: 'center'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%', textAlign: 'center' }}>
          <h2 style={{
            fontSize: isMobile ? '24px' : '36px',
            color: 'white',
            marginBottom: '8px',
            textShadow: '0 2px 10px rgba(0,0,0,0.2)'
          }}>
            Contact <span style={{ color: '#fcd34d' }}>Us</span>
          </h2>
          <p style={{
            color: 'rgba(255,255,255,0.8)',
            fontSize: isMobile ? '14px' : '18px',
            marginBottom: isMobile ? '30px' : '40px'
          }}>
            Have questions? We'd love to hear from you!
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: isMobile ? '16px' : '30px'
          }}>
            {[
              { icon: '📍', title: 'Address', detail: 'Poblacion, Sevilla, Bohol' },
              { icon: '📧', title: 'Email', detail: 'info@ncdc.edu.ph' },
              { icon: '📞', title: 'Phone', detail: '09155085815' }
            ].map((item, index) => (
              <div key={index} style={{
                background: 'rgba(255,255,255,0.12)',
                backdropFilter: 'blur(10px)',
                padding: isMobile ? '20px' : '30px',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.15)',
                boxShadow: '0 8px 30px rgba(0,0,0,0.1)',
                transition: 'all 0.4s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.25)';
                e.currentTarget.style.boxShadow = '0 15px 40px rgba(0,0,0,0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
                e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.1)';
              }}>
                <div style={{ fontSize: isMobile ? '28px' : '32px', marginBottom: '8px' }}>{item.icon}</div>
                <h4 style={{ color: 'white', marginBottom: '4px', fontSize: '16px' }}>{item.title}</h4>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', whiteSpace: 'pre-line' }}>{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        background: 'rgba(0,0,0,0.2)',
        backdropFilter: 'blur(10px)',
        color: 'rgba(255,255,255,0.7)',
        padding: isMobile ? '24px 16px' : '40px',
        textAlign: 'center',
        borderTop: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: isMobile ? '16px' : '30px',
            marginBottom: '20px',
            flexWrap: 'wrap'
          }}>
            <button onClick={() => scrollToSection('home')} style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', padding: '4px' }}>Home</button>
            <button onClick={() => scrollToSection('services')} style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', padding: '4px' }}>Services</button>
            <button onClick={() => scrollToSection('about')} style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', padding: '4px' }}>About</button>
            <button onClick={() => scrollToSection('contact')} style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', padding: '4px' }}>Contact</button>
            <Link to="/login" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '13px', padding: '4px' }}>Login</Link>
            <Link to="/apply" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '13px', padding: '4px' }}>Apply</Link>
          </div>
          <p style={{ fontSize: isMobile ? '12px' : '14px', margin: 0 }}>
            © 2026 <strong style={{ color: 'white' }}>NCDC</strong> — National Children Development Center. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;