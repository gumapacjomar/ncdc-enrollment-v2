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
  const [reenrollRequests, setReenrollRequests] = useState([]);
  const [profilePicPreview, setProfilePicPreview] = useState(null);
  const [activeMenu, setActiveMenu] = useState('dashboard');

  // ✅ Mobile detection + drawer state
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(false); // close drawer kung mo-balik sa desktop
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ✅ Auto-close drawer kung mo-switch tab sa mobile
  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [activeMenu, isMobile]);

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

  const [reportCardSY, setReportCardSY] = useState('');

  const [showReenrollModal, setShowReenrollModal] = useState(false);
  const [reenrollRemarks, setReenrollRemarks] = useState('');
  const [reenrollSubmitting, setReenrollSubmitting] = useState(false);
  const [reenrollMessage, setReenrollMessage] = useState({ type: '', text: '' });

  const user = JSON.parse(localStorage.getItem('user'));

  const OLD_QUARTERS = ['1st Quarter', '2nd Quarter', '3rd Quarter', '4th Quarter'];
  const NEW_TERMS = ['Term 1', 'Term 2', 'Term 3'];
  const OLD_DISPLAY = ['Q1', 'Q2', 'Q3', 'Q4'];
  const NEW_DISPLAY = ['T1', 'T2', 'T3'];

  const TERM_SHORT_MAP = {
    '1st Quarter': 'Q1',
    '2nd Quarter': 'Q2',
    '3rd Quarter': 'Q3',
    '4th Quarter': 'Q4',
    'Term 1': 'T1',
    'Term 2': 'T2',
    'Term 3': 'T3'
  };

  useEffect(() => {
    if (!user || user.role !== 'student') {
      navigate('/login');
    } else {
      fetchStudentData();
    }
    // eslint-disable-next-line
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
      } catch (e) {
        console.warn('No application found');
      }

      try {
        const enrollRes = await API.get(`/registrar/enrollments/student/${studentId}`);
        const enr = Array.isArray(enrollRes.data) ? enrollRes.data : [];
        setEnrollments(enr);
        if (enr.length > 0) {
          setReportCardSY(enr[0].school_year);
        }
      } catch (e) {
        console.warn('No enrollments found');
      }

      try {
        const gradesRes = await API.get(`/registrar/grades/student/${studentId}`);
        setGrades(Array.isArray(gradesRes.data) ? gradesRes.data : []);
      } catch (e) {
        console.warn('No grades found');
      }

      try {
        const remarksRes = await API.get(`/registrar/remarks/student/${studentId}`);
        setRemarks(Array.isArray(remarksRes.data) ? remarksRes.data : []);
      } catch (e) {
        console.warn('No remarks found');
      }

      try {
        const reenrollRes = await API.get(`/student/reenrollment/${studentId}`);
        setReenrollRequests(Array.isArray(reenrollRes.data) ? reenrollRes.data : []);
      } catch (e) {
        console.warn('No re-enrollment requests');
      }

    } catch (error) {
      console.error('Error fetching student data:', error);
    } finally {
      setLoading(false);
    }
  };

  // ===== EDIT PROFILE =====
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

  // ===== PROFILE PICTURE =====
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

  // ===== CHANGE PASSWORD =====
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

  // ===== RE-ENROLLMENT SUBMIT =====
  const handleSubmitReenroll = async () => {
    if (!currentEnrollment) return;

    setReenrollSubmitting(true);
    setReenrollMessage({ type: '', text: '' });

    try {
      const res = await API.post('/student/reenrollment/apply', {
        student_id: user.id,
        current_enrollment_id: currentEnrollment.id,
        remarks: reenrollRemarks || (hasFailingSubjects ? 'Student-initiated retention' : 'Student-initiated re-enrollment')
      });

      setReenrollMessage({ type: 'success', text: res.data.message });

      setTimeout(() => {
        setShowReenrollModal(false);
        setReenrollRemarks('');
        setReenrollMessage({ type: '', text: '' });
        fetchStudentData();
      }, 2500);
    } catch (err) {
      setReenrollMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to submit re-enrollment'
      });
    } finally {
      setReenrollSubmitting(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  // ===== HELPERS =====
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

  const statusInfo = application ? getStatusInfo(application.status) : getStatusInfo('pending');

  const getCurrentEnrollment = () => {
    return enrollments.find(e => e.status === 'enrolled') || enrollments[0] || null;
  };

  const currentEnrollment = getCurrentEnrollment();

  const getLatestGrades = () => {
    if (enrollments.length === 0 || grades.length === 0) return [];
    const latestEnrollment = enrollments[0];
    return grades.filter(g =>
      g.school_year === latestEnrollment.school_year &&
      g.grade_level === latestEnrollment.grade_level
    );
  };

  const latestGrades = getLatestGrades();

  const calculateAverage = (gradeList = grades) => {
    if (gradeList.length === 0) return 0;
    const sum = gradeList.reduce((acc, g) => acc + parseFloat(g.grade || 0), 0);
    return (sum / gradeList.length).toFixed(2);
  };

  const detectSystem = (gradeList) => {
    if (!gradeList || gradeList.length === 0) {
      return {
        isOldSystem: false,
        columns: NEW_TERMS,
        displayHeaders: NEW_DISPLAY
      };
    }

    const hasOldQuarters = gradeList.some(g =>
      g.quarter && g.quarter.toLowerCase().includes('quarter')
    );

    if (hasOldQuarters) {
      return {
        isOldSystem: true,
        columns: OLD_QUARTERS,
        displayHeaders: OLD_DISPLAY
      };
    }

    return {
      isOldSystem: false,
      columns: NEW_TERMS,
      displayHeaders: NEW_DISPLAY
    };
  };

  const buildSubjectAverages = (gradeList) => {
    const subjectMap = {};
    const detection = detectSystem(gradeList);
    const expectedTerms = detection.columns;

    gradeList.forEach(g => {
      if (!subjectMap[g.subject]) {
        subjectMap[g.subject] = {
          q1: null, q2: null, q3: null, q4: null,
          t1: null, t2: null, t3: null,
          remarks: '',
          isOldSystem: detection.isOldSystem
        };
      }

      const q = (g.quarter || '').toLowerCase();
      const gradeVal = parseFloat(g.grade);

      if (q.includes('1st quarter')) subjectMap[g.subject].q1 = gradeVal;
      else if (q.includes('2nd quarter')) subjectMap[g.subject].q2 = gradeVal;
      else if (q.includes('3rd quarter')) subjectMap[g.subject].q3 = gradeVal;
      else if (q.includes('4th quarter')) subjectMap[g.subject].q4 = gradeVal;
      else if (q === 'term 1') subjectMap[g.subject].t1 = gradeVal;
      else if (q === 'term 2') subjectMap[g.subject].t2 = gradeVal;
      else if (q === 'term 3') subjectMap[g.subject].t3 = gradeVal;

      if (g.remarks) subjectMap[g.subject].remarks = g.remarks;
    });

    return Object.entries(subjectMap).map(([subject, data]) => {
      const termMap = {};

      if (detection.isOldSystem) {
        if (data.q1 !== null) termMap['1st Quarter'] = data.q1;
        if (data.q2 !== null) termMap['2nd Quarter'] = data.q2;
        if (data.q3 !== null) termMap['3rd Quarter'] = data.q3;
        if (data.q4 !== null) termMap['4th Quarter'] = data.q4;
      } else {
        if (data.t1 !== null) termMap['Term 1'] = data.t1;
        if (data.t2 !== null) termMap['Term 2'] = data.t2;
        if (data.t3 !== null) termMap['Term 3'] = data.t3;
      }

      const values = expectedTerms
        .map(t => termMap[t])
        .filter(v => v !== null && v !== undefined && !isNaN(v));

      const finalAve = values.length > 0
        ? parseFloat((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2))
        : null;

      const failingTerms = [];
      expectedTerms.forEach(term => {
        const val = termMap[term];
        if (val !== null && val !== undefined && !isNaN(val) && val < 75) {
          failingTerms.push({
            term,
            short: TERM_SHORT_MAP[term] || term,
            value: val
          });
        }
      });

      const hasFailingTerm = failingTerms.length > 0;

      return {
        subject,
        q1: data.q1, q2: data.q2, q3: data.q3, q4: data.q4,
        t1: data.t1, t2: data.t2, t3: data.t3,
        termMap,
        finalAve,
        isOldSystem: detection.isOldSystem,
        failingTerms,
        hasFailingTerm,
        remarks: data.remarks
      };
    });
  };

  const buildGradesBySY = () => {
    const grouped = {};
    grades.forEach(g => {
      const key = `${g.school_year}|${g.grade_level}`;
      if (!grouped[key]) {
        grouped[key] = {
          school_year: g.school_year,
          grade_level: g.grade_level,
          subjects: []
        };
      }
      grouped[key].subjects.push(g);
    });

    return Object.values(grouped).map(group => {
      const detection = detectSystem(group.subjects);
      return {
        ...group,
        subjectAverages: buildSubjectAverages(group.subjects),
        overallAverage: calculateAverage(group.subjects),
        isOldSystem: detection.isOldSystem,
        displayHeaders: detection.displayHeaders
      };
    }).sort((a, b) => {
      if (a.school_year > b.school_year) return -1;
      if (a.school_year < b.school_year) return 1;
      return 0;
    });
  };

  const gradesBySY = buildGradesBySY();

  const latestSubjectAverages = buildSubjectAverages(latestGrades);
  const latestFailingSubjects = latestSubjectAverages.filter(s => s.hasFailingTerm);
  const hasFailingSubjects = latestFailingSubjects.length > 0;

  // ✅ Compute passing subjects count (for summary card)
  const latestPassingCount = latestSubjectAverages.length - latestFailingSubjects.length;

  const getReportCard = (sy) => {
    const reportGrades = grades.filter(g => g.school_year === sy);
    const enrollment = enrollments.find(e => e.school_year === sy);
    const detection = detectSystem(reportGrades);
    const subjectAverages = buildSubjectAverages(reportGrades);
    const failingSubjects = subjectAverages.filter(s => s.hasFailingTerm);

    return {
      school_year: sy,
      grade_level: enrollment?.grade_level || '',
      section: enrollment?.section_name || '',
      status: enrollment?.status || '',
      subjects: subjectAverages,
      failingSubjects,
      hasFailingSubjects: failingSubjects.length > 0,
      overallAverage: calculateAverage(reportGrades),
      isOldSystem: detection.isOldSystem,
      displayHeaders: detection.displayHeaders
    };
  };

  const getGradeColor = (grade) => {
    if (!grade) return { bg: '#f3f4f6', color: '#6b7280' };
    const num = parseFloat(grade);
    if (num >= 90) return { bg: '#d1fae5', color: '#065f46' };
    if (num >= 85) return { bg: '#dbeafe', color: '#1a56db' };
    if (num >= 75) return { bg: '#fef3c7', color: '#92400e' };
    return { bg: '#fee2e2', color: '#991b1b' };
  };

  const getRemarks = (average) => {
    const num = parseFloat(average);
    if (num >= 90) return 'Outstanding';
    if (num >= 85) return 'Very Good';
    if (num >= 80) return 'Good';
    if (num >= 75) return 'Satisfactory';
    return 'Needs Improvement';
  };

  const menuItems = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'grades', icon: '📈', label: 'My Grades' },
    { id: 'reportcard', icon: '📄', label: 'Report Card' },
    { id: 'reenrollment', icon: '🔄', label: 'Re-enrollment' },
    { id: 'remarks', icon: '💬', label: 'My Remarks' },
    { id: 'history', icon: '📚', label: 'Enrollment History' },
    { id: 'profile', icon: '👤', label: 'My Profile' }
  ];

  const renderContent = () => {
    switch (activeMenu) {
      case 'dashboard': return renderDashboard();
      case 'grades': return renderGrades();
      case 'reportcard': return renderReportCard();
      case 'reenrollment': return renderReEnrollment();
      case 'remarks': return renderRemarks();
      case 'history': return renderHistory();
      case 'profile': return renderProfile();
      default: return renderDashboard();
    }
  };

  // ============ DASHBOARD ============
  const renderDashboard = () => (
    <div>
      {/* Welcome Card */}
      <div style={{
        background: 'linear-gradient(135deg, #1a56db, #3b82f6)',
        borderRadius: '16px',
        padding: isMobile ? '20px' : '28px',
        color: 'white',
        marginBottom: '24px',
        boxShadow: '0 8px 25px rgba(26,86,219,0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '14px' : '20px', flexWrap: 'wrap' }}>
          <div style={{
            width: isMobile ? '56px' : '72px',
            height: isMobile ? '56px' : '72px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: isMobile ? '22px' : '28px', fontWeight: '700', overflow: 'hidden',
            flexShrink: 0
          }}>
            {profilePicPreview ? (
              <img src={profilePicPreview} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              student?.first_name?.charAt(0).toUpperCase() || 'S'
            )}
          </div>
          <div style={{ flex: 1, minWidth: '180px' }}>
            <h2 style={{ margin: 0, fontSize: isMobile ? '18px' : '24px', fontWeight: '700' }}>
              Welcome, {student?.first_name} {student?.last_name}!
            </h2>
            <p style={{ margin: '6px 0 0', fontSize: isMobile ? '12px' : '14px', opacity: 0.95 }}>
              🆔 {student?.student_id || 'N/A'} &nbsp;|&nbsp;
              🎓 {student?.current_grade_level || 'Not Assigned'}
              {student?.current_section && ` (${student.current_section})`}
            </p>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.2)',
            padding: '8px 16px', borderRadius: '20px',
            fontSize: '13px', fontWeight: '600'
          }}>
            {statusInfo.icon} {statusInfo.label}
          </div>
        </div>
      </div>

      {/* ✅ FAILED WARNING BANNER */}
      {hasFailingSubjects && (
        <div style={{
          background: '#fee2e2',
          border: '2px solid #dc2626',
          borderRadius: '14px',
          padding: isMobile ? '16px' : '20px 24px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: isMobile ? '12px' : '16px'
        }}>
          <div style={{ fontSize: isMobile ? '28px' : '36px', flexShrink: 0 }}>⚠️</div>
          <div style={{ flex: 1 }}>
            <h3 style={{
              margin: '0 0 6px', fontSize: isMobile ? '15px' : '17px',
              fontWeight: '700', color: '#991b1b'
            }}>
              Failed Subject Warning
            </h3>
            <p style={{
              margin: '0 0 10px', fontSize: isMobile ? '13px' : '14px',
              color: '#7f1d1d', lineHeight: '1.5'
            }}>
              Adunay kay subject(s) nga naay <strong>term below 75</strong>. Base sa promotion policy, kailangan ka <strong>mag-RETAIN</strong> sa same grade level.
            </p>
            <div style={{
              background: 'rgba(255,255,255,0.6)',
              borderRadius: '8px', padding: '10px 14px',
              fontSize: '13px', color: '#991b1b', fontWeight: '600'
            }}>
              {latestFailingSubjects.map((s, idx) => (
                <div key={idx} style={{ marginBottom: idx < latestFailingSubjects.length - 1 ? '4px' : 0 }}>
                  ❌ <strong>{s.subject}</strong> — {s.failingTerms.map(ft => `${ft.short}: ${ft.value.toFixed(2)}`).join(', ')}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Info Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: isMobile ? '12px' : '16px',
        marginBottom: '24px'
      }}>
        <div style={{
          background: 'white', padding: '20px', borderRadius: '12px',
          border: '1px solid #e5e7eb', borderTop: '4px solid #1a56db',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>Current School Year</div>
          <div style={{ fontSize: '22px', fontWeight: '700', color: '#1f2937', marginTop: '4px' }}>
            {currentEnrollment?.school_year || '—'}
          </div>
        </div>

        <div style={{
          background: 'white', padding: '20px', borderRadius: '12px',
          border: '1px solid #e5e7eb', borderTop: '4px solid #8b5cf6',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>Section</div>
          <div style={{ fontSize: '22px', fontWeight: '700', color: '#1f2937', marginTop: '4px' }}>
            {currentEnrollment?.section_name || 'Not Assigned'}
          </div>
        </div>

        <div style={{
          background: 'white', padding: '20px', borderRadius: '12px',
          border: '1px solid #e5e7eb',
          borderTop: `4px solid ${hasFailingSubjects ? '#ef4444' : (parseFloat(calculateAverage(latestGrades)) >= 75 ? '#10b981' : '#ef4444')}`,
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>General Average</div>
          <div style={{
            fontSize: '26px', fontWeight: '800', marginTop: '4px',
            color: hasFailingSubjects ? '#991b1b' : (parseFloat(calculateAverage(latestGrades)) >= 75 ? '#065f46' : '#991b1b')
          }}>
            {latestGrades.length > 0 ? calculateAverage(latestGrades) : '—'}
          </div>
          <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
            {latestGrades.length > 0
              ? (hasFailingSubjects
                  ? '⚠️ May failing term'
                  : (parseFloat(calculateAverage(latestGrades)) >= 75 ? '✅ Passing' : '⚠️ Needs Improvement'))
              : 'No grades yet'
            }
          </div>
        </div>

        <div style={{
          background: 'white', padding: '20px', borderRadius: '12px',
          border: '1px solid #e5e7eb', borderTop: '4px solid #06b6d4',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>Subjects</div>
          <div style={{ fontSize: '22px', fontWeight: '700', color: '#1f2937', marginTop: '4px' }}>
            {latestSubjectAverages.length}
          </div>
          <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
            {hasFailingSubjects
              ? `✅ ${latestPassingCount} passed • ❌ ${latestFailingSubjects.length} failed`
              : '✅ All passed'
            }
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: isMobile ? '12px' : '16px'
      }}>
        {[
          { icon: '📈', label: 'My Grades', desc: 'View all grades', action: 'grades' },
          { icon: '📄', label: 'Report Card', desc: 'Print report card', action: 'reportcard' },
          { icon: '🔄', label: 'Re-enrollment', desc: 'Apply for next grade', action: 'reenrollment' },
          { icon: '💬', label: 'My Remarks', desc: 'View remarks', action: 'remarks' },
          { icon: '📚', label: 'My History', desc: 'Enrollment history', action: 'history' },
          { icon: '🔒', label: 'Change Password', desc: 'Update password', action: 'password' }
        ].map((item, index) => (
          <div
            key={index}
            onClick={() => {
              if (item.action === 'password') setShowPasswordModal(true);
              else setActiveMenu(item.action);
            }}
            style={{
              background: 'white', padding: isMobile ? '16px 12px' : '20px', borderRadius: '12px',
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
            <div style={{ fontSize: isMobile ? '28px' : '32px' }}>{item.icon}</div>
            <div style={{ fontSize: isMobile ? '13px' : '14px', fontWeight: '600', color: '#1f2937', marginTop: '8px' }}>
              {item.label}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>{item.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );

  // ============ RE-ENROLLMENT ============
  const renderReEnrollment = () => {
    const pendingRequest = reenrollRequests.find(r => r.status === 'pending');
    const approvedRequest = reenrollRequests.find(r => r.status === 'approved');

    const isGrade6 = currentEnrollment?.grade_level === 'Grade 6';
    const gradeLevels = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];
    const currentIdx = currentEnrollment ? gradeLevels.indexOf(currentEnrollment.grade_level) : -1;

    const isRetained = hasFailingSubjects;
    const targetGrade = isRetained
      ? currentEnrollment?.grade_level
      : (currentIdx >= 0 && currentIdx < 5 ? gradeLevels[currentIdx + 1] : null);

    const canApply = currentEnrollment &&
                     (currentEnrollment.status === 'passed' || currentEnrollment.status === 'enrolled') &&
                     !pendingRequest &&
                     !isGrade6;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* ✅ RETAIN Banner */}
        {isRetained && currentEnrollment && (
          <div style={{
            background: '#fee2e2',
            border: '2px solid #dc2626',
            borderRadius: '14px',
            padding: isMobile ? '16px' : '20px 24px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: isMobile ? '12px' : '16px'
          }}>
            <div style={{ fontSize: isMobile ? '28px' : '36px', flexShrink: 0 }}>⚠️</div>
            <div style={{ flex: 1 }}>
              <h3 style={{
                margin: '0 0 6px', fontSize: isMobile ? '15px' : '17px',
                fontWeight: '700', color: '#991b1b'
              }}>
                RETENTION — Kailangan nimo mag-enroll balik sa {currentEnrollment.grade_level}
              </h3>
              <p style={{
                margin: '0 0 10px', fontSize: isMobile ? '13px' : '14px',
                color: '#7f1d1d', lineHeight: '1.5'
              }}>
                Adunay kay <strong>failing term(s)</strong> sa mosunod nga subject(s):
              </p>
              <div style={{
                background: 'rgba(255,255,255,0.6)',
                borderRadius: '8px', padding: '10px 14px',
                fontSize: '13px', color: '#991b1b', fontWeight: '600',
                marginBottom: '10px'
              }}>
                {latestFailingSubjects.map((s, idx) => (
                  <div key={idx} style={{ marginBottom: idx < latestFailingSubjects.length - 1 ? '4px' : 0 }}>
                    ❌ <strong>{s.subject}</strong> — {s.failingTerms.map(ft => `${ft.short}: ${ft.value.toFixed(2)}`).join(', ')}
                  </div>
                ))}
              </div>
              <p style={{
                margin: 0, fontSize: '13px',
                color: '#7f1d1d', lineHeight: '1.5'
              }}>
                📌 Base sa policy, mag-<strong>RETAIN</strong> ka sa <strong>{currentEnrollment.grade_level}</strong> sa sunod nga school year. Pwede nimo i-submit ang retention enrollment sa ubos.
              </p>
            </div>
          </div>
        )}

        {/* Current Enrollment Card */}
        {currentEnrollment && (
          <div style={{
            background: 'white', padding: isMobile ? '20px' : '24px', borderRadius: '14px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', marginBottom: '16px' }}>
              📋 Current Enrollment
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '16px'
            }}>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>Grade Level</div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#1f2937', marginTop: '4px' }}>
                  {currentEnrollment.grade_level}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>School Year</div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#1f2937', marginTop: '4px' }}>
                  {currentEnrollment.school_year}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>Section</div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#1f2937', marginTop: '4px' }}>
                  {currentEnrollment.section_name || '—'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>Status</div>
                <div style={{
                  fontSize: '14px', fontWeight: '700', marginTop: '4px',
                  textTransform: 'capitalize',
                  color: currentEnrollment.status === 'passed' ? '#065f46' :
                         currentEnrollment.status === 'enrolled' ? '#1a56db' :
                         currentEnrollment.status === 'failed' ? '#991b1b' : '#6b7280'
                }}>
                  {currentEnrollment.status}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pending Request Card */}
        {pendingRequest && (
          <div style={{
            background: '#fef3c7', padding: isMobile ? '20px' : '24px', borderRadius: '14px',
            border: '2px solid #f59e0b'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <span style={{ fontSize: '36px' }}>⏳</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#92400e' }}>
                  {isRetained ? 'Retention Request Pending' : 'Re-enrollment Pending'}
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#92400e' }}>
                  Naghulat pa sa approval sa registrar.
                </p>
              </div>
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.6)',
              padding: '12px 16px', borderRadius: '8px',
              fontSize: '14px', color: '#92400e',
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '8px'
            }}>
              <div><strong>Applying for:</strong> {pendingRequest.next_grade_level}</div>
              <div><strong>School Year:</strong> {pendingRequest.next_school_year}</div>
              <div><strong>Average:</strong> {pendingRequest.average_grade}</div>
              <div><strong>Submitted:</strong> {new Date(pendingRequest.created_at).toLocaleDateString()}</div>
            </div>
          </div>
        )}

        {/* Approved Request Card */}
        {approvedRequest && !pendingRequest && (
          <div style={{
            background: '#d1fae5', padding: isMobile ? '20px' : '24px', borderRadius: '14px',
            border: '2px solid #10b981'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '36px' }}>✅</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#065f46' }}>
                  {approvedRequest.current_grade_level === approvedRequest.next_grade_level
                    ? 'Retention Approved!'
                    : 'Re-enrollment Approved!'}
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#065f46' }}>
                  Enrolled na sa <strong>{approvedRequest.next_grade_level}</strong> (SY {approvedRequest.next_school_year}).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ✅ APPLY CARD — RETAIN or PROMOTE */}
        {canApply && targetGrade && (
          <div style={{
            background: isRetained
              ? 'linear-gradient(135deg, #f59e0b, #fbbf24)'
              : 'linear-gradient(135deg, #10b981, #34d399)',
            padding: isMobile ? '24px 20px' : '32px', borderRadius: '14px', color: 'white',
            textAlign: 'center',
            boxShadow: isRetained
              ? '0 8px 25px rgba(245,158,11,0.3)'
              : '0 8px 25px rgba(16,185,129,0.3)'
          }}>
            <div style={{ fontSize: isMobile ? '48px' : '64px', marginBottom: '12px' }}>
              {isRetained ? '🔁' : '🎓'}
            </div>
            <h3 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: '700', margin: '0 0 8px' }}>
              {isRetained
                ? `Retain sa ${targetGrade}`
                : `Ready for ${targetGrade}!`
              }
            </h3>
            <p style={{
              fontSize: '14px', opacity: 0.95,
              marginBottom: '24px', maxWidth: '500px',
              margin: '0 auto 24px'
            }}>
              {isRetained
                ? `Kailangan nimo mag-enroll balik sa ${targetGrade} (same grade level) kay naay failing term(s).`
                : `Mana ka na sa ${currentEnrollment.grade_level}. Pwede na ka mo-apply para sa ${targetGrade} sa sunod nga school year.`
              }
            </p>
            <button
              onClick={() => {
                setReenrollRemarks('');
                setReenrollMessage({ type: '', text: '' });
                setShowReenrollModal(true);
              }}
              style={{
                background: 'white',
                color: isRetained ? '#92400e' : '#065f46',
                border: 'none',
                padding: '14px 32px', borderRadius: '10px',
                fontSize: '16px', fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(0,0,0,0.15)'
              }}
            >
              {isRetained
                ? `🔁 Re-enroll sa ${targetGrade} (Retain)`
                : `📝 Apply for ${targetGrade}`
              }
            </button>
          </div>
        )}

        {/* Grade 6 edge case */}
        {isGrade6 && !pendingRequest && !approvedRequest && (
          <div style={{
            background: 'white', padding: isMobile ? '40px 20px' : '60px', borderRadius: '14px',
            textAlign: 'center', color: '#6b7280',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '12px' }}>
              {isRetained ? '🔁' : '🎓'}
            </div>
            <h3 style={{ color: '#1f2937', marginBottom: '8px', fontSize: '20px' }}>
              {isRetained ? 'Grade 6 — Retain' : 'Grade 6 Graduate'}
            </h3>
            <p style={{ fontSize: '14px', maxWidth: '400px', margin: '0 auto' }}>
              {isRetained
                ? 'Grade 6 ka nga naay failing term. Palihog kontaka ang registrar para sa retention process.'
                : 'Kung ma-complete nimo ang Grade 6, mag-graduate ka na. Wala nay next grade level.'
              }
            </p>
          </div>
        )}

        {/* Not eligible (edge case) */}
        {!canApply && !pendingRequest && !approvedRequest && !isGrade6 && !isRetained && (
          <div style={{
            background: 'white', padding: isMobile ? '40px 20px' : '60px', borderRadius: '14px',
            textAlign: 'center', color: '#6b7280',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '12px' }}>⏳</div>
            <h3 style={{ color: '#1f2937', marginBottom: '8px', fontSize: '20px' }}>
              Not Yet Eligible
            </h3>
            <p style={{ fontSize: '14px', maxWidth: '400px', margin: '0 auto' }}>
              Kinahanglan nimo ma-complete ang current grade una mo maka-apply for next grade.
            </p>
          </div>
        )}

        {/* Request History */}
        {reenrollRequests.length > 0 && (
          <div style={{
            background: 'white', padding: isMobile ? '20px' : '24px', borderRadius: '14px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', marginBottom: '16px' }}>
              📜 Request History ({reenrollRequests.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {reenrollRequests.map(r => {
                const isRetainRequest = r.current_grade_level === r.next_grade_level;
                return (
                  <div key={r.id} style={{
                    padding: '16px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '10px',
                    background: '#f9fafb',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <div style={{ fontSize: '15px', fontWeight: '600', color: '#1f2937' }}>
                        {r.current_grade_level} → {r.next_grade_level}
                        {isRetainRequest && (
                          <span style={{
                            marginLeft: '8px',
                            padding: '2px 8px',
                            fontSize: '10px',
                            fontWeight: '700',
                            background: '#fef3c7',
                            color: '#92400e',
                            borderRadius: '6px'
                          }}>RETAIN</span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                        SY {r.next_school_year} • Submitted {new Date(r.created_at).toLocaleDateString()}
                      </div>
                      {r.average_grade && (
                        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                          Average: <strong>{r.average_grade}</strong>
                        </div>
                      )}
                      {r.registrar_remarks && (
                        <div style={{
                          fontSize: '12px',
                          color: r.status === 'rejected' ? '#991b1b' : '#6b7280',
                          fontStyle: 'italic',
                          marginTop: '6px',
                          padding: '6px 10px',
                          background: r.status === 'rejected' ? '#fee2e2' : '#f3f4f6',
                          borderRadius: '6px'
                        }}>
                          Registrar: "{r.registrar_remarks}"
                        </div>
                      )}
                    </div>
                    <span style={{
                      padding: '6px 16px', borderRadius: '12px',
                      fontSize: '12px', fontWeight: '700',
                      textTransform: 'uppercase',
                      background: r.status === 'approved' ? '#d1fae5' :
                                  r.status === 'rejected' ? '#fee2e2' : '#fef3c7',
                      color: r.status === 'approved' ? '#065f46' :
                             r.status === 'rejected' ? '#991b1b' : '#92400e'
                    }}>{r.status}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============ GRADES ============
  const renderGrades = () => (
    <div>
      {gradesBySY.length === 0 ? (
        <div style={{
          background: 'white', padding: isMobile ? '40px 20px' : '60px', borderRadius: '14px',
          textAlign: 'center', color: '#6b7280', border: '1px solid #e5e7eb'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '8px' }}>📭</div>
          <h3 style={{ color: '#1f2937', marginBottom: '8px' }}>No Grades Yet</h3>
          <p style={{ fontSize: '14px' }}>Wala pay grades nga gi-record.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{
            background: '#fff3cd', padding: '12px 18px', borderRadius: '10px',
            border: '1px solid #ffc107', fontSize: '13px', color: '#92400e'
          }}>
            <strong>⚠️ Promotion Policy:</strong> Any term below 75 = FAILED. Kailangan mag-RETAIN sa same grade level.
          </div>

          {gradesBySY.map((group, idx) => {
            const groupHasFailing = group.subjectAverages.some(s => s.hasFailingTerm);

            return (
              <div key={idx} style={{
                background: 'white', borderRadius: '14px',
                border: groupHasFailing ? '2px solid #dc2626' : '1px solid #e5e7eb',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}>
                <div style={{
                  padding: isMobile ? '14px 16px' : '16px 24px',
                  background: groupHasFailing
                    ? 'linear-gradient(135deg, #dc2626, #ef4444)'
                    : 'linear-gradient(135deg, #1a56db, #3b82f6)',
                  color: 'white',
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', flexWrap: 'wrap', gap: '12px'
                }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: isMobile ? '16px' : '18px', fontWeight: '700' }}>
                      🎓 {group.grade_level}
                    </h3>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', opacity: 0.9 }}>
                      School Year {group.school_year}
                    </p>
                  </div>
                  <div style={{
                    background: 'rgba(255,255,255,0.2)',
                    padding: '6px 14px', borderRadius: '12px',
                    fontSize: '13px', fontWeight: '600'
                  }}>
                    Ave: {group.overallAverage}
                  </div>
                </div>

                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile ? '600px' : 'auto' }}>
                    <thead>
                      <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Subject</th>
                        {group.displayHeaders.map((h, i) => (
                          <th key={i} style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', width: '70px' }}>{h}</th>
                        ))}
                        <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', width: '100px' }}>Final Ave</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.subjectAverages.map((subj, sidx) => {
                        const gc = getGradeColor(subj.finalAve);
                        const isFail = subj.hasFailingTerm;

                        const cellValues = group.isOldSystem
                          ? [subj.q1, subj.q2, subj.q3, subj.q4]
                          : [subj.t1, subj.t2, subj.t3];

                        const termKeys = group.isOldSystem
                          ? ['1st Quarter', '2nd Quarter', '3rd Quarter', '4th Quarter']
                          : ['Term 1', 'Term 2', 'Term 3'];

                        return (
                          <tr key={sidx} style={{
                            borderBottom: '1px solid #f3f4f6',
                            background: isFail ? 'rgba(254,226,226,0.5)' : 'transparent'
                          }}>
                            <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '600', color: isFail ? '#991b1b' : '#1f2937' }}>
                              {subj.subject}
                              {isFail && (
                                <span style={{
                                  marginLeft: '6px', padding: '1px 6px',
                                  fontSize: '9px', fontWeight: '700',
                                  background: '#dc2626', color: 'white',
                                  borderRadius: '4px'
                                }}>FAILED</span>
                              )}
                            </td>
                            {cellValues.map((v, i) => {
                              const termKey = termKeys[i];
                              const termVal = subj.termMap[termKey];
                              const isFailingTerm = termVal !== undefined && termVal !== null && termVal < 75;
                              return (
                                <td
                                  key={i}
                                  style={{
                                    padding: '12px 16px',
                                    textAlign: 'center',
                                    fontSize: '13px',
                                    fontWeight: isFailingTerm ? '700' : '400',
                                    color: isFailingTerm ? '#991b1b' : '#6b7280',
                                    background: isFailingTerm ? 'rgba(220,38,38,0.15)' : 'transparent'
                                  }}
                                >
                                  {v !== null && v !== undefined ? parseFloat(v).toFixed(2) : '—'}
                                </td>
                              );
                            })}
                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                              {subj.finalAve !== null ? (
                                <span style={{
                                  padding: '4px 12px', borderRadius: '10px',
                                  fontSize: '13px', fontWeight: '700',
                                  background: gc.bg, color: gc.color
                                }}>{subj.finalAve}</span>
                              ) : '—'}
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: '13px', color: isFail ? '#991b1b' : '#6b7280', fontStyle: 'italic', fontWeight: isFail ? '600' : '400' }}>
                              {isFail ? '❌ Failed term' : (subj.remarks || '—')}
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
      )}
    </div>
  );

  // ============ REPORT CARD ============
  const renderReportCard = () => {
    const syList = [...new Set(enrollments.map(e => e.school_year))].sort((a, b) => b.localeCompare(a));

    if (syList.length === 0) {
      return (
        <div style={{
          background: 'white', padding: isMobile ? '40px 20px' : '60px', borderRadius: '14px',
          textAlign: 'center', color: '#6b7280', border: '1px solid #e5e7eb'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '8px' }}>📭</div>
          <h3 style={{ color: '#1f2937', marginBottom: '8px' }}>No Report Card Available</h3>
          <p style={{ fontSize: '14px' }}>Kinahanglan naay enrollment + grades.</p>
        </div>
      );
    }

    const reportData = getReportCard(reportCardSY || syList[0]);

    return (
      <div>
        <div style={{
          background: 'white', padding: isMobile ? '14px 16px' : '16px 20px', borderRadius: '12px',
          marginBottom: '20px', border: '1px solid #e5e7eb',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <div>
            <label style={{ marginRight: '10px', fontWeight: '600', color: '#374151', fontSize: '14px' }}>
              📅 School Year:
            </label>
            <select
              value={reportCardSY}
              onChange={(e) => setReportCardSY(e.target.value)}
              style={{
                padding: '8px 14px', borderRadius: '8px',
                border: '1px solid #d1d5db', fontSize: '14px',
                minWidth: '160px', outline: 'none'
              }}
            >
              {syList.map(sy => (
                <option key={sy} value={sy}>{sy}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => window.print()}
            style={{
              background: 'linear-gradient(135deg, #1a56db, #3b82f6)',
              color: 'white', border: 'none',
              padding: '10px 24px', borderRadius: '10px',
              fontSize: '14px', fontWeight: '600', cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(26,86,219,0.3)'
            }}
          >
            🖨️ Print Report Card
          </button>
        </div>

        {reportData.hasFailingSubjects && (
          <div style={{
            background: '#fee2e2',
            border: '2px solid #dc2626',
            borderRadius: '12px',
            padding: isMobile ? '14px 16px' : '16px 20px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '14px'
          }}>
            <div style={{ fontSize: '32px', flexShrink: 0 }}>⚠️</div>
            <div>
              <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: '700', color: '#991b1b' }}>
                Failed Subject Warning
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#7f1d1d', lineHeight: '1.5' }}>
                Ang mosunod nga subject(s) naay <strong>term below 75</strong>:
                {' '}
                <strong>
                  {reportData.failingSubjects.map(s => s.subject).join(', ')}
                </strong>
                . Kailangan mag-RETAIN sa same grade level.
              </p>
            </div>
          </div>
        )}

        <div id="report-card" style={{
          background: 'white', borderRadius: '14px',
          border: '1px solid #e5e7eb',
          padding: isMobile ? '20px 16px' : '40px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '24px', borderBottom: '2px solid #1a56db', paddingBottom: '20px' }}>
            <div style={{ fontSize: '28px', marginBottom: '4px' }}>🎓</div>
            <h1 style={{ margin: 0, fontSize: isMobile ? '18px' : '22px', fontWeight: '700', color: '#1a56db' }}>
              NCDC ELEMENTARY SCHOOL
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#6b7280' }}>
              National Children Development Center
            </p>
            <h2 style={{ margin: '12px 0 0', fontSize: isMobile ? '16px' : '18px', fontWeight: '700', color: '#1f2937' }}>
              OFFICIAL REPORT CARD
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#6b7280' }}>
              School Year {reportData.school_year}
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            marginBottom: '24px',
            background: '#f8fafc',
            padding: '16px',
            borderRadius: '8px'
          }}>
            <div style={{ gridColumn: isMobile ? '1 / -1' : 'auto' }}>
              <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>Student Name</div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#1f2937' }}>
                {student?.first_name} {student?.middle_name || ''} {student?.last_name}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>Student ID</div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#1f2937' }}>
                {student?.student_id || 'N/A'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>Grade Level</div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#1f2937' }}>
                {reportData.grade_level}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>Section</div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#1f2937' }}>
                {reportData.section || '—'}
              </div>
            </div>
          </div>

          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', marginBottom: '24px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e5e7eb', minWidth: isMobile ? '600px' : 'auto' }}>
              <thead>
                <tr style={{ background: '#1a56db', color: 'white' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '700', border: '1px solid #e5e7eb' }}>SUBJECTS</th>
                  {reportData.displayHeaders.map((h, i) => (
                    <th key={i} style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', fontWeight: '700', border: '1px solid #e5e7eb', width: '70px' }}>{h}</th>
                  ))}
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', fontWeight: '700', border: '1px solid #e5e7eb', width: '100px' }}>FINAL</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '700', border: '1px solid #e5e7eb' }}>REMARKS</th>
                </tr>
              </thead>
              <tbody>
                {reportData.subjects.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                      No grades recorded for this school year.
                    </td>
                  </tr>
                ) : (
                  reportData.subjects.map((subj, idx) => {
                    const gc = getGradeColor(subj.finalAve);
                    const isFail = subj.hasFailingTerm;

                    const cellValues = reportData.isOldSystem
                      ? [subj.q1, subj.q2, subj.q3, subj.q4]
                      : [subj.t1, subj.t2, subj.t3];

                    const termKeys = reportData.isOldSystem
                      ? ['1st Quarter', '2nd Quarter', '3rd Quarter', '4th Quarter']
                      : ['Term 1', 'Term 2', 'Term 3'];

                    return (
                      <tr key={idx} style={{
                        borderBottom: '1px solid #e5e7eb',
                        background: isFail ? 'rgba(254,226,226,0.5)' : 'transparent'
                      }}>
                        <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '600', color: isFail ? '#991b1b' : '#1f2937', border: '1px solid #e5e7eb' }}>
                          {subj.subject}
                          {isFail && (
                            <span style={{
                              marginLeft: '6px', padding: '1px 6px',
                              fontSize: '9px', fontWeight: '700',
                              background: '#dc2626', color: 'white',
                              borderRadius: '4px'
                            }}>FAILED</span>
                          )}
                        </td>
                        {cellValues.map((v, i) => {
                          const termKey = termKeys[i];
                          const termVal = subj.termMap[termKey];
                          const isFailingTerm = termVal !== undefined && termVal !== null && termVal < 75;
                          return (
                            <td
                              key={i}
                              style={{
                                padding: '12px 16px',
                                textAlign: 'center',
                                fontSize: '14px',
                                border: '1px solid #e5e7eb',
                                fontWeight: isFailingTerm ? '700' : '400',
                                color: isFailingTerm ? '#991b1b' : '#374151',
                                background: isFailingTerm ? 'rgba(220,38,38,0.15)' : 'transparent'
                              }}
                            >
                              {v !== null && v !== undefined ? parseFloat(v).toFixed(2) : '—'}
                            </td>
                          );
                        })}
                        <td style={{ padding: '12px 16px', textAlign: 'center', border: '1px solid #e5e7eb' }}>
                          {subj.finalAve !== null ? (
                            <span style={{
                              padding: '4px 12px', borderRadius: '8px',
                              fontSize: '14px', fontWeight: '700',
                              background: gc.bg, color: gc.color
                            }}>{subj.finalAve}</span>
                          ) : '—'}
                        </td>
                        <td style={{
                          padding: '12px 16px',
                          fontSize: '13px',
                          fontStyle: 'italic',
                          border: '1px solid #e5e7eb',
                          color: isFail ? '#991b1b' : '#6b7280',
                          fontWeight: isFail ? '600' : '400'
                        }}>
                          {subj.finalAve ? (isFail ? '❌ Failed' : getRemarks(subj.finalAve)) : '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {reportData.subjects.length > 0 && (
            <div style={{
              background: reportData.hasFailingSubjects
                ? 'linear-gradient(135deg, #fee2e2, #fecaca)'
                : 'linear-gradient(135deg, #f0f4ff, #e0e7ff)',
              padding: isMobile ? '16px' : '20px',
              borderRadius: '10px',
              marginBottom: '24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div>
                <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>GENERAL AVERAGE</div>
                <div style={{
                  fontSize: isMobile ? '26px' : '32px', fontWeight: '800',
                  color: reportData.hasFailingSubjects
                    ? '#991b1b'
                    : (parseFloat(reportData.overallAverage) >= 75 ? '#065f46' : '#991b1b')
                }}>
                  {reportData.overallAverage}
                </div>
              </div>
              <div style={{ textAlign: isMobile ? 'left' : 'right' }}>
                <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>REMARKS</div>
                <div style={{
                  fontSize: isMobile ? '16px' : '18px', fontWeight: '700',
                  color: reportData.hasFailingSubjects
                    ? '#991b1b'
                    : (parseFloat(reportData.overallAverage) >= 75 ? '#065f46' : '#991b1b')
                }}>
                  {reportData.hasFailingSubjects
                    ? 'FAILED — RETAIN'
                    : (parseFloat(reportData.overallAverage) >= 75 ? 'PASSED' : 'FAILED')}
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
                  {reportData.hasFailingSubjects
                    ? 'May term below 75'
                    : getRemarks(reportData.overallAverage)}
                </div>
              </div>
            </div>
          )}

          {reportData.hasFailingSubjects && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fca5a5',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '24px',
              fontSize: '12px',
              color: '#991b1b',
              fontWeight: '600'
            }}>
              📌 <strong>Policy Note:</strong> Students with ANY term below 75 must RETAIN in the same grade level. Remedial classes required before promotion.
            </div>
          )}

          <div style={{
            marginTop: '40px',
            paddingTop: '20px',
            borderTop: '1px solid #e5e7eb',
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: isMobile ? '24px' : '40px'
          }}>
            <div>
              <div style={{ borderBottom: '1px solid #1f2937', paddingBottom: '4px', marginBottom: '4px' }}></div>
              <div style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center' }}>Class Adviser</div>
            </div>
            <div>
              <div style={{ borderBottom: '1px solid #1f2937', paddingBottom: '4px', marginBottom: '4px' }}></div>
              <div style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center' }}>Principal / Registrar</div>
            </div>
          </div>

          <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '11px', color: '#9ca3af' }}>
            This is a computer-generated document. No signature required.
          </div>
        </div>
      </div>
    );
  };

  // ============ REMARKS ============
  const renderRemarks = () => (
    <div style={{
      background: 'white', borderRadius: '12px',
      border: '1px solid #e5e7eb', padding: isMobile ? '16px' : '24px'
    }}>
      <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', marginBottom: '20px' }}>
        💬 My Remarks ({remarks.length})
      </h3>

      {remarks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: isMobile ? '40px 20px' : '60px', color: '#6b7280' }}>
          <div style={{ fontSize: '48px', marginBottom: '8px' }}>💭</div>
          <h3 style={{ color: '#1f2937', marginBottom: '8px' }}>No Remarks Yet</h3>
          <p style={{ fontSize: '14px' }}>Wala pay remarks nga gi-record sa imong teacher.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {remarks.map((r, idx) => (
            <div key={r.id || idx} style={{
              padding: isMobile ? '14px 16px' : '16px 20px', borderRadius: '12px',
              border: '1px solid #e5e7eb', background: '#f9fafb'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                <span style={{
                  padding: '3px 12px', borderRadius: '12px',
                  fontSize: '11px', fontWeight: '600',
                  background: '#dbeafe', color: '#1a56db',
                  textTransform: 'uppercase'
                }}>{r.remark_type || 'general'}</span>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>
                  by {r.created_by_role || 'system'}
                </span>
                <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                  • {new Date(r.created_at).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric'
                  })}
                </span>
              </div>
              <p style={{ margin: 0, color: '#1f2937', fontSize: '14px', lineHeight: '1.6' }}>
                {r.remark}
              </p>
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
      border: '1px solid #e5e7eb', padding: isMobile ? '16px' : '24px'
    }}>
      <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', marginBottom: '20px' }}>
        📚 My Enrollment History ({enrollments.length})
      </h3>

      {enrollments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: isMobile ? '40px 20px' : '60px', color: '#6b7280' }}>
          <div style={{ fontSize: '48px', marginBottom: '8px' }}>📭</div>
          <h3 style={{ color: '#1f2937', marginBottom: '8px' }}>No Enrollment Records</h3>
          <p style={{ fontSize: '14px' }}>Wala pay enrollment records.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {enrollments.map((e, idx) => (
            <div key={e.id || idx} style={{
              padding: isMobile ? '14px 16px' : '16px 20px', borderRadius: '12px',
              border: '1px solid #e5e7eb', borderLeft: '4px solid #1a56db',
              background: '#f9fafb'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h4 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: '700', color: '#1f2937' }}>
                    {e.grade_level} {e.section_name ? `- ${e.section_name}` : ''}
                  </h4>
                  <div style={{ fontSize: '13px', color: '#6b7280' }}>
                    📅 {e.school_year}
                  </div>
                </div>
                <span style={{
                  padding: '4px 14px', borderRadius: '12px',
                  fontSize: '12px', fontWeight: '600',
                  background: e.status === 'passed' ? '#d1fae5' :
                              e.status === 'failed' ? '#fee2e2' :
                              e.status === 'graduated' ? '#ddd6fe' :
                              e.status === 'enrolled' ? '#dbeafe' : '#f3f4f6',
                  color: e.status === 'passed' ? '#065f46' :
                         e.status === 'failed' ? '#991b1b' :
                         e.status === 'graduated' ? '#6d28d9' :
                         e.status === 'enrolled' ? '#1a56db' : '#6b7280'
                }}>{e.status}</span>
              </div>
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
        border: '1px solid #e5e7eb', padding: isMobile ? '20px 16px' : '32px'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'stretch' : 'center',
          gap: isMobile ? '12px' : 0,
          marginBottom: '20px',
          borderBottom: '1px solid #e5e7eb',
          paddingBottom: '12px'
        }}>
          <h2 style={{ fontSize: '20px', color: '#1f2937', margin: 0 }}>
            👤 My Profile
          </h2>
          {!editMode ? (
            <button
              onClick={handleEditClick}
              style={{
                background: '#1a56db', color: 'white', border: 'none',
                padding: '8px 20px', borderRadius: '8px',
                cursor: 'pointer', fontSize: '14px', fontWeight: '500'
              }}
            >✏️ Edit Profile</button>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleCancelEdit}
                style={{
                  flex: isMobile ? 1 : 'none',
                  background: '#6b7280', color: 'white', border: 'none',
                  padding: '8px 20px', borderRadius: '8px',
                  cursor: 'pointer', fontSize: '14px', fontWeight: '500'
                }}
              >Cancel</button>
              <button
                onClick={handleSaveProfile}
                disabled={editLoading}
                style={{
                  flex: isMobile ? 1 : 'none',
                  background: editLoading ? '#93c5fd' : '#10b981', color: 'white',
                  border: 'none', padding: '8px 20px', borderRadius: '8px',
                  cursor: editLoading ? 'not-allowed' : 'pointer',
                  fontSize: '14px', fontWeight: '500'
                }}
              >{editLoading ? 'Saving...' : '💾 Save'}</button>
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
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>Student ID</p>
              <p style={{ fontSize: '16px', fontWeight: '500', color: '#1f2937', margin: '4px 0' }}>
                {student.student_id || 'N/A'}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>Full Name</p>
              <p style={{ fontSize: '16px', fontWeight: '500', color: '#1f2937', margin: '4px 0' }}>
                {student.first_name} {student.middle_name || ''} {student.last_name}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>Email</p>
              <p style={{ fontSize: '16px', fontWeight: '500', color: '#1f2937', margin: '4px 0', wordBreak: 'break-word' }}>{student.email}</p>
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
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '13px', color: '#374151', fontWeight: '500' }}>First Name <small style={{ color: '#9ca3af', fontWeight: '400' }}>(max 20)</small></label>
              <input type="text" name="first_name" value={editData.first_name} onChange={handleEditChange} maxLength={20}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', marginTop: '4px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '13px', color: '#374151', fontWeight: '500' }}>Middle Name <small style={{ color: '#9ca3af', fontWeight: '400' }}>(max 20)</small></label>
              <input type="text" name="middle_name" value={editData.middle_name} onChange={handleEditChange} maxLength={20}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', marginTop: '4px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '13px', color: '#374151', fontWeight: '500' }}>Last Name <small style={{ color: '#9ca3af', fontWeight: '400' }}>(max 20)</small></label>
              <input type="text" name="last_name" value={editData.last_name} onChange={handleEditChange} maxLength={20}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', marginTop: '4px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '13px', color: '#374151', fontWeight: '500' }}>Contact Number <small style={{ color: '#9ca3af', fontWeight: '400' }}>(max 15)</small></label>
              <input type="text" name="contact_number" value={editData.contact_number} onChange={handleEditChange} maxLength={15}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', marginTop: '4px', boxSizing: 'border-box' }} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '13px', color: '#374151', fontWeight: '500' }}>Address <small style={{ color: '#9ca3af', fontWeight: '400' }}>(max 50)</small></label>
              <textarea name="address" value={editData.address} onChange={handleEditChange} maxLength={50} rows="2"
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
      {/* ✅ MOBILE TOP BAR */}
      {isMobile && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0,
          height: '60px',
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          zIndex: 100,
          boxShadow: '0 2px 12px rgba(0,0,0,0.04)'
        }}>
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#1f2937',
              padding: '8px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px'
            }}
          >
            ☰
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              background: 'linear-gradient(135deg, #1a56db, #3b82f6)',
              width: '32px', height: '32px', borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '16px'
            }}>🎓</div>
            <span style={{ fontSize: '16px', fontWeight: '800', color: '#1f2937' }}>NCDC</span>
          </div>

          <div style={{
            width: '36px', height: '36px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#1a56db', fontSize: '14px', fontWeight: 'bold',
            overflow: 'hidden', flexShrink: 0,
            border: '2px solid white',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            {profilePicPreview ? (
              <img src={profilePicPreview} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              student?.first_name?.charAt(0).toUpperCase() || 'S'
            )}
          </div>
        </div>
      )}

      {/* ✅ MOBILE BACKDROP */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 90,
            transition: 'opacity 0.3s ease'
          }}
        />
      )}

      {/* SIDEBAR */}
      <div style={{
        width: '280px',
        minHeight: '100vh',
        height: '100vh',
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(255,255,255,0.2)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        left: 0,
        overflow: 'hidden',
        flexShrink: 0,
        zIndex: isMobile ? 95 : 50,
        boxShadow: '4px 0 30px rgba(0,0,0,0.06)',
        transform: isMobile
          ? (sidebarOpen ? 'translateX(0)' : 'translateX(-100%)')
          : 'translateX(0)',
        transition: 'transform 0.3s ease'
      }}>
        <div style={{ padding: '24px 24px 20px', borderBottom: '1px solid rgba(255,255,255,0.2)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(false)}
                aria-label="Close menu"
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#9ca3af',
                  padding: '4px',
                  lineHeight: 1
                }}
              >
                ×
              </button>
            )}
          </div>
        </div>

        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.2)',
          display: 'flex', alignItems: 'center', gap: '14px',
          flexShrink: 0
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
              fontWeight: '500', cursor: 'pointer', fontSize: '14px',
              transition: 'all 0.3s ease'
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
        flex: 1,
        marginLeft: isMobile ? 0 : '280px',
        padding: isMobile ? '76px 16px 24px' : '32px 36px',
        minHeight: '100vh',
        overflowY: 'auto',
        width: isMobile ? '100%' : 'auto',
        boxSizing: 'border-box'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'flex-start' : 'center',
          gap: isMobile ? '12px' : 0,
          marginBottom: '24px'
        }}>
          <div>
            <h1 style={{ fontSize: isMobile ? '20px' : '24px', color: '#1f2937', margin: 0, fontWeight: '700' }}>
              {activeMenu === 'dashboard' && '📊 Dashboard'}
              {activeMenu === 'grades' && '📈 My Grades'}
              {activeMenu === 'reportcard' && '📄 Report Card'}
              {activeMenu === 'reenrollment' && '🔄 Re-enrollment'}
              {activeMenu === 'remarks' && '💬 My Remarks'}
              {activeMenu === 'history' && '📚 Enrollment History'}
              {activeMenu === 'profile' && '👤 My Profile'}
            </h1>
            <p style={{ color: '#6b7280', margin: '4px 0 0', fontSize: isMobile ? '13px' : '14px' }}>
              {activeMenu === 'dashboard' && `Welcome back, ${student?.first_name || 'Student'}!`}
              {activeMenu === 'grades' && 'View all your grades per school year.'}
              {activeMenu === 'reportcard' && 'View and print your official report card.'}
              {activeMenu === 'reenrollment' && (hasFailingSubjects ? 'Retain sa same grade level.' : 'Apply for next grade level.')}
              {activeMenu === 'remarks' && 'Remarks from your teacher.'}
              {activeMenu === 'history' && 'Your enrollment records.'}
              {activeMenu === 'profile' && 'View and manage your personal information.'}
            </p>
          </div>
          <div style={{
            background: hasFailingSubjects ? '#fee2e2' : '#dbeafe',
            padding: '8px 16px',
            borderRadius: '20px', fontSize: '13px',
            color: hasFailingSubjects ? '#991b1b' : '#1a56db',
            fontWeight: '500',
            alignSelf: isMobile ? 'flex-start' : 'auto'
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

      {/* RE-ENROLLMENT MODAL */}
      {showReenrollModal && currentEnrollment && (
        <div
          onClick={() => !reenrollSubmitting && setShowReenrollModal(false)}
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
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 60px rgba(0,0,0,0.3)'
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: isMobile ? '44px' : '56px', marginBottom: '8px' }}>
                {hasFailingSubjects ? '🔁' : '🎓'}
              </div>
              <h2 style={{ fontSize: isMobile ? '18px' : '22px', color: '#1f2937', margin: '0 0 8px' }}>
                {hasFailingSubjects ? 'Retention Application' : 'Re-enrollment Application'}
              </h2>
              <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
                {hasFailingSubjects ? 'Retain sa same grade level' : 'Apply for the next grade level'}
              </p>
            </div>

            <div style={{
              background: hasFailingSubjects ? '#fef3c7' : '#f0f4ff',
              padding: '16px', borderRadius: '12px',
              marginBottom: '16px',
              display: 'flex', flexDirection: 'column', gap: '8px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: '#6b7280' }}>Current:</span>
                <strong style={{ color: '#1f2937' }}>{currentEnrollment.grade_level}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: '#6b7280' }}>Target:</span>
                <strong style={{ color: hasFailingSubjects ? '#92400e' : '#1a56db' }}>
                  {hasFailingSubjects
                    ? currentEnrollment.grade_level
                    : (() => {
                        const levels = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];
                        const idx = levels.indexOf(currentEnrollment.grade_level);
                        return idx >= 0 && idx < 5 ? levels[idx + 1] : '—';
                      })()
                  }
                  {hasFailingSubjects && ' (Retain)'}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: '#6b7280' }}>School Year:</span>
                <strong style={{ color: '#1f2937' }}>
                  {(() => {
                    const parts = currentEnrollment.school_year.split('-');
                    return parts.length === 2
                      ? `${parseInt(parts[0]) + 1}-${parseInt(parts[1]) + 1}`
                      : currentEnrollment.school_year;
                  })()}
                </strong>
              </div>
            </div>

            {hasFailingSubjects && (
              <div style={{
                background: '#fee2e2',
                border: '1px solid #fca5a5',
                borderRadius: '8px',
                padding: '10px 14px',
                marginBottom: '16px',
                fontSize: '12px',
                color: '#991b1b',
                fontWeight: '600'
              }}>
                ⚠️ Naa kay failing term(s): {latestFailingSubjects.map(s => s.subject).join(', ')}. Retention request ni.
              </div>
            )}

            {reenrollMessage.text && (
              <div style={{
                padding: '12px 16px', borderRadius: '8px', marginBottom: '16px',
                background: reenrollMessage.type === 'success' ? '#d1fae5' : '#fee2e2',
                color: reenrollMessage.type === 'success' ? '#065f46' : '#991b1b'
              }}>{reenrollMessage.text}</div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block', fontSize: '13px', fontWeight: '600',
                color: '#374151', marginBottom: '6px'
              }}>
                Reason / Remarks (Optional)
              </label>
              <textarea
                value={reenrollRemarks}
                onChange={(e) => setReenrollRemarks(e.target.value)}
                placeholder={hasFailingSubjects
                  ? "e.g., Gusto mag-retain kay naay bagsak..."
                  : "e.g., Ready for next grade, Complete requirements..."}
                rows={3}
                disabled={reenrollSubmitting}
                style={{
                  width: '100%', padding: '10px 14px',
                  border: '1px solid #d1d5db', borderRadius: '8px',
                  fontSize: '14px', outline: 'none',
                  resize: 'vertical', boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', flexDirection: isMobile ? 'column' : 'row' }}>
              <button
                onClick={() => setShowReenrollModal(false)}
                disabled={reenrollSubmitting}
                style={{
                  flex: 1, padding: '12px', background: '#f3f4f6',
                  color: '#6b7280', border: '1px solid #d1d5db',
                  borderRadius: '10px', fontWeight: '600',
                  cursor: reenrollSubmitting ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >Cancel</button>
              <button
                onClick={handleSubmitReenroll}
                disabled={reenrollSubmitting}
                style={{
                  flex: 1, padding: '12px',
                  background: reenrollSubmitting
                    ? '#93c5fd'
                    : (hasFailingSubjects
                        ? 'linear-gradient(135deg, #f59e0b, #fbbf24)'
                        : 'linear-gradient(135deg, #10b981, #34d399)'),
                  color: 'white', border: 'none', borderRadius: '10px',
                  fontWeight: '600', cursor: reenrollSubmitting ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                {reenrollSubmitting
                  ? 'Submitting...'
                  : (hasFailingSubjects ? '🔁 Submit Retention' : '📝 Submit Application')
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHANGE PASSWORD MODAL */}
      {showPasswordModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: isMobile ? '12px' : '20px'
        }}>
          <div style={{
            background: 'white', borderRadius: '16px',
            maxWidth: '450px', width: '100%',
            padding: isMobile ? '24px 20px' : '32px',
            maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 25px 60px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', color: '#1f2937', margin: 0 }}>🔒 Change Password</h2>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordMessage('');
                  setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                }}
                style={{
                  background: 'transparent', border: 'none',
                  fontSize: '24px', cursor: 'pointer', color: '#9ca3af'
                }}>×</button>
            </div>

            {passwordMessage && (
              <div style={{
                padding: '10px 14px', borderRadius: '8px', marginBottom: '16px',
                background: passwordMessage.type === 'success' ? '#d1fae5' : '#fee2e2',
                color: passwordMessage.type === 'success' ? '#065f46' : '#991b1b'
              }}>{passwordMessage.text}</div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
                Current Password
              </label>
              <input type="password" name="currentPassword" value={passwordData.currentPassword}
                onChange={handlePasswordChange} placeholder="Enter current password"
                style={{
                  width: '100%', padding: '10px 14px', border: '1px solid #d1d5db',
                  borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box'
                }} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
                New Password
              </label>
              <input type="password" name="newPassword" value={passwordData.newPassword}
                onChange={handlePasswordChange} placeholder="New password (min 6 chars)"
                style={{
                  width: '100%', padding: '10px 14px', border: '1px solid #d1d5db',
                  borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box'
                }} />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
                Confirm New Password
              </label>
              <input type="password" name="confirmPassword" value={passwordData.confirmPassword}
                onChange={handlePasswordChange} placeholder="Confirm new password"
                style={{
                  width: '100%', padding: '10px 14px', border: '1px solid #d1d5db',
                  borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box'
                }} />
            </div>

            <div style={{ display: 'flex', gap: '12px', flexDirection: isMobile ? 'column' : 'row' }}>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordMessage('');
                  setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                }}
                style={{
                  flex: 1, background: '#6b7280', color: 'white', border: 'none',
                  padding: '12px', borderRadius: '8px', cursor: 'pointer',
                  fontSize: '14px', fontWeight: '600'
                }}>Cancel</button>
              <button onClick={handleSubmitPassword} disabled={passwordLoading}
                style={{
                  flex: 1, background: passwordLoading ? '#93c5fd' : 'linear-gradient(135deg, #1a56db, #3b82f6)',
                  color: 'white', border: 'none', padding: '12px',
                  borderRadius: '8px', cursor: passwordLoading ? 'not-allowed' : 'pointer',
                  fontSize: '14px', fontWeight: '600'
                }}>{passwordLoading ? 'Saving...' : '✅ Update Password'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Print CSS */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #report-card, #report-card * {
            visibility: visible;
          }
          #report-card {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default StudentDashboard;