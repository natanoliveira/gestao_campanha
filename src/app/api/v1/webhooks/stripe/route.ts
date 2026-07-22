import { NextRequest } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature")!;
  const body = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return Response.json({ error: "Assinatura inválida" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const organizationId = session.metadata?.organizationId;

    if (organizationId) {
      const premiumPlan = await prisma.plan.findFirst({ where: { name: "Premium" } });
      if (premiumPlan) {
        await prisma.organization.update({
          where: { id: organizationId },
          data: { planId: premiumPlan.id },
        });
      }
    }
  }

  return Response.json({ received: true });
}
