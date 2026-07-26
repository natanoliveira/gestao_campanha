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

    if (!organizationId) return Response.json({ received: true });

    try {
      const [org, premiumPlan] = await Promise.all([
        prisma.organization.findUnique({ where: { id: organizationId }, select: { id: true, planId: true } }),
        prisma.plan.findFirst({ where: { name: "Premium" }, select: { id: true } }),
      ]);

      if (!org) {
        console.error(`[Stripe] organizationId inválido: ${organizationId}`);
        return Response.json({ received: true });
      }

      // idempotência: já está no plano premium, não reprocessar
      if (premiumPlan && org.planId !== premiumPlan.id) {
        await prisma.organization.update({
          where: { id: organizationId },
          data: { planId: premiumPlan.id },
        });
      }
    } catch (err) {
      console.error("[Stripe] Erro ao processar checkout.session.completed:", err);
    }
  }

  return Response.json({ received: true });
}
