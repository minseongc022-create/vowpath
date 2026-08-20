/**
 * Seller-scoped keyword tracking. A seller "adds a keyword" here; behind the
 * scenes it becomes (or joins) a row in the global pricepulse_targets table
 * that the collector actually crawls — two sellers tracking the same
 * keyword share one collection, not two.
 */
import { createClient } from "@supabase/supabase-js";

const MAX_TARGETS_PER_SELLER = 20;

export type SellerTarget = {
  targetId: string;
  query: string;
  label: string | null;
  addedAt: string;
};

function client() {
  const url = process.env.PRICEPULSE_SUPABASE_URL?.trim();
  const key = process.env.PRICEPULSE_SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error("Pricepulse: Supabase not configured (see pricepulse/README.md)");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function listSellerTargets(sellerId: string): Promise<SellerTarget[]> {
  const db = client();
  const { data, error } = await db
    .from("pricepulse_seller_targets")
    .select("target_id, label, created_at, pricepulse_targets(query)")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`listSellerTargets: ${error.message}`);

  return (data ?? []).map(
    (row: { target_id: string; label: string | null; created_at: string; pricepulse_targets: { query: string } | { query: string }[] | null }) => {
      const joined = Array.isArray(row.pricepulse_targets) ? row.pricepulse_targets[0] : row.pricepulse_targets;
      return {
        targetId: row.target_id,
        query: joined?.query ?? "(알 수 없음)",
        label: row.label,
        addedAt: row.created_at,
      };
    },
  );
}

/** Find-or-create the global target, then link it to this seller. */
export async function addSellerTarget(
  sellerId: string,
  rawQuery: string,
  label?: string,
): Promise<{ target: SellerTarget } | { error: string }> {
  const query = rawQuery.trim();
  if (!query) return { error: "키워드를 입력하세요" };
  if (query.length > 80) return { error: "키워드는 80자 이내로 입력하세요" };

  const db = client();

  const { count, error: countError } = await db
    .from("pricepulse_seller_targets")
    .select("id", { count: "exact", head: true })
    .eq("seller_id", sellerId);
  if (countError) throw new Error(`addSellerTarget count: ${countError.message}`);
  if ((count ?? 0) >= MAX_TARGETS_PER_SELLER) {
    return { error: `키워드는 최대 ${MAX_TARGETS_PER_SELLER}개까지 등록할 수 있습니다 (베타 기간 제한)` };
  }

  let targetId: string | undefined;
  const { data: existing, error: findError } = await db
    .from("pricepulse_targets")
    .select("id")
    .eq("kind", "keyword")
    .eq("query", query)
    .maybeSingle();
  if (findError) throw new Error(`addSellerTarget find: ${findError.message}`);
  targetId = existing?.id;

  if (!targetId) {
    const { data: inserted, error: insertError } = await db
      .from("pricepulse_targets")
      .insert({ kind: "keyword", query })
      .select("id")
      .single();
    if (insertError) {
      // Unique-constraint race: another seller added the same keyword between our find and insert.
      const { data: retry, error: retryError } = await db
        .from("pricepulse_targets")
        .select("id")
        .eq("kind", "keyword")
        .eq("query", query)
        .maybeSingle();
      if (retryError || !retry) throw new Error(`addSellerTarget insert: ${insertError.message}`);
      targetId = retry.id;
    } else {
      targetId = inserted.id;
    }
  }

  if (!targetId) throw new Error("addSellerTarget: no target id after find-or-create");

  const { error: linkError } = await db
    .from("pricepulse_seller_targets")
    .upsert(
      { seller_id: sellerId, target_id: targetId, label: label?.trim() || null },
      { onConflict: "seller_id,target_id" },
    );
  if (linkError) throw new Error(`addSellerTarget link: ${linkError.message}`);

  return { target: { targetId, query, label: label?.trim() || null, addedAt: new Date().toISOString() } };
}

export async function removeSellerTarget(sellerId: string, targetId: string): Promise<void> {
  const db = client();
  const { error } = await db
    .from("pricepulse_seller_targets")
    .delete()
    .eq("seller_id", sellerId)
    .eq("target_id", targetId);
  if (error) throw new Error(`removeSellerTarget: ${error.message}`);
}
