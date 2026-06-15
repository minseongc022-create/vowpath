import { listCallLogs, patchCallLog } from "../call-logs";
import type { CorrectionIntakeSession } from "../correction-intake-store";
import { listJobs, upsertJobRecord } from "../jobs-db";
import { formatLinkRequestNumber } from "../link-intake-urgency";
import { validateServiceAddress } from "../call-intake/address-validation";
import { formatCityState } from "../recent-bookings";
import { notifyOwnerCustomerCorrection } from "../customer-verification-owner-notify";
import type { JobPriority } from "../types";
import { recordLinkIntakeCustomerUpdated } from "../record-tenant-events";
import {
  getCustomerVerification,
  saveCustomerVerification,
} from "./store";
import type { CorrectionBookingView } from "./correction-types";

export async function buildCorrectionBookingView(
  session: CorrectionIntakeSession,
): Promise<CorrectionBookingView | null> {
  if (session.callId) {
    const calls = await listCallLogs(session.userId);
    const call = calls.find((c) => c.id === session.callId);
    if (call) {
      return {
        bookingId: session.bookingId,
        callId: session.callId,
        requestNumber: formatLinkRequestNumber(session.callId),
        customerName: call.customerName?.trim() || session.customerName,
        address: call.address?.trim() || session.address,
        issueType: call.issueType?.trim() || call.symptom?.trim() || session.issueType,
        createdAt: call.createdAt,
      };
    }
  }
  return {
    bookingId: session.bookingId,
    callId: session.callId,
    requestNumber: session.callId
      ? formatLinkRequestNumber(session.callId)
      : undefined,
    customerName: session.customerName,
    address: session.address,
    issueType: session.issueType,
    createdAt: session.createdAt,
  };
}

export async function submitCustomerVerificationCorrection(params: {
  session: CorrectionIntakeSession;
  customerName: string;
  address: string;
  issueType: string;
}): Promise<
  | { ok: true; booking: CorrectionBookingView }
  | { ok: false; error: string }
> {
  const name = params.customerName.trim();
  const issue = params.issueType.trim();
  if (name.length < 2 || issue.length < 4) {
    return { ok: false, error: "이름과 요청 내용을 입력해 주세요." };
  }

  const addressCheck = await validateServiceAddress(params.address.trim());
  if (!addressCheck.valid) {
    return {
      ok: false,
      error: "주소를 확인할 수 없습니다. 도로명, 도시, 주를 다시 입력해 주세요.",
    };
  }

  const address = addressCheck.formattedAddress ?? params.address.trim();
  const callId =
    params.session.callId ??
    (params.session.bookingId.startsWith("call-")
      ? params.session.bookingId.slice("call-".length)
      : undefined);

  let priority: JobPriority = "P3";
  if (callId) {
    const calls = await listCallLogs(params.session.userId);
    const call = calls.find((c) => c.id === callId);
    if (call) {
      priority = call.priority ?? "P3";
      const updateNote = `Customer corrected via phone verification link at ${new Date().toISOString()}.`;
      const transcript = [
        call.transcript?.trim() ?? "",
        updateNote,
        `Name: ${name}`,
        `Address: ${address}`,
        `Issue: ${issue}`,
      ]
        .filter(Boolean)
        .join("\n");

      await patchCallLog(params.session.userId, callId, {
        customerName: name,
        address,
        issueType: issue,
        symptom: issue,
        transcript,
      });
    }

    const jobs = await listJobs(params.session.userId);
    const job = jobs.find((j) => j.sourceCallId === callId);
    if (job) {
      await upsertJobRecord(params.session.userId, {
        ...job,
        customerName: name,
        address,
        symptom: issue,
      });
    }
  }

  const cityState = formatCityState(address);

  try {
    await recordLinkIntakeCustomerUpdated({
      userId: params.session.userId,
      bookingId: params.session.bookingId,
      callId: callId ?? "",
      customerName: name,
      issueType: issue,
      cityState,
    });
    await notifyOwnerCustomerCorrection({
      userId: params.session.userId,
      bookingId: params.session.bookingId,
      customerName: name,
      issueType: issue,
      address,
      cityState,
      priority,
    });
  } catch (e) {
    console.warn("[submit-correction] notify", e);
  }

  const record = await getCustomerVerification(
    params.session.userId,
    params.session.bookingId,
  );
  if (record) {
    const submittedAt = new Date().toISOString();
    const changes = [
      {
        field: "customerName" as const,
        originalValue: record.snapshot.customerName,
        updatedValue: name,
      },
      {
        field: "address" as const,
        originalValue: record.snapshot.address,
        updatedValue: address,
      },
      {
        field: "issueType" as const,
        originalValue: record.snapshot.issueType,
        updatedValue: issue,
      },
    ].filter((change) => change.originalValue !== change.updatedValue);

    await saveCustomerVerification({
      ...record,
      snapshot: { customerName: name, address, issueType: issue },
      corrections:
        changes.length > 0
          ? [
              ...(record.corrections ?? []),
              ...changes.map((change) => ({ ...change, submittedAt })),
            ]
          : record.corrections,
      timeline: [
        ...record.timeline,
        {
          at: submittedAt,
          message: "Customer submitted corrections via web form.",
        },
      ],
    });
  }

  const refreshed = await buildCorrectionBookingView({
    ...params.session,
    customerName: name,
    address,
    issueType: issue,
  });

  if (!refreshed) {
    return { ok: false, error: "저장 후 내역을 불러오지 못했습니다." };
  }

  return { ok: true, booking: refreshed };
}
