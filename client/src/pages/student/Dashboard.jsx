import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../../services/api';
import UPLOADS_URL from '../../services/uploads';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState(null);
  const [application, setApplication] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [grades, setGrades] = useState([]);
  const [remarks, setRemarks] = useState([]);
  const [profilePicPreview, setProfilePicPreview] = useState(null);
  const [activeMenu, setActiveMenu] = useState('dashboard');

  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    contact_number: '',
    address: ''
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editMessage, setEditMessage] = useState('');

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');

  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');

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
      const studentId = user.id;

      const studentResponse = await API.get(`/student/profile/${studentId}`);
      setStudent(studentResponse.data);

      if (studentResponse.data.profile_pic) {
        setProfilePicPreview(`${UPLOADS_URL}/profiles/${studentResponse.data.profile_pic}`);
      }

      try {
        const appResponse = await API.get(`/student/application/${studentId}`);
        setApplication(appResponse.data);
      } catch (e) { console.warn('No application'); }

      try {
        const enrollRes = await API.get(`/registrar/enrollments/student/${studentId}`);
        setEnrollments(Array.isArray(enrollRes.data) ? enrollRes.data : []);
      } catch (e) { console.warn('No enrollments'); }

      try {
        const gradesRes = await API.get(`/registrar/grades/student/${studentId}`);
        setGrades(Array.isArray(gradesRes.data) ? gradesRes.data : []);
      } catch (e) { console.warn('No grades'); }

      try {
        const remarksRes = await API.get(`/registrar/remarks/student/${studentId}`);
        setRemarks(Array.isArray(remarksRes.data) ? remarksRes.data : []);
      } catch (e) { console.warn('No remarks'); }

    } catch (error) {
      console.error('Error fetching student data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = () => {
    if (student) {
      setEditData({
        first_name: student.first_name || '',
        middle_name: student.middle_name || '',
        last_name: student.last_name || '',
        contact_number: student.contact_number || '',
        address: student.address || ''
      });
      setEditMode(true);
      setEditMessage('');
    }
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async () => {
    setEditLoading(true);
    setEditMessage('');
    try {
      await API.put(`/student/update-profile/${user.id}`, editData);
      setEditMessage({ type: 'success', text: '✅ Profile updated successfully!' });
      setEditMode(false);
      fetchStudentData();
      setTimeout(() => setEditMessage(''), 3000);
    } catch (error) {
      setEditMessage({ type: 'error', text: '❌ Failed to update profile' });
    } finally {
      setEditLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setEditMessage('');
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setUploadMessage({ type: 'error', text: '❌ Only JPG, PNG, and GIF files are allowed' });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setUploadMessage({ type: 'error', text: '❌ File size must be less than 2MB' });
      return;
    }

    setUploading(true);
    setUploadMessage('');

    const formData = new FormData();
    formData.append('profile_pic', file);

    try {
      const response = await API.post(`/student/upload-profile-pic/${user.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadMessage({ type: 'success', text: '✅ ' + response.data.message });
      setProfilePicPreview(`${UPLOADS_URL}/profiles/${response.data.filename}`);
      setTimeout(() => setUploadMessage(''), 3000);
    } catch (error) {
      setUploadMessage({ type: 'error', text: '❌ Failed to upload profile picture' });
    } finally {
      setUploading(false);
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmitPassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordMessage({ type: 'error', text: '❌ Please fill in all fields' });
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: '❌ New password must be at least 6 characters' });
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMessage({ type: 'error', text: '❌ Passwords do not match' });
      return;
    }

    setPasswordLoading(true);
    setPasswordMessage('');

    try {
      await API.post('/student/change-password', {
        userId: user.id,
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      setPasswordMessage({ type: 'success', text: '✅ Password changed successfully!' });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordMessage('');
      }, 2000);
    } catch (error) {
      setPasswordMessage({ type: 'error', text: '❌ ' + (error.response?.data?.error || 'Failed to change password') });
    } finally {
      setPasswordLoading(false);
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

  const studentNumber = student?.student_id ? student.student_id.replace('NCDC-', '') : 'N/A';
  const statusInfo = application ? getStatusInfo(application.status) : getStatusInfo('pending');

  // ===== AUTO-REMARKS =====
  const getAutoRemarks = (gradeValue) => {
    const num = parseFloat(gradeValue);
    if (isNaN(num)) return '';
    if (num >= 95) return 'Excellent';
    if (num >= 90) return 'Outstanding';
    if (num >= 85) return 'Very Good';
    if (num >= 80) return 'Good';
    if (num >= 75) return 'Satisfactory';
    return 'Failed';
  };

  // ===== GROUP GRADES BY SUBJECT + QUARTER =====
  const groupGradesBySubject = (gradesList) => {
    const grouped = {};

    gradesList.forEach(g => {
      const key = g.subject;
      if (!grouped[key]) {
        grouped[key] = {
          subject: g.subject,
          quarters: { '1st Quarter': null, '2nd Quarter': null, '3rd Quarter': null, '4th Quarter': null }
        };
      }

      let q = g.quarter || '';
      if (q === 'Q1' || q === '1st Quarter') q = '1st Quarter';
      else if (q === 'Q2' || q === '2nd Quarter') q = '2nd Quarter';
      else if (q === 'Q3' || q === '3rd Quarter') q = '3rd Quarter';
      else if (q === 'Q4' || q === '4th Quarter') q = '4th Quarter';

      if (grouped[key].quarters[q] !== undefined) {
        grouped[key].quarters[q] = parseFloat(g.grade);
      }
    });

    return Object.values(grouped);
  };

  const computeFinalAverage = (quarters) => {
    const vals = Object.values(quarters).filter(v => v !== null && !isNaN(v));
    if (vals.length === 0) return null;
    const sum = vals.reduce((acc, v) => acc + v, 0);
    return (sum / vals.length).toFixed(2);
  };

  const gradeColor = (grade) => {
    const num = parseFloat(grade);
    if (num >= 95) return { bg: '#d1fae5', color: '#065f46' };
    if (num >= 90) return { bg: '#dbeafe', color: '#1a56db' };
    if (num >= 85) return { bg: '#e0e7ff', color: '#4338ca' };
    if (num >= 80) return { bg: '#fef3c7', color: '#92400e' };
    if (num >= 75) return { bg: '#fff7ed', color: '#c2410c' };
    return { bg: '#fee2e2', color: '#991b1b' };
  };

  const remarksColor = (remarks) => {
    const colors = {
      'Excellent': { bg: '#d1fae5', color: '#065f46' },
      'Outstanding': { bg: '#dbeafe', color: '#1a56db' },
      'Very Good': { bg: '#e0e7ff', color: '#4338ca' },
      'Good': { bg: '#fef3c7', color: '#92400e' },
      'Satisfactory': { bg: '#fff7ed', color: '#c2410c' },
      'Failed': { bg: '#fee2e2', color: '#991b1b' }
    };
    return colors[remarks] || { bg: '#f3f4f6', color: '#6b7280' };
  };

  const calculateOverallAverage = () => {
    if (grades.length === 0) return 0;
    const sum = grades.reduce((acc, g) => acc + parseFloat(g.grade || 0), 0);
    return (sum / grades.length).toFixed(2);
  };

  const menuItems = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'grades', icon: '📈', label: 'My Grades' },
    { id: 'remarks', icon: '💬', label: 'My Remarks' },
    { id: 'history', icon: '📚', label: 'Enrollment History' },
    { id: 'profile', icon: '👤', label: 'My Profile' }
  ];

  const renderContent = () => {
    switch (activeMenu) {
      case 'dashboard': return renderDashboard();
      case 'grades': return renderGrades();
      case 'remarks': return renderRemarks();
      case 'history': return renderHistory();
      case 'profile': return renderProfile();
      default: return renderDashboard();
    }
  };

  // ============ DASHBOARD ============
  const renderDashboard = () => (
    <div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{
          background: 'white', padding: '20px', borderRadius: '12px',
          border: '1px solid #e5e7eb', borderTop: '4px solid #1a56db'
        }}>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>Student ID</div>
          <div style={{ fontSize: '22px', fontWeight: '700', color: '#1f2937', marginTop: '4px' }}>
            {studentNumber}
          </div>
          <div style={{ fontSize: '11px', color: '#9ca3af' }}>Your unique NCDC number</div>
        </div>

        <div style={{
          background: 'white', padding: '20px', borderRadius: '12px',
          border: '1px solid #e5e7eb', borderTop: '4px solid #8b5cf6'
        }}>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>Grade Level</div>
          <div style={{ fontSize: '22px', fontWeight: '700', color: '#1f2937', marginTop: '4px' }}>
            {student?.current_grade_level || 'Not Assigned'}
          </div>
          <div style={{ fontSize: '11px', color: '#9ca3af' }}>
            {student?.current_section ? `Section: ${student.current_section}` : 'Awaiting section'}
          </div>
        </div>

        <div style={{
          background: 'white', padding: '20px', borderRadius: '12px',
          border: '1px solid #e5e7eb', borderTop: `4px solid ${statusInfo.color}`
        }}>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>Enrollment Status</div>
          <div style={{ fontSize: '22px', fontWeight: '700', color: statusInfo.color, marginTop: '4px' }}>
            {statusInfo.icon} {statusInfo.label}
          </div>
          <div style={{ fontSize: '11px', color: '#9ca3af' }}>
            {statusInfo.label === 'Enrolled' ? 'Active Student' : 'Pending Review'}
          </div>
        </div>

        {grades.length > 0 && (
          <div style={{
            background: 'white', padding: '20px', borderRadius: '12px',
            border: '1px solid #e5e7eb',
            borderTop: `4px solid ${parseFloat(calculateOverallAverage()) >= 75 ? '#10b981' : '#ef4444'}`
          }}>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>General Average</div>
            <div style={{
              fontSize: '28px', fontWeight: '800', marginTop: '4px',
              color: parseFloat(calculateOverallAverage()) >= 75 ? '#065f46' : '#991b1b'
            }}>
              {calculateOverallAverage()}
            </div>
            <div style={{ fontSize: '11px', color: '#9ca3af' }}>
              {parseFloat(calculateOverallAverage()) >= 75 ? '✅ Passing' : '⚠️ Needs Improvement'}
            </div>
          </div>
        )}
      </div>

      <div style={{
        background: 'white', borderRadius: '12px',
        border: '1px solid #e5e7eb', padding: '24px', marginBottom: '24px'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937', marginBottom: '16px' }}>
          📋 My Enrollment Details
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
          <div>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>Status</p>
            <p style={{ fontSize: '16px', fontWeight: '600', color: statusInfo.color, margin: '4px 0' }}>
              {statusInfo.label}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>Date Applied</p>
            <p style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937', margin: '4px 0' }}>
              {application?.created_at ? new Date(application.created_at).toLocaleDateString() : 'N/A'}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>Academic Year</p>
            <p style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937', margin: '4px 0' }}>
              {application?.academic_year || '2026-2027'}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>Grade Level</p>
            <p style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937', margin: '4px 0' }}>
              {student?.current_grade_level || 'Not Assigned'}
            </p>
          </div>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px'
      }}>
        {[
          { icon: '📈', label: 'My Grades', desc: 'View your grades', action: 'grades' },
          { icon: '💬', label: 'My Remarks', desc: 'View remarks from teacher', action: 'remarks' },
          { icon: '📚', label: 'My History', desc: 'View enrollment history', action: 'history' },
          { icon: '🔒', label: 'Change Password', desc: 'Update your password', action: 'password' }
        ].map((item, index) => (
          <div
            key={index}
            onClick={() => {
              if (item.action === 'password') setShowPasswordModal(true);
              else setActiveMenu(item.action);
            }}
            style={{
              background: 'white', padding: '20px', borderRadius: '12px',
              border: '1px solid #e5e7eb', textAlign: 'center',
              cursor: 'pointer', transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.08)';
              e.currentTarget.style.borderColor = '#1a56db';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.borderColor = '#e5e7eb';
            }}
          >
            <div style={{ fontSize: '32px' }}>{item.icon}</div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937', marginTop: '8px' }}>
              {item.label}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>{item.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );

  // ============ GRADES (SIMPLE REPORT CARD) ============
  const renderGrades = () => {
    if (grades.length === 0) {
      return (
        <div style={{
          background: 'white', borderRadius: '12px',
          border: '1px solid #e5e7eb', padding: '24px'
        }}>
          <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
            <div style={{ fontSize: '48px', marginBottom: '8px' }}>📭</div>
            <h3 style={{ color: '#1f2937', marginBottom: '8px' }}>No Grades Yet</h3>
            <p style={{ fontSize: '14px' }}>Wala pay grades nga gi-record sa imong teacher. Please wait.</p>
          </div>
        </div>
      );
    }

    const gradesByYear = {};
    grades.forEach(g => {
      const sy = g.school_year || 'N/A';
      const gradeLevel = g.grade_level || 'N/A';
      const key = `${sy}|${gradeLevel}`;
      if (!gradesByYear[key]) {
        gradesByYear[key] = { school_year: sy, grade_level: gradeLevel, grades: [] };
      }
      gradesByYear[key].grades.push(g);
    });

    const yearKeys = Object.keys(gradesByYear).sort().reverse();

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Overall Average */}
        <div style={{
          background: 'white', borderRadius: '12px', padding: '24px',
          border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                General Average
              </div>
              <div style={{
                fontSize: '42px', fontWeight: '800', marginTop: '4px',
                color: parseFloat(calculateOverallAverage()) >= 75 ? '#065f46' : '#991b1b'
              }}>
                {calculateOverallAverage()}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '24px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>Subjects</div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#1f2937' }}>
                  {Object.keys(groupGradesBySubject(grades).reduce((acc, s) => { acc[s.subject] = true; return acc; }, {})).length}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>Total Grades</div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#1f2937' }}>{grades.length}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tables per SY */}
        {yearKeys.map(key => {
          const yearData = gradesByYear[key];
          const groupedSubjects = groupGradesBySubject(yearData.grades);

          return (
            <div key={key} style={{
              background: 'white', borderRadius: '12px',
              border: '1px solid #e5e7eb', overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              {/* SY Header */}
              <div style={{
                padding: '14px 20px',
                background: 'linear-gradient(135deg, #800000, #a52a2a)',
                color: 'white',
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', flexWrap: 'wrap', gap: '8px'
              }}>
                <div>
                  <span style={{ fontSize: '16px', fontWeight: '700' }}>🎓 {yearData.grade_level}</span>
                  <span style={{ fontSize: '13px', marginLeft: '12px', opacity: 0.9 }}>S.Y. {yearData.school_year}</span>
                </div>
                <div style={{ fontSize: '13px', opacity: 0.9 }}>
                  {groupedSubjects.length} subject{groupedSubjects.length !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                  <thead>
                    <tr style={{ background: '#800000', color: 'white' }}>
                      <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', minWidth: '200px', borderRight: '1px solid rgba(255,255,255,0.15)' }}>SUBJECTS</th>
                      <th style={{ padding: '14px 12px', textAlign: 'center', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', width: '90px', borderRight: '1px solid rgba(255,255,255,0.15)' }}>Q1</th>
                      <th style={{ padding: '14px 12px', textAlign: 'center', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', width: '90px', borderRight: '1px solid rgba(255,255,255,0.15)' }}>Q2</th>
                      <th style={{ padding: '14px 12px', textAlign: 'center', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', width: '90px', borderRight: '1px solid rgba(255,255,255,0.15)' }}>Q3</th>
                      <th style={{ padding: '14px 12px', textAlign: 'center', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', width: '90px', borderRight: '1px solid rgba(255,255,255,0.15)' }}>Q4</th>
                      <th style={{ padding: '14px 12px', textAlign: 'center', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', width: '110px', borderRight: '1px solid rgba(255,255,255,0.15)' }}>FINAL AVE</th>
                      <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', width: '140px' }}>REMARKS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedSubjects.map((subjectData) => {
                      const finalAvg = computeFinalAverage(subjectData.quarters);
                      const finalRemarks = finalAvg ? getAutoRemarks(finalAvg) : '';
                      const avgColor = finalAvg ? gradeColor(finalAvg) : null;
                      const remColor = finalRemarks ? remarksColor(finalRemarks) : null;

                      return (
                        <tr key={subjectData.subject} style={{ borderBottom: '1px solid #e5e7eb', background: 'white' }}>
                          <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: '600', color: '#1f2937', borderRight: '1px solid #f3f4f6' }}>
                            {subjectData.subject}
                          </td>

                          {/* Simple quarters — no color */}
                          {['1st Quarter', '2nd Quarter', '3rd Quarter', '4th Quarter'].map(q => {
                            const grade = subjectData.quarters[q];
                            return (
                              <td key={q} style={{
                                padding: '14px 8px', textAlign: 'center', fontSize: '14px',
                                color: grade !== null ? '#1f2937' : '#d1d5db',
                                borderRight: '1px solid #f3f4f6',
                                fontWeight: grade !== null ? '600' : '400'
                              }}>
                                {grade !== null ? grade.toFixed(2) : '—'}
                              </td>
                            );
                          })}

                          {/* Final Average with badge */}
                          <td style={{ padding: '14px 12px', textAlign: 'center', borderRight: '1px solid #f3f4f6' }}>
                            {finalAvg ? (
                              <span style={{
                                display: 'inline-block', padding: '6px 14px',
                                borderRadius: '12px', fontSize: '14px', fontWeight: '800',
                                background: avgColor ? avgColor.bg : '#f3f4f6',
                                color: avgColor ? avgColor.color : '#6b7280'
                              }}>{finalAvg}</span>
                            ) : (
                              <span style={{ color: '#d1d5db', fontSize: '14px' }}>—</span>
                            )}
                          </td>

                          {/* Remarks with badge */}
                          <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                            {finalRemarks ? (
                              <span style={{
                                display: 'inline-block', padding: '6px 14px',
                                borderRadius: '12px', fontSize: '12px', fontWeight: '700',
                                background: remColor ? remColor.bg : '#f3f4f6',
                                color: remColor ? remColor.color : '#6b7280'
                              }}>{finalRemarks}</span>
                            ) : (
                              <span style={{ color: '#d1d5db', fontSize: '12px' }}>—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ============ REMARKS ============
  const renderRemarks = () => (
    <div style={{
      background: 'white', borderRadius: '12px',
      border: '1px solid #e5e7eb', padding: '24px'
    }}>
      <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', marginBottom: '20px' }}>
        💬 My Remarks ({remarks.length})
      </h3>

      {remarks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
          <div style={{ fontSize: '48px', marginBottom: '8px' }}>💭</div>
          <h3 style={{ color: '#1f2937', marginBottom: '8px' }}>No Remarks Yet</h3>
          <p style={{ fontSize: '14px' }}>Wala pay remarks nga gi-record sa imong teacher.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {remarks.map((r, idx) => (
            <div key={r.id || idx} style={{
              padding: '16px 20px', borderRadius: '12px',
              border: '1px solid #e5e7eb', background: '#f9fafb'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                <span style={{
                  padding: '3px 12px', borderRadius: '12px',
                  fontSize: '11px', fontWeight: '600',
                  background: '#dbeafe', color: '#1a56db', textTransform: 'uppercase'
                }}>{r.remark_type || 'general'}</span>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>by {r.created_by_role || 'system'}</span>
                <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                  • {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <p style={{ margin: 0, color: '#1f2937', fontSize: '14px', lineHeight: '1.6' }}>{r.remark}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ============ HISTORY ============
  const renderHistory = () => (
    <div style={{
      background: 'white', borderRadius: '12px',
      border: '1px solid #e5e7eb', padding: '24px'
    }}>
      <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', marginBottom: '20px' }}>
        📚 My Enrollment History ({enrollments.length})
      </h3>

      {enrollments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
          <div style={{ fontSize: '48px', marginBottom: '8px' }}>📭</div>
          <h3 style={{ color: '#1f2937', marginBottom: '8px' }}>No Enrollment Records</h3>
          <p style={{ fontSize: '14px' }}>Wala pay enrollment records.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {enrollments.map((e, idx) => (
            <div key={e.id || idx} style={{
              padding: '16px 20px', borderRadius: '12px',
              border: '1px solid #e5e7eb', borderLeft: '4px solid #1a56db',
              background: '#f9fafb'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h4 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: '700', color: '#1f2937' }}>
                    {e.grade_level} {e.section_name ? `- ${e.section_name}` : ''}
                  </h4>
                  <div style={{ fontSize: '13px', color: '#6b7280' }}>📅 {e.school_year}</div>
                </div>
                <span style={{
                  padding: '4px 14px', borderRadius: '12px',
                  fontSize: '12px', fontWeight: '600',
                  background: e.status === 'passed' ? '#d1fae5' :
                              e.status === 'failed' ? '#fee2e2' :
                              e.status === 'graduated' ? '#dbeafe' :
                              e.status === 'enrolled' ? '#e0e7ff' : '#f3f4f6',
                  color: e.status === 'passed' ? '#065f46' :
                         e.status === 'failed' ? '#991b1b' :
                         e.status === 'graduated' ? '#1e40af' :
                         e.status === 'enrolled' ? '#4338ca' : '#6b7280'
                }}>{e.status}</span>
              </div>
              {e.enrolled_at && (
                <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '8px' }}>
                  Enrolled: {new Date(e.enrolled_at).toLocaleDateString()}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ============ PROFILE ============
  const renderProfile = () => {
    if (!student) return null;
    return (
      <div style={{
        background: 'white', borderRadius: '12px',
        border: '1px solid #e5e7eb', padding: '32px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e5e7eb', paddingBottom: '12px' }}>
          <h2 style={{ fontSize: '20px', color: '#1f2937', margin: 0 }}>👤 My Profile</h2>
          {!editMode ? (
            <button onClick={handleEditClick} style={{
              background: '#1a56db', color: 'white', border: 'none',
              padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500'
            }}>✏️ Edit Profile</button>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleCancelEdit} style={{
                background: '#6b7280', color: 'white', border: 'none',
                padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500'
              }}>Cancel</button>
              <button onClick={handleSaveProfile} disabled={editLoading} style={{
                background: editLoading ? '#93c5fd' : '#10b981', color: 'white',
                border: 'none', padding: '8px 20px', borderRadius: '8px',
                cursor: editLoading ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: '500'
              }}>{editLoading ? 'Saving...' : '💾 Save'}</button>
            </div>
          )}
        </div>

        {editMessage && (
          <div style={{
            padding: '10px 14px', borderRadius: '8px', marginBottom: '16px',
            background: editMessage.type === 'success' ? '#d1fae5' : '#fee2e2',
            color: editMessage.type === 'success' ? '#065f46' : '#991b1b'
          }}>{editMessage.text}</div>
        )}

        {!editMode ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>Student ID</p>
              <p style={{ fontSize: '16px', fontWeight: '500', color: '#1f2937', margin: '4px 0' }}>{student.student_id || 'N/A'}</p>
            </div>
            <div>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>Full Name</p>
              <p style={{ fontSize: '16px', fontWeight: '500', color: '#1f2937', margin: '4px 0' }}>
                {student.first_name} {student.middle_name || ''} {student.last_name}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>Email</p>
              <p style={{ fontSize: '16px', fontWeight: '500', color: '#1f2937', margin: '4px 0' }}>{student.email}</p>
            </div>
            <div>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>Contact</p>
              <p style={{ fontSize: '16px', fontWeight: '500', color: '#1f2937', margin: '4px 0' }}>{student.contact_number || 'N/A'}</p>
            </div>
            <div>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>Birth Date</p>
              <p style={{ fontSize: '16px', fontWeight: '500', color: '#1f2937', margin: '4px 0' }}>
                {new Date(student.birth_date).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>Gender</p>
              <p style={{ fontSize: '16px', fontWeight: '500', color: '#1f2937', margin: '4px 0' }}>{student.gender}</p>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>Address</p>
              <p style={{ fontSize: '16px', fontWeight: '500', color: '#1f2937', margin: '4px 0' }}>{student.address}</p>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '13px', color: '#374151', fontWeight: '500' }}>First Name</label>
              <input type="text" name="first_name" value={editData.first_name} onChange={handleEditChange}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', marginTop: '4px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '13px', color: '#374151', fontWeight: '500' }}>Middle Name</label>
              <input type="text" name="middle_name" value={editData.middle_name} onChange={handleEditChange}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', marginTop: '4px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '13px', color: '#374151', fontWeight: '500' }}>Last Name</label>
              <input type="text" name="last_name" value={editData.last_name} onChange={handleEditChange}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', marginTop: '4px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '13px', color: '#374151', fontWeight: '500' }}>Contact Number</label>
              <input type="text" name="contact_number" value={editData.contact_number} onChange={handleEditChange}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', marginTop: '4px', boxSizing: 'border-box' }} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '13px', color: '#374151', fontWeight: '500' }}>Address</label>
              <textarea name="address" value={editData.address} onChange={handleEditChange} rows="2"
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', marginTop: '4px', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
          </div>
        )}
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
        <div style={{ padding: '24px 24px 20px', borderBottom: '1px solid rgba(255,255,255,0.2)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              background: 'linear-gradient(135deg, #1a56db, #3b82f6)',
              width: '40px', height: '40px', borderRadius: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '20px', boxShadow: '0 4px 15px rgba(26,86,219,0.3)'
            }}>🎓</div>
            <div>
              <span style={{ fontSize: '18px', fontWeight: '800', color: '#1f2937' }}>NCDC</span>
              <br />
              <span style={{ fontSize: '10px', color: '#6b7280', fontWeight: '500' }}>Student Portal</span>
            </div>
          </div>
        </div>

        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.2)',
          display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0
        }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#1a56db', fontSize: '20px', fontWeight: 'bold',
            border: '2px solid rgba(255,255,255,0.5)',
            overflow: 'hidden', flexShrink: 0, position: 'relative'
          }}>
            {profilePicPreview ? (
              <img src={profilePicPreview} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              student?.first_name?.charAt(0).toUpperCase() || 'S'
            )}
            <label style={{
              position: 'absolute', bottom: '-2px', right: '-2px',
              background: '#1a56db', color: 'white',
              width: '20px', height: '20px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontSize: '10px',
              border: '2px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }}>
              📷
              <input type="file" accept="image/*" onChange={handleFileChange}
                style={{ display: 'none' }} disabled={uploading} />
            </label>
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: '600', color: '#1f2937' }}>
              {student?.first_name || 'Student'} {student?.last_name || ''}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>
              {student?.current_grade_level || 'Student'}
            </div>
          </div>
        </div>

        {uploadMessage && (
          <div style={{
            fontSize: '11px', padding: '6px 24px',
            color: uploadMessage.type === 'success' ? '#065f46' : '#991b1b',
            background: uploadMessage.type === 'success' ? '#d1fae5' : '#fee2e2',
            textAlign: 'center'
          }}>{uploadMessage.text}</div>
        )}

        <div style={{ padding: '16px 12px', flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          {menuItems.map((item) => (
            <button key={item.id} onClick={() => setActiveMenu(item.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                width: '100%', padding: '10px 14px', borderRadius: '8px',
                border: 'none',
                background: activeMenu === item.id ? 'rgba(59,130,246,0.08)' : 'transparent',
                color: activeMenu === item.id ? '#1a56db' : '#6b7280',
                fontWeight: activeMenu === item.id ? '600' : '500',
                fontSize: '14px', transition: 'all 0.3s ease',
                marginBottom: '2px', cursor: 'pointer',
                position: 'relative', boxSizing: 'border-box'
              }}
              onMouseEnter={(e) => {
                if (activeMenu !== item.id) e.currentTarget.style.background = 'rgba(0,0,0,0.03)';
              }}
              onMouseLeave={(e) => {
                if (activeMenu !== item.id) e.currentTarget.style.background = 'transparent';
              }}>
              {activeMenu === item.id && (
                <span style={{
                  position: 'absolute', left: '0', top: '50%',
                  transform: 'translateY(-50%)', width: '3px', height: '24px',
                  background: 'linear-gradient(180deg, #1a56db, #3b82f6)',
                  borderRadius: '0 4px 4px 0'
                }} />
              )}
              <span style={{ fontSize: '18px', width: '24px' }}>{item.icon}</span>
              {item.label}
            </button>
          ))}

          <button onClick={() => setShowPasswordModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              width: '100%', padding: '10px 14px', borderRadius: '8px',
              border: 'none', background: 'transparent',
              color: '#6b7280', fontWeight: '500', fontSize: '14px',
              transition: 'all 0.3s ease', marginBottom: '2px', cursor: 'pointer'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.03)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
            <span style={{ fontSize: '18px', width: '24px' }}>🔒</span>
            Change Password
          </button>
        </div>

        <div style={{
          padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.2)',
          flexShrink: 0, background: 'rgba(255,255,255,0.3)'
        }}>
          <button onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              width: '100%', padding: '10px 14px', borderRadius: '8px',
              border: 'none', background: 'transparent', color: '#ef4444',
              fontWeight: '500', cursor: 'pointer', fontSize: '14px', transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(239,68,68,0.08)';
              e.target.style.transform = 'translateX(4px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'transparent';
              e.target.style.transform = 'translateX(0)';
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
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: '24px'
        }}>
          <div>
            <h1 style={{ fontSize: '24px', color: '#1f2937', margin: 0, fontWeight: '700' }}>
              {activeMenu === 'dashboard' && '📊 Dashboard'}
              {activeMenu === 'grades' && '📈 My Grades'}
              {activeMenu === 'remarks' && '💬 My Remarks'}
              {activeMenu === 'history' && '📚 Enrollment History'}
              {activeMenu === 'profile' && '👤 My Profile'}
            </h1>
            <p style={{ color: '#6b7280', margin: '4px 0 0', fontSize: '14px' }}>
              {activeMenu === 'dashboard' && `Welcome back, ${student?.first_name || 'Student'}!`}
              {activeMenu === 'grades' && 'Report card view — grades per quarter.'}
              {activeMenu === 'remarks' && 'Remarks from your teacher.'}
              {activeMenu === 'history' && 'Your enrollment records.'}
              {activeMenu === 'profile' && 'View and manage your personal information.'}
            </p>
          </div>
          <div style={{
            background: '#dbeafe', padding: '8px 16px',
            borderRadius: '20px', fontSize: '13px',
            color: '#1a56db', fontWeight: '500'
          }}>
            🎓 {student?.current_grade_level || 'Student'}
          </div>
        </div>

        {renderContent()}

        <div style={{
          marginTop: '32px', paddingTop: '16px',
          borderTop: '1px solid #e5e7eb', textAlign: 'center'
        }}>
          <p style={{ fontSize: '13px', color: '#9ca3af' }}>
            Nurturing Today, <strong style={{ color: '#1a56db' }}>Empowering Tomorrow</strong>
          </p>
        </div>
      </div>

      {/* CHANGE PASSWORD MODAL */}
      {showPasswordModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '20px'
        }}>
          <div style={{
            background: 'white', borderRadius: '16px',
            maxWidth: '450px', width: '100%', padding: '32px',
            boxShadow: '0 25px 60px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', color: '#1f2937', margin: 0 }}>🔒 Change Password</h2>
              <button onClick={() => {
                setShowPasswordModal(false);
                setPasswordMessage('');
                setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
              }} style={{ background: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#9ca3af' }}>×</button>
            </div>

            {passwordMessage && (
              <div style={{
                padding: '10px 14px', borderRadius: '8px', marginBottom: '16px',
                background: passwordMessage.type === 'success' ? '#d1fae5' : '#fee2e2',
                color: passwordMessage.type === 'success' ? '#065f46' : '#991b1b'
              }}>{passwordMessage.text}</div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>Current Password</label>
              <input type="password" name="currentPassword" value={passwordData.currentPassword}
                onChange={handlePasswordChange} placeholder="Enter current password"
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>New Password</label>
              <input type="password" name="newPassword" value={passwordData.newPassword}
                onChange={handlePasswordChange} placeholder="New password (min 6 chars)"
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>Confirm New Password</label>
              <input type="password" name="confirmPassword" value={passwordData.confirmPassword}
                onChange={handlePasswordChange} placeholder="Confirm new password"
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => {
                setShowPasswordModal(false);
                setPasswordMessage('');
                setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
              }} style={{ flex: 1, background: '#6b7280', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>Cancel</button>
              <button onClick={handleSubmitPassword} disabled={passwordLoading}
                style={{
                  flex: 1,
                  background: passwordLoading ? '#93c5fd' : 'linear-gradient(135deg, #1a56db, #3b82f6)',
                  color: 'white', border: 'none', padding: '12px',
                  borderRadius: '8px', cursor: passwordLoading ? 'not-allowed' : 'pointer',
                  fontSize: '14px', fontWeight: '600'
                }}>{passwordLoading ? 'Saving...' : '✅ Update Password'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;