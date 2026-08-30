import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../../services/api';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState(null);
  const [application, setApplication] = useState(null);
  const [profilePicPreview, setProfilePicPreview] = useState(null);
  const [activeMenu, setActiveMenu] = useState('dashboard');

  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    if (!user || user.role !== 'student') {
      navigate('/login');
    } else {
      fetchStudentData();
    }
  }, [navigate]);

  const fetchStudentData = async () => {
    setLoading(true);
    try {
      // Get the student ID from user object
      const studentId = user.studentId || user.id;
      console.log('🔍 Fetching student with ID:', studentId);
      
      // If studentId is a string like "NCDC-000001", extract the number
      let finalId = studentId;
      if (typeof studentId === 'string' && studentId.includes('NCDC-')) {
        const num = studentId.replace('NCDC-', '');
        finalId = parseInt(num);
        console.log('🔍 Converted to number:', finalId);
      }
      
      const studentResponse = await API.get(`/student/profile/${finalId}`);
      console.log('✅ Student Data:', studentResponse.data);
      setStudent(studentResponse.data);
      
      if (studentResponse.data.profile_pic) {
        setProfilePicPreview(`http://localhost:5000/uploads/profiles/${studentResponse.data.profile_pic}`);
      }

      const appResponse = await API.get(`/student/application/${finalId}`);
      setApplication(appResponse.data);
    } catch (error) {
      console.error('Error fetching student data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const getStatusInfo = (status) => {
    const statusMap = {
      pending: { label: 'Pending', color: '#f59e0b', bg: '#fef3c7', icon: '⏳' },
      approved: { label: 'Approved', color: '#3b82f6', bg: '#dbeafe', icon: '✅' },
      confirmed: { label: 'Enrolled', color: '#10b981', bg: '#d1fae5', icon: '🎉' },
      rejected: { label: 'Rejected', color: '#ef4444', bg: '#fee2e2', icon: '❌' },
      declined: { label: 'Declined', color: '#ef4444', bg: '#fee2e2', icon: '⚠️' }
    };
    return statusMap[status] || statusMap.pending;
  };

  // Get student number (remove NCDC- prefix)
  const studentNumber = student?.student_id ? student.student_id.replace('NCDC-', '') : 'N/A';
  const statusInfo = application ? getStatusInfo(application.status) : getStatusInfo('pending');

  const menuItems = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'profile', icon: '👤', label: 'My Profile' },
    { id: 'documents', icon: '📄', label: 'Documents' },
  ];

  const renderContent = () => {
    switch (activeMenu) {
      case 'dashboard':
        return renderDashboard();
      case 'profile':
        return renderProfile();
      default:
        return renderDashboard();
    }
  };

  const renderDashboard = () => (
    <div>
      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>Student ID Number</div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#1f2937', marginTop: '4px' }}>
            {studentNumber}
          </div>
          <div style={{ fontSize: '12px', color: '#9ca3af' }}>Your unique student number</div>
        </div>
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>Program</div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#1f2937', marginTop: '4px' }}>
            Preschool
          </div>
          <div style={{ fontSize: '12px', color: '#9ca3af' }}>Ages 4-5 years old</div>
        </div>
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>Enrollment Status</div>
          <div style={{ 
            fontSize: '24px', 
            fontWeight: '700', 
            color: statusInfo.color, 
            marginTop: '4px'
          }}>
            {statusInfo.label}
          </div>
          <div style={{ fontSize: '12px', color: '#9ca3af' }}>
            {statusInfo.label === 'Enrolled' ? 'Active Student' : 'Pending Review'}
          </div>
        </div>
      </div>

      {/* Enrollment Details */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937', marginBottom: '16px' }}>
          📋 My Enrollment Status
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <p style={{ fontSize: '13px', color: '#6b7280' }}>Status</p>
            <p style={{ fontSize: '16px', fontWeight: '600', color: statusInfo.color }}>
              {statusInfo.label}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '13px', color: '#6b7280' }}>Date Applied</p>
            <p style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
              {application?.created_at ? new Date(application.created_at).toLocaleDateString() : 'N/A'}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '13px', color: '#6b7280' }}>Academic Year</p>
            <p style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
              {application?.academic_year || '2026-2027'}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '13px', color: '#6b7280' }}>Semester</p>
            <p style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
              {application?.semester || '1st Semester'}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '16px'
      }}>
        {[
          { icon: '📋', label: 'My Application', desc: 'View application details', action: () => {} },
          { icon: '📄', label: 'Documents', desc: 'View and download files', action: () => setActiveMenu('documents') },
          { icon: '📢', label: 'Announcements', desc: 'Important updates', action: () => {} }
        ].map((item, index) => (
          <div
            key={index}
            onClick={item.action}
            style={{
              background: 'white',
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{ fontSize: '28px' }}>{item.icon}</div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937', marginTop: '8px' }}>
              {item.label}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>{item.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderProfile = () => {
    if (!student) return null;
    return (
      <div style={{
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        padding: '32px'
      }}>
        <h2 style={{ fontSize: '20px', color: '#1f2937', marginBottom: '20px', borderBottom: '1px solid #e5e7eb', paddingBottom: '12px' }}>
          👤 My Profile
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <p style={{ fontSize: '13px', color: '#6b7280' }}>Student ID</p>
            <p style={{ fontSize: '16px', fontWeight: '500', color: '#1f2937' }}>
              {student.student_id || 'N/A'}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '13px', color: '#6b7280' }}>Full Name</p>
            <p style={{ fontSize: '16px', fontWeight: '500', color: '#1f2937' }}>
              {student.first_name} {student.middle_name || ''} {student.last_name}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '13px', color: '#6b7280' }}>Email Address</p>
            <p style={{ fontSize: '16px', fontWeight: '500', color: '#1f2937' }}>{student.email}</p>
          </div>
          <div>
            <p style={{ fontSize: '13px', color: '#6b7280' }}>Contact Number</p>
            <p style={{ fontSize: '16px', fontWeight: '500', color: '#1f2937' }}>{student.contact_number || 'N/A'}</p>
          </div>
          <div>
            <p style={{ fontSize: '13px', color: '#6b7280' }}>Address</p>
            <p style={{ fontSize: '16px', fontWeight: '500', color: '#1f2937' }}>{student.address}</p>
          </div>
          <div>
            <p style={{ fontSize: '13px', color: '#6b7280' }}>Birth Date</p>
            <p style={{ fontSize: '16px', fontWeight: '500', color: '#1f2937' }}>
              {new Date(student.birth_date).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '13px', color: '#6b7280' }}>Gender</p>
            <p style={{ fontSize: '16px', fontWeight: '500', color: '#1f2937' }}>{student.gender}</p>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <p style={{ fontSize: '13px', color: '#6b7280' }}>Guardian</p>
            <p style={{ fontSize: '16px', fontWeight: '500', color: '#1f2937' }}>
              {student.father_name ? `Father: ${student.father_name}` : ''}
              {student.mother_name ? ` | Mother: ${student.mother_name}` : ''}
              {student.guardian_name ? ` | Guardian: ${student.guardian_name}` : ''}
            </p>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '20px', color: '#6b7280' }}>⏳ Loading...</div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f1f5f9',
      fontFamily: 'Segoe UI, Arial, sans-serif',
      display: 'flex'
    }}>
      {/* ========== SIDEBAR ========== */}
      <div style={{
        width: '280px',
        minHeight: '100vh',
        height: '100vh',
        background: 'white',
        borderRight: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        left: 0,
        overflow: 'hidden',
        flexShrink: 0,
        zIndex: 50,
        boxShadow: '2px 0 10px rgba(0,0,0,0.05)'
      }}>
        {/* Logo */}
        <div style={{
          padding: '24px 24px 20px',
          borderBottom: '1px solid #e5e7eb',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a56db' }}>🎓</span>
            <div>
              <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#1a56db' }}>NCDC</span>
              <br />
              <span style={{ fontSize: '11px', color: '#6b7280' }}>Student Portal</span>
            </div>
          </div>
        </div>

        {/* Profile Section with Photo */}
        <Link to="/student/profile" style={{
          textDecoration: 'none',
          padding: '20px 24px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          cursor: 'pointer',
          transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: '#dbeafe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#1a56db',
            fontSize: '20px',
            fontWeight: 'bold',
            overflow: 'hidden',
            flexShrink: 0,
            border: '2px solid #e5e7eb'
          }}>
            {profilePicPreview ? (
              <img 
                src={profilePicPreview} 
                alt="Profile" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              student?.first_name?.charAt(0).toUpperCase() || 'S'
            )}
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: '600', color: '#1f2937' }}>
              {student?.first_name || 'Student'} {student?.last_name || ''}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>
              {statusInfo.label === 'Enrolled' ? 'Enrolled Student' : 'Applicant'}
            </div>
          </div>
        </Link>

        {/* Menu Items */}
        <div style={{ 
          padding: '16px 12px', 
          flex: 1, 
          overflowY: 'auto',
          overflowX: 'hidden'
        }}>
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveMenu(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: 'none',
                background: activeMenu === item.id ? '#dbeafe' : 'transparent',
                color: activeMenu === item.id ? '#1a56db' : '#6b7280',
                fontWeight: activeMenu === item.id ? '600' : '500',
                fontSize: '14px',
                transition: 'all 0.3s ease',
                marginBottom: '2px',
                cursor: 'pointer',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                if (activeMenu !== item.id) {
                  e.currentTarget.style.background = '#f3f4f6';
                }
              }}
              onMouseLeave={(e) => {
                if (activeMenu !== item.id) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              {activeMenu === item.id && (
                <span style={{
                  position: 'absolute',
                  left: '0',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '4px',
                  height: '24px',
                  background: '#1a56db',
                  borderRadius: '0 4px 4px 0'
                }} />
              )}
              <span style={{ fontSize: '18px', width: '24px' }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>

        {/* Logout Button */}
        <div style={{ 
          padding: '12px 16px', 
          borderTop: '1px solid #e5e7eb',
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
              borderRadius: '8px',
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
        maxHeight: '100vh'
      }}>
        {/* Welcome Section */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <div>
            <h1 style={{ fontSize: '24px', color: '#1f2937', margin: 0, fontWeight: '700' }}>
              {activeMenu === 'dashboard' && '📊 Dashboard'}
              {activeMenu === 'profile' && '👤 My Profile'}
              {activeMenu === 'documents' && '📄 Documents'}
            </h1>
            <p style={{ color: '#6b7280', margin: '4px 0 0', fontSize: '14px' }}>
              {activeMenu === 'dashboard' && `Welcome back, ${student?.first_name || 'Student'}! Keep learning and growing.`}
              {activeMenu === 'profile' && 'View and manage your personal information.'}
              {activeMenu === 'documents' && 'View and download your documents.'}
            </p>
          </div>
          <div style={{
            background: '#dbeafe',
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '13px',
            color: '#1a56db',
            fontWeight: '500'
          }}>
            🎓 Student
          </div>
        </div>

        {/* Dynamic Content */}
        {renderContent()}

        {/* Footer */}
        <div style={{
          marginTop: '32px',
          paddingTop: '16px',
          borderTop: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <p style={{ fontSize: '13px', color: '#9ca3af' }}>
            © 2026 <strong style={{ color: '#1a56db' }}>NCDC</strong>. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;