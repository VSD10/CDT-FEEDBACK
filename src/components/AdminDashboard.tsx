import React, { useState, useEffect } from 'react';
import { 
  LogOut, 
  Filter, 
  Search, 
  Calendar, 
  Star, 
  MessageSquare, 
  TrendingUp,
  Users,
  BarChart3,
  Download,
  FileText,
  Trash2
} from 'lucide-react';
import { API_BASE } from '../lib/api';

interface Feedback {
  feedback_id: string;
  category: string; // category id
  rating: number;
  comment: string;
  status?: 'open' | 'in_progress' | 'completed';
  admin_note?: string;
  timestamp: string;
}

interface Analytics {
  totalFeedback: number;
  averageRating: string;
  categoryStats: Record<string, number>;
  ratingStats: Record<string, number>;
  commonWords: Array<{ word: string; count: number }>;
}

interface AdminDashboardProps {
  onLogout: () => void;
}

export default function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: 'all',
    rating: 'all',
    status: 'all',
    search: '',
    startDate: '',
    endDate: ''
  });
  const [activeTab, setActiveTab] = useState<'feedback' | 'analytics'>('feedback');

  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchFeedback();
    fetchAnalytics();
  }, [filters]);



  const fetchCategories = async () => {
    try {
      const resp = await fetch(`${API_BASE}/api/categories`);
      if (!resp.ok) throw new Error('Failed to fetch categories');
      const data = await resp.json();
      setCategories(data);
    } catch (e) {
      console.error('Error fetching categories:', e);
    }
  };

  const fetchFeedback = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.category !== 'all') params.append('category', filters.category);
      if (filters.rating !== 'all') params.append('rating', String(filters.rating));
      if (filters.status !== 'all') params.append('status', String(filters.status));
      if (filters.search) params.append('search', filters.search);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await fetch(`${API_BASE}/api/admin/feedback?${params}`, {
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to fetch feedback');
      
      const data = await response.json();
      setFeedback(data);
    } catch (error) {
      console.error('Error fetching feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/admin/analytics`, {
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to fetch analytics');
      
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/api/admin/logout`, {
        method: 'POST',
        credentials: 'include'
      });
      onLogout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'
        }`}
      />
    ));
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllOnPage = () => {
    setSelected(prev => {
      const next = new Set(prev);
      feedback.forEach(f => next.add(f.feedback_id));
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const deleteSelected = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} selected feedback item(s)?`)) return;
    // Optimistic update: remove immediately
    const ids = Array.from(selected);
    const prev = feedback;
    setFeedback(prev => prev.filter(f => !selected.has(f.feedback_id)));
    clearSelection();
    try {
      const resp = await fetch(`${API_BASE}/api/admin/feedback/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ids })
      });
      if (!resp.ok) throw new Error('Bulk delete failed');
      // Optionally refetch to sync
      fetchFeedback();
    } catch (e) {
      console.error('Bulk delete error:', e);
      // Rollback on failure
      setFeedback(prev);
    }
  };

  const deleteOne = async (id: string) => {
    if (!confirm('Delete this feedback?')) return;
    // Optimistic update
    const prev = feedback;
    setFeedback(prev => prev.filter(f => f.feedback_id !== id));
    setSelected(s => { const n = new Set(s); n.delete(id); return n; });
    try {
      const resp = await fetch(`${API_BASE}/api/admin/feedback/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!resp.ok) throw new Error('Delete failed');
      // Sync with server
      fetchFeedback();
    } catch (e) {
      console.error('Delete error:', e);
      // Rollback on failure
      setFeedback(prev);
    }
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Category', 'Rating', 'Comment', 'Status', 'Admin Note', 'Timestamp'];
    const csvContent = [
      headers.join(','),
      ...feedback.map(f => [
        f.feedback_id,
        f.category,
        f.rating,
        `"${(f.comment || '').replace(/"/g, '""')}"`,
        f.status || 'open',
        `"${(f.admin_note || '').replace(/"/g, '""')}"`,
        f.timestamp
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `feedback-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToPDF = async () => {
    // Simple client-side PDF via print; for full PDF libs we could use jsPDF later
    const printable = document.createElement('div');
    printable.innerHTML = `
      <h1>Career Development Feedback Survey — Export</h1>
      <table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse; width:100%; font-family: Arial; font-size:12px;">
        <thead>
          <tr>
            <th>ID</th>
            <th>Category</th>
            <th>Rating</th>
            <th>Comment</th>
            <th>Status</th>
            <th>Admin Note</th>
            <th>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          ${feedback.map(f => `
            <tr>
              <td>${f.feedback_id}</td>
              <td>${f.category}</td>
              <td>${f.rating}</td>
              <td>${(f.comment || '').replace(/</g, '&lt;')}</td>
              <td>${f.status || 'open'}</td>
              <td>${(f.admin_note || '').replace(/</g, '&lt;')}</td>
              <td>${f.timestamp}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write('<html><head><title>Export PDF</title></head><body>'+ printable.innerHTML +'</body></html>');
    win.document.close();
    win.focus();
    // Let the new window render, then open print dialog
    setTimeout(() => {
      win.print();
      win.close();
    }, 300);
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-bold text-gray-900">Career Development Feedback Survey — Admin</h1>
            <div className="flex items-center space-x-4">
              <button
                onClick={exportToCSV}
                className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Download className="w-4 h-4" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={exportToPDF}
                className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <FileText className="w-4 h-4" />
                <span>Export PDF</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:text-red-800 border border-red-300 rounded-lg hover:bg-red-50"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-8 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('feedback')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'feedback'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-4 h-4" />
              <span>Feedback</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'analytics'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4" />
              <span>Analytics</span>
            </div>
          </button>
        </div>

        {activeTab === 'feedback' && (
          <>
            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Filter className="w-5 h-5 mr-2" />
                Filters
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Category Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={filters.category}
                    onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Categories</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Rating Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rating
                  </label>
                  <select
                    value={filters.rating}
                    onChange={(e) => setFilters({ ...filters, rating: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Ratings</option>
                    {[5, 4, 3, 2, 1].map((rating) => (
                      <option key={rating} value={rating}>
                        {rating} Star{rating !== 1 ? 's' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Search */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      value={filters.search}
                      onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                      placeholder="Search in comments..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Date Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    onClick={() => setFilters({ category: 'all', rating: 'all', search: '', startDate: '', endDate: '' })}
                    className="w-full px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            </div>

            {/* Feedback List */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  Feedback ({feedback.length} results)
                </h2>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={selectAllOnPage} className="px-3 py-1 text-xs border rounded">Select All</button>
                  <button type="button" onClick={clearSelection} className="px-3 py-1 text-xs border rounded">Clear</button>
                  <button type="button" onClick={deleteSelected} className="px-3 py-1 text-xs border border-red-300 text-red-600 rounded flex items-center gap-1">
                    <Trash2 className="w-3 h-3" /> Delete Selected ({selected.size})
                  </button>
                </div>
              </div>
              
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : feedback.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No feedback found matching your filters.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {feedback.map((item) => (
                    <div key={item.feedback_id} className="p-6 hover:bg-gray-50">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={selected.has(item.feedback_id)}
                            onChange={() => toggleSelect(item.feedback_id)}
                            className="rounded border-gray-300"
                          />
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {item.category}
                          </span>
                          <div className="flex items-center">
                            {renderStars(item.rating)}
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            (item.status || 'open') === 'completed' ? 'bg-green-100 text-green-800' :
                            (item.status || 'open') === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {item.status || 'open'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500 flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {formatDate(item.timestamp)}
                          </span>
                          <button onClick={() => deleteOne(item.feedback_id)} className="text-red-600 hover:text-red-800 p-2" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-gray-800 text-sm leading-relaxed">{item.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'analytics' && analytics && (
          <div className="space-y-6">
            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <Users className="w-8 h-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Feedback</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.totalFeedback}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <Star className="w-8 h-8 text-amber-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Average Rating</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.averageRating}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <TrendingUp className="w-8 h-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Most Common Rating</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {Object.entries(analytics.ratingStats)
                        .reduce((a, b) => (analytics.ratingStats[a[0]] || 0) > (analytics.ratingStats[b[0]] || 0) ? a : b, ['0', 0])[0] || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Category Breakdown */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Breakdown</h3>
                <div className="space-y-3">
                  {Object.entries(analytics.categoryStats).map(([category, count]) => (
                    <div key={category}>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">{category}</span>
                        <span className="text-gray-900 font-medium">{count}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${(count / analytics.totalFeedback) * 100}%`
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rating Distribution */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Rating Distribution</h3>
                <div className="space-y-3">
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <div key={rating}>
                      <div className="flex justify-between text-sm">
                        <div className="flex items-center">
                          <span className="text-gray-600 mr-2">{rating}</span>
                          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                        </div>
                        <span className="text-gray-900 font-medium">
                          {analytics.ratingStats[rating] || 0}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-amber-500 h-2 rounded-full"
                          style={{
                            width: `${((analytics.ratingStats[rating] || 0) / analytics.totalFeedback) * 100}%`
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Most Common Words */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Most Common Words</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {analytics.commonWords.map(({ word, count }, index) => (
                  <div key={word} className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-lg font-bold text-blue-600">#{index + 1}</p>
                    <p className="text-sm font-medium text-gray-900 capitalize">{word}</p>
                    <p className="text-xs text-gray-500">{count} times</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}