import { shouldTenantAnswerNow } from "./answer-schedule";



/** True when call is outside the shop's configured Vowroad answer windows. */

export async function isTenantAfterHours(

  userId: string,

  now = new Date(),

): Promise<boolean> {

  const shouldAnswer = await shouldTenantAnswerNow(userId, now);

  return !shouldAnswer;

}


