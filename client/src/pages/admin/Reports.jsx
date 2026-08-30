import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../../services/api';

const Reports = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    confirmed: 0,
    rejected: 0,
    declined: 0
  });
  const [monthlyData, setMonthlyData] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.role !== 'admin') {
      navigate('/login');
    }
    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await API.get('/admin/applications');
      const data = response.data || [];
      setApplications(data);
      calculateStats(data);
      calculateMonthlyData(data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    setStats({
      total: data.length,
      pending: data.filter(a => a.status === 'pending').length,
      approved: data.filter(a => a.status === 'approved').length,
      confirmed: data.filter(a => a.status === 'confirmed').length,
      rejected: data.filter(a => a.status === 'rejected').length,
      declined: data.filter(a => a.status === 'declined').length
    });
  };

  const calculateMonthlyData = (data) => {
    const months = {};
    data.forEach(app => {
      const date = new Date(app.created_at);
      const monthYear = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
      if (!months[monthYear]) {
        months[monthYear] = 0;
      }
      months[monthYear]++;
    });
    setMonthlyData(Object.entries(months).map(([month, count]) => ({ month, count })));
  };

  const filteredApplications = applications.filter(app => {
    const fullName = `${app.first_name} ${app.middle_name || ''} ${app.last_name}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) || 
                          app.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || app.status === filterStatus;
    
    let matchesDate = true;
    if (dateFrom && dateTo) {
      const appDate = new Date(app.created_at);
      const from = new Date(dateFrom);
      const to = new Date(dateTo);
      matchesDate = appDate >= from && appDate <= to;
    }
    
    return matchesSearch && matchesFilter && matchesDate;
  });

  const exportToCSV = () => {
    const headers = ['Name', 'Email', 'Contact', 'Status', 'Date', 'Registrar', 'Admin'];
    const rows = filteredApplications.map(app => [
      `${app.first_name} ${app.last_name}`,
      app.email,
      app.contact_number || 'N/A',
      app.status,
      new Date(app.created_at).toLocaleDateString(),
      app.registrar_name || 'N/A',
      app.admin_name || 'N/A'
    ]);

    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
      csv += row.join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `enrollment-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const printReport = () => {
    window.print();
  };

  const statusColors = {
    pending: { bg: '#fef3c7', text: '#92400e' },
    approved: { bg: '#dbeafe', text: '#1e40af' },
    confirmed: { bg: '#d1fae5', text: '#065f46' },
    rejected: { bg: '#fee2e2', text: '#991b1b' },
    declined: { bg: '#fef3c7', text: '#92400e' }
  };

  const statusBadge = (status) => {
    const color = statusColors[status] || statusColors.pending;
    return {
      background: color.bg,
      color: color.text,
      padding: '4px 12px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '600',
      display: 'inline-block'
    };
  };

  const statusCounts = {
    all: applications.length,
    pending: applications.filter(a => a.status === 'pending').length,
    approved: applications.filter(a => a.status === 'approved').length,
    confirmed: applications.filter(a => a.status === 'confirmed').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
    declined: applications.filter(a => a.status === 'declined').length
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6' }}>
      {/* Navbar */}
      <nav style={{
        background: 'white',
        padding: '16px 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a56db' }}>🎓 NCDC</span>
          <span style={{ color: '#6b7280' }}>|</span>
          <span style={{ color: '#6b7280', fontWeight: '500' }}>Reports</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '14px', color: '#374151' }}>
            👋 {JSON.parse(localStorage.getItem('user'))?.username || 'Admin'}
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
              fontSize: '14px'
            }}
          >
            Logout
          </button>
        </div>
      </nav>

      <div style={{ padding: '24px 32px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '28px', color: '#1f2937', margin: 0 }}>📊 Enrollment Reports</h1>
            <p style={{ color: '#6b7280', marginTop: '4px' }}>
              View and export enrollment statistics and reports
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={printReport}
              style={{
                background: '#6b7280',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              🖨️ Print
            </button>
            <button
              onClick={exportToCSV}
              style={{
                background: '#10b981',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              📥 Export CSV
            </button>
            <Link to="/admin/dashboard" style={{
              background: '#6b7280',
              color: 'white',
              padding: '10px 20px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '14px'
            }}>
              ← Back
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center',
            borderTop: '4px solid #3b82f6'
          }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1f2937' }}>{stats.total}</div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>Total</div>
          </div>
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center',
            borderTop: '4px solid #f59e0b'
          }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#d97706' }}>{stats.pending}</div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>Pending</div>
          </div>
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center',
            borderTop: '4px solid #8b5cf6'
          }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#7c3aed' }}>{stats.approved}</div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>Approved</div>
          </div>
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center',
            borderTop: '4px solid #10b981'
          }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#059669' }}>{stats.confirmed}</div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>Confirmed</div>
          </div>
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center',
            borderTop: '4px solid #ef4444'
          }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#dc2626' }}>{stats.rejected}</div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>Rejected</div>
          </div>
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center',
            borderTop: '4px solid #6b7280'
          }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#6b7280' }}>{stats.declined}</div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>Declined</div>
          </div>
        </div>

        {/* Monthly Chart */}
        {monthlyData.length > 0 && (
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '24px',
            border: '1px solid #e5e7eb'
          }}>
            <h3 style={{ fontSize: '18px', color: '#1f2937', marginBottom: '16px' }}>
              📈 Monthly Enrollment
            </h3>
            <div style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-end',
              height: '200px',
              padding: '10px 0'
            }}>
              {monthlyData.map((item, index) => {
                const maxCount = Math.max(...monthlyData.map(d => d.count));
                const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                return (
                  <div key={index} style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <div style={{
                      width: '100%',
                      background: '#1a56db',
                      height: `${height}%`,
                      minHeight: '4px',
                      borderRadius: '4px',
                      transition: 'height 0.5s',
                      position: 'relative'
                    }}>
                      <span style={{
                        position: 'absolute',
                        top: '-20px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#1f2937'
                      }}>
                        {item.count}
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: '#6b7280' }}>
                      {item.month}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Filters */}
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          marginBottom: '24px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '16px'
          }}>
            <div>
              <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  marginTop: '4px'
                }}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="confirmed">Confirmed</option>
                <option value="rejected">Rejected</option>
                <option value="declined">Declined</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>Date From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  marginTop: '4px'
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>Date To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  marginTop: '4px'
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>Search</label>
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  marginTop: '4px'
                }}
              />
            </div>
          </div>
        </div>

        {/* Applications Table */}
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', color: '#1f2937', margin: 0 }}>
              📋 Application List
              <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: 'normal', marginLeft: '8px' }}>
                ({filteredApplications.length} records)
              </span>
            </h3>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              ⏳ Loading...
            </div>
          ) : filteredApplications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              No applications found.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151' }}>#</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151' }}>Name</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151' }}>Email</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151' }}>Status</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151' }}>Date</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151' }}>Registrar</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151' }}>Admin</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApplications.map((app, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '10px', fontSize: '13px', color: '#6b7280' }}>{index + 1}</td>
                      <td style={{ padding: '10px', fontSize: '13px', color: '#1f2937', fontWeight: '500' }}>
                        {app.first_name} {app.middle_name || ''} {app.last_name} {app.suffix || ''}
                      </td>
                      <td style={{ padding: '10px', fontSize: '13px', color: '#6b7280' }}>{app.email}</td>
                      <td style={{ padding: '10px' }}>
                        <span style={statusBadge(app.status)}>
                          {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                        </span>
                      </td>
                      <td style={{ padding: '10px', fontSize: '13px', color: '#6b7280' }}>
                        {new Date(app.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '10px', fontSize: '13px', color: '#6b7280' }}>
                        {app.registrar_name || 'N/A'}
                      </td>
                      <td style={{ padding: '10px', fontSize: '13px', color: '#6b7280' }}>
                        {app.admin_name || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;