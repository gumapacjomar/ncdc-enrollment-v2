import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

const HomePage = () => {
  const [activeSection, setActiveSection] = useState('home');

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
  };

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
      backgroundAttachment: 'fixed'
    }}>
      {/* Navbar */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        padding: '16px 60px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 100,
        background: 'rgba(255,255,255,0.1)',
        backdropFilter: 'blur(15px)',
        borderBottom: '1px solid rgba(255,255,255,0.15)',
        transition: 'all 0.3s ease'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            background: 'white',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#1a56db'
          }}>
            🎓
          </div>
          <div>
            <span style={{ fontSize: '22px', fontWeight: 'bold', color: 'white' }}>NCDC</span>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)', display: 'block', marginTop: '-2px' }}>
              National Child Development Center
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '30px', alignItems: 'center' }}>
          {['home', 'services', 'about', 'contact'].map((section) => (
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
      </nav>

      {/* ========================================== */}
      {/* HERO SECTION */}
      {/* ========================================== */}
      <section id="home" style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        color: 'white',
        padding: '120px 20px 40px',
        position: 'relative'
      }}>
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

        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
          }
        `}</style>

        <div style={{ maxWidth: '800px', position: 'relative', zIndex: 2 }}>
          <div style={{
            background: 'rgba(255,255,255,0.15)',
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 30px',
            border: '2px solid rgba(255,255,255,0.2)',
            backdropFilter: 'blur(10px)',
            fontSize: '48px',
            animation: 'float 4s ease-in-out infinite'
          }}>
            🎓
          </div>

          <h1 style={{
            fontSize: '56px',
            fontWeight: '800',
            marginBottom: '8px',
            letterSpacing: '-1px',
            textShadow: '0 2px 20px rgba(0,0,0,0.2)'
          }}>
            Nurturing Today,<br />
            <span style={{ color: '#fcd34d' }}>Empowering Tomorrow</span>
          </h1>
          
          <p style={{
            fontSize: '20px',
            marginBottom: '40px',
            opacity: 0.95,
            maxWidth: '600px',
            marginLeft: 'auto',
            marginRight: 'auto',
            textShadow: '0 1px 10px rgba(0,0,0,0.1)'
          }}>
            Empowering children through quality education, holistic development, and compassionate care.
          </p>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/apply" style={{
              background: 'white',
              color: '#1a56db',
              padding: '16px 48px',
              borderRadius: '50px',
              textDecoration: 'none',
              fontWeight: '700',
              fontSize: '18px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
              transition: 'transform 0.3s, box-shadow 0.3s',
              display: 'inline-block'
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
                padding: '16px 40px',
                borderRadius: '50px',
                border: '2px solid rgba(255,255,255,0.3)',
                backdropFilter: 'blur(10px)',
                fontWeight: '600',
                fontSize: '18px',
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
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '20px',
            marginTop: '60px',
            paddingTop: '40px',
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
                <div style={{ fontSize: '28px' }}>{item.icon}</div>
                <p style={{ fontSize: '13px', fontWeight: '600', marginTop: '4px' }}>{item.label}</p>
                <p style={{ fontSize: '11px', opacity: 0.8 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================== */}
      {/* SERVICES SECTION */}
      {/* ========================================== */}
      <section id="services" style={{
        padding: '80px 40px',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          <h2 style={{
            textAlign: 'center',
            fontSize: '36px',
            color: 'white',
            marginBottom: '8px',
            textShadow: '0 2px 10px rgba(0,0,0,0.2)'
          }}>
            Our <span style={{ color: '#fcd34d' }}>Services</span>
          </h2>
          <p style={{
            textAlign: 'center',
            color: 'rgba(255,255,255,0.8)',
            fontSize: '18px',
            marginBottom: '50px'
          }}>
            Quality early childhood education and development programs for children ages 4-5
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '30px'
          }}>
            {/* Service 1: Early Education */}
            <div style={{
              background: 'rgba(255,255,255,0.12)',
              backdropFilter: 'blur(10px)',
              padding: '30px',
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
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>📚</div>
              <h3 style={{ fontSize: '20px', color: 'white', marginBottom: '8px' }}>Early Education</h3>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>
                Preschool and kindergarten programs for children ages 4-5. Foundational skills in literacy, numeracy, and social development.
              </p>
            </div>

            {/* Service 2: Creative Development */}
            <div style={{
              background: 'rgba(255,255,255,0.12)',
              backdropFilter: 'blur(10px)',
              padding: '30px',
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
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎨</div>
              <h3 style={{ fontSize: '20px', color: 'white', marginBottom: '8px' }}>Creative Development</h3>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>
                Arts, music, and creative activities that encourage self-expression, imagination, and fine motor skills.
              </p>
            </div>

            {/* Service 3: Cognitive Learning */}
            <div style={{
              background: 'rgba(255,255,255,0.12)',
              backdropFilter: 'blur(10px)',
              padding: '30px',
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
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🧠</div>
              <h3 style={{ fontSize: '20px', color: 'white', marginBottom: '8px' }}>Cognitive Learning</h3>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>
                Interactive and engaging learning methods that develop critical thinking, problem-solving, and curiosity.
              </p>
            </div>

            {/* Service 4: Parent Support */}
            <div style={{
              background: 'rgba(255,255,255,0.12)',
              backdropFilter: 'blur(10px)',
              padding: '30px',
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
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🤝</div>
              <h3 style={{ fontSize: '20px', color: 'white', marginBottom: '8px' }}>Parent Support</h3>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>
                Support programs for parents including seminars, child development workshops, and regular progress updates.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================== */}
      {/* ABOUT SECTION */}
      {/* ========================================== */}
      <section id="about" style={{
        padding: '80px 40px',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center'
      }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '50px', alignItems: 'center' }}>
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
            padding: '40px',
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
            <h2 style={{ fontSize: '36px', color: 'white', marginBottom: '16px', textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
              About <span style={{ color: '#fcd34d' }}>NCDC</span>
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '16px', lineHeight: '1.8', marginBottom: '16px' }}>
              The <strong style={{ color: 'white' }}>National Children Development Center (NCDC)</strong> is dedicated to providing 
              quality early childhood education and development programs for children ages 4 to 5 years old.
            </p>
            <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '16px', lineHeight: '1.8' }}>
              Our mission is to nurture young minds through creative, cognitive, and social development 
              in a safe and supportive environment.
            </p>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
            height: '300px',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '80px',
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

      {/* ========================================== */}
      {/* CONTACT SECTION */}
      {/* ========================================== */}
      <section id="contact" style={{
        padding: '80px 40px',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%', textAlign: 'center' }}>
          <h2 style={{ fontSize: '36px', color: 'white', marginBottom: '8px', textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
            Contact <span style={{ color: '#fcd34d' }}>Us</span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '18px', marginBottom: '40px' }}>
            Have questions? We'd love to hear from you!
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '30px'
          }}>
            {[
              { icon: '📍', title: 'Address', detail: '123 Education St.,\nManila, Philippines' },
              { icon: '📧', title: 'Email', detail: 'info@ncdc.edu.ph' },
              { icon: '📞', title: 'Phone', detail: '+63 (2) 8123-4567' }
            ].map((item, index) => (
              <div key={index} style={{
                background: 'rgba(255,255,255,0.12)',
                backdropFilter: 'blur(10px)',
                padding: '30px',
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
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>{item.icon}</div>
                <h4 style={{ color: 'white', marginBottom: '4px', fontSize: '16px' }}>{item.title}</h4>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', whiteSpace: 'pre-line' }}>{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================== */}
      {/* FOOTER */}
      {/* ========================================== */}
      <footer style={{
        background: 'rgba(0,0,0,0.2)',
        backdropFilter: 'blur(10px)',
        color: 'rgba(255,255,255,0.7)',
        padding: '40px',
        textAlign: 'center',
        borderTop: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <button onClick={() => scrollToSection('home')} style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', background: 'none', border: 'none', cursor: 'pointer' }}>Home</button>
            <button onClick={() => scrollToSection('services')} style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', background: 'none', border: 'none', cursor: 'pointer' }}>Services</button>
            <button onClick={() => scrollToSection('about')} style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', background: 'none', border: 'none', cursor: 'pointer' }}>About</button>
            <button onClick={() => scrollToSection('contact')} style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', background: 'none', border: 'none', cursor: 'pointer' }}>Contact</button>
            <Link to="/login" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>Login</Link>
            <Link to="/apply" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>Apply</Link>
          </div>
          <p style={{ fontSize: '14px' }}>
            © 2026 <strong style={{ color: 'white' }}>NCDC</strong> — National Children Development Center. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;