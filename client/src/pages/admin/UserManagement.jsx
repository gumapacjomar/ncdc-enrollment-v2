import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../../services/api';
import UPLOADS_URL from '../../services/uploads';

const UserManagement = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [profilePic, setProfilePic] = useState(null);

  // ✅ Mobile detection
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // ✅ View profile modal state
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewUser, setViewUser] = useState(null);

  // Reset password modal state
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetData, setResetData] = useState(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/login');
      return;
    }
    fetchProfile();
    fetchUsers();
  }, [navigate]);

  const fetchProfile = async () => {
    try {
      const response = await API.get(`/admin/profile/${user.id}`);
      if (response.data.profile_pic) {
        setProfilePic(`${UPLOADS_URL}/profiles/${response.data.profile_pic}`);
      }
    } catch (error) {
      console.error('Error fetching profile pic:', error);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await API.get('/admin/users');
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (userItem) => {
    if (!window.confirm(`Reset password for ${userItem.full_name} (${userItem.username})?\n\nSystem will generate a new temporary password.`)) {
      return;
    }

    setResetLoading(true);
    try {
      const res = await API.post(`/admin/users/${userItem.role}/${userItem.id}/reset-password`);
      setResetData({
        ...res.data.data,
        full_name: userItem.full_name,
        username: userItem.username,
        role: userItem.role,
        public_id: userItem.public_id
      });
      setShowResetModal(true);
      setCopied(false);
      fetchUsers(); // Refresh to update is_first_login
    } catch (error) {
      alert('❌ Failed to reset password: ' + (error.response?.data?.error || error.message));
    } finally {
      setResetLoading(false);
    }
  };

  // ✅ Handle View Profile
  const handleViewProfile = (userItem) => {
    setViewUser(userItem);
    setShowViewModal(true);
  };

  // ✅ Handle Reset from View Modal
  const handleResetFromView = () => {
    const u = viewUser;
    setShowViewModal(false);
    setViewUser(null);
    handleResetPassword(u);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const filteredUsers = users.filter(u => {
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    const matchesSearch = !searchTerm.trim() || 
      u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.public_id?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const roleCounts = {
    all: users.length,
    student: users.filter(u => u.role === 'student').length,
    registrar: users.filter(u => u.role === 'registrar').length,
    admin: users.filter(u => u.role === 'admin').length
  };

  const getRoleBadge = (role) => {
    const map = {
      student: { bg: '#dbeafe', color: '#1a56db', label: '🎓 Student' },
      registrar: { bg: '#fef3c7', color: '#92400e', label: '👨‍🏫 Teacher/Staff' },
      admin: { bg: '#e0e7ff', color: '#4338ca', label: '👑 Principal' }
    };
    return map[role] || map.student;
  };

  const truncateHash = (hash) => {
    if (!hash) return '—';
    return hash.length > 30 ? hash.substring(0, 30) + '...' : hash;
  };

  const menuItems = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard', path: '/admin/dashboard', color: '#3b82f6' },
    { id: 'applications', icon: '📋', label: 'Applications', path: '/admin/applications', color: '#8b5cf6' },
    { id: 'approved', icon: '✅', label: 'Confirm Enrollments', path: '/admin/approved', color: '#10b981' },
    { id: 'reports', icon: '📈', label: 'Reports', path: '/admin/reports', color: '#f59e0b' },
    { id: 'monitoring', icon: '👁️', label: 'Student Monitoring', path: '/admin/student-monitoring', color: '#06b6d4' },
    { id: 'grade-reports', icon: '📉', label: 'Grade Reports', path: '/admin/grade-reports', color: '#ef4444' },
    { id: 'honor-students', icon: '🏆', label: 'Honor Students', path: '/admin/honor-students', color: '#f59e0b' },
    { id: 'student-history', icon: '📚', label: 'Student History', path: '/admin/student-history', color: '#a855f7' },
    { id: 'user-management', icon: '👥', label: 'User Management', path: '/admin/user-management', color: '#8b5cf6' },
    { id: 'registrars', icon: '👨‍💼', label: 'Registrar Management', path: '/admin/registrars', color: '#ec4899' },
    { id: 'password-requests', icon: '🔑', label: 'Password Requests', path: '/admin/password-requests', color: '#f43f5e' }
  ];

  const isActive = (path) => window.location.pathname === path;

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f0f4ff 0%, #e8ecf1 50%, #f5f3ff 100%)',
      fontFamily: 'Segoe UI, Arial, sans-serif',
      display: 'flex'
    }}>
      {/* SIDEBAR */}
      <div style={{
        width: '280px', minHeight: '100vh', height: '100vh',
        background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(255,255,255,0.2)',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0,
        overflow: 'hidden', flexShrink: 0, zIndex: 50,
        boxShadow: '4px 0 30px rgba(0,0,0,0.06)'
      }}>
        <div style={{ padding: '28px 24px 20px', borderBottom: '1px solid rgba(255,255,255,0.2)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              background: 'linear-gradient(135deg, #1a56db, #3b82f6)',
              width: '44px', height: '44px', borderRadius: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '22px', boxShadow: '0 4px 15px rgba(26,86,219,0.3)'
            }}>🎓</div>
            <div>
              <span style={{ fontSize: '20px', fontWeight: '800', color: '#1f2937' }}>NCDC</span>
              <br />
              <span style={{ fontSize: '10px', color: '#6b7280', fontWeight: '500' }}>Principal Panel</span>
            </div>
          </div>
        </div>

        <Link to="/admin/profile" style={{
          textDecoration: 'none', padding: '20px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.2)',
          display: 'flex', alignItems: 'center', gap: '14px',
          cursor: 'pointer', flexShrink: 0
        }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#1a56db', fontSize: '20px', fontWeight: 'bold',
            border: '2px solid rgba(255,255,255,0.5)',
            overflow: 'hidden', flexShrink: 0
          }}>
            {profilePic ? (
              <img src={profilePic} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              user?.username?.charAt(0).toUpperCase() || 'P'
            )}
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: '600', color: '#1f2937' }}>
              {user?.username || 'Principal'}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Principal</div>
          </div>
        </Link>

        <div style={{ padding: '16px 12px', flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          {menuItems.map((item) => (
            <Link key={item.id} to={item.path} style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              width: '100%', padding: '12px 16px', borderRadius: '12px',
              textDecoration: 'none',
              background: isActive(item.path) ? `linear-gradient(135deg, ${item.color}15, ${item.color}08)` : 'transparent',
              color: isActive(item.path) ? item.color : '#6b7280',
              fontWeight: isActive(item.path) ? '600' : '500',
              fontSize: '14px', transition: 'all 0.3s ease',
              marginBottom: '4px', position: 'relative', boxSizing: 'border-box'
            }}>
              {isActive(item.path) && (
                <span style={{
                  position: 'absolute', left: '0', top: '50%',
                  transform: 'translateY(-50%)', width: '4px', height: '28px',
                  background: `linear-gradient(180deg, ${item.color}, ${item.color}80)`,
                  borderRadius: '0 4px 4px 0'
                }} />
              )}
              <span style={{ fontSize: '18px', width: '24px' }}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>

        <div style={{
          padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.2)',
          flexShrink: 0, background: 'rgba(255,255,255,0.3)'
        }}>
          <button onClick={handleLogout} style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            width: '100%', padding: '10px 14px', borderRadius: '10px',
            border: 'none', background: 'transparent', color: '#ef4444',
            fontWeight: '500', cursor: 'pointer', fontSize: '14px'
          }}>
            <span style={{ fontSize: '18px', width: '24px' }}>🚪</span>
            Logout
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{
        flex: 1, marginLeft: '280px', padding: '32px 36px',
        minHeight: '100vh', overflowY: 'auto'
      }}>
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '28px', color: '#1f2937', margin: 0, fontWeight: '800', letterSpacing: '-0.5px' }}>
            👥 User Management
          </h1>
          <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '15px' }}>
            View all users — students, teachers/staff, and principals
          </p>
        </div>

        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '16px', marginBottom: '24px'
        }}>
          <div style={{
            background: 'white', padding: '20px', borderRadius: '12px',
            borderTop: '4px solid #3b82f6', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}>
            <div style={{ fontSize: '28px', fontWeight: '800', color: '#3b82f6' }}>{roleCounts.all}</div>
            <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>👥 Total Users</div>
          </div>
          <div style={{
            background: 'white', padding: '20px', borderRadius: '12px',
            borderTop: '4px solid #1a56db', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}>
            <div style={{ fontSize: '28px', fontWeight: '800', color: '#1a56db' }}>{roleCounts.student}</div>
            <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>🎓 Students</div>
          </div>
          <div style={{
            background: 'white', padding: '20px', borderRadius: '12px',
            borderTop: '4px solid #f59e0b', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}>
            <div style={{ fontSize: '28px', fontWeight: '800', color: '#f59e0b' }}>{roleCounts.registrar}</div>
            <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>👨‍🏫 Teachers/Staff</div>
          </div>
          <div style={{
            background: 'white', padding: '20px', borderRadius: '12px',
            borderTop: '4px solid #8b5cf6', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}>
            <div style={{ fontSize: '28px', fontWeight: '800', color: '#8b5cf6' }}>{roleCounts.admin}</div>
            <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>👑 Principals</div>
          </div>
        </div>

        {/* Filters */}
        <div style={{
          background: 'white', padding: '16px 20px', borderRadius: '12px',
          marginBottom: '24px', border: '1px solid #e5e7eb',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center'
        }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <input
              type="text"
              placeholder="🔍 Search by username, name, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%', padding: '10px 16px',
                border: '1px solid #e5e7eb', borderRadius: '8px',
                fontSize: '14px', outline: 'none', background: '#f9fafb',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ marginRight: '8px', fontSize: '13px', color: '#6b7280', fontWeight: '600' }}>
              Role:
            </label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              style={{
                padding: '10px 14px', borderRadius: '8px',
                border: '1px solid #e5e7eb', fontSize: '14px',
                outline: 'none', fontWeight: '600',
                color: '#1f2937', background: '#f9fafb', cursor: 'pointer'
              }}
            >
              <option value="all">All Roles ({roleCounts.all})</option>
              <option value="student">🎓 Students ({roleCounts.student})</option>
              <option value="registrar">👨‍🏫 Teachers/Staff ({roleCounts.registrar})</option>
              <option value="admin">👑 Principals ({roleCounts.admin})</option>
            </select>
          </div>

          <div style={{
            marginLeft: 'auto', fontSize: '13px', color: '#6b7280', fontWeight: '600'
          }}>
            📊 {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'}
          </div>
        </div>

        {/* Users Table */}
        <div style={{
          background: 'white', padding: '24px', borderRadius: '14px',
          border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
              ⏳ Loading users...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
              <div style={{ fontSize: '48px', marginBottom: '8px' }}>📭</div>
              <h3 style={{ color: '#1f2937', marginBottom: '8px' }}>No Users Found</h3>
              <p>Try adjusting your search or filter.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>#</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Role</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Full Name</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>ID</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Username</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Password Hash</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Last Login</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u, idx) => {
                    const badge = getRoleBadge(u.role);
                    return (
                      <tr key={`${u.role}-${u.id}`} style={{
                        borderBottom: '1px solid #f3f4f6',
                        background: idx % 2 === 0 ? 'transparent' : '#fafbfc'
                      }}>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>{idx + 1}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '4px 12px', borderRadius: '12px',
                            fontSize: '12px', fontWeight: '700',
                            background: badge.bg, color: badge.color,
                            whiteSpace: 'nowrap'
                          }}>{badge.label}</span>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '14px', color: '#1f2937', fontWeight: '600' }}>
                          {u.full_name}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#1a56db', fontWeight: '600' }}>
                          {u.public_id || '—'}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#1f2937', fontFamily: 'monospace' }}>
                          {u.username}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '11px', color: '#6b7280', fontFamily: 'monospace' }}>
                          <div style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {truncateHash(u.password_hash)}
                          </div>
                          {u.is_first_login === 1 && (
                            <div style={{ fontSize: '10px', color: '#f59e0b', fontWeight: '700', marginTop: '2px' }}>
                              ⚠️ First Login
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>
                          {u.last_login ? new Date(u.last_login).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric'
                          }) : 'Never'}
                        </td>
                        {/* ✅ ACTION: View only — Reset is inside View modal */}
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <button
                            onClick={() => handleViewProfile(u)}
                            style={{
                              background: '#dbeafe', color: '#1a56db',
                              border: 'none', padding: '6px 18px',
                              borderRadius: '6px', fontSize: '12px',
                              fontWeight: '600', cursor: 'pointer',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            👁️ View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info Note */}
        <div style={{
          marginTop: '24px',
          background: '#fef3c7',
          border: '1px solid #fcd34d',
          borderRadius: '12px',
          padding: '16px 20px',
          fontSize: '13px',
          color: '#92400e'
        }}>
          <strong>ℹ️ Password Info:</strong> Passwords are bcrypt-hashed (one-way encryption) for security.
          Dili ma-decode ang hash. Kung ang user nakalimot sa password, i-click ang <strong>View</strong>, dayon gamita ang <strong>"Reset Password"</strong> button sa sulod.
        </div>

        <div style={{
          marginTop: '32px', paddingTop: '20px',
          borderTop: '1px solid rgba(0,0,0,0.05)', textAlign: 'center'
        }}>
          <p style={{ fontSize: '13px', color: '#9ca3af' }}>
            Nurturing Today, <strong style={{ color: '#1a56db' }}>Empowering Tomorrow</strong>
          </p>
        </div>
      </div>

      {/* ✅ VIEW PROFILE MODAL */}
      {showViewModal && viewUser && (
        <div
          onClick={() => { setShowViewModal(false); setViewUser(null); }}
          style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: isMobile ? '12px' : '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white', borderRadius: '16px',
              maxWidth: '500px', width: '100%',
              padding: isMobile ? '24px 20px' : '32px',
              maxHeight: '90vh', overflowY: 'auto',
              boxShadow: '0 25px 60px rgba(0,0,0,0.3)'
            }}
          >
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{
                width: '80px', height: '80px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '32px', fontWeight: '800', color: '#1a56db',
                margin: '0 auto 12px',
                border: '3px solid white',
                boxShadow: '0 4px 15px rgba(26,86,219,0.2)',
                overflow: 'hidden'
              }}>
                {viewUser.profile_pic ? (
                  <img
                    src={`${UPLOADS_URL}/profiles/${viewUser.profile_pic}`}
                    alt="Profile"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  viewUser.full_name?.charAt(0).toUpperCase() || '?'
                )}
              </div>
              <h2 style={{ fontSize: isMobile ? '18px' : '20px', color: '#1f2937', margin: '0 0 6px', fontWeight: '700' }}>
                {viewUser.full_name}
              </h2>
              <span style={{
                display: 'inline-block',
                padding: '4px 12px', borderRadius: '12px',
                fontSize: '12px', fontWeight: '700',
                background: getRoleBadge(viewUser.role).bg,
                color: getRoleBadge(viewUser.role).color
              }}>
                {getRoleBadge(viewUser.role).label}
              </span>
            </div>

            {/* Info Rows */}
            <div style={{
              background: '#f9fafb',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
              display: 'flex', flexDirection: 'column', gap: '12px'
            }}>
              <div>
                <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Username
                </div>
                <div style={{
                  fontSize: '14px', color: '#1f2937', fontFamily: 'monospace',
                  fontWeight: '700', marginTop: '2px',
                  padding: '6px 10px', background: 'white', borderRadius: '6px',
                  wordBreak: 'break-all'
                }}>
                  {viewUser.username}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  ID
                </div>
                <div style={{
                  fontSize: '14px', color: '#1a56db', fontWeight: '700',
                  marginTop: '2px', fontFamily: 'monospace'
                }}>
                  {viewUser.public_id || '—'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Last Login
                </div>
                <div style={{ fontSize: '14px', color: '#1f2937', fontWeight: '600', marginTop: '2px' }}>
                  {viewUser.last_login
                    ? new Date(viewUser.last_login).toLocaleString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })
                    : 'Never'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Account Status
                </div>
                <div style={{ marginTop: '4px' }}>
                  {viewUser.is_first_login === 1 ? (
                    <span style={{
                      display: 'inline-block', padding: '4px 12px',
                      borderRadius: '12px', fontSize: '12px', fontWeight: '700',
                      background: '#fef3c7', color: '#92400e'
                    }}>
                      ⚠️ First Login — must change password
                    </span>
                  ) : (
                    <span style={{
                      display: 'inline-block', padding: '4px 12px',
                      borderRadius: '12px', fontSize: '12px', fontWeight: '700',
                      background: '#d1fae5', color: '#065f46'
                    }}>
                      ✅ Active
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Password Info */}
            <div style={{
              background: '#fef3c7',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '12px',
              color: '#92400e',
              marginBottom: '20px',
              lineHeight: '1.5'
            }}>
              🔒 <strong>Password is bcrypt-hashed and cannot be viewed.</strong> Kung ang user nakalimot sa password, gamita ang <strong>"Reset Password"</strong> para makahimo og temporary password.
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex', gap: '10px',
              flexDirection: isMobile ? 'column' : 'row'
            }}>
              <button
                onClick={handleResetFromView}
                disabled={resetLoading}
                style={{
                  flex: 1,
                  background: resetLoading ? '#fca5a5' : 'linear-gradient(135deg, #f59e0b, #fbbf24)',
                  color: 'white', border: 'none',
                  padding: '12px', borderRadius: '10px',
                  fontSize: '14px', fontWeight: '700',
                  cursor: resetLoading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 15px rgba(245,158,11,0.3)'
                }}
              >
                🔑 Reset Password
              </button>
              <button
                onClick={() => { setShowViewModal(false); setViewUser(null); }}
                style={{
                  flex: 1,
                  background: '#f3f4f6',
                  color: '#6b7280', border: '1px solid #d1d5db',
                  padding: '12px', borderRadius: '10px',
                  fontSize: '14px', fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {showResetModal && resetData && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: isMobile ? '12px' : '20px'
        }}>
          <div style={{
            background: 'white', borderRadius: '16px',
            maxWidth: '500px', width: '100%',
            padding: isMobile ? '24px 20px' : '32px',
            maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 25px 60px rgba(0,0,0,0.3)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '56px', marginBottom: '8px' }}>🔑</div>
              <h2 style={{ fontSize: '22px', color: '#1f2937', margin: '0 0 8px' }}>
                Password Reset Successful!
              </h2>
              <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
                Bag-ong temporary password para kang <strong>{resetData.full_name}</strong>
              </p>
            </div>

            <div style={{
              background: '#f0f4ff',
              border: '2px solid #1a56db',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px'
            }}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                Username:
              </div>
              <div style={{
                fontSize: '16px', fontWeight: '700', color: '#1f2937',
                fontFamily: 'monospace', marginBottom: '12px',
                padding: '8px 12px', background: 'white', borderRadius: '6px'
              }}>
                {resetData.username}
              </div>

              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                Temporary Password:
              </div>
              <div style={{
                display: 'flex', gap: '8px', alignItems: 'center'
              }}>
                <div style={{
                  flex: 1, fontSize: '20px', fontWeight: '800', color: '#991b1b',
                  fontFamily: 'monospace', padding: '12px 16px',
                  background: 'white', borderRadius: '6px',
                  border: '2px dashed #dc2626', letterSpacing: '2px',
                  wordBreak: 'break-all'
                }}>
                  {resetData.temporaryPassword}
                </div>
                <button
                  onClick={() => copyToClipboard(resetData.temporaryPassword)}
                  style={{
                    background: copied ? '#10b981' : '#1a56db',
                    color: 'white', border: 'none',
                    padding: '12px 16px', borderRadius: '8px',
                    fontSize: '14px', fontWeight: '600',
                    cursor: 'pointer', whiteSpace: 'nowrap'
                  }}
                >
                  {copied ? '✅ Copied!' : '📋 Copy'}
                </button>
              </div>
            </div>

            <div style={{
              background: '#fef3c7',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '12px',
              color: '#92400e',
              marginBottom: '20px'
            }}>
              ⚠️ <strong>Importante:</strong> I-save ni nga password ug ihatag sa user.
              Kinahanglan i-change sa user pagkahuman sa first login. Dili na ni makita pag-usab.
            </div>

            <button
              onClick={() => {
                setShowResetModal(false);
                setResetData(null);
                setCopied(false);
              }}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #1a56db, #3b82f6)',
                color: 'white', border: 'none',
                padding: '14px', borderRadius: '10px',
                fontSize: '15px', fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              ✅ Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;