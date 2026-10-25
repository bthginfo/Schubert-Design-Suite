export type CustomerWorkspaceItem = {
  id: string; name?: string | null; title?: string | null; number?: string | null;
  status: string; due_date?: string | null; updated_at?: string;
};
export type CustomerWorkspaceSection = {
  key: string; label: string; icon: string; slug: string;
  total: number; active: number; items: CustomerWorkspaceItem[]; href: string;
};
export type CustomerWorkspace = {sections: CustomerWorkspaceSection[]};
