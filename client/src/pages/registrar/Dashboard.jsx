import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../../services/api';
import UPLOADS_URL from '../../services/uploads';

const RegistrarDashboard = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    declined: 0
  });
  const [selectedApp, setSelectedApp] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeMenu, setActiveMenu] = useState('applications');
  const itemsPerPage = 5;

  // ===== EDIT MODAL STATES =====
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editMessage, setEditMessage] = useState('');

  // Add Application States
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    suffix: '',
    birthDate: '',
    gender: 'Male',
    address: '',
    contactNumber: '',
    email: '',
    gradeLevel: '',
    fatherName: '',
    fatherOccupation: '',
    fatherContact: '',
    motherName: '',
    motherOccupation: '',
    motherContact: '',
    guardianName: '',
    guardianContact: '',
    birthCertificate: false,
    immunizationRecord: false,
    medicalClearance: false,
    idPicture: false,
    academicYear: '2026-2027'
  });

  // Settings States
  const [settings, setSettings] = useState({
    academicYear: '2026-2027',
    ageMin: 5,
    ageMax: 15,
    requirements: ['Birth Certificate', 'Immunization Record', 'Medical Clearance', '2x2 ID Picture']
  });
  const [settingsMessage, setSettingsMessage] = useState('');
  const [settingsMessageType, setSettingsMessageType] = useState('');

  const gradeLevels = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];

  // Profile Picture State
  const [profilePic, setProfilePic] = useState(null);
  const user = JSON.parse(localStorage.getItem('user'));

  // Fetch profile picture
  useEffect(() => {
    if (user && user.role === 'registrar') {
      fetchRegistrarProfile();
    }
  }, []);

  const fetchRegistrarProfile = async () => {
    try {
      const response = await API.get(`/registrar/profile/${user.id}`);
      if (response.data.profile_pic) {
        setProfilePic(`${UPLOADS_URL}/profiles/${response.data.profile_pic}`);
      }
    } catch (error) {
      console.error('Error fetching profile pic:', error);
    }
  };

  useEffect(() => {
    if (!user || user.role !== 'registrar') {
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
    fetchApplications();
    fetchEnrolledStudents();
    fetchSettings();
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const response = await API.get('/registrar/pending');
      setApplications(response.data);
      
      const total = response.data.length;
      const pending = response.data.filter(app => app.status === 'pending').length;
      const approved = response.data.filter(app => app.status === 'approved').length;
      const declined = response.data.filter(app => app.status === 'declined').length;
      
      setStats({ total, pending, approved, declined });
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEnrolledStudents = async () => {
    try {
      const response = await API.get('/admin/applications');
      const confirmed = response.data.filter(app => app.status === 'confirmed');
      setEnrolledStudents(confirmed);
    } catch (error) {
      console.error('Error fetching enrolled students:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await API.get('/settings');
      if (response.data) {
        setSettings(response.data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSettingsMessage('');
    try {
      await API.put('/settings', settings);
      setSettingsMessage('✅ Settings saved successfully!');
      setSettingsMessageType('success');
      setTimeout(() => setSettingsMessage(''), 3000);
    } catch (error) {
      setSettingsMessage('❌ Failed to save settings');
      setSettingsMessageType('error');
    }
  };

  const handleApprove = async (applicationId) => {
    if (!window.confirm('Are you sure you want to approve this application?')) return;
    
    setActionLoading(true);
    try {
      await API.put(`/registrar/approve/${applicationId}`, {
        registrarId: user.id,
        remarks: remarks || 'Approved by Registrar'
      });
      alert('✅ Application approved successfully!');
      setShowModal(false);
      setRemarks('');
      fetchApplications();
    } catch (error) {
      alert('❌ Failed to approve application');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async (applicationId) => {
    const reason = prompt('Please enter reason for declining:');
    if (reason === null) return;
    
    setActionLoading(true);
    try {
      await API.put(`/registrar/decline/${applicationId}`, {
        registrarId: user.id,
        remarks: reason || 'Declined by Registrar'
      });
      alert('✅ Application declined successfully!');
      setShowModal(false);
      setRemarks('');
      fetchApplications();
    } catch (error) {
      alert('❌ Failed to decline application');
    } finally {
      setActionLoading(false);
    }
  };

  const viewApplication = (app) => {
    setSelectedApp(app);
    setShowModal(true);
  };

  // ===== EDIT FUNCTIONS =====
  const handleEdit = async (applicationId) => {
    setEditLoading(true);
    setShowEditModal(true);
    setEditMessage('');
    try {
      const response = await API.get(`/registrar/application/${applicationId}`);
      setEditData(response.data);
    } catch (error) {
      console.error('❌ Error fetching application:', error);
      setEditMessage('❌ Failed to load application details');
      setShowEditModal(false);
    } finally {
      setEditLoading(false);
    }
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    setEditMessage('');
    try {
      await API.put(`/registrar/application/${editData.id}`, {
        first_name: editData.first_name,
        middle_name: editData.middle_name,
        last_name: editData.last_name,
        suffix: editData.suffix,
        birth_date: editData.birth_date,
        gender: editData.gender,
        address: editData.address,
        contact_number: editData.contact_number,
        email: editData.email,
        current_grade_level: editData.current_grade_level,
        father_name: editData.father_name,
        father_occupation: editData.father_occupation,
        father_contact: editData.father_contact,
        mother_name: editData.mother_name,
        mother_occupation: editData.mother_occupation,
        mother_contact: editData.mother_contact,
        guardian_name: editData.guardian_name,
        guardian_contact: editData.guardian_contact,
        academic_year: editData.academic_year,
        registrar_remarks: editData.registrar_remarks
      });
      
      setEditMessage('✅ Application updated successfully!');
      setTimeout(() => {
        setShowEditModal(false);
        setEditData(null);
        setEditMessage('');
        fetchApplications();
      }, 1500);
    } catch (error) {
      console.error('❌ Error saving:', error);
      setEditMessage('❌ Failed to update application. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ========== ADD APPLICATION FUNCTIONS ==========
  const handleAddChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // ✅ UPDATED: Gamiton ang walk-in endpoint (auto-approved)
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');

    // Validation
    if (!formData.firstName || !formData.lastName || !formData.birthDate || !formData.gender || !formData.address || !formData.email) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      setSubmitting(false);
      return;
    }

    if (!formData.gradeLevel) {
      setMessage({ type: 'error', text: 'Grade level is required' });
      setSubmitting(false);
      return;
    }

    try {
      // ✅ WALK-IN: Auto-approved, diretso sa admin
      const response = await API.post('/registrar/walk-in', {
        ...formData,
        registrarId: user.id
      });
      
      setMessage({ 
        type: 'success', 
        text: '✅ Walk-in application created! Ready for admin confirmation.' 
      });
      
      setFormData({
        firstName: '',
        middleName: '',
        lastName: '',
        suffix: '',
        birthDate: '',
        gender: 'Male',
        address: '',
        contactNumber: '',
        email: '',
        gradeLevel: '',
        fatherName: '',
        fatherOccupation: '',
        fatherContact: '',
        motherName: '',
        motherOccupation: '',
        motherContact: '',
        guardianName: '',
        guardianContact: '',
        birthCertificate: false,
        immunizationRecord: false,
        medicalClearance: false,
        idPicture: false,
        academicYear: '2026-2027'
      });
      
      setTimeout(() => {
        setShowAddModal(false);
        setMessage('');
        fetchApplications();
      }, 2000);
      
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: '❌ ' + (error.response?.data?.error || 'Something went wrong') 
      });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredApplications = applications.filter(app => {
    const fullName = `${app.first_name} ${app.middle_name || ''} ${app.last_name}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase()) || 
           app.email?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const filteredStudents = enrolledStudents.filter(student => {
    const fullName = `${student.first_name} ${student.middle_name || ''} ${student.last_name}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase()) || 
           student.email?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const totalPages = Math.ceil(filteredApplications.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedApps = filteredApplications.slice(startIndex, startIndex + itemsPerPage);

  const statusBadgeStyle = (status) => {
    const colors = {
      pending: { bg: 'rgba(251, 191, 36, 0.15)', text: '#d97706', border: 'rgba(251, 191, 36, 0.3)' },
      approved: { bg: 'rgba(52, 211, 153, 0.15)', text: '#059669', border: 'rgba(52, 211, 153, 0.3)' },
      declined: { bg: 'rgba(239, 68, 68, 0.15)', text: '#dc2626', border: 'rgba(239, 68, 68, 0.3)' },
      confirmed: { bg: 'rgba(59, 130, 246, 0.15)', text: '#2563eb', border: 'rgba(59, 130, 246, 0.3)' },
      rejected: { bg: 'rgba(239, 68, 68, 0.15)', text: '#dc2626', border: 'rgba(239, 68, 68, 0.3)' }
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
      border: `1px solid ${color.border}`
    };
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pending',
      approved: 'Approved',
      declined: 'Declined',
      confirmed: 'Confirmed',
      rejected: 'Rejected'
    };
    return labels[status] || status;
  };

  const menuItems = [
    { id: 'applications', icon: '📋', label: 'Applications', type: 'internal' },
    { id: 'enrolled', icon: '🎓', label: 'Enrolled Students', type: 'internal' },
    { id: 'sections', icon: '🏫', label: 'Sections', type: 'link', path: '/registrar/sections' },
    { id: 'subjects', icon: '📚', label: 'Subjects', type: 'link', path: '/registrar/subjects' },
    { id: 'enrollments', icon: '📝', label: 'Enrollments', type: 'link', path: '/registrar/enrollments' },
    { id: 'grades', icon: '📊', label: 'Grades', type: 'link', path: '/registrar/grades' },
    { id: 'remarks', icon: '💬', label: 'Remarks', type: 'link', path: '/registrar/remarks' },
    { id: 'settings', icon: '⚙️', label: 'Settings', type: 'internal' }
  ];

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    marginTop: '4px',
    transition: 'all 0.3s ease',
    outline: 'none',
    boxSizing: 'border-box'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '13px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '4px'
  };

  const renderContent = () => {
    switch (activeMenu) {
      case 'applications':
        return renderApplications();
      case 'enrolled':
        return renderEnrolledStudents();
      case 'settings':
        return renderSettings();
      default:
        return renderApplications();
    }
  };

  const renderApplications = () => (
    <>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '20px',
        marginBottom: '28px'
      }}>
        <div style={{
          background: 'white', padding: '24px 20px', borderRadius: '14px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>Total</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#1f2937' }}>{stats.total}</div>
            </div>
            <div style={{ fontSize: '32px', opacity: 0.6 }}>📊</div>
          </div>
        </div>
        <div style={{
          background: 'white', padding: '24px 20px', borderRadius: '14px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #e5e7eb',
          borderTop: '4px solid #f59e0b'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>Pending</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#d97706' }}>{stats.pending}</div>
            </div>
            <div style={{ fontSize: '32px', opacity: 0.6 }}>⏳</div>
          </div>
        </div>
        <div style={{
          background: 'white', padding: '24px 20px', borderRadius: '14px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #e5e7eb',
          borderTop: '4px solid #10b981'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>Approved</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#059669' }}>{stats.approved}</div>
            </div>
            <div style={{ fontSize: '32px', opacity: 0.6 }}>✅</div>
          </div>
        </div>
        <div style={{
          background: 'white', padding: '24px 20px', borderRadius: '14px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #e5e7eb',
          borderTop: '4px solid #ef4444'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>Declined</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#dc2626' }}>{stats.declined}</div>
            </div>
            <div style={{ fontSize: '32px', opacity: 0.6 }}>❌</div>
          </div>
        </div>
      </div>

      <div style={{
        background: 'white', padding: '14px 20px', borderRadius: '12px',
        marginBottom: '24px', border: '1px solid #e5e7eb',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
      }}>
        <input
          type="text"
          placeholder="🔍 Search applications by name or email..."
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

      <div style={{
        background: 'white', padding: '24px', borderRadius: '14px',
        border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
            📋 Pending Applications (Online)
          </h3>
          <span style={{ fontSize: '13px', color: '#6b7280' }}>
            {filteredApplications.length} applications
          </span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
            ⏳ Loading...
          </div>
        ) : paginatedApps.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
            <div style={{ fontSize: '48px', marginBottom: '8px' }}>🎉</div>
            {searchTerm ? 'No applications match your search.' : 'No pending applications!'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>#</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Name</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Grade</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Email</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Contact</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedApps.map((app, index) => (
                  <tr key={app.application_id} style={{ borderBottom: '1px solid #e5e7eb' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{startIndex + index + 1}</td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#1f2937', fontWeight: '500' }}>
                      {app.first_name} {app.middle_name || ''} {app.last_name} {app.suffix || ''}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                      <span style={{
                        padding: '3px 10px', background: '#dbeafe', color: '#1a56db',
                        borderRadius: '10px', fontSize: '11px', fontWeight: '600'
                      }}>
                        {app.current_grade_level || 'N/A'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{app.email}</td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{app.contact_number || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={statusBadgeStyle(app.status)}>
                        {getStatusLabel(app.status)}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <button
                        onClick={() => viewApplication(app)}
                        style={{
                          background: '#dbeafe', color: '#1a56db',
                          border: 'none', padding: '6px 16px',
                          borderRadius: '6px', cursor: 'pointer',
                          fontSize: '13px', fontWeight: '500', width: '80px'
                        }}
                      >
                        👁️ View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filteredApplications.length > 0 && (
          <div style={{
            padding: '14px 0 0', borderTop: '1px solid #e5e7eb',
            marginTop: '16px', display: 'flex',
            justifyContent: 'space-between', alignItems: 'center'
          }}>
            <span style={{ fontSize: '13px', color: '#6b7280' }}>
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredApplications.length)} of {filteredApplications.length}
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                style={{
                  padding: '6px 14px', border: '1px solid #d1d5db',
                  borderRadius: '6px', background: 'white',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  fontSize: '13px', color: currentPage === 1 ? '#9ca3af' : '#374151'
                }}
              >←</button>
              <span style={{
                padding: '6px 14px', border: '1px solid #1a56db',
                borderRadius: '6px', background: '#dbeafe',
                color: '#1a56db', fontSize: '13px', fontWeight: '600'
              }}>{currentPage}</span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                style={{
                  padding: '6px 14px', border: '1px solid #d1d5db',
                  borderRadius: '6px', background: 'white',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  fontSize: '13px', color: currentPage === totalPages ? '#9ca3af' : '#374151'
                }}
              >→</button>
            </div>
          </div>
        )}
      </div>
    </>
  );

  const renderEnrolledStudents = () => (
    <div style={{
      background: 'white', padding: '24px', borderRadius: '14px',
      border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
          🎓 Enrolled Students
        </h3>
        <span style={{ fontSize: '13px', color: '#6b7280' }}>
          {filteredStudents.length} students
        </span>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="🔍 Search enrolled students..."
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

      {filteredStudents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          {searchTerm ? 'No students match your search.' : 'No enrolled students yet.'}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>#</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Student ID</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Name</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Grade</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Email</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{index + 1}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '600', color: '#1a56db' }}>
                    {student.student_public_id ? student.student_public_id.replace('NCDC-', '') : '—'}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#1f2937', fontWeight: '500' }}>
                    {student.first_name} {student.middle_name || ''} {student.last_name}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                    <span style={{
                      padding: '3px 10px', background: '#dbeafe', color: '#1a56db',
                      borderRadius: '10px', fontSize: '11px', fontWeight: '600'
                    }}>
                      {student.current_grade_level || 'N/A'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{student.email}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={statusBadgeStyle('confirmed')}>Enrolled</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderSettings = () => (
    <div style={{
      background: 'white', padding: '32px', borderRadius: '14px',
      border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
    }}>
      <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', marginBottom: '8px' }}>
        ⚙️ Settings
      </h3>
      <p style={{ color: '#6b7280', marginBottom: '24px', fontSize: '14px' }}>
        Configure system settings for enrollment
      </p>

      {settingsMessage && (
        <div style={{
          padding: '12px 16px', borderRadius: '8px', marginBottom: '16px',
          background: settingsMessageType === 'success' ? '#d1fae5' : '#fee2e2',
          color: settingsMessageType === 'success' ? '#065f46' : '#991b1b'
        }}>{settingsMessage}</div>
      )}

      <form onSubmit={handleSaveSettings}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <label style={labelStyle}>Academic Year</label>
            <input type="text" value={settings.academicYear}
              onChange={(e) => setSettings({ ...settings, academicYear: e.target.value })}
              style={inputStyle} />
          </div>
        </div>

        <button
          type="submit"
          style={{
            marginTop: '24px',
            background: '#1a56db', color: 'white', border: 'none',
            padding: '10px 32px', borderRadius: '8px', cursor: 'pointer',
            fontSize: '14px', fontWeight: '600'
          }}
        >💾 Save Settings</button>
      </form>
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f0f4ff 0%, #e8ecf1 50%, #f5f3ff 100%)',
      fontFamily: 'Segoe UI, -apple-system, BlinkMacSystemFont, Roboto, sans-serif',
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
              <span style={{ fontSize: '10px', color: '#6b7280', fontWeight: '500' }}>Registrar Panel</span>
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
              user?.username?.charAt(0).toUpperCase() || 'R'
            )}
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: '600', color: '#1f2937' }}>
              {user?.username || 'Registrar'}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Registrar</div>
          </div>
        </Link>

        <div style={{ padding: '16px 12px', flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          {menuItems.map((item) => {
            if (item.type === 'link') {
              return (
                <Link key={item.id} to={item.path} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  width: '100%', padding: '10px 14px', borderRadius: '8px',
                  textDecoration: 'none', background: 'transparent',
                  color: '#6b7280', fontWeight: '500', fontSize: '14px',
                  marginBottom: '2px', boxSizing: 'border-box'
                }}>
                  <span style={{ fontSize: '18px', width: '24px' }}>{item.icon}</span>
                  {item.label}
                </Link>
              );
            }
            return (
              <button key={item.id}
                onClick={() => { setActiveMenu(item.id); setSearchTerm(''); setCurrentPage(1); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  width: '100%', padding: '10px 14px', borderRadius: '8px',
                  border: 'none',
                  background: activeMenu === item.id ? 'rgba(59,130,246,0.08)' : 'transparent',
                  color: activeMenu === item.id ? '#1a56db' : '#6b7280',
                  fontWeight: activeMenu === item.id ? '600' : '500',
                  cursor: 'pointer', fontSize: '14px',
                  marginBottom: '2px', position: 'relative', boxSizing: 'border-box'
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
            );
          })}
        </div>

        <div style={{
          padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.2)',
          flexShrink: 0, background: 'rgba(255,255,255,0.3)'
        }}>
          <button onClick={() => { localStorage.clear(); navigate('/login'); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              width: '100%', padding: '10px 14px', borderRadius: '8px',
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
        flex: 1, marginLeft: '280px', padding: '28px 36px',
        minHeight: '100vh', overflowY: 'auto'
      }}>
        {activeMenu === 'applications' && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
            <div>
              <h1 style={{ fontSize: '28px', color: '#1f2937', margin: 0, fontWeight: '700' }}>
                📋 Registrar Dashboard
              </h1>
              <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>
                Manage and review student applications
              </p>
            </div>
            <button onClick={() => setShowAddModal(true)}
              style={{
                background: 'linear-gradient(135deg, #1a56db, #3b82f6)',
                color: 'white', border: 'none', padding: '10px 24px',
                borderRadius: '10px', cursor: 'pointer', fontSize: '14px',
                fontWeight: '600', boxShadow: '0 4px 15px rgba(26,86,219,0.3)'
              }}>
              ➕ Add Application
            </button>
          </div>
        )}

        {activeMenu === 'enrolled' && (
          <div style={{ marginBottom: '28px' }}>
            <h1 style={{ fontSize: '28px', color: '#1f2937', margin: 0, fontWeight: '700' }}>
              🎓 Enrolled Students
            </h1>
            <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>
              View all enrolled students
            </p>
          </div>
        )}

        {activeMenu === 'settings' && (
          <div style={{ marginBottom: '28px' }}>
            <h1 style={{ fontSize: '28px', color: '#1f2937', margin: 0, fontWeight: '700' }}>
              ⚙️ Settings
            </h1>
          </div>
        )}

        {renderContent()}

        <div style={{
          marginTop: '28px', paddingTop: '16px',
          borderTop: '1px solid #e5e7eb', textAlign: 'center'
        }}>
          <p style={{ fontSize: '13px', color: '#9ca3af' }}>
            Nurturing Today, <strong style={{ color: '#1a56db' }}>Empowering Tomorrow</strong>
          </p>
        </div>
      </div>

      {/* ========== ADD APPLICATION MODAL ========== */}
      {showAddModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '20px', overflowY: 'auto'
        }}>
          <div style={{
            background: 'white', borderRadius: '16px',
            maxWidth: '700px', width: '100%', maxHeight: '90vh',
            overflowY: 'auto', padding: '32px',
            boxShadow: '0 25px 60px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', color: '#1f2937', margin: 0 }}>➕ Add Application (Walk-in)</h2>
              <button onClick={() => { setShowAddModal(false); setMessage(''); }}
                style={{
                  background: 'transparent', border: 'none',
                  fontSize: '24px', cursor: 'pointer', color: '#9ca3af'
                }}>×</button>
            </div>

            <div style={{
              padding: '10px 14px', background: '#fef3c7',
              color: '#92400e', borderRadius: '8px',
              marginBottom: '16px', fontSize: '13px',
              border: '1px solid #f59e0b'
            }}>
              ℹ️ <strong>Walk-in Application:</strong> Mo-diretso ni sa Admin para i-confirm. Dili na kailangan ug registrar approval.
            </div>

            {message && (
              <div style={{
                padding: '12px 16px', borderRadius: '8px', marginBottom: '16px',
                background: message.type === 'success' ? '#d1fae5' : '#fee2e2',
                color: message.type === 'success' ? '#065f46' : '#991b1b'
              }}>{message.text}</div>
            )}

            <form onSubmit={handleAddSubmit}>
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', color: '#1f2937', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px', marginBottom: '16px' }}>
                  👤 Personal Information
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={labelStyle}>First Name *</label>
                    <input type="text" name="firstName" value={formData.firstName} onChange={handleAddChange} required style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Middle Name</label>
                    <input type="text" name="middleName" value={formData.middleName} onChange={handleAddChange} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Last Name *</label>
                    <input type="text" name="lastName" value={formData.lastName} onChange={handleAddChange} required style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Suffix</label>
                    <select name="suffix" value={formData.suffix} onChange={handleAddChange} style={inputStyle}>
                      <option value="">None</option>
                      <option value="Jr.">Jr.</option>
                      <option value="Sr.">Sr.</option>
                      <option value="II">II</option>
                      <option value="III">III</option>
                      <option value="IV">IV</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Birth Date *</label>
                    <input type="date" name="birthDate" value={formData.birthDate} onChange={handleAddChange} required style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Gender *</label>
                    <select name="gender" value={formData.gender} onChange={handleAddChange} required style={inputStyle}>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Grade Level Applying For *</label>
                    <select name="gradeLevel" value={formData.gradeLevel} onChange={handleAddChange} required style={inputStyle}>
                      <option value="">-- Select Grade Level --</option>
                      {gradeLevels.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>

                  <div>
                    <label style={labelStyle}>Contact Number</label>
                    <input type="text" name="contactNumber" value={formData.contactNumber} onChange={handleAddChange} style={inputStyle} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Address *</label>
                    <textarea name="address" value={formData.address} onChange={handleAddChange} required rows="2" style={inputStyle} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Email Address *</label>
                    <input type="email" name="email" value={formData.email} onChange={handleAddChange} required style={inputStyle} />
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', color: '#1f2937', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px', marginBottom: '16px' }}>
                  👨‍👩‍👦 Parent/Guardian
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={labelStyle}>Father's Name</label>
                    <input type="text" name="fatherName" value={formData.fatherName} onChange={handleAddChange} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Father's Occupation</label>
                    <input type="text" name="fatherOccupation" value={formData.fatherOccupation} onChange={handleAddChange} style={inputStyle} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Father's Contact</label>
                    <input type="text" name="fatherContact" value={formData.fatherContact} onChange={handleAddChange} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Mother's Name</label>
                    <input type="text" name="motherName" value={formData.motherName} onChange={handleAddChange} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Mother's Occupation</label>
                    <input type="text" name="motherOccupation" value={formData.motherOccupation} onChange={handleAddChange} style={inputStyle} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Mother's Contact</label>
                    <input type="text" name="motherContact" value={formData.motherContact} onChange={handleAddChange} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Guardian's Name</label>
                    <input type="text" name="guardianName" value={formData.guardianName} onChange={handleAddChange} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Guardian's Contact</label>
                    <input type="text" name="guardianContact" value={formData.guardianContact} onChange={handleAddChange} style={inputStyle} />
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', color: '#1f2937', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px', marginBottom: '16px' }}>
                  📋 Requirements
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
                    <input type="checkbox" name="birthCertificate" checked={formData.birthCertificate} onChange={handleAddChange} />
                    Birth Certificate
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
                    <input type="checkbox" name="immunizationRecord" checked={formData.immunizationRecord} onChange={handleAddChange} />
                    Immunization Record
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
                    <input type="checkbox" name="medicalClearance" checked={formData.medicalClearance} onChange={handleAddChange} />
                    Medical Clearance
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
                    <input type="checkbox" name="idPicture" checked={formData.idPicture} onChange={handleAddChange} />
                    2x2 ID Picture
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" disabled={submitting}
                  style={{
                    flex: 1,
                    background: submitting ? '#93c5fd' : 'linear-gradient(135deg, #1a56db, #3b82f6)',
                    color: 'white', border: 'none', padding: '12px',
                    borderRadius: '10px', fontWeight: '600', fontSize: '16px',
                    cursor: submitting ? 'not-allowed' : 'pointer'
                  }}>
                  {submitting ? 'Submitting...' : '📝 Submit Walk-in Application'}
                </button>
                <button type="button" onClick={() => { setShowAddModal(false); setMessage(''); }}
                  style={{
                    flex: 1, background: 'transparent', color: '#6b7280',
                    border: '1px solid #d1d5db', padding: '12px',
                    borderRadius: '10px', fontWeight: '600', cursor: 'pointer'
                  }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========== VIEW APPLICATION MODAL ========== */}
      {showModal && selectedApp && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '20px'
        }}>
          <div style={{
            background: 'white', borderRadius: '16px',
            maxWidth: '560px', width: '100%', maxHeight: '80vh',
            overflowY: 'auto', padding: '32px',
            boxShadow: '0 25px 60px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', color: '#1f2937', margin: 0 }}>📄 Application Details</h2>
              <button onClick={() => setShowModal(false)}
                style={{ background: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#9ca3af' }}>×</button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <p style={{ margin: '4px 0' }}><strong>Name:</strong> {selectedApp.first_name} {selectedApp.middle_name || ''} {selectedApp.last_name} {selectedApp.suffix || ''}</p>
              <p style={{ margin: '4px 0' }}><strong>Grade Level:</strong> <span style={{ color: '#1a56db', fontWeight: '600' }}>{selectedApp.current_grade_level || 'N/A'}</span></p>
              <p style={{ margin: '4px 0' }}><strong>Email:</strong> {selectedApp.email}</p>
              <p style={{ margin: '4px 0' }}><strong>Contact:</strong> {selectedApp.contact_number || 'N/A'}</p>
              <p style={{ margin: '4px 0' }}><strong>Birth Date:</strong> {selectedApp.birth_date}</p>
              <p style={{ margin: '4px 0' }}><strong>Gender:</strong> {selectedApp.gender}</p>
              <p style={{ margin: '4px 0' }}><strong>Address:</strong> {selectedApp.address}</p>
            </div>

            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px', marginBottom: '16px' }}>
              <h4 style={{ marginBottom: '8px', color: '#374151' }}>👨‍👩‍👦 Parents/Guardian</h4>
              <p style={{ margin: '2px 0', fontSize: '14px' }}><strong>Father:</strong> {selectedApp.father_name || 'N/A'}</p>
              <p style={{ margin: '2px 0', fontSize: '14px' }}><strong>Mother:</strong> {selectedApp.mother_name || 'N/A'}</p>
              <p style={{ margin: '2px 0', fontSize: '14px' }}><strong>Guardian:</strong> {selectedApp.guardian_name || 'N/A'}</p>
            </div>

            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px', marginBottom: '16px' }}>
              <h4 style={{ marginBottom: '8px', color: '#374151' }}>📋 Requirements</h4>
              <p style={{ margin: '2px 0', fontSize: '14px' }}>✅ Birth Certificate: {selectedApp.birth_certificate ? 'Uploaded' : 'Not uploaded'}</p>
              <p style={{ margin: '2px 0', fontSize: '14px' }}>✅ Immunization: {selectedApp.immunization_record ? 'Uploaded' : 'Not uploaded'}</p>
              <p style={{ margin: '2px 0', fontSize: '14px' }}>✅ Medical Clearance: {selectedApp.medical_clearance ? 'Uploaded' : 'Not uploaded'}</p>
              <p style={{ margin: '2px 0', fontSize: '14px' }}>✅ ID Picture: {selectedApp.id_picture ? 'Uploaded' : 'Not uploaded'}</p>
            </div>

            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
                Remarks
              </label>
              <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)}
                placeholder="Add remarks..." rows="2"
                style={{
                  width: '100%', padding: '10px 14px',
                  border: '1px solid #d1d5db', borderRadius: '8px',
                  fontSize: '14px', resize: 'vertical', outline: 'none',
                  boxSizing: 'border-box'
                }} />
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '20px', flexWrap: 'wrap' }}>
              <button onClick={() => { setShowModal(false); handleEdit(selectedApp.application_id); }}
                style={{
                  flex: 1, minWidth: '80px',
                  background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
                  color: 'white', border: 'none', padding: '12px',
                  borderRadius: '10px', fontWeight: '600', cursor: 'pointer'
                }}>✏️ Edit</button>
              <button onClick={() => handleApprove(selectedApp.application_id)} disabled={actionLoading}
                style={{
                  flex: 1, minWidth: '80px',
                  background: actionLoading ? '#93c5fd' : 'linear-gradient(135deg, #10b981, #34d399)',
                  color: 'white', border: 'none', padding: '12px',
                  borderRadius: '10px', fontWeight: '600',
                  cursor: actionLoading ? 'not-allowed' : 'pointer'
                }}>✅ Approve</button>
              <button onClick={() => handleDecline(selectedApp.application_id)} disabled={actionLoading}
                style={{
                  flex: 1, minWidth: '80px',
                  background: actionLoading ? '#93c5fd' : 'linear-gradient(135deg, #ef4444, #f87171)',
                  color: 'white', border: 'none', padding: '12px',
                  borderRadius: '10px', fontWeight: '600',
                  cursor: actionLoading ? 'not-allowed' : 'pointer'
                }}>❌ Decline</button>
            </div>
          </div>
        </div>
      )}

      {/* ========== EDIT MODAL ========== */}
      {showEditModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1001, padding: '20px', overflowY: 'auto'
        }}>
          <div style={{
            background: 'white', borderRadius: '16px',
            maxWidth: '800px', width: '100%', maxHeight: '90vh',
            overflowY: 'auto', padding: '32px',
            boxShadow: '0 25px 60px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', color: '#1f2937', margin: 0 }}>✏️ Edit Application</h2>
              <button onClick={() => { setShowEditModal(false); setEditData(null); setEditMessage(''); }}
                style={{ background: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#9ca3af' }}>×</button>
            </div>

            {editMessage && (
              <div style={{
                padding: '12px 16px', borderRadius: '8px', marginBottom: '16px',
                background: editMessage.includes('✅') ? '#d1fae5' : '#fee2e2',
                color: editMessage.includes('✅') ? '#065f46' : '#991b1b'
              }}>{editMessage}</div>
            )}

            {editLoading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>⏳ Loading...</div>
            ) : editData ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <h3 style={{ fontSize: '16px', color: '#1a56db', marginBottom: '12px', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>
                    👤 Personal Information
                  </h3>
                </div>

                <div>
                  <label style={labelStyle}>First Name *</label>
                  <input type="text" name="first_name" value={editData.first_name || ''} onChange={handleEditChange} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Middle Name</label>
                  <input type="text" name="middle_name" value={editData.middle_name || ''} onChange={handleEditChange} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Last Name *</label>
                  <input type="text" name="last_name" value={editData.last_name || ''} onChange={handleEditChange} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Suffix</label>
                  <select name="suffix" value={editData.suffix || ''} onChange={handleEditChange} style={inputStyle}>
                    <option value="">None</option>
                    <option value="Jr.">Jr.</option>
                    <option value="Sr.">Sr.</option>
                    <option value="II">II</option>
                    <option value="III">III</option>
                    <option value="IV">IV</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Birth Date</label>
                  <input type="date" name="birth_date" value={editData.birth_date || ''} onChange={handleEditChange} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Gender</label>
                  <select name="gender" value={editData.gender || ''} onChange={handleEditChange} style={inputStyle}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Grade Level *</label>
                  <select name="current_grade_level" value={editData.current_grade_level || ''} onChange={handleEditChange} style={inputStyle}>
                    <option value="">-- Select Grade Level --</option>
                    {gradeLevels.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Address</label>
                  <input type="text" name="address" value={editData.address || ''} onChange={handleEditChange} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Contact Number</label>
                  <input type="text" name="contact_number" value={editData.contact_number || ''} onChange={handleEditChange} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Email *</label>
                  <input type="email" name="email" value={editData.email || ''} onChange={handleEditChange} style={inputStyle} />
                </div>

                <div style={{ gridColumn: '1 / -1', marginTop: '8px' }}>
                  <h3 style={{ fontSize: '16px', color: '#1a56db', marginBottom: '12px', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>
                    👨‍👩‍👦 Parent/Guardian Information
                  </h3>
                </div>

                <div>
                  <label style={labelStyle}>Father's Name</label>
                  <input type="text" name="father_name" value={editData.father_name || ''} onChange={handleEditChange} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Father's Occupation</label>
                  <input type="text" name="father_occupation" value={editData.father_occupation || ''} onChange={handleEditChange} style={inputStyle} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Father's Contact</label>
                  <input type="text" name="father_contact" value={editData.father_contact || ''} onChange={handleEditChange} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Mother's Name</label>
                  <input type="text" name="mother_name" value={editData.mother_name || ''} onChange={handleEditChange} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Mother's Occupation</label>
                  <input type="text" name="mother_occupation" value={editData.mother_occupation || ''} onChange={handleEditChange} style={inputStyle} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Mother's Contact</label>
                  <input type="text" name="mother_contact" value={editData.mother_contact || ''} onChange={handleEditChange} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Guardian's Name</label>
                  <input type="text" name="guardian_name" value={editData.guardian_name || ''} onChange={handleEditChange} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Guardian's Contact</label>
                  <input type="text" name="guardian_contact" value={editData.guardian_contact || ''} onChange={handleEditChange} style={inputStyle} />
                </div>

                <div style={{ gridColumn: '1 / -1', marginTop: '8px' }}>
                  <h3 style={{ fontSize: '16px', color: '#1a56db', marginBottom: '12px', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>
                    📄 Application Details
                  </h3>
                </div>

                <div>
                  <label style={labelStyle}>Academic Year</label>
                  <input type="text" name="academic_year" value={editData.academic_year || ''} onChange={handleEditChange} style={inputStyle} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Registrar Remarks</label>
                  <textarea name="registrar_remarks" value={editData.registrar_remarks || ''} onChange={handleEditChange} style={{ ...inputStyle, minHeight: '80px' }} placeholder="Enter remarks..." />
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>No data found.</div>
            )}

            {!editLoading && editData && (
              <div style={{ marginTop: '24px', borderTop: '2px solid #e5e7eb', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button onClick={() => { setShowEditModal(false); setEditData(null); setEditMessage(''); }}
                  style={{
                    background: '#6b7280', color: 'white', border: 'none',
                    padding: '10px 24px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px'
                  }}>Cancel</button>
                <button onClick={handleSaveEdit} disabled={saving}
                  style={{
                    background: saving ? '#9ca3af' : '#1a56db',
                    color: 'white', border: 'none', padding: '10px 24px',
                    borderRadius: '8px', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '14px'
                  }}>{saving ? '💾 Saving...' : '💾 Save Changes'}</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RegistrarDashboard;