import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '../contexts/ToastContext';

export default function ApplyInline({ linkId, job, onClose, onSubmitted }) {
  const { showSuccess, showError, showInfo } = useToast();
  const [jobData, setJobData] = useState(job || null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    college: '',
    company: '',
    cgpa: '',
    profileType: 'student', // 'student' | 'postgraduate'
    isFresher: false,
    degree: '',
    lpa: '',
    yearsExp: ''
  });
  const [errors, setErrors] = useState({});
  const [msg, setMsg] = useState('');
  const [isError, setIsError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [applied, setApplied] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Debounced check for already applied when email changes
  useEffect(() => {
    setApplied(false);
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const res = await axios.get(`/api/jobs/${linkId}/applied`, { params: { email: form.email } });
        if (!cancelled && res?.data?.applied) {
          setApplied(true);
          setMsg('You have already applied to this job.');
          setIsError(false);
          showInfo('You have already applied to this job.');
        } else if (!cancelled) {
          // clear message if switching to a new email
          setMsg('');
        }
      } catch (err) {
        // ignore check errors; don't block applying
      }
    }, 400); // debounce
    return () => { cancelled = true; clearTimeout(t); };
  }, [form.email, linkId, showInfo]);

  // Fetch job details when not provided via props and show as dynamic cards
  useEffect(() => {
    let cancelled = false;
    const fetchJob = async () => {
      if (jobData || !linkId) return;
      try {
        const res = await axios.get(`/api/jobs/${linkId}`);
        if (!cancelled && res?.data) setJobData(res.data);
      } catch (e) {
        // non-blocking; form can still be used
      }
    };
    fetchJob();
    return () => { cancelled = true; };
  }, [jobData, linkId]);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email';
    if (form.cgpa && isNaN(parseFloat(form.cgpa))) e.cgpa = 'CGPA must be a number';
    if (form.profileType === 'student' && !form.college.trim()) e.college = 'College is required for students';
    if (form.profileType === 'postgraduate') {
      if (form.isFresher) {
        if (!form.degree.trim()) e.degree = 'Select your degree';
        if (!form.college.trim()) e.college = 'College is required';
        if (!form.cgpa.toString().trim()) e.cgpa = 'CGPA is required';
        else if (isNaN(parseFloat(form.cgpa))) e.cgpa = 'CGPA must be a number';
      } else {
        if (!form.company.trim()) e.company = 'Company is required (or mark Fresher)';
        if (!form.lpa.toString().trim()) e.lpa = 'LPA is required';
        else if (isNaN(parseFloat(form.lpa))) e.lpa = 'Enter a valid LPA';
        if (!form.yearsExp.toString().trim()) e.yearsExp = 'Years of experience is required';
        else if (isNaN(parseFloat(form.yearsExp))) e.yearsExp = 'Enter valid years';
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: undefined });
  };

  const SKILL_OPTIONS = [
    'JavaScript','TypeScript','React','Redux','Next.js','Node.js','Express','Java','Spring','Spring Boot','Hibernate','Python','Django','Flask','FastAPI','Go','C#','ASP.NET','C++','SQL','MySQL','PostgreSQL','MongoDB','Redis','GraphQL','REST','HTML','CSS','Sass','Tailwind','Bootstrap','AWS','Azure','GCP','Docker','Kubernetes','Git','CI/CD','Jest','Mocha','Cypress','Playwright','JUnit','Android','iOS','React Native'
  ];

  const addSkill = (value) => {
    const v = value.trim();
    if (!v) return;
    if (selectedSkills.includes(v)) return;
    setSelectedSkills([...selectedSkills, v]);
    setSkillInput('');
  };

  const removeSkill = (value) => {
    setSelectedSkills(selectedSkills.filter((s) => s !== value));
  };

  const handleSkillKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addSkill(skillInput);
    } else if (e.key === 'Backspace' && !skillInput && selectedSkills.length) {
      // quick remove last chip on backspace
      removeSkill(selectedSkills[selectedSkills.length - 1]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg('');
    setIsError(false);
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = {
        name: form.name,
        email: form.email,
        profileType: form.profileType,
        // student
        college: form.profileType === 'student' ? form.college : (form.profileType === 'postgraduate' && form.isFresher ? form.college : undefined),
        cgpa: form.profileType === 'student' ? (form.cgpa ? parseFloat(form.cgpa) : undefined) : (form.profileType === 'postgraduate' && form.isFresher ? (form.cgpa ? parseFloat(form.cgpa) : undefined) : undefined),
        // postgraduate specifics
        isFresher: form.profileType === 'postgraduate' ? !!form.isFresher : undefined,
        degree: form.profileType === 'postgraduate' && form.isFresher ? form.degree : undefined,
        company: form.profileType === 'postgraduate' && !form.isFresher ? form.company : undefined,
        lpa: form.profileType === 'postgraduate' && !form.isFresher ? parseFloat(form.lpa) : undefined,
        yearsExp: form.profileType === 'postgraduate' && !form.isFresher ? parseFloat(form.yearsExp) : undefined,
        skills: selectedSkills
      };
      const res = await axios.post(`/api/jobs/${linkId}/apply`, payload);
      const already = !!res?.data?.alreadyApplied;
      const successMsg = already ? 'You have already applied to this job.' : (res?.data?.message || 'Application submitted!');
      setMsg(successMsg);
      setIsError(false);
      setApplied(true);
      if (already) {
        showInfo('You have already applied to this job.');
      } else {
        showSuccess(successMsg);
      }
      if (onSubmitted) onSubmitted();
    } catch (e) {
      const m = e?.response?.data?.message || 'Failed to apply';
      setMsg(m);
      setIsError(true);
      showError(m);
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = (hasError) => `w-full px-3 py-2 rounded-lg border ${hasError ? 'border-red-300 ring-2 ring-red-200' : 'border-gray-300'} bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`;
  const labelClass = 'text-xs font-semibold text-slate-600 mb-1.5 block';
  const hintClass = 'text-[11px] text-slate-500 mt-1';

  return (
    <div className="flex justify-center items-start">
      <div className="w-full">
        {/* Header */}
        <div className="mb-4">
          <h2 className="text-xl font-extrabold text-slate-900">{(jobData && (jobData.title || jobData.role || jobData.name)) || 'Apply to job'}</h2>
          {jobData?.company && (
            <p className="text-sm text-slate-600 mt-0.5">{jobData.company}</p>
          )}
        </div>

        {/* Job details dynamic cards (if available) */}
        {jobData && (
          <div className="grid gap-3 mb-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
            {Object.entries(jobData)
              .filter(([k, v]) => !['description', 'jd', 'details', 'requirements'].includes((k || '').toLowerCase()) && v !== null && v !== undefined && k !== 'title')
              .slice(0, 12)
              .map(([k, v]) => (
                <div key={k} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{k.replace(/([A-Z])/g, ' $1')}</div>
                  <div className="text-sm text-slate-900 mt-1 break-words">
                    {Array.isArray(v) ? (
                      <div className="flex flex-wrap gap-1">
                        {v.slice(0, 8).map((item, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-[11px] font-medium">{String(item)}</span>
                        ))}
                      </div>
                    ) : (
                      <span>{String(v)}</span>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Card */}
        <div className="bg-white/90 backdrop-blur border border-slate-200 rounded-2xl shadow-md p-5">
        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full">
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
            <div>
              <label className={labelClass} htmlFor="name">Full Name</label>
              <input
                id="name"
                name="name"
                placeholder="Enter your full name"
                value={form.name}
                onChange={handleChange}
                className={inputClass(!!errors.name)}
              />
              {errors.name && <div className="text-red-600 text-xs mt-1">{errors.name}</div>}
            </div>

            <div>
              <label className={labelClass} htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="name@example.com"
                value={form.email}
                onChange={handleChange}
                className={inputClass(!!errors.email)}
              />
              {errors.email && <div className="text-red-600 text-xs mt-1">{errors.email}</div>}
            </div>

            {/* Profile Type */}
            <div className="col-span-full">
              <span className={labelClass}>Profile</span>
              <div className="flex gap-4 items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="profileType"
                    value="student"
                    checked={form.profileType === 'student'}
                    onChange={(e) => setForm({ ...form, profileType: e.target.value })}
                  />
                  Student
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="profileType"
                    value="postgraduate"
                    checked={form.profileType === 'postgraduate'}
                    onChange={(e) => setForm({ ...form, profileType: e.target.value })}
                  />
                  Post Graduate
                </label>
              </div>
            </div>

            {(form.profileType === 'student' || (form.profileType === 'postgraduate' && form.isFresher)) && (
              <div>
                <label className={labelClass} htmlFor="college">College</label>
                <input
                  id="college"
                  name="college"
                  placeholder="Your college name"
                  value={form.college}
                  onChange={handleChange}
                  className={inputClass(!!errors.college)}
                />
                {errors.college && <div className="text-red-600 text-xs mt-1">{errors.college}</div>}
              </div>
            )}

            {form.profileType === 'postgraduate' && (
              <>
                <div>
                  <span className={labelClass}>Are you a Fresher?</span>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.isFresher}
                      onChange={(e) => setForm({ ...form, isFresher: e.target.checked })}
                    />
                    Yes, I'm a fresher
                  </label>
                </div>
                {form.isFresher ? (
                  <>
                    <div>
                      <label className={labelClass} htmlFor="degree">Graduation Degree</label>
                      <select
                        id="degree"
                        name="degree"
                        value={form.degree}
                        onChange={handleChange}
                        className={`${inputClass(!!errors.degree)} bg-white`}
                      >
                        <option value="">Select degree</option>
                        <option value="BTech">BTech</option>
                        <option value="BE">BE</option>
                        <option value="MTech">MTech</option>
                        <option value="ME">ME</option>
                        <option value="BSc">BSc</option>
                        <option value="MSc">MSc</option>
                        <option value="BCA">BCA</option>
                        <option value="MCA">MCA</option>
                        <option value="MBA">MBA</option>
                        <option value="Other">Other</option>
                      </select>
                      {errors.degree && <div className="text-red-600 text-xs mt-1">{errors.degree}</div>}
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className={labelClass} htmlFor="company">Company Name</label>
                      <input
                        id="company"
                        name="company"
                        placeholder="Your current or last company"
                        value={form.company}
                        onChange={handleChange}
                        className={inputClass(!!errors.company)}
                      />
                      {errors.company && <div className="text-red-600 text-xs mt-1">{errors.company}</div>}
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="lpa">Current/Last CTC (LPA)</label>
                      <input
                        id="lpa"
                        name="lpa"
                        type="number"
                        step="0.1"
                        placeholder="e.g., 6.5"
                        value={form.lpa}
                        onChange={handleChange}
                        className={inputClass(!!errors.lpa)}
                      />
                      {errors.lpa && <div className="text-red-600 text-xs mt-1">{errors.lpa}</div>}
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="yearsExp">Years of Experience</label>
                      <input
                        id="yearsExp"
                        name="yearsExp"
                        type="number"
                        step="0.1"
                        placeholder="e.g., 2"
                        value={form.yearsExp}
                        onChange={handleChange}
                        className={inputClass(!!errors.yearsExp)}
                      />
                      {errors.yearsExp && <div className="text-red-600 text-xs mt-1">{errors.yearsExp}</div>}
                    </div>
                  </>
                )}
              </>
            )}

            {(form.profileType === 'student' || (form.profileType === 'postgraduate' && form.isFresher)) && (
              <div>
                <label className={labelClass} htmlFor="cgpa">CGPA</label>
                <input
                  id="cgpa"
                  name="cgpa"
                  type="number"
                  step="0.01"
                  placeholder="e.g., 8.2"
                  value={form.cgpa}
                  onChange={handleChange}
                  className={inputClass(!!errors.cgpa)}
                />
                {errors.cgpa && <div className="text-red-600 text-xs mt-1">{errors.cgpa}</div>}
              </div>
            )}

            {/* Skills */}
            <div className="col-span-full">
              <span className={labelClass}>Skills</span>
              <div className="flex flex-wrap gap-2 mb-2 w-full">
                {selectedSkills.map((s) => (
                  <span key={s} className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-900 border border-blue-200 px-2.5 py-1 rounded-full text-xs font-bold">
                    {s}
                    <button type="button" onClick={() => removeSkill(s)} className="text-blue-900/80 hover:text-blue-900 font-extrabold leading-none">×</button>
                  </span>
                ))}
              </div>
              <div className="relative w-full">
                <input
                  value={skillInput}
                  onChange={(e) => { setSkillInput(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  onKeyDown={handleSkillKeyDown}
                  placeholder="Type a skill and press Enter (e.g., React)"
                  className={inputClass(false)}
                />
                {showSuggestions && skillInput && (
                  <div className="absolute z-10 bg-white border border-gray-200 rounded-lg mt-1 w-full max-h-56 overflow-y-auto shadow-lg p-2 grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '6px' }}>
                    {SKILL_OPTIONS.filter(o => o.toLowerCase().includes(skillInput.toLowerCase()))
                      .slice(0, 12)
                      .map(o => (
                        <button
                          key={o}
                          type="button"
                          onMouseDown={(e) => { e.preventDefault(); addSkill(o); }}
                          className="px-2 py-1 text-xs rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 whitespace-nowrap"
                        >
                          {o}
                        </button>
                      ))}
                  </div>
                )}
              </div>
              <div className={hintClass}>Press Enter or comma to add, click a suggestion to add.</div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-2 justify-end mt-5">
            <button
              type="button"
              onClick={onClose}
              className="px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-900 hover:bg-gray-200 border border-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || applied}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold text-white ${submitting || applied ? 'bg-sky-300 cursor-not-allowed' : 'bg-sky-500 hover:bg-sky-600'}`}
            >
              {submitting ? 'Submitting…' : (applied ? 'Applied' : 'Submit Application')}
            </button>
          </div>
        </form>
        {/* Fallback inline message if toasts missed */}
        {msg && (
          <p className={`mt-3 text-center font-semibold ${isError ? 'text-red-600' : 'text-green-600'}`}>
            {msg}
          </p>
        )}
        </div>
      </div>
    </div>
  );
}
