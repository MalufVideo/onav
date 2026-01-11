import React, { useState, useEffect, useMemo } from 'react';
import { 
  DndContext, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragOverlay,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CardData, ColumnData, LogAction, LogEntry } from '../types';
import { INITIAL_COLUMNS, createNewCard } from '../constants';
import { Plus, Video, Image as ImageIcon, GripVertical, Trash2, X } from 'lucide-react';
import CardModal from './CardModal';
import { useApp } from '../contexts/AppContext';
import { supabase } from '../services/supabaseClient';

// --- Sortable Card Component ---
interface SortableCardProps {
  card: CardData;
  onClick: () => void;
  onUpdate: (card: CardData) => void;
  t: (key: any, ...args: any[]) => string;
}

const SortableCard: React.FC<SortableCardProps> = ({ card, onClick, onUpdate, t }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id, data: { type: 'Card', card } });
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(card.title);

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const handleSave = () => {
      setIsEditing(false);
      if (editTitle.trim() !== card.title) {
          onUpdate({ ...card, title: editTitle });
      }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleSave();
  };

  if (isDragging) {
    return (
      <div 
        ref={setNodeRef} 
        style={style} 
        className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-lg opacity-40 h-[100px] border-2 border-blue-500"
      />
    );
  }

  const hasVideo = card.attachments.some(a => a.type === 'VIDEO');
  const hasImage = card.attachments.some(a => a.type === 'IMAGE');

  if (isEditing) {
      return (
          <div
            ref={setNodeRef}
            style={style}
            className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm border border-blue-500"
          >
              <input 
                autoFocus
                className="w-full text-sm font-medium text-gray-800 dark:text-slate-200 bg-transparent outline-none"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                onMouseDown={(e) => e.stopPropagation()}
              />
          </div>
      )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      onDoubleClick={(e) => {
          e.stopPropagation();
          setIsEditing(true);
      }}
      className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 hover:shadow-md transition-all cursor-grab active:cursor-grabbing group"
    >
      <h4 className="text-sm font-medium text-gray-800 dark:text-slate-200 mb-2 leading-tight pointer-events-none">{card.title}</h4>
      <div className="flex justify-between items-end mt-2 pointer-events-none">
        <div className="flex gap-2">
           {hasImage && <div className="text-[10px] bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 px-1.5 py-0.5 rounded flex items-center gap-1 border border-purple-200 dark:border-purple-800/50"><ImageIcon className="w-3 h-3"/> {t('image')}</div>}
           {hasVideo && <div className="text-[10px] bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300 px-1.5 py-0.5 rounded flex items-center gap-1 border border-red-200 dark:border-red-800/50"><Video className="w-3 h-3"/> {t('video')}</div>}
        </div>
        <div className="text-[10px] text-gray-500 dark:text-slate-500">
           {card.comments.length > 0 && `${card.comments.length} ${t('comments_count')}`}
        </div>
      </div>
    </div>
  );
};

// --- Sortable Column Component ---
interface ColumnProps {
  column: ColumnData;
  cards: CardData[];
  onAddCard: () => void;
  onCardClick: (c: CardData) => void;
  onUpdateCard: (c: CardData) => void;
  onDeleteColumn: (id: string) => void;
  onUpdateColumn: (c: ColumnData) => void;
  t: (key: any, ...args: any[]) => string;
}

