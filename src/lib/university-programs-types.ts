export type UniversityProgramRow = {
  id: string;
  university_id: string;
  program_id: string;
  ranking_note: string | null;
  tuition_note: string | null;
  short_description: string | null;
  program_school_note: string | null;
  featured: boolean;
  created_at: string | null;
  updated_at: string | null;
};

export type UniversityProgramInsert = {
  university_id: string;
  program_id: string;
  ranking_note?: string | null;
  tuition_note?: string | null;
  short_description?: string | null;
  program_school_note?: string | null;
  featured?: boolean;
};

export type UniversityProgramExportRow = {
  program_id: string;
  university_name: string;
  ranking_note: string;
  tuition_note: string;
  short_description: string;
  program_school_note: string;
  featured: string;
};
