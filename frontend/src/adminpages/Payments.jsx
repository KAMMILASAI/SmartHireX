import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import './AdminPayments.css';
import { FiTrash2 } from 'react-icons/fi';
import { useToast } from '../contexts/ToastContext';
import ConfirmModal from '../components/ConfirmModal';

const Payments = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(null);
  const { showSuccess, showError } = useToast();

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    id: null
  });

  const closeConfirmModal = () => setConfirmModal({ isOpen: false, id: null });

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }
      const response = await axios.get(`${API_BASE_URL}/admin/payments`, {
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        }
      });
      setList(response.data);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const deletePayment = async (paymentId) => {
    if (!window.confirm('Are you sure you want to delete this payment record?')) {
      return;
    }

    setDeleteLoading(paymentId);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }
      await axios.delete(`${API_BASE_URL}/admin/payments/${paymentId}`, {
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        }
      });
      
      // Remove from local state
      setList(prevList => prevList.filter(payment => payment._id !== paymentId));
      alert('Payment deleted successfully!');
    } catch (error) {
      console.error('Error deleting payment:', error);
      alert('Failed to delete payment. Please try again.');
    } finally {
      setDeleteLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="payments-container">
        <div className="payments-header">
          <h2>Payment Management</h2>
          <p>Loading payment records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="payments-container">
      <div className="payments-header">
        <h2>Payment Management</h2>
        <p>Manage all payment records and transactions</p>
      </div>

      {list.length === 0 ? (
        <div className="no-payments">
          <p>No payment records found.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="payments-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Amount</th>
                <th>Payment ID</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((payment) => (
                <tr key={payment._id}>
                  <td>
                    {payment.user?.name || `${payment.user?.firstName || ''} ${payment.user?.lastName || ''}`.trim() || 'Unknown User'}
                  </td>
                  <td>{payment.user?.email || 'No email'}</td>
                  <td>
                    {payment.user?.role || 'user'}
                  </td>
                  <td className="amount">₹{payment.amount}</td>
                  <td>
                    <code className="payment-id">
                      {payment.orderId || payment.paymentId?.slice(-8) || 'N/A'}
                    </code>
                  </td>
                  <td>{new Date(payment.createdAt).toLocaleDateString()}</td>
                  <td>
                    {deleteLoading === payment._id ? (
                      <span className="delete-loading">Deleting...</span>
                    ) : (
                      <span 
                        className="delete-link"
                        onClick={() => deletePayment(payment._id)}
                      >
                        Delete
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Payments;
