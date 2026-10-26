export type CustomerWorkspaceItem = {
  id: string; name?: string | null; title?: string | null; number?: string | null;
  status: string; due_date?: string | null; updated_at?: string;
};
export type CustomerWorkspaceSection = {
  key: string; label: string; icon: string; slug: string;
  total: number; active: number; items: CustomerWorkspaceItem[]; href: string;
};
export type CustomerNextAction={id:string;kind:'task'|'work'|'quote'|'payment';title:string;detail:string;dueDate:string|null;owner:string|null;href:string;action:string;overdue:boolean};
export type CustomerWorkspace = {sections: CustomerWorkspaceSection[];nextActions?:CustomerNextAction[]};
