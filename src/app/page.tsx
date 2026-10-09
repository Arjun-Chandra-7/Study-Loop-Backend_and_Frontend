import { cookies } from "next/headers";
import { AtelierHome } from "@/components/designs/AtelierHome";
import { RememberDesign } from "@/components/designs/DesignSwitch";
import { LegacyHome } from "@/components/designs/LegacyHome";
import { DESIGN_COOKIE, parseDesign } from "@/lib/design";

export default async function Home({ searchParams }: PageProps<"/">) {
  const raw = (await searchParams).design;
  const fromQuery = parseDesign(typeof raw === "string" ? raw : null);
  const design = fromQuery ?? parseDesign((await cookies()).get(DESIGN_COOKIE)?.value) ?? "legacy";

  return (
    <>
      {fromQuery && <RememberDesign design={fromQuery} />}
      {design === "legacy" ? <LegacyHome /> : <AtelierHome />}
    </>
  );
}
