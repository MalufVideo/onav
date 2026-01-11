import React, { useState, useRef, useEffect } from 'react';
import { CardData, AttachmentType, LogAction, ColumnData, LogEntry } from '../types';
import { X, Upload, Clock, MessageSquare, Activity, FileVideo, FileImage, Sparkles, Trash2, Calendar, Eye } from 'lucide-react';
import { generateCardDescription } from '../services/geminiService';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';

interface CardModalProps {
  card: CardData;
  columns: ColumnData[];
  onClose: () => void;
  onUpdate: (updatedCard: CardData) => void;
  onDelete?: (cardId: string) => void;
}

// Helper to format duration
const formatDuration = (ms: number) => {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (parts.length === 0) return `${seconds}s`; // Show seconds if less than a minute
  return parts.join(' ');
};

const CardModal: React.FC<CardModalProps> = ({ card, columns, onClose, onUpdate, onDelete }) => {
  const { t, language } = useApp();
  const { user } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Lightbox state for media preview
  const [lightboxMedia, setLightboxMedia] = useState<{ url: string; type: AttachmentType; name: string } | null>(null);

  // Calculate current running time for the active column
  const [currentStayDuration, setCurrentStayDuration] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStayDuration(Date.now() - card.lastMovedAt);
    }, 1000);
    return () => clearInterval(interval);
  }, [card.lastMovedAt]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      const type = file.type.startsWith('video') ? AttachmentType.VIDEO : AttachmentType.IMAGE;
      
      const newAttachment = {
        id: Math.random().toString(36).substr(2, 9),
        type,
        url: result,
        name: file.name,
        createdAt: Date.now()
      };

      const log: LogEntry = {
        id: Math.random().toString(36),
        action: LogAction.ATTACHMENT_ADDED,
        timestamp: Date.now(),
        details: `${t('uploaded')} ${file.name}`
      };

      onUpdate({
        ...card,
        attachments: [...card.attachments, newAttachment],
        history: [log, ...card.history]
      });
    };
    reader.readAsDataURL(file);
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;

    // Determine author name
    let authorName = t('guest');
    if (user) {
      if (user.user_metadata?.full_name) {
        authorName = user.user_metadata.full_name;
      } else if (user.email) {
        authorName = user.email;
      }
    }

    const comment = {
      id: Math.random().toString(36),
      text: newComment,
      author: authorName,
      createdAt: Date.now()
    };
    
    const log: LogEntry = {
      id: Math.random().toString(36),
      action: LogAction.COMMENT_ADDED,
      timestamp: Date.now(),
      details: `${t('commented')}: "${newComment.substring(0, 20)}..."`
    };

    onUpdate({
      ...card,
      comments: [comment, ...card.comments],
      history: [log, ...card.history]
    });
    setNewComment('');
  };

  const handleAIDescription = async () => {
    setIsGenerating(true);
    const desc = await generateCardDescription(card.title, card.description || "No details yet.", language);
    
    const log: LogEntry = {
      id: Math.random().toString(36),
      action: LogAction.UPDATED,
      timestamp: Date.now(),
      details: t('ai_updated')
    };

    onUpdate({
      ...card,
      description: desc,
      history: [log, ...card.history]
    });
    setIsGenerating(false);
  };

  const currentColumnTitle = columns.find(c => c.id === card.columnId)?.title || t('unknown');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-slate-800">
        
        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b border-gray-100 dark:border-slate-800">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100">{card.title}</h2>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400 mt-1">
              <span>{t('in_list')} <span className="font-semibold text-gray-700 dark:text-slate-300 underline decoration-blue-500">{currentColumnTitle}</span></span>
              <span>•</span>
              <Clock className="w-3 h-3" />
              <span>{t('current_stay')}: {formatDuration(currentStayDuration)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onDelete && (
              <button
                onClick={() => {
                  if (confirm(t('delete_card_confirm') || 'Tem certeza que deseja excluir este card?')) {
                    onDelete(card.id);
                    onClose();
                  }
                }}
                className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full transition-colors"
                title={t('delete') || 'Delete'}
              >
                <Trash2 className="w-6 h-6 text-red-500 dark:text-red-400" />
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors">
              <X className="w-6 h-6 text-gray-500 dark:text-slate-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Main Panel */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-white dark:bg-slate-900">
            
            {/* Description */}
            <section>
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-gray-700 dark:text-slate-300 flex items-center gap-2">
                  {t('description')}
                </h3>
                <button 
                  onClick={handleAIDescription}
                  disabled={isGenerating}
                  className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border border-transparent dark:border-purple-800 px-3 py-1 rounded-full flex items-center gap-1 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                >
                  <Sparkles className="w-3 h-3" />
                  {isGenerating ? t('ai_thinking') : t('ai_enhance')}
                </button>
              </div>
              <textarea
                className="w-full min-h-[120px] p-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-700 dark:text-slate-200 text-sm placeholder-gray-400 dark:placeholder-slate-600"
                placeholder={t('description') + "..."}
                value={card.description}
                onChange={(e) => onUpdate({...card, description: e.target.value})}
              />
            </section>

            {/* Attachments */}
            <section>
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-gray-700 dark:text-slate-300 flex items-center gap-2">
                  <FileImage className="w-4 h-4" /> {t('media_attachments')}
                </h3>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="text-sm bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 px-3 py-1.5 rounded-md flex items-center gap-2 transition-colors border border-gray-200 dark:border-slate-700"
                >
                  <Upload className="w-4 h-4" /> {t('add')}
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*,video/*" 
                  onChange={handleFileUpload}
                />
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {card.attachments.map(att => (
                  <div key={att.id} className="group relative aspect-video bg-gray-100 dark:bg-slate-950 rounded-lg overflow-hidden border border-gray-200 dark:border-slate-700">
                    {/* Clickable thumbnail for lightbox preview */}
                    <div 
                      className="w-full h-full cursor-pointer"
                      onClick={() => setLightboxMedia({ url: att.url, type: att.type, name: att.name })}
                    >
                      {att.type === AttachmentType.VIDEO ? (
                        <>
                          <video src={att.url} className="w-full h-full object-cover" muted />
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-12 h-12 bg-black/50 rounded-full flex items-center justify-center">
                              <div className="w-0 h-0 border-t-8 border-t-transparent border-l-12 border-l-white border-b-8 border-b-transparent ml-1" />
                            </div>
                          </div>
                        </>
                      ) : (
                        <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                      )}
                    </div>
                    {/* Delete button - small icon on top-left */}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdate({
                          ...card,
                          attachments: card.attachments.filter(a => a.id !== att.id)
                        })
                      }}
                      className="absolute top-1 left-1 bg-red-600 hover:bg-red-700 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      title={t('delete') || 'Delete'}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    {/* Preview indicator on hover */}
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-center justify-center">
                      <Eye className="w-6 h-6 text-white drop-shadow-lg" />
                    </div>
                  </div>
                ))}
                {card.attachments.length === 0 && (
                   <div className="col-span-full py-8 text-center text-gray-400 dark:text-slate-500 text-sm border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-lg bg-gray-50 dark:bg-slate-950/50">
                     {t('no_attachments')}
                   </div>
                )}
              </div>
            </section>

            {/* Comments */}
            <section>
               <h3 className="font-semibold text-gray-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                 <MessageSquare className="w-4 h-4" /> {t('comments')}
               </h3>
               <div className="space-y-4 mb-4">
                 {card.comments.map(c => (
                   <div key={c.id} className="flex gap-3">
                     <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-300 text-xs font-bold">
                       {c.author.charAt(0)}
                     </div>
                     <div className="flex-1 bg-gray-50 dark:bg-slate-800 p-3 rounded-lg rounded-tl-none border border-gray-200 dark:border-slate-700">
                       <div className="flex justify-between items-baseline mb-1">
                         <span className="font-medium text-sm text-gray-800 dark:text-slate-200">{c.author}</span>
                         <span className="text-xs text-gray-400 dark:text-slate-500">{new Date(c.createdAt).toLocaleString()}</span>
                       </div>
                       <p className="text-sm text-gray-600 dark:text-slate-400">{c.text}</p>
                     </div>
                   </div>
                 ))}
               </div>
               <div className="flex gap-2">
                 <input
                    type="text"
                    className="flex-1 bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-gray-800 dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-600"
                    placeholder={t('write_comment')}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                 />
                 <button 
                  onClick={handleAddComment}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
                 >
                   {t('send')}
                 </button>
               </div>
            </section>
          </div>

          {/* Sidebar (Logs & Time) */}
          <div className="w-80 border-l border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 p-6 overflow-y-auto">
            
            {/* Time Tracking Stats */}
            <div className="mb-8">
              <h4 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-4">{t('time_tracking')}</h4>
              <div className="space-y-2">
                {columns.map(col => {
                  const time = (card.timeInColumns[col.id] || 0) + (col.id === card.columnId ? currentStayDuration : 0);
                  return (
                    <div key={col.id} className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 dark:text-slate-400">{col.title}</span>
                      <span className="font-mono text-gray-800 dark:text-slate-200 font-medium">{formatDuration(time)}</span>
                    </div>
                  );
                })}
                <div className="border-t border-gray-200 dark:border-slate-800 mt-2 pt-2 flex justify-between items-center text-sm font-bold">
                  <span className="text-gray-800 dark:text-slate-100">{t('total_life')}</span>
                  <span className="text-blue-600 dark:text-blue-400">
                    {formatDuration(Date.now() - card.createdAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Audit Log */}
            <div>
              <h4 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-4 flex items-center justify-between">
                <span>{t('activity_log')}</span>
                <Activity className="w-3 h-3" />
              </h4>
              <div className="relative border-l-2 border-gray-200 dark:border-slate-800 ml-2 space-y-6">
                {card.history.map((log) => (
                  <div key={log.id} className="relative pl-6">
                    <div className={`absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-950 ${
                      log.action === LogAction.MOVED ? 'bg-orange-500' :
                      log.action === LogAction.ATTACHMENT_ADDED ? 'bg-purple-500' :
                      'bg-gray-400 dark:bg-slate-600'
                    }`} />
                    <p className="text-xs text-gray-800 dark:text-slate-300 font-medium mb-0.5">{log.details}</p>
                    <p className="text-[10px] text-gray-400 dark:text-slate-500">{new Date(log.timestamp).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Lightbox Modal for Media Preview */}
      {lightboxMedia && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxMedia(null)}
        >
          {/* Close button */}
          <button 
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
            onClick={() => setLightboxMedia(null)}
          >
            <X className="w-8 h-8" />
          </button>
          
          {/* Media name */}
          <div className="absolute top-4 left-4 text-white text-sm font-medium truncate max-w-[60%]">
            {lightboxMedia.name}
          </div>

          {/* Media content */}
          <div 
            className="max-w-[90vw] max-h-[90vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {lightboxMedia.type === AttachmentType.VIDEO ? (
              <video 
                src={lightboxMedia.url} 
                controls 
                autoPlay
                className="max-w-full max-h-[85vh] rounded-lg shadow-2xl"
              />
            ) : (
              <img 
                src={lightboxMedia.url} 
                alt={lightboxMedia.name} 
                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CardModal;
