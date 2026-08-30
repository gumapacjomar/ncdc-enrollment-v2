import React from 'react';

const DashboardCards = ({ student, application }) => {
  // Get student number (remove NCDC- prefix)
  const studentNumber = student?.student_id ? student.student_id.replace('NCDC-', '') : '------';

  // Get status info
  const getStatusInfo = (status) => {
    const statusMap = {
      pending: { label: 'Pending', color: '#f59e0b' },
      approved: { label: 'Approved', color: '#3b82f6' },
      confirmed: { label: 'Confirmed', color: '#10b981' },
      rejected: { label: 'Rejected', color: '#ef4444' },
      declined: { label: 'Declined', color: '#ef4444' }
    };
    return statusMap[status] || statusMap.pending;
  };

  const statusInfo = application ? getStatusInfo(application.status) : getStatusInfo('pending');

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '16px',
      marginBottom: '24px'
    }}>
      {/* Student Number Card */}
      <div style={{
        background: 'white',
        padding: '20px',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        border: '1px solid #e5e7eb',
        textAlign: 'center'
      }}>
        <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 8px 0' }}>Student Number</p>
        <h3 style={{ fontSize: '24px', color: '#1f2937', margin: 0 }}>
          {studentNumber}
        </h3>
      </div>

      {/* Status Card */}
      <div style={{
        background: 'white',
        padding: '20px',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        border: '1px solid #e5e7eb',
        textAlign: 'center'
      }}>
        <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 8px 0' }}>Status</p>
        <h3 style={{
          fontSize: '24px',
          margin: 0,
          color: statusInfo.color
        }}>
          {statusInfo.label}
        </h3>
      </div>

      {/* Academic Year Card */}
      <div style={{
        background: 'white',
        padding: '20px',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        border: '1px solid #e5e7eb',
        textAlign: 'center'
      }}>
        <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 8px 0' }}>Academic Year</p>
        <h3 style={{ fontSize: '24px', color: '#1f2937', margin: 0 }}>
          {application?.academic_year || '2026-2027'}
        </h3>
      </div>
    </div>
  );
};

export default DashboardCards;