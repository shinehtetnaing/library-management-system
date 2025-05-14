import { db } from "@/database/drizzle";
import { users } from "@/database/schema";
import { sendEmail } from "@/lib/workflow";
import { serve } from "@upstash/workflow/nextjs";
import { eq } from "drizzle-orm";

type UserState = "non-active" | "active";

type InitialData = {
  email: string;
  fullName: string;
};

const ONE_DAY_IN_MS = 60 * 60 * 24 * 1000;
const THREE_DAYS_IN_MS = ONE_DAY_IN_MS * 3;
const THIRTY_DAYS_IN_MS = ONE_DAY_IN_MS * 30;

const getUserState = async (email: string): Promise<UserState> => {
  const user = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (user.length === 0) return "non-active";

  const lastActivityDate = new Date(user[0].lastActivityDate!);
  const now = new Date();
  const timeDiff = now.getTime() - lastActivityDate.getTime();

  if (timeDiff > THREE_DAYS_IN_MS && timeDiff <= THIRTY_DAYS_IN_MS) {
    return "non-active";
  }

  return "active";
};

export const { POST } = serve<InitialData>(async (context) => {
  const { email, fullName } = context.requestPayload;

  // Welcome email to new users
  await context.run("new-signup", async () => {
    await sendEmail({
      email,
      subject: "Welcome to BookWise",
      message: `Hi ${fullName}, welcome to BookWise!`,
    });
  });

  await context.sleep("wait-for-3-days", 60 * 60 * 24 * 3);

  while (true) {
    const state = await context.run("check-user-state", async () => {
      return await getUserState(email);
    });

    if (state === "non-active") {
      await context.run("send-email-non-active", async () => {
        await sendEmail({
          email,
          subject: "Are you still there?",
          message: `Hi ${fullName}, we noticed you haven't been active for a while. We miss you at BookWise!`,
        });
      });
    } else if (state === "active") {
      await context.run("send-email-active", async () => {
        await sendEmail({
          email,
          subject: "Welcome back!",
          message: `Hi ${fullName}, welcome back to BookWise! We hope you enjoy your time here.`,
        });
      });
    }

    await context.sleep("wait-for-1-month", 60 * 60 * 24 * 30);
  }
});
