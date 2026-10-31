'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface SkillItem {
  skillId?: number;
  skillName: string;
  category?: string;
  proficiency: 'beginner' | 'intermediate' | 'expert';
}

export default function StudentDashboard() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [allMasterSkills, setAllMasterSkills] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit Profile & Skills Modal / Inline state
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Edit form fields
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCgpa, setEditCgpa] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editEducationLevel, setEditEducationLevel] = useState('');
  const [editResumeText, setEditResumeText] = useState('');
  const [editSkills, setEditSkills] = useState<SkillItem[]>([]);

  // Add Skill inputs
  const [selectedMasterSkill, setSelectedMasterSkill] = useState('');
  const [customSkillName, setCustomSkillName] = useState('');
  const [newSkillProficiency, setNewSkillProficiency] = useState<'beginner' | 'intermediate' | 'expert'>('intermediate');

  async function loadData() {
    try {
      // 1. Get current session
      const meRes = await fetch('/api/auth/me');
      const meData = await meRes.json();
      if (!meData.authenticated) {
        setLoading(false);
        return;
      }

      const sessionUser = meData.user;
      setUser(sessionUser);

      // 2. Load candidate profile and skills from DB
      if (sessionUser.candidateId) {
        const cRes = await fetch(`/api/candidates?candidate_id=${sessionUser.candidateId}`);
        const cData = await cRes.json();
        if (cData.candidate) {
          setProfile(cData.candidate);
          setEditFullName(cData.candidate.full_name || '');
          setEditPhone(cData.candidate.phone || '');
          setEditCgpa(cData.candidate.cgpa != null ? String(cData.candidate.cgpa) : '');
          setEditCategory(cData.candidate.category || 'Data Science');
          setEditEducationLevel(cData.candidate.education_level || '');
          setEditResumeText(cData.candidate.resume_text || '');
        }
        if (cData.skills) {
          const mappedSkills: SkillItem[] = cData.skills.map((s: any) => ({
            skillId: s.skill_id,
            skillName: s.skill_name,
            category: s.category,
            proficiency: s.proficiency || 'intermediate',
          }));
          setSkills(mappedSkills);
          setEditSkills(mappedSkills);
        }
        if (cData.allSkills) {
          setAllMasterSkills(cData.allSkills);
        }

        // 3. Load applications
        const profRes = await fetch(`/api/applications?candidate_id=${sessionUser.candidateId}`);
        const profData = await profRes.json();
        if (profData.applications) setApplications(profData.applications);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const openEditor = () => {
    if (profile) {
      setEditFullName(profile.full_name || '');
      setEditPhone(profile.phone || '');
      setEditCgpa(profile.cgpa != null ? String(profile.cgpa) : '');
      setEditCategory(profile.category || 'Data Science');
      setEditEducationLevel(profile.education_level || '');
      setEditResumeText(profile.resume_text || '');
      setEditSkills([...skills]);
    }
    setIsEditing(true);
    setToast(null);
  };

  const cancelEditor = () => {
    setIsEditing(false);
  };

  const handleAddSkill = () => {
    const skillNameToAdd = customSkillName.trim() || selectedMasterSkill;
    if (!skillNameToAdd) return;

    // Check if already in list
    if (editSkills.some((s) => s.skillName.toLowerCase() === skillNameToAdd.toLowerCase())) {
      setToast({ type: 'error', message: `Skill "${skillNameToAdd}" is already in your skill set.` });
      return;
    }

    const matchedMaster = allMasterSkills.find(
      (s) => s.skill_name.toLowerCase() === skillNameToAdd.toLowerCase()
    );

    setEditSkills((prev) => [
      ...prev,
      {
        skillId: matchedMaster ? matchedMaster.skill_id : undefined,
        skillName: matchedMaster ? matchedMaster.skill_name : skillNameToAdd,
        category: matchedMaster ? matchedMaster.category : 'General',
        proficiency: newSkillProficiency,
      },
    ]);

    setSelectedMasterSkill('');
    setCustomSkillName('');
  };

  const handleRemoveSkill = (skillNameToRemove: string) => {
    setEditSkills((prev) => prev.filter((s) => s.skillName.toLowerCase() !== skillNameToRemove.toLowerCase()));
  };

  const handleSkillProficiencyChange = (
    skillName: string,
    proficiency: 'beginner' | 'intermediate' | 'expert'
  ) => {
    setEditSkills((prev) =>
      prev.map((s) => (s.skillName === skillName ? { ...s, proficiency } : s))
    );
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setToast(null);

    try {
      const payload = {
        candidateId: user.candidateId,
        fullName: editFullName,
        phone: editPhone,
        cgpa: editCgpa !== '' ? parseFloat(editCgpa) : null,
        category: editCategory,
        educationLevel: editEducationLevel,
        resumeText: editResumeText,
        skills: editSkills,
      };

      const res = await fetch('/api/candidates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to update profile');
      }

      setToast({
        type: 'success',
        message: data.message || 'Profile & skill set saved successfully!',
      });
      setIsEditing(false);
      await loadData();
    } catch (err: any) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-500">
        Loading your placement dashboard...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-slate-600 font-medium">You are not signed in as a student.</p>
        <Link
          href="/login/student"
          className="inline-block px-5 py-2.5 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 shadow-sm transition"
        >
          Sign In as Student
        </Link>
      </div>
    );
  }

  const shortlisted = applications.filter((a) => a.status === 'shortlisted').length;
  const underReview = applications.filter((a) => a.status === 'applied' || a.status === 'reviewed').length;
  const bestScore = applications.length > 0
    ? Math.round(Math.max(...applications.map((a) => a.similarity_score || 0)) * 100)
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Student Placement Portal
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
              Role: Student
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Welcome back, <strong>{profile?.full_name || user.name}</strong>
            {profile && (
              <>
                {' '}· {profile.education_level || 'Student'}
                {profile.cgpa != null && (
                  <> | CGPA: <strong className="text-blue-600">{parseFloat(profile.cgpa).toFixed(2)}</strong> / 10.0</>
                )}
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => (isEditing ? cancelEditor() : openEditor())}
            className={`px-4 py-2.5 rounded-lg text-xs font-semibold shadow-sm transition flex items-center gap-1.5 ${
              isEditing
                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            {isEditing ? '✕ Close Editor' : '✏️ Update Profile & Skills'}
          </button>

          <Link
            href="/student/jobs"
            className="px-5 py-2.5 rounded-lg bg-blue-600 text-white font-semibold text-xs sm:text-sm hover:bg-blue-700 shadow-sm transition"
          >
            Explore Openings →
          </Link>
        </div>
      </div>

      {/* Toast Feedback */}
      {toast && (
        <div
          className={`p-4 rounded-xl text-sm font-semibold border ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Profile & Skill Set Editor Panel (Accordion / Expandable) */}
      {isEditing && (
        <div className="bg-white rounded-2xl border-2 border-emerald-300 shadow-md p-6 sm:p-8 space-y-6 animate-fadeIn">
          <div className="border-b border-slate-100 pb-4 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <span>✏️</span> Edit Profile &amp; Skill Set
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Updates are executed within an atomic MySQL transaction and validated by trigger <code className="bg-slate-100 px-1 rounded text-blue-600 font-mono">trg_before_candidate_update</code>
              </p>
            </div>
            <button
              onClick={cancelEditor}
              className="text-xs text-slate-400 hover:text-slate-600 font-semibold"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-6">
            {/* Row 1: Name, Phone, CGPA */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Alice Sharma"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. 9876543210"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  CGPA (0.00 – 10.00)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.00"
                  max="10.00"
                  value={editCgpa}
                  onChange={(e) => setEditCgpa(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-blue-700"
                  placeholder="8.90"
                />
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Audit logged automatically in MySQL <code className="font-mono">audit_logs</code>
                </span>
              </div>
            </div>

            {/* Row 2: Category, Education Level */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Specialization Domain / Category
                </label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="Data Science">Data Science &amp; AI/ML</option>
                  <option value="Java Developer">Java Developer &amp; Backend</option>
                  <option value="Web Development">Web Development &amp; Full Stack</option>
                  <option value="Python Developer">Python Cloud Engineering</option>
                  <option value="Database">Database &amp; SQL Administration</option>
                  <option value="DevOps Engineer">DevOps &amp; Cloud Infrastructure</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Degree / Education Level
                </label>
                <input
                  type="text"
                  value={editEducationLevel}
                  onChange={(e) => setEditEducationLevel(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. B.Tech Computer Science"
                />
              </div>
            </div>

            {/* Skill Set Editor */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Technical Skills &amp; Proficiency ({editSkills.length} skills)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Saved in 3NF normalized bridge table <code className="bg-white px-1 border border-slate-200 rounded font-mono">candidate_skills</code>
                  </p>
                </div>
              </div>

              {/* Add New Skill Bar */}
              <div className="flex flex-col sm:flex-row gap-2 bg-white p-3 rounded-lg border border-slate-200">
                <select
                  value={selectedMasterSkill}
                  onChange={(e) => {
                    setSelectedMasterSkill(e.target.value);
                    if (e.target.value) setCustomSkillName('');
                  }}
                  className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">-- Pick from catalog (e.g. Python, SQL, Docker) --</option>
                  {allMasterSkills.map((s) => (
                    <option key={s.skill_id} value={s.skill_name}>
                      {s.skill_name} ({s.category || 'General'})
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  value={customSkillName}
                  onChange={(e) => {
                    setCustomSkillName(e.target.value);
                    if (e.target.value) setSelectedMasterSkill('');
                  }}
                  placeholder="Or type custom skill..."
                  className="sm:w-48 px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <select
                  value={newSkillProficiency}
                  onChange={(e) => setNewSkillProficiency(e.target.value as any)}
                  className="sm:w-36 px-2 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="expert">Expert</option>
                </select>

                <button
                  type="button"
                  onClick={handleAddSkill}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold transition whitespace-nowrap"
                >
                  + Add Skill
                </button>
              </div>

              {/* Current Skills List in Editor */}
              <div className="flex flex-wrap gap-2 pt-2">
                {editSkills.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No skills added yet. Use the dropdown above to add your technical skills.</p>
                ) : (
                  editSkills.map((s) => (
                    <div
                      key={s.skillName}
                      className="inline-flex items-center gap-1.5 bg-white border border-slate-300 px-2.5 py-1 rounded-lg text-xs shadow-2xs"
                    >
                      <span className="font-semibold text-slate-800">{s.skillName}</span>
                      <select
                        value={s.proficiency}
                        onChange={(e) => handleSkillProficiencyChange(s.skillName, e.target.value as any)}
                        className={`text-[11px] font-bold rounded px-1.5 py-0.5 border-0 focus:ring-1 focus:ring-blue-500 ${
                          s.proficiency === 'expert'
                            ? 'bg-emerald-100 text-emerald-800'
                            : s.proficiency === 'intermediate'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="expert">Expert</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(s.skillName)}
                        className="text-slate-400 hover:text-red-600 font-bold ml-1 text-sm"
                        title="Remove skill"
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Resume Text / Summary */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Resume Overview &amp; Project Summary
              </label>
              <textarea
                rows={4}
                value={editResumeText}
                onChange={(e) => setEditResumeText(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 font-mono text-xs"
                placeholder="Highlight key engineering projects, tools, frameworks, and problem-solving achievements..."
              />
              <span className="text-[11px] text-slate-400">
                Vectorized by ChromaDB cosine similarity engine for semantic matching against recruiter job postings.
              </span>
            </div>

            {/* Submit / Cancel Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={cancelEditor}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md transition disabled:opacity-50"
              >
                {saving ? 'Saving via Transaction...' : 'Save Profile & Skill Set'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Profile & Skill Set Overview Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>👤</span> Academic Profile &amp; Technical Skill Set
            </h2>
            <p className="text-xs text-slate-500">
              Your profile attributes and verified competencies stored in MySQL 3NF schema
            </p>
          </div>
          {!isEditing && (
            <button
              onClick={openEditor}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition"
            >
              ✏️ Edit Profile &amp; Skills
            </button>
          )}
        </div>

        {/* Profile Attributes Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <span className="text-slate-400 uppercase font-semibold text-[10px] tracking-wider block">Specialization</span>
            <span className="font-bold text-slate-800 text-sm">{profile?.category || 'General'}</span>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <span className="text-slate-400 uppercase font-semibold text-[10px] tracking-wider block">Current CGPA</span>
            <span className="font-bold text-blue-600 text-base">
              {profile?.cgpa != null ? parseFloat(profile.cgpa).toFixed(2) : 'Not specified'} <span className="text-xs text-slate-400 font-normal">/ 10.00</span>
            </span>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <span className="text-slate-400 uppercase font-semibold text-[10px] tracking-wider block">Degree / Major</span>
            <span className="font-bold text-slate-800 text-sm truncate block">{profile?.education_level || 'B.E. / B.Tech'}</span>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <span className="text-slate-400 uppercase font-semibold text-[10px] tracking-wider block">Contact Phone</span>
            <span className="font-bold text-slate-800 text-sm">{profile?.phone || 'Not provided'}</span>
          </div>
        </div>

        {/* Skills Tags */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Verified Technical Skills ({skills.length})
            </span>
            <span className="text-[11px] text-slate-400">
              Proficiency levels: Beginner • Intermediate • Expert
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {skills.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No skills listed yet. Click &quot;Edit Profile &amp; Skills&quot; to add your technical abilities.</p>
            ) : (
              skills.map((s) => (
                <span
                  key={s.skillName}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200"
                >
                  <span>{s.skillName}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                      s.proficiency === 'expert'
                        ? 'bg-emerald-100 text-emerald-800'
                        : s.proficiency === 'intermediate'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}
                  >
                    {s.proficiency}
                  </span>
                </span>
              ))
            )}
          </div>
        </div>

        {/* Resume summary snippet */}
        {profile?.resume_text && (
          <div className="space-y-1 pt-2 border-t border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Resume Profile Summary
            </span>
            <p className="text-xs text-slate-600 line-clamp-2 bg-slate-50 p-3 rounded-xl border border-slate-100 font-mono">
              {profile.resume_text}
            </p>
          </div>
        )}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Applied</span>
          <p className="text-3xl font-extrabold text-slate-900 mt-2">{applications.length}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Shortlisted</span>
          <p className="text-3xl font-extrabold text-blue-600 mt-2">{shortlisted}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Under Review</span>
          <p className="text-3xl font-extrabold text-amber-600 mt-2">{underReview}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Top Match Score</span>
          <p className="text-3xl font-extrabold text-emerald-600 mt-2">
            {bestScore != null ? `${bestScore}%` : 'N/A'}
          </p>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-900">Your Placement Applications</h2>
          <span className="text-xs text-slate-500">Filtered from 3NF Relational View</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-3">Job Role</th>
                <th className="px-6 py-3">Company</th>
                <th className="px-6 py-3">Location</th>
                <th className="px-6 py-3">Semantic Match</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {applications.length > 0 ? (
                applications.map((app) => (
                  <tr key={app.application_id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 font-semibold text-slate-900">{app.job_title}</td>
                    <td className="px-6 py-4 text-slate-600">{app.company_name}</td>
                    <td className="px-6 py-4 text-slate-500">{app.location}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full"
                            style={{ width: `${Math.round((app.similarity_score || 0) * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-slate-700">
                          {Math.round((app.similarity_score || 0) * 100)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                          app.status === 'shortlisted'
                            ? 'bg-blue-100 text-blue-800'
                            : app.status === 'hired'
                            ? 'bg-emerald-100 text-emerald-800'
                            : app.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {app.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                    No applications yet.{' '}
                    <Link href="/student/jobs" className="text-blue-600 font-semibold hover:underline">
                      Explore open roles →
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