const Column: React.FC<ColumnProps> = ({ column, cards, onAddCard, onCardClick, onUpdateCard, onDeleteColumn, onUpdateColumn, t }) => {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ 
    id: column.id, 
    data: { type: 'Column', column } 
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(column.title);

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const handleSaveTitle = () => {
      setIsEditing(false);
      if (editTitle.trim() !== column.title) {
          onUpdateColumn({ ...column, title: editTitle });
      }
  };

  if (isDragging) {
    return (
        <div ref={setNodeRef} style={style} className="flex-shrink-0 w-72 bg-gray-100 dark:bg-slate-800/30 border-2 border-gray-200 dark:border-slate-700 border-dashed rounded-xl h-[500px]" />
    );
  }

  return (
    <div ref={setNodeRef} style={style} className="flex-shrink-0 w-72 flex flex-col max-h-full">
      <div className="bg-gray-100/80 dark:bg-slate-900/50 backdrop-blur-sm rounded-xl p-3 flex flex-col max-h-full border border-gray-200/60 dark:border-slate-800/60 group/column">
        {/* Header */}
        <div 
            {...attributes} 
            {...listeners}
            className="flex items-center justify-between mb-3 px-1 cursor-grab active:cursor-grabbing"
            onDoubleClick={() => setIsEditing(true)}
        >
            <div className="flex items-center gap-2 flex-1">
                 {isEditing ? (
                     <input 
                        autoFocus
                        className="w-full font-semibold text-gray-700 dark:text-slate-300 text-sm uppercase tracking-wide bg-transparent outline-none border-b border-blue-500"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onBlur={handleSaveTitle}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                        onMouseDown={(e) => e.stopPropagation()}
                     />
                 ) : (
                    <>
                        <h3 className="font-semibold text-gray-700 dark:text-slate-300 text-sm uppercase tracking-wide truncate">{column.title}</h3>
                        <span className="text-xs font-mono text-gray-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-2 py-0.5 rounded-full flex-shrink-0">{cards.length}</span>
                    </>
                 )}
            </div>
            {!isEditing && (
                <button 
                    onClick={(e) => {
                        e.preventDefault(); 
                        if(confirm(t('delete_column_confirm'))) onDeleteColumn(column.id);
                    }}
                    onMouseDown={(e) => e.stopPropagation()} // Prevent drag start
                    className="text-gray-400 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover/column:opacity-100 transition-opacity p-1 flex-shrink-0"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            )}
        </div>

        {/* Cards Area */}
        <div className="flex-1 overflow-y-auto space-y-2 min-h-[100px] pr-1">
          <SortableContext items={cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
            {cards.map(card => (
              <SortableCard 
                key={card.id} 
                card={card} 
                onClick={() => onCardClick(card)} 
                onUpdate={onUpdateCard}
                t={t} 
            />
            ))}
          </SortableContext>
        </div>

        {/* Footer */}
        <button 
          onClick={onAddCard}
          className="mt-3 flex items-center gap-2 text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-slate-800 p-2 rounded-lg transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> {t('add_card')}
        </button>
      </div>
    </div>
  );
};


interface BoardProps {
  projectId?: string;
}

// Simple Input Modal Component
const InputModal: React.FC<{
  isOpen: boolean;
  title: string;
  placeholder: string;
  onSubmit: (value: string) => void;
  onClose: () => void;
}> = ({ isOpen, title, placeholder, onSubmit, onClose }) => {
  const [value, setValue] = React.useState('');
  
  if (!isOpen) return null;
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onSubmit(value.trim());
      setValue('');
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-md shadow-2xl border border-white/10">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{title}</h3>
        <form onSubmit={handleSubmit}>
          <input
            autoFocus
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={() => { setValue(''); onClose(); }}
              className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const Board: React.FC<BoardProps> = ({ projectId }) => {
  const { t } = useApp();
  const [columns, setColumns] = useState<ColumnData[]>([]);
  const [cards, setCards] = useState<CardData[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal state for adding cards and columns
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState<string | null>(null); // string = columnId to add card to
  
  // Track original column when dragging a card (to detect column changes)
  const [dragOriginalColumn, setDragOriginalColumn] = useState<string | null>(null);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      // Fetch Columns (optionally filtered by projectId)
      let colsQuery = supabase.from('columns').select('*');
      if (projectId) {
        colsQuery = colsQuery.eq('project_id', projectId);
      }
      colsQuery = colsQuery.order('order');
      
      const { data: colsData, error: colsError } = await colsQuery;
      
      if (colsData && colsData.length > 0) {
        setColumns(colsData);
      } else if (!projectId) {
        // Only use initial columns for legacy mode (no projectId)
        setColumns(INITIAL_COLUMNS);
        if (!colsError) {
          await supabase.from('columns').upsert(INITIAL_COLUMNS);
        }
      } else {
        // For projects, just set empty (project should have been initialized with columns)
        setColumns([]);
      }

      // Fetch Cards for these columns
      if (colsData && colsData.length > 0) {
        const colIds = colsData.map((c: any) => c.id);
        const { data: cardsData } = await supabase
          .from('cards')
          .select('*')
          .in('column_id', colIds);
          
        if (cardsData) {
          const mappedCards: CardData[] = cardsData.map((c: any) => ({
              id: c.id,
              columnId: c.column_id,
              title: c.title,
              description: c.description,
              attachments: c.attachments || [],
              comments: c.comments || [],
              history: c.history || [],
              timeInColumns: c.time_in_columns || {},
              createdAt: c.created_at,
              lastMovedAt: c.last_moved_at
          }));
          setCards(mappedCards);
        }
      } else {
        setCards([]);
      }
      setIsLoading(false);
    };

    fetchData();
  }, [projectId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const syncCardToSupabase = async (card: CardData) => {
    const dbCard = {
        id: card.id,
        column_id: card.columnId,
        title: card.title,
        description: card.description,
        attachments: card.attachments,
        comments: card.comments,
        history: card.history,
        time_in_columns: card.timeInColumns,
        created_at: card.createdAt,
        last_moved_at: card.lastMovedAt
    };
    await supabase.from('cards').upsert(dbCard);
  };

  const deleteCardFromSupabase = async (cardId: string) => {
      await supabase.from('cards').delete().eq('id', cardId);
  }

  const handleAddCard = (columnId: string) => {
    setShowCardModal(columnId);
  };
  
  const submitAddCard = async (title: string) => {
    if (!showCardModal) return;
    const newCard = createNewCard(showCardModal, title, t('card_created'));
    setCards(prev => [...prev, newCard]);
    setShowCardModal(null);
    await syncCardToSupabase(newCard);
  };

  const handleAddColumn = () => {
    setShowColumnModal(true);
  };
  
  const submitAddColumn = async (title: string) => {
    const newColumn: ColumnData & { project_id?: string } = {
        id: `col-${Date.now()}`,
        title,
        order: columns.length
    };
    // Add project_id if we're in a project context
    if (projectId) {
      newColumn.project_id = projectId;
    }
    setColumns(prev => [...prev, newColumn]);
    setShowColumnModal(false);
    await supabase.from('columns').insert(newColumn);
  };

  const handleDeleteColumn = async (columnId: string) => {
      // Note: Confirmation is already shown by the Column component before calling this
      setColumns(prev => prev.filter(c => c.id !== columnId));
      setCards(prev => prev.filter(c => c.columnId !== columnId));
      
      await supabase.from('columns').delete().eq('id', columnId);
      // Cascade delete in DB handles cards, but we update UI state above.
  };

  const handleDeleteCard = async (cardId: string) => {
      setCards(prev => prev.filter(c => c.id !== cardId));
      await deleteCardFromSupabase(cardId);
      setSelectedCardId(null);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    // Track the original column of the card being dragged
    const card = cards.find(c => c.id === event.active.id);
    if (card) {
      setDragOriginalColumn(card.columnId);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveTask = active.data.current?.type === 'Card';
    const isOverTask = over.data.current?.type === 'Card';

    if (!isActiveTask) return;

    // Implements dropping a task over another task
    if (isActiveTask && isOverTask) {
      setCards((cards) => {
        const activeIndex = cards.findIndex((t) => t.id === activeId);
        const overIndex = cards.findIndex((t) => t.id === overId);
        
        if (cards[activeIndex].columnId !== cards[overIndex].columnId) {
          cards[activeIndex].columnId = cards[overIndex].columnId;
          return arrayMove(cards, activeIndex, overIndex - 1);
        }

        return arrayMove(cards, activeIndex, overIndex);
      });
    }

    const isOverColumn = over.data.current?.type === 'Column';

    // Implements dropping a task over a column
    if (isActiveTask && isOverColumn) {
      setCards((cards) => {
        const activeIndex = cards.findIndex((t) => t.id === activeId);
        if (cards[activeIndex].columnId !== overId) {
            cards[activeIndex].columnId = overId as string;
            return [...cards]; 
        }
        return cards;
      });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) {
      setDragOriginalColumn(null);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    // Handling Column Reordering
    if (active.data.current?.type === 'Column') {
        if (activeId !== overId) {
            setColumns((items) => {
                const oldIndex = items.findIndex(c => c.id === activeId);
                const newIndex = items.findIndex(c => c.id === overId);
                const newOrder = arrayMove(items, oldIndex, newIndex);
                
                // Sync new order to Supabase
                // Note: Efficient reordering in DB is complex, but for few columns, updating all orders is fine.
                newOrder.forEach((col: ColumnData, idx: number) => {
                    supabase.from('columns').update({ order: idx }).eq('id', col.id).then();
                });
                
                return newOrder;
            });
        }
        setDragOriginalColumn(null);
        return;
    }

    // Handling Card Reordering / Moving
    const activeCardIndex = cards.findIndex(c => c.id === activeId);
    if (activeCardIndex === -1) {
      setDragOriginalColumn(null);
      return;
    }

    const activeCard = cards[activeCardIndex];
    // Use the current columnId from the card (possibly updated by handleDragOver)
    const newColumnId = activeCard.columnId;
    
    // Use dragOriginalColumn to detect if the card actually moved columns
    const originalColumn = dragOriginalColumn;
    setDragOriginalColumn(null);
    
    // Only update if the card moved to a different column
    if (originalColumn && originalColumn !== newColumnId) {
        const now = Date.now();
        const oldColumnId = originalColumn;
        const timeSpent = now - activeCard.lastMovedAt;
        
        const updatedTimeInColumns = {
            ...activeCard.timeInColumns,
            [oldColumnId]: (activeCard.timeInColumns[oldColumnId] || 0) + timeSpent
        };

        const oldColTitle = columns.find(c => c.id === oldColumnId)?.title;
        const newColTitle = columns.find(c => c.id === newColumnId)?.title;
        
        const logEntry: LogEntry = {
            id: `log-${now}`,
            action: LogAction.MOVED,
            timestamp: now,
            details: t('moved_from_to', oldColTitle || '?', newColTitle || '?')
        };

        const updatedCard = {
            ...activeCard,
            columnId: newColumnId,
            lastMovedAt: now,
            timeInColumns: updatedTimeInColumns,
            history: [logEntry, ...activeCard.history]
        };

        const updatedCards = [...cards];
        updatedCards[activeCardIndex] = updatedCard;
        setCards(updatedCards);
        
        // Sync to DB
        await syncCardToSupabase(updatedCard);
    }
  };

  const handleCardUpdate = async (updatedCard: CardData) => {
    setCards(prev => prev.map(c => c.id === updatedCard.id ? updatedCard : c));
    await syncCardToSupabase(updatedCard);
  };

  const activeColumn = activeId ? columns.find(c => c.id === activeId) : null;
  const activeCard = activeId ? cards.find(c => c.id === activeId) : null;
  const selectedCard = selectedCardId ? cards.find(c => c.id === selectedCardId) : null;

  const handleColumnUpdate = async (updatedColumn: ColumnData) => {
    setColumns(prev => prev.map(c => c.id === updatedColumn.id ? updatedColumn : c));
    await supabase.from('columns').upsert(updatedColumn);
  };

  return (
    <div className="flex h-full overflow-x-auto gap-6 p-6 items-start">
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <SortableContext items={columns.map(c => c.id)} strategy={horizontalListSortingStrategy}>
                {columns.map(col => (
                    <Column 
                        key={col.id} 
                        column={col} 
                        cards={cards.filter(c => c.columnId === col.id)}
                        onAddCard={() => handleAddCard(col.id)}
                        onCardClick={(c) => setSelectedCardId(c.id)}
                        onUpdateCard={handleCardUpdate}
                        onDeleteColumn={handleDeleteColumn}
                        onUpdateColumn={handleColumnUpdate}
                        t={t}
                    />
                ))}
            </SortableContext>

            {/* Add Column Button */}
            <button
                onClick={handleAddColumn}
                className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-xl bg-gray-200 dark:bg-slate-800/50 border border-gray-300 dark:border-slate-700/50 hover:bg-gray-300 dark:hover:bg-slate-800 hover:text-gray-800 dark:hover:text-white text-gray-500 dark:text-slate-500 transition-colors"
                title={t('add_column')}
            >
                <Plus className="w-6 h-6" />
            </button>

            <DragOverlay>
                {activeColumn && (
                    <Column
                        column={activeColumn}
                        cards={cards.filter(c => c.columnId === activeColumn.id)}
                        onAddCard={() => {}}
                        onCardClick={() => {}}
                        onUpdateCard={() => {}}
                        onDeleteColumn={() => {}}
                        onUpdateColumn={() => {}}
                        t={t}
                    />
                )}
                {activeCard && (
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-2xl border-2 border-blue-500 rotate-2 cursor-grabbing w-[280px]">
                        <h4 className="font-bold text-gray-800 dark:text-slate-100">{activeCard.title}</h4>
                    </div>
                )}
            </DragOverlay>
        </DndContext>

        {selectedCard && (
            <CardModal 
                card={selectedCard} 
                columns={columns}
                onClose={() => setSelectedCardId(null)}
                onUpdate={handleCardUpdate}
                onDelete={handleDeleteCard}
            />
        )}
        
        {/* Modal for adding new column */}
        <InputModal
          isOpen={showColumnModal}
          title={t('add_column')}
          placeholder={t('enter_column_title')}
          onSubmit={submitAddColumn}
          onClose={() => setShowColumnModal(false)}
        />
        
        {/* Modal for adding new card */}
        <InputModal
          isOpen={showCardModal !== null}
          title={t('add_card')}
          placeholder={t('enter_card_title')}
          onSubmit={submitAddCard}
          onClose={() => setShowCardModal(null)}
        />
    </div>
  );
};
