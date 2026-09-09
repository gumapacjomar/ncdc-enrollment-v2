import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../../services/api';

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
    semester: '1st Semester',
    ageMin: 4,
    ageMax: 5,
    requirements: ['Birth Certificate', 'Immunization Record', 'Medical Clearance', '2x2 ID Picture']
  });
  const [settingsMessage, setSettingsMessage] = useState('');
  const [settingsMessageType, setSettingsMessageType] = useState('');

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
        setProfilePic(`http://localhost:5000/uploads/profiles/${response.data.profile_pic}`);
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

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');

    if (!formData.firstName || !formData.lastName || !formData.birthDate || !formData.gender || !formData.address || !formData.email) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      setSubmitting(false);
      return;
    }

    try {
      const response = await API.post('/apply', formData);
      setMessage({ type: 'success', text: '✅ ' + response.data.message });
      
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
    { id: 'applications', icon: '📋', label: 'Applications' },
    { id: 'enrolled', icon: '🎓', label: 'Enrolled Students' },
    { id: 'settings', icon: '⚙️', label: 'Settings' }
  ];

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    marginTop: '4px',
    transition: 'all 0.3s ease',
    outline: 'none'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '13px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '4px'
  };

  // Render content based on active menu
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
      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '20px',
        marginBottom: '28px'
      }}>
        <div style={{
          background: 'white',
          padding: '24px 20px',
          borderRadius: '14px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          border: '1px solid #e5e7eb',
          transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.08)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
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
          background: 'white',
          padding: '24px 20px',
          borderRadius: '14px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          border: '1px solid #e5e7eb',
          borderTop: '4px solid #f59e0b',
          transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.08)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
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
          background: 'white',
          padding: '24px 20px',
          borderRadius: '14px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          border: '1px solid #e5e7eb',
          borderTop: '4px solid #10b981',
          transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.08)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
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
          background: 'white',
          padding: '24px 20px',
          borderRadius: '14px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          border: '1px solid #e5e7eb',
          borderTop: '4px solid #ef4444',
          transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.08)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
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

      {/* Search Bar */}
      <div style={{
        background: 'white',
        padding: '14px 20px',
        borderRadius: '12px',
        marginBottom: '24px',
        border: '1px solid #e5e7eb',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
      }}>
        <input
          type="text"
          placeholder="🔍 Search applications by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 16px',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '14px',
            outline: 'none',
            transition: 'all 0.3s ease',
            background: '#f9fafb'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#1a56db';
            e.target.style.background = 'white';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#e5e7eb';
            e.target.style.background = '#f9fafb';
          }}
        />
      </div>

      {/* Applications Table */}
      <div style={{
        background: 'white',
        padding: '24px',
        borderRadius: '14px',
        border: '1px solid #e5e7eb',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
            📋 Pending Applications
          </h3>
          <span style={{ fontSize: '13px', color: '#6b7280' }}>
            {filteredApplications.length} applications
          </span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
            <div style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</div> Loading...
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
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>#</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Name</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Contact</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedApps.map((app, index) => (
                  <tr key={app.application_id} style={{ borderBottom: '1px solid #e5e7eb', transition: 'background 0.2s ease' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{startIndex + index + 1}</td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#1f2937', fontWeight: '500' }}>
                      {app.first_name} {app.middle_name || ''} {app.last_name} {app.suffix || ''}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{app.email}</td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{app.contact_number || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={statusBadgeStyle(app.status)}>
                        {getStatusLabel(app.status)}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>
                      {new Date(app.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      {/* View Button ONLY */}
                      <button
                        onClick={() => viewApplication(app)}
                        style={{
                          background: '#dbeafe',
                          color: '#1a56db',
                          border: 'none',
                          padding: '6px 16px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: '500',
                          transition: 'all 0.2s ease',
                          width: '80px'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = '#bfdbfe';
                          e.target.style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = '#dbeafe';
                          e.target.style.transform = 'scale(1)';
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

        {/* Pagination */}
        {!loading && filteredApplications.length > 0 && (
          <div style={{
            padding: '14px 0 0',
            borderTop: '1px solid #e5e7eb',
            marginTop: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <span style={{ fontSize: '13px', color: '#6b7280' }}>
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredApplications.length)} of {filteredApplications.length} applications
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                style={{
                  padding: '6px 14px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  background: 'white',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  color: currentPage === 1 ? '#9ca3af' : '#374151',
                  transition: 'all 0.2s ease'
                }}
              >
                ←
              </button>
              <span style={{
                padding: '6px 14px',
                border: '1px solid #1a56db',
                borderRadius: '6px',
                background: '#dbeafe',
                color: '#1a56db',
                fontSize: '13px',
                fontWeight: '600'
              }}>
                {currentPage}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                style={{
                  padding: '6px 14px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  background: 'white',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  color: currentPage === totalPages ? '#9ca3af' : '#374151',
                  transition: 'all 0.2s ease'
                }}
              >
                →
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );

  const renderEnrolledStudents = () => (
    <div style={{
      background: 'white',
      padding: '24px',
      borderRadius: '14px',
      border: '1px solid #e5e7eb',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
          🎓 Enrolled Students
        </h3>
        <span style={{ fontSize: '13px', color: '#6b7280' }}>
          {filteredStudents.length} students
        </span>
      </div>

      <div style={{
        marginBottom: '20px'
      }}>
        <input
          type="text"
          placeholder="🔍 Search enrolled students..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 16px',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '14px',
            outline: 'none',
            transition: 'all 0.3s ease',
            background: '#f9fafb'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#1a56db';
            e.target.style.background = 'white';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#e5e7eb';
            e.target.style.background = '#f9fafb';
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
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>#</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Student ID</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Name</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date Enrolled</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #e5e7eb', transition: 'background 0.2s ease' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{index + 1}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '600', color: '#1a56db' }}>
                    {student.student_id ? student.student_id.replace('NCDC-', '') : '—'}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#1f2937', fontWeight: '500' }}>
                    {student.first_name} {student.middle_name || ''} {student.last_name}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{student.email}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={statusBadgeStyle('confirmed')}>Enrolled</span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>
                    {new Date(student.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
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
      background: 'white',
      padding: '32px',
      borderRadius: '14px',
      border: '1px solid #e5e7eb',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
    }}>
      <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', marginBottom: '8px' }}>
        ⚙️ Settings
      </h3>
      <p style={{ color: '#6b7280', marginBottom: '24px', fontSize: '14px' }}>
        Configure system settings for enrollment
      </p>

      {settingsMessage && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '16px',
          background: settingsMessageType === 'success' ? '#d1fae5' : '#fee2e2',
          color: settingsMessageType === 'success' ? '#065f46' : '#991b1b',
          border: `1px solid ${settingsMessageType === 'success' ? '#34d399' : '#fca5a5'}`
        }}>
          {settingsMessage}
        </div>
      )}

      <form onSubmit={handleSaveSettings}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <label style={labelStyle}>Academic Year</label>
            <input
              type="text"
              value={settings.academicYear}
              onChange={(e) => setSettings({ ...settings, academicYear: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Semester</label>
            <select
              value={settings.semester}
              onChange={(e) => setSettings({ ...settings, semester: e.target.value })}
              style={inputStyle}
            >
              <option value="1st Semester">1st Semester</option>
              <option value="2nd Semester">2nd Semester</option>
              <option value="Summer">Summer</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Minimum Age</label>
            <input
              type="number"
              value={settings.ageMin}
              onChange={(e) => setSettings({ ...settings, ageMin: parseInt(e.target.value) })}
              style={inputStyle}
              min="3"
              max="6"
            />
          </div>
          <div>
            <label style={labelStyle}>Maximum Age</label>
            <input
              type="number"
              value={settings.ageMax}
              onChange={(e) => setSettings({ ...settings, ageMax: parseInt(e.target.value) })}
              style={inputStyle}
              min="3"
              max="6"
            />
          </div>
        </div>

        <div style={{ marginTop: '20px' }}>
          <label style={labelStyle}>Required Documents</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
            {['Birth Certificate', 'Immunization Record', 'Medical Clearance', '2x2 ID Picture'].map((req, index) => (
              <label key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.requirements?.includes(req)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSettings({ ...settings, requirements: [...settings.requirements, req] });
                    } else {
                      setSettings({ ...settings, requirements: settings.requirements.filter(r => r !== req) });
                    }
                  }}
                  style={{ accentColor: '#1a56db' }}
                />
                {req}
              </label>
            ))}
          </div>
        </div>

        <button
          type="submit"
          style={{
            marginTop: '24px',
            background: '#1a56db',
            color: 'white',
            border: 'none',
            padding: '10px 32px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => e.target.style.background = '#1e40af'}
          onMouseLeave={(e) => e.target.style.background = '#1a56db'}
        >
          💾 Save Settings
        </button>
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
      {/* ========== SIDEBAR ========== */}
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
          padding: '24px 24px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.2)',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              background: 'linear-gradient(135deg, #1a56db, #3b82f6)',
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              boxShadow: '0 4px 15px rgba(26,86,219,0.3)'
            }}>
              🎓
            </div>
            <div>
              <span style={{ fontSize: '18px', fontWeight: '800', color: '#1f2937' }}>NCDC</span>
              <br />
              <span style={{ fontSize: '10px', color: '#6b7280', fontWeight: '500' }}>Registrar Panel</span>
            </div>
          </div>
        </div>

        {/* Profile Section */}
        <Link to="/registrar/profile" style={{
          textDecoration: 'none',
          padding: '20px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
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
              onClick={() => {
                setActiveMenu(item.id);
                setSearchTerm('');
                setCurrentPage(1);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: 'none',
                background: activeMenu === item.id ? 'rgba(59,130,246,0.08)' : 'transparent',
                color: activeMenu === item.id ? '#1a56db' : '#6b7280',
                fontWeight: activeMenu === item.id ? '600' : '500',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.3s ease',
                marginBottom: '2px',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                if (activeMenu !== item.id) {
                  e.currentTarget.style.background = 'rgba(0,0,0,0.03)';
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
                  width: '3px',
                  height: '24px',
                  background: 'linear-gradient(180deg, #1a56db, #3b82f6)',
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
          borderTop: '1px solid rgba(255,255,255,0.2)',
          flexShrink: 0,
          background: 'rgba(255,255,255,0.3)'
        }}>
          <button
            onClick={() => {
              localStorage.clear();
              navigate('/login');
            }}
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
        padding: '28px 36px',
        minHeight: '100vh',
        overflowY: 'auto',
        maxHeight: '100vh'
      }}>
        {/* Header */}
        {activeMenu === 'applications' && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '28px'
          }}>
            <div>
              <h1 style={{ fontSize: '28px', color: '#1f2937', margin: 0, fontWeight: '700', letterSpacing: '-0.5px' }}>
                📋 Registrar Dashboard
              </h1>
              <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>
                Manage and review student applications
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                background: 'linear-gradient(135deg, #1a56db, #3b82f6)',
                color: 'white',
                border: 'none',
                padding: '10px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                boxShadow: '0 4px 15px rgba(26,86,219,0.3)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 25px rgba(26,86,219,0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 15px rgba(26,86,219,0.3)';
              }}
            >
              ➕ Add Application
            </button>
          </div>
        )}

        {activeMenu === 'enrolled' && (
          <div style={{ marginBottom: '28px' }}>
            <h1 style={{ fontSize: '28px', color: '#1f2937', margin: 0, fontWeight: '700', letterSpacing: '-0.5px' }}>
              🎓 Enrolled Students
            </h1>
            <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>
              View all enrolled students
            </p>
          </div>
        )}

        {activeMenu === 'settings' && (
          <div style={{ marginBottom: '28px' }}>
            <h1 style={{ fontSize: '28px', color: '#1f2937', margin: 0, fontWeight: '700', letterSpacing: '-0.5px' }}>
              ⚙️ Settings
            </h1>
            <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>
              Configure system settings
            </p>
          </div>
        )}

        {/* Dynamic Content */}
        {renderContent()}

        {/* Footer */}
        <div style={{
          marginTop: '28px',
          paddingTop: '16px',
          borderTop: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <p style={{ fontSize: '13px', color: '#9ca3af' }}>
            Nurturing Today, <strong style={{ color: '#1a56db' }}>Empowering Tomorrow</strong>
          </p>
        </div>
      </div>

      {/* ========== VIEW APPLICATION MODAL (With Approve, Decline, Edit inside) ========== */}
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
            maxWidth: '560px',
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
                onClick={() => setShowModal(false)}
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

            <div style={{ marginBottom: '16px' }}>
              <p style={{ margin: '4px 0' }}><strong>Name:</strong> {selectedApp.first_name} {selectedApp.middle_name || ''} {selectedApp.last_name} {selectedApp.suffix || ''}</p>
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
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Add remarks..."
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

            <div style={{ display: 'flex', gap: '12px', marginTop: '20px', flexWrap: 'wrap' }}>
              {/* Edit Button */}
              <button
                onClick={() => {
                  setShowModal(false);
                  handleEdit(selectedApp.application_id);
                }}
                style={{
                  flex: 1,
                  minWidth: '80px',
                  background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
                  color: 'white',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '10px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(245,158,11,0.3)',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 8px 25px rgba(245,158,11,0.4)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 15px rgba(245,158,11,0.3)';
                }}
              >
                ✏️ Edit
              </button>

              {/* Approve Button */}
              <button
                onClick={() => handleApprove(selectedApp.application_id)}
                disabled={actionLoading}
                style={{
                  flex: 1,
                  minWidth: '80px',
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
                ✅ Approve
              </button>

              {/* Decline Button */}
              <button
                onClick={() => handleDecline(selectedApp.application_id)}
                disabled={actionLoading}
                style={{
                  flex: 1,
                  minWidth: '80px',
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
                ❌ Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== EDIT MODAL ========== */}
      {showEditModal && (
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
          zIndex: 1001,
          padding: '20px',
          overflowY: 'auto'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            maxWidth: '800px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '32px',
            boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
            animation: 'fadeIn 0.3s ease'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', color: '#1f2937', margin: 0 }}>✏️ Edit Application</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditData(null);
                  setEditMessage('');
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

            {editMessage && (
              <div style={{
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '16px',
                background: editMessage.includes('✅') ? '#d1fae5' : '#fee2e2',
                color: editMessage.includes('✅') ? '#065f46' : '#991b1b',
                border: `1px solid ${editMessage.includes('✅') ? '#34d399' : '#fca5a5'}`
              }}>
                {editMessage}
              </div>
            )}

            {editLoading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                ⏳ Loading application details...
              </div>
            ) : editData ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Personal Information */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <h3 style={{ fontSize: '16px', color: '#1a56db', marginBottom: '12px', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>
                    👤 Personal Information
                  </h3>
                </div>

                <div>
                  <label style={labelStyle}>First Name *</label>
                  <input
                    type="text"
                    name="first_name"
                    value={editData.first_name || ''}
                    onChange={handleEditChange}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Middle Name</label>
                  <input
                    type="text"
                    name="middle_name"
                    value={editData.middle_name || ''}
                    onChange={handleEditChange}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Last Name *</label>
                  <input
                    type="text"
                    name="last_name"
                    value={editData.last_name || ''}
                    onChange={handleEditChange}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Suffix</label>
                  <select
                    name="suffix"
                    value={editData.suffix || ''}
                    onChange={handleEditChange}
                    style={inputStyle}
                  >
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
                  <input
                    type="date"
                    name="birth_date"
                    value={editData.birth_date || ''}
                    onChange={handleEditChange}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Gender</label>
                  <select
                    name="gender"
                    value={editData.gender || ''}
                    onChange={handleEditChange}
                    style={inputStyle}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Address</label>
                  <input
                    type="text"
                    name="address"
                    value={editData.address || ''}
                    onChange={handleEditChange}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Contact Number</label>
                  <input
                    type="text"
                    name="contact_number"
                    value={editData.contact_number || ''}
                    onChange={handleEditChange}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={editData.email || ''}
                    onChange={handleEditChange}
                    style={inputStyle}
                  />
                </div>

                {/* Parent/Guardian Information */}
                <div style={{ gridColumn: '1 / -1', marginTop: '8px' }}>
                  <h3 style={{ fontSize: '16px', color: '#1a56db', marginBottom: '12px', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>
                    👨‍👩‍👦 Parent/Guardian Information
                  </h3>
                </div>

                <div>
                  <label style={labelStyle}>Father's Name</label>
                  <input
                    type="text"
                    name="father_name"
                    value={editData.father_name || ''}
                    onChange={handleEditChange}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Father's Occupation</label>
                  <input
                    type="text"
                    name="father_occupation"
                    value={editData.father_occupation || ''}
                    onChange={handleEditChange}
                    style={inputStyle}
                  />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Father's Contact</label>
                  <input
                    type="text"
                    name="father_contact"
                    value={editData.father_contact || ''}
                    onChange={handleEditChange}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Mother's Name</label>
                  <input
                    type="text"
                    name="mother_name"
                    value={editData.mother_name || ''}
                    onChange={handleEditChange}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Mother's Occupation</label>
                  <input
                    type="text"
                    name="mother_occupation"
                    value={editData.mother_occupation || ''}
                    onChange={handleEditChange}
                    style={inputStyle}
                  />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Mother's Contact</label>
                  <input
                    type="text"
                    name="mother_contact"
                    value={editData.mother_contact || ''}
                    onChange={handleEditChange}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Guardian's Name</label>
                  <input
                    type="text"
                    name="guardian_name"
                    value={editData.guardian_name || ''}
                    onChange={handleEditChange}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Guardian's Contact</label>
                  <input
                    type="text"
                    name="guardian_contact"
                    value={editData.guardian_contact || ''}
                    onChange={handleEditChange}
                    style={inputStyle}
                  />
                </div>

                {/* Application Details */}
                <div style={{ gridColumn: '1 / -1', marginTop: '8px' }}>
                  <h3 style={{ fontSize: '16px', color: '#1a56db', marginBottom: '12px', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>
                    📄 Application Details
                  </h3>
                </div>

                <div>
                  <label style={labelStyle}>Academic Year</label>
                  <input
                    type="text"
                    name="academic_year"
                    value={editData.academic_year || ''}
                    onChange={handleEditChange}
                    style={inputStyle}
                  />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Registrar Remarks</label>
                  <textarea
                    name="registrar_remarks"
                    value={editData.registrar_remarks || ''}
                    onChange={handleEditChange}
                    style={{ ...inputStyle, minHeight: '80px' }}
                    placeholder="Enter remarks..."
                  />
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                No data found.
              </div>
            )}

            {/* Action Buttons */}
            {!editLoading && editData && (
              <div style={{ marginTop: '24px', borderTop: '2px solid #e5e7eb', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditData(null);
                    setEditMessage('');
                  }}
                  style={{
                    background: '#6b7280',
                    color: 'white',
                    border: 'none',
                    padding: '10px 24px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  style={{
                    background: saving ? '#9ca3af' : '#1a56db',
                    color: 'white',
                    border: 'none',
                    padding: '10px 24px',
                    borderRadius: '8px',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontSize: '14px'
                  }}
                >
                  {saving ? '💾 Saving...' : '💾 Save Changes'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========== ADD APPLICATION MODAL ========== */}
      {showAddModal && (
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
          padding: '20px',
          overflowY: 'auto'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            maxWidth: '700px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '32px',
            boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
            animation: 'fadeIn 0.3s ease'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', color: '#1f2937', margin: 0 }}>➕ Add Application (Walk-in)</h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setMessage('');
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

            {message && (
              <div style={{
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '16px',
                background: message.type === 'success' ? '#d1fae5' : '#fee2e2',
                color: message.type === 'success' ? '#065f46' : '#991b1b',
                border: `1px solid ${message.type === 'success' ? '#34d399' : '#fca5a5'}`
              }}>
                {message.text}
              </div>
            )}

            <form onSubmit={handleAddSubmit}>
              {/* Personal Information */}
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

              {/* Parent/Guardian */}
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

              {/* Requirements */}
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
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    flex: 1,
                    background: submitting ? '#93c5fd' : 'linear-gradient(135deg, #1a56db, #3b82f6)',
                    color: 'white',
                    border: 'none',
                    padding: '12px',
                    borderRadius: '10px',
                    fontWeight: '600',
                    fontSize: '16px',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 15px rgba(26,86,219,0.3)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!submitting) {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 8px 25px rgba(26,86,219,0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 15px rgba(26,86,219,0.3)';
                  }}
                >
                  {submitting ? 'Submitting...' : '📝 Submit Application'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setMessage('');
                  }}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    color: '#6b7280',
                    border: '1px solid #d1d5db',
                    padding: '12px',
                    borderRadius: '10px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#f3f4f6';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'transparent';
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default RegistrarDashboard;