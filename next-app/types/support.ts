export interface SupportCategory {
  id: string;
  name: string;
  description: string | null;
  discordWebhook: string | null;
  discordMentions: string | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SupportSubcategory {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  discordWebhook: string | null;
  discordMentions: string | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export type SupportTicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface SupportTicket {
  id: string;
  userId: number | null;
  userName: string | null;
  userEmail: string | null;
  categoryId: string;
  subcategoryId: string | null;
  message: string;
  attachments: string[] | null;
  status: SupportTicketStatus;
  discordMessageId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SupportCategoryWithSubcategories extends SupportCategory {
  subcategories: SupportSubcategory[];
}

export interface SupportTicketWithRelations extends SupportTicket {
  category: SupportCategory;
  subcategory: SupportSubcategory | null;
  user: { name: string; email: string } | null;
}
