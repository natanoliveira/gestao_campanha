import { NextRequest } from "next/server";
import { stripe } from "@/lib/stripe";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";
import { errorResponse } from "@/lib/errors";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = authenticate(req);
    authorize(payload, "org:manage");
    const { id } = await params;

    if (process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_SUBSTITUA")) {
      return Response.json(
        { error: { code: "STRIPE_NOT_CONFIGURED" } },
        { status: 503 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: process.env.STRIPE_PRICE_ID_PREMIUM!, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/configuracoes?tab=plano&upgraded=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/configuracoes?tab=plano`,
      metadata: { organizationId: payload.organizationId },
    });

    return Response.json({ url: session.url });
  } catch (error) {
    return errorResponse(error);
  }
}
