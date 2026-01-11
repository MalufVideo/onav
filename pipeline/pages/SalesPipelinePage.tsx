import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  useDroppable,
} from '@dnd-kit/core';
import { 
  SortableContext, 
  verticalListSortingStrategy,
  horizontalListSortingStrategy, 
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  ArrowLeft, 
  Plus, 
  User, 
  Phone, 
  Mail, 
  Building2, 
  Loader2,
  X,
  Trash2,
  MessageSquare,
  Paperclip,
  Send,
  Upload,
  FileText,
  PlusCircle,
  Settings,
  Briefcase,
  Users,
  GripVertical,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';
import { 
  ClientData, 
  SalesStageData,
  ClientType, 
  CLIENT_TYPE_LABELS,
  ClientComment,
  ClientAttachment,
  ClientMember,
  JobData,
} from '../types';

// ===== CLIENT CARD COMPONENT =====
interface ClientCardProps {
  client: ClientData;
  onClick: () => void;
}

const SortableClientCard: React.FC<ClientCardProps> = ({ client, onClick }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: client.id,
    data: { type: 'client', client, stage: client.stage }
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const clientTypeColor: Record<ClientType, string> = {
    agencia: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    produtora: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    anunciante: 'bg-amber-500/20 text-amber-400 border-amber-500/30'
  };

  // Show placeholder when dragging
  if (isDragging) {
    return (
      <div 
        ref={setNodeRef} 
        style={style} 
        className="bg-slate-700/30 backdrop-blur-sm border-2 border-dashed border-blue-500/50 rounded-xl p-4 h-[80px]"
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="bg-slate-700/50 backdrop-blur-sm border border-slate-600/50 rounded-xl p-4 cursor-grab active:cursor-grabbing hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all group"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
          <User className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-white truncate">{client.name}</h4>
          {client.client_type && (
            <span className={`text-xs px-2 py-0.5 rounded-full border ${clientTypeColor[client.client_type]} inline-block mt-1`}>
              {CLIENT_TYPE_LABELS[client.client_type].pt}
            </span>
          )}
          {client.company && (
            <p className="text-sm text-slate-400 truncate flex items-center gap-1 mt-1">
              <Building2 className="w-3 h-3" />
              {client.company}
            </p>
          )}
          {client.email && (
            <p className="text-xs text-slate-500 truncate flex items-center gap-1 mt-1">
              <Mail className="w-3 h-3" />
              {client.email}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// ===== SORTABLE STAGE COLUMN =====
interface StageColumnProps {
  stage: SalesStageData;
  clients: ClientData[];
  onAddClient: () => void;
  onClientClick: (client: ClientData) => void;
  onDeleteColumn: (id: string) => void;
  onUpdateColumn: (stage: SalesStageData) => void;
  isFirstColumn?: boolean;
}

const SortableStageColumn: React.FC<StageColumnProps> = ({ 
  stage, 
  clients, 
  onAddClient, 
  onClientClick, 
  onDeleteColumn,
  onUpdateColumn,
  isFirstColumn 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(stage.title);
  
  // Make the column sortable and droppable
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
        className="flex-shrink-0 w-80 bg-slate-800/30 border-2 border-dashed border-blue-500/50 rounded-2xl h-[500px]"
      />
    );
  }

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className="flex-shrink-0 w-80 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl flex flex-col max-h-full group/column"
    >
      {/* Header */}
      <div 
        {...attributes}
        {...listeners}
        className={`p-4 border-b border-slate-700/50 bg-gradient-to-r ${colorClass} rounded-t-2xl cursor-grab active:cursor-grabbing`}
        onDoubleClick={() => setIsEditing(true)}
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {isEditing ? (
              <input
                autoFocus
                className="flex-1 font-bold text-white bg-transparent outline-none border-b border-white/50"
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
              <h3 className="font-bold text-white truncate">{stage.title}</h3>
            )}
            <span className="bg-white/20 text-white text-sm px-2 py-0.5 rounded-full flex-shrink-0">
              {clients.length}
            </span>
          </div>
          {!isEditing && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Tem certeza que deseja excluir a coluna "${stage.title}"? Os clientes nesta coluna também serão removidos.`)) {
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
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[200px]">
        <SortableContext items={clients.map(c => c.id)} strategy={verticalListSortingStrategy}>
          {clients.map(client => (
            <SortableClientCard
              key={client.id}
              client={client}
              onClick={() => onClientClick(client)}
            />
          ))}
        </SortableContext>
        
        {clients.length === 0 && (
          <div className="text-center py-8 text-slate-500 text-sm">
            Nenhum cliente
          </div>
        )}
      </div>

      {/* Add Button - only on first column */}
      {isFirstColumn && (
        <div className="p-3 border-t border-slate-700/50">
          <button
            onClick={onAddClient}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600/50 rounded-xl text-slate-300 hover:text-white transition-colors"
          >
            <Plus className="w-4 h-4" />
            Adicionar Lead
          </button>
        </div>
      )}
    </div>
  );
};

// ===== ENHANCED CLIENT MODAL WITH JOB CREATION =====
interface ClientModalProps {
  isOpen: boolean;
  client: ClientData | null;
  onClose: () => void;
  onSave: (client: Partial<ClientData>) => void;
  onDelete?: (id: string) => void;
  onJobCreated?: () => void;
}

const ClientModal: React.FC<ClientModalProps> = ({ isOpen, client, onClose, onSave, onDelete, onJobCreated }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'info' | 'jobs' | 'members' | 'comments' | 'attachments'>('info');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    notes: '',
    client_type: '' as ClientType | '',
    custom_fields: {} as Record<string, string>
  });

  // Jobs state
  const [jobs, setJobs] = useState<JobData[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [showNewJob, setShowNewJob] = useState(false);
  const [newJobTitle, setNewJobTitle] = useState('');
  const [newJobValue, setNewJobValue] = useState('');
  const [creatingJob, setCreatingJob] = useState(false);

  // Comments state
  const [comments, setComments] = useState<ClientComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  // Attachments state
  const [attachments, setAttachments] = useState<ClientAttachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Custom fields state
  const [newFieldKey, setNewFieldKey] = useState('');
  const [showAddField, setShowAddField] = useState(false);

  // Members state
  const [members, setMembers] = useState<ClientMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [memberError, setMemberError] = useState('');

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name || '',
        email: client.email || '',
        phone: client.phone || '',
        company: client.company || '',
        notes: client.notes || '',
        client_type: client.client_type || '',
        custom_fields: client.custom_fields || {}
      });
      loadJobs(client.id);
      loadComments(client.id);
      loadAttachments(client.id);
      loadMembers(client.id);
    } else {
      setFormData({ name: '', email: '', phone: '', company: '', notes: '', client_type: '', custom_fields: {} });
      setJobs([]);
      setComments([]);
      setAttachments([]);
      setMembers([]);
    }
    setActiveTab('info');
  }, [client]);

  const loadJobs = async (clientId: string) => {
    setLoadingJobs(true);
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setJobs(data);
      }
    } catch (err) {
      console.error('Error loading jobs:', err);
    }
    setLoadingJobs(false);
  };

  const loadComments = async (clientId: string) => {
    setLoadingComments(true);
    try {
      const { data, error } = await supabase
        .from('client_comments')
        .select(`
          *,
          profiles:author_id (email, full_name)
        `)
        .eq('client_id', clientId)
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

  const loadAttachments = async (clientId: string) => {
    setLoadingAttachments(true);
    try {
      const { data, error } = await supabase
        .from('client_attachments')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setAttachments(data);
      }
    } catch (err) {
      console.error('Error loading attachments:', err);
    }
    setLoadingAttachments(false);
  };

  const loadMembers = async (clientId: string) => {
    setLoadingMembers(true);
    try {
      const { data, error } = await supabase
        .from('client_members')
        .select(`
          *,
          profiles:user_id (email, full_name)
        `)
        .eq('client_id', clientId)
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
    if (!newMemberEmail.trim() || !client) return;
    setAddingMember(true);
    setMemberError('');

    try {
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

      const { data: newMember, error } = await supabase
        .from('client_members')
        .insert({
          client_id: client.id,
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
      await supabase.from('client_members').delete().eq('id', memberId);
      setMembers(members.filter(m => m.id !== memberId));
    } catch (err) {
      console.error('Error removing member:', err);
    }
  };

  const handleCreateJob = async () => {
    if (!newJobTitle.trim() || !client || !user) return;
    setCreatingJob(true);

    try {
      const { data: job, error } = await supabase
        .from('jobs')
        .insert({
          client_id: client.id,
          title: newJobTitle.trim(),
          value: newJobValue ? parseFloat(newJobValue) : null,
          stage: 'aprovacao',
          stage_order: 0,
          created_by: user.id
        })
        .select()
        .single();

      if (!error && job) {
        setJobs([job, ...jobs]);
        setNewJobTitle('');
        setNewJobValue('');
        setShowNewJob(false);
        onJobCreated?.();
      }
    } catch (err) {
      console.error('Error creating job:', err);
    }
    setCreatingJob(false);
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !client || !user) return;

    try {
      const { data, error } = await supabase
        .from('client_comments')
        .insert({
          client_id: client.id,
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
    if (!file || !client || !user) return;

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        
        const { data, error } = await supabase
          .from('client_attachments')
          .insert({
            client_id: client.id,
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
      await supabase.from('client_attachments').delete().eq('id', attachmentId);
      setAttachments(attachments.filter(a => a.id !== attachmentId));
    } catch (err) {
      console.error('Error deleting attachment:', err);
    }
  };

  const handleDeleteJob = async (id: string, e: React.MouseEvent) => {
    console.log('🗑️ Delete button clicked for job:', id);
    e.stopPropagation();
    console.log('📍 About to show confirm dialog');
    if (!confirm('Tem certeza que deseja excluir este job?')) {
      console.log('❌ User cancelled deletion');
      return;
    }
    console.log('✅ User confirmed deletion, deleting...');
    try {
      const { error } = await supabase.from('jobs').delete().eq('id', id);
      if (error) throw error;
      console.log('✅ Job deleted successfully');
      setJobs(jobs.filter(j => j.id !== id));
    } catch (err: any) {
      console.error('❌ Error deleting job:', err);
      alert('Erro ao excluir job: ' + (err.message || 'Erro desconhecido'));
    }
  };

  const handleAddCustomField = () => {
    if (!newFieldKey.trim()) return;
    setFormData(prev => ({
      ...prev,
      custom_fields: { ...prev.custom_fields, [newFieldKey.trim()]: '' }
    }));
    setNewFieldKey('');
    setShowAddField(false);
  };

  const handleRemoveCustomField = (key: string) => {
    const newFields = { ...formData.custom_fields };
    delete newFields[key];
    setFormData(prev => ({ ...prev, custom_fields: newFields }));
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    onSave({
      ...formData,
      client_type: formData.client_type || undefined,
      custom_fields: Object.keys(formData.custom_fields).length > 0 ? formData.custom_fields : undefined
    });
  };

  const isNewClient = !client;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">
            {isNewClient ? 'Novo Lead' : client?.name || 'Editar Cliente'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        {!isNewClient && (
          <div className="flex border-b border-slate-700 overflow-x-auto">
            <button
              onClick={() => setActiveTab('info')}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === 'info' 
                  ? 'text-blue-400 border-b-2 border-blue-400' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4 inline mr-2" />
              Info
            </button>
            <button
              onClick={() => setActiveTab('jobs')}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === 'jobs' 
                  ? 'text-blue-400 border-b-2 border-blue-400' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Briefcase className="w-4 h-4 inline mr-2" />
              Jobs ({jobs.length})
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === 'members' 
                  ? 'text-blue-400 border-b-2 border-blue-400' 
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
                  ? 'text-blue-400 border-b-2 border-blue-400' 
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
                  ? 'text-blue-400 border-b-2 border-blue-400' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Paperclip className="w-4 h-4 inline mr-2" />
              Anexos ({attachments.length})
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {/* Info Tab */}
          {(activeTab === 'info' || isNewClient) && (
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Nome *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nome do cliente"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Tipo de Cliente</label>
                <select
                  value={formData.client_type}
                  onChange={e => setFormData(prev => ({ ...prev, client_type: e.target.value as ClientType }))}
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Selecione...</option>
                  <option value="agencia">Agência</option>
                  <option value="produtora">Produtora</option>
                  <option value="anunciante">Anunciante</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Telefone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Empresa</label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={e => setFormData(prev => ({ ...prev, company: e.target.value }))}
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nome da empresa"
                />
              </div>

              {/* Custom Fields */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-slate-300">Campos Personalizados</label>
                  <button
                    type="button"
                    onClick={() => setShowAddField(true)}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    <PlusCircle className="w-3 h-3" />
                    Adicionar Campo
                  </button>
                </div>
                
                {showAddField && (
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={newFieldKey}
                      onChange={e => setNewFieldKey(e.target.value)}
                      placeholder="Nome do campo (ex: CNPJ)"
                      className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomField}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm"
                    >
                      Adicionar
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowAddField(false); setNewFieldKey(''); }}
                      className="px-3 py-2 bg-slate-600 text-white rounded-lg text-sm"
                    >
                      Cancelar
                    </button>
                  </div>
                )}

                {Object.entries(formData.custom_fields).map(([key, value]) => (
                  <div key={key} className="flex gap-2 mb-2">
                    <div className="flex-1">
                      <label className="block text-xs text-slate-400 mb-1">{key}</label>
                      <input
                        type="text"
                        value={value}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          custom_fields: { ...prev.custom_fields, [key]: e.target.value }
                        }))}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomField(key)}
                      className="self-end p-2 text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Notas</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Observações sobre o cliente..."
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                {!isNewClient && onDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(client!.id)}
                    className="px-4 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
                
                <button
                  type="submit"
                  className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium rounded-xl transition-all"
                >
                  {isNewClient ? 'Criar Lead' : 'Salvar'}
                </button>
              </div>
            </form>
          )}

          {/* Jobs Tab */}
          {activeTab === 'jobs' && !isNewClient && (
            <div className="p-6">
              {/* Add Job Form */}
              {!showNewJob ? (
                <button
                  onClick={() => setShowNewJob(true)}
                  className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-slate-600 hover:border-emerald-500 rounded-xl text-slate-400 hover:text-emerald-400 transition-colors mb-6"
                >
                  <Plus className="w-5 h-5" />
                  Criar Novo Job
                </button>
              ) : (
                <div className="mb-6 p-4 bg-slate-700/50 rounded-xl border border-slate-600/50">
                  <h4 className="text-sm font-medium text-slate-300 mb-3">Novo Job para {client?.name}</h4>
                  <input
                    type="text"
                    value={newJobTitle}
                    onChange={e => setNewJobTitle(e.target.value)}
                    placeholder="Título do job (ex: Comercial TV 30s)"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 mb-3"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={newJobValue}
                    onChange={e => setNewJobValue(e.target.value)}
                    placeholder="Valor do job (R$) - opcional"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 mb-3"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setShowNewJob(false); setNewJobTitle(''); setNewJobValue(''); }}
                      className="flex-1 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleCreateJob}
                      disabled={creatingJob || !newJobTitle.trim()}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      {creatingJob ? <Loader2 className="w-4 h-4 animate-spin" /> : <Briefcase className="w-4 h-4" />}
                      Criar Job
                    </button>
                  </div>
                </div>
              )}

              {/* Jobs List */}
              {loadingJobs ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                </div>
              ) : jobs.length === 0 ? (
                <p className="text-center text-slate-400 py-8">Nenhum job criado para este cliente.</p>
              ) : (
                <div className="space-y-3">
                  {jobs.map(job => (
                    <div 
                      key={job.id} 
                      className="flex items-center justify-between p-4 bg-slate-700/50 rounded-xl hover:bg-slate-700 transition-colors group"
                    >
                      <div 
                        className="flex items-center gap-3 flex-1 cursor-pointer"
                        onClick={() => navigate('/jobs')}
                      >
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                          <Briefcase className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-white font-medium">{job.title}</p>
                          <p className="text-xs text-slate-400">
                            {new Date(job.created_at).toLocaleDateString('pt-BR')}
                            {job.value && ` • R$ ${job.value.toLocaleString('pt-BR')}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          job.stage === 'pagamento_efetuado' ? 'bg-green-500/20 text-green-400' :
                          job.stage === 'em_producao' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-amber-500/20 text-amber-400'
                        }`}>
                          {job.stage.replace(/_/g, ' ')}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteJob(job.id, e);
                          }}
                          className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                          title="Excluir Job"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Members Tab */}
          {activeTab === 'members' && !isNewClient && (
            <div className="p-6">
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
                    Adicionar
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
                <p className="text-center text-slate-400 py-8">Nenhum membro adicionado.</p>
              ) : (
                <div className="space-y-3">
                  {members.map(member => (
                    <div key={member.id} className="flex items-center justify-between p-4 bg-slate-700/50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                          <User className="w-5 h-5 text-blue-400" />
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
          {activeTab === 'comments' && !isNewClient && (
            <div className="p-6">
              {/* Add Comment */}
              <div className="flex gap-2 mb-6">
                <input
                  type="text"
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                  placeholder="Escreva um comentário..."
                  className="flex-1 bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                  className="px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white rounded-xl transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>

              {/* Comments List */}
              {loadingComments ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
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
          {activeTab === 'attachments' && !isNewClient && (
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
                  className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-slate-600 hover:border-blue-500 rounded-xl text-slate-400 hover:text-blue-400 transition-colors"
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
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                </div>
              ) : attachments.length === 0 ? (
                <p className="text-center text-slate-400 py-8">Nenhum anexo ainda.</p>
              ) : (
                <div className="space-y-3">
                  {attachments.map(attachment => (
                    <div key={attachment.id} className="flex items-center gap-3 bg-slate-700/50 rounded-xl p-4">
                      <FileText className="w-8 h-8 text-blue-400" />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{attachment.file_name}</p>
                        <p className="text-xs text-slate-400">
                          {new Date(attachment.created_at).toLocaleString('pt-BR')}
                        </p>
                      </div>
                      <a
                        href={attachment.file_url}
                        download={attachment.file_name}
                        className="p-2 text-blue-400 hover:text-blue-300"
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
        </div>
      </div>
    </div>
  );
};

// ===== MAIN PAGE =====
export const SalesPipelinePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isMasterAdmin } = useAuth();
  const { language } = useApp();
  
  const [clients, setClients] = useState<ClientData[]>([]);
  const [stages, setStages] = useState<SalesStageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeClient, setActiveClient] = useState<ClientData | null>(null);
  const [activeStage, setActiveStage] = useState<SalesStageData | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  // Load stages from database
  const loadStages = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('sales_stages')
        .select('*')
        .order('order', { ascending: true });

      if (error) throw error;
      setStages(data || []);
    } catch (err) {
      console.error('Error loading stages:', err);
    }
  }, []);

  // Load clients
  const loadClients = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('stage_order', { ascending: true });

      if (error) throw error;
      setClients(data || []);
    } catch (err) {
      console.error('Error loading clients:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStages();
    loadClients();
  }, [loadStages, loadClients]);

  // Get clients by stage
  const getClientsByStage = (stageId: string) => 
    clients.filter(c => c.stage === stageId).sort((a, b) => a.stage_order - b.stage_order);

  // Stage CRUD handlers
  const handleAddColumn = async () => {
    if (!newColumnTitle.trim()) return;
    
    const newStage: SalesStageData = {
      id: `stage-${Date.now()}`,
      title: newColumnTitle.trim(),
      order: stages.length,
      color: 'from-slate-600 to-slate-700'
    };

    try {
      const { error } = await supabase
        .from('sales_stages')
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
      // Delete stage and all clients in it
      await supabase.from('clients').delete().eq('stage', stageId);
      const { error } = await supabase.from('sales_stages').delete().eq('id', stageId);
      
      if (error) throw error;
      setStages(stages.filter(s => s.id !== stageId));
      setClients(clients.filter(c => c.stage !== stageId));
    } catch (err) {
      console.error('Error deleting column:', err);
    }
  };

  const handleUpdateColumn = async (updatedStage: SalesStageData) => {
    try {
      const { error } = await supabase
        .from('sales_stages')
        .update({ title: updatedStage.title, color: updatedStage.color })
        .eq('id', updatedStage.id);
      
      if (error) throw error;
      setStages(stages.map(s => s.id === updatedStage.id ? updatedStage : s));
    } catch (err) {
      console.error('Error updating column:', err);
    }
  };

  // Add new client
  const handleAddClient = () => {
    setSelectedClient(null);
    setModalOpen(true);
  };

  // Edit client
  const handleClientClick = (client: ClientData) => {
    setSelectedClient(client);
    setModalOpen(true);
  };

  // Save client
  const handleSaveClient = async (data: Partial<ClientData>) => {
    try {
      if (selectedClient) {
        // Update
        const { error } = await supabase
          .from('clients')
          .update(data)
          .eq('id', selectedClient.id);
        if (error) throw error;
      } else {
        // Create
        const stageClients = getClientsByStage('leads');
        const maxOrder = stageClients.length > 0 
          ? Math.max(...stageClients.map(c => c.stage_order)) + 1 
          : 0;

        const { error } = await supabase
          .from('clients')
          .insert({
            ...data,
            stage: 'leads',
            stage_order: maxOrder,
            created_by: user?.id
          });
        if (error) throw error;
      }
      
      loadClients();
      setModalOpen(false);
    } catch (err) {
      console.error('Error saving client:', err);
    }
  };

  // Delete client
  const handleDeleteClient = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;
    
    try {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;
      loadClients();
      setModalOpen(false);
    } catch (err) {
      console.error('Error deleting client:', err);
    }
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
    
    // Otherwise dragging a client
    const client = clients.find(c => c.id === active.id);
    if (client) setActiveClient(client);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (!over) {
      setOverStage(null);
      return;
    }
    
    const stageIds = stages.map(s => s.id);
    
    // Check if over a column
    if (stageIds.includes(over.id as string)) {
      setOverStage(over.id as string);
    } else {
      // Over a card - find its stage
      const overClient = clients.find(c => c.id === over.id);
      if (overClient) {
        setOverStage(overClient.stage);
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveClient(null);
    setActiveStage(null);
    setOverStage(null);

    if (!over) return;

    const stageIds = stages.map(s => s.id);
    
    // Handle column reordering
    if (activeStage) {
      if (active.id !== over.id && stageIds.includes(over.id as string)) {
        const oldIndex = stages.findIndex(s => s.id === active.id);
        const newIndex = stages.findIndex(s => s.id === over.id);
        const newOrder = arrayMove(stages, oldIndex, newIndex);
        
        // Update local state
        setStages(newOrder);
        
        // Update order in database
        newOrder.forEach((stage: SalesStageData, idx: number) => {
          supabase.from('sales_stages').update({ order: idx }).eq('id', stage.id).then();
        });
      }
      return;
    }

    // Handle client movement
    const draggedClient = clients.find(c => c.id === active.id);
    if (!draggedClient) return;

    // Determine target stage
    let targetStage: string = draggedClient.stage;
    
    // Check if dropped on a column
    if (stageIds.includes(over.id as string)) {
      targetStage = over.id as string;
    } else {
      // Dropped on a card - find its stage
      const targetClient = clients.find(c => c.id === over.id);
      if (targetClient) {
        targetStage = targetClient.stage;
      }
    }

    // Calculate new order
    const stageClients = getClientsByStage(targetStage).filter(c => c.id !== draggedClient.id);
    let newOrder = stageClients.length;
    
    // If dropped on a card, insert at that position
    if (!stageIds.includes(over.id as string)) {
      const overIndex = stageClients.findIndex(c => c.id === over.id);
      if (overIndex >= 0) {
        newOrder = overIndex;
      }
    }

    // Only update if something changed
    if (draggedClient.stage !== targetStage || active.id !== over.id) {
      try {
        const { error } = await supabase
          .from('clients')
          .update({ stage: targetStage, stage_order: newOrder })
          .eq('id', draggedClient.id);

        if (error) throw error;
        loadClients();
      } catch (err) {
        console.error('Error moving client:', err);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
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
              {isMasterAdmin && (
                <button
                  onClick={() => navigate('/dashboard')}
                  className="p-2 hover:bg-slate-700/50 rounded-xl transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-slate-400" />
                </button>
              )}
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                  Pipeline de Vendas
                </h1>
                <p className="text-sm text-slate-400">Gerencie seus leads e vendas</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/jobs')}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600/50 text-slate-300 hover:text-white font-medium rounded-xl transition-all"
              >
                Ver Jobs
              </button>
              <button
                onClick={handleAddClient}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium rounded-xl transition-all"
              >
                <Plus className="w-5 h-5" />
                Novo Lead
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Board */}
      <main className="p-6 overflow-x-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={stages.map(s => s.id)} strategy={horizontalListSortingStrategy}>
            <div className="flex gap-6 min-w-max pb-6 items-start" style={{ minHeight: 'calc(100vh - 150px)' }}>
              {stages.map((stage, index) => (
                <SortableStageColumn
                  key={stage.id}
                  stage={stage}
                  clients={getClientsByStage(stage.id)}
                  onAddClient={handleAddClient}
                  onClientClick={handleClientClick}
                  onDeleteColumn={handleDeleteColumn}
                  onUpdateColumn={handleUpdateColumn}
                  isFirstColumn={index === 0}
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
            {activeClient && (
              <div className="bg-slate-700/90 backdrop-blur-sm border border-slate-600 rounded-xl p-4 shadow-2xl rotate-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">{activeClient.name}</h4>
                    {activeClient.company && (
                      <p className="text-sm text-slate-400">{activeClient.company}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
            {activeStage && (
              <div className={`w-80 bg-slate-800/90 backdrop-blur-sm border border-slate-600 rounded-2xl p-4 shadow-2xl rotate-2`}>
                <div className={`p-4 bg-gradient-to-r ${activeStage.color || 'from-slate-600 to-slate-700'} rounded-xl`}>
                  <h3 className="font-bold text-white">{activeStage.title}</h3>
                </div>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </main>

      {/* Client Modal */}
      <ClientModal
        isOpen={modalOpen}
        client={selectedClient}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveClient}
        onDelete={handleDeleteClient}
        onJobCreated={loadClients}
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
                className="w-full px-4 py-3 rounded-xl bg-slate-700 border border-slate-600 text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
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
