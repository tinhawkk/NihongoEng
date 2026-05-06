export interface JLPTQuestion {
  id: string;
  question_text: string;
  options: string[];
  correct_index: number;
  explanation?: string;
  audio_url?: string;
  image_url?: string;
  is_mondai_header?: boolean;
  sort_order?: number;
  
  // Appended runtime fields
  globalIndex?: number;
  mId?: string;
}

export interface JLPTMondai {
  id: string;
  mondai_number: number;
  title: string;
  instruction_text?: string;
  audio_url?: string;
  questions: JLPTQuestion[];
  sort_order?: number;
}

export interface JLPTExam {
  id: string;
  title: string;
  level: string;
  url?: string;
  Type?: string;
  is_listening?: boolean;
  mondais?: JLPTMondai[];
  source_deck_id?: string;
}
