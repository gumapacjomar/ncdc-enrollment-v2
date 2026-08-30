import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../../services/api';

const StudentProfile = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [profilePic, setProfilePic] = useState(null);
  const [profilePicPreview, setProfilePicPreview] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [updating, setUpdating] = useState(false);

  // Change Password States
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordUpdating, setPasswordUpdating] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordMessageType, setPasswordMessageType] = useState('');

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
    setMessage('');
    try {
      // Use user.id (this is the users table primary key)
      const studentId = user.studentId || user.id;
      console.log('🔍 Fetching student with ID:', studentId);
      
      // If studentId is a string like "NCDC-000001", extract the number
      let finalId = studentId;
      if (typeof studentId === 'string' && studentId.includes('NCDC-')) {
        const num = studentId.replace('NCDC-', '');
        finalId = parseInt(num);
        console.log('🔍 Converted to number:', finalId);
      }
      
      const response = await API.get(`/student/profile/${finalId}`);
      console.log('✅ Student data received:', response.data);
      
      setStudent(response.data);
      setFormData(response.data);
      
      if (response.data.profile_pic) {
        setProfilePicPreview(`http://localhost:5000/uploads/profiles/${response.data.profile_pic}`);
      }
    } catch (error) {
      console.error('❌ Error fetching student profile:', error);
      console.error('❌ Error response:', error.response);
      setMessage('Failed to load profile. Please try again.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleProfilePicClick = () => {
    fileInputRef.current.click();
  };

  const handleProfilePicChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setProfilePic(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfilePicPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setMessage('');
    setMessageType('');

    try {
      await API.put(`/student/update-profile/${student.id}`, formData);

      if (profilePic) {
        const formDataToSend = new FormData();
        formDataToSend.append('profile_pic', profilePic);
        await API.post(`/student/upload-profile-pic/${student.id}`, formDataToSend, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      }

      setMessage('✅ Profile updated successfully!');
      setMessageType('success');
      setEditMode(false);
      fetchStudentData();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('❌ Error updating profile:', error);
      setMessage('❌ Failed to update profile');
      setMessageType('error');
    } finally {
      setUpdating(false);
    }
  };

  const handleCancel = () => {
    setEditMode(false);
    setFormData(student);
    setProfilePic(null);
    setProfilePicPreview(student?.profile_pic ? `http://localhost:5000/uploads/profiles/${student.profile_pic}` : null);
  };

  // ========== CHANGE PASSWORD FUNCTIONS ==========
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordUpdating(true);
    setPasswordMessage('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMessage('❌ Passwords do not match');
      setPasswordMessageType('error');
      setPasswordUpdating(false);
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordMessage('❌ Password must be at least 6 characters');
      setPasswordMessageType('error');
      setPasswordUpdating(false);
      return;
    }

    try {
      await API.post('/student/change-password', {
        userId: user.id,
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      setPasswordMessage('✅ Password changed successfully!');
      setPasswordMessageType('success');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setTimeout(() => setPasswordMessage(''), 3000);
    } catch (error) {
      setPasswordMessage(error.response?.data?.error || '❌ Failed to change password');
      setPasswordMessageType('error');
    } finally {
      setPasswordUpdating(false);
    }
  };

  const studentNumber = student?.student_id ? student.student_id.replace('NCDC-', '') : 'N/A';

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '20px', color: '#6b7280' }}>⏳ Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', fontFamily: 'Arial, sans-serif', padding: '40px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Back Button */}
        <Link to="/student/dashboard" style={{
          color: '#1a56db',
          textDecoration: 'none',
          display: 'inline-block',
          marginBottom: '20px',
          fontSize: '14px',
          fontWeight: '500'
        }}>
          ← Back to Dashboard
        </Link>

        {message && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '16px',
            background: messageType === 'success' ? '#d1fae5' : '#fee2e2',
            color: messageType === 'success' ? '#065f46' : '#991b1b',
            border: `1px solid ${messageType === 'success' ? '#34d399' : '#fca5a5'}`
          }}>
            {message}
          </div>
        )}

        <div style={{
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          overflow: 'hidden',
          border: '1px solid #e5e7eb'
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #1a56db 0%, #3b82f6 100%)',
            padding: '40px 32px 20px',
            color: 'white',
            position: 'relative'
          }}>
            <div style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              width: '150px',
              height: '150px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.05)'
            }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div 
                onClick={handleProfilePicClick}
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px',
                  fontWeight: 'bold',
                  border: '3px solid rgba(255,255,255,0.3)',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  position: 'relative'
                }}
              >
                {profilePicPreview ? (
                  <img 
                    src={profilePicPreview} 
                    alt="Profile" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  student?.first_name?.charAt(0) || 'S'
                )}
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: 'rgba(0,0,0,0.5)',
                  color: 'white',
                  fontSize: '10px',
                  padding: '4px',
                  textAlign: 'center'
                }}>
                  Change
                </div>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleProfilePicChange}
                accept="image/*"
                style={{ display: 'none' }}
              />
              <div>
                <h1 style={{ fontSize: '24px', margin: 0, fontWeight: '700' }}>
                  {student?.first_name} {student?.last_name}
                </h1>
                <p style={{ opacity: 0.8, margin: '4px 0 0' }}>Student</p>
                <p style={{ opacity: 0.7, fontSize: '14px', margin: '2px 0 0' }}>
                  Student ID: <strong style={{ color: '#fcd34d' }}>{student?.student_id || 'N/A'}</strong>
                </p>
                <p style={{ opacity: 0.6, fontSize: '13px', margin: '2px 0 0' }}>
                  Student Number: {studentNumber}
                </p>
              </div>
            </div>
          </div>

          {/* Profile Details */}
          <div style={{ padding: '32px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: '1px solid #e5e7eb',
              paddingBottom: '12px'
            }}>
              <h2 style={{ fontSize: '18px', color: '#1f2937', margin: 0 }}>
                📋 Profile Information
              </h2>
              {!editMode && (
                <button
                  onClick={() => setEditMode(true)}
                  style={{
                    background: '#1a56db',
                    color: 'white',
                    border: 'none',
                    padding: '8px 20px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  ✏️ Edit Profile
                </button>
              )}
            </div>

            <form onSubmit={handleUpdateProfile}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '4px' }}>
                    Student ID
                  </label>
                  <input
                    type="text"
                    value={student?.student_id || 'N/A'}
                    disabled
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#f3f4f6',
                      color: '#6b7280'
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '4px' }}>
                    Student Number
                  </label>
                  <input
                    type="text"
                    value={studentNumber}
                    disabled
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#f3f4f6',
                      color: '#6b7280'
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '4px' }}>
                    Username
                  </label>
                  <input
                    type="text"
                    value={user?.username || ''}
                    disabled
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#f3f4f6',
                      color: '#6b7280'
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '4px' }}>
                    First Name
                  </label>
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name || ''}
                    onChange={handleInputChange}
                    disabled={!editMode}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: editMode ? 'white' : '#f3f4f6'
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '4px' }}>
                    Last Name
                  </label>
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name || ''}
                    onChange={handleInputChange}
                    disabled={!editMode}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: editMode ? 'white' : '#f3f4f6'
                    }}
                  />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '4px' }}>
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email || ''}
                    onChange={handleInputChange}
                    disabled={!editMode}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: editMode ? 'white' : '#f3f4f6'
                    }}
                  />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '4px' }}>
                    Role
                  </label>
                  <input
                    type="text"
                    value="Student"
                    disabled
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#f3f4f6',
                      color: '#6b7280'
                    }}
                  />
                </div>
              </div>

              {editMode && (
                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                  <button
                    type="submit"
                    disabled={updating}
                    style={{
                      flex: 1,
                      background: updating ? '#93c5fd' : '#10b981',
                      color: 'white',
                      border: 'none',
                      padding: '10px',
                      borderRadius: '8px',
                      fontWeight: '600',
                      cursor: updating ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {updating ? 'Saving...' : '💾 Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    style={{
                      flex: 1,
                      background: 'transparent',
                      color: '#6b7280',
                      border: '1px solid #d1d5db',
                      padding: '10px',
                      borderRadius: '8px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </form>

            {/* ========== CHANGE PASSWORD SECTION ========== */}
            <div style={{
              marginTop: '24px',
              paddingTop: '20px',
              borderTop: '2px solid #e5e7eb'
            }}>
              <h3 style={{ fontSize: '18px', color: '#1f2937', marginBottom: '4px' }}>
                🔑 Change Password
              </h3>
              <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '16px' }}>
                Update your password for security purposes.
              </p>

              {passwordMessage && (
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  background: passwordMessageType === 'success' ? '#d1fae5' : '#fee2e2',
                  color: passwordMessageType === 'success' ? '#065f46' : '#991b1b',
                  border: `1px solid ${passwordMessageType === 'success' ? '#34d399' : '#fca5a5'}`
                }}>
                  {passwordMessage}
                </div>
              )}

              <form onSubmit={handleChangePassword}>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '4px'
                  }}>
                    Current Password
                  </label>
                  <input
                    type="password"
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    placeholder="Enter current password"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#1a56db'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                  />
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '4px'
                  }}>
                    New Password
                  </label>
                  <input
                    type="password"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    placeholder="Enter new password (min 6 characters)"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#1a56db'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '4px'
                  }}>
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    placeholder="Confirm new password"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#1a56db'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                  />
                </div>

                <button
                  type="submit"
                  disabled={passwordUpdating}
                  style={{
                    width: '100%',
                    background: passwordUpdating ? '#93c5fd' : '#1a56db',
                    color: 'white',
                    border: 'none',
                    padding: '10px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    fontSize: '14px',
                    cursor: passwordUpdating ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!passwordUpdating) e.target.style.background = '#1e40af';
                  }}
                  onMouseLeave={(e) => {
                    if (!passwordUpdating) e.target.style.background = '#1a56db';
                  }}
                >
                  {passwordUpdating ? 'Updating...' : '🔄 Change Password'}
                </button>
              </form>
            </div>

            {/* Account Info */}
            <div style={{
              marginTop: '20px',
              paddingTop: '16px',
              borderTop: '1px solid #e5e7eb'
            }}>
              <h4 style={{ fontSize: '14px', color: '#374151', marginBottom: '8px' }}>
                🕐 Account Information
              </h4>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0' }}>
                <strong>Created:</strong> {student?.created_at ? new Date(student.created_at).toLocaleDateString() : 'N/A'}
              </p>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0' }}>
                <strong>Last Login:</strong> {user?.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;