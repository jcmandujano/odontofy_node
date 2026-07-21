export interface CreateEvolutionNoteInput {
    note: string;
    treatment_plan_id?: number | null;
    treatment_plan_item_id?: number | null;
}

export interface UpdateEvolutionNoteInput {
    note?: string;
    treatment_plan_id?: number | null;
    treatment_plan_item_id?: number | null;
}

export interface ListEvolutionNotesFilters {
    treatment_plan_id?: number;
    treatment_plan_item_id?: number;
}
