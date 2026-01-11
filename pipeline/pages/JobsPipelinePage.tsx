import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  DndContext, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import { 
  SortableContext, 
  verticalListSortingStrategy,
  horizontalListSortingStrategy, 
  useSortable,
  arrayMove 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  ArrowLeft, 
  Plus, 
  Briefcase, 
  Loader2,
  X,
  ExternalLink,
  Trash2,
  User,
  DollarSign,
  FileText,
  MessageSquare,
  Paperclip,
  Send,
  Upload,
  Users,
  Settings,
  Layers,
  ChevronRight,
  Mail
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';
import { 
  JobData, 
  JobStageData,
  ClientData,
  JobMember,
  JobComment,
  JobAttachment,
  ServiceData,
  SERVICE_STATUS_LABELS
} from '../types';

// ===== JOB CARD COMPONENT =====
interface JobCardProps {
  job: JobData;
  onClick: () => void;
}

const SortableJobCard: React.FC<JobCardProps> = ({ job, onClick }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: job.id,
    data: { type: 'job', job }
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="bg-slate-700/50 backdrop-blur-sm border border-slate-600/50 rounded-xl p-4 cursor-grab active:cursor-grabbing hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10 transition-all group"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
          <Briefcase className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-white truncate">{job.title}</h4>
          {job.client && (
            <p className="text-sm text-slate-400 truncate flex items-center gap-1 mt-1">
              <User className="w-3 h-3" />
              {job.client.name}
            </p>
          )}
          {job.value && (
            <p className="text-xs text-emerald-400 flex items-center gap-1 mt-1">
              <DollarSign className="w-3 h-3" />
              R$ {job.value.toLocaleString('pt-BR')}
            </p>
          )}
          {job.project_id && (
            <div className="mt-2 flex items-center gap-1 text-xs text-blue-400">
              <ExternalLink className="w-3 h-3" />
              Projeto vinculado
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ===== SORTABLE STAGE COLUMN COMPONENT =====
interface StageColumnProps {
  stage: JobStageData;
  jobs: JobData[];
  onJobClick: (job: JobData) => void;
  onDeleteColumn: (id: string) => void;
  onUpdateColumn: (stage: JobStageData) => void;
}

const SortableStageColumn: React.FC<StageColumnProps> = ({ stage, jobs, onJobClick, onDeleteColumn, onUpdateColumn }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(stage.title);
  
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: stage.id,
    data: { type: 'column', stage }
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const handleSaveTitle = () => {
    setIsEditing(false);
    if (editTitle.trim() !== stage.title && editTitle.trim()) {
      onUpdateColumn({ ...stage, title: editTitle.trim() });
    } else {
      setEditTitle(stage.title);
    }
  };

  const defaultColor = 'from-slate-600 to-slate-700';
  const colorClass = stage.color || defaultColor;

  if (isDragging) {
    return (
      <div 
        ref={setNodeRef} 
        style={style}
        className="flex-shrink-0 w-72 bg-slate-800/30 border-2 border-dashed border-emerald-500/50 rounded-2xl h-[500px]"
      />
    );
  }

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className="flex-shrink-0 w-72 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl flex flex-col max-h-full group/column"
    >
      {/* Header */}
      <div 
        {...attributes}
        {...listeners}
        className={`p-3 border-b border-slate-700/50 bg-gradient-to-r ${colorClass} rounded-t-2xl cursor-grab active:cursor-grabbing`}
        onDoubleClick={() => setIsEditing(true)}
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {isEditing ? (
              <input
                autoFocus
                className="flex-1 font-bold text-white text-sm bg-transparent outline-none border-b border-white/50"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') {
                    setEditTitle(stage.title);
                    setIsEditing(false);
                  }
                }}
                onMouseDown={(e) => e.stopPropagation()}
              />
            ) : (
              <h3 className="font-bold text-white text-sm truncate">{stage.title}</h3>
            )}
            <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full flex-shrink-0">
              {jobs.length}
            </span>
          </div>
          {!isEditing && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Tem certeza que deseja excluir a coluna "${stage.title}"? Os jobs nesta coluna também serão removidos.`)) {
                  onDeleteColumn(stage.id);
                }
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="text-white/50 hover:text-red-400 opacity-0 group-hover/column:opacity-100 transition-opacity p-1 flex-shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <SortableContext items={jobs.map(j => j.id)} strategy={verticalListSortingStrategy}>
          {jobs.map(job => (
            <SortableJobCard
              key={job.id}
              job={job}
              onClick={() => onJobClick(job)}
            />
          ))}
        </SortableContext>
        
        {jobs.length === 0 && (
          <div className="text-center py-8 text-slate-500 text-sm">
            Nenhum job
          </div>
        )}
      </div>
    </div>
  );
};

// ===== ENHANCED JOB MODAL =====
interface JobModalProps {
  isOpen: boolean;
  job: JobData | null;
  projects: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSave: (job: Partial<JobData>) => void;
  onDelete?: (id: string) => void;
  onOpenProject?: (projectId: string) => void;
}

const JobModal: React.FC<JobModalProps> = ({ isOpen, job, projects, onClose, onSave, onDelete, onOpenProject }) => {
  const navigate = useNavigate();
  const { user, isMasterAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'info' | 'members' | 'comments' | 'attachments' | 'services' | 'emails'>('info');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    value: '',
    project_id: '',
    agencia: '',
    produtora: ''
  });

  // Members state
  const [members, setMembers] = useState<JobMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [memberError, setMemberError] = useState('');

  // Comments state
  const [comments, setComments] = useState<JobComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  // Attachments state
  const [attachments, setAttachments] = useState<JobAttachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Services state
  const [services, setServices] = useState<ServiceData[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [showNewService, setShowNewService] = useState(false);
  const [newServiceName, setNewServiceName] = useState('');
  const [creatingService, setCreatingService] = useState(false);

  // Emails state (IMAP-based)
  const EMAIL_API_URL = 'http://localhost:3001/api';
  const [emails, setEmails] = useState<Array<{ uid: number; subject: string; from: string; to: string; date: string; snippet: string; hasAttachments: boolean }>>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [targetEmailAddress, setTargetEmailAddress] = useState('');
  const [selectedEmail, setSelectedEmail] = useState<{ uid: number; subject: string; from: string; fromAddress: string; to: string; cc: string; date: string; html: string; text: string } | null>(null);
  const [loadingEmailDetail, setLoadingEmailDetail] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [replySent, setReplySent] = useState(false);

  useEffect(() => {
    if (job) {
      setFormData({
        title: job.title || '',
        description: job.description || '',
        value: job.value?.toString() || '',
        project_id: job.project_id || '',
        agencia: job.agencia || '',
        produtora: job.produtora || ''
      });
      loadMembers(job.id);
      loadComments(job.id);
      loadAttachments(job.id);
      loadServices(job.id);
      loadEmails(job.title);
    } else {
      setFormData({ title: '', description: '', value: '', project_id: '', agencia: '', produtora: '' });
      setMembers([]);
      setComments([]);
      setAttachments([]);
      setServices([]);
      setEmails([]);
    }
  }, [job]);

  const loadMembers = async (jobId: string) => {
    setLoadingMembers(true);
    try {
      const { data, error } = await supabase
        .from('job_members')
        .select(`
          *,
          profiles:user_id (email, full_name)
        `)
        .eq('job_id', jobId)
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

  const loadComments = async (jobId: string) => {
    setLoadingComments(true);
    try {
      const { data, error } = await supabase
        .from('job_comments')
        .select(`
          *,
          profiles:author_id (email, full_name)
        `)
        .eq('job_id', jobId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setComments(data.map((c: any) => ({
          ...c,
          author_name: c.profiles?.full_name || c.profiles?.email || 'Unknown'
        })));
      }
    } catch (err) {
      console.error('Error loading comments:', err);
    }
    setLoadingComments(false);
  };

  const loadAttachments = async (jobId: string) => {
    setLoadingAttachments(true);
    try {
      const { data, error } = await supabase
        .from('job_attachments')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setAttachments(data);
      }
    } catch (err) {
      console.error('Error loading attachments:', err);
    }
    setLoadingAttachments(false);
  };

  const loadServices = async (jobId: string) => {
    setLoadingServices(true);
    try {
      const { data, error } = await supabase
        .from('services')
        .select(`
          *,
          projects:project_id (name)
        `)
        .eq('job_id', jobId)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setServices(data.map((s: any) => ({
          ...s,
          project_name: s.projects?.name
        })));
      }
    } catch (err) {
      console.error('Error loading services:', err);
    }
    setLoadingServices(false);
  };

  const handleAddMember = async () => {
    if (!newMemberEmail.trim() || !job) return;
    setAddingMember(true);
    setMemberError('');

    try {
      // Find user by email
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('email', newMemberEmail.trim().toLowerCase())
        .single();

      if (profileError || !profile) {
        setMemberError('Usuário não encontrado. O usuário deve se cadastrar primeiro.');
        setAddingMember(false);
        return;
      }

      // Check if already a member
      if (members.find(m => m.user_id === profile.id)) {
        setMemberError('Este usuário já é membro deste job.');
        setAddingMember(false);
        return;
      }

      // Add member
      const { data: newMember, error } = await supabase
        .from('job_members')
        .insert({
          job_id: job.id,
          user_id: profile.id,
          added_by: user?.id
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
      }
    } catch (err) {
      console.error('Error adding member:', err);
      setMemberError('Erro ao adicionar membro.');
    }
    setAddingMember(false);
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await supabase.from('job_members').delete().eq('id', memberId);
      setMembers(members.filter(m => m.id !== memberId));
    } catch (err) {
      console.error('Error removing member:', err);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !job || !user) return;

    try {
      const { data, error } = await supabase
        .from('job_comments')
        .insert({
          job_id: job.id,
          author_id: user.id,
          text: newComment.trim()
        })
        .select(`
          *,
          profiles:author_id (email, full_name)
        `)
        .single();

      if (!error && data) {
        setComments([{
          ...data,
          author_name: data.profiles?.full_name || data.profiles?.email || user.email
        }, ...comments]);
        setNewComment('');
      }
    } catch (err) {
      console.error('Error adding comment:', err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !job || !user) return;

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        
        const { data, error } = await supabase
          .from('job_attachments')
          .insert({
            job_id: job.id,
            file_name: file.name,
            file_url: base64,
            file_type: file.type,
            uploaded_by: user.id
          })
          .select()
          .single();

        if (!error && data) {
          setAttachments([data, ...attachments]);
        }
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Error uploading file:', err);
      setUploading(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      await supabase.from('job_attachments').delete().eq('id', attachmentId);
      setAttachments(attachments.filter(a => a.id !== attachmentId));
    } catch (err) {
      console.error('Error deleting attachment:', err);
    }
  };

  const handleDeleteService = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Tem certeza que deseja excluir este serviço?')) return;
    try {
      const { error } = await supabase.from('services').delete().eq('id', id);
      if (error) throw error;
      setServices(services.filter(s => s.id !== id));
    } catch (err: any) {
      console.error('Error deleting service:', err);
      alert('Erro ao excluir serviço: ' + (err.message || 'Erro desconhecido'));
    }
  };

  const handleCreateService = async () => {
    if (!newServiceName.trim() || !job || !user) return;
    setCreatingService(true);

    try {
      // First create a project for this service
      const projectSlug = newServiceName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString(36);
      
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          name: `${newServiceName} - ${job.title}`,
          slug: projectSlug,
          created_by: user.id
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Add creator as admin to the project
      await supabase.from('project_members').insert({
        project_id: project.id,
        user_id: user.id,
        role: 'admin'
      });

      // Create default columns for the project
      const defaultColumns = [
        { id: `col-${Date.now()}-1`, title: 'A FAZER', order: 0, project_id: project.id },
        { id: `col-${Date.now()}-2`, title: 'EM PROGRESSO', order: 1, project_id: project.id },
        { id: `col-${Date.now()}-3`, title: 'REVISÃO', order: 2, project_id: project.id },
        { id: `col-${Date.now()}-4`, title: 'APROVADO', order: 3, project_id: project.id }
      ];
      await supabase.from('columns').insert(defaultColumns);

      // Now create the service linked to the project
      const { data: service, error: serviceError } = await supabase
        .from('services')
        .insert({
          job_id: job.id,
          name: newServiceName.trim(),
          project_id: project.id,
          status: 'pending',
          created_by: user.id
        })
        .select()
        .single();

      if (!serviceError && service) {
        setServices([...services, { ...service, project_name: project.name }]);
        setNewServiceName('');
        setShowNewService(false);
      }
    } catch (err) {
      console.error('Error creating service:', err);
    }
    setCreatingService(false);
  };

  const handleServiceDoubleClick = (service: ServiceData) => {
    if (service.project_id) {
      navigate(`/project/${service.project_id}`);
    }
  };

  const loadEmails = async (jobTitle: string) => {
    setLoadingEmails(true);
    setEmailError('');
    setSelectedEmail(null);
    try {
      const response = await fetch(`${EMAIL_API_URL}/emails/${encodeURIComponent(jobTitle)}`);
      const data = await response.json();
      
      if (data.success) {
        setEmails(data.emails || []);
        setTargetEmailAddress(data.targetEmail || '');
      } else {
        setEmailError(data.error || 'Erro ao carregar emails');
        setEmails([]);
      }
    } catch (err) {
      console.error('Error loading emails:', err);
      setEmailError('Servidor de email não disponível. Inicie o servidor na pasta /server');
      setEmails([]);
    }
    setLoadingEmails(false);
  };

  const handleViewEmail = async (uid: number) => {
    if (!job) return;
    setLoadingEmailDetail(true);
    setSelectedEmail(null);
    setShowReplyForm(false);
    setReplyText('');
    
    try {
      const response = await fetch(`${EMAIL_API_URL}/emails/${encodeURIComponent(job.title)}/${uid}`);
      const data = await response.json();
      
      if (data.success && data.email) {
        setSelectedEmail(data.email);
      }
    } catch (err) {
      console.error('Error loading email detail:', err);
    }
    setLoadingEmailDetail(false);
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedEmail || !job) return;
    setSendingReply(true);
    setReplySent(false);
    
    try {
      const response = await fetch(`${EMAIL_API_URL}/emails/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle: job.title,
          to: selectedEmail.fromAddress,
          subject: selectedEmail.subject.startsWith('Re:') ? selectedEmail.subject : `Re: ${selectedEmail.subject}`,
          text: replyText,
          html: `<p>${replyText.replace(/\n/g, '<br>')}</p>`,
          inReplyTo: selectedEmail.uid,
          references: selectedEmail.uid
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setReplySent(true);
        setReplyText('');
        setShowReplyForm(false);
        // Reload emails list in background
        loadEmails(job.title);
      } else {
        alert('Erro ao enviar resposta: ' + (data.error || 'Erro desconhecido'));
      }
    } catch (err) {
      console.error('Error sending reply:', err);
      alert('Erro ao enviar resposta');
    }
    setSendingReply(false);
  };

  const handleCloseEmailViewer = () => {
    setSelectedEmail(null);
    setShowReplyForm(false);
    setReplyText('');
    setReplySent(false);
  };

  if (!isOpen || !job) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    onSave({
      title: formData.title,
      description: formData.description || undefined,
      value: formData.value ? parseFloat(formData.value) : undefined,
      project_id: formData.project_id || undefined,
      agencia: formData.agencia || undefined,
      produtora: formData.produtora || undefined
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-3xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-slate-700 sticky top-0 bg-slate-800 rounded-t-2xl">
          <h2 className="text-xl font-bold text-white">Editar Job</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700 overflow-x-auto">
          <button
            onClick={() => setActiveTab('info')}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === 'info' 
                ? 'text-emerald-400 border-b-2 border-emerald-400' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4 inline mr-2" />
            Info
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === 'members' 
                ? 'text-emerald-400 border-b-2 border-emerald-400' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Equipe ({members.length})
          </button>
          <button
            onClick={() => setActiveTab('comments')}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === 'comments' 
                ? 'text-emerald-400 border-b-2 border-emerald-400' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-4 h-4 inline mr-2" />
            Comentários ({comments.length})
          </button>
          <button
            onClick={() => setActiveTab('attachments')}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === 'attachments' 
                ? 'text-emerald-400 border-b-2 border-emerald-400' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Paperclip className="w-4 h-4 inline mr-2" />
            Anexos ({attachments.length})
          </button>
          <button
            onClick={() => setActiveTab('services')}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === 'services' 
                ? 'text-emerald-400 border-b-2 border-emerald-400' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4 inline mr-2" />
            Serviços ({services.length})
          </button>
          <button
            onClick={() => setActiveTab('emails')}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === 'emails' 
                ? 'text-emerald-400 border-b-2 border-emerald-400' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Mail className="w-4 h-4 inline mr-2" />
            Emails ({emails.length})
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Info Tab */}
          {activeTab === 'info' && (
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Client info */}
              {job.client && (
                <div className="bg-slate-700/50 rounded-xl p-4 border border-slate-600/50">
                  <p className="text-xs text-slate-400 mb-1">Cliente</p>
                  <p className="text-white font-medium">{job.client.name}</p>
                  {job.client.company && <p className="text-sm text-slate-400">{job.client.company}</p>}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Título *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Título do job"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Agência</label>
                  <input
                    type="text"
                    value={formData.agencia}
                    onChange={e => setFormData(prev => ({ ...prev, agencia: e.target.value }))}
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="Nome da agência"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Produtora</label>
                  <input
                    type="text"
                    value={formData.produtora}
                    onChange={e => setFormData(prev => ({ ...prev, produtora: e.target.value }))}
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="Nome da produtora"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.value}
                  onChange={e => setFormData(prev => ({ ...prev, value: e.target.value }))}
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Descrição</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                  placeholder="Descrição do job..."
                  rows={3}
                />
              </div>



              <div className="flex gap-3 pt-4">
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(job.id)}
                    className="px-4 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
                
                <button
                  type="submit"
                  className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-medium rounded-xl transition-all"
                >
                  Salvar
                </button>
              </div>
            </form>
          )}

          {/* Members Tab */}
          {activeTab === 'members' && (
            <div className="p-6">
              {/* Add Member Form */}
              <div className="mb-6 p-4 bg-slate-700/50 rounded-xl border border-slate-600/50">
                <h4 className="text-sm font-medium text-slate-300 mb-3">Adicionar Membro</h4>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={newMemberEmail}
                    onChange={e => setNewMemberEmail(e.target.value)}
                    placeholder="Email do usuário"
                    className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                  <button
                    onClick={handleAddMember}
                    disabled={addingMember || !newMemberEmail.trim()}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white rounded-lg transition-colors flex items-center gap-2 text-sm"
                  >
                    {addingMember ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Adicionar
                  </button>
                </div>
                {memberError && (
                  <p className="text-red-400 text-sm mt-2">{memberError}</p>
                )}
              </div>

              {/* Members List */}
              {loadingMembers ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                </div>
              ) : members.length === 0 ? (
                <p className="text-center text-slate-400 py-8">Nenhum membro adicionado.</p>
              ) : (
                <div className="space-y-3">
                  {members.map(member => (
                    <div key={member.id} className="flex items-center justify-between p-4 bg-slate-700/50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                          <User className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-white font-medium">{member.user_name || member.user_email}</p>
                          <p className="text-xs text-slate-400">{member.user_email}</p>
                        </div>
                      </div>
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
          )}

          {/* Comments Tab */}
          {activeTab === 'comments' && (
            <div className="p-6">
              {/* Add Comment */}
              <div className="flex gap-2 mb-6">
                <input
                  type="text"
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                  placeholder="Escreva um comentário..."
                  className="flex-1 bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                  className="px-4 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white rounded-xl transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>

              {/* Comments List */}
              {loadingComments ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-center text-slate-400 py-8">Nenhum comentário ainda.</p>
              ) : (
                <div className="space-y-4">
                  {comments.map(comment => (
                    <div key={comment.id} className="bg-slate-700/50 rounded-xl p-4">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-medium text-white">{comment.author_name}</span>
                        <span className="text-xs text-slate-400">
                          {new Date(comment.created_at).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-slate-300 text-sm">{comment.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Attachments Tab */}
          {activeTab === 'attachments' && (
            <div className="p-6">
              {/* Upload Button */}
              <div className="mb-6">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-slate-600 hover:border-emerald-500 rounded-xl text-slate-400 hover:text-emerald-400 transition-colors"
                >
                  {uploading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Upload className="w-5 h-5" />
                  )}
                  {uploading ? 'Enviando...' : 'Clique para anexar arquivo'}
                </button>
              </div>

              {/* Attachments List */}
              {loadingAttachments ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                </div>
              ) : attachments.length === 0 ? (
                <p className="text-center text-slate-400 py-8">Nenhum anexo ainda.</p>
              ) : (
                <div className="space-y-3">
                  {attachments.map(attachment => (
                    <div key={attachment.id} className="flex items-center gap-3 bg-slate-700/50 rounded-xl p-4">
                      <FileText className="w-8 h-8 text-emerald-400" />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{attachment.file_name}</p>
                        <p className="text-xs text-slate-400">
                          {new Date(attachment.created_at).toLocaleString('pt-BR')}
                        </p>
                      </div>
                      <a
                        href={attachment.file_url}
                        download={attachment.file_name}
                        className="p-2 text-emerald-400 hover:text-emerald-300"
                      >
                        <Paperclip className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => handleDeleteAttachment(attachment.id)}
                        className="p-2 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Services Tab */}
          {activeTab === 'services' && (
            <div className="p-6">
              {/* Add Service */}
              {!showNewService ? (
                <button
                  onClick={() => setShowNewService(true)}
                  className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-slate-600 hover:border-emerald-500 rounded-xl text-slate-400 hover:text-emerald-400 transition-colors mb-6"
                >
                  <Plus className="w-5 h-5" />
                  Adicionar Serviço
                </button>
              ) : (
                <div className="mb-6 p-4 bg-slate-700/50 rounded-xl border border-slate-600/50">
                  <h4 className="text-sm font-medium text-slate-300 mb-3">Novo Serviço</h4>
                  <input
                    type="text"
                    value={newServiceName}
                    onChange={e => setNewServiceName(e.target.value)}
                    placeholder="Nome do serviço (ex: Unreal Environment Creation)"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 mb-3"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setShowNewService(false); setNewServiceName(''); }}
                      className="flex-1 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleCreateService}
                      disabled={creatingService || !newServiceName.trim()}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      {creatingService ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      Criar Serviço
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    Um projeto será criado automaticamente para acompanhar este serviço.
                  </p>
                </div>
              )}

              {/* Services List */}
              {loadingServices ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                </div>
              ) : services.length === 0 ? (
                <p className="text-center text-slate-400 py-8">Nenhum serviço ainda.</p>
              ) : (
                <div className="space-y-3">
                  {services.map(service => (
                    <div 
                      key={service.id} 
                      className="bg-slate-700/50 rounded-xl p-4 hover:bg-slate-700 cursor-pointer transition-colors group"
                      onDoubleClick={() => handleServiceDoubleClick(service)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Layers className="w-5 h-5 text-emerald-400" />
                          <div>
                            <p className="text-white font-medium">{service.name}</p>
                            {service.project_name && (
                              <p className="text-xs text-slate-400">
                                Projeto: {service.project_name}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            service.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                            service.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-slate-500/20 text-slate-400'
                          }`}>
                            {SERVICE_STATUS_LABELS[service.status].pt}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteService(service.id, e);
                            }}
                            className="p-1 text-slate-400 hover:text-red-400 hover:bg-red-500/20 rounded opacity-0 group-hover:opacity-100 transition-all mr-2"
                            title="Excluir Serviço"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        Dê duplo clique para abrir o pipeline do projeto
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Emails Tab */}
          {activeTab === 'emails' && (
            <div className="p-6">
              {/* Email Address Info */}
              {targetEmailAddress && (
                <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                  <p className="text-sm text-emerald-400">
                    <Mail className="w-4 h-4 inline mr-2" />
                    Emails para: <span className="font-mono font-medium">{targetEmailAddress}</span>
                  </p>
                </div>
              )}

              {/* Refresh Button */}
              <button
                onClick={() => job && loadEmails(job.title)}
                disabled={loadingEmails}
                className="mb-4 flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors text-sm"
              >
                {loadingEmails ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                Atualizar Emails
              </button>

              {/* Error Message */}
              {emailError && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-sm text-red-400">{emailError}</p>
                </div>
              )}

              {/* Email Viewer Modal */}
              {selectedEmail && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
                  <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                    <div className="flex justify-between items-center p-4 border-b border-slate-700">
                      <h3 className="text-lg font-bold text-white truncate flex-1 mr-4">{selectedEmail.subject}</h3>
                      <button onClick={handleCloseEmailViewer} className="text-slate-400 hover:text-white">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="p-4 border-b border-slate-700 text-sm">
                      <p className="text-slate-400">De: <span className="text-white">{selectedEmail.from}</span></p>
                      <p className="text-slate-400">Para: <span className="text-white">{selectedEmail.to}</span></p>
                      {selectedEmail.cc && <p className="text-slate-400">CC: <span className="text-white">{selectedEmail.cc}</span></p>}
                      <p className="text-slate-400">Data: <span className="text-white">{new Date(selectedEmail.date).toLocaleString('pt-BR')}</span></p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                      {selectedEmail.html ? (
                        <div 
                          className="prose prose-invert prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: selectedEmail.html }}
                        />
                      ) : (
                        <pre className="text-slate-300 text-sm whitespace-pre-wrap font-sans">{selectedEmail.text}</pre>
                      )}
                    </div>
                    
                    {/* Reply Section */}
                    <div className="p-4 border-t border-slate-700">
                      {/* Success Message */}
                      {replySent && (
                        <div className="mb-3 p-3 bg-emerald-500/20 border border-emerald-500/50 rounded-lg">
                          <p className="text-sm text-emerald-400 flex items-center gap-2">
                            <Send className="w-4 h-4" />
                            Resposta enviada com sucesso!
                          </p>
                        </div>
                      )}
                      
                      {!showReplyForm ? (
                        <button
                          onClick={() => { setShowReplyForm(true); setReplySent(false); }}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          <Send className="w-4 h-4" />
                          {replySent ? 'Enviar Outra Resposta' : 'Responder'}
                        </button>
                      ) : (
                        <div className="space-y-3">
                          <textarea
                            value={replyText}
                            onChange={e => setReplyText(e.target.value)}
                            placeholder="Escreva sua resposta..."
                            rows={4}
                            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 resize-none text-sm"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => { setShowReplyForm(false); setReplyText(''); }}
                              className="flex-1 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors text-sm"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={handleSendReply}
                              disabled={sendingReply || !replyText.trim()}
                              className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                            >
                              {sendingReply ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                              Enviar Resposta
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Loading Email Detail */}
              {loadingEmailDetail && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                </div>
              )}

              {/* Emails List */}
              {loadingEmails ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                </div>
              ) : emails.length === 0 && !emailError ? (
                <p className="text-center text-slate-400 py-8">Nenhum email encontrado para este job.</p>
              ) : (
                <div className="space-y-2">
                  {emails.map(email => (
                    <div 
                      key={email.uid} 
                      onClick={() => handleViewEmail(email.uid)}
                      className="bg-slate-700/50 hover:bg-slate-700 rounded-xl p-4 cursor-pointer transition-colors group"
                    >
                      <div className="flex items-start gap-3">
                        <Mail className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-white font-medium truncate">{email.subject}</span>
                            {email.hasAttachments && (
                              <Paperclip className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-sm text-slate-400 truncate">{email.from}</p>
                          <p className="text-xs text-slate-500 truncate mt-1">{email.snippet}</p>
                          <p className="text-xs text-slate-500 mt-2">
                            {new Date(email.date).toLocaleString('pt-BR')}
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-emerald-400 transition-colors flex-shrink-0" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ===== MAIN PAGE =====
export const JobsPipelinePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isMasterAdmin } = useAuth();
  const { language } = useApp();
  
  const [jobs, setJobs] = useState<JobData[]>([]);
  const [stages, setStages] = useState<JobStageData[]>([]);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [activeJob, setActiveJob] = useState<JobData | null>(null);
  const [activeStage, setActiveStage] = useState<JobStageData | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobData | null>(null);
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  // Load stages from database
  const loadStages = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('job_stages')
        .select('*')
        .order('order', { ascending: true });

      if (error) throw error;
      setStages(data || []);
    } catch (err) {
      console.error('Error loading stages:', err);
    }
  }, []);

  // Load jobs with client data
  const loadJobs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          client:clients(*)
        `)
        .order('stage_order', { ascending: true });

      if (error) throw error;
      setJobs(data || []);
    } catch (err) {
      console.error('Error loading jobs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load projects for linking
  const loadProjects = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (err) {
      console.error('Error loading projects:', err);
    }
  }, []);

  useEffect(() => {
    loadStages();
    loadJobs();
    loadProjects();
  }, [loadStages, loadJobs, loadProjects]);

  // Get jobs by stage
  const getJobsByStage = (stageId: string) => 
    jobs.filter(j => j.stage === stageId).sort((a, b) => a.stage_order - b.stage_order);

  // Stage CRUD handlers
  const handleAddColumn = async () => {
    if (!newColumnTitle.trim()) return;
    
    const newStage: JobStageData = {
      id: `stage-${Date.now()}`,
      title: newColumnTitle.trim(),
      order: stages.length,
      color: 'from-slate-600 to-slate-700'
    };

    try {
      const { error } = await supabase
        .from('job_stages')
        .insert(newStage);
      
      if (error) throw error;
      setStages([...stages, newStage]);
      setNewColumnTitle('');
      setShowColumnModal(false);
    } catch (err) {
      console.error('Error adding column:', err);
    }
  };

  const handleDeleteColumn = async (stageId: string) => {
    try {
      await supabase.from('jobs').delete().eq('stage', stageId);
      const { error } = await supabase.from('job_stages').delete().eq('id', stageId);
      
      if (error) throw error;
      setStages(stages.filter(s => s.id !== stageId));
      setJobs(jobs.filter(j => j.stage !== stageId));
    } catch (err) {
      console.error('Error deleting column:', err);
    }
  };

  const handleUpdateColumn = async (updatedStage: JobStageData) => {
    try {
      const { error } = await supabase
        .from('job_stages')
        .update({ title: updatedStage.title, color: updatedStage.color })
        .eq('id', updatedStage.id);
      
      if (error) throw error;
      setStages(stages.map(s => s.id === updatedStage.id ? updatedStage : s));
    } catch (err) {
      console.error('Error updating column:', err);
    }
  };

  // Edit job
  const handleJobClick = (job: JobData) => {
    setSelectedJob(job);
    setModalOpen(true);
  };

  // Save job
  const handleSaveJob = async (data: Partial<JobData>) => {
    if (!selectedJob) return;
    
    try {
      const { error } = await supabase
        .from('jobs')
        .update(data)
        .eq('id', selectedJob.id);
        
      if (error) throw error;
      loadJobs();
      setModalOpen(false);
    } catch (err) {
      console.error('Error saving job:', err);
    }
  };

  // Delete job
  const handleDeleteJob = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este job?')) return;
    
    try {
      const { error } = await supabase.from('jobs').delete().eq('id', id);
      if (error) throw error;
      loadJobs();
      setModalOpen(false);
    } catch (err) {
      console.error('Error deleting job:', err);
    }
  };

  // Open project kanban
  const handleOpenProject = (projectId: string) => {
    navigate(`/project/${projectId}`);
  };

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    
    // Check if dragging a column
    const stage = stages.find(s => s.id === active.id);
    if (stage) {
      setActiveStage(stage);
      return;
    }
    
    const job = jobs.find(j => j.id === active.id);
    if (job) setActiveJob(job);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveJob = active.data.current?.type === 'job';
    const isOverJob = over.data.current?.type === 'job';
    const isOverColumn = over.data.current?.type === 'column';

    if (!isActiveJob) return;

    // Dropping a job over another job
    if (isActiveJob && isOverJob) {
      setJobs((prevJobs) => {
        const activeIndex = prevJobs.findIndex((j) => j.id === activeId);
        const overIndex = prevJobs.findIndex((j) => j.id === overId);
        const activeJobObj = prevJobs[activeIndex];
        const overJobObj = prevJobs[overIndex];

        if (activeJobObj.stage !== overJobObj.stage) {
          const updatedJob = { ...activeJobObj, stage: overJobObj.stage };
          const newJobs = [...prevJobs];
          newJobs[activeIndex] = updatedJob;
          return arrayMove(newJobs, activeIndex, overIndex);
        }

        return arrayMove(prevJobs, activeIndex, overIndex);
      });
    }

    // Dropping a job over a column
    if (isActiveJob && isOverColumn) {
      setJobs((prevJobs) => {
        const activeIndex = prevJobs.findIndex((j) => j.id === activeId);
        const activeJobObj = prevJobs[activeIndex];
        if (activeJobObj.stage !== overId) {
          const updatedJob = { ...activeJobObj, stage: overId as string };
          const newJobs = [...prevJobs];
          newJobs[activeIndex] = updatedJob;
          return newJobs;
        }
        return prevJobs;
      });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveJob(null);
    setActiveStage(null);

    if (!over) return;

    // Handle column reordering
    if (activeStage) {
      if (active.id !== over.id) {
        const oldIndex = stages.findIndex(s => s.id === active.id);
        const newIndex = stages.findIndex(s => s.id === over.id);
        
        if (newIndex !== -1) {
          const newOrder = arrayMove(stages, oldIndex, newIndex);
          setStages(newOrder);
          
          // Sync to DB
          newOrder.forEach((stage: JobStageData, idx: number) => {
            supabase.from('job_stages').update({ order: idx }).eq('id', stage.id).then();
          });
        }
      }
      return;
    }

    const draggedJob = jobs.find(j => j.id === active.id);
    if (!draggedJob) return;

    const stageJobs = getJobsByStage(draggedJob.stage);
    const newOrder = stageJobs.findIndex(j => j.id === active.id);

    try {
      // Sync the move to Supabase
      const { error } = await supabase
        .from('jobs')
        .update({ 
          stage: draggedJob.stage, 
          stage_order: newOrder 
        })
        .eq('id', draggedJob.id);

      if (error) throw error;
      // No need to loadJobs() as state is already optimistic
    } catch (err) {
      console.error('Error moving job:', err);
      loadJobs(); // Revert on error
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-xl border-b border-slate-700/50 sticky top-0 z-40">
        <div className="max-w-full mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(isMasterAdmin ? '/dashboard' : '/sales')}
                className="p-2 hover:bg-slate-700/50 rounded-xl transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-slate-400" />
              </button>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">
                  Pipeline de Jobs
                </h1>
                <p className="text-sm text-slate-400">Acompanhe o progresso dos seus jobs</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/sales')}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600/50 text-slate-300 hover:text-white font-medium rounded-xl transition-all"
            >
              <User className="w-5 h-5" />
              Ver Vendas
            </button>
          </div>
        </div>
      </header>

      {/* Board */}
      <main className="p-6 overflow-x-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={stages.map(s => s.id)} strategy={horizontalListSortingStrategy}>
            <div className="flex gap-4 min-w-max pb-6 items-start" style={{ minHeight: 'calc(100vh - 150px)' }}>
              {stages.map(stage => (
                <SortableStageColumn
                  key={stage.id}
                  stage={stage}
                  jobs={getJobsByStage(stage.id)}
                  onJobClick={handleJobClick}
                  onDeleteColumn={handleDeleteColumn}
                  onUpdateColumn={handleUpdateColumn}
                />
              ))}
              
              {/* Add Column Button */}
              <button
                onClick={() => setShowColumnModal(true)}
                className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-xl bg-slate-800/50 border border-slate-700/50 hover:bg-slate-700/50 hover:text-white text-slate-500 transition-colors"
                title="Adicionar Coluna"
              >
                <Plus className="w-6 h-6" />
              </button>
            </div>
          </SortableContext>

          <DragOverlay>
            {activeJob && (
              <div className="bg-slate-700/90 backdrop-blur-sm border border-slate-600 rounded-xl p-4 shadow-2xl rotate-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">{activeJob.title}</h4>
                    {activeJob.client && (
                      <p className="text-sm text-slate-400">{activeJob.client.name}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
            {activeStage && (
              <div className="w-72 bg-slate-800/90 backdrop-blur-sm border border-slate-600 rounded-2xl p-4 shadow-2xl rotate-2">
                <div className={`p-3 bg-gradient-to-r ${activeStage.color || 'from-slate-600 to-slate-700'} rounded-xl`}>
                  <h3 className="font-bold text-white text-sm">{activeStage.title}</h3>
                </div>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </main>

      {/* Job Modal */}
      <JobModal
        isOpen={modalOpen}
        job={selectedJob}
        projects={projects}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveJob}
        onDelete={handleDeleteJob}
        onOpenProject={handleOpenProject}
      />

      {/* Add Column Modal */}
      {showColumnModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-semibold mb-4 text-white">Nova Coluna</h3>
            <form onSubmit={(e) => { e.preventDefault(); handleAddColumn(); }}>
              <input
                autoFocus
                type="text"
                value={newColumnTitle}
                onChange={(e) => setNewColumnTitle(e.target.value)}
                placeholder="Nome da coluna"
                className="w-full px-4 py-3 rounded-xl bg-slate-700 border border-slate-600 text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => { setNewColumnTitle(''); setShowColumnModal(false); }}
                  className="px-4 py-2 rounded-xl bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                >
                  Criar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
