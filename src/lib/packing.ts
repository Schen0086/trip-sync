export type PackingScope =
  | "required"
  | "personal"
  | "shared";

export type PackingCategory =
  | "documents"
  | "clothing"
  | "toiletries"
  | "electronics"
  | "health"
  | "travel"
  | "activities"
  | "food"
  | "other";

export const PACKING_CATEGORY_OPTIONS: {
  value: PackingCategory;
  label: string;
}[] = [
  {
    value: "documents",
    label: "Documents",
  },
  {
    value: "clothing",
    label: "Clothing",
  },
  {
    value: "toiletries",
    label: "Toiletries",
  },
  {
    value: "electronics",
    label: "Electronics",
  },
  {
    value: "health",
    label: "Health",
  },
  {
    value: "travel",
    label: "Travel",
  },
  {
    value: "activities",
    label: "Activities",
  },
  {
    value: "food",
    label: "Food",
  },
  {
    value: "other",
    label: "Other",
  },
];

export type PackingItem = {
  id: string;
  trip_id: string;

  created_by: string;

  owner_user_id:
    | string
    | null;

  scope: PackingScope;

  required_key:
    | string
    | null;

  name: string;

  category:
    PackingCategory;

  quantity: number;

  assigned_to:
    | string
    | null;

  notes:
    | string
    | null;

  is_packed: boolean;

  is_system_required: boolean;

  sort_order: number;

  created_at: string;
  updated_at: string;
};

export function isPackingCategory(
  value: string
): value is PackingCategory {
  return PACKING_CATEGORY_OPTIONS.some(
    (category) =>
      category.value === value
  );
}

export function getPackingCategoryLabel(
  category: PackingCategory
) {
  return (
    PACKING_CATEGORY_OPTIONS.find(
      (option) =>
        option.value === category
    )?.label ?? "Other"
  );
}