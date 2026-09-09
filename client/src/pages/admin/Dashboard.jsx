import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import API from '../../services/api';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    confirmed: 0,
    rejected: 0
  });
  const [approvedApps, setApprovedApps] = useState([]);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [profilePic, setProfilePic] = useState(null);

  // ===== VIEW MODAL STATE =====
  const [showModal, setShowModal] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [modalMessage, setModalMessage] = useState('');

  const user = JSON.parse(localStorage.getItem('user'));
  const currentPath = location.pathname;

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
    fetchDashboardData();
    if (user && user.role === 'admin') {
      fetchAdminProfile();
    }
  }, []);

  const fetchAdminProfile = async () => {
    try {
      const response = await API.get(`/admin/profile/${user.id}`);
      if (response.data.profile_pic) {
        setProfilePic(`http://localhost:5000/uploads/profiles/${response.data.profile_pic}`);
      }
    } catch (error) {
      console.error('Error fetching profile pic:', error);
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const allResponse = await API.get('/admin/applications');
      const apps = allResponse.data || [];
      
      setStats({
        total: apps.length,
        pending: apps.filter(a => a.status === 'pending').length,
        approved: apps.filter(a => a.status === 'approved').length,
        confirmed: apps.filter(a => a.status === 'confirmed').length,
        rejected: apps.filter(a => a.status === 'rejected').length
      });

      const approvedResponse = await API.get('/admin/approved');
      setApprovedApps(approvedResponse.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // ===== VIEW FUNCTION =====
  const handleView = async (applicationId) => {
    console.log('🔍 View clicked for application ID:', applicationId);
    
    if (!applicationId) {
      alert('Error: No application ID found');
      return;
    }

    setModalLoading(true);
    setShowModal(true);
    setModalMessage('');
    setRemarks('');
    
    try {
      const response = await API.get(`/registrar/application/${applicationId}`);
      console.log('📋 Application data:', response.data);
      
      if (response.data) {
        setSelectedApp(response.data);
      } else {
        setModalMessage('Application not found');
      }
    } catch (error) {
      console.error('❌ Error fetching application:', error);
      setModalMessage('Failed to load application details');
    } finally {
      setModalLoading(false);
    }
  };

  // ===== CONFIRM FUNCTION - UPDATED =====
  const handleConfirm = async () => {
    if (!window.confirm('Are you sure you want to confirm this enrollment?')) return;
    
    setActionLoading(true);
    setModalMessage('');
    
    try {
      const response = await API.post(`/admin/confirm/${selectedApp.id}`, {
        adminId: user.id,
        remarks: remarks || 'Confirmed by Admin'
      });
      
      setModalMessage({ type: 'success', text: response.data.message });
      
      if (response.data.data) {
        alert(
          `✅ ENROLLMENT CONFIRMED!\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `Student ID: ${response.data.data.studentId}\n` +
          `Username: ${response.data.data.username}\n` +
          `Password: ${response.data.data.password}\n` +
          `Email: ${response.data.data.email}\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `📌 Use your 6-digit Student ID number as password.\n` +
          `🔒 Please change your password after first login.`
        );
      }
      
      setTimeout(() => {
        setShowModal(false);
        setSelectedApp(null);
        fetchDashboardData();
      }, 2000);
      
    } catch (error) {
      setModalMessage({ type: 'error', text: error.response?.data?.error || 'Failed to confirm enrollment' });
    } finally {
      setActionLoading(false);
    }
  };

  // ===== REJECT FUNCTION =====
  const handleReject = async () => {
    const reason = prompt('Please enter reason for rejection:');
    if (reason === null) return;
    
    setActionLoading(true);
    setModalMessage('');
    
    try {
      await API.put(`/admin/reject/${selectedApp.id}`, {
        adminId: user.id,
        remarks: reason || 'Rejected by Admin'
      });
      
      setModalMessage({ type: 'success', text: '✅ Application rejected and returned to registrar' });
      
      setTimeout(() => {
        setShowModal(false);
        setSelectedApp(null);
        fetchDashboardData();
      }, 2000);
      
    } catch (error) {
      setModalMessage({ type: 'error', text: 'Failed to reject application' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const statusBadge = (status) => {
    const colors = {
      pending: { bg: 'rgba(251, 191, 36, 0.2)', text: '#d97706' },
      approved: { bg: 'rgba(59, 130, 246, 0.2)', text: '#2563eb' },
      confirmed: { bg: 'rgba(16, 185, 129, 0.2)', text: '#059669' },
      rejected: { bg: 'rgba(239, 68, 68, 0.2)', text: '#dc2626' },
      declined: { bg: 'rgba(251, 191, 36, 0.2)', text: '#d97706' }
    };
    const color = colors[status] || colors.pending;
    return {
      background: color.bg,
      color: color.text,
      padding: '4px 14px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '600',
      display: 'inline-block',
      border: '1px solid rgba(255,255,255,0.1)',
      backdropFilter: 'blur(4px)'
    };
  };

  const menuItems = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard', path: '/admin/dashboard', color: '#3b82f6' },
    { id: 'applications', icon: '📋', label: 'Applications', path: '/admin/applications', color: '#8b5cf6' },
    { id: 'approved', icon: '✅', label: 'Confirm Enrollments', path: '/admin/approved', color: '#10b981' },
    { id: 'reports', icon: '📈', label: 'Reports', path: '/admin/reports', color: '#f59e0b' },
    { id: 'registrars', icon: '👨‍💼', label: 'Registrar Management', path: '/admin/registrars', color: '#ec4899' },
    { id: 'password-requests', icon: '🔑', label: 'Password Requests', path: '/admin/password-requests', color: '#ef4444' }
  ];

  const isActive = (path) => currentPath === path;

  const statCards = [
    { label: 'Total Applications', value: stats.total, icon: '📋', color: '#3b82f6', gradient: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' },
    { label: 'Pending', value: stats.pending, icon: '⏳', color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)' },
    { label: 'Approved', value: stats.approved, icon: '✅', color: '#8b5cf6', gradient: 'linear-gradient(135deg, #8b5cf6, #ec4899)' },
    { label: 'Confirmed', value: stats.confirmed, icon: '🎉', color: '#10b981', gradient: 'linear-gradient(135deg, #10b981, #34d399)' },
    { label: 'Rejected', value: stats.rejected, icon: '❌', color: '#ef4444', gradient: 'linear-gradient(135deg, #ef4444, #f87171)' }
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f0f4ff 0%, #e8ecf1 50%, #f5f3ff 100%)',
      fontFamily: 'Segoe UI, Arial, sans-serif',
      display: 'flex',
      overflow: 'hidden'
    }}>
      {/* ========== FIXED SIDEBAR ========== */}
      <div style={{
        width: '280px',
        minHeight: '100vh',
        height: '100vh',
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(255,255,255,0.2)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        left: 0,
        overflow: 'hidden',
        flexShrink: 0,
        zIndex: 50,
        boxShadow: '4px 0 30px rgba(0,0,0,0.06)'
      }}>
        {/* Logo */}
        <div style={{
          padding: '28px 24px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.2)',
          animation: 'fadeInDown 0.6s ease',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              background: 'linear-gradient(135deg, #1a56db, #3b82f6)',
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              boxShadow: '0 4px 15px rgba(26,86,219,0.3)'
            }}>
              🎓
            </div>
            <div>
              <span style={{ fontSize: '20px', fontWeight: '800', color: '#1f2937' }}>NCDC</span>
              <br />
              <span style={{ fontSize: '10px', color: '#6b7280', fontWeight: '500' }}>Admin Panel</span>
            </div>
          </div>
        </div>

        {/* Profile Section */}
        <Link to="/admin/profile" style={{
          textDecoration: 'none',
          padding: '20px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          animation: 'fadeInDown 0.7s ease',
          flexShrink: 0
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(59,130,246,0.05)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#1a56db',
            fontSize: '20px',
            fontWeight: 'bold',
            border: '2px solid rgba(255,255,255,0.5)',
            overflow: 'hidden',
            flexShrink: 0
          }}>
            {profilePic ? (
              <img 
                src={profilePic} 
                alt="Profile" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              user?.username?.charAt(0).toUpperCase() || 'A'
            )}
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: '600', color: '#1f2937' }}>
              {user?.username || 'Admin'}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>
              Administrator
            </div>
          </div>
        </Link>

        {/* Menu Items */}
        <div style={{ 
          padding: '16px 12px', 
          flex: 1, 
          animation: 'fadeInDown 0.8s ease',
          overflowY: 'auto',
          overflowX: 'hidden'
        }}>
          {menuItems.map((item, index) => (
            <Link
              key={item.id}
              to={item.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                width: '100%',
                padding: '12px 16px',
                borderRadius: '12px',
                textDecoration: 'none',
                background: isActive(item.path) ? `linear-gradient(135deg, ${item.color}15, ${item.color}08)` : 'transparent',
                color: isActive(item.path) ? item.color : '#6b7280',
                fontWeight: isActive(item.path) ? '600' : '500',
                fontSize: '14px',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                marginBottom: '4px',
                cursor: 'pointer',
                position: 'relative',
                animation: `fadeInDown ${0.6 + index * 0.1}s ease`
              }}
              onMouseEnter={(e) => {
                if (!isActive(item.path)) {
                  e.currentTarget.style.background = 'rgba(0,0,0,0.03)';
                  e.currentTarget.style.transform = 'translateX(4px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive(item.path)) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.transform = 'translateX(0)';
                }
              }}
            >
              {isActive(item.path) && (
                <span style={{
                  position: 'absolute',
                  left: '0',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '4px',
                  height: '28px',
                  background: `linear-gradient(180deg, ${item.color}, ${item.color}80)`,
                  borderRadius: '0 4px 4px 0',
                  animation: 'slideIn 0.4s ease'
                }} />
              )}
              <span style={{ fontSize: '18px', width: '24px' }}>{item.icon}</span>
              <span>{item.label}</span>
              {isActive(item.path) && (
                <span style={{
                  marginLeft: 'auto',
                  fontSize: '10px',
                  color: item.color,
                  fontWeight: '700'
                }}>
                  ●
                </span>
              )}
            </Link>
          ))}
        </div>

        {/* Logout Button */}
        <div style={{ 
          padding: '12px 16px', 
          borderTop: '1px solid rgba(255,255,255,0.2)',
          flexShrink: 0,
          background: 'rgba(255,255,255,0.3)'
        }}>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              width: '100%',
              padding: '10px 14px',
              borderRadius: '10px',
              border: 'none',
              background: 'transparent',
              color: '#ef4444',
              fontWeight: '500',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(239,68,68,0.08)';
              e.target.style.transform = 'translateX(4px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'transparent';
              e.target.style.transform = 'translateX(0)';
            }}
          >
            <span style={{ fontSize: '18px', width: '24px' }}>🚪</span>
            Logout
          </button>
        </div>
      </div>

      {/* ========== MAIN CONTENT ========== */}
      <div style={{
        flex: 1,
        marginLeft: '280px',
        padding: '32px 36px',
        minHeight: '100vh',
        overflowY: 'auto',
        maxHeight: '100vh',
        animation: 'fadeIn 0.5s ease'
      }}>
        {/* Welcome Section */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '32px',
          animation: 'fadeInDown 0.6s ease'
        }}>
          <div>
            <h1 style={{ fontSize: '28px', color: '#1f2937', margin: 0, fontWeight: '800', letterSpacing: '-0.5px' }}>
              Admin Dashboard
            </h1>
            <p style={{ color: '#6b7280', margin: '4px 0 0', fontSize: '15px' }}>
              Welcome back! Oversee and manage the enrollment process.
            </p>
          </div>
          <Link to="/admin/reports" style={{
            background: 'linear-gradient(135deg, #1a56db, #3b82f6)',
            color: 'white',
            padding: '12px 28px',
            borderRadius: '12px',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: '600',
            boxShadow: '0 4px 20px rgba(26,86,219,0.3)',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 8px 30px rgba(26,86,219,0.4)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 4px 20px rgba(26,86,219,0.3)';
          }}>
            📊 Generate Reports
          </Link>
        </div>

        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '18px',
          marginBottom: '28px'
        }}>
          {statCards.map((stat, index) => (
            <div
              key={index}
              style={{
                background: 'rgba(255,255,255,0.7)',
                backdropFilter: 'blur(20px)',
                padding: '24px 20px',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.3)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                animation: `slideUp ${0.5 + index * 0.1}s ease`
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-6px)';
                e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.08)';
                e.currentTarget.style.borderColor = stat.color + '40';
                setHoveredCard(index);
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.04)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
                setHoveredCard(null);
              }}
            >
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '3px',
                background: stat.gradient,
                borderRadius: '16px 16px 0 0',
                transition: 'height 0.3s ease',
                height: hoveredCard === index ? '6px' : '3px'
              }} />
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>{stat.label}</div>
                  <div style={{ 
                    fontSize: '32px', 
                    fontWeight: '800', 
                    color: '#1f2937',
                    marginTop: '4px',
                    transition: 'transform 0.3s ease',
                    transform: hoveredCard === index ? 'scale(1.05)' : 'scale(1)'
                  }}>
                    {stat.value}
                  </div>
                </div>
                <div style={{
                  fontSize: '32px',
                  opacity: 0.6,
                  transition: 'all 0.3s ease',
                  transform: hoveredCard === index ? 'scale(1.2) rotate(10deg)' : 'scale(1)'
                }}>
                  {stat.icon}
                </div>
              </div>
              <div style={{
                marginTop: '12px',
                height: '4px',
                background: 'rgba(0,0,0,0.05)',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${Math.min((stat.value / (stats.total || 1)) * 100, 100)}%`,
                  height: '100%',
                  background: stat.gradient,
                  borderRadius: '4px',
                  transition: 'width 1s ease'
                }} />
              </div>
            </div>
          ))}
        </div>

        {/* Applications Table */}
        <div style={{
          background: 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(20px)',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.3)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
          overflow: 'hidden',
          animation: 'slideUp 0.7s ease'
        }}>
          <div style={{
            padding: '20px 28px',
            borderBottom: '1px solid rgba(0,0,0,0.05)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <h2 style={{ fontSize: '18px', color: '#1f2937', margin: 0, fontWeight: '700' }}>
                ✅ Applications for Confirmation
              </h2>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0 0' }}>
                Applications approved by registrar, awaiting final confirmation.
              </p>
            </div>
            <Link to="/admin/approved" style={{
              background: 'linear-gradient(135deg, #10b981, #34d399)',
              color: 'white',
              padding: '8px 20px',
              borderRadius: '10px',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: '600',
              boxShadow: '0 4px 15px rgba(16,185,129,0.3)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 8px 25px rgba(16,185,129,0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 15px rgba(16,185,129,0.3)';
            }}>
              View All →
            </Link>
          </div>

          <div style={{ overflowX: 'auto', padding: '0 28px 24px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span> Loading...
              </div>
            ) : approvedApps.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                <div style={{ fontSize: '48px', marginBottom: '8px' }}>🎉</div>
                No applications waiting for confirmation.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid rgba(0,0,0,0.05)' }}>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Name</th>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email</th>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                    <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {approvedApps.slice(0, 5).map((app, index) => (
                    <tr 
                      key={index} 
                      style={{ 
                        borderBottom: '1px solid rgba(0,0,0,0.04)',
                        animation: `fadeInDown ${0.5 + index * 0.1}s ease`,
                        transition: 'background 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(59,130,246,0.03)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '14px 16px', fontSize: '14px', color: '#1f2937', fontWeight: '600' }}>
                        {app.first_name} {app.last_name}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: '#6b7280' }}>{app.email}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={statusBadge(app.status)}>
                          {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <button
                          onClick={() => {
                            console.log('🔍 View button clicked for app ID:', app.application_id);
                            handleView(app.application_id);
                          }}
                          style={{
                            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                            color: 'white',
                            border: 'none',
                            padding: '8px 24px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: '600',
                            boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
                            transition: 'all 0.3s ease',
                            zIndex: 10,
                            position: 'relative'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.transform = 'scale(1.05)';
                            e.target.style.boxShadow = '0 6px 20px rgba(59,130,246,0.4)';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.transform = 'scale(1)';
                            e.target.style.boxShadow = '0 4px 12px rgba(59,130,246,0.3)';
                          }}
                        >
                          👁️ View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {approvedApps.length > 5 && (
              <div style={{ textAlign: 'center', marginTop: '16px' }}>
                <Link to="/admin/approved" style={{ 
                  color: '#3b82f6', 
                  textDecoration: 'none', 
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => e.target.style.color = '#1a56db'}
                onMouseLeave={(e) => e.target.style.color = '#3b82f6'}>
                  View all {approvedApps.length} applications →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '18px',
          marginTop: '28px'
        }}>
          {[
            { icon: '👤', title: 'Create Student Account', desc: 'Confirm an application to automatically create student account and generate student number.', color: '#3b82f6' },
            { icon: '🔒', title: 'Secure & Verified', desc: 'All applications are reviewed and verified before creating student accounts.', color: '#10b981' },
            { icon: '📊', title: 'Generate Reports', desc: 'View enrollment statistics and generate detailed reports.', color: '#8b5cf6' }
          ].map((item, index) => (
            <div
              key={index}
              style={{
                background: 'rgba(255,255,255,0.7)',
                backdropFilter: 'blur(20px)',
                padding: '24px',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.3)',
                textAlign: 'center',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'default',
                animation: `slideUp ${0.6 + index * 0.15}s ease`,
                boxShadow: '0 4px 20px rgba(0,0,0,0.04)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-6px)';
                e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.08)';
                e.currentTarget.style.borderColor = item.color + '40';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.04)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
              }}
            >
              <div style={{
                fontSize: '40px',
                marginBottom: '12px',
                display: 'inline-block',
                animation: 'float 3s ease-in-out infinite'
              }}>
                {item.icon}
              </div>
              <h4 style={{ fontSize: '16px', color: '#1f2937', margin: '4px 0', fontWeight: '700' }}>{item.title}</h4>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0 0', lineHeight: '1.6' }}>{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          marginTop: '32px',
          paddingTop: '20px',
          borderTop: '1px solid rgba(0,0,0,0.05)',
          textAlign: 'center'
        }}>
          <p style={{ fontSize: '13px', color: '#9ca3af' }}>
            Nurturing Today, <strong style={{ color: '#1a56db' }}>Empowering Tomorrow</strong>
          </p>
        </div>
      </div>

      {/* ========== VIEW MODAL (with Confirm & Reject) ========== */}
      {showModal && selectedApp && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            maxWidth: '700px',
            width: '100%',
            maxHeight: '80vh',
            overflowY: 'auto',
            padding: '32px',
            boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
            animation: 'fadeIn 0.3s ease'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', color: '#1f2937', margin: 0 }}>📄 Application Details</h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedApp(null);
                  setModalMessage('');
                  setRemarks('');
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#9ca3af',
                  transition: 'color 0.3s ease'
                }}
                onMouseEnter={(e) => e.target.style.color = '#1f2937'}
                onMouseLeave={(e) => e.target.style.color = '#9ca3af'}
              >
                ×
              </button>
            </div>

            {modalMessage && (
              <div style={{
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '16px',
                background: modalMessage.type === 'success' ? '#d1fae5' : '#fee2e2',
                color: modalMessage.type === 'success' ? '#065f46' : '#991b1b',
                border: `1px solid ${modalMessage.type === 'success' ? '#34d399' : '#fca5a5'}`
              }}>
                {modalMessage.text}
              </div>
            )}

            {modalLoading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                ⏳ Loading application details...
              </div>
            ) : (
              <>
                {/* Student Information */}
                <div style={{ marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '16px', color: '#1a56db', marginBottom: '8px' }}>👤 Student Information</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                    <p style={{ margin: '4px 0' }}><strong>Name:</strong> {selectedApp.first_name} {selectedApp.middle_name || ''} {selectedApp.last_name} {selectedApp.suffix || ''}</p>
                    <p style={{ margin: '4px 0' }}><strong>Email:</strong> {selectedApp.email}</p>
                    <p style={{ margin: '4px 0' }}><strong>Contact:</strong> {selectedApp.contact_number || 'N/A'}</p>
                    <p style={{ margin: '4px 0' }}><strong>Birth Date:</strong> {selectedApp.birth_date}</p>
                    <p style={{ margin: '4px 0' }}><strong>Gender:</strong> {selectedApp.gender}</p>
                    <p style={{ margin: '4px 0' }}><strong>Address:</strong> {selectedApp.address}</p>
                  </div>
                </div>

                {/* Parent/Guardian */}
                <div style={{ marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '16px', color: '#1a56db', marginBottom: '8px' }}>👨‍👩‍👦 Parent/Guardian</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                    <p style={{ margin: '2px 0', fontSize: '14px' }}><strong>Father:</strong> {selectedApp.father_name || 'N/A'}</p>
                    <p style={{ margin: '2px 0', fontSize: '14px' }}><strong>Father Occupation:</strong> {selectedApp.father_occupation || 'N/A'}</p>
                    <p style={{ margin: '2px 0', fontSize: '14px' }}><strong>Mother:</strong> {selectedApp.mother_name || 'N/A'}</p>
                    <p style={{ margin: '2px 0', fontSize: '14px' }}><strong>Mother Occupation:</strong> {selectedApp.mother_occupation || 'N/A'}</p>
                    <p style={{ margin: '2px 0', fontSize: '14px' }}><strong>Guardian:</strong> {selectedApp.guardian_name || 'N/A'}</p>
                    <p style={{ margin: '2px 0', fontSize: '14px' }}><strong>Guardian Contact:</strong> {selectedApp.guardian_contact || 'N/A'}</p>
                  </div>
                </div>

                {/* Requirements */}
                <div style={{ marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '16px', color: '#1a56db', marginBottom: '8px' }}>📋 Requirements</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                    <p style={{ margin: '2px 0', fontSize: '14px' }}>
                      {selectedApp.birth_certificate ? (
                        <a href={`http://localhost:5000/uploads/requirements/${selectedApp.birth_certificate}`} target="_blank" rel="noopener noreferrer" style={{ color: '#1a56db' }}>📄 Birth Certificate</a>
                      ) : '📄 Birth Certificate: Not uploaded'}
                    </p>
                    <p style={{ margin: '2px 0', fontSize: '14px' }}>
                      {selectedApp.immunization_record ? (
                        <a href={`http://localhost:5000/uploads/requirements/${selectedApp.immunization_record}`} target="_blank" rel="noopener noreferrer" style={{ color: '#1a56db' }}>📄 Immunization Record</a>
                      ) : '📄 Immunization: Not uploaded'}
                    </p>
                    <p style={{ margin: '2px 0', fontSize: '14px' }}>
                      {selectedApp.medical_clearance ? (
                        <a href={`http://localhost:5000/uploads/requirements/${selectedApp.medical_clearance}`} target="_blank" rel="noopener noreferrer" style={{ color: '#1a56db' }}>📄 Medical Clearance</a>
                      ) : '📄 Medical Clearance: Not uploaded'}
                    </p>
                    <p style={{ margin: '2px 0', fontSize: '14px' }}>
                      {selectedApp.id_picture ? (
                        <a href={`http://localhost:5000/uploads/requirements/${selectedApp.id_picture}`} target="_blank" rel="noopener noreferrer" style={{ color: '#1a56db' }}>🖼️ ID Picture</a>
                      ) : '🖼️ ID Picture: Not uploaded'}
                    </p>
                  </div>
                </div>

                {/* Registrar Info */}
                <div style={{ marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '16px', color: '#1a56db', marginBottom: '8px' }}>📝 Registrar Review</h3>
                  <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                    <p style={{ margin: '2px 0', fontSize: '14px' }}><strong>Registrar:</strong> {selectedApp.registrar_first_name || 'N/A'} {selectedApp.registrar_last_name || ''}</p>
                    <p style={{ margin: '2px 0', fontSize: '14px' }}><strong>Registrar Remarks:</strong> {selectedApp.registrar_remarks || 'N/A'}</p>
                    <p style={{ margin: '2px 0', fontSize: '14px' }}><strong>Registrar Action Date:</strong> {selectedApp.registrar_action_date ? new Date(selectedApp.registrar_action_date).toLocaleString() : 'N/A'}</p>
                  </div>
                </div>

                {/* Remarks Input */}
                <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
                    Remarks (Optional)
                  </label>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Add remarks for this action..."
                    rows="2"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      resize: 'vertical',
                      outline: 'none',
                      transition: 'border-color 0.3s ease'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#1a56db'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                  />
                </div>

                {/* Action Buttons - Confirm & Reject Only */}
                <div style={{ display: 'flex', gap: '12px', marginTop: '20px', flexWrap: 'wrap' }}>
                  <button
                    onClick={handleConfirm}
                    disabled={actionLoading}
                    style={{
                      flex: 1,
                      minWidth: '150px',
                      background: actionLoading ? '#93c5fd' : 'linear-gradient(135deg, #10b981, #34d399)',
                      color: 'white',
                      border: 'none',
                      padding: '12px',
                      borderRadius: '10px',
                      fontWeight: '600',
                      cursor: actionLoading ? 'not-allowed' : 'pointer',
                      boxShadow: '0 4px 15px rgba(16,185,129,0.3)',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!actionLoading) {
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 8px 25px rgba(16,185,129,0.4)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 4px 15px rgba(16,185,129,0.3)';
                    }}
                  >
                    ✅ Confirm
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={actionLoading}
                    style={{
                      flex: 1,
                      minWidth: '150px',
                      background: actionLoading ? '#93c5fd' : 'linear-gradient(135deg, #ef4444, #f87171)',
                      color: 'white',
                      border: 'none',
                      padding: '12px',
                      borderRadius: '10px',
                      fontWeight: '600',
                      cursor: actionLoading ? 'not-allowed' : 'pointer',
                      boxShadow: '0 4px 15px rgba(239,68,68,0.3)',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!actionLoading) {
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 8px 25px rgba(239,68,68,0.4)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 4px 15px rgba(239,68,68,0.3)';
                    }}
                  >
                    ❌ Reject
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-50%) scaleX(0);
          }
          to {
            opacity: 1;
            transform: translateY(-50%) scaleX(1);
          }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard;