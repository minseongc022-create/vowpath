import { BookingDetailContent } from "@/components/dashboard/BookingDetailView";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function BookingDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <BookingDetailContent bookingId={id} />;
}
