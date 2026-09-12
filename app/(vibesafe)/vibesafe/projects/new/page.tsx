import { redirect } from "next/navigation";
import { ProjectSetup } from "@/vibesafe/components/ProjectSetup";
import { getSession } from "@/vibesafe/lib/session";

export const metadata = { title: "앱 연결하기" };
export const dynamic = "force-dynamic";

const GITHUB_ERRORS: Record<string, string> = {
  state: "보안 확인에 실패했습니다. 다시 시도해주세요.",
  installation: "설치 정보를 확인하지 못했습니다. 다시 시도해주세요.",
  connect: "GitHub 연결에 실패했습니다. 잠시 후 다시 시도해주세요.",
};

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ github_error?: string }>;
}) {
  if (!(await getSession())) redirect("/vibesafe/login");
  const params = await searchParams;
  const error = params.github_error ? (GITHUB_ERRORS[params.github_error] ?? null) : null;
  return <ProjectSetup initialError={error} />;
}
