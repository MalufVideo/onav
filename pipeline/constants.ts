import { ColumnData, CardData, LogAction } from './types';

export const INITIAL_COLUMNS: ColumnData[] = [
  { id: 'col-todo', title: 'A Fazer', order: 0 },
  { id: 'col-doing', title: 'Em Progresso', order: 1 },
  { id: 'col-review', title: 'Revisão', order: 2 },
  { id: 'col-done', title: 'Aprovado', order: 3 },
];

export const createNewCard = (columnId: string, title: string, createdText: string = "Card created"): CardData => {
  const now = Date.now();
  return {
    id: `card-${now}-${Math.random().toString(36).substr(2, 9)}`,
    columnId,
    title,
    description: '',
    attachments: [],
    comments: [],
    history: [
      {
        id: `log-${now}`,
        action: LogAction.CREATED,
        timestamp: now,
        details: createdText,
      },
    ],
    createdAt: now,
    lastMovedAt: now,
    timeInColumns: {
      [columnId]: 0
    }
  };
};
