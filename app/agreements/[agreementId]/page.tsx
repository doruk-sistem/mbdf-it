import { Suspense } from "react";
import { AgreementDetailContent } from "@/components/agreements/agreement-detail-content";
import { AgreementDetailSkeleton } from "@/components/agreements/agreement-detail-skeleton";
import { 
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator 
} from "@/components/ui/breadcrumb";

interface AgreementDetailPageProps {
  params: {
    agreementId: string;
  };
}

export default function AgreementDetailPage({ params }: AgreementDetailPageProps) {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/agreements">Sözleşmeler</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Sözleşme Detayı</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Suspense fallback={<AgreementDetailSkeleton />}>
        <AgreementDetailContent agreementId={params.agreementId} />
      </Suspense>
    </div>
  );
}