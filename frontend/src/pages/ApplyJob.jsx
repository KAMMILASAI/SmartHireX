import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

export default function ApplyJob() {
  const { linkId } = useParams();
  const [job, setJob] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', college: '', regNo: '', cgpa: '', skills: '' });
  const [msg, setMsg] = useState('');
  const [isError, setIsError] = useState(false);

  const normalizeDate = (val) => {
    if (!val) return null;
    if (typeof val === 'string') return new Date(val);
    if (typeof val === 'number') return new Date(val < 1e12 ? val * 1000 : val);
    try { return new Date(val); } catch { return null; }
  };

  useEffect(() => {
    setJob(null);
    setMsg('');
    setIsError(false);
    axios.get(`/api/jobs/${linkId}`)
      .then(res => {
        const j = res.data;
        const exp = j?.expiresAt ? normalizeDate(j.expiresAt) : null;
        if (exp && exp <= new Date()) {
          setMsg('This job link has expired.');
          setIsError(true);
        } else {
          setJob(j);
        }
      })
      .catch(() => {
        setMsg('Invalid or expired link');
        setIsError(true);
      });
  }, [linkId]);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        cgpa: parseFloat(form.cgpa),
        skills: form.skills.split(',').map(s => s.trim()).filter(Boolean)
      };
      await axios.post(`/api/jobs/${linkId}/apply`, payload);
      setMsg('Application submitted! Check your email for confirmation.');
      setIsError(false);
    } catch (e) {
      setMsg(e.response?.data?.message || 'Failed to apply');
      setIsError(true);
    }
  };

  if (msg && !job) return <p className="text-center mt-10 text-red-500">{msg}</p>;

  if (!job) return <p className="text-center mt-10">Loading...</p>;

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 bg-white shadow rounded">
      <h2 className="text-2xl font-semibold mb-2">{job.title}</h2>
      <p className="mb-4 text-gray-600">{job.description}</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {['name', 'email', 'college', 'regNo', 'cgpa', 'skills'].map(f => (
          <input
            key={f}
            type={f === 'cgpa' ? 'number' : 'text'}
            step="0.01"
            name={f}
            placeholder={f.charAt(0).toUpperCase() + f.slice(1)}
            value={form[f]}
            onChange={handleChange}
            required={['name', 'email'].includes(f)}
            className="w-full border px-3 py-2 rounded"
          />
        ))}
        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">Apply</button>
      </form>
      {msg && (
        <p className={`mt-4 text-center ${isError ? 'text-red-600' : 'text-green-600'}`}>{msg}</p>
      )}
    </div>
  );
}
