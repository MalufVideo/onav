import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Plus, LogOut, FolderKanban, Loader2, Trash2, Users, MoreVertical, TrendingUp, Briefcase } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

interface ProjectMember {
  id: string;
  user_id: string;
  role: 'admin' | 'team' | 'client';
  added_at: string;
  profiles: {
    email: string;
    full_name: string | null;
  };
}

export const DashboardPage: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [creating, setCreating] = useState(false);

  // Delete project state
  const [deleteProject, setDeleteProject] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Team management state
  const [teamProject, setTeamProject] = useState<Project | null>(null);
  const [teamMembers, setTeamMembers] = useState<ProjectMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'admin' | 'team' | 'client'>('team');
  const [addingMember, setAddingMember] = useState(false);
  const [memberError, setMemberError] = useState('');

  // Dropdown menu state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    if (openMenuId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openMenuId]);

  const loadProjects = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setProjects(data);
    }
    setLoading(false);
  };

  const createProject = async () => {
    if (!newProjectName.trim() || !user) return;
    setCreating(true);

    const slug = newProjectName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') + '-' + Date.now().toString(36);

    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        name: newProjectName,
        slug: slug,
        created_by: user.id
      })
      .select()
      .single();

    if (!error && project) {
      // Add creator as admin
      await supabase.from('project_members').insert({
        project_id: project.id,
        user_id: user.id,
        role: 'admin'
      });

      // Create default columns
      const defaultColumns = [
        { id: `col-${Date.now()}-1`, title: 'A FAZER', order: 0, project_id: project.id },
        { id: `col-${Date.now()}-2`, title: 'EM PROGRESSO', order: 1, project_id: project.id },
        { id: `col-${Date.now()}-3`, title: 'REVISÃO', order: 2, project_id: project.id },
        { id: `col-${Date.now()}-4`, title: 'APROVADO', order: 3, project_id: project.id }
      ];
      await supabase.from('columns').insert(defaultColumns);

      setProjects([project, ...projects]);
      setNewProjectName('');
      setShowNewProject(false);
    }
    setCreating(false);
  };

  const handleDeleteProject = async () => {
    if (!deleteProject) return;
    setDeleting(true);

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', deleteProject.id);

    if (!error) {
      setProjects(projects.filter(p => p.id !== deleteProject.id));
    }
    setDeleting(false);
    setDeleteProject(null);
  };

  const loadTeamMembers = async (project: Project) => {
    setTeamProject(project);
    setLoadingMembers(true);
    setMemberError('');

    const { data, error } = await supabase
      .from('project_members')
      .select(`
        id,
        user_id,
        role,
        added_at,
        profiles (
          email,
          full_name
        )
      `)
      .eq('project_id', project.id)
      .order('added_at', { ascending: true });

    if (!error && data) {
      setTeamMembers(data as unknown as ProjectMember[]);
    }
    setLoadingMembers(false);
  };

  const addTeamMember = async () => {
    if (!teamProject || !newMemberEmail.trim()) return;
    setAddingMember(true);
    setMemberError('');

    // Find user by email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('email', newMemberEmail.trim().toLowerCase())
      .single();

    if (profileError || !profile) {
      setMemberError('User not found. They must sign up first.');
      setAddingMember(false);
      return;
    }

    // Check if already a member
    const existingMember = teamMembers.find(m => m.user_id === profile.id);
    if (existingMember) {
      setMemberError('User is already a member of this project.');
      setAddingMember(false);
      return;
    }

    // Add member
    const { data: newMember, error } = await supabase
      .from('project_members')
      .insert({
        project_id: teamProject.id,
        user_id: profile.id,
        role: newMemberRole
      })
      .select(`
        id,
        user_id,
        role,
        added_at,
        profiles (
          email,
          full_name
        )
      `)
      .single();

    if (!error && newMember) {
      setTeamMembers([...teamMembers, newMember as unknown as ProjectMember]);
      setNewMemberEmail('');
      setNewMemberRole('team');
    } else {
      setMemberError('Failed to add member. Please try again.');
    }
    setAddingMember(false);
  };

  const removeMember = async (memberId: string) => {
    const { error } = await supabase
      .from('project_members')
      .delete()
      .eq('id', memberId);

    if (!error) {
      setTeamMembers(teamMembers.filter(m => m.id !== memberId));
    }
  };

  const updateMemberRole = async (memberId: string, newRole: 'admin' | 'team' | 'client') => {
    const { error } = await supabase
      .from('project_members')
      .update({ role: newRole })
      .eq('id', memberId);

    if (!error) {
      setTeamMembers(teamMembers.map(m =>
        m.id === memberId ? { ...m, role: newRole } : m
      ));
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-xl border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">VP Workflow</h1>
          <div className="flex items-center gap-4">
            <span className="text-slate-400 text-sm">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Pipeline Navigation */}
        <div className="mb-10">
          <h2 className="text-lg font-semibold text-slate-400 mb-4">Pipelines</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Sales Pipeline Card */}
            <button
              onClick={() => navigate('/leads')}
              className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 hover:from-blue-600/30 hover:to-purple-600/30 border border-blue-500/30 hover:border-blue-400/50 rounded-2xl p-6 text-left transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Pipeline de Vendas</h3>
                  <p className="text-slate-400 text-sm">Leads → Agendamentos → Apresentações → Vendas</p>
                </div>
              </div>
            </button>

            {/* Jobs Pipeline Card */}
            <button
              onClick={() => navigate('/jobs')}
              className="bg-gradient-to-br from-emerald-600/20 to-teal-600/20 hover:from-emerald-600/30 hover:to-teal-600/30 border border-emerald-500/30 hover:border-emerald-400/50 rounded-2xl p-6 text-left transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Briefcase className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Pipeline de Jobs</h3>
                  <p className="text-slate-400 text-sm">Aprovação → Contrato → Produção → Pagamento</p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Projects Section */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-semibold text-white">Projetos Criativos</h2>
          <button
            onClick={() => setShowNewProject(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Novo Projeto
          </button>
        </div>

        {/* New Project Modal */}
        {showNewProject && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-slate-700">
              <h3 className="text-xl font-semibold text-white mb-4">Create New Project</h3>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Project Name"
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowNewProject(false)}
                  className="flex-1 py-2 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createProject}
                  disabled={creating || !newProjectName.trim()}
                  className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Projects Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12">
            <FolderKanban className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No projects yet. Create your first one!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                className="bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 hover:border-slate-600 rounded-xl p-6 text-left transition-all group relative"
              >
                {/* Dropdown Menu Button */}
                <div className="absolute top-4 right-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(openMenuId === project.id ? null : project.id);
                    }}
                    className="p-1 text-slate-400 hover:text-white hover:bg-slate-600 rounded transition-colors"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                  {openMenuId === project.id && (
                    <div className="absolute right-0 mt-1 w-48 bg-slate-700 border border-slate-600 rounded-lg shadow-xl z-10">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(null);
                          loadTeamMembers(project);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-slate-200 hover:bg-slate-600 rounded-t-lg transition-colors"
                      >
                        <Users className="w-4 h-4" />
                        Manage Team
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(null);
                          setDeleteProject(project);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-slate-600 rounded-b-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete Project
                      </button>
                    </div>
                  )}
                </div>

                {/* Card Content - Clickable */}
                <button
                  onClick={() => navigate(`/project/${project.id}`)}
                  className="w-full text-left"
                >
                  <FolderKanban className="w-8 h-8 text-blue-500 mb-3 group-hover:scale-110 transition-transform" />
                  <h3 className="text-lg font-semibold text-white mb-1">{project.name}</h3>
                  <p className="text-slate-500 text-sm">
                    Created {new Date(project.created_at).toLocaleDateString()}
                  </p>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteProject && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-slate-700">
              <h3 className="text-xl font-semibold text-white mb-2">Delete Project</h3>
              <p className="text-slate-400 mb-6">
                Are you sure you want to delete <span className="text-white font-medium">"{deleteProject.name}"</span>?
                This will permanently delete all columns, cards, and team members. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteProject(null)}
                  className="flex-1 py-2 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteProject}
                  disabled={deleting}
                  className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-500 disabled:bg-red-600/50 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {deleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Team Management Modal */}
        {teamProject && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-xl p-6 w-full max-w-lg border border-slate-700 max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white">Team - {teamProject.name}</h3>
                <button
                  onClick={() => {
                    setTeamProject(null);
                    setNewMemberEmail('');
                    setMemberError('');
                  }}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Add Member Form */}
              <div className="mb-4 p-4 bg-slate-700/50 rounded-lg">
                <h4 className="text-sm font-medium text-slate-300 mb-3">Add Team Member</h4>
                <div className="flex gap-2 mb-2">
                  <input
                    type="email"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    placeholder="Email address"
                    className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <select
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value as 'admin' | 'team' | 'client')}
                    className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="admin">Admin</option>
                    <option value="team">Team</option>
                    <option value="client">Client</option>
                  </select>
                  <button
                    onClick={addTeamMember}
                    disabled={addingMember || !newMemberEmail.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white rounded-lg transition-colors flex items-center gap-2 text-sm"
                  >
                    {addingMember ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Add
                  </button>
                </div>
                {memberError && (
                  <p className="text-red-400 text-sm">{memberError}</p>
                )}
              </div>

              {/* Members List */}
              <div className="flex-1 overflow-y-auto">
                {loadingMembers ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                  </div>
                ) : teamMembers.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">No team members yet.</p>
                ) : (
                  <div className="space-y-2">
                    {teamMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">
                            {member.profiles?.full_name || member.profiles?.email || 'Unknown'}
                          </p>
                          <p className="text-slate-400 text-xs truncate">
                            {member.profiles?.email}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <select
                            value={member.role}
                            onChange={(e) => updateMemberRole(member.id, e.target.value as 'admin' | 'team' | 'client')}
                            disabled={member.user_id === user?.id}
                            className="px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                          >
                            <option value="admin">Admin</option>
                            <option value="team">Team</option>
                            <option value="client">Client</option>
                          </select>
                          {member.user_id !== user?.id && (
                            <button
                              onClick={() => removeMember(member.id)}
                              className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                              title="Remove member"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
