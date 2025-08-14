import React, { useState } from 'react';
import { Star, Send, CheckCircle } from 'lucide-react';
import { API_BASE } from '../lib/api';

const categories = [
  'Trainer Quality',
  'Course Content', 
  'Placement Tips',
  'Others'
];

export default function HomePage() {
  const [formData, setFormData] = useState({
    category: '',
    rating: 0,
    comment: ''
  });
  const [hoveredRating, setHoveredRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!formData.category || !formData.rating || !formData.comment) {
      setError('Please fill in all fields');
      return;
    }

    if (formData.comment.length < 5) {
      setError('Comment must be at least 5 characters long');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE}/api/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit feedback');
      }

      setSubmitted(true);
      setFormData({ category: '', rating: 0, comment: '' });
      
      setTimeout(() => {
        setSubmitted(false);
      }, 5000);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      setError(error instanceof Error ? error.message : 'Failed to submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRatingClick = (rating: number) => {
    setFormData({ ...formData, rating });
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h2>
          <p className="text-gray-600 mb-6">
            Your feedback has been successfully submitted to Knowledge Institute of Technology. Your input is valuable for improving our Career Development Training program.
          </p>
          <button
            onClick={() => setSubmitted(false)}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            Submit More Feedback
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-blue-900 mb-2">
            Knowledge Institute of Technology
          </h1>
          <h2 className="text-2xl md:text-3xl font-semibold text-blue-700 mb-4">
            Career Development Training
          </h2>
          <div className="mb-4">
            <p className="text-lg text-gray-700 font-medium">
              Under the guidance of <span className="text-blue-800 font-bold">Mr. Thangavel</span> and <span className="text-blue-800 font-bold">Mr. Sakthi Vel</span>
            </p>
          </div>
          <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
            Anonymous Feedback Portal
          </h3>
          <p className="text-lg text-gray-600">
            Share your honest feedback without revealing your name
          </p>
        </div>

        {/* Admin Link */}
        <div className="text-center mb-8">
          <a 
            href="/admin/login"
            className="text-blue-600 hover:text-blue-800 text-sm underline"
          >
            Admin Login
          </a>
        </div>

        {/* Feedback Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                required
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            {/* Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rating *
              </label>
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => handleRatingClick(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="focus:outline-none focus:ring-2 focus:ring-blue-500 rounded transition-all duration-150"
                  >
                    <Star
                      className={`w-8 h-8 transition-colors duration-150 ${
                        star <= (hoveredRating || formData.rating)
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-gray-300 hover:text-amber-200'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Comment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Feedback *
              </label>
              <textarea
                value={formData.comment}
                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                placeholder="Please share your detailed feedback here... (minimum 5 characters)"
                rows={5}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
                required
                minLength={5}
              />
              <p className="text-sm text-gray-500 mt-1">
                {formData.comment.length}/5 characters minimum
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 px-6 rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2 text-lg font-medium"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>Submit Feedback</span>
                </>
              )}
            </button>
          </form>

          {/* Privacy Note */}
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 text-sm">
              🔒 Your feedback is completely anonymous. We do not collect any personal information, 
              names, emails, or track IP addresses.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}