import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Board } from '../components/Board';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Settings, LogOut, X, Loader2, Plus, User, Trash2 } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { ProjectMember } from '../types';

// Settings Modal Component
interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, projectId, projectName }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'members'>('members');
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [memberError, setMemberError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadMembers();
    }
  }, [isOpen, projectId]);

  const loadMembers = async () => {
    setLoadingMembers(true);
    try {
      const { data, error } = await supabase
        .from('project_members')
        .select(`
          *,
          profiles:user_id (email, full_name)
        `)
        .eq('project_id', projectId)
        .order('added_at', { ascending: true });

      if (!error && data) {
        setMembers(data.map((m: any) => ({
          ...m,
          user_email: m.profiles?.email,
          user_name: m.profiles?.full_name || m.profiles?.email
        })));
      }
    } catch (err) {
      console.error('Error loading members:', err);
    }
    setLoadingMembers(false);
  };

  const handleAddMember = async () => {
    if (!newMemberEmail.trim()) return;
    setAddingMember(true);
    setMemberError('');

    try {
      // Find user
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('email', newMemberEmail.trim().toLowerCase())
        .single();

      if (profileError || !profile) {
        setMemberError('Usuário não encontrado.');
        setAddingMember(false);
        return;
      }

      if (members.find(m => m.user_id === profile.id)) {
        setMemberError('Usuário já é membro.');
        setAddingMember(false);
        return;
      }

      // Add as team member
      const { data: newMember, error } = await supabase
        .from('project_members')
        .insert({
          project_id: projectId,
          user_id: profile.id,
          role: 'team'
        })
        .select()
        .single();

      if (!error && newMember) {
        setMembers([...members, {
          ...newMember,
          user_email: profile.email,
          user_name: profile.full_name || profile.email
        }]);
        setNewMemberEmail('');
      } else {
          setMemberError('Erro ao adicionar membro (permissão insuficiente?)');
      }
    } catch (err) {
      console.error('Error adding member:', err);
      setMemberError('Erro ao adicionar membro.');
    }
    setAddingMember(false);
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      const { error } = await supabase.from('project_members').delete().eq('id', memberId);
      if (error) {
          alert('Erro ao remover membro. Você tem permissão?');
      } else {
        setMembers(members.filter(m => m.id !== memberId));
      }
    } catch (err) {
      console.error('Error removing member:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">Configurações do Projeto</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <h3 className="text-lg font-medium text-white mb-4">Equipe</h3>
          
          <div className="mb-6 p-4 bg-slate-700/50 rounded-xl border border-slate-600/50">
            <h4 className="text-sm font-medium text-slate-300 mb-3">Adicionar Membro</h4>
            <div className="flex gap-2">
              <input
                type="email"
                value={newMemberEmail}
                onChange={e => setNewMemberEmail(e.target.value)}
                placeholder="Email do usuário"
                className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <button
                onClick={handleAddMember}
                disabled={addingMember || !newMemberEmail.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white rounded-lg transition-colors flex items-center gap-2 text-sm"
              >
                {addingMember ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add
              </button>
            </div>
            {memberError && (
              <p className="text-red-400 text-sm mt-2">{memberError}</p>
            )}
          </div>

          {loadingMembers ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : members.length === 0 ? (
            <p className="text-center text-slate-400 py-8">Nenhum membro.</p>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {members.map(member => (
                <div key={member.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <User className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{member.user_name || member.user_email}</p>
                      <p className="text-xs text-slate-400">{member.role}</p>
                    </div>
                  </div>
                  {/* Allow removing others, but check permission logic in RLS */}
                  {member.user_id !== user?.id && (
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="p-2 text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const ProjectPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [projectName, setProjectName] = React.useState<string>('');
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (projectId) {
      // Fetch project details
      supabase
        .from('projects')
        .select('name')
        .eq('id', projectId)
        .single()
        .then(({ data, error }) => {
          if (!error && data) {
            setProjectName(data.name);
          }
        });
    }
  }, [projectId]);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  if (!projectId) {
    navigate('/dashboard');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-xl border-b border-slate-700/50 flex-shrink-0">
        <div className="max-w-full mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-white">VP Workflow</h1>
              {projectName && (
                <>
                  <span className="text-slate-600">/</span>
                  <h2 className="text-lg font-medium text-slate-200">{projectName}</h2>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
            <span className="text-slate-400 text-sm hidden sm:inline">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Board */}
      <main className="flex-1 overflow-hidden">
        <Board projectId={projectId} />
      </main>

      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
        projectId={projectId} 
        projectName={projectName} 
      />
    </div>
  );
};
