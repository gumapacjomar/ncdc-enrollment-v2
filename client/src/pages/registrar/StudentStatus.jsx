import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../../services/api';
import UPLOADS_URL from '../../services/uploads';

const StudentStatus = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [promotionList, setPromotionList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSY, setFilterSY] = useState('');
  const [filterGrade, setFilterGrade] = useState('all');
  const [availableSYs, setAvailableSYs] = useState([]);
  const [activeTab, setActiveTab] = useState('passed'); // 'passed' | 'retained' | 'failed'
  const [profilePic, setProfilePic] = useState(null);

  const user = JSON.parse(localStorage.getItem('user'));
  const gradeLevels = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];

  useEffect(() => {
    if (!user || user.role !== 'registrar') {
      navigate('/login');
      return;
    }
    fetchProfile();
    fetchData();
    // eslint-disable-next-line
  }, [navigate]);

  const fetchProfile = async () => {
    try {
      const response = await API.get(`/registrar/profile/${user.id}`);
      if (response.data.profile_pic) {
        setProfilePic(`${UPLOADS_URL}/profiles/${response.data.profile_pic}`);
      }
    } catch (error) {
      console.error('Error fetching profile pic:', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await API.get('/admin/reports/promotion-list');
      const data = Array.isArray(res.data) ? res.data : [];
      setPromotionList(data);

      // Collect available SYs (sorted descending)
      const sySet = new Set();
      data.forEach(item => {
        if (item.school_year) sySet.add(item.school_year);
      });
      const syList = Array.from(sySet).sort((a, b) => b.localeCompare(a));
      setAvailableSYs(syList);

      // Default: latest SY
      if (syList.length > 0 && !filterSY) {
        setFilterSY(syList[0]);
      }
    } catch (error) {
      console.error('Error fetching student status:', error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Classify students: PASSED / RETAINED / FAILED (mutually exclusive)
  // Priority: FAILED > RETAINED > PASSED
  const classifyStudent = (student) => {
    const hasFailing = student.promotion_status === 'FAILED';
    const isRetained = student.is_retained === 'YES';

    if (hasFailing) return 'failed';
    if (isRetained) return 'retained';
    return 'passed';
  };

  const filtered = promotionList
    .filter(item => {
      if (filterSY && item.school_year !== filterSY) return false;
      if (filterGrade !== 'all' && item.enrollment_grade !== filterGrade) return false;
      if (searchTerm.trim()) {
        const search = searchTerm.toLowerCase();
        const name = `${item.first_name || ''} ${item.middle_name || ''} ${item.last_name || ''}`.toLowerCase();
        const publicId = (item.public_id || '').toLowerCase();
        if (!name.includes(search) && !publicId.includes(search)) return false;
      }
      return true;
    })
    .map(item => ({
      ...item,
      _status: classifyStudent(item)
    }));

  const passedList = filtered.filter(s => s._status === 'passed');
  const retainedList = filtered.filter(s => s._status === 'retained');
  const failedList = filtered.filter(s => s._status === 'failed');

  const currentList =
    activeTab === 'passed' ? passedList :
    activeTab === 'retained' ? retainedList :
    failedList;

  const tabs = [
    { id: 'passed', label: '✅ PASSED', count: passedList.length, color: '#10b981', bg: '#d1fae5' },
    { id: 'retained', label: '🔁 RETAINED', count: retainedList.length, color: '#d97706', bg: '#fef3c7' },
    { id: 'failed', label: '❌ FAILED', count: failedList.length, color: '#dc2626', bg: '#fee2e2' }
  ];

  const currentTab = tabs.find(t => t.id === activeTab) || tabs[0];

  const getGradeColor = (grade) => {
    if (!grade) return '#9ca3af';
    const num = parseFloat(grade);
    if (num >= 90) return '#065f46';
    if (num >= 85) return '#1a56db';
    if (num >= 75) return '#92400e';
    return '#991b1b';
  };

  const exportToCSV = () => {
    if (currentList.length === 0) {
      alert('Walay data sa current tab.');
      return;
    }

    const headers = ['Student ID', 'Name', 'Grade Level', 'School Year', 'Average', 'Lowest', 'Status'];
    const rows = currentList.map(s => [
      s.public_id || '—',
      `${s.first_name} ${s.middle_name || ''} ${s.last_name}`.trim(),
      s.enrollment_grade || '—',
      s.school_year || '—',
      s.average_grade ? parseFloat(s.average_grade).toFixed(2) : '—',
      s.lowest_grade ? parseFloat(s.lowest_grade).toFixed(2) : '—',
      s._status.toUpperCase()
    ]);

    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
      csv += row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `student-status-${activeTab}-SY${filterSY}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const menuItems = [
    { id: 'applications', icon: '📋', label: 'Applications', type: 'internal', path: '/registrar/dashboard' },
    { id: 'enrolled', icon: '🎓', label: 'Enrolled Students', type: 'internal', path: '/registrar/dashboard' },
    { id: 'sections', icon: '🏫', label: 'Sections', type: 'link', path: '/registrar/sections' },
    { id: 'subjects', icon: '📚', label: 'Subjects', type: 'link', path: '/registrar/subjects' },
    { id: 'enrollments', icon: '📝', label: 'Enrollments', type: 'link', path: '/registrar/enrollments' },
    { id: 'reenrollment', icon: '🔄', label: 'Re-enrollment', type: 'link', path: '/registrar/re-enrollment-requests' },
    { id: 'student-status', icon: '🎯', label: 'Student Status', type: 'link', path: '/registrar/student-status' },
    { id: 'grades', icon: '📊', label: 'Grades', type: 'link', path: '/registrar/grades' },
    { id: 'remarks', icon: '💬', label: 'Remarks', type: 'link', path: '/registrar/remarks' },
    { id: 'honor-students', icon: '🏆', label: 'Honor Students', type: 'link', path: '/registrar/honor-students' },
    { id: 'student-history', icon: '📚', label: 'Student History', type: 'link', path: '/registrar/student-history' }
  ];

  const currentPath = window.location.pathname;
  const isActive = (path) => currentPath === path;

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
              <span style={{ fontSize: '10px', color: '#6b7280', fontWeight: '500' }}>Teacher Panel</span>
            </div>
          </div>
        </div>

        <Link to="/registrar/profile" style={{
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
              user?.username?.charAt(0).toUpperCase() || 'T'
            )}
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: '600', color: '#1f2937' }}>
              {user?.username || 'Teacher'}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Teacher / Staff</div>
          </div>
        </Link>

        <div style={{ padding: '16px 12px', flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          {menuItems.map((item) => (
            <Link key={item.id} to={item.path} style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              width: '100%', padding: '12px 16px', borderRadius: '12px',
              textDecoration: 'none',
              background: isActive(item.path) ? 'rgba(59,130,246,0.08)' : 'transparent',
              color: isActive(item.path) ? '#1a56db' : '#6b7280',
              fontWeight: isActive(item.path) ? '600' : '500',
              fontSize: '14px', transition: 'all 0.3s ease',
              marginBottom: '4px', position: 'relative', boxSizing: 'border-box'
            }}>
              {isActive(item.path) && (
                <span style={{
                  position: 'absolute', left: '0', top: '50%',
                  transform: 'translateY(-50%)', width: '3px', height: '24px',
                  background: 'linear-gradient(180deg, #1a56db, #3b82f6)',
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
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', color: '#1f2937', margin: 0, fontWeight: '800', letterSpacing: '-0.5px' }}>
            🎯 Student Status
          </h1>
          <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '15px' }}>
            View students by promotion status — PASSED, RETAINED, or FAILED per school year
          </p>
        </div>

        {/* Summary Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px', marginBottom: '24px'
        }}>
          {tabs.map(tab => (
            <div
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: 'white',
                padding: '20px',
                borderRadius: '12px',
                borderTop: `4px solid ${tab.color}`,
                boxShadow: activeTab === tab.id
                  ? `0 8px 20px ${tab.color}40`
                  : '0 2px 8px rgba(0,0,0,0.04)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                transform: activeTab === tab.id ? 'translateY(-4px)' : 'translateY(0)',
                border: activeTab === tab.id ? `2px solid ${tab.color}` : '2px solid transparent'
              }}
            >
              <div style={{
                fontSize: '32px', fontWeight: '800', color: tab.color
              }}>
                {tab.count}
              </div>
              <div style={{
                fontSize: '13px', color: '#6b7280', fontWeight: '600', marginTop: '4px'
              }}>
                {tab.label}
              </div>
            </div>
          ))}
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
              placeholder="🔍 Search by name or NCDC ID..."
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
              📅 SY:
            </label>
            <select
              value={filterSY}
              onChange={(e) => setFilterSY(e.target.value)}
              style={{
                padding: '10px 14px', borderRadius: '8px',
                border: '1px solid #e5e7eb', fontSize: '14px',
                outline: 'none', fontWeight: '600',
                color: '#1f2937', background: '#f9fafb', cursor: 'pointer'
              }}
            >
              {availableSYs.map(sy => (
                <option key={sy} value={sy}>{sy}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ marginRight: '8px', fontSize: '13px', color: '#6b7280', fontWeight: '600' }}>
              🎓 Grade:
            </label>
            <select
              value={filterGrade}
              onChange={(e) => setFilterGrade(e.target.value)}
              style={{
                padding: '10px 14px', borderRadius: '8px',
                border: '1px solid #e5e7eb', fontSize: '14px',
                outline: 'none', fontWeight: '600',
                color: '#1f2937', background: '#f9fafb', cursor: 'pointer'
              }}
            >
              <option value="all">All Grades</option>
              {gradeLevels.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <button
            onClick={exportToCSV}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: '#10b981',
              color: 'white',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(16,185,129,0.3)'
            }}
          >
            📥 Export CSV
          </button>
        </div>

        {/* Table */}
        <div style={{
          background: 'white', padding: '24px', borderRadius: '14px',
          border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: '16px'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: currentTab.color, margin: 0 }}>
              {currentTab.label} ({currentList.length})
            </h3>
            <span style={{ fontSize: '13px', color: '#6b7280' }}>
              {currentList.length} {currentList.length === 1 ? 'student' : 'students'}
            </span>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
              ⏳ Loading student status...
            </div>
          ) : currentList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
              <div style={{ fontSize: '48px', marginBottom: '8px' }}>
                {activeTab === 'passed' ? '🎉' : activeTab === 'retained' ? '🔁' : '✅'}
              </div>
              <h3 style={{ color: '#1f2937', marginBottom: '8px' }}>
                No {currentTab.label} Students
              </h3>
              <p>Walay students nga {activeTab} sa SY {filterSY || 'selected'}.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb', background: '#f9fafb' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>#</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Student ID</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Name</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Grade Level</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>School Year</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Average</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Lowest</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {currentList.map((student, idx) => (
                    <tr key={`${student.student_id}-${student.enrollment_id || idx}`} style={{
                      borderBottom: '1px solid #f3f4f6',
                      background: activeTab === 'failed'
                        ? 'rgba(254,226,226,0.3)'
                        : activeTab === 'retained'
                          ? 'rgba(254,243,199,0.3)'
                          : 'transparent'
                    }}>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>{idx + 1}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '700', color: '#1a56db' }}>
                        {student.public_id || '—'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', color: '#1f2937', fontWeight: '600' }}>
                        {student.first_name} {student.middle_name || ''} {student.last_name}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151', fontWeight: '600' }}>
                        {student.enrollment_grade || student.current_grade_level || '—'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', color: '#6b7280', fontWeight: '600' }}>
                        {student.school_year || '—'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 12px', borderRadius: '10px',
                          fontSize: '13px', fontWeight: '700',
                          background: '#f3f4f6',
                          color: getGradeColor(student.average_grade)
                        }}>
                          {student.average_grade ? parseFloat(student.average_grade).toFixed(2) : '—'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 12px', borderRadius: '10px',
                          fontSize: '13px', fontWeight: '700',
                          background: student.lowest_grade && parseFloat(student.lowest_grade) < 75
                            ? '#fee2e2'
                            : '#d1fae5',
                          color: student.lowest_grade && parseFloat(student.lowest_grade) < 75
                            ? '#991b1b'
                            : '#065f46'
                        }}>
                          {student.lowest_grade ? parseFloat(student.lowest_grade).toFixed(2) : '—'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <Link
                          to={`/registrar/student-history?studentId=${student.student_id}`}
                          style={{
                            background: '#dbeafe', color: '#1a56db',
                            textDecoration: 'none', padding: '6px 14px',
                            borderRadius: '6px', fontSize: '12px', fontWeight: '600',
                            display: 'inline-block'
                          }}
                        >
                          👁️ View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info Note */}
        <div style={{
          marginTop: '24px',
          background: '#e0e7ff',
          border: '1px solid #818cf8',
          borderRadius: '12px',
          padding: '16px 20px',
          fontSize: '13px',
          color: '#3730a3',
          lineHeight: '1.6'
        }}>
        <strong>✅ PASSED</strong> — Walay failing term (&lt; 75) sa SY. Ready for promotion.<br />
        <strong>🔁 RETAINED</strong> — Na-retain from previous SY (same grade level).<br />
        <strong>❌ FAILED</strong> — Naay failing term (&lt; 75) sa SY. Kinahanglan i-retain.
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
    </div>
  );
};

export default StudentStatus;