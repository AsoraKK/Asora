export interface DeleteUserResult {
  deletionId: string;
  warnings: string[];
}

export interface ExportUserResult {
  exportId: string;
  generatedAt: string;
}
