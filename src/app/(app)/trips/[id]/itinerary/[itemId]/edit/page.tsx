import { redirect } from "next/navigation";

type LegacyEditPageProps = {
  params: Promise<{
    id: string;
    itemId: string;
  }>;
};

export default async function LegacyEditPage({
  params,
}: LegacyEditPageProps) {
  const {
    id,
    itemId,
  } = await params;

  // Keep old itinerary edit URLs working
  redirect(
    `/trips/${id}/itinerary/edit/${itemId}`
  );
}