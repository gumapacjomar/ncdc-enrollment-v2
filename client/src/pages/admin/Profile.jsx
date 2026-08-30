import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../../services/api';

const AdminProfile = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [admin, setAdmin] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    username: '',
    employee_id: ''
  });
  const [profilePic, setProfilePic] = useState(null);
  const [profilePicPreview, setProfilePicPreview] = useState(null);

  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/login');
    } else {
      fetchAdminProfile();
    }
  }, [navigate]);

  const fetchAdminProfile = async () => {
    setLoading(true);
    try {
      const response = await API.get(`/admin/profile/${user.id}`);
      setAdmin(response.data);
      setFormData({
        first_name: response.data.first_name || '',
        last_name: response.data.last_name || '',
        email: response.data.email || '',
        username: response.data.username || '',
        employee_id: response.data.employee_id || ''
      });
      if (response.data.profile_pic) {
        setProfilePicPreview(`http://localhost:5000/uploads/profiles/${response.data.profile_pic}`);
      }
    } catch (error) {
      console.error('Error fetching admin profile:', error);
      setMessage('Failed to load profile');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProfilePicClick = () => {
    fileInputRef.current.click();
  };

  const handleProfilePicChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePic(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setMessage('');
    setMessageType('');

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('first_name', formData.first_name);
      formDataToSend.append('last_name', formData.last_name);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('employee_id', formData.employee_id);
      if (profilePic) {
        formDataToSend.append('profile_pic', profilePic);
      }

      const response = await API.put(`/admin/profile/${user.id}`, formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setMessage('✅ Profile updated successfully!');
      setMessageType('success');
      setEditMode(false);
      fetchAdminProfile();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('❌ Failed to update profile: ' + (error.response?.data?.error || 'Unknown error'));
      setMessageType('error');
    } finally {
      setUpdating(false);
    }
  };

  const handleCancel = () => {
    setEditMode(false);
    setFormData({
      first_name: admin?.first_name || '',
      last_name: admin?.last_name || '',
      email: admin?.email || '',
      username: admin?.username || '',
      employee_id: admin?.employee_id || ''
    });
    setProfilePicPreview(admin?.profile_pic ? `http://localhost:5000/uploads/profiles/${admin.profile_pic}` : null);
    setProfilePic(null);
    setMessage('');
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '24px', color: '#6b7280' }}>⏳ Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6' }}>
      {/* Navbar */}
      <nav style={{
        background: 'white',
        padding: '16px 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a56db' }}>🎓 NCDC</span>
          <span style={{ color: '#6b7280' }}>|</span>
          <span style={{ color: '#6b7280', fontWeight: '500' }}>Admin Profile</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '14px', color: '#374151' }}>
            👋 {user?.username || 'Admin'}
          </span>
          <button
            onClick={() => {
              localStorage.clear();
              navigate('/login');
            }}
            style={{
              background: '#ef4444',
              color: 'white',
              border: 'none',
              padding: '8px 20px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Logout
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 20px' }}>
        {/* Back Button */}
        <Link to="/admin/dashboard" style={{
          color: '#1a56db',
          textDecoration: 'none',
          display: 'inline-block',
          marginBottom: '20px',
          fontSize: '14px'
        }}>
          ← Back to Dashboard
        </Link>

        {/* Message */}
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

        {/* Profile Card */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          {/* Cover Photo */}
          <div style={{
            height: '150px',
            background: 'linear-gradient(135deg, #1a56db 0%, #3b82f6 100%)',
            position: 'relative'
          }} />

          {/* Profile Picture */}
          <div style={{
            position: 'relative',
            marginTop: '-60px',
            padding: '0 32px',
            display: 'flex',
            alignItems: 'flex-end',
            gap: '24px'
          }}>
            <div style={{ position: 'relative' }}>
              <div
                onClick={handleProfilePicClick}
                style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  border: '4px solid white',
                  background: '#e5e7eb',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  position: 'relative',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                }}
              >
                {profilePicPreview ? (
                  <img
                    src={profilePicPreview}
                    alt="Profile"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '48px',
                    color: '#6b7280'
                  }}>
                    👤
                  </div>
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
                  Change Photo
                </div>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleProfilePicChange}
                accept="image/*"
                style={{ display: 'none' }}
              />
            </div>

            <div style={{ paddingBottom: '16px' }}>
              <h2 style={{ fontSize: '24px', color: '#1f2937', margin: 0 }}>
                {admin?.first_name} {admin?.last_name}
              </h2>
              <p style={{ color: '#6b7280', margin: '4px 0 0' }}>
                {admin?.employee_id || 'Admin'} • {admin?.role?.charAt(0).toUpperCase() + admin?.role?.slice(1) || 'Admin'}
              </p>
            </div>
          </div>

          {/* Profile Details */}
          <div style={{ padding: '24px 32px 32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e5e7eb', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '18px', color: '#1f2937', margin: 0 }}>📋 Profile Information</h3>
              {!editMode && (
                <button
                  onClick={() => setEditMode(true)}
                  style={{
                    background: '#1a56db',
                    color: 'white',
                    border: 'none',
                    padding: '8px 20px',
                    borderRadius: '6px',
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
                  <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '4px' }}>
                    First Name
                  </label>
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
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
                  <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '4px' }}>
                    Last Name
                  </label>
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
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
                  <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '4px' }}>
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
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
                  <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '4px' }}>
                    Employee ID
                  </label>
                  <input
                    type="text"
                    name="employee_id"
                    value={formData.employee_id}
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
                  <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '4px' }}>
                    Username
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
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
                  <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '4px' }}>
                    Role
                  </label>
                  <input
                    type="text"
                    value={admin?.role?.charAt(0).toUpperCase() + admin?.role?.slice(1) || 'Admin'}
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProfile;